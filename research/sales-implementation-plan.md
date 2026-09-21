# Refined Sales Module & Statutory GST Implementation Plan

---

## 1. Architectural Design Principles & Clarifications

### 1.1 Authoritative Invoice Definition
* **Single Source of Truth**: `erp_gst_sales_invoice` is formally designated as the **Authoritative Commercial & Accounts Receivable (AR) Invoice** as well as the statutory compliance document.
* **No Duplicate Invoices**: The dispatch record in `erp_depot_head` (`sub_type='SALES_DISPATCH'`) is purely a **Packing Slip / Outbound Delivery Note** tracking physical inventory decrements. It does **not** create separate commercial receivables.
* **Financial Ledger Posting**: When `erp_gst_sales_invoice` transitions to `POSTED`, it immediately generates the official General Ledger entry:
  * `Dr Customer Accounts Receivable` (Gross Invoice Amount)
  * `Cr Sales Revenue Account` (Net Taxable Amount)
  * `Cr Output CGST / SGST / IGST Accounts` (Itemized Tax Amounts)
  * `Dr/Cr Round Off Account` (Fractional Rupee Difference per Section 170)

---

### 1.2 Document Lineage & Partial Fulfillment Engine
The end-to-end document lineage is structured as follows:
```text
Quotation (erp_quotation)
    ↓ (1:1 or 1:N)
Sales Order (erp_depot_head, sub_type='SALES_ORDER')
    ↓ (1:N Partial or Full)
Outbound Delivery / Dispatch (erp_depot_head, sub_type='SALES_DISPATCH')
    ↓ (N:1 Multi-Delivery Consolidation or 1:1)
Authoritative Sales Invoice (erp_gst_sales_invoice)
    ↓ (1:N Payment Allocations)
Payment Collection Voucher (erp_account_head, type='收款')
```
* **Line Quantity Tracking (`erp_depot_item`)**:
  * `ordered_qty`: Total quantity contracted on the Sales Order line.
  * `delivered_qty`: Cumulative quantity shipped across all associated delivery dispatches.
  * `invoiced_qty`: Cumulative quantity billed across all associated sales invoices.
  * `remaining_delivery_qty = ordered_qty - delivered_qty`.
  * `remaining_invoice_qty = delivered_qty - invoiced_qty` (or `ordered_qty - invoiced_qty` if direct billing).
* **Multi-Delivery Consolidation**: A single Authoritative Sales Invoice can consolidate multiple Delivery Notes from the same customer and billing GSTIN.

---

### 1.3 Fine-Grained Stock Reservation Model
* **Reservation Ownership Entity**: `erp_stock_reservation`
  * `id` (BIGINT PK)
  * `tenant_id` (BIGINT)
  * `order_id` (BIGINT FK $\rightarrow$ `erp_depot_head.id`)
  * `order_line_id` (BIGINT FK $\rightarrow$ `erp_depot_item.id`)
  * `material_id` (BIGINT FK $\rightarrow$ `erp_material.id`)
  * `depot_id` (BIGINT FK $\rightarrow$ `erp_depot.id`)
  * `reserved_qty` (DECIMAL(12,4))
  * `consumed_qty` (DECIMAL(12,4))
  * `status` (`ACTIVE`, `CONSUMED`, `CANCELLED`)
* **Lifecycle Rules**:
  1. *Creation*: When Sales Order is **Approved**, an `ACTIVE` reservation is created for each line item.
  2. *Consumption*: When Delivery Dispatch is posted, `consumed_qty` increments and physical inventory decreases.
  3. *Release / Cancellation*: When a Sales Order is cancelled, closed, or rejected, remaining active reservations are immediately marked `CANCELLED`.
  4. *Concurrency Protection*: Atomic database update with pessimistic locking (`SELECT ... FOR UPDATE`) on `erp_material_extend` to prevent overselling.

---

### 1.4 Configurable Customer Credit Exposure Engine
* **Credit Exposure Formula**:
  $$\text{Exposure} = \text{Outstanding AR Invoices} + \text{Overdue Invoices} + \text{Unbilled Approved Orders} + \text{Current Order Total} - \text{Unallocated Advances} - \text{Unadjusted Credit Notes}$$
* **Configurable Policy Toggles** (Tenant Level):
  * `credit_check_policy`: `STRICT_BLOCK` (hard error preventing SO approval) vs `WARNING_ONLY` (alerts sales manager) vs `DISABLED`.
  * `overdue_grace_days`: Allow order confirmation if overdue invoices are within $N$ grace days.

---

### 1.5 Accounting & Perpetual Inventory Schedule

```text
Event 1: Delivery Dispatch (Outbound Shipping)
   → Dr Cost of Goods Sold (COGS) Account
   → Cr Finished Goods Inventory Asset Account
   (Value: Standard Moving Average Cost × Delivered Qty)

Event 2: Authoritative Sales Invoice Posting
   → Dr Customer Accounts Receivable (Gross Amount)
   → Cr Sales Revenue Account (Taxable Value)
   → Cr Output CGST Account (Intra-State)
   → Cr Output SGST Account (Intra-State)
   → Cr Output IGST Account (Inter-State)
   → Dr/Cr Round Off Expense/Income (Fractional Rounding)

Event 3: Payment Collection & Invoice Settlement
   → Dr Bank / Cash Account
   → Cr Customer Accounts Receivable

Event 4: Sales Return / GST Credit Note
   → Dr Sales Return / Revenue Adjustment
   → Dr Output GST Adjustment
   → Cr Customer Accounts Receivable
   → Dr Finished Goods Inventory (Restocked Items)
   → Cr Cost of Goods Sold (COGS)
```

---

## 2. Refined Implementation Sequence (S1 – S7)

```text
S1: Document Lineage & Quantity Tracking
    ├── Add delivered_qty, invoiced_qty, link_id tracking to erp_depot_item
    └── Update DepotItemService & DepotHeadService for partial fulfillment balances

S2: Sales Quotation & Multi-Tier SO Approval
    ├── Implement erp_quotation entity, QuotationService, QuotationController
    ├── Add "Convert Quotation to Sales Order" action
    └── Add Credit Exposure calculation gate to Sales Order approval

S3: Fine-Grained Stock Reservation Engine
    ├── Implement erp_stock_reservation table and StockReservationService
    └── Hook reservation creation to SO approval and consumption to Outbound Delivery

S4: Authoritative Sales Invoice & GST Engine Refinement
    ├── Unify commercial AR invoice into GstSalesInvoiceService
    ├── Support multi-delivery consolidation onto single invoice
    └── Implement Bill-to vs Ship-to Place of Supply and 30-day e-invoice window

S5: Automated GL & Accounting Schedule Posting
    ├── Hook Invoice Posting to automated AR vs Revenue vs Output GST ledger posting
    └── Hook Delivery Dispatch to automated COGS vs Inventory perpetual posting

S6: Payment Allocation & Advance Settlement
    ├── Add invoice settlement allocation grid in Collection Notes
    └── Support unallocated advance payment reconciliation against open invoices

S7: Sales Returns & Credit Note Refinement
    ├── Enforce original invoice line item matching during return
    └── Restock inventory to designated return/damaged depot and reverse GL
```

---

## 3. Verification & Test Plan

| Step | Test Scenario | Expected Outcome |
|---|---|---|
| **V1** | Partial Delivery & Invoicing | 100 ordered $\rightarrow$ 60 delivered $\rightarrow$ 60 invoiced $\rightarrow$ Remaining: 40 delivery, 40 invoice. |
| **V2** | Multi-Delivery Consolidation | Delivery 1 (50 units) + Delivery 2 (50 units) $\rightarrow$ Single Invoice generated for 100 units. |
| **V3** | Stock Reservation Concurrency | 2 concurrent orders for last 10 units $\rightarrow$ Exactly 1 order reserves; 2nd order blocked. |
| **V4** | Credit Limit Hard Block | Customer with ₹1,00,000 limit and ₹90,000 outstanding attempts ₹20,000 SO $\rightarrow$ Blocked with 403. |
| **V5** | Double-Entry Balancing | Invoice with ₹1,00,000 + 18% GST $\rightarrow$ Dr AR ₹1,18,000 == Cr Revenue ₹1,00,000 + Cr GST ₹18,000. |
| **V6** | Tripartite Bill-to/Ship-to | Supplier MH $\rightarrow$ Buyer DL $\rightarrow$ Delivery Site MH $\rightarrow$ Correctly charges IGST 18% to Buyer DL. |
