# Procurement Frontend Security & Authorization Analysis

**Module**: Procurement Subsystem Security (P1–P4)  
**Analysis Date**: 2026-08-21  
**Scope**: Frontend Permission Gating, Data Scope, RBAC & Backend Authority  

---

## 1. Security Architecture Axiom

> **Zero-Trust Frontend Rule**:
> The React frontend UI hiding/disabling is strictly a User Experience (UX) convenience.
> **Backend Authorization is Authoritative**.
> All mutations, approvals, receipts, and invoice postings must be validated against `TenantContext`, `DataScopeService`, and `AuthorizationService` regardless of frontend state.

---

## 2. Layered Permission & Data Scope Architecture

```
[User Action in Browser]
          ↓
  1. Menu & Route Guard (React Router + Redux Auth State)
          ↓
  2. Action Button Permission Gate (useHasPermission Hook)
          ↓
  3. API Request (Bearer Token + Tenant Header)
          ↓
  4. Backend Controller & Filter (JwtFilter + TenantLineHandler)
          ↓
  5. Service Authorization & Data Scope Check (DataScopeService + SoD Rules)
          ↓
  6. Atomic Database Mutation (Tenant-isolated SQL + CAS Lock)
```

---

## 3. Threat Vector & Direct Access Analysis

| Threat Scenario | Frontend Defense (UX Layer) | Backend Defense (Authoritative Layer) | Test Verification |
|:---|:---|:---|:---|
| **Direct URL Access by Unauthorized Role** | React Router `ProtectedRoute` redirects to `/403` or `/login`. | API returns `401 Unauthorized` / `403 Forbidden` via Spring Security. | `testUnauthorizedRouteRedirection` |
| **Self-Approval Bypass (SoD)** | "Approve" button disabled/hidden if `user.id == order.creator`. | `PurchaseOrderApprovalService` enforces `creatorId != approverId` and throws `403 Forbidden`. | `testSoDSelfApprovalProhibition` |
| **Unauthorized Depot Stock Receipt** | Depot dropdown filtered to user's assigned warehouse IDs via `dataScope.allowedDepotIds`. | `GoodsReceiptService` queries `DataScopeService.resolveDataScope(...)` and blocks receipts into unauthorized depots with `403`. | `testGoodsReceiptDataScopeDepotIsolation` |
| **Cross-Tenant ID Tampering** | React UI only queries records belonging to active tenant. | `TenantLineHandler` & explicit tenant validation on entity PK throw `404/403` if `tenant_id` does not match. | `testCrossTenantIsolationImmunity` |
| **Three-Way Match Bypass** | "Post Invoice" button disabled when `matchStatus === 'BLOCK'`. | `GstPurchaseInvoiceService.postPurchaseInvoice` re-evaluates 3-way match and throws `400 Bad Request` if match fails. | `testThreeWayMatchBlockPreventsInvoicePosting` |
| **Read-Only / Auditor Modification** | All edit/create buttons hidden for `AUDITOR` role. | RBAC permission matrix bars `POST/PUT/DELETE` methods for Read-Only roles. | `testAuditorReadOnlyEnforcement` |

---

## 4. Frontend Hook & Component Directives

1. **`useProcurementPermissions()` Hook**:
   - Centralized hook resolving user capabilities:
     - `canCreatePo`, `canApprovePo`, `canReceiveGoods`, `canCreateInvoice`, `canPostInvoice`.
2. **`SoDGuard` Component**:
   - Reusable UI wrapper ensuring self-approval buttons are disabled with explanatory tooltips when the logged-in user is the document creator.
3. **`DataScopeDepotSelector` Component**:
   - Filters warehouse dropdowns strictly to depots authorized in the active `UserContext`.
