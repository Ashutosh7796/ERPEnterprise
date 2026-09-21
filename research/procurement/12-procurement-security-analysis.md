# 12 - Procurement Security & Multi-Tenancy Architecture

**Security Core**: Zero-Trust Tenant Isolation, Role-Based Access Control (RBAC), and Data Scope Filtering  

---

## 1. End-to-End Security Boundary Trace

```text
[Incoming HTTP Request] (Headers: "X-Access-Token")
            │
            ▼
[AuthorizationService.resolveSecurityContext(request)]
            ├─► Validates Cryptographic Signature & Expiry
            ├─► Extracts Authenticated activeTenantId & userId
            └─► Sets ThreadLocal: TenantContext.setCurrentContext(tenantCtx)
            │
            ▼
[Procurement Controller Ingress (e.g. PurchaseOrderController)]
            ├─► Enforces @RoleAuthorization(permission = "purchase:order:add/edit/approve")
            └─► Resolves Authoritative Data Scope (DataScopeService)
            │
            ▼
[Procurement Domain Service (e.g. PurchaseOrderService)]
            ├─► Disregards any client-supplied tenantId/supplierId parameters
            ├─► Resolves tenantId strictly from TenantContext.getActiveTenantId()
            └─► Applies DataScopeCriteria (Allowed Depot IDs, Org/Branch IDs)
            │
            ▼
[Database Query Execution Layer]
            ├─► MyBatis-Plus TenantLineHandler auto-appends "AND tenant_id = ?"
            └─► Native SQL parameterized bindings include "WHERE tenant_id = ?"
```

---

## 2. Parameter Immunity & Cross-Tenant Attack Resistance

1. **Client Parameter Distrust**:
   * The client can **never** influence or override `tenant_id`, `supplier_id`, `depot_id`, or `po_id` to access or mutate cross-tenant records.
   * All mutating actions (`submit`, `approve`, `receive`, `invoice`, `cancel`) execute a strict pre-flight check:
     $$\text{SELECT COUNT(1) FROM erp\_po WHERE id = ? AND tenant\_id = ?}$$
   * If `tenant_id` does not match the active session context, the engine immediately throws `SecurityRunTimeException(ACCESS_DENIED)`.
2. **Approval Segregation of Duties (SoD)**:
   * Self-approval prohibition: A user cannot approve a Purchase Order they created if SoD is enabled for the tenant.
   * Approval authority limits: Enforces maximum order amount threshold per role.
3. **Data Scope Masking**:
   * Purchase orders and receipts are constrained to warehouses assigned in the user's active data scope mask (`DataScope.allowedDepotIds`).
