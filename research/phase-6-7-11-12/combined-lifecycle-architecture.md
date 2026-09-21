# Phase 6, 7, 11 & 12 Research — Combined Lifecycle Architecture

## 1. Master End-to-End Enterprise Lifecycle Diagram

This diagram unifies the complete enterprise lifecycle across all platform phases:

```mermaid
stateDiagram-v2
    [*] --> SuperAdmin_Provisioning : Super Admin creates Tenant
    
    state SuperAdmin_Provisioning {
        [*] --> InputValidation
        InputValidation --> TenantContainerAllocation
        TenantContainerAllocation --> PlanAndQuotaBinding
        PlanAndQuotaBinding --> OrganizationBootstrap
        OrganizationBootstrap --> DepotBootstrap
        DepotBootstrap --> FiscalYearBootstrap
        FiscalYearBootstrap --> DocumentSeriesBootstrap
        DocumentSeriesBootstrap --> ChartOfAccountsBootstrap
        ChartOfAccountsBootstrap --> AdminUserAndMembership
        AdminUserAndMembership --> ActivationVerification
        ActivationVerification --> [*]
    }
    
    SuperAdmin_Provisioning --> Normal_Operation : Activation Succeeded
    SuperAdmin_Provisioning --> [*] : Provisioning Failed (Full Rollback)
    
    state Normal_Operation {
        [*] --> BusinessOperations
        BusinessOperations --> DailyERPActivities : Sales / Purchase / Stock / Finance
        
        state DailyERPActivities {
            [*] --> StandardRBAC
            StandardRBAC --> TwoDimensionalDataScope
            TwoDimensionalDataScope --> [*]
        }
    }
    
    Normal_Operation --> Support_Lifecycle : Issue Occurs & Specialist Initiates Support
    
    state Support_Lifecycle {
        [*] --> SupportRequestCreated : Specialist Submits Request
        SupportRequestCreated --> SSE_PushNotification : Real-time Alert to Tenant Admin
        SSE_PushNotification --> TenantAdminDecision : Tenant Admin Reviews
        
        TenantAdminDecision --> SessionRejected : Denied by Customer
        SessionRejected --> [*]
        
        TenantAdminDecision --> EphemeralSessionActive : Approved by Customer
        
        state EphemeralSessionActive {
            [*] --> ScopedDiagnosticQueries : READ_ONLY / 2D Scoped
            ScopedDiagnosticQueries --> ActionGuardEnforced : Reject Writes if READ_ONLY
            ActionGuardEnforced --> [*]
        }
        
        EphemeralSessionActive --> SessionRevoked : Revoked by Tenant Admin
        EphemeralSessionActive --> SessionExpired : TTL Clock Expires
        SessionRevoked --> [*]
        SessionExpired --> [*]
    }
    
    Support_Lifecycle --> Normal_Operation : Support Concluded & Logged
    
    Normal_Operation --> Commercial_Lifecycle : Billing / Compliance Events
    
    state Commercial_Lifecycle {
        [*] --> GracePeriod : End Date Passed (Within 7 Days)
        GracePeriod --> ActiveRestored : Plan Renewed / Settled
        GracePeriod --> ExpiredCutoff : Grace Window Elapsed
        
        [*] --> SuspendedState : Super Admin Lock (Non-payment / Breach)
        SuspendedState --> SessionEvictionTriggered : Evict all Redis Sessions
        SuspendedState --> ActiveRestored : Super Admin Reactivation
        
        ExpiredCutoff --> SoftDeleted : Decommission Requested
        SuspendedState --> SoftDeleted : Decommission Requested
        ActiveRestored --> [*]
    }
    
    Commercial_Lifecycle --> Normal_Operation : Reactivated / Renewed
    Commercial_Lifecycle --> [*] : Archived & Hard Purged
```

---

## 2. Dedicated Domain Architecture Diagrams

### 1. Support Access & Consent Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Spec as Support Specialist
    participant SC as Support Center
    participant SSE as SSE Notification Engine
    actor TenantAdmin as Customer Tenant Admin
    participant Auth as Authorization Service
    participant Audit as Platform Audit

    Spec->>SC: 1. Request Support (targetTenantId, justification, moduleScope, duration)
    SC->>SSE: 2. Push event SUPPORT_REQUEST_RECEIVED
    SSE-->>TenantAdmin: 3. Real-time Toast/Modal in ERP UI
    
    TenantAdmin->>SC: 4. Approve Support Request (accessMode=READ_ONLY)
    SC->>SC: 5. Issue Ephemeral Token SUPPORT_uuid_tenantId (Redis TTL = 60m)
    SC->>SSE: 6. Push event SUPPORT_SESSION_APPROVED
    SSE-->>Spec: 7. Real-time Notification ("Session Approved")
    
    Spec->>Auth: 8. Execute Diagnostics with SUPPORT_uuid_tenantId
    Auth->>Auth: 9. Enforce 2D Scope & Read-Only Action Gate
    Auth-->>Spec: 10. Diagnostic Data
    
    TenantAdmin->>SC: 11. Revoke Session (Instant Redis Key Deletion)
    SC->>Audit: 12. Log immutable audit record
```

### 2. Multi-Factor Security & Authorization Gate Flow

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> TokenExtract[Extract X-Access-Token]
    TokenExtract --> IsSupport{Is Support Token?<br>starts with SUPPORT_}
    
    IsSupport -- Yes --> SuppAuth[Resolve Ephemeral Support Context]
    SuppAuth --> SuppMode{Is accessMode == READ_ONLY?}
    SuppMode -- Yes & Write Request --> BlockWrite[HTTP 403: Write Denied in READ_ONLY Mode]
    SuppMode -- No or Read Request --> SuppScope[Apply Two-Dimensional Data Scope]
    SuppScope --> GrantAccess[Execute Operation]
    
    IsSupport -- No --> TenantGate{Is Tenant Accessible?<br>isTenantAccessible}
    TenantGate -- Suspended / Expired --> BlockTenant[HTTP 403: Tenant Suspended or Expired]
    TenantGate -- Accessible --> FeatureGate{Tenant Entitled to Feature?<br>ctx.hasFeature}
    FeatureGate -- No --> BlockFeature[HTTP 403: Feature Not Included in Plan]
    FeatureGate -- Yes --> RBACGate{User Has RBAC Permission?<br>ctx.hasPermission}
    RBACGate -- No --> BlockRBAC[HTTP 403: Permission Denied]
    RBACGate -- Yes --> DataScopeApply[Apply ALL / ORG / DEPOT / SELF Scope]
    DataScopeApply --> GrantAccess
```
