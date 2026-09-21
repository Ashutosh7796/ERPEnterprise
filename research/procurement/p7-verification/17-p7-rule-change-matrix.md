# 17 - Procurement Phase P7: Statutory Rule Change Matrix

**Document Ref**: `PROC-P7-VERIF-17`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY RULE CHANGE & AUDIT MATRIX**  

---

## 1. Statutory Rule & Provision Change Matrix

| Rule / Provision | Effective Date | Applicability | Required ERP Behavior | Official Source | Regression Test ID | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CGST Act Sec 34(1)** | 01-Jul-2017 | Credit Note by Supplier | Supplier issues statutory GST Credit Note; ERP reconciles with Purchase Return Note. | CBIC / CGST Act | `P7-STAT-01` | **CONFIRMED** |
| **CGST Act Sec 34(2)** | 01-Oct-2022 | Cut-off Date for Credit Notes (30th Nov) | Credit notes reported up to 30th Nov following FY end; ERP forces commercial credit post-deadline. | Finance Act, 2022 | `P7-STAT-02` | **CONFIRMED** |
| **CGST Rules Rule 53** | 01-Jul-2017 | Particulars of Credit/Debit Notes | Enforces 16-character alphanumeric unique serial number per FY. | CBIC / CGST Rules | `P7-STAT-03` | **CONFIRMED** |
| **CGST Rules Rule 55** | 01-Jul-2017 | Delivery Challan for Outward Returns | Outward physical return moves under Rule 55 Delivery Challan in triplicate. | CBIC / CGST Rules | `P7-STAT-04` | **CONFIRMED** |
| **CGST Act Sec 16(2)** | 01-Jan-2022 | Mandatory ITC Reversal on Returned Goods | ITC ceases on returned goods; mandatory matching with GSTR-2B. | Finance Act, 2021 | `P7-STAT-05` | **CONFIRMED** |
| **CGST Act Sec 17(5)** | 01-Jul-2017 | Blocked ITC Returns | Reversal from capitalized asset cost; zero touch to ITC accounts. | CBIC / CGST Act | `P7-STAT-06` | **CONFIRMED** |
| **CGST Rules Rule 138** | 01-Apr-2018 | E-Way Bill for Physical Returns | Generates E-Way Bill payload for consignment value $> \text{₹50k}$ with Sub-type "Return". | NIC / E-Way Bill System | `P7-STAT-07` | **CONFIRMED** |
| **CGST Rules Rule 48(4)** | 01-Oct-2020 | E-Invoice / IRN Mandate | Buyer Rule 55 Delivery Challan is exempt from IRN; Supplier Credit Note captures IRN. | CBIC Notification 13/2020 | `P7-STAT-08` | **CONFIRMED** |
| **GSTR-3B Advisory** | 02-Sep-2022 | Table 4(B)(2) Gross Reversals | All purchase return ITC reversals reported in Table 4(B)(2) Others. | GSTN Portal Advisory | `P7-STAT-09` | **CONFIRMED** |
| **Ind AS 2 / AS 2** | 01-Apr-2016 | Moving Average Cost Valuation | Restocking/reduction at moving average unit cost with PPV variance handling. | MCA / ICAI Ind AS 2 | `P7-STAT-10` | **CONFIRMED** |

---

## 2. Transition & Deprecation Directives
1. **No "Buyer GST Debit Note" Mislabeling**: All internal return instruments are formally designated as **Commercial Purchase Return Notes** (coupled with Rule 55 Delivery Challans for transport).
2. **Strict Dual Accounting Invariance**: Every return journal entry mathematically satisfies $\sum \text{Debits} = \sum \text{Credits}$.
3. **No Over-Return Tolerance**: System enforces zero tolerance for quantity over-returns against GRN or Invoice lines.
