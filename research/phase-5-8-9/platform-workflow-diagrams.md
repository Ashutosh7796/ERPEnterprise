# Platform End-to-End Business & Technical Workflow Diagrams

## 1. Executive Summary
This document provides visual sequence and workflow diagrams for Plan Assignment, Quota Enforcement, Feature Entitlement Gatekeeping, and Lifecycle Suspensions.

---

## 2. End-to-End Subscription & Quota Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Platform Super Admin
    participant PlanSvc as SubscriptionPlanService
    participant SubSvc as TenantSubscriptionService
    participant DB as MySQL Database
    actor User as Tenant Administrator
    participant UserCtrl as UserController / DepotController
    participant QuotaSvc as QuotaEnforcementService
    participant AuthSvc as AuthorizationService

    %% 1. Plan Definition
    Admin->>PlanSvc: Create Plan [STANDARD_PRO] (15 Users, 3 Depots)
    PlanSvc->>DB: INSERT INTO erp_subscription_plan
    
    %% 2. Assignment
    Admin->>SubSvc: Assign Plan [STANDARD_PRO] to Tenant 149
    SubSvc->>DB: INSERT INTO erp_tenant_subscription (tenant_id=149, plan_id=2)
    SubSvc->>DB: INSERT INTO erp_platform_audit_log [PLAN_ASSIGN]
    
    %% 3. Tenant Action: Add User
    User->>UserCtrl: POST /user/addUser (New Staff Member)
    UserCtrl->>QuotaSvc: validateUserQuota(tenantId=149)
    QuotaSvc->>DB: Check Effective Quota (15) vs Current Active Users (14)
    QuotaSvc-->>UserCtrl: Quota OK (14 < 15)
    UserCtrl->>DB: INSERT INTO erp_user + erp_user_tenant_membership
    UserCtrl-->>User: 200 OK User Created
    
    %% 4. Tenant Action: Exceed Quota
    User->>UserCtrl: POST /user/addUser (16th User)
    UserCtrl->>QuotaSvc: validateUserQuota(tenantId=149)
    QuotaSvc->>DB: Check Effective Quota (15) vs Current Active Users (15)
    QuotaSvc-->>UserCtrl: 403 FORBIDDEN: User Quota Reached
    UserCtrl-->>User: 403 Access Denied: User Quota Reached (15/15)
    
    %% 5. Super Admin Override
    Admin->>SubSvc: Set Quota Override (override_user_limit=25)
    SubSvc->>DB: UPDATE erp_tenant_subscription SET override_user_limit=25
    SubSvc->>DB: INSERT INTO erp_platform_audit_log [QUOTA_OVERRIDE]
    
    %% 6. Retry User Creation
    User->>UserCtrl: POST /user/addUser (16th User)
    UserCtrl->>QuotaSvc: validateUserQuota(tenantId=149)
    QuotaSvc->>DB: Check Effective Quota (25) vs Current Active Users (15)
    QuotaSvc-->>UserCtrl: Quota OK (15 < 25)
    UserCtrl->>DB: INSERT INTO erp_user
    UserCtrl-->>User: 200 OK User Created
```

---

## 3. Feature Entitlement & API Interception Flow

```mermaid
flowchart TD
    Req[Tenant Request: POST /gstEinvoice/generateIrn] --> AuthFilter[Security & Auth Filter]
    AuthFilter --> ResolveCtx[AuthorizationService: Resolve SecurityContext]
    ResolveCtx --> CheckPlatform[Is Target API a Platform Route?]
    
    CheckPlatform -->|Yes| EnforcePlatformAdmin[Verify isPlatformAdmin == true]
    CheckPlatform -->|No| CheckTenantStatus{Is Tenant ACTIVE / TRIAL / GRACE?}
    
    CheckTenantStatus -->|Suspended| DenySuspended[403 FORBIDDEN: Tenant Instance is Suspended]
    CheckTenantStatus -->|Active| CheckFeature{Plan Includes MODULE_GST_EINVOICE?}
    
    CheckFeature -->|No| DenyFeature[403 FORBIDDEN: Feature not in Subscription Plan]
    CheckFeature -->|Yes| CheckTenantLine[TenantLineHandler: Append tenant_id = 149]
    
    CheckTenantLine --> ExecService[Execute Business Logic & Generate IRN]
    ExecService --> DB[(MySQL)]
    DB --> RetSuccess[200 OK Response]
```
