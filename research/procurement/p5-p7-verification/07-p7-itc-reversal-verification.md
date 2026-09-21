# 07 - Procurement Phase P7: Input Tax Credit (ITC) Reversal Statutory Verification

**Document Ref**: `PROC-P7-VERIF-07`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE STATUTORY VERIFICATION**  

---

## 1. Statutory Provisions & Legal Mechanics

### 1.1 CGST Act, 2017 & CGST Rules, 2017
- **Section 16(2)**: Eligibility and conditions for taking input tax credit (possession of tax invoice/debit note, receipt of goods, tax actually paid to government, furnishing of return).
- **Section 34(2)**: Mandatory adjustment of tax liability by recipient upon receipt of credit note.
- **Rule 37 / Rule 37A**: Reversal of ITC in case of non-payment of consideration within 180 days (Rule 37) or vendor non-payment of tax in GSTR-3B (Rule 37A).
- **GSTR-3B Reporting**:
  - Reversals arising from Purchase Returns / Vendor Credit Notes are reported in **Table 4(B)(2) — Others** (permanent reversal).

---

## 2. Timing & Reversal Triggers Matrix

| Scenario | Original ITC State | Action upon Purchase Return | Accounting / GSTR-3B Impact | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Return Before Invoice Posting** | Not Availed | No ITC reversal required | Stock balance adjusted at GRN level; invoice billed only for net accepted quantity. | **CONFIRMED** |
| **Return In Same Tax Month** | Availed in Draft/Active GSTR-3B | Reversal in same month return | Net eligible ITC reduced in Table 4(A)(5) or gross reversal in Table 4(B)(2). | **CONFIRMED** |
| **Return In Subsequent Tax Month** | Availed in Previous GSTR-3B | Mandatory Reversal in Current GSTR-3B | Reported in Table 4(B)(2) of current tax period return. | **CONFIRMED** |
| **Return on Blocked ITC Goods (Sec 17(5))** | Blocked (Capitalized in Cost) | No GST ITC reversal | Return value (Taxable + Blocked Tax) reduces Inventory Asset/Purchase Cost directly. | **CONFIRMED** |
| **Return on RCM Purchases (Sec 9(3))** | Self-Liability Paid & Availed | RCM Output Tax & RCM Input Tax Reversal | RCM liability reduced and corresponding RCM ITC reversed. | **CONFIRMED** |

---

## 3. General Ledger Double-Entry Journals for Purchase Returns

### 3.1 Standard Return with Eligible ITC Reversal
$$\text{Debit: Supplier Accounts Payable (2101)} \quad [\text{Total Return Value (Taxable + Tax)}]$$
$$\text{Credit: Inventory Asset / Raw Materials (1401)} \quad [\text{Taxable Value of Returned Goods}]$$
$$\text{Credit: Input CGST Recoverable (1301)} \quad [\text{CGST Reversal Amount}]$$
$$\text{Credit: Input SGST Recoverable (1302)} \quad [\text{SGST Reversal Amount}]$$
$$\text{Credit: Input IGST Recoverable (1303)} \quad [\text{IGST Reversal Amount}]$$

### 3.2 Return on Blocked ITC Goods (Section 17(5))
When returning goods where tax was originally blocked and capitalized into material cost:

$$\text{Debit: Supplier Accounts Payable (2101)} \quad [\text{Gross Bill Credit Amount}]$$
$$\text{Credit: Inventory Asset / Raw Materials (1401)} \quad [\text{Gross Value (Base + Capitalized Tax)}]$$

*(Zero balance touches Input Tax Recoverable accounts, ensuring compliance with Section 17(5)).*

---

## 4. Multi-Tax Component Segregation Algorithm

When a partial return occurs on an invoice containing mixed items or multiple tax slabs (e.g., 5%, 18%, 28%):

$$\text{Reversed Tax Component}_k = \sum_{i \in \text{Return Items}} \left( \text{Return Qty}_i \times \text{Unit Rate}_i \times \frac{\text{GST Rate}_i}{100} \right)$$

- **Intra-State Supply**: Split 50% to `1301 Input CGST` and 50% to `1302 Input SGST`.
- **Inter-State Supply**: Allocated 100% to `1303 Input IGST`.

---

## 5. Verification Assessment Matrix

| Design Requirement | Proposed Logic | Statutory Reference | Verification Status |
| :--- | :--- | :--- | :--- |
| **ITC Reversal Trigger** | Triggered upon Commercial Return Note / Credit Note | CGST Act Section 34(2) | **CONFIRMED** |
| **GSTR-3B Alignment** | Routes to Table 4(B)(2) Reversal | GSTR-3B Return Schema | **CONFIRMED** |
| **Tax Component Split** | Reverses exact CGST/SGST/IGST breakdown | CGST Rules Rule 53 | **CONFIRMED** |
| **Blocked ITC Treatment** | Reverses capitalized cost without touching input tax | CGST Act Section 17(5) | **CONFIRMED** |
| **Partial Return Apportionment** | Line-level unit rate & GST rate calculation | Ind AS 2 / CGST Act | **CONFIRMED** |
