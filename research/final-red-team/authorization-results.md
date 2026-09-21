# Dimension 2 & 3: RBAC, Authorization & Super Admin Boundary Results

## 1. Test Overview & Objectives
Evaluated RBAC enforcement, multi-tenant user switching, Super Admin privilege boundaries, support specialist limitations, and URL normalization attacks.

## 2. Attack Vectors & Verification Matrix

| Test Scenario | Attack Technique | Expected Behavior | Observed Result | Verdict |
|---|---|---|---|:---:|
| **Missing Token Access** | Invoke protected API without `X-Access-Token` | 401 Unauthorized | Rejected with 401 | **PASS** |
| **Expired / Tampered JWT** | Pass invalid HMAC signature token | 401 Unauthorized | Rejected with 401 | **PASS** |
| **Tenant Admin Platform Privilege Escalation** | Tenant Admin invokes `/platform/plan/add` | 403 Forbidden | Rejected with 403 | **PASS** |
| **Legacy Username `admin` Spoofing** | User named `admin` in Tenant 149 invokes Super Admin API | `isSuperAdmin` returns false; denied | Rejected with 403 | **PASS** |
| **URL Traversal Normalization** | Request `/system/../platform/tenant/provision` | Spring Security normalizes URL before permission lookup | Route mapped to `PLATFORM.TENANT.MANAGE` | **PASS** |
| **Support READ_ONLY Mutation** | Support Specialist in `READ_ONLY` mode sends `POST /bill/add` | Write blocked by server-side ActionGuard | Rejected with 403 | **PASS** |
| **Multi-Tenant Switch to Suspended Membership** | User switches to inactive tenant membership | Switch rejected; token not issued | Rejected with 403 | **PASS** |
| **Multi-Tenant Switch with Forged Tenant ID** | User switches to Tenant ID where they have no membership | Membership query returns empty; denied | Rejected with 403 | **PASS** |

## 3. Core Architectural Guarantees
- **Independent Authority Domains**: Clean separation between `PLATFORM` (Role ID 4, Super Admin) and `TENANT` (Role ID 3 Tenant Admin, Role ID 2 User).
- **Immutable Role Mapping**: Server evaluates permission bitmasks and `UserRole` associations directly from the database/Redis cache.
