# Phase 6, 7, 11 & 12 Research — Combined Recommended Design

## 1. Architectural Strategy

The combined architecture is organized into two distinct, decoupled tracks:
- **Track A**: Tenant Provisioning, Multi-Resource Bootstrap & Lifecycle Governance (Phase 6 & 7)
- **Track B**: Support Operations, Ephemeral Work Centre & Real-Time SSE Notifications (Phase 11 & 12)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                PLATFORM SUPER ADMIN                                    │
└───────────────┬────────────────────────────────────────────────────────┬───────────────┘
                │                                                        │
                ▼ (Track A: Provisioning & Lifecycle)                    ▼ (Track B: Support Operations)
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│        TenantProvisioningOrchestrator        │        │             SupportAccessService             │
│   (@Transactional 9-Stage Atomic Engine)     │        │     (Ephemeral Tokens & Zero DB Mutation)    │
├──────────────────────────────────────────────┤        ├──────────────────────────────────────────────┤
│ 1. Input & Plan Pre-flight Validation        │        │ 1. Support Request & Consent Workflow        │
│ 2. Tenant Container (erp_tenant)             │        │ 2. Ephemeral Session Generation (Redis TTL)  │
│ 3. Subscription & Active Invariant           │        │ 3. 2D Scoping (Module + Depot/Org Scope)     │
│ 4. Root Organization (HQ, type=1)            │        │ 4. Action Mutation Guard (READ_ONLY Block)   │
│ 5. Primary Depot (General Warehouse)         │        │ 5. Session Revocation & Auto Expiry          │
│ 6. Indian Financial Year (01-Apr to 31-Mar)  │        └──────────────────────┬───────────────────────┘
│ 7. Statutory Number Series (8 Doc Types)     │                               │
│ 8. Chart of Accounts & InOut Categories      │                               ▼
│ 9. Tenant Admin User & Canonical Membership  │        ┌──────────────────────────────────────────────┐
│ 10. Activation Gate & Audit Trail            │        │          SupportNotificationService          │
└──────────────────────────────────────────────┘        │    (Multi-Tenant Server-Sent Events Push)    │
                                                        ├──────────────────────────────────────────────┤
                                                        │ - /support/sse/tenant-stream                 │
                                                        │ - /support/sse/specialist-stream             │
                                                        │ - 25s Heartbeat & Dead Emitter Eviction      │
                                                        └──────────────────────────────────────────────┘
```

---

## 2. Core Service Specifications

### Track A: Tenant Provisioning & Lifecycle
1. **`TenantBootstrapService.java`**:
   - Reusable builder service providing clean, isolated methods for seeding baseline resources (`bootstrapRootOrganization`, `bootstrapPrimaryDepot`, `bootstrapFiscalYear`, `bootstrapDocumentSeries`, `bootstrapDefaultAccounts`, `bootstrapTenantAdmin`, `bootstrapAdminMembership`).
2. **`TenantProvisioningOrchestrator.java`**:
   - Master `@Transactional` coordinator that manages concurrency locks, invokes the builder steps in sequence, verifies the final activation gate, and records platform audit records.
3. **`TenantLifecycleService.java`**:
   - Manages state transitions (`SUSPENDED`, `ACTIVE`, `SOFT_DELETED`), coordinates Redis session evictions upon suspension/deletion, and executes subscription renewals.

### Track B: Support Operations & SSE Notifications
1. **`SupportAccessService.java`**:
   - Manages support ticket requests, customer tenant approvals, ephemeral Redis token generation with TTL, action mutation blocking, and shift attendance tracking.
2. **`SupportNotificationService.java`**:
   - Partitioned SSE engine streaming real-time notifications for incoming support requests, approvals, rejections, revocations, and expiry warnings with zero cross-tenant leakage.
3. **`AuthorizationService.java` Integration**:
   - Single gateway enforcing support tokens (`SUPPORT_*`), tenant lifecycle access gate (`isTenantAccessible`), tenant feature entitlements (`hasFeature`), and user RBAC (`hasPermission`).
