# Enterprise ERP Red-Team & Adversarial Stress-Test Plan

## 1. Executive Summary & Objective
This document outlines the systematic, adversarial red-team execution plan designed to challenge, stress, and attempt to break the ERP platform security implementation across all architectural dimensions:
- Multi-Tenant Isolation & Cross-Tenant Boundary Attacks
- RBAC, Authorization Bypass, URL Normalization, & Token Spoofing
- Super Admin & Support Operator Privilege Boundary Enforcement
- Data Scoping (ALL, ORG, DEPOT, SELF, NONE) & Entity Ownership Resolution
- Subscription Lifecycle, Two-Gate Feature Entitlements, & Hard Quota Concurrency
- 10-Stage Tenant Provisioning Transactional Chaos & Rollback Guarantees
- 7-State Tenant Lifecycle Mutation Machine & Redis Session Eviction
- Ephemeral Support Access, 2D Scoping, & READ_ONLY Mutation Blocking
- Real-Time SSE Stream Partitioning & Zero Cross-Tenant Leakage
- Immutable Append-Only Platform Audit Log Protection
- Malformed Input Fuzzing, Boundary Conditions, & High-Concurrency Performance

---

## 2. Adversarial Test Dimensions & Matrix

### Dimension 1: Tenant-Isolation & Cross-Tenant Data Leakage
- **Target**: Attempt unauthorized access by Tenant A (ID=149) into Tenant B (ID=150) assets.
- **Vectors**: Query parameters, JSON payload injection, URL path parameters, custom headers (`X-Tenant-Id`, `tenantId`), batch/bulk operations, export/report endpoints, file downloads.
- **Expected Outcome**: HTTP 403 Forbidden / empty result / server-authoritative denial.

### Dimension 2: Multi-Tenant User Switching & Session Hijacking
- **Target**: User belonging to multiple tenants switching contexts.
- **Vectors**: Switch to suspended/expired/deleted tenant membership; replay stale JWT token; concurrent cross-tab switching; manipulated target tenant ID.
- **Expected Outcome**: Rejection of inactive/invalid memberships; immediate token revocation; context isolation.

### Dimension 3: RBAC & Authorization Bypass
- **Target**: Server-side endpoint authorization enforcement.
- **Vectors**: Missing token, expired token, malformed signature; wrong role; correct tenant but missing permission; URL path traversal / normalization (`/system/../platform/plan`); case variations (`/PLATFORM/TENANT`); HTTP method substitution (`GET` vs `POST` vs `DELETE`); legacy username bypass (`admin`, `jsh`).
- **Expected Outcome**: Strict server-authoritative 401/403 rejection.

### Dimension 4: Super Admin & Support Operator Privilege Boundaries
- **Target**: Role separation between Platform Super Admin, Tenant Admin, Support Specialist, and Normal Tenant User.
- **Vectors**: Super Admin directly mutating tenant business documents without active support session; Tenant Admin invoking platform governance APIs; Support Specialist escalating permissions or writing in READ_ONLY mode.
- **Expected Outcome**: Hard boundary enforcement; explicit authorization failures.

### Dimension 5: Data Scoping & Entity Ownership
- **Target**: Fine-grained data access scoping (ALL, ORG, DEPOT, SELF, NONE).
- **Vectors**: Unauthorized org/depot IDs in filters; cross-user creator ID manipulation in Sales, Purchases, Accounts, and Materials; empty/null scope lists.
- **Expected Outcome**: SQL interceptor restriction to authorized IDs only; zero records returned for unauthorized scopes.

### Dimension 6: Subscription Feature Entitlements (Two-Gate Model)
- **Target**: Independent verification of Tenant Plan Feature Gate AND User RBAC Permission Gate.
- **Vectors**: User has Admin role but Feature is disabled on Tenant Plan; Feature is enabled on Tenant Plan but User lacks RBAC permission; expired/suspended subscription requesting premium features (e.g. IRN / E-Invoice).
- **Expected Outcome**: Access granted IF AND ONLY IF (Feature == ENABLED && Permission == GRANTED).

### Dimension 7: Quota Stress & High Concurrency Race Conditions
- **Target**: User limits, depot limits, org limits under concurrent load.
- **Vectors**: 50 simultaneous user creation requests when only 1 seat remains in quota (`limit=10`, `current=9`).
- **Expected Outcome**: Exactly 1 request succeeds; 49 requests fail with HTTP 400/409 Quota Exceeded; zero quota overrun.

### Dimension 8: Tenant Provisioning Transactional Chaos
- **Target**: 10-stage atomic tenant bootstrap pipeline.
- **Vectors**: Inject simulated exceptions at Stage 1 (Tenant Container), Stage 3 (Plan Binding), Stage 4 (HQ Org), Stage 5 (Depot), Stage 6 (FY), Stage 7 (Series), Stage 8 (Accounts), Stage 9 (Admin User), and Stage 10 (Activation).
- **Expected Outcome**: 100% database rollback across all 11 tables; zero orphan/zombie records; idempotent retry capability.

### Dimension 9: Tenant Lifecycle Mutation Machine
- **Target**: 7-state lifecycle transition graph.
- **Vectors**: Attempt invalid state transitions (`ARCHIVED -> ACTIVE`, `SOFT_DELETED -> ACTIVE`, `EXPIRED -> SUSPENDED`, `PROVISIONING -> SUSPENDED`); invoke APIs with active JWT after administrative suspension.
- **Expected Outcome**: Invalid transitions rejected with 400/422; suspended tenant tokens evicted from Redis cache and rejected on subsequent requests.

### Dimension 10: Ephemeral Support Access & SSE Stream Isolation
- **Target**: Support request approval/rejection, token generation, 2D scoping, and real-time push.
- **Vectors**: Non-admin approving support session; cross-tenant support approval; reusing expired/revoked support tokens; attempting data mutation during READ_ONLY support; Tenant A listening to Tenant B's SSE stream.
- **Expected Outcome**: Ephemeral Redis token validated; zero DB pollution in customer tables; strict SSE emitter partitioning by tenant ID.

---

## 3. Execution Methodology
1. **Automated Adversarial Suite Development**: Write comprehensive JUnit 5 and Node.js security attack suites covering all 10 dimensions.
2. **Defect Discovery & Root Cause Analysis**: Document any detected bypass or edge case in `security-findings.md`.
3. **Targeted Hardening**: Implement precise server-side fixes without breaking existing features.
4. **Regression Verification**: Run full suite of 56+ backend tests and 11+ frontend tests to ensure 100% green build.
