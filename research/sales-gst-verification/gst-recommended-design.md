# Recommended GST Architectural Design for Our Mid-Market ERP

---

## 1. Core Architecture Principles
1. **Unified Authoritative Commercial & Tax Invoice**: `erp_gst_sales_invoice` serves as the single source of truth for both commercial Accounts Receivable and statutory GST compliance.
2. **Immutable Snapshot on Posting**: When an invoice transitions to `POSTED`, an immutable JSON snapshot of all tax rates, HSN codes, party GSTINs, and calculated values is sealed to guarantee historical audit integrity.
3. **Decoupled Physical Logistics**: Outbound Delivery / Dispatch notes in `erp_depot_head` represent physical warehouse movement; they link to parent Sales Orders and generate one or more Tax Invoices.
4. **Automated Double-Entry Accounting Integration**: Invoice posting immediately creates GL vouchers debiting Customer AR and crediting Revenue and statutory Output GST sub-accounts.

---

## 2. Tax Determination Flowchart

```text
[ Sales Order / Dispatch Item Lines ]
                 │
                 ▼
[ Retrieve Supplier Company GSTIN ] ──► Extracts Supplier State Code (e.g. 27 MH)
                 │
                 ▼
[ Determine Place of Supply (POS) ] ──► If Bill-to/Ship-to Leg 1: Buyer State Code
                 │                      If Direct Movement: Delivery State Code
                 ▼
[ Compare Supplier State vs POS ]
        ├── If Match ────────► Intra-State Supply: CGST (Rate/2) + SGST (Rate/2)
        └── If Different ────► Inter-State Supply: IGST (Rate)
                 │
                 ▼
[ Check Special Party Scheme ]
        ├── SEZ Developer/Unit ──► Inter-State IGST (or Zero-Rated if LUT Active)
        ├── Export (Overseas) ───► Zero-Rated if LUT Active (or IGST with Refund)
        └── Composition/Exempt ──► 0% Tax (Bill of Supply)
                 │
                 ▼
[ Calculate Line Item Taxable Value & Tax Amounts (2 Decimals) ]
                 │
                 ▼
[ Apply Section 170 Round-Off to Document Grand Total ]
                 │
                 ▼
[ E-Invoice Threshold Gate (AATO >= 5 Cr & B2B) ──► Generate IRN ]
```
