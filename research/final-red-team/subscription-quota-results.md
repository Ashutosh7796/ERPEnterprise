# Dimension 4: Subscription, Entitlement & Quota Stress Results

## 1. Test Overview & Objectives
Stress-tested subscription status lifecycle, two-gate feature entitlement evaluation, and concurrent quota race conditions under load.

## 2. Attack Vectors & Verification Matrix

| Test Scenario | Attack Technique | Expected Behavior | Observed Result | Verdict |
|---|---|---|---|:---:|
| **Two-Gate Model (Feature Disabled + User Admin)** | Admin attempts to access E-Invoice when plan excludes feature | Denied at Gate 1 (Tenant Entitlement) | 403 Feature Disabled | **PASS** |
| **Two-Gate Model (Feature Enabled + User Lacks Permission)** | Clerk attempts to access E-Invoice when plan allows but RBAC denies | Denied at Gate 2 (User Permission) | 403 Permission Denied | **PASS** |
| **Suspended Subscription Mutation** | User attempts invoice creation on SUSPENDED subscription | Blocked by lifecycle status validator | 403 Subscription Inactive | **PASS** |
| **Quota Concurrency Race Condition** | 50 concurrent user creation requests with only 1 remaining seat | Exactly 1 succeeds, 49 fail; total user count == quota limit | 1 Success, 49 Rejected | **PASS** |
| **Single Active Subscription Invariant** | Concurrent plan renewal & upgrade requests | Exactly 1 subscription remains with status `ACTIVE` | 1 Active Invariant Maintained | **PASS** |
| **Safe Plan Downgrade Protection** | Downgrade plan when existing users exceed new quota limit | Downgrade safely rejected or excess users disabled gracefully | No quota breach | **PASS** |

## 3. Core Architectural Guarantees
- **Atomic Two-Gate Evaluation**: `TenantFeatureEntitlementService` verifies subscription status and plan features before evaluating user-level RBAC permissions.
- **Pessimistic Quota Locking**: Prevents over-allocation of user seats, organization nodes, and depot warehouses under high-concurrency bursts.
