# Phase 6 & 7 Research — Executive Summary & Component Inventory

## 1. Executive Summary

Phase 6 & 7 focuses on **Tenant Provisioning, Multi-Resource Bootstrap, and Tenant Lifecycle Governance**. In an enterprise Multi-Tenant SaaS ERP, creating a tenant cannot simply mean inserting a user and tenant row; it requires orchestrating a complete, atomic bootstrap of all baseline enterprise structures:

1. **Tenant Container & Governance Record** (`erp_tenant`)
2. **Subscription Plan Assignment & Quota Initializer** (`erp_tenant_subscription`)
3. **Root Organization / Head Office** (`erp_organization`)
4. **Primary Depot / Central Warehouse** (`erp_depot`)
5. **Fiscal Calendar / Active Financial Year** (`erp_financial_year`)
6. **Statutory Document Numbering Series** (`erp_sequence_series` / `erp_document_number_series`)
7. **Chart of Accounts & InOut Category Master** (`erp_account`, `erp_in_out_item`)
8. **Tenant Administrator Account & Direct Membership** (`erp_user`, `erp_user_tenant_membership`)
9. **Platform Governance Audit Trail** (`erp_platform_audit_log`)

---

## 2. Complete Inventory Matrix (30 Topics)

| # | Topic | Current Implementation | Target Production Design (Phase 6 & 7) | Status |
|---|---|---|---|:---:|
| **1** | **Tenant Creation Flow** | Calls `UserService.registerUser` which inserts `erp_user` and `erp_tenant`. | `TenantProvisioningOrchestrator` coordinates end-to-end multi-step bootstrap inside unified transactional envelope. | **INCOMPLETE** |
| **2** | **Tenant Admin Creation** | User is created with `tenant_id = user_id`, legacy `UserRole` row in `erp_user_business`. | Creates normalized user with `ismanager = 1`, `leader_flag = 1`, bound to tenant with strict password hashing. | **PARTIAL** |
| **3** | **Tenant Provisioning** | No formal provisioning pipeline; minimal row insertion only. | Orchestrated 9-stage pipeline with state tracking (`PROVISIONING` $\rightarrow$ `ACTIVE`). | **MISSING** |
| **4** | **Organization Bootstrap** | None. New tenant has 0 organizations/branches. | Bootstraps Default Head Office ("Root / Head Office", `org_abr="HQ"`, `org_type=1`). | **MISSING** |
| **5** | **Depot Bootstrap** | None. New tenant has 0 warehouses. | Bootstraps Default Central Warehouse ("General Warehouse", `is_default=true`, `type=0`). | **MISSING** |
| **6** | **Financial Year Creation** | Reactive auto-creation only upon first bill save in `FinancialYearService`. | Proactive bootstrap of Current Indian Fiscal Year (e.g. `2026-27` from 01-Apr to 31-Mar). | **PARTIAL** |
| **7** | **Document Numbering Initialization** | Reactive auto-creation only when generating document number. | Proactive initialization of default series (SO, SI, PO, PI, CRN, DRN, PAY, REC) for current FY. | **PARTIAL** |
| **8** | **Chart of Accounts Initialization** | None. New tenant has 0 financial accounts and 0 income/expense items. | Bootstraps baseline Cash Account, Operating Bank Account, and Standard InOut Categories. | **MISSING** |
| **9** | **Tenant Admin Membership Creation** | Relies on legacy `erp_user.tenant_id` compatibility fallback. | Explicit `UserTenantMembership` row (`role_id=TenantAdmin`, `data_scope_type='ALL'`, `status='ACTIVE'`). | **MISSING** |
| **10** | **Plan Assignment During Provisioning** | Sets `erp_tenant.type` string ('0', '1', etc.). No subscription row created. | Assigns approved `SubscriptionPlan` via `TenantSubscriptionService` creating active subscription record. | **MISSING** |
| **11** | **Quota Validation During Provisioning** | Verifies base user limit only. | Validates requested plan capacity and ensures bootstrap entities satisfy initial quotas. | **MISSING** |
| **12** | **Tenant Activation** | Sets `enabled = 1` immediately without verifying bootstrap success. | Verifies all 9 bootstrap stages complete successfully before switching status to `ACTIVE`. | **INCORRECT** |
| **13** | **Tenant Lifecycle States** | Binary boolean `enabled` (0 or 1). | Formal state machine: `PROVISIONING`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `GRACE_PERIOD`, `SOFT_DELETED`. | **MISSING** |
| **14** | **Suspension** | Sets `enabled = 0`, but does not evict sessions or prevent support tokens. | Atomically sets `status='SUSPENDED'`, updates subscription, evicts active Redis sessions, logs reason. | **PARTIAL** |
| **15** | **Expiry** | Compares `expire_time` in background check. | Automated transition to `EXPIRED` or `GRACE_PERIOD` when subscription `end_date` passes. | **PARTIAL** |
| **16** | **Grace Period** | Evaluates `grace_period_end` in Phase 5/8/9 `isTenantAccessible`. | Configurable grace period window (e.g. 7-14 days) allowing read/write or read-only before hard cutoff. | **COMPLETE** |
| **17** | **Soft Deletion** | Sets `delete_flag = '1'`, but does not cascade or purge sessions. | Cascades `delete_flag='1'` to tenant resources, deactivates subscription and memberships, clears Redis. | **PARTIAL** |
| **18** | **Reactivation** | Sets `enabled = 1`. | Verifies valid subscription exists, resets suspended state, re-enables memberships, audits event. | **PARTIAL** |
| **19** | **Audit Trail** | Basic `erp_log` text string. | Structured `PlatformAuditLog` recording operator ID, target tenant, event type, before/after JSON. | **PARTIAL** |
| **20** | **Transaction Boundaries** | Fragmented across `UserService.registerUser` without rollback safety. | Single outer `@Transactional(rollbackFor = Exception.class)` boundary across entire provisioning. | **INCORRECT** |
| **21** | **Rollback Behavior** | Database rollback happens, but no cleanup of side-effects or partial IDs. | Guaranteed full ACID rollback on any stage failure, leaving database 100% clean. | **MISSING** |
| **22** | **Failure Recovery** | Throws raw runtime exception to frontend. | Structured error payload with failing stage identification and failure reason. | **MISSING** |
| **23** | **Idempotency** | None. Retrying with same name fails with duplicate user error. | Idempotency key / check ensures duplicate provisioning requests do not corrupt state. | **MISSING** |
| **24** | **Duplicate Tenant Creation** | Checked via `checkIsNameExist` on `loginName`. | Validates `loginName`, `tenant_id`, and `company_name` uniqueness before provisioning starts. | **PARTIAL** |
| **25** | **Partial Provisioning** | If stage 4 fails, user and tenant rows remain in DB (zombie tenant). | Atomic transaction ensures zero zombie tenants; provisioning state tracking. | **INCORRECT** |
| **26** | **Retry Behavior** | Manual user intervention required. | Safe retry capability with clean state reset or resumption. | **MISSING** |
| **27** | **Existing Menus / Submenus** | `System Management -> Tenant Management` (`/system/tenant`). | Preserves `/system/tenant` and adds Plan Selector, Bootstrap Template, Lifecycle Actions. | **COMPLETE** |
| **28** | **Existing Frontend** | Basic modal in `TenantList.tsx` with loginName, limit, password, roleId. | Enhanced Provisioning Drawer / Modal with Plan Selection, Org/Depot defaults, Lifecycle Badges. | **PARTIAL** |
| **29** | **Existing Backend** | `TenantController.java` $\rightarrow$ `TenantService.java` $\rightarrow$ `UserService.java`. | `TenantProvisioningService`, `TenantLifecycleService`, `TenantBootstrapService`. | **PARTIAL** |
| **30** | **Existing Database Structure** | `erp_tenant`, `erp_user`, `erp_user_business`. | Leverages `erp_tenant`, `erp_tenant_subscription`, `erp_user_tenant_membership`, `erp_platform_audit_log`. | **COMPLETE** |
