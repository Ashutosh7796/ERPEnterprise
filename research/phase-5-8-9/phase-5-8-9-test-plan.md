# Comprehensive Test Plan for Phase 5, 8 & 9 (Final Refinement)

## 1. Executive Summary
This document specifies automated unit, integration, concurrency, and security test scenarios covering Plan Catalogs, Active Subscription Invariants, Same-Transaction Quota Enforcement, Dual-Gate Authorizations, and Immutable Platform Audits.

---

## 2. Test Matrix

| Test ID | Test Scenario | Target Component | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **TEST-SUB-01** | Plan Creation & Retrieval | `SubscriptionPlanService` | Creates plan template (`STANDARD_PRO`) with default quotas (15 users, 3 depots) and feature JSON. |
| **TEST-SUB-02** | Plan Assignment & History Tracking | `TenantSubscriptionService` | Assigning a new plan deactivates previous subscription (`is_active = 0`) and creates new active row (`is_active = 1`); history contains both. |
| **TEST-INV-01** | Active Subscription Invariant | `TenantSubscriptionService` | Direct SQL / concurrency attempting to insert 2 rows with `is_active = 1` for same tenant is blocked by `uk_single_active_subscription`. |
| **TEST-INV-02** | Concurrent Plan Assignment | `TenantSubscriptionService` | Simulates 2 simultaneous plan assignments for Tenant 149; exactly 1 active subscription exists after both complete. |
| **TEST-QTA-01** | User Quota Block (Same Tx) | `UserService` | User insertion + quota check inside same transaction; 16th user throws 403 and rolls back cleanly. |
| **TEST-QTA-02** | Depot Quota Block (Same Tx) | `DepotService` | Depot insertion + quota check inside same transaction; 4th depot throws 403 and rolls back cleanly. |
| **TEST-QTA-03** | Org Quota Block (Same Tx) | `OrganizationService` | Org insertion + quota check inside same transaction; 4th org throws 403 and rolls back cleanly. |
| **TEST-CNC-01** | Concurrent Quota Enforcement | `UserService` | 5 simultaneous threads attempt to add user when 1 seat remains; exactly 1 succeeds, 4 fail with 403, active user count strictly equals limit. |
| **TEST-OVR-01** | Super Admin Quota Override | `TenantSubscriptionService` | Overriding user limit from 15 to 25 preserves base plan default (15), sets override (25), records operator ID & reason, and immediately allows user creation. |
| **TEST-DNG-01** | Safe Plan Downgrade | `TenantSubscriptionService` | Downgrading tenant with 12 users to 5-user plan retains all 12 existing accounts without data loss; blocks 13th user creation. |
| **TEST-ENT-01** | Dual-Gate: Feature vs RBAC | `AuthorizationService` | Tenant with plan lacking `MODULE_GST_EINVOICE` is blocked even if user possesses `ADMIN` role; Tenant with plan including feature is allowed if user has permission. |
| **TEST-ACC-01** | Single Authoritative Access Gate | `AuthorizationService` | Tenant with `tenant.enabled = true` but `subscription.status = SUSPENDED` is strictly denied access. |
| **TEST-AUD-01** | Immutable Platform Audit Logging | `PlatformAuditService` | All plan changes, overrides, and suspensions log operator ID, target tenant ID, timestamp, client IP, reason, and before/after JSON diffs. |

---

## 3. Concurrency Test Implementation Strategy (`TEST-CNC-01` & `TEST-INV-02`)

### 3.1 Concurrent Quota Seat Race Test:
```java
@Test
@DisplayName("Concurrency Test: 5 simultaneous threads attempting to claim 1 remaining user quota seat")
public void testConcurrentQuotaEnforcement() throws Exception {
    Long tenantId = 149L;
    int numThreads = 5;
    ExecutorService executor = Executors.newFixedThreadPool(numThreads);
    CountDownLatch startLatch = new CountDownLatch(1);
    CountDownLatch doneLatch = new CountDownLatch(numThreads);
    AtomicInteger successCount = new AtomicInteger(0);
    AtomicInteger failureCount = new AtomicInteger(0);

    for (int i = 0; i < numThreads; i++) {
        final int userIndex = i;
        executor.submit(() -> {
            try {
                startLatch.await();
                // Calls transactional method that locks active subscription row, validates count, and inserts user
                userService.addUserWithQuotaCheck(tenantId, "concurrent_user_" + userIndex);
                successCount.incrementAndGet();
            } catch (BusinessRunTimeException e) {
                if (e.getCode() == 403) {
                    failureCount.incrementAndGet();
                }
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });
    }

    startLatch.countDown();
    doneLatch.await(5, TimeUnit.SECONDS);

    // EXACTLY 1 thread must succeed, and EXACTLY 4 must fail with 403
    assertEquals(1, successCount.get());
    assertEquals(4, failureCount.get());
}
```
