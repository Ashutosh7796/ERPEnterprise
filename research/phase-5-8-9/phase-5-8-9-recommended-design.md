# Recommended Technical Design for Phase 5, 8 & 9 (Final Refinement)

## 1. Executive Summary
This document delivers the final, hardened technical design for **Phase 5 (Platform Configuration), Phase 8 (Subscription & Plans), and Phase 9 (Multi-Resource Quotas & Entitlements)**.

---

## 2. Quota Transaction Boundary Architecture

To eliminate race conditions and guarantee that quota validation cannot be separated from entity insertion, all resource creation workflows execute inside a **Single Atomic Database Transaction**:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tenant Administrator
    participant Ctrl as UserController / DepotController
    participant Svc as UserService / DepotService
    participant QuotaSvc as QuotaEnforcementService
    participant DB as MySQL Database

    Admin->>Ctrl: POST /user/addUser (Payload)
    Ctrl->>Svc: addUser(userJson, request)
    Note over Svc,DB: BEGIN DATABASE TRANSACTION (@Transactional)
    Svc->>QuotaSvc: validateAndAcquireQuotaLock(tenantId, RESOURCE_USER)
    QuotaSvc->>DB: SELECT * FROM erp_tenant_subscription WHERE active_tenant_id = 149 FOR UPDATE
    DB-->>QuotaSvc: Row Locked (Blocks other threads for Tenant 149)
    QuotaSvc->>DB: SELECT COUNT(id) FROM erp_user WHERE tenant_id = 149 AND status = 0 AND delete_flag = '0'
    DB-->>QuotaSvc: Count = 14 (Limit = 15)
    QuotaSvc-->>Svc: Quota Approved (14 < 15)
    Svc->>DB: INSERT INTO erp_user (id=105, ...)
    Svc->>DB: INSERT INTO erp_user_tenant_membership (...)
    Svc->>DB: COMMIT TRANSACTION (Releases Lock)
    Note over Svc,DB: END DATABASE TRANSACTION
    Svc-->>Ctrl: User Created
    Ctrl-->>Admin: 200 OK Response
```

### 2.1 Transactional Methods:
- `UserService.addUser(...)`: `@Transactional` wraps subscription row lock, active user count, quota check, and `erp_user` + `erp_user_tenant_membership` inserts.
- `DepotService.insertDepot(...)`: `@Transactional` wraps subscription lock, active depot count, quota check, and `erp_depot` insert.
- `OrganizationService.insertOrganization(...)`: `@Transactional` wraps subscription lock, active branch count, quota check, and `erp_organization` insert.

---

## 3. Dual-Gate Authorization: Feature Entitlement vs User RBAC

```mermaid
flowchart TD
    Req[Incoming Tenant Request: e.g. POST /gstSalesInvoice/createDraft] --> Gate1{Gate 1: Tenant Feature Entitlement}
    
    Gate1 -->|Plan excludes MODULE_GST_RULE46| DenyFeature[403 FORBIDDEN: Feature not entitled in tenant subscription plan]
    Gate1 -->|Plan includes MODULE_GST_RULE46| Gate2{Gate 2: User RBAC Authorization}
    
    Gate2 -->|User lacks SALES_INVOICE_CREATE role| DenyRole[403 FORBIDDEN: User lacks required role permission]
    Gate2 -->|User possesses SALES_INVOICE_CREATE role| Allow[Proceed: Execute Transactional Business Logic]
```

### Strict Separation:
1. **Tenant Feature Entitlement (`TenantSubscription.enabled_features`)**:
   - Answer: *"Does the customer organization pay for and have access to this module capability?"*
   - Examples: `MODULE_SALES`, `MODULE_PURCHASE`, `MODULE_INVENTORY`, `MODULE_FINANCIAL`, `MODULE_GST_EINVOICE`, `MODULE_SUPPORT_CENTER`.
2. **User RBAC Permission (`SecurityContext.permissions`)**:
   - Answer: *"Is this specific employee/operator authorized to execute this specific business action?"*
   - Examples: `SALES_ORDER_CREATE`, `SALES_INVOICE_POST`, `DEPOT_MANAGE`, `FINANCE_PAYMENT_POST`.

---

## 4. Single Authoritative Access Gate

In `AuthorizationService.resolveSecurityContext()`:
```java
public boolean isTenantAccessible(Long tenantId) {
    if (tenantId == null || tenantId <= 0L) {
        return true; // Platform scope evaluated separately
    }

    Tenant tenant = tenantMapper.selectByTenantId(tenantId);
    if (tenant == null || Boolean.FALSE.equals(tenant.getEnabled()) || "1".equals(tenant.getDeleteFlag())) {
        return false; // Hard-suspended by Super Admin
    }

    TenantSubscription activeSub = tenantSubscriptionMapper.selectActiveByTenantId(tenantId);
    if (activeSub == null) {
        return false; // No active subscription instance
    }

    String status = activeSub.getStatus();
    Date now = new Date();

    if ("ACTIVE".equalsIgnoreCase(status) || "TRIAL".equalsIgnoreCase(status)) {
        if (activeSub.getEndDate() != null && now.after(activeSub.getEndDate())) {
            // Expired: Check if within 7-day grace period
            return activeSub.getGracePeriodEnd() != null && now.before(activeSub.getGracePeriodEnd());
        }
        return true;
    } else if ("GRACE_PERIOD".equalsIgnoreCase(status)) {
        return activeSub.getGracePeriodEnd() == null || now.before(activeSub.getGracePeriodEnd());
    }

    return false; // SUSPENDED, EXPIRED, REPLACED, CANCELLED
}
```
