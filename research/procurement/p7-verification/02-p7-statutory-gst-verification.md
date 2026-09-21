# 02 - Procurement Phase P7: Statutory GST & Legal Verification

**Document Ref**: `PROC-P7-VERIF-02`  
**Evaluation Date**: August 2026  
**Status**: **OFFICIAL STATUTORY VERIFICATION (CBIC & GST COUNCIL COMPLIANT)**  

---

## 1. Statutory Provisions & Legal Hierarchy

The statutory rules governing Purchase Returns, Credit Notes, Debit Notes, Delivery Challans, and ITC adjustments are verified against official Indian tax law:

```
┌─────────────────────────────────────────────────────────────┐
│                   CBIC / GST Council Mandate                │
├──────────────────────────────┬──────────────────────────────┤
│ Primary Act                  │ CGST / IGST Act, 2017        │
│ Principal Rules              │ CGST Rules, 2017 (Rules 53,  │
│                              │ 55, 36(4), 37, 37A, 138)     │
│ Statutory Forms              │ GSTR-1, GSTR-2B, GSTR-3B     │
│ Electronic Ecosystem         │ E-Way Bill System, e-Invoice │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Definitive Statutory Rule Mapping Matrix

| Rule / Provision | Effective Date | Applicability | Required ERP Behavior | Official Source Citation | Regression Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CGST Act Section 34(1)** | 01-Jul-2017 | Credit Note by Supplier for returned goods or price reduction | Supplier issues statutory GST Credit Note; ERP matches vendor's GSTR-2B Credit Note against internal Return Note. | Section 34(1), CGST Act, 2017 | `P7-STAT-01` |
| **CGST Act Section 34(2)** | 01-Jul-2017 (Amended 01-Oct-2022) | Recipient ITC Reduction & Time Limit for Credit Notes | Credit notes must be reported by supplier up to **30th November** following FY end. Recipient ERP must reverse ITC in the month of credit note receipt. | Finance Act, 2022 Notification No. 18/2022-CT | `P7-STAT-02` |
| **CGST Rules Rule 53** | 01-Jul-2017 | Particulars of Revised Invoices & Credit/Debit Notes | Defines mandatory particulars (16-digit alphanumeric unique FY serial, original invoice link, taxable value, GST rate, CGST/SGST/IGST). | Rule 53, CGST Rules, 2017 | `P7-STAT-03` |
| **CGST Rules Rule 55** | 01-Jul-2017 | Transportation of Goods under Delivery Challan | Outward physical return of goods by buyer to supplier must travel under a **Rule 55 Delivery Challan** issued in triplicate. | Rule 55(1)(c), CGST Rules, 2017 | `P7-STAT-04` |
| **CGST Act Section 16(2)** | 01-Jul-2017 (Amended 01-Jan-2022) | Eligibility & Conditions for taking ITC | ITC cannot be retained on goods that have been returned to the supplier; matching with GSTR-2B mandatory. | Section 16(2)(aa), CGST Act | `P7-STAT-05` |
| **CGST Act Section 17(5)** | 01-Jul-2017 | Ineligible / Blocked Input Tax Credit | For returns on goods where ITC was blocked, reversal is made against capitalized asset/expense, not against GST ITC accounts. | Section 17(5), CGST Act, 2017 | `P7-STAT-06` |
| **CGST Rules Rule 138** | 01-Apr-2018 | E-Way Bill for Physical Transport | Required for outward physical returns exceeding ₹50,000 consignment value using Document Type "Delivery Challan" and Sub-type "Return". | Rule 138, CGST Rules, 2017 | `P7-STAT-07` |
| **CGST Rules Rule 48(4)** | 01-Oct-2020 (Progressive Turnover) | E-Invoice / IRN Mandate | Buyer's Rule 55 Delivery Challan is *exempt* from IRN. Supplier's statutory Credit Note under Sec 34(1) requires IRN if supplier aggregate turnover > ₹5 Cr. | Notification No. 13/2020-CT & Circular 160/16/2021-GST | `P7-STAT-08` |
| **Circular 137/07/2020-GST** | 13-Apr-2020 | Clarification on Advance Refund vs Return of Goods | Clarifies treatment when advance was paid and order cancelled vs goods supplied and returned. | CBIC Circular No. 137/07/2020-GST | `P7-STAT-09` |
| **Circular 171/03/2022-GST** | 06-Jul-2022 | Clarification on Fake Invoicing & ITC Reversals | Directs exact handling of irregular supplies and mandatory ITC reversals with interest under Section 50(3). | CBIC Circular No. 171/03/2022-GST | `P7-STAT-10` |

---

## 3. GST Return Integration Details

### 3.1 GSTR-1 Impact (Supplier Perspective)
- The vendor uploads the Credit Note under **Table 9B (Credit/Debit Notes Registered)**.
- Reduces the vendor's net output tax liability in the filing month.

### 3.2 GSTR-2B Impact (Buyer Perspective)
- The vendor's Credit Note is auto-drafted into the buyer's **GSTR-2B Table 3 (Part A) — Input Tax Credit Available (Net of Credit Notes)** or listed in Credit/Debit Notes section with negative ITC.

### 3.3 GSTR-3B Impact (Buyer Return Filing)
- **Table 4(B)(2) — Others (ITC Reversal)**:
  - The ERP records the ITC reduction on purchase returns as a permanent reversal under Table 4(B)(2).
  - Formula: $\text{Net Available ITC} = \text{Table 4(A)(5) [All other ITC]} - \text{Table 4(B)(2) [Reversals on Returns]}$.
  - Netting directly in Table 4(A)(5) is discouraged under current GST portal advisory (Advisory dated 02-Sep-2022) which mandates gross reporting in 4(A) and gross reversals in 4(B).

---

## 4. Section 34(2) Statutory Cut-off Date & Time-Barred Returns
- **Statutory Deadline**: 30th November following the end of the financial year in which the supply was made, or the date of furnishing the annual return (GSTR-9), whichever is earlier.
- **Handling of Late Returns in ERP**:
  - If a physical return occurs *after* the 30th November deadline:
    - Supplier cannot issue a GST Credit Note with tax adjustment (Section 34(2) time-bar).
    - Supplier issues a **Financial / Commercial Credit Note** without GST.
    - Buyer must still reverse the original ITC voluntarily under Section 16(2) / Section 174 because the goods are no longer used in the course or furtherance of business.
    - ERP must support: (a) GST Return Note (within deadline), (b) Commercial Return Note with manual ITC reversal (post-deadline).
