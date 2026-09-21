# 03 - metasfresh Procurement Reference Architecture Analysis

**Reference Repository**: [`metasfresh/metasfresh`](https://github.com/metasfresh/metasfresh)  
**Reference Documentation**: [`docs.metasfresh.org`](https://docs.metasfresh.org/)  
**Role in Research**: **PRIMARY ARCHITECTURAL REFERENCE** for Mid-Market ERP Procurement  

---

## 1. metasfresh Procurement Concept Model

metasfresh models procurement as an event-driven supply-chain workflow tightly coupled to MRP (Material Requirements Planning), Contract Pricing, and Warehouse Logistics:

```text
[Material Requirement / MRP Planning]
                 │
                 ▼
[Purchase Requisition (C_Requisition)]
                 │
                 ▼
[Request for Quotation / Tender (C_RFQ)]
                 │
                 ▼
[Purchase Order (C_Order, IsSOTrx='N')]
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
[Material Receipt (M_InOut)]  [Vendor Invoice (C_Invoice)]
   │                           │
   └─────────────┬─────────────┘
                 ▼
[Invoice Matching (C_InvoiceMatch)] (Three-Way Match)
                 │
                 ▼
[Vendor Payment (C_Payment / C_AllocationHdr)]
```

---

## 2. Key metasfresh Domain Decisions & Patterns

### A. Strict Two-Phase Commitment & Matching
* **Document Separation**: In metasfresh, Goods Receipts (`M_InOut`) handle physical inventory stock movement, while Vendor Invoices (`C_Invoice`) handle legal/tax obligations and Accounts Payable.
* **`C_InvoiceMatch` Engine**: Automatically matches Receipt Lines $\longleftrightarrow$ Invoice Lines $\longleftrightarrow$ Purchase Order Lines. Variances (Price Variance vs Quantity Variance) are posted to dedicated accounting variance accounts.

### B. Procurement Document State Model
metasfresh uses an explicit finite state machine for purchasing documents (`DocStatus`):
* `DR` (Draft) $\rightarrow$ `IP` (In Progress) $\rightarrow$ `AP` (Approved) $\rightarrow$ `CO` (Completed) $\rightarrow$ `CL` (Closed) / `VO` (Voided) / `RE` (Reversed).
* **Immutability Rule**: Once a PO or Goods Receipt is in `CO` (Completed) state, it cannot be modified or deleted via ordinary CRUD. Reversals require an explicit compensating document.

### C. Quantity Tracking Mechanics
* `QtyOrdered`: Authoritative ordered quantity from the PO.
* `QtyDelivered`: Derived from posted `M_InOutLine` receipt records.
* `QtyInvoiced`: Derived from posted `C_InvoiceLine` records.
* `QtyReserved`: Expected incoming stock available to satisfy backorders.

---

## 3. What to Extract vs What to Omit for Our Mid-Market ERP

| metasfresh Feature | Relevance for Mid-Market ERP | Decision | Rationale |
|---|:---:|:---:|---|
| **Requisition $\rightarrow$ PO Lineage** | **REQUIRED** | **ADOPT** | Essential for internal procurement controls and budget accountability. |
| **Three-Way Matching (PO-GRN-Invoice)** | **REQUIRED** | **ADOPT** | Essential to prevent over-billing and unreceived inventory payments. |
| **Document State Immutability (`CO` / Reversal)** | **REQUIRED** | **ADOPT** | Prevents audit fraud and ensures GL reconciliation integrity. |
| **Complex Multi-Tier EDI Tender Bidding** | OPTIONAL | OMIT | Overly heavy for mid-market; simple RFQ comparison is sufficient. |
| **Automated Landed Cost Allocation Engine** | USEFUL | PHASE 2 | Advanced freight/customs duty distribution across inventory valuation. |
