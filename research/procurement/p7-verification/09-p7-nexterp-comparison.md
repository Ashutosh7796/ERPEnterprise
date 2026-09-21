# 09 - Procurement Phase P7: Nexterp Reference Comparison

**Document Ref**: `PROC-P7-VERIF-09`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY SOURCE COMPARISON**  

---

## 1. Source Verification & Baseline Status
- **System**: Nexterp / NextERP Enterprise Edition
- **Verification Status**: **NEXTERP SOURCE NOT FULLY VERIFIED IN LOCAL REPOSITORY**  
- **Analysis Method**: Evaluated against published Nexterp India GST functional specifications and API architecture docs.

---

## 2. Feature & Architecture Comparison

| Functional Area | Official Statutory Rule (CBIC / GST Council) | Nexterp Proposed Architecture | Our Enterprise ERP (Phase P7) | Alignment Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Physical Return Document** | Rule 55 Delivery Challan issued in triplicate with unique FY serial. | Uses custom "Return Note" with E-Way Bill export. | Generates Rule 55 Delivery Challan with 16-char FY sequence (`DC-RET-2627-XXXX`). | **CONFIRMED** |
| **Supplier Credit Note vs Debit Note** | Supplier issues Section 34(1) Credit Note; Buyer cannot issue a statutory Rule 53 note on seller's behalf. | Often labels buyer return as "GST Debit Note" (commercial naming). | Strict distinction: Internal "Purchase Return Note" + Reconciled "Supplier GST Credit Note". | **INCORRECT (Labeling corrected in our ERP)** |
| **Quantity Invariant** | $\text{Return Qty} \le \text{Accepted Qty} \le \text{Ordered Qty}$. | Enforces return against GRN line item. | Multi-level DAG line-item validation preventing over-returns. | **CONFIRMED** |
| **Stock Restocking / Reduction** | Decrements depot on-hand stock at current Moving Average Cost. | Decrements stock at original purchase rate. | Ind AS 2 moving average valuation with revaluation variance posting to PPV (`5105`). | **CONFIRMED** |
| **ITC Reversal Routing** | GSTR-3B Table 4(B)(2) permanent reversal. | Netted directly in Table 4(A)(5) (outdated practice). | Routes strictly to Table 4(B)(2) per GST Council circulars. | **CONFIRMED (Strict Modern Practice)** |
| **Blocked ITC Reversal** | No GST ITC reversal; reduces capitalized asset cost directly. | Sometimes incorrectly creates tax credit reversal lines. | Zero balance touches ITC accounts; reverses capitalized asset cost. | **CONFIRMED** |

---

## 3. Key Insights & Takeaways
1. Nexterp's separation of physical delivery challans from accounting debit notes provides a clean operational flow.
2. Our ERP enhances statutory precision by properly routing ITC reversals to GSTR-3B Table 4(B)(2) and distinguishing between internal commercial debit notes and supplier-issued Section 34(1) credit notes.
