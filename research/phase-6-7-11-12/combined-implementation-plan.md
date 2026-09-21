# Phase 6, 7, 11 & 12 Research — Combined Implementation Plan

## 1. Track Separation & Dependencies

```
┌────────────────────────────────────────────────────────┐
│             TRACK A: TENANT PROVISIONING               │
│               & LIFECYCLE GOVERNANCE                   │
├────────────────────────────────────────────────────────┤
│ Step A1: DDL Migration (status, company_name)          │
│ Step A2: DTOs & Entity Extensions                      │
│ Step A3: TenantBootstrapService (Resource Builders)    │
│ Step A4: TenantProvisioningOrchestrator (@Transactional)│
│ Step A5: TenantLifecycleService (Suspend/Reactivate)   │
│ Step A6: REST Controllers & PermissionRegistry Mapping │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (Dependency: Track B requires active tenant
                            │  instances and AuthorizationService hooks)
                            ▼
┌────────────────────────────────────────────────────────┐
│             TRACK B: SUPPORT OPERATIONS                │
│             & REAL-TIME SSE NOTIFICATIONS              │
├────────────────────────────────────────────────────────┤
│ Step B1: SupportAccessService & 2D Scoping             │
│ Step B2: SupportNotificationService (SSE Partitions)   │
│ Step B3: AuthorizationService Support Token Gate       │
│ Step B4: REST Controllers (/support/center, /sse/*)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           FRONTEND INTEGRATION & VERIFICATION          │
├────────────────────────────────────────────────────────┤
│ Step F1: TenantList.tsx Multi-Step Provisioning Wizard │
│ Step F2: SupportCenter.tsx & SSE Notification Toasts   │
│ Step V1: Comprehensive Test Suite (105+ Tests Passing) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Track A: Tenant Provisioning & Lifecycle Governance

### Step A1: Database Migration
- File: `ERPSystem-boot/docs/schema_phase_6_7_tenant_provisioning_and_lifecycle.sql`
- Adds `company_name`, `admin_user_id`, and `status` columns to `erp_tenant` with index `idx_tenant_status`.

### Step A2: DTOs & Entity Extensions
- Files:
  - `TenantProvisioningDto.java`
  - `TenantProvisioningResultDto.java`
  - `TenantLifecycleActionDto.java`
  - Updates to `Tenant.java`

### Step A3: `TenantBootstrapService.java`
- Builder methods:
  - `bootstrapRootOrganization(...)` $\rightarrow$ `erp_organization`
  - `bootstrapPrimaryDepot(...)` $\rightarrow$ `erp_depot`
  - `bootstrapFiscalYear(...)` $\rightarrow$ `erp_financial_year`
  - `bootstrapDocumentSeries(...)` $\rightarrow$ `erp_document_number_series`
  - `bootstrapDefaultAccounts(...)` $\rightarrow$ `erp_account`
  - `bootstrapDefaultCategories(...)` $\rightarrow$ `erp_in_out_item`
  - `bootstrapTenantAdmin(...)` $\rightarrow$ `erp_user`
  - `bootstrapAdminMembership(...)` $\rightarrow$ `erp_user_tenant_membership`

### Step A4: `TenantProvisioningOrchestrator.java`
- Unified `@Transactional(rollbackFor = Exception.class)` coordinator.
- Manages concurrency locks, executes 9-stage sequence, validates final activation gate, and logs platform audit records.

### Step A5: `TenantLifecycleService.java`
- Implements `suspendTenant`, `reactivateTenant`, `renewSubscription`, `softDeleteTenant`.
- Enforces real-time Redis token eviction upon tenant suspension / soft deletion.

### Step A6: REST Endpoints & Permissions
- Endpoints:
  - `POST /platform/tenant/provision`
  - `POST /platform/tenant/suspend`
  - `POST /platform/tenant/reactivate`
  - `POST /platform/tenant/renew`
  - `DELETE /platform/tenant/delete`
- Registered in `PermissionRegistry.java`.

---

## 3. Track B: Support Operations & SSE Notifications Backend

### Step B1: `SupportAccessService.java`
- Implements Support ticket requests, customer tenant approvals, ephemeral Redis token generation with TTL, action mutation blocking, and shift attendance tracking.

### Step B2: `SupportNotificationService.java`
- Manages partitioned SSE streams (`/support/sse/tenant-stream`, `/support/sse/specialist-stream`), 25s keepalive heartbeats, and dead emitter evictions.

### Step B3: `AuthorizationService.java` Gate Integration
- Evaluates support tokens (`SUPPORT_*`), verifies expiration, applies 2D scoping (Module + Depot/Org), and blocks writes if `accessMode == 'READ_ONLY'`.

---

## 4. Frontend & Verification Steps

### Step F1: `TenantList.tsx` Provisioning Wizard
- Replaces legacy basic modal with multi-step Provisioning Wizard:
  - Step 1: Enterprise Profile & Admin Credentials
  - Step 2: Plan Selector & Billing Cycle
  - Step 3: Branch & Warehouse Defaults
  - Step 4: Live Atomic Execution Progress Bar
- Adds Lifecycle Badges and Suspension/Reactivation action modals.

### Step F2: `SupportCenter.tsx` Real-Time SSE Integration
- Wires React `EventSource` connection to `/support/sse/tenant-stream`.
- Displays real-time request approval toasts and active session indicators.

### Step V1: Full Automated Test Suite
- Executes all new Phase 6/7/11/12 tests alongside existing Phase 1–5 tests (Target: 105+ tests passing with 0 failures).
