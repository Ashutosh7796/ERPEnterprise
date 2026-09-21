# Phase 6 & 7 Research — Current Implementation & Gap Analysis

## 1. Current Implementation Code Flow

```
[HTTP POST /tenant/add]
         │
         ▼
TenantController.addResource(obj, request)
         │ (Requires Super Admin authority via securityService.requireSuperAdmin())
         ▼
TenantService.insertTenant(obj, request)
         │
         ├─► UserEx ue = parseObject(obj)
         ├─► ue.setUsername(ue.getLoginName())
         ├─► userService.checkLoginName(ue)
         │
         ▼
UserService.registerUser(ue, roleId, request)
         │
         ├─► Step 1: Encrypt password with MD5 (default "123456" if empty)
         ├─► Step 2: userMapper.insertSelective(ue)
         │           ↳ Inserts into erp_user with tenant_id = NULL
         ├─► Step 3: Long userId = getIdByLoginName(ue.getLoginName())
         ├─► Step 4: user.setTenantId(userId)
         │           ↳ userService.updateUserTenant(user) updates erp_user.tenant_id = userId
         ├─► Step 5: userBusinessService.insertUserBusiness(ubObj)
         │           ↳ Inserts legacy UserRole row into erp_user_business
         ├─► Step 6: tenantMapper.insertSelective(tenant)
         │           ↳ Inserts into erp_tenant with tenant_id = userId, enabled = 1, expire_time = now + 30 days
         │
         ▼
[HTTP 200 OK — "Tenant created successfully"]
```

---

## 2. Gaps & Incorrect Behaviors in Current Implementation

### Gap 1: Zero Enterprise Foundation Bootstrap
When a Super Admin creates a tenant via `/tenant/add`, the system creates **only** one row in `erp_user` and one row in `erp_tenant`. The new tenant has:
- **No Head Office / Organization**: `erp_organization` is completely empty for the new tenant. When tenant users attempt to create departments or assign employees, there is no root branch.
- **No Default Warehouse / Depot**: `erp_depot` is completely empty. When creating goods receipts, sales orders, or purchase orders, the dropdown for warehouse is empty.
- **No Active Financial Year**: `erp_financial_year` has no pre-initialized record.
- **No Document Numbering Series**: `erp_document_number_series` has no pre-initialized series, forcing runtime dynamic inserts on first bill submission.
- **No Default Chart of Accounts**: `erp_account` is empty. The tenant cannot record initial capital, cash transactions, or bank transfers.
- **No Default Income/Expense Categories**: `erp_in_out_item` is empty.

### Gap 2: Disconnected Subscription Plan & Quota Engine
- The current `TenantService.insertTenant` sets `tenant.type = "0"` (or a raw string).
- It **does NOT** interact with the Phase 5/8/9 `TenantSubscriptionService`.
- No `TenantSubscription` row is created in `erp_tenant_subscription`.
- As a result, the new tenant has no formal subscription plan code, no multi-resource quotas (Depot limit, Org limit), and no feature entitlement token set.

### Gap 3: Missing Authoritative User-Tenant Membership
- The user is created with legacy `erp_user.tenant_id = userId`.
- No row is inserted into `erp_user_tenant_membership`.
- The system is forced to rely on the "Compatibility Fallback" in `TenantMembershipService` instead of having a direct, canonical multi-tenant membership record.

### Gap 4: Flawed Tenant ID Generation Strategy
- Legacy jshERP relies on `tenant_id = user_id`.
- This tight coupling between the tenant container and the first user account prevents:
  - Changing the primary administrator.
  - Deleting the administrator account without deleting the entire tenant.
  - Multi-administrator organizations where multiple users possess administrative authority.
- **Target Standard**: The tenant container must have a distinct, generated `tenant_id` (Snowflake / Sequence or Primary Key), and the tenant admin is simply a user assigned to that `tenant_id` with `TenantAdmin` role.

### Gap 5: No Atomic Provisioning State Machine
- If `UserService.registerUser` fails after step 2 (e.g. database constraint error during `userBusiness` or `tenant` insert), the `erp_user` row remains in the database if transactional boundaries fail across nested beans.
- There is no `PROVISIONING` status to prevent incomplete or partially initialized tenants from logging in.
- The tenant is immediately marked `enabled = 1` before bootstrap is completed.

### Gap 6: Incomplete Lifecycle Actions
- **Suspension**: Currently only flips `erp_tenant.enabled = false`. It does not invalidate active Redis sessions (`X-Access-Token`), meaning already logged-in users remain active until token timeout.
- **Soft Deletion**: Sets `erp_tenant.delete_flag = '1'`, but leaves all child entities (users, memberships, subscriptions) in active state.
- **Reactivation**: Only flips `enabled = true` without validating if the tenant's subscription is active or expired.

---

## 3. Comprehensive Comparison Table

| Feature | Legacy jshERP Current State | Phase 6 & 7 Enterprise Specification |
|---|---|---|
| **Tenant ID Source** | Auto-increment `user_id` assigned as `tenant_id` | Dedicated tenant sequence / primary key; independent of user ID |
| **Admin Membership** | Implicit via `erp_user.tenant_id` | Canonical `erp_user_tenant_membership` row (`data_scope_type='ALL'`, `role='TenantAdmin'`) |
| **Organization Root** | None (empty) | Auto-bootstrapped "Head Office" (`org_abr="HQ"`, `org_type=1`) |
| **Primary Depot** | None (empty) | Auto-bootstrapped "General Warehouse" (`is_default=true`, `type=0`) |
| **Fiscal Year** | Reactive upon first transaction | Proactively initialized for Current Indian FY (01-Apr to 31-Mar) |
| **Number Series** | Reactive upon first transaction | Proactively initialized for 8 core document types (SO, SI, PO, PI, CRN, DRN, PAY, REC) |
| **Chart of Accounts** | None (empty) | Auto-bootstrapped Cash Account, Operating Bank Account, and Standard InOut Categories |
| **Plan Assignment** | Unstructured `type` string | Formal `SubscriptionPlan` assignment with active subscription invariant |
| **State Machine** | Binary `enabled` (0 / 1) | `PROVISIONING` $\rightarrow$ `ACTIVE` $\rightarrow$ `SUSPENDED` $\rightarrow$ `EXPIRED` $\rightarrow$ `GRACE_PERIOD` $\rightarrow$ `SOFT_DELETED` |
| **Session Eviction** | None | Real-time Redis token eviction upon tenant suspension / deactivation |
| **Audit Logging** | Unstructured text in `erp_log` | Structured, immutable `erp_platform_audit_log` with operator and diff state |
