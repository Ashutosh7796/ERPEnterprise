# 08 - Procurement Quantity & Document Lineage

**Architecture Standard**: Authoritative Fulfillment Ledger & Immutability Model  
**Pattern Alignment**: S1 Lineage Engine extended to Procure-to-Pay (P2P)  

---

## 1. Authoritative Quantity Source of Truth

To prevent double-counting, race conditions, and arbitrary CRUD corruption, quantities across the procurement lifecycle are strictly partitioned and computed:

```text
========================================================================================
                         AUTHORITATIVE QUANTITY DEFINITIONS
========================================================================================
  ordered_qty         = Authoritative Purchase Order Item Quantity (Fixed upon Approval)
  received_qty        = Total Gross Quantity physically received from vendor at warehouse
  accepted_qty        = Quantity passing quality inspection and moved to active stock
  rejected_qty        = Quantity failing QC / damaged, staged for vendor return
  invoiced_qty        = Authoritative Cumulative Billed Quantity from Posted Invoices
  returned_qty        = Total Cumulative Quantity returned to vendor via Debit Notes
  pending_receipt_qty = max(0, ordered_qty - received_qty)
  pending_invoice_qty = max(0, accepted_qty - invoiced_qty)
========================================================================================
```

$$\begin{aligned}
\text{Fulfillment Invariants:} \\
\text{received\_qty} &= \text{accepted\_qty} + \text{rejected\_qty} \\
\text{invoiced\_qty} &\le \text{accepted\_qty} \quad (\text{or } \le \text{ordered\_qty} \text{ for direct service purchases}) \\
\text{returned\_qty} &\le \text{received\_qty}
\end{aligned}$$

---

## 2. Proposed P2P Lineage Table (`erp_po_line_fulfillment`)

Following the validated S1 Sales Lineage pattern (`erp_so_line_fulfillment`), a dedicated transactional ledger table tracks line-level procurement fulfillment:

```sql
CREATE TABLE IF NOT EXISTS `erp_po_line_fulfillment` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `purchase_order_id` BIGINT NOT NULL,
  `po_line_id` BIGINT NOT NULL,
  `material_id` BIGINT NOT NULL,
  `ordered_quantity` DECIMAL(24,6) NOT NULL,
  `received_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `accepted_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `rejected_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `invoiced_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `returned_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `fulfillment_status` VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, PARTIALLY_RECEIVED, RECEIVED, FULLY_BILLED, CLOSED
  `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_po_line` (`tenant_id`, `purchase_order_id`, `po_line_id`),
  INDEX `idx_tenant_po` (`tenant_id`, `purchase_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. Directed Acyclic Graph (DAG) Document Linkage

All document transitions are registered into `erp_document_relationship` to maintain complete auditability:

```text
[PURCHASE_ORDER] ──(PO_TO_RECEIPT)──► [GOODS_RECEIPT]
        │                                    │
        │(DIRECT_PURCHASE_BILL)              │(GRN_TO_INVOICE)
        ▼                                    ▼
[PURCHASE_INVOICE] ◄─────────────────────────┘
        │
   ┌────┴──────────────────────────┐
   ▼ (PAYMENT_SETTLEMENT)          ▼ (STATUTORY_DEBIT_NOTE)
[PAYMENT_VOUCHER]            [PURCHASE_DEBIT_NOTE]
```
