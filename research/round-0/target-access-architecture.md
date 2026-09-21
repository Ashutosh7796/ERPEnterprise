# Target Access Control & Multi-Tenant Security Architecture

## Executive Summary
This document defines the target enterprise access control and multi-tenancy architecture designed specifically to fit our ERP's existing Spring Boot (`ERPSystem-boot`) and React (`ERPSystem-web-react`) foundation. It formalizes four orthogonal authority domains, multi-tiered organizational and warehouse data scoping, unified relational memberships, and a zero-trust request processing pipeline.

---

## 1. Target Authority Hierarchy Model

```mermaid
graph TD
    Platform["🏢 PLATFORM (System Infrastructure)"] --> SuperAdmin["👑 Super Admin (Platform Config, Subscriptions, Tenants)"]
    Platform --> SupportOps["🛟 Support Operations (Diagnostic Support & Tickets)"]
    
    SupportOps -.->|Consent Token Request| ConsentGate{"🔒 Customer Consent Gate (Time-Boxed, Audited)"}
    
    SuperAdmin --> Tenants["👥 TENANTS (Customer Partitions)"]
    
    Tenants --> TenantA["🏢 Tenant A (tenant_id = 149)"]
    Tenants --> TenantB["🏢 Tenant B (tenant_id = 150)"]
    
    TenantA --> ConsentGate
    ConsentGate ==>|Issues Time-Boxed Token| ActiveSupport["⏱️ Support Session (30m Read-Only / Diagnostic)"]
    ActiveSupport -.->|Scoped Access| TenantA
    
    TenantA --> TenantAdmin["👤 Tenant Administrator"]
    TenantAdmin --> OrgTree["🌳 Organization & Branch Hierarchy"]
    TenantAdmin --> DepotTree["📦 Depot & Warehouse Network"]
    TenantAdmin --> Roles["🛡️ RBAC Roles (Sales, Purchase, Finance, Stock)"]
    
    Roles --> UserMemberships["👤 User Memberships (Data Scopes: ALL, ORG, DEPOT, SELF)"]
    OrgTree --> UserMemberships
    DepotTree --> UserMemberships
```

---

## 2. The Four Orthogonal Authority Domains

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FOUR ORTHOGONAL AUTHORITY DOMAINS                    │
├──────────────────────────┬──────────────────────────────────────────────┤
│ 1. PLATFORM              │ Governs system-wide infrastructure, tenant   │
│    (Super Admin)         │ provisioning, quota caps, and global dictionaries.│
├──────────────────────────┼──────────────────────────────────────────────┤
│ 2. SUPPORT_OPERATIONS    │ Governs platform technical support engineers,│
│    (Support Specialist)  │ ticket triage, and diagnostic pipelines.     │
├──────────────────────────┼──────────────────────────────────────────────┤
│ 3. TENANT                │ Governs customer commercial business data,   │
│    (Customer Org & Staff)│ branch setups, sales/purchase/GST ledgers.   │
├──────────────────────────┼──────────────────────────────────────────────┤
│ 4. SUPPORT_SESSION       │ Temporary, consent-gated diagnostic access   │
│    (Time-Boxed Operator) │ into a specific customer tenant partition.   │
└──────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Relational Membership & Data Scoping Model

The target model unifies user identity with tenant access using the relational entity [`UserTenantMembership.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/UserTenantMembership.java):

```text
┌─────────────────────────┐         ┌─────────────────────────────────────┐
│       jsh_user          │         │    erp_user_tenant_membership       │
├─────────────────────────┤         ├─────────────────────────────────────┤
│ id (PK)                 │1       N│ id (PK)                             │
│ username                │─────────│ user_id (FK -> jsh_user.id)         │
│ login_name              │         │ tenant_id (FK -> jsh_tenant.tenant_id)│
│ password                │         │ role_id (FK -> jsh_role.id)         │
│ phonenum / email        │         │ is_default (BOOLEAN)                │
└─────────────────────────┘         │ status (ACTIVE / INACTIVE)          │
                                    │ data_scope_type                     │
                                    │ data_scope_values                   │
                                    └─────────────────────────────────────┘
```

### Data Scope Resolution Matrix:
1. **`ALL` (Full Tenant Visibility)**:
   - Granted to Tenant Administrators, Managing Directors, Chief Financial Officers.
   - Query Filter: `WHERE tenant_id = ?`
2. **`ORG` (Branch / Department Scoping)**:
   - Granted to Regional Branch Managers and Department Supervisors.
   - Query Filter: `WHERE tenant_id = ? AND org_id IN (child_org_ids)`
3. **`DEPOT` (Warehouse / Depot Scoping)**:
   - Granted to Warehouse Supervisors, Inventory Clerks, Dispatch Staff.
   - Query Filter: `WHERE tenant_id = ? AND depot_id IN (assigned_depot_ids)`
4. **`SELF` (Creator-Only Scoping)**:
   - Granted to Field Sales Representatives, Individual Requisitioners.
   - Query Filter: `WHERE tenant_id = ? AND creator = current_user_id`

---

## 4. Target Zero-Trust Request Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Support Operator
    participant Gateway as Security Interceptor
    participant SecSvc as SecurityService
    participant Context as SecurityContext (ThreadLocal)
    participant MyBatis as MyBatis-Plus Interceptor
    participant DB as MySQL DB

    Client->>Gateway: API Request + [X-Access-Token] / [X-Support-Session-Token]
    Gateway->>SecSvc: Resolve Context(token)
    
    alt Standard Tenant User
        SecSvc->>SecSvc: Extract tenantId, userId, roleId, dataScope
        SecSvc->>Context: Set TenantContext(tenantId, dataScope)
    else Support Specialist (with Active Session Token)
        SecSvc->>SecSvc: Validate Session Code, Expiry & Customer Consent
        SecSvc->>Context: Set SupportContext(targetTenantId, accessMode='READ_ONLY')
    end
    
    Gateway->>MyBatis: Forward to Service & Repository
    MyBatis->>Context: Read Active TenantContext
    MyBatis->>DB: Execute AST-rewritten SQL (tenant_id + data_scope filters)
    DB-->>Client: Return Filtered Domain Data
```

---

## 5. Architectural Benefits of Target Model

1. **Strict Defense-in-Depth**: Combines token validation at API gateways, zero-trust context derivation in services, AST rewriting at ORM layers, and data-scoping predicates.
2. **Zero Standing Privilege for Support**: Support staff cannot inspect customer data without explicit, time-boxed customer consent.
3. **Enterprise Multi-Branch Readiness**: Enterprises can safely onboard hundreds of branch locations and regional warehouses onto a single tenant account without data cross-contamination.
4. **Backward Compatibility**: Fully compatible with existing `jsh_*` database schemas and REST API contracts.
