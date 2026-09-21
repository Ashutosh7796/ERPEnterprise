# Indian ERP / NextERP GST Reference Implementation Comparison

---

## 1. Architectural Patterns in Indian Enterprise ERPs
Standard Indian ERP implementations (e.g. NextERP / TallyPrime / Busy / SAP India Localization) handle GST through standardized tax templates and strict statutory document structures:
1. **Party GST Master**:
   * GSTIN (15-character statutory format: 2-digit state code + 10-digit PAN + 1 entity code + 'Z' + 1 check character).
   * Party Type: Regular, SEZ Developer, SEZ Unit, Deemed Export, Composition, Unregistered, Overseas.
2. **Item Tax Profile**:
   * HSN/SAC code with chapter/heading verification.
   * GST Rate Category (Exempt, Nil-Rated, 0%, 5%, 12%, 18%, 28%).
   * Cess Type (Ad-valorem % or Specific ₹ per quantity).
3. **Transaction Determination Engine**:
   * Dynamic Place of Supply matching against Company/Branch GSTIN state code.
   * Automated segregation into `Output CGST`, `Output SGST`, and `Output IGST` ledger accounts.

---

## 2. Granular Comparative Matrix: NextERP Pattern vs Our Implementation

| Dimension | Standard Indian ERP (NextERP Pattern) | Our Implementation | Synthesis & Recommendation |
|---|---|---|---|
| **Place of Supply Resolution** | Differentiates Billing State from Shipping State for Goods vs Services | Currently uses party primary state code | **Enhance**: Support separate Bill-to (buyer state) and Ship-to (delivery state) per order. |
| **Tax Item Ledger Mapping** | Automatically credits separate account per rate (e.g., `Output CGST 9%`, `Output SGST 9%`) | Handled via aggregated `Output GST` or item tax columns | **Adopt NextERP pattern**: Map GL postings to specific tax sub-accounts per rate bracket. |
| **E-Invoice Payload Building** | Generates standard Schema v1.03 JSON directly from finalized invoice snapshot | Dedicated `GstEinvoiceIntegrationService` generates compliant JSON | **Aligned**: Our JSON generator conforms to the official NIC v1.03 schema. |
| **Round-Off Treatment** | Auto-posts fractional round-off differences to `Round Off Account` | Net rounded at header level (`ROUND_HALF_UP`) | **Adopt NextERP pattern**: Generate explicit `Dr/Cr Round Off Account` line in GL posting. |
| **Credit Note Invoice Binding** | Enforces selection of original Tax Invoice ID and validates remaining balance | Mandatory original invoice linking enforced in `GstCreditDebitNoteService` | **Aligned**: Verified in our implementation. |
