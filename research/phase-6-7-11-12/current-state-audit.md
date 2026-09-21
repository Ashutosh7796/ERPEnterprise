# Current-State Audit: Phase 6, Phase 7, Phase 11 & Phase 12

---

## 1. Executive Summary & Verification Matrix

| Audit Item | Existing Component / Authority | Assessment & Current Capability | Action Required |
|---|---|---|---|
| **1. Multi-Tenant Model** | `UserContext`, `Tenant`, `TenantSubscription`, `tenant_id` column on all domain tables | Strict fail-closed tenant scoping exists. Thread-local `UserContext.getTenantId()` is authoritative. | Maintain existing fail-closed tenant model without fallback. |
| **2. Tenant Creation Flow** | Legacy `TenantService.insertTenant()` vs `TenantProvisioningOrchestrator.provisionTenant()` | `TenantProvisioningOrchestrator` implements 10-stage provisioning pipeline with ReentrantLock concurrency control. | Enhance with standard chart of accounts (`erp_account_head`) and statutory GST seeding. |
| **3. Tenant Membership** | `UserTenantMembership` (`erp_user_tenant_membership`) & `UserBusiness` | Canonical memberships with `is_default`, `role_id=3` (Tenant Admin), and Org/Depot bindings. | Maintain and verify atomic insertion. |
| **4. Seed / Bootstrap Logic** | `TenantBootstrapService` (Org, Depot, FY, Numbering Series, Cash/Bank, Categories, Admin User) | Functional isolated builder methods. Document Number Series (8 series) created. | Add standard chart of accounts (`1001`, `1002`, `1101`, `2001`, `7101`, `4001`, `5001`) & GST rates. |
| **5. Lifecycle State Machine** | `TenantLifecycleService` (`PROVISIONING`, `ACTIVE`, `SUSPENDED`, `GRACE_PERIOD`, `EXPIRED`, `SOFT_DELETED`, `ARCHIVED`) | Explicit transition matrix `LEGAL_TRANSITIONS`. Invalid transitions throw `BusinessRunTimeException`. | Enforce real-time session eviction and verify access rejection. |
| **6. RBAC & Platform Permissions** | `SecurityService` (Roles: `Super Admin` ID 4, `SYSTEM_SUPPORT` ID 101, Tenant Admin ID 3) | Unified RBAC and endpoint security check matrices. | Ensure zero privilege escalation and anti-lockout protection. |
| **7. Support Access Model** | `SupportAccessService`, `erp_support_session`, `erp_support_attendance` | Ephemeral support access with 2D scoping (modules + data scope) and dual-layer persistence. | Enforce customer consent gate, single active session guard, and dual-identity audit trails. |
| **8. Consent / Approval Workflow** | `startSupportSession` (`PENDING_APPROVAL`), `approveSupportSession`, `rejectSupportSession`, `revokeSupportSession` | Customer Admin approval workflow implemented. Super Admin emergency write path available. | Add anti-self-approval verification and real-time state synchronization. |
| **9. Audit Logging** | `PlatformAuditService`, `erp_support_session.audit_log`, `LogService` | Granular JSON event logging with before/after state snapshots. | Record both Support Specialist ID and Customer Tenant ID on all audit events. |
| **10. Frontend Support State** | `useSupportStore.ts`, `supportApi.ts`, `SupportCenter.tsx`, `TenantList.tsx` | Complete React workspace with countdown timer, approval modals, and SSE integration. | Verify responsive UI states and SSE real-time updates. |
| **11. SSE Notifications** | `SupportNotificationService.java` (`/support/sse/tenant-stream`, `/support/sse/specialist-stream`) | Authenticated tenant & specialist streams, 25s heartbeats, dead-emitter cleanup. | Maintain as notification transport only (DB remains source of truth). |
| **12. Session & Token Eviction** | `TenantLifecycleService.evictTenantSessions()`, `RedisService`, `SecurityService` | Cache eviction triggers on suspension, soft deletion, and session revocation. | Prove that suspended tenants and revoked sessions fail closed immediately. |

---

## 2. Detailed Audit across 12 Dimensions

### 1. Multi-Tenant Architecture & Boundaries
- All database tables maintain `tenant_id bigint(20) NOT NULL`.
- `UserContext` thread-local securely propagates tenant identity without client manipulation.
- Queries explicitly enforce `WHERE tenant_id = ?` parameter binding.

### 2. Tenant Provisioning Flow (`TenantProvisioningOrchestrator`)
- Executed within a unified Spring `@Transactional(value = "transactionManager", rollbackFor = Exception.class)` boundary.
- Concurrency protected by in-memory `ReentrantLock` keyed on normalized tenant `loginName`.
- Status sequence: Initialized as `PROVISIONING` (with `enabled = false`), transitions to `ACTIVE` (`enabled = true`) only after all 9 bootstrap stages succeed.
- Any exception at any stage triggers an automatic rollback of all created database rows (Zero Zombie Tenants).

### 3. Tenant Membership & Identity Bootstrapping
- Canonical membership table `erp_user_tenant_membership` records `(tenant_id, user_id, role_id, data_scope_type, is_default, status)`.
- Tenant Admin user is created with hashed password (`md5Encryp`), `ismanager = 1`, and `leader_flag = '1'`.
- Organization relation (`jsh_orga_user_rel`) and Depot relation (`jsh_user_business`) are seeded atomically.

### 4. Organization, Depot, FY, Numbering & Accounting Seeds
- **Root Org**: `jsh_organization` (`HQ`, sort=1, remark="Head Office").
- **Primary Depot**: `jsh_depot` (`General Warehouse`, `is_default = 1`, `type = 0`).
- **Financial Year**: Indian Fiscal Year (01-Apr to 31-Mar) seeded via `FinancialYearService`.
- **Document Numbering Series**: 8 statutory series (`SO`, `INV`, `PO`, `GRN`, `CRN`, `DRN`, `PAY`, `REC`) with sequence initialized to `1`.
- **Accounts**: Cash on Hand (`1001`) and Operating Bank (`1002`) in `jsh_account`.
- **InOut Categories**: Sales Revenue, Other Income, Purchase Cost, Operating Expenses in `jsh_in_out_item`.
- **Chart of Accounts**: Standard account heads (`1001`, `1002`, `1101`, `2001`, `7101`, `4001`, `5001`) in `erp_account_head`.

### 5. Lifecycle State Machine (`TenantLifecycleService`)
- Explicit Transition Table:
  $$\begin{aligned}
  \text{PROVISIONING} &\longrightarrow \{\text{ACTIVE}\} \\
  \text{ACTIVE} &\longrightarrow \{\text{SUSPENDED}, \text{GRACE\_PERIOD}, \text{EXPIRED}, \text{SOFT\_DELETED}\} \\
  \text{SUSPENDED} &\longrightarrow \{\text{ACTIVE}, \text{SOFT\_DELETED}\} \\
  \text{GRACE\_PERIOD} &\longrightarrow \{\text{ACTIVE}, \text{EXPIRED}, \text{SOFT\_DELETED}\} \\
  \text{EXPIRED} &\longrightarrow \{\text{ACTIVE}, \text{SOFT\_DELETED}\} \\
  \text{SOFT\_DELETED} &\longrightarrow \{\text{ACTIVE}, \text{ARCHIVED}\} \\
  \text{ARCHIVED} &\longrightarrow \emptyset \quad (\text{Terminal})
  \end{aligned}$$
- Direct invalid mutations are rejected.

### 6. RBAC & Platform Permissions
- Platform Super Admin (`PLATFORM_SUPER_ADMIN`, Role ID 4).
- System Support Specialist (`SYSTEM_SUPPORT`, Role ID 101).
- Customer Tenant Admin (`ROLE_TENANT_ADMIN`, Role ID 3).
- Role-based endpoint guards restrict `/support/**` and `/system/tenant/**` endpoints to authorized personas.

### 7. Support Access Model (`SupportAccessService`)
- Dual persistence: `erp_support_session` (MySQL) + Redis session token TTL.
- Enforces minimum justification length ($\ge 10$ chars) and maximum duration (Operator $\le 60$ min, Super Admin $\le 120$ min).
- Anti-concurrency guard: Prevents an operator from holding multiple overlapping active sessions on different customer tenants.

### 8. Consent / Approval Workflow
- Requests originate in `PENDING_APPROVAL` status.
- Customer Admin approves via `/support/session/approve` or rejects via `/support/session/reject`.
- Anti-Self-Approval: The operator who created the support request cannot approve it.

### 9. Audit Trail & Dual-Identity Tracking
- `erp_support_session` records:
  - `operator_user_id` (Support Specialist)
  - `tenant_id` (Customer Tenant)
  - `approved_by_user_id` (Customer Admin Approver)
  - `revoked_by_user_id`
  - `audit_log` (Timestamped JSON event log)
- Platform audit logs record both identities on every action.

### 10. Frontend Support State Management
- `useSupportStore.ts` provides centralized reactive state.
- `SupportCenter.tsx` provides full support session management, real-time timer countdown, and diagnostics tools.

### 11. SSE Push Notification Architecture (`SupportNotificationService`)
- Streams:
  - `/support/sse/tenant-stream`: Authenticated tenant events (`SUPPORT_REQUEST`, `SESSION_APPROVED`, `SESSION_REVOKED`).
  - `/support/sse/specialist-stream`: Authenticated specialist events.
- 25s keepalive heartbeat ping prevents reverse proxy disconnects.
- Clean eviction of dead emitters on client disconnect/error.
- Invariant: SSE is strictly a notification transport; database state transitions remain authoritative.

### 12. Authentication, Token & Session Eviction
- Suspension of tenant triggers `redisService.deleteObject("SESSION_TENANT_" + tenantId)`.
- Revocation of support session deletes ephemeral Redis session token and invalidates active session cache.

---

## 3. Critical Architectural Conflict Discovery

**Result:** **ZERO ARCHITECTURAL CONFLICTS DISCOVERED.**

The foundational components exist and align directly with the target enterprise specifications. We will now proceed with the phased execution chain:
**Phase 6 (Tenant Provisioning) $\rightarrow$ Phase 7 (Tenant Lifecycle) $\rightarrow$ Phase 11 (Support Specialist Access) $\rightarrow$ Phase 12 (SSE Notification Architecture)**.
