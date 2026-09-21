# Current Multi-Tenancy Architecture Deep-Dive

## Executive Summary
This document provides a comprehensive, ground-truth architectural analysis of the multi-tenancy model currently implemented in our ERP codebase (`ERPSystem-boot` backend and `ERPSystem-web-react` frontend). It details the entity relationships, tenant lifecycle management, organizational hierarchy, and database isolation mechanisms, with reference comparisons against **metasfresh** and **ERPNext**.

---

## 1. Core Multi-Tenant Representation & Entities

### 1.1 Tenant Representation (`jsh_tenant`)
In the existing codebase, a tenant represents an isolated subscriber or customer organization partition within the shared system.

* **Database Table**: `jsh_tenant`
* **Java Entity**: [`com.jsh.erp.datasource.entities.Tenant.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Tenant.java)
* **Fields & Attributes**:
  * `id` (`Long`, Primary Key): Internal table surrogate key.
  * `tenantId` (`Long`, Unique Identifier): Logical identifier assigned to all data partitioned for this tenant (frequently set to equal the initial tenant admin user ID upon creation).
  * `loginName` (`String`): Unique handle/slug for the tenant account.
  * `userNumLimit` (`Integer`): User quota cap for licensing enforcement.
  * `type` (`String` / `Integer`): Tenant tier / subscription type (e.g., standard, trial, enterprise).
  * `enabled` (`Boolean`): Active/Inactive toggle.
  * `createTime` (`Date`): Timestamp of creation.
  * `expireTime` (`Date`): Subscription expiration boundary.
  * `remark` (`String`): Administrative annotations.
  * `deleteFlag` (`String`): Soft deletion flag (`0` = active, `1` = deleted).

### 1.2 User Representation (`jsh_user`)
* **Database Table**: `jsh_user`
* **Java Entity**: [`com.jsh.erp.datasource.entities.User.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/User.java)
* **Multi-Tenant Fields**:
  * `tenantId` (`Long`): The tenant this user is bound to. If `tenantId == null` or `tenantId == 0`, the user is treated as a platform-level user.
  * `isystem` (`Byte`): Distinguishes system-managed users (`1`) from standard users (`0`).
  * `leaderFlag` (`String`): Marks department leaders or organization administrators (`1` = leader, `0` = standard).
  * `status` (`Byte`): User account status (`0` = normal, `1` = blacklisted/disabled, `2` = pending).
  * `deleteFlag` (`String`): Soft delete flag.

### 1.3 Extended Membership Model (`erp_user_tenant_membership`)
* **Database Table**: `erp_user_tenant_membership`
* **Java Entity**: [`com.jsh.erp.datasource.entities.UserTenantMembership.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/UserTenantMembership.java)
* **Fields & Attributes**:
  * `id` (`Long`): Primary Key.
  * `userId` (`Long`): Foreign key to `jsh_user`.
  * `tenantId` (`Long`): Foreign key to `jsh_tenant`.
  * `roleId` (`Long`): Associated role within that specific tenant.
  * `isDefault` (`Boolean`): Default active tenant for multi-tenant accounts.
  * `status` (`String`): `ACTIVE` or `INACTIVE`.
  * `dataScopeType` (`String`): `ALL`, `ORG`, `BRANCH`, `DEPOT`, `SELF`, `NONE`.
  * `dataScopeValues` (`String`): Comma-separated scope IDs.

---

## 2. Current Organizational Hierarchy

The codebase defines several hierarchical structures that map physical and logical business units:

```text
┌─────────────────────────────────────────────────────────────┐
│                      PLATFORM / SYSTEM                      │
│                  (tenant_id IS NULL or 0)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOMER TENANT                        │
│                 (jsh_tenant: tenant_id)                     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    ORGANIZATION / BRANCH    │ │       DEPOT / WAREHOUSE     │
│      (jsh_organization)     │ │         (jsh_depot)         │
│   • org_no, org_abbr        │ │   • depot_name, location    │
│   • parent_id (Tree hierarchy)│ │   • type, is_default        │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│     DEPARTMENT / TEAM       │ │     INVENTORY / BINS        │
│   • OrgaUserRel (user-dept) │ │   • MaterialCurrentStock    │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        TENANT USER                          │
│      (jsh_user linked via UserBusiness & OrgaUserRel)       │
└─────────────────────────────────────────────────────────────┘
```

### Hierarchy Breakdown:
1. **System / Platform**: The top-level administrative scope. Houses Super Admins and Support Operators.
2. **Tenant (`jsh_tenant`)**: Top boundary of legal customer data isolation.
3. **Organization (`jsh_organization`)**: Multi-level hierarchical organizational structure supporting parent-child trees (`parent_id`, `org_no`, `org_abbr`). Used to represent legal entities, regional branches, and operating departments.
4. **Organization-User Mapping (`jsh_orga_user_rel`)**: Maps users to specific organizations/departments with display sequences (`user_blng_orga_dspl_seq`).
5. **Depot / Warehouse (`jsh_depot`)**: Represents physical or logical storage locations partitioned by `tenant_id`. User access to depots is granted via `jsh_user_business` with `type = 'UserDepot'`.

---

## 3. Current Multi-Tenancy Isolation Model (Model A)

Our ERP implements **Model A: Shared Database, Shared Schema, Table-Level Discriminator (`tenant_id`)**.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           Single MySQL Database                           │
│                                                                           │
│   ┌───────────────────────────┐           ┌───────────────────────────┐   │
│   │   jsh_depot_head          │           │   jsh_material            │   │
│   ├────┬───────────┬──────────┤           ├────┬───────────┬──────────┤   │
│   │ id │ tenant_id │ number   │           │ id │ tenant_id │ name     │   │
│   ├────┼───────────┼──────────┤           ├────┼───────────┼──────────┤   │
│   │ 1  │ 149       │ PO-001   │           │ 10 │ 149       │ Widget A │   │
│   │ 2  │ 150       │ PO-999   │           │ 11 │ 150       │ Bolt X   │   │
│   └────┴───────────┴──────────┘           └────┴───────────┴──────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Enforcement Mechanism: MyBatis-Plus `TenantLineInnerInterceptor`
Tenant isolation is enforced in the persistence tier using MyBatis-Plus's AST rewriting interceptor configured in [`TenantConfig.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/config/TenantConfig.java):

```java
TenantLineInnerInterceptor tenantInterceptor = new TenantLineInnerInterceptor(new TenantLineHandler() {
    @Override
    public Expression getTenantId() {
        HttpServletRequest request = ...;
        Long tenantId = SecurityService.getCurrentTenantId(); // Derived from token session
        return new LongValue(tenantId);
    }

    @Override
    public String getTenantIdColumn() {
        return "tenant_id";
    }

    @Override
    public boolean ignoreTable(String tableName) {
        return isIgnored(tableName); // System/dictionary/statutory whitelisted tables
    }
});
```

### 3.2 Whitelisted (Ignored) Tables
System-wide tables that do not belong to a single tenant or are shared reference data bypass the automatic `WHERE tenant_id = ?` injection:
* Platform tables: `jsh_platform_config`, `jsh_function`, `jsh_system_config`
* Statutory & Reference tables: `erp_state_code`, `erp_hsn_sac`, `erp_tax_rate`, `erp_rcm_rule`, `erp_pos_rule`, `erp_gst_threshold_config`
* Cross-tenant coordination tables: `jsh_tenant`, `erp_support_session`, `erp_support_attendance`

---

## 4. Strengths, Risks & Scaling Evaluation of Model A

| Dimension | Evaluation in Current ERP |
| :--- | :--- |
| **Operational Simplicity** | **High**: Single schema to migrate, single database connection pool, low DevOps overhead. |
| **Cost Efficiency** | **High**: Hundreds of small tenants can share low-tier database compute and memory resources. |
| **Data Leakage Risk** | **Moderate**: Highly reliant on strict MyBatis-Plus AST rewriting and avoiding raw un-parameterized native SQL. If a custom mapper query uses `@Select("SELECT * FROM jsh_depot_head WHERE id = #{id}")` without XML integration or interceptor bypass, cross-tenant reads can occur. |
| **Backup & Restore** | **Complex**: Restoring an individual tenant requires extracting rows via `mysqldump --where="tenant_id = X"` rather than database-level snapshot restore. |
| **Tenant Deletion & Purging** | **Requires Cascading Soft-Delete**: Purging tenant data requires coordinated deletion across 40+ tables matching `tenant_id`. |
| **Noisy Neighbor Problem** | **High**: A single tenant executing a heavy analytical report can consume shared database buffer pool and CPU. |

---

## 5. Architectural Comparison: Our ERP vs. Reference Systems

| Dimension | Our Current ERP | metasfresh | ERPNext / Frappe |
| :--- | :--- | :--- | :--- |
| **Tenancy Model** | Shared DB, Shared Schema with `tenant_id` column. | Multi-tier: System (`AD_Client_ID=0`), Client (`AD_Client`), Org (`AD_Org`) in shared PostgreSQL schema. | Multi-Tenant Model C (separate database per tenant site in bench) or Single DB with `Company` filter. |
| **Tenant Isolation Enforcement** | MyBatis-Plus SQL parser interceptor (`TenantLineHandler`). | Application-level `Env.getAD_Client_ID()` + row-level security / context filters. | Database separation per site (MariaDB database per site name) or Document Permissions (`DocPerm` with `company` field). |
| **Tenant Hierarchy** | Platform $\rightarrow$ Tenant $\rightarrow$ Organization $\rightarrow$ User. | System $\rightarrow$ Client $\rightarrow$ Organization $\rightarrow$ User/Role. | Bench $\rightarrow$ Site $\rightarrow$ Company $\rightarrow$ Department $\rightarrow$ User. |
| **Cross-Tenant Access** | Gated by `erp_support_session` token mechanism. | Role-based: User can have access to multiple `AD_Client` / `AD_Org` records via `AD_User_OrgAccess`. | User can be granted permissions across multiple Companies via `User Permission`. |
| **Master Data Sharing** | Static global tables (HSN, State Codes) via `tenant_id=0` or ignored tables. | Shared Master Data via `AD_Client_ID=0` (System Client) with local overrides. | Shared Bench apps/doctypes; master data copied or isolated per site database. |
