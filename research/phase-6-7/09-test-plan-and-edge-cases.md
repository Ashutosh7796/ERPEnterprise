# Phase 6 & 7 Research — Test Plan & Edge Cases

## 1. Test Suite Architecture

To ensure zero regression and 100% compliance with transactional and security guarantees, Phase 6 & 7 will be verified by a dedicated test suite: `Phase6_7_TenantProvisioningLifecycleSecurityTest.java`.

### Planned Test Matrix

| # | Test Case | Target Assertion / Invariant Verified |
|---|---|---|
| **1** | `testProvisioning_FullAtomicSuccess` | All 9 stages execute cleanly; tenant state transitions to `ACTIVE`; all default entities exist. |
| **2** | `testProvisioning_OrgAndDepotBootstrap` | Verifies default Root Org (`HQ`) and Default Depot (`is_default=true`) are created with matching `tenant_id`. |
| **3** | `testProvisioning_FinancialYearAndSeriesBootstrap` | Verifies active Indian FY exists and 8 statutory document series (SO, INV, PO, GRN, CRN, DRN, PAY, REC) are initialized. |
| **4** | `testProvisioning_AccountAndCategoryBootstrap` | Verifies Cash account, Operating Bank account, and 4 InOut categories exist for new tenant. |
| **5** | `testProvisioning_AdminAndMembershipCreation` | Verifies Tenant Admin user exists with `ismanager=1`, `leader_flag='1'`, and canonical `UserTenantMembership` (`role_id=3`, `scope=ALL`, `status=ACTIVE`). |
| **6** | `testProvisioning_PlanAssignmentAndQuotas` | Verifies `erp_tenant_subscription` row created with active invariant, matching plan limits and feature tokens. |
| **7** | `testProvisioning_FailureInjectionAtomicRollback` | Injects exception at Stage 7 (Number Series); asserts 100% database rollback with 0 leftover rows in `erp_tenant`, `erp_user`, `erp_organization`. |
| **8** | `testProvisioning_ConcurrentDuplicateCollision` | 5 simultaneous threads attempt to provision tenant with same `login_name`; exactly 1 succeeds and 4 receive HTTP 409 Conflict. |
| **9** | `testProvisioning_ReservedLoginNameBlocked` | Provisioning with reserved names (`admin`, `jsh`, `system`, `manager`) is rejected with HTTP 400. |
| **10** | `testLifecycle_SuspendTenantAndEvictSessions` | Suspending tenant sets `status='SUSPENDED'`, disables `erp_tenant_subscription`, evicts Redis tokens, and blocks subsequent business API calls. |
| **11** | `testLifecycle_ReactivateSuspendedTenant` | Reactivating suspended tenant restores `ACTIVE` status and allows business API calls. |
| **12** | `testLifecycle_GracePeriodTransition` | Expired subscription within grace window retains access with warning; past grace window is blocked with HTTP 403. |
| **13** | `testLifecycle_SoftDeleteTenant` | Soft deleting tenant sets `delete_flag='1'`, cancels active subscription, revokes memberships, and evicts all sessions. |
| **14** | `testPlatformAudit_ProvisioningAndLifecycleTrail` | Asserts structured audit logs exist for `TENANT_PROVISION_SUCCESS`, `TENANT_SUSPEND`, `TENANT_REACTIVATE`, `TENANT_DELETE`. |

---

## 2. Adversarial Edge Cases & Mitigation

### 1. Special Characters & Unicode in Company Name
- **Threat**: Company names with apostrophes, quotes, or Unicode (e.g. `O'Reilly & Sons (India) Pvt. Ltd. 🚀`).
- **Mitigation**: Parameterized MyBatis queries and UTF-8 encoding prevent syntax errors or truncation.

### 2. Login Name Normalization & Case Collisions
- **Threat**: Attacker attempts to create `AcmeCorp` when `acmecorp` already exists.
- **Mitigation**: `loginName` is trimmed and lowercased before uniqueness validation and database storage.

### 3. Database Connection Interruption During Provisioning
- **Threat**: Database network glitch occurs after Stage 4 (Organization inserted).
- **Mitigation**: Outer `@Transactional` boundary causes MySQL to discard the transaction upon connection drop, rolling back all intermediate rows.

### 4. Non-Existent or Inactive Plan ID
- **Threat**: User submits `planId = 99999` or a plan where `is_active = false`.
- **Mitigation**: Stage 1 pre-flight check validates that `SubscriptionPlanMapper.selectById(planId)` returns an active plan before any database insert.
