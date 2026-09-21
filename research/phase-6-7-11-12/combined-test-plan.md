# Phase 6, 7, 11 & 12 Research — Combined Test Plan

## 1. Combined Test Suite Matrix

The combined test suite will be structured into two dedicated test classes:
1. `Phase6_7_TenantProvisioningLifecycleSecurityTest.java` (Track A)
2. `Phase11_12_SupportOperationsAndSseSecurityTest.java` (Track B)

| # | Test Case Identifier | Track | Target Invariant / Security Guarantee Verified |
|---|---|:---:|---|
| **1** | `testProvisioning_FullAtomicSuccess` | Track A | All 9 stages execute cleanly; tenant state transitions to `ACTIVE`; all default entities exist. |
| **2** | `testProvisioning_OrgAndDepotBootstrap` | Track A | Default Root Org (`HQ`) and Default Depot (`is_default=1`) created with matching `tenant_id`. |
| **3** | `testProvisioning_FinancialYearAndSeriesBootstrap` | Track A | Active Indian FY exists and 8 statutory document series (SO, INV, PO, GRN, CRN, DRN, PAY, REC) initialized. |
| **4** | `testProvisioning_AccountAndCategoryBootstrap` | Track A | Cash account, Operating Bank account, and 4 InOut categories exist for new tenant. |
| **5** | `testProvisioning_AdminAndMembershipCreation` | Track A | Tenant Admin user exists with `ismanager=1`, `leader_flag='1'`, and canonical `UserTenantMembership` (`role_id=3`, `scope=ALL`). |
| **6** | `testProvisioning_PlanAssignmentAndQuotas` | Track A | Active subscription row created with active unique invariant, plan quotas, and feature tokens. |
| **7** | `testProvisioning_FailureInjectionAtomicRollback` | Track A | Injects exception at Stage 7; verifies 100% database rollback with 0 leftover rows in `erp_tenant`, `erp_user`, `erp_organization`. |
| **8** | `testProvisioning_ConcurrentDuplicateCollision` | Track A | 5 simultaneous threads attempt to provision tenant with same `login_name`; exactly 1 succeeds and 4 receive HTTP 409 Conflict. |
| **9** | `testProvisioning_ReservedLoginNameBlocked` | Track A | Provisioning with reserved names (`admin`, `jsh`, `system`, `manager`) is rejected with HTTP 400. |
| **10** | `testLifecycle_SuspendTenantAndEvictSessions` | Track A | Suspending tenant sets `status='SUSPENDED'`, disables subscription, and evicts all active Redis user sessions. |
| **11** | `testLifecycle_ReactivateSuspendedTenant` | Track A | Reactivating suspended tenant restores `ACTIVE` status and allows business API calls. |
| **12** | `testLifecycle_GracePeriodTransition` | Track A | Expired subscription within grace window retains access; past grace window is blocked with HTTP 403. |
| **13** | `testLifecycle_SoftDeleteTenant` | Track A | Soft deleting tenant sets `delete_flag='1'`, cancels active subscription, revokes memberships, and evicts sessions. |
| **14** | `testSupport_RequestAndApprovalWorkflow` | Track B | Specialist submits request $\rightarrow$ status is `PENDING_APPROVAL` $\rightarrow$ Tenant Admin approves $\rightarrow$ token issued. |
| **15** | `testSupport_TwoDimensionalScopeEnforcement` | Track B | Support token with `moduleScope='INVENTORY'` and `dataScopeDepotId=101` restricts query scope accordingly. |
| **16** | `testSupport_ReadOnlyActionMutationBlocking` | Track B | Support token with `accessMode='READ_ONLY'` throws HTTP 403 on attempted `CREATE`, `UPDATE`, `DELETE`, `POST`. |
| **17** | `testSupport_InstantRevocationAndExpiry` | Track B | Revoking session immediately deletes Redis token and rejects subsequent API requests. |
| **18** | `testSSE_MultiTenantIsolationZeroLeakage` | Track B | Event dispatched to Tenant 149 is delivered ONLY to Tenant 149 emitters; Tenant 150 receives 0 events. |

---

## 2. Regression & Platform Verification Target

Upon completion of Phase 6/7/11/12 implementation:
- **Total Tests Target**: **110+ passing tests** across 16 test suites.
- **Failures / Errors**: Exactly **0**.
- **Frontend TypeScript Build**: 100% clean compilation (`tsc -b && vite build` with 0 errors).
