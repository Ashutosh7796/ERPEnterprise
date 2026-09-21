# 15 - Procurement Phase P7: Final Target Architecture & System Design

**Document Ref**: `PROC-P7-VERIF-15`  
**Evaluation Date**: August 2026  
**Status**: **APPROVED READ-ONLY TARGET ARCHITECTURE SPECIFICATION**  

---

## 1. Architectural Overview & Design Invariants

Phase P7 delivers the complete statutory, operational, physical, and double-entry accounting architecture for Purchase Returns and Supplier Adjustments.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROCUREMENT P7 ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Core Services                                                            │
│    ├── PurchaseReturnService.java (Workflow, validation & orchestration)    │
│    ├── DeliveryChallanService.java (Rule 55 Challan & E-Way Bill generator) │
│    ├── ReturnAccountingPostingService.java (Canonical GL double-entry)      │
│    └── Gstr2bCreditNoteMatchingService.java (2-way statutory reconciler)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Canonical GL Accounts                                                    │
│    ├── 2101 Accounts Payable (Creditors)                                    │
│    ├── 1401 Raw Material & Inventory Asset                                  │
│    ├── 1301/1302/1303 Input CGST/SGST/IGST Recoverable                      │
│    ├── 1105 Supplier Advances / Debit Balance                                │
│    ├── 2105 GRNI Accrual                                                    │
│    └── 5105 Purchase Price Variance / Rebates                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Database Schema                                                          │
│    ├── `erp_procurement_return` (Header record)                             │
│    ├── `erp_procurement_return_item` (Line items)                           │
│    └── `erp_delivery_challan` (Rule 55 Outward transport)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Specification

### 2.1 Table: `erp_procurement_return`
```sql
CREATE TABLE IF NOT EXISTS `erp_procurement_return` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` bigint(20) NOT NULL,
    `return_number` varchar(64) NOT NULL,
    `return_type` varchar(30) NOT NULL, -- PHYSICAL_RETURN, COMMERCIAL_ADJUSTMENT, RCM_SELF_CREDIT
    `return_date` date NOT NULL,
    `supplier_id` bigint(20) NOT NULL,
    `supplier_name` varchar(128) NOT NULL,
    `original_invoice_id` bigint(20) DEFAULT NULL,
    `original_invoice_number` varchar(64) DEFAULT NULL,
    `original_grn_id` bigint(20) DEFAULT NULL,
    `original_grn_number` varchar(64) DEFAULT NULL,
    `depot_id` bigint(20) DEFAULT NULL,
    `delivery_challan_number` varchar(64) DEFAULT NULL,
    `eway_bill_number` varchar(64) DEFAULT NULL,
    `taxable_amount` decimal(18,4) NOT NULL,
    `cgst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `sgst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `igst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `total_return_amount` decimal(18,4) NOT NULL,
    `is_itc_eligible` tinyint(1) NOT NULL DEFAULT 1,
    `itc_reversal_status` varchar(30) NOT NULL DEFAULT 'PENDING_RECONCILIATION', -- PENDING_RECONCILIATION, RECONCILED_MATCHED, EXEMPT_BLOCKED
    `supplier_credit_note_number` varchar(64) DEFAULT NULL,
    `supplier_credit_note_date` date DEFAULT NULL,
    `return_reason` varchar(255) DEFAULT NULL,
    `status` varchar(30) NOT NULL DEFAULT 'POSTED',
    `gl_journal_id` bigint(20) DEFAULT NULL,
    `creator` bigint(20) DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_ret_tenant_supp` (`tenant_id`, `supplier_id`),
    KEY `idx_ret_inv` (`tenant_id`, `original_invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 Table: `erp_procurement_return_item`
```sql
CREATE TABLE IF NOT EXISTS `erp_procurement_return_item` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` bigint(20) NOT NULL,
    `return_header_id` bigint(20) NOT NULL,
    `material_id` bigint(20) NOT NULL,
    `material_name` varchar(128) NOT NULL,
    `original_line_item_id` bigint(20) DEFAULT NULL,
    `depot_id` bigint(20) NOT NULL,
    `return_quantity` decimal(18,4) NOT NULL,
    `unit_price` decimal(18,4) NOT NULL,
    `taxable_amount` decimal(18,4) NOT NULL,
    `gst_rate` decimal(6,2) NOT NULL,
    `cgst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `sgst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `igst_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
    `total_amount` decimal(18,4) NOT NULL,
    `is_itc_eligible` tinyint(1) NOT NULL DEFAULT 1,
    `batch_number` varchar(64) DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_reti_header` (`tenant_id`, `return_header_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. Data Transfer Objects (DTOs)

1. `ProcurementReturnDto.java`:
   - `supplierId`, `originalInvoiceId`, `originalGrnId`, `depotId`, `returnType`, `returnReason`, `deliveryChallanRequired`, `lines: List<ProcurementReturnLineDto>`.
2. `ProcurementReturnResultDto.java`:
   - `returnId`, `returnNumber`, `deliveryChallanNumber`, `ewayBillPayload`, `taxableAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `totalReturnAmount`, `glJournalId`, `itcReversalStatus`.
3. `SupplierCreditNoteMatchDto.java`:
   - `returnId`, `supplierCreditNoteNumber`, `supplierCreditNoteDate`, `supplierGstin`, `gstr2bTaxableValue`, `gstr2bTaxValue`.

---

## 4. End-to-End Execution Sequence
1. **Validation**: Check tenant isolation, user authorization, depot DataScope, and quantity invariants ($\text{Return Qty} \le \text{Depot Stock}$ and $\le \text{Open Invoiced Qty}$).
2. **Physical Stock Deduction**: If `returnType == PHYSICAL_RETURN`, decrement physical depot inventory in `erp_material_current_stock`.
3. **Delivery Challan Generation**: If physical return, generate Rule 55 Delivery Challan with consecutive FY sequence.
4. **GL Double-Entry Posting**:
   - `Dr 2101 Accounts Payable` (or `1105 Advances` if fully paid) for Total Return Amount.
   - `Cr 1401 Inventory Asset` for Taxable Value.
   - `Cr 1301/1302/1303 Input GST Recoverable` for Tax Amount (unless Section 17(5) blocked).
5. **Operational Cache Sync**: Reduce `erp_supplier.all_need_pay`.
6. **DAG Lineage Linkage**: Insert edge `PURCHASE_INVOICE -> PURCHASE_RETURN` in `erp_document_relationship`.
