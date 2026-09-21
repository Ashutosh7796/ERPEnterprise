# 07 - Procurement Workflow Analysis

**Target Standard**: Mid-Market Enterprise Procurement Flow  
**Design Approach**: Reference-Driven (metasfresh + ERPNext best practices adapted for mid-market efficiency)  

---

## 1. Candidate Standard Procurement Workflow

```text
[1. Demand / Inventory Requisition] (Material Stock Warning / Purchase Request)
                     │
                     ▼
[2. Request for Quotation (RFQ)] (Optional Multi-Vendor Tender)
                     │
                     ▼
[3. Supplier Quotation] ──► [Quotation Evaluation / L1 Selection]
                     │
                     ▼
[4. Purchase Order (PO)] ──► [Multi-Tier Approval Engine (Threshold & SoD Rules)]
          │
    ┌─────┴─────────────────────────┐
    ▼                               ▼
[5. Goods Receipt Note (GRN)]   [6. Purchase Invoice (Direct Service / Direct Bill)]
    │                               │
    ├─► Quality Verification / QC   │
    │   (Accepted vs Rejected Qty)  │
    │                               │
    └───────────────┬───────────────┘
                    ▼
[7. Three-Way Matching Engine] (PO Qty/Price ⟷ GRN Accepted Qty ⟷ Invoice Line)
                    │
                    ▼
[8. Statutory Tax & ITC Classification] (Eligible vs Blocked ITC, RCM Determination)
                    │
                    ▼
[9. Double-Entry GL Accounting] (Dr Inventory/Expense, Dr Input GST, Cr Accounts Payable)
                    │
                    ▼
[10. Payment & Advance Allocation] (Advance Settlement, Multi-Bill Cheque/NEFT Voucher)
                    │
                    ▼
[11. Purchase Return & Statutory Debit Note] (Rule 53 Reversal, Restocking, AP Deduction)
```

---

## 2. Legitimate Mid-Market Alternative Flows

1. **Standard 3-Way Match Flow (Stock Goods)**:
   $$\text{PO} \xrightarrow{\text{Approve}} \text{GRN (Receipt)} \xrightarrow{\text{Match}} \text{Purchase Invoice} \xrightarrow{\text{Post}} \text{Payment}$$
2. **Direct Billing / Service Purchase Flow (No Physical Receipt)**:
   $$\text{PO (Service / Utility / Maintenance)} \xrightarrow{\text{Approve}} \text{Purchase Invoice} \xrightarrow{\text{Post}} \text{Payment}$$
3. **Emergency Spot Purchase (Direct Bill without prior PO)**:
   $$\text{Direct Purchase Invoice} \xrightarrow{\text{Approve \& Post}} \text{Automatic Restocking} \xrightarrow{\text{GL Posting}} \text{Payment}$$
4. **Advance Payment to Vendor Prior to Delivery**:
   $$\text{PO} \xrightarrow{\text{Advance Voucher}} \text{GRN (Receipt)} \xrightarrow{\text{Invoice}} \text{Auto-settle Advance} \xrightarrow{\text{Net AP Balance}}$$
5. **Partial Fulfillment & Multiple Shipments**:
   * One PO $\rightarrow$ Many partial GRNs ($1 \rightarrow N$).
   * Many GRNs $\rightarrow$ One Consolidated Monthly Vendor Invoice ($N \rightarrow 1$).
   * One GRN $\rightarrow$ Split Invoices across multiple delivery batches.
