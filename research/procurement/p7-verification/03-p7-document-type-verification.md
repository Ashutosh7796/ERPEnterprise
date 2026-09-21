# 03 - Procurement Phase P7: Document Type Taxonomy & Authority Verification

**Document Ref**: `PROC-P7-VERIF-03`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY TAXONOMY & NUMBERING SPECIFICATION**  

---

## 1. Document Classification Matrix: Who Issues What and When?

A frequent architectural anti-pattern in ERP systems is treating every return as a "Buyer GST Debit Note" under Rule 53. Under Indian GST law, the document roles are strictly delineated:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               DOCUMENT ROLES UNDER GST LAW                             │
├──────────────────────────────┬──────────────────────────────┬──────────────────────────┤
│ Document Category            │ Issuing Entity               │ Statutory / Commercial   │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────┤
│ 1. Outbound Delivery Challan │ Buyer (Enterprise)           │ Statutory (Rule 55)      │
│ 2. Purchase Return Note      │ Buyer (Enterprise)           │ Commercial Accounting    │
│ 3. Supplier Credit Note      │ Vendor (Supplier)            │ Statutory (Sec 34(1))    │
│ 4. Supplier Debit Note       │ Vendor (Supplier)            │ Statutory (Sec 34(3))    │
│ 5. RCM Self-Credit Note      │ Buyer (Enterprise)           │ Statutory (Sec 31(3)(g)) │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────┘
```

---

## 2. Definitive Document Type Definitions

### 2.1 Outbound Delivery Challan (`DOC_DELIVERY_CHALLAN_RET`)
- **Issuer**: Buyer (Consignor)
- **Legal Authority**: Rule 55 of CGST Rules, 2017.
- **Purpose**: Covers physical transit of returned goods back to the supplier.
- **Numbering Standard**: Alphanumeric serial number up to 16 characters, consecutive and unique for a financial year (e.g. `DC-RET-2627-0001`).
- **Required Fields**:
  - Consignor Name, Address, GSTIN, Depot Location.
  - Consignee (Supplier) Name, Address, GSTIN, Delivery Place.
  - Reference Purchase Order and Original GRN numbers.
  - HSN code, material description, quantity, unit of measurement.
  - Taxable value, tentative tax rate, purpose ("Returning Defective Goods / Purchase Rejection").
  - Transportation mode, vehicle number, transporter ID.

---

### 2.2 Commercial Purchase Return Note (`DOC_PURCHASE_RETURN_NOTE`)
- **Issuer**: Buyer (Enterprise)
- **Legal Authority**: Internal Accounting Standard / Commercial Contract.
- **Purpose**: Adjusts Supplier Accounts Payable ledger in ERP immediately upon dispatch/approval.
- **Numbering Standard**: `PRN-2627-0001` (unique per financial year and tenant).
- **Required Fields**:
  - Linked Purchase Invoice ID and Number.
  - Linked Goods Receipt ID and Number.
  - Line-level return quantity, original unit price, discount adjustment, GST reversal amounts.
  - Reason code (Defective, Damaged in Transit, Quality Rejection, Pricing Discrepancy, Excess Supply).
  - General Ledger double-entry voucher linkage.

---

### 2.3 Supplier Statutory GST Credit Note (`DOC_SUPPLIER_GST_CREDIT_NOTE`)
- **Issuer**: Supplier (Vendor)
- **Legal Authority**: Section 34(1) of CGST Act, 2017 & Rule 53 of CGST Rules.
- **Purpose**: The statutory instrument that reduces the supplier's GST output tax and buyer's input tax credit on the GST portal.
- **Auto-Reconciliation**:
  - Ingested via GSTR-2B API or uploaded manually by Accounts Payable.
  - Contains supplier's Credit Note Number, Date, Taxable Value, CGST/SGST/IGST, and Original Invoice Reference.
  - Matches 1:1 or 1:N with internal Purchase Return Notes (`erp_procurement_return`).

---

### 2.4 Commercial Price Adjustment Note (`DOC_COMMERCIAL_PRICE_ADJUSTMENT`)
- **Issuer**: Buyer or Supplier
- **Legal Authority**: Contractual Agreement / Commercial Settlement (No physical goods movement).
- **Purpose**: Records rate corrections, volume rebates, or settlement discounts.
- **Accounting Path**: Adjusts AP against Purchase Price Variance / Rebates without inventory movement.

---

### 2.5 RCM Self-Credit Adjustment Voucher (`DOC_RCM_SELF_CREDIT_VOUCHER`)
- **Issuer**: Buyer (as Deemed Taxpayer)
- **Legal Authority**: Section 31(3)(f), Section 31(3)(g), Section 9(3)/9(4).
- **Purpose**: Reverses self-assessed RCM liability and RCM ITC when goods/services from unregistered suppliers are returned or cancelled.

---

## 3. Financial Year Document Numbering Compliance
Per Rule 46(b) and Rule 53 of CGST Rules:
1. Document numbers must not exceed **16 characters**.
2. Must contain only letters, numbers, and special characters `/` or `-`.
3. Must be **unique and consecutive** for each financial year (April 1 to March 31).
4. System enforces tenant-isolated, fiscal-year-isolated sequence counters in `erp_sequence_counter`.
