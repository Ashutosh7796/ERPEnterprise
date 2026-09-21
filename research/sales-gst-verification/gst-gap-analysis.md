# Detailed Statutory GST Gap Analysis & Action Plan

---

## 1. Statutory Gap Categorization Table

| Statutory Feature | Status in Current Code | Benchmark Standard | Gap Severity | Action Plan |
|---|:---:|---|:---:|---|
| **Place of Supply (Bill-To vs Ship-To)** | **Partial** | Must differentiate Billing State from Shipping State for Tripartite sales (Sec 10(1)(b)) | **High** | Add `billing_state_code` and `shipping_state_code` explicitly on sales documents. |
| **LUT Number & Date Storage** | **Partial** | Required on zero-rated export & SEZ invoices (Sec 16(3)(a) IGST) | **Medium** | Add `lut_number` and `lut_expiry_date` to `erp_company_gstin` table. |
| **30-Day E-Invoice Window Gate** | **Missing** | E-invoice reporting cannot exceed 30 days for notified taxpayers (Notif 38/2023-CT) | **Medium** | Add date validation check in `GstEinvoiceIntegrationService`. |
| **TDS Sec 194Q / TCS Sec 206C(1H)** | **Missing** | 0.1% deduction/collection on transactions $> ₹50\text{ Lakhs}$ | **High** | Add TDS/TCS computation in invoice and collection posting flows. |
| **GSTR-1 Table-wise JSON Export** | **Partial** | Tables 4A, 4B, 5A, 6A, 7, 8, 9B, 12 export for GST offline tool | **Medium** | Add structured GSTR-1 JSON export endpoint. |
| **Direct GL Tax Account Mapping** | **Partial** | Individual accounts for CGST 2.5%, SGST 2.5%, CGST 6%, SGST 6%, CGST 9%, SGST 9%, IGST 18% | **High** | Map each line's tax calculation to corresponding COA ledger account. |
