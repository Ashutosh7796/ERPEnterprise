# Procurement Phase P6: MSME 43B(h) Compliance & Section 16 Penal Interest Integrity

## 1. Statutory Framework & Scope of Protection
Under Section 15 of the MSMED Act, 2006 and Section 43B(h) of the Income-tax Act:
- **Protected Entities**: `MICRO` and `SMALL` manufacturing and service enterprises holding active Udyam Registration.
- **Excluded Entities**:
  1. `MEDIUM` Enterprises (Turnover > ₹50 Cr or Investment > ₹10 Cr).
  2. `TRADERS`: Wholesale and retail traders (NIC codes 45, 46, 47) registered under Udyam are strictly excluded from Section 15 payment protection and Section 43B(h) disallowance per Ministry of MSME OM No. 5/2(2)/2021-E/P & G/Policy dated 02/07/2021.
  3. Non-MSME entities.

---

## 2. Statutory Due Date Calculation Clock
The payment clock runs from the **Date of Acceptance** (or Date of Deemed Acceptance):
1. **With Written Agreement**: Due on agreed date, subject to an absolute statutory ceiling:
   $$\text{Statutory Due Date} = \text{Acceptance Date} + \min(\text{Agreed Credit Days}, 45)$$
2. **Without Written Agreement**:
   $$\text{Statutory Due Date} = \text{Acceptance Date} + 15 \text{ Days}$$

---

## 3. Section 43B(h) Risk Classification & Tax Disallowance

| Compliance Status | Condition | Tax Treatment |
| :--- | :--- | :--- |
| **COMPLIANT_PAID** | Invoice settled on or before statutory due date | 100% Tax Deductible in FY of incurrence |
| **WITHIN_LIMIT** | Unpaid, but current date is within statutory due date | No disallowance risk |
| **OVERDUE_AT_RISK** | Unpaid past statutory due date, but before FY year-end (March 31) | Must be settled prior to March 31 to avoid tax disallowance |
| **DISALLOWED_43BH** | Unpaid past March 31 of invoice FY | **Disallowed for income tax purposes**; deductible only in the year of actual payment |

---

## 4. Section 16 Mandatory Penal Compound Interest
For overdue payments to Micro and Small enterprises:
- **Penal Rate**: $3 \times \text{RBI Bank Rate}$ (e.g. $3 \times 6.5\% = 19.5\%$ p.a.).
- **Compounding**: Compounded with monthly rests from the statutory due date until actual date of payment.
- **Formula**:
  $$A = P \left(1 + \frac{r_{\text{penal}}}{12}\right)^{n_{\text{months}}} - P$$
- **Non-Deductibility**: Interest payable under Section 16 of the MSMED Act is explicitly non-deductible under Section 23 of the MSMED Act for income tax computation.
