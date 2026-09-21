# Procurement Frontend Retrofit: P3 Gap Analysis

**Module**: Goods Receipt Note (GRN), QC/Quarantine Inward Split, Moving Average Valuation & Three-Way Match Engine  
**Analysis Date**: 2026-08-21  
**Scope**: React Frontend vs Certified P3 Backend Architecture  

---

## 1. Executive Summary

The backend P3 layer (`GoodsReceiptService.java` and `ThreeWayMatchEvaluationService.java`) provides authoritative physical receipt posting into `erp_material_current_stock`, moving average cost updates on `erp_material_extend.purchase_decimal`, QC inspection quantity splits (Accepted vs Rejected/Quarantine), over-receipt tolerance gates, and a multi-dimensional Three-Way Match evaluation engine (`PASS`, `WARNING`, `BLOCK`).

The existing React frontend for receipts (`PurchaseInboundList.tsx`) treats goods receipts as basic CRUD inventory stock-ins without any quality inspection split, over-receipt warning, or Three-Way Match integration.

---

## 2. Detailed Gap Matrix

| Feature / Control | Certified Backend Contract | Current Frontend State (`PurchaseInboundList.tsx`) | Gap / Remediation Needed |
|:---|:---|:---|:---|
| **PO Linkage & Line Selection** | `poHeaderId`, `poItemId` linked to `erp_po_line_fulfillment` | Inbound items manually typed without strict PO reference | Add **"Create GRN from Purchase Order"** modal allowing warehouse staff to select an approved PO and auto-populate open items with remaining balances. |
| **Accepted vs Rejected Split** | `accepted_quantity` (restocks active inventory) vs `rejected_quantity` (quarantine) | Single `oper_number` field (assumes 100% accepted) | Split line quantity input into **"Accepted Qty"** and **"Rejected Qty"** with a **"Rejection Reason"** dropdown (Defective, Damaged in Transit, Wrong Spec). |
| **Over-Receipt Tolerance Alert** | Validates $\text{received} + \text{incoming} \le \text{ordered} \times (1 + \text{tolerance})$ (throws 400 if exceeded) | No validation; allows arbitrary receipt quantities | Real-time frontend validation highlighting lines exceeding open balance with tolerance warning. |
| **Quarantine & Valuation Visibility** | Real-time Moving Average recalculation; rejected stock excluded from sellable stock | No valuation preview or quarantine tag | Add a summary badge showing **"Active Stock Impact"** (Rs. & Qty) and **"Quarantined Items"** (Qty). |
| **Three-Way Match Presentation** | `ThreeWayMatchEvaluationService` outputting `PASS`, `WARNING`, `BLOCK` with line-level price/qty variances | Completely absent from frontend | Implement a dedicated **"Three-Way Match Evaluation Card"**: <br>• Green (`PASS`): Full alignment<br>• Amber (`WARNING`): Minor price/qty variance within tolerance<br>• Red (`BLOCK`): Billed without receipt or excessive price variance with explicit block reasons. |

---

## 3. Component Architecture Retrofit

```
ERPSystem-web-react/src/features/procurement/
├── pages/
│   └── GoodsReceiptListPage.tsx            (List of GRNs with PO linkage, QC status, and depot badges)
├── components/
│   ├── GoodsReceiptCreateModal.tsx         (PO selector, line balance lookup, accepted/rejected inputs)
│   ├── QcInspectionDetailsDrawer.tsx       (Detailed inspection breakdown, remarks, and quarantine info)
│   └── ThreeWayMatchViewerModal.tsx        (Interactive 3-way match comparator for PO vs GRN vs Invoice)
```
