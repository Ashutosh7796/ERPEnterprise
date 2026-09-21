# 13 - Procurement Gap Analysis & Mid-Market Scope Filter

**Analysis Focus**: Concrete Feature Gaps in Current ERP vs Mid-Market Scope Filtering  

---

## 1. Mid-Market Feature Classification Filter

| Procurement Feature | Reference in metasfresh / ERPNext | Scope Classification | Inclusion Decision |
|---|---|:---:|---|
| **Purchase Order State Machine** | metasfresh `DocStatus` / ERPNext `status` | **REQUIRED** | **INCLUDED (Phase P1)** |
| **P2P Document Lineage Engine** | ERPNext `Purchase Order Item` lineage | **REQUIRED** | **INCLUDED (Phase P1)** |
| **Purchase Order Approval & SoD** | ERPNext Workflow / metasfresh Role Auth | **REQUIRED** | **INCLUDED (Phase P2)** |
| **Goods Receipt & Inspection QC** | metasfresh `M_InOut` / ERPNext `Purchase Receipt` | **REQUIRED** | **INCLUDED (Phase P3)** |
| **Authoritative Vendor Invoice** | ERPNext `Purchase Invoice` | **REQUIRED** | **INCLUDED (Phase P4)** |
| **Input Tax Credit & RCM Engine** | ERPNext India GST Regional | **REQUIRED** | **INCLUDED (Phase P4)** |
| **GRNI & Double-Entry GL Accrual** | metasfresh / ERPNext Accounts | **REQUIRED** | **INCLUDED (Phase P5)** |
| **Advance Settlement & AP Aging** | ERPNext `Payment Entry` Allocation | **REQUIRED** | **INCLUDED (Phase P6)** |
| **Purchase Returns & Debit Notes** | Rule 53 / ERPNext Return Against Receipt | **REQUIRED** | **INCLUDED (Phase P7)** |
| **Material Requisition (MR)** | ERPNext `Material Request` | USEFUL | **PHASE P8 (Follow-Up)** |
| **Vendor RFQ & Quote Comparison** | metasfresh `C_RFQ` / ERPNext `RFQ` | USEFUL | **PHASE P8 (Follow-Up)** |
| **Multi-Tier International EDI Bidding**| metasfresh EDI | NOT REQUIRED | **EXCLUDED** |
| **Automated Landed Cost Variance Engine**| metasfresh Landed Cost Allocation | OPTIONAL | **EXCLUDED (Phase 2 Roadmap)**|

---

## 2. Identified Structural & Statutory Gaps in Current Codebase

```text
========================================================================================
                              SUMMARY OF PROCUREMENT GAPS
========================================================================================
  1. No Authoritative Lineage Table: Relies on generic depot_item linkages; lacks an
     explicit erp_po_line_fulfillment ledger to prevent over-receipt / over-billing.
  2. Missing Statutory Debit Notes: erp_gst_credit_debit_note currently only supports
     Sales Credit Notes; inward supply Debit Notes (Rule 53) are not implemented.
  3. No Section 17(5) Blocked ITC: GST calculation applies tax universally; lacks
     the ability to capitalize ineligible tax into inventory cost vs Input GST Asset.
  4. No GRNI Accrual Accounting: Current receipts directly impact inventory without
     maintaining a double-entry GRNI clearing ledger (2102).
  5. Missing Three-Way Match Gates: Price variance and quantity over-billing tolerances
     are not enforced between PO, GRN, and Purchase Invoice.
========================================================================================
```
