# Phase 6 & 7 Research — Implementation Blueprint

## 1. Sequential Implementation Roadmap

Implementation will proceed in 9 strictly sequenced steps upon user approval:

```
[Step 1: Database Migration]
    └── DDL: Add status, company_name, admin_user_id columns and idx_tenant_status index to erp_tenant
[Step 2: DTOs & Entity Extensions]
    └── Create TenantProvisioningDto, TenantProvisioningResultDto, TenantLifecycleActionDto; update Tenant.java
[Step 3: Tenant Bootstrap Builder Service]
    └── Implement TenantBootstrapService (encapsulates Org, Depot, FY, DocSeries, CoA, and Admin builders)
[Step 4: Unified Provisioning Orchestrator]
    └── Implement TenantProvisioningOrchestrator (@Transactional 9-stage atomic execution engine)
[Step 5: Tenant Lifecycle Governance Service]
    └── Implement TenantLifecycleService (Suspend, Evict Sessions, Reactivate, Renew, Soft-delete)
[Step 6: REST API Controller & Permissions]
    └── Implement TenantProvisioningController (/platform/tenant/*); register in PermissionRegistry
[Step 7: Automated Test Suite]
    └── Create Phase6_7_TenantProvisioningLifecycleSecurityTest.java (14 unit/integration test cases)
[Step 8: Frontend UI Enhancements]
    └── Update TenantList.tsx with lifecycle badges, plan details, and multi-step Provisioning Wizard
[Step 9: Full Platform Regression Run]
    └── Run all test suites (Phases 1 through 9 target: 105+ passing tests with 0 failures)
```

---

## 2. Component Specifications

### 1. `TenantBootstrapService.java`
- `Organization bootstrapRootOrganization(Long tenantId, String companyName, String initialOrgName)`
- `Depot bootstrapPrimaryDepot(Long tenantId, String initialDepotName)`
- `FinancialYear bootstrapFiscalYear(Long tenantId)`
- `List<DocumentNumberSeries> bootstrapDocumentSeries(Long tenantId, Long financialYearId, String fyCode)`
- `List<Account> bootstrapDefaultAccounts(Long tenantId)`
- `List<InOutItem> bootstrapDefaultCategories(Long tenantId)`
- `User bootstrapTenantAdmin(Long tenantId, String loginName, String adminFullName, String password)`
- `UserTenantMembership bootstrapAdminMembership(Long tenantId, Long adminUserId)`

### 2. `TenantProvisioningOrchestrator.java`
- `@Transactional(rollbackFor = Exception.class)` `provisionTenant(TenantProvisioningDto dto, HttpServletRequest request)`
- Manages concurrency locks (`ConcurrentHashMap<String, ReentrantLock>`).
- Enforces pre-flight validations.
- Orchestrates Stages 1 to 9.
- Catches any failure, allows transaction rollback, records `TENANT_PROVISION_FAILED` audit in separate autonomous transaction, and returns structured error.

### 3. `TenantLifecycleService.java`
- `suspendTenant(Long tenantId, String reason, HttpServletRequest request)`
  - Updates `erp_tenant.status = 'SUSPENDED', enabled = false`
  - Updates `erp_tenant_subscription.status = 'SUSPENDED'`
  - Evicts all Redis tokens for tenant
  - Records audit log
- `reactivateTenant(Long tenantId, String reason, HttpServletRequest request)`
  - Validates active subscription validity
  - Updates `erp_tenant.status = 'ACTIVE', enabled = true`
  - Updates `erp_tenant_subscription.status = 'ACTIVE'`
  - Records audit log
- `renewSubscription(Long tenantId, Long planId, Integer extendDays, String reason, HttpServletRequest request)`
  - Calls `TenantSubscriptionService.assignPlanToTenant(...)`
  - Audits renewal
- `softDeleteTenant(Long tenantId, String reason, HttpServletRequest request)`
  - Updates `delete_flag = '1'`
  - Terminates subscription and revokes memberships
  - Evicts sessions and audits deletion

---

## 3. Strict Scope & Safety Boundaries

- **NO UNRELATED CODE MODIFICATIONS**: We will not modify Sales, Procurement, Inventory, Finance, or GST transaction logic.
- **BACKWARD COMPATIBILITY**: Existing legacy tenants in database retain unhindered access through compatibility fallback mappings.
- **STOP REQUIREMENT**: No code will be written until this research plan is explicitly reviewed and approved by the user.
