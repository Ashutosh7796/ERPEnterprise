# 13 - Comprehensive Gap Analysis: Initial Proposal vs Verified Statutory Architecture

**Document Ref**: `PROC-P5-P7-GAP-ANALYSIS-13-REV2`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY & ARCHITECTURAL GAP RESOLUTION**  

---

## 1. Summary of Identified Gaps & Final Design Resolutions

| # | Domain / Area | Initial Proposal Assumption | Verified Statutory / Accounting Reality | Gap Severity | Resolution in Final Design |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **P6: TDS Law Hard-Coding vs Versioning** | Hard-coded "Section 194Q = 0.1%" engine | The applicable tax law depends on the transaction date: Income-tax Act, 1961 for events $< \text{01-Apr-2026}$, and Income-tax Act, 2025 for events $\ge \text{01-Apr-2026}$. | **CRITICAL** | Designed date-effective `erp_tax_withholding_rule` schema storing `law_version`, `provision_ref`, `applied_rate`, `threshold`, and `calculation_basis` on every deduction voucher. |
| **2** | **P7: Purchase Return Document Nomenclature & Authority** | Buyer generates "Rule 53 GST Debit Note" | Under CGST Act Sec 34 & Rule 53, statutory credit/debit notes are issued exclusively by the **Supplier**. The Buyer generates a **Commercial Purchase Return Note & Delivery Challan (Rule 55)** and triggers **ITC Reversal under Sec 34(2) in GSTR-3B Table 4(B)(2)**. Separate buyer debit notes apply only to distinct statutory scenarios (e.g. RCM u/s 31(3)(g)). | **CRITICAL** | Disambiguated into 3 distinct statutory scenarios: Scenario A (Physical Return), Scenario B (Commercial AP Adjustment), and Scenario C (Buyer RCM Self-Debit Note). |
| **3** | **P6: MSME 43B(h) Trader Scope** | All Udyam registered suppliers receive 15/45-day payment badges | Per Ministry of MSME Office Memorandums (02/07/2021 & 01/09/2021), **Retail & Wholesale Traders (NIC 45-47) are EXCLUDED** from Section 15-23 payment protections and Section 43B(h) disallowance. | **HIGH** | Added entity type filter (`MANUFACTURING`, `SERVICES` vs `TRADER`) in MSME compliance engine. |
| **4** | **P5: Landed Cost on Dispatched Stock** | 100% of Landed Cost capitalized to remaining inventory asset | Per Ind AS 2, if part of the GRN stock has already been dispatched/sold, capitalizing 100% artificially inflates remaining unit cost. Landed cost for already-sold goods must post directly to `5101 COGS`. | **HIGH** | Implemented proportional split between `1401 Inventory Asset` (on-hand stock) and `5101 COGS` (dispatched stock). |
| **5** | **P6: TDS Timing & Advance Base** | TDS deducted only on final invoice posting | Section 194Q / 2025 TDS triggers at **earlier of credit or payment**. On advance payments, TDS applies to gross advance amount. On invoice credit, TDS applies to taxable value excluding separately stated GST (CBDT Circular 13/2021). | **HIGH** | Enhanced TDS engine to deduct on advance payments and compute net incremental TDS on invoice settlement. |
| **6** | **P7: Blocked ITC Return Reversal** | All purchase returns credit input GST recoverable accounts | For goods where ITC was blocked u/s 17(5) and capitalized into asset cost, returns must adjust the capitalized asset cost without touching input tax accounts. | **MEDIUM** | Segregated return tax routing based on original line `itc_eligible` flag. |
| **7** | **P5: GL Journal Engine Reuse** | Potential risk of duplicate procurement GL tables | Certified Sales S5 GL engine (`erp_gl_journal_entry`, `erp_gl_journal_line`) must be strictly reused. | **CRITICAL** | Enforced 100% reuse of canonical GL tables and shared Chart of Accounts. |
