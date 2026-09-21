# Phase 6 & 7 Research — API & UI Specification

## 1. REST API Specification

All tenant provisioning and lifecycle management endpoints require **Platform Super Admin** authority (`SecurityService.requireSuperAdmin()` and `@PreAuthorize("hasAuthority('PLATFORM.TENANT.MANAGE')")`).

### 1. `POST /platform/tenant/provision`
- **Description**: Atomic, end-to-end tenant provisioning and 9-stage multi-resource bootstrap.
- **Request Body**:
```json
{
  "loginName": "acme_corp",
  "companyName": "Acme Technologies Pvt Ltd",
  "adminFullName": "John Doe",
  "adminEmail": "admin@acme.com",
  "adminPhone": "9876543210",
  "password": "SecurePassword123!",
  "planId": 2,
  "durationDays": 365,
  "initialDepotName": "General Warehouse",
  "initialOrgName": "Head Office",
  "remark": "Standard Pro annual subscription"
}
```
- **Response (HTTP 200 OK)**:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "tenantId": 151,
    "adminUserId": 151,
    "loginName": "acme_corp",
    "companyName": "Acme Technologies Pvt Ltd",
    "planCode": "STANDARD_PRO",
    "status": "ACTIVE",
    "rootOrgId": 18,
    "defaultDepotId": 24,
    "activeFinancialYearId": 5,
    "documentSeriesCount": 8,
    "defaultAccountIds": [12, 13],
    "expireTime": "2027-08-20 17:30:00",
    "message": "Tenant successfully provisioned and bootstrapped"
  }
}
```
- **Error Responses**:
  - `HTTP 400 Bad Request`: Validation failure (e.g. invalid plan, reserved login name).
  - `HTTP 409 Conflict`: Concurrency collision (e.g. login name already exists or provisioning in progress).
  - `HTTP 500 Internal Server Error`: Rollback triggered; returns stage failure details.

---

### 2. `POST /platform/tenant/suspend`
- **Description**: Administratively suspends tenant, updates subscription state, and evicts all active user sessions from Redis.
- **Request Body**:
```json
{
  "tenantId": 151,
  "reason": "Payment overdue by 30 days"
}
```
- **Response**: HTTP 200 with updated tenant status and eviction count (`evictedSessionCount: 4`).

---

### 3. `POST /platform/tenant/reactivate`
- **Description**: Reactivates a suspended tenant after compliance verification.
- **Request Body**:
```json
{
  "tenantId": 151,
  "reason": "Payment confirmed via wire transfer"
}
```
- **Response**: HTTP 200 with status `ACTIVE`.

---

### 4. `POST /platform/tenant/renew`
- **Description**: Renews or extends tenant subscription plan with audit logging.
- **Request Body**:
```json
{
  "tenantId": 151,
  "planId": 3,
  "extendDays": 365,
  "reason": "Annual contract renewal and tier upgrade to Enterprise"
}
```

---

## 2. Frontend UI Enhancements

### 1. `TenantList.tsx` Updates
- **Lifecycle Status Badges**:
  - `ACTIVE` $\rightarrow$ Green Tag
  - `PROVISIONING` $\rightarrow$ Blue Processing Tag with animated spinner
  - `SUSPENDED` $\rightarrow$ Red Lock Tag
  - `GRACE_PERIOD` $\rightarrow$ Orange Warning Tag (with days remaining)
  - `EXPIRED` $\rightarrow$ Grey Tag
- **Subscription Plan Column**: Displays plan code badge (`STARTER`, `PRO`, `ENTERPRISE`) with quota summary (`Users: 4/15 | Depots: 1/3`).
- **Action Dropdown**:
  - `View Details / Subscription`
  - `Reset Admin Password`
  - `Suspend Tenant` (opens modal requiring reason)
  - `Reactivate Tenant`
  - `Renew / Upgrade Plan`
  - `Delete Tenant`

### 2. `TenantProvisioningModal.tsx` (Step-by-Step Wizard)
- **Step 1: Enterprise Profile & Admin Credentials**:
  - Organization / Legal Company Name
  - Tenant Login Handle (with real-time uniqueness validation)
  - Admin Full Name, Email, Phone
  - Initial Password
- **Step 2: Subscription Plan Selection**:
  - Radio card selector displaying Plan Tier, Price, User/Depot/Org Limits, and Included Modules
  - Duration picker (30-day Free Trial, 1-Year Annual, 2-Year Enterprise)
- **Step 3: Initial Branch & Warehouse Customization**:
  - Default Head Office Name (default "Head Office")
  - Default Central Warehouse Name (default "General Warehouse")
- **Provisioning Execution & Live Progress**:
  - Progress bar showing atomic stage execution (Validation $\rightarrow$ Plan $\rightarrow$ Org $\rightarrow$ Depot $\rightarrow$ Fiscal $\rightarrow$ Accounts $\rightarrow$ Admin $\rightarrow$ Activation).
