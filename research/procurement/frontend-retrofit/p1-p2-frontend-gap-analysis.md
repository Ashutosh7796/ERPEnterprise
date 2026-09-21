# Procurement Frontend Retrofit: P1 + P2 Gap Analysis

**Module**: Purchase Order Foundation, P2P Document Lineage & Multi-Tier Approval / SoD  
**Analysis Date**: 2026-08-21  
**Scope**: React Frontend vs Certified P1/P2 Backend Architecture  

---

## 1. Executive Summary

The backend P1/P2 layer (`PurchaseLineageService.java` and `PurchaseOrderApprovalService.java`) establishes an authoritative P2P lineage ledger (`erp_po_line_fulfillment`), strict Segregation of Duties (SoD), and multi-tier approval threshold evaluation. 

However, the existing React frontend for Purchase Orders (`PurchaseOrderList.tsx`) is a thin wrapper over the generic legacy `BillManager.tsx`. It lacks visibility into line-level fulfillment balances, approval queues, SoD restrictions, and approval audit history.

---

## 2. Detailed Gap Matrix

| Feature / Control | Certified Backend Contract | Current Frontend State (`BillManager.tsx`) | Gap / Remediation Needed |
|:---|:---|:---|:---|
| **Purchase Order List & Status** | `status` (0=Draft, 1=Approved, 2=Pending Approval, 3=Rejected, 4=Cancelled) | Basic table displaying generic status | Implement clear statutory & workflow status badges (Approved, Pending Approval, Rejected, Cancelled). |
| **Line-Level Fulfillment Lineage** | `GET /purchaseLineage/fulfillment/{poId}` returning `erp_po_line_fulfillment` (Ordered, Received, Accepted, Rejected, Invoiced, Remaining) | Only displays static PO items from `erp_depot_item` | Add a dedicated **"Fulfillment Lineage"** drawer/tab showing real-time balance tracking, received vs remaining receipt, and invoiced vs remaining invoice. |
| **Submit for Approval Action** | `POST /purchaseApproval/submit` | No submit action; orders directly saved | Add explicit **"Submit for Approval"** button on Draft orders. |
| **Approve / Reject Action Queue** | `POST /purchaseApproval/approve`, `POST /purchaseApproval/reject` | Generic "Audit" toggle button | Add an **Approval Action Modal** allowing managers to enter approval/rejection remarks and view order financial impact. |
| **Segregation of Duties (SoD) Guard** | Creator cannot approve own order under `STRICT` policy (throws 403) | Approve button visible to all users with edit role | Disable and tooltip the **"Approve"** button when `currentUserId == orderCreatorId` with message *"SoD Policy: Creators cannot approve their own Purchase Orders"*. |
| **Approval Audit History** | `GET /purchaseApproval/history/{poId}` (`erp_purchase_approval_history`) | No approval history component | Add **"Approval History"** timeline modal rendering chronological actions (SUBMIT, APPROVE, REJECT, CANCEL), timestamps, actor names, and comments. |
| **Pre-Fulfillment Cancellation** | `POST /purchaseApproval/cancel` (blocked if goods/invoice posted) | Simple row delete button | Replace row deletion with **"Cancel Purchase Order"** workflow with reason prompt, blocked if fulfillment exists. |

---

## 3. Component Architecture Retrofit

```
ERPSystem-web-react/src/features/procurement/
├── pages/
│   └── PurchaseOrderListPage.tsx          (Enhanced PO table with status filters & lineage quick-view)
├── components/
│   ├── PurchaseOrderFormModal.tsx         (PO creation with vendor, items, and tax preview)
│   ├── PurchaseOrderApprovalModal.tsx      (Approval/Rejection action modal with SoD validation)
│   ├── PurchaseOrderHistoryModal.tsx       (Chronological timeline of approval events)
│   └── PoLineFulfillmentDrawer.tsx         (Visual breakdown of Ordered vs Received vs Invoiced)
```
