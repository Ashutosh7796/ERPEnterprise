# Tenant Administrator Capabilities & Governance Deep-Dive

## Executive Summary
This document provides a comprehensive analysis of the Tenant Administrator (Customer Admin) role within our ERP architecture. It delineates the scope of authority, operational responsibilities, user/role governance, organizational master data management, and security boundaries that prevent unauthorized elevation into platform-level settings. Comparisons against **metasfresh** and **ERPNext** are provided.

---

## 1. Tenant Admin Identity & Identification

A Tenant Administrator is the designated administrator for a specific customer organization partition:
* **Account Linkage**: User whose `tenant_id > 0` and is assigned the Tenant Manager / Admin role (`manageRoleId = 6` or equivalent `ROLE_TENANT_ADMIN`).
* **Root Tenant User**: Often created automatically during tenant provisioning with `user.getId() == user.getTenantId()`.
* **Scope Boundary**: Strictly isolated to rows matching `tenant_id = user.getTenantId()`.

---

## 2. Tenant Admin Functional Capabilities Matrix

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        TENANT ADMIN WORKSPACE                           │
│                                                                         │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────┐│
│  │ User & Role Mgmt      │ │ Organization & Depot  │ │ Master Data    ││
│  │ • Create/Edit Users   │ │ • Branch Trees        │ │ • Materials    ││
│  │ • Assign Roles (RBAC) │ │ • Warehouse / Depots  │ │ • Suppliers    ││
│  │ • Set Data Scopes     │ │ • Org-User Mappings   │ │ • Customers    ││
│  └───────────────────────┘ └───────────────────────┘ └────────────────┘│
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────┐│
│  │ Financial & Tax       │ │ Commercial Operations │ │ Support Ops    ││
│  │ • Account Heads       │ │ • Sales Orders        │ │ • Request Help ││
│  │ • Company GSTINs      │ │ • Purchase Orders     │ │ • Grant Consent││
│  │ • Document Series     │ │ • Stock Transfers     │ │ • Revoke Token ││
│  └───────────────────────┘ └───────────────────────┘ └────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

| Operational Domain | Responsibility / Feature | Current ERP Support | Notes & Endpoints |
| :--- | :--- | :---: | :--- |
| **User Management** | Create Tenant Staff Users | **YES** | `POST /user/add` (Auto-binds current `tenant_id`) |
| | Edit Staff Profiles & Passwords | **YES** | `PUT /user/update`, `POST /user/resetPwd` |
| | Disable / Deactivate Staff | **YES** | Sets `status = 1` |
| **RBAC & Permissions** | Create & Manage Roles | **YES** | `GET/POST /role/*` |
| | Configure Menu/Button Access | **YES** | `POST /userBusiness/update` (`type = 'RoleFunctions'`) |
| | Manage User Data Scopes | **YES** | `erp_user_tenant_membership` (`dataScopeType`) |
| **Organizational Setup** | Manage Organization Tree | **YES** | `GET/POST /organization/*` |
| | Assign Users to Departments | **YES** | `GET/POST /orgaUserRel/*` |
| | Create Warehouses / Depots | **YES** | `GET/POST /depot/*` |
| **Tax & Numbering** | Manage Company GSTINs | **YES** | `GET/POST /companyGstin/*` |
| | Configure Document Series | **YES** | `GET/POST /docSeries/*` |
| | View Statutory Tax Reports | **YES** | Rule 46 Invoices, GSTR-1, GSTR-3B |
| **Support Interaction** | Request Support Session | **YES** | `POST /support/session/request` |
| | Approve / Deny Operator Access | **YES** | `POST /support/session/approve`, `/reject` |
| | Revoke Active Support Access | **YES** | `POST /support/session/revoke` |

---

## 3. Strict Boundaries: What Tenant Admin CANNOT Access

| Prohibited Domain | Reason for Restriction | Security Enforcement |
| :--- | :--- | :--- |
| **Other Tenants' Data** | Multi-tenant isolation guarantee. | MyBatis-Plus `TenantLineHandler` SQL query rewrite. |
| **Tenant Creation / Quota Adjustment** | Platform licensing & subscription domain. | Super Admin verification in `TenantService`. |
| **Platform Config / System SMTP** | Global infrastructure configuration. | Gated by `isSuperAdmin` check on `/platformConfig/*`. |
| **System Function / Menu Registry** | Shared system dictionary & routing metadata. | Whitelisted table; write operations restricted to Super Admin. |
| **Cross-Tenant Audit Logs** | Privacy & legal separation. | Log queries automatically filtered by current `tenant_id`. |

---

## 4. Architectural Comparison: Our ERP vs. Reference Systems

| Dimension | Our Current ERP | metasfresh | ERPNext / Frappe |
| :--- | :--- | :--- | :--- |
| **Tenant Administrator Concept** | `Tenant Admin` (`tenant_id > 0`, role = Tenant Manager). | `Client Administrator` (`AD_Client Admin` role in `AD_Client_ID > 0`). | `System Manager` role within a specific site / company. |
| **Company / Branch Setup** | Hierarchical `jsh_organization` tree + `jsh_depot`. | `AD_Org` tree under `AD_Client` with Org-level Warehouses (`M_Warehouse`). | Multi-Company tree under single site with Cost Centers & Warehouses. |
| **User Role Assignment** | Pivot `jsh_user_business` with JSON role IDs / Membership. | Direct `AD_User_Roles` entity linking User to Role. | `Has Role` table linking User to Role Profile. |
| **Support Management** | In-app Customer Consent model (`/support/session/*`). | Direct administrative role in client; no formal customer consent token. | Managed externally via Frappe Cloud support tickets. |

---

## 5. Structured Recommendation

#### 1. What We Have
A functional Tenant Admin workspace capable of managing tenant-scoped users, roles, organizational hierarchies, depots, company GSTINs, and participating in audited, consent-based support sessions.

#### 2. What Reference Systems Do
- **metasfresh**: Provides role profiles (`AD_Role`) with inheritance, allowing Tenant Admins to create template roles (e.g. "Sales Manager" inheriting "Sales Clerk" permissions) and assign users to specific organizational nodes.
- **ERPNext**: Implements `Role Profiles` and `Module Profiles`, enabling Tenant Admins to restrict entire functional areas (e.g., hiding Manufacturing completely) for specific departments with a single click.

#### 3. What is Missing
Our ERP's role assignment was historically stored as serialized JSON strings in `jsh_user_business` (`value = "[6,7]"`), which lacked relational referential integrity and made batch role auditing difficult.

#### 4. What Should Change
Consolidate all role and data scope assignments onto the relational entity `erp_user_tenant_membership`, providing direct foreign keys and relational integrity across tenant users and roles.

#### 5. Why
Eliminates brittle JSON string parsing in permission resolution, prevents orphan role references, and simplifies cross-branch access governance.

#### 6. How It Should Work
1. When a Tenant Admin assigns a role to a user, the backend inserts or updates `erp_user_tenant_membership`.
2. `SecurityService` queries active memberships directly using standard indexed relational joins.
