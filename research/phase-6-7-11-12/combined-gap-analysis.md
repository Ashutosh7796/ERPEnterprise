# Phase 6, 7, 11 & 12 Research — Combined Gap Analysis

## 1. Comprehensive Gap Analysis Matrix

| Domain Area | Feature / Capability | Existing Implementation | Target State (Phase 6, 7, 11 & 12) | Assessment |
|---|---|---|---|:---:|
| **Provisioning** | Tenant Creation Entrypoint | Minimal insertion into `erp_user` and `erp_tenant`. | `TenantProvisioningOrchestrator` coordinating atomic 9-stage sequence. | **INCOMPLETE** |
| **Provisioning** | Multi-Resource Defaults | None (new tenant has 0 Org, 0 Depot, 0 FY, 0 CoA). | Bootstraps Root Org (`HQ`), Primary Depot (`General Warehouse`), Active FY, 8 Series, Accounts. | **MISSING** |
| **Provisioning** | Subscription & Quota Binding | Raw string `type = "0"`. | Assigns `SubscriptionPlan` via `TenantSubscriptionService` enforcing Active Invariant. | **MISSING** |
| **Provisioning** | Admin Membership | Implicit `erp_user.tenant_id` fallback. | Explicit `UserTenantMembership` row with `role_id=TenantAdmin` and `scope=ALL`. | **MISSING** |
| **Lifecycle** | State Machine | Binary boolean `enabled` (0/1). | 7-State Machine (`PROVISIONING`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `GRACE_PERIOD`, `SOFT_DELETED`, `ARCHIVED`). | **MISSING** |
| **Lifecycle** | Suspension & Session Eviction | Flips `enabled = false`; leaves Redis tokens alive. | Flips status to `SUSPENDED`, updates subscription, immediately evicts all active Redis user sessions. | **PARTIAL** |
| **Lifecycle** | Grace Period Access | Evaluated in `AuthorizationService.isTenantAccessible`. | Configurable grace window (7 days) with dynamic UI expiration countdown banner. | **COMPLETE** |
| **Support** | Ephemeral Token Architecture | `SUPPORT_<token>_<tenantId>` generated in Redis. | Zero customer DB mutation; TTL-bounded in Redis and logged in `erp_support_session`. | **COMPLETE** |
| **Support** | Consent Gating | Support Center request/approval endpoints exist. | Tenant Admin reviews incoming request in real-time UI modal before granting token. | **PARTIAL** |
| **Support** | Action-Based Mutation Guard | `AuthorizationService.validateBusinessAction` checks mode. | Strictly prohibits `CREATE`, `UPDATE`, `DELETE`, `POST` if `accessMode == 'READ_ONLY'`. | **COMPLETE** |
| **Support** | Shift Attendance Tracking | Auto clock-in on login; clock-out on logout. | Logs specialist shift status in `erp_support_attendance`. | **COMPLETE** |
| **SSE Engine** | Real-Time Push Channels | Tenant stream and specialist stream in `SupportNotificationService`. | Partitioned `ConcurrentHashMap` preventing cross-tenant leakage; 25s keepalive heartbeat. | **COMPLETE** |
| **SSE Engine** | Frontend Event Handlers | None (SSE backend exists, but frontend hooks not wired). | Dedicated `useSupportNotification` React hook connecting to `/support/sse/*`. | **PARTIAL** |
| **Audit** | Platform Audit Logging | Immutable `PlatformAuditService` recording JSON diffs. | Structured logging across Provisioning, Suspension, Support approval, and Quota overrides. | **COMPLETE** |

---

## 2. What Should NOT Be Added (Avoiding Mid-Market Over-Engineering)

1. **Do NOT add complex multi-tier storage bin topologies**: Avoid Aisle-Rack-Shelf-Bin locators during initial depot bootstrap; mid-market ERPs need a clean, single-tier default warehouse.
2. **Do NOT add 500-node Chart of Accounts trees**: Avoid overwhelming new tenants with hundreds of nested sub-ledgers. Provide clean default Cash and Operating Bank accounts plus standard income/expense categories.
3. **Do NOT add permanent database backdoors**: Never allow platform engineers to bypass consent or inject permanent user accounts into customer tenant tables.
4. **Do NOT use WebSockets where SSE suffices**: Server-Sent Events (SSE) provide lightweight, proxy-friendly unidirectional push with native browser reconnection, avoiding WebSocket state synchronization overhead.
