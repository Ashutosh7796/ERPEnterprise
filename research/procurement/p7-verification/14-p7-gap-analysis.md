# 14 - Procurement Phase P7: Comprehensive Gap Analysis

**Document Ref**: `PROC-P7-VERIF-14`  
**Evaluation Date**: August 2026  
**Status**: **CODEBASE & SCHEMA GAP ASSESSMENT**  

---

## 1. Executive Summary of Gaps
Prior to Phase P7, the ERP codebase had legacy Chinese-origin purchase return entities (`erp_depot_head` with `type='出库'`, `sub_type='采购退货'`), but lacked:
1. Native Indian GST Rule 55 Outward Delivery Challan generation.
2. Direct integration with GSTR-3B Table 4(B)(2) permanent ITC reversal.
3. Automated GSTR-2B 2-way matching against Supplier Credit Notes.
4. Clear separation between physical returns (Scenario A) and commercial price disputes (Scenario B).
5. Immutable multi-level quantity validation hierarchy preventing over-returns across consolidated invoices.

---

## 2. Detailed Gap Matrix & Required Modernizations

| Functional Area | Current Baseline State | Required P7 State | Action Required |
| :--- | :--- | :--- | :--- |
| **Return Schema** | Generic `erp_depot_head` without GST tax breakups or invoice linkage. | Dedicated `erp_procurement_return` and `erp_procurement_return_item` tables. | **CREATE NEW SCHEMA** |
| **Transport Document** | No delivery challan support. | Rule 55 compliant Delivery Challan with 16-character FY unique sequence. | **IMPLEMENT CHALLAN GENERATOR** |
| **E-Way Bill Payload** | Basic JSON exporter. | Outward return E-Way Bill payload with Sub-type `Return/Rejection` and Challan Doc Type. | **IMPLEMENT EWB BUILDER** |
| **GL Reversal Engine** | Manual or basic inventory debit/credit. | Canonical GL double-entry posting (`Dr 2101 AP, Cr 1401 Inventory, Cr 1301/2/3 Input Tax`). | **INTEGRATE POSTING SERVICE** |
| **Blocked ITC Handling** | Not accounted for during returns. | Reversal from capitalized inventory asset with zero touch to ITC accounts. | **IMPLEMENT SEC 17(5) GUARD** |
| **GSTR-2B Matching** | No vendor credit note matching. | 2-way reconciler linking vendor's GSTR-2B Credit Note with internal Return Note. | **IMPLEMENT RECONCILER** |
| **Frontend UI** | Legacy Vue list page. | Modern React TypeScript cockpit (`PurchaseReturnListPage`, `PurchaseReturnCreateModal`, `DeliveryChallanViewerModal`). | **IMPLEMENT REACT FRONTEND** |

---

## 3. Risk Mitigation Strategy
- **Zero Schema Disruption**: Existing legacy tables (`erp_depot_head`, `erp_depot_item`) continue to record physical inventory movements for backward compatibility, while new statutory and financial logic is managed cleanly in dedicated services and canonical GL tables.
- **Strict Transaction Boundaries**: All inventory updates, AP ledger adjustments, and GL journal lines execute within a single `@Transactional(value = "transactionManager")` boundary with full rollback on any failure.
