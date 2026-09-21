# 07 - Procurement Phase P7: Input Tax Credit (ITC) Reversal Statutory Verification

**Document Ref**: `PROC-P7-VERIF-07`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY ITC REVERSAL SPECIFICATION (GSTR-3B TABLE 4B2 & GSTR-2B MATCHING)**  

---

## 1. Statutory Foundations for ITC Reversal

Under the CGST Act, 2017:
- **Section 16(2)**: ITC is contingent upon actual receipt of goods. When goods are returned, the entitlement to ITC ceases for the returned portion.
- **Section 34(2)**: Where a supplier issues a credit note in relation to a supply, the recipient who has availed input tax credit shall reverse such credit.
- **Rule 36(4) & Rule 37A**: Requires strict reconciliation of ITC with supplier returns filed in GSTR-1.

---

## 2. Multi-Tax Component Segregation & ITC Calculation Rules

When a partial or full return is executed, the ITC reversal engine computes exact component amounts:

$$\text{Taxable Return Amount}_i = \text{Return Qty}_i \times \text{Invoiced Unit Price}_i$$

$$\text{Tax Reversal}_i = \text{Taxable Return Amount}_i \times \frac{\text{GST Rate}_i}{100}$$

### Tax Component Breakdown:
1. **Intra-State Supply** ($\text{Supplier State} = \text{Depot State}$):
   $$\text{CGST Reversal} = \frac{\text{Tax Reversal}_i}{2}, \quad \text{SGST Reversal} = \frac{\text{Tax Reversal}_i}{2}, \quad \text{IGST Reversal} = 0$$
2. **Inter-State Supply** ($\text{Supplier State} \ne \text{Depot State}$):
   $$\text{CGST Reversal} = 0, \quad \text{SGST Reversal} = 0, \quad \text{IGST Reversal} = \text{Tax Reversal}_i$$
3. **Special Economic Zone (SEZ) Supply**: Treated as inter-state supply $\to \text{IGST Reversal}$.

---

## 3. Comprehensive ITC Decision Matrix

| Original ITC Status | Return Nature | Supplier Document | ITC Reversal Action | GSTR-3B Reporting | GL Accounting Treatment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Eligible ITC** | Partial Physical Return | Sec 34(1) Credit Note | Reverse pro-rata ITC | Table 4(B)(2) Others | `Cr 1301/1302/1303 Input GST` |
| **Eligible ITC** | Full Physical Return | Sec 34(1) Credit Note | Reverse 100% ITC | Table 4(B)(2) Others | `Cr 1301/1302/1303 Input GST` |
| **Blocked ITC (Sec 17(5))** | Any Return | Sec 34(1) Credit Note | **Zero ITC Reversal** | **No GSTR-3B Entry** | `Cr 1401 Inventory / Asset` (gross) |
| **RCM Supply (Sec 9(3)/9(4))** | Any Return | Buyer Self-Credit Note | Reverse RCM ITC & Tax | Table 4(B)(2) & Table 3.1(d) | `Dr 2202 RCM Output, Cr 1304 RCM ITC` |
| **Commercial Price Rebate** | With Tax Adjustment | Sec 34(1) Credit Note | Reverse tax on rebate | Table 4(B)(2) Others | `Cr 1301/1302/1303 Input GST` |
| **Post-November 30 Return** | Time-Barred GST | Financial Credit Note | Voluntary ITC Reversal | Table 4(B)(2) Others | `Cr 1301/1302/1303 Input GST` |

---

## 4. Timing & Tax Period Treatment
1. **Return in Same Tax Period (Pre-Filing)**:
   - When return occurs in the same month as invoice before GSTR-3B is filed.
   - Recommended reporting: Disclose full invoice ITC in Table 4(A)(5) and full return reversal in Table 4(B)(2) to ensure matching audit trail with GSTR-2B.
2. **Return in Subsequent Tax Period**:
   - Original invoice ITC was availed and locked in previous month's GSTR-3B.
   - The reversal is reported in Table 4(B)(2) of the **current active filing period** in which the return / credit note is accounted.

---

## 5. GSTR-2B Reconciliation Engine
The system performs automated 2-way matching:
- **Rule 1 (Document Linkage)**: Matches `Supplier Credit Note Number` and `Original Invoice Number` from GSTR-2B JSON with internal `erp_procurement_return`.
- **Rule 2 (Value Tolerance)**: Verifies that $\text{GSTR-2B Taxable Value} = \text{ERP Taxable Return Value}$ within ₹1.00 rounding tolerance.
- **Rule 3 (Status Transition)**: When matched, `itc_reversal_status` transitions from `PENDING_RECONCILIATION` to `RECONCILED_MATCHED`.
