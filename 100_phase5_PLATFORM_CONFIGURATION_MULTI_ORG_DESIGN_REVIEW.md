# PHASE 5 — PLATFORM CONFIGURATION & MULTI-ORGANIZATION
## Pre-Implementation Architecture & Safety Design Gate Review

**Document ID**: `100_phase5_PLATFORM_CONFIGURATION_MULTI_ORG_DESIGN_REVIEW`  
**Phase**: Phase 5 — Platform Configuration & Multi-Organization Architecture  
**Reviewing Authority**: Enterprise Architecture & Safety Gate Review Board  
**Baseline Certified Phase**: Phase 4C.4, Track A.1, Track A.2, Track A.3 (Certified & Frozen)  
**Date**: September 16, 2026  
**Status**: DESIGN GATE COMPLETE — FINAL ARCHITECTURAL SPECIFICATION  

---

## FINAL DESIGN VERDICT

```text
================================================================================
PHASE 5 DESIGN VERDICT:
PHASE 5 DESIGN PASS — READY FOR IMPLEMENTATION
================================================================================
```

---

## 1. SCOPE

This document establishes the authoritative architectural blueprint for **Phase 5: Platform Configuration & Multi-Organization Hierarchy**. 

The scope of this design gate covers:
1. **Domain Disambiguation**: Formal separation of the commercial Subscriber (*Tenant*) from the statutory Legal Entity (*Organization*) and operational units (*Branch / Business Unit / Depot*).
2. **Global Platform Configuration**: Multi-tiered configuration architecture spanning Platform, Tenant, Organization, and Branch tiers.
3. **Multi-Organization Administration**: Canonical entity definition, hierarchical relationships, lifecycle state machine, and administrative boundaries.
4. **Financial Boundary & Ownership Model**: Explicit organizational ownership of the Chart of Accounts (COA), Financial Years, Fiscal Periods, General Ledger, Subledgers, Tax Registrations, and Functional Currencies.
5. **Security & Data Isolation**: Dual-boundary isolation model (`tenant_id` outer physical barrier + `organization_id` inner legal entity barrier), server-authoritative switching, and role-based data scoping.
6. **Cross-Organization Consolidation Boundary**: Read-only consolidation reporting mechanics, inter-company transaction handling, and elimination journal architecture without ledger pollution.
7. **Auditability, Concurrency & Threat Modeling**: Forensic logging, race condition prevention, and fail-closed threat defense.
8. **Backward Compatibility & Non-Destructive Migration**: Seamless transition preserving all certified single-tenant financial data (Phase 4C.4, Track A.1, Track A.2, Track A.3).

---

## 2. CURRENT TENANT ARCHITECTURE

### 2.1 Baseline State Analysis
An empirical audit of the existing codebase reveals the following baseline architectural characteristics:
- **Tenant Perimeter (`tenant_id`)**: `tenant_id` currently serves as the universal partitioning key across all database tables (`erp_tenant`, `erp_user`, `erp_financial_year`, `erp_fiscal_period`, `erp_gl_entry`, `erp_account_coa`, `erp_depot_head`, `erp_depot`, `erp_system_config`, `erp_fy_reopen_request`).
- **Context Management (`TenantContext` & `SecurityContext`)**:
  - `TenantContext` maintains thread-local values for `tenantId`, `userId`, `roleId`, `isPlatformAdmin`, and `dataScope`.
  - `TenantMembershipService` manages multi-tenant user memberships via `erp_user_tenant_membership` and enforces server-authoritative tenant switching.
- **Legacy Departmental Entity (`erp_organization`)**:
  - The existing `erp_organization` table (`id`, `org_no`, `org_abr`, `parent_id`, `sort`, `remark`, `tenant_id`, `delete_flag`) functions historically as an internal **Department / Division tree** within a single company (e.g. Sales Dept, Warehouse Dept, Purchasing Dept).
  - It does **not** model multi-company statutory entities with separate tax registrations (GSTIN), distinct financial years, or independent general ledgers.
- **Single-Tenant Configuration (`erp_system_config`)**:
  - Stores single-company details (`company_name`, `company_address`, `depot_flag`, `customer_flag`, `financial_state_machine_enabled`) directly keyed by `tenant_id`.
  - A single tenant currently possesses only one system configuration record.
- **Financial Single-Tenant Lock**:
  - `erp_financial_year` and `erp_fiscal_period` are bound solely to `tenant_id`.
  - All general ledger entries (`erp_gl_entry`) for a tenant share a single series of financial years and monthly periods.

---

## 3. TENANT / ORGANIZATION DOMAIN MODEL

### 3.1 First Principle: Tenant Is NOT Automatically An Organization
In a modern enterprise SaaS ERP, assuming `Tenant == Organization` is a fatal architectural conflation. Phase 5 explicitly establishes the domain hierarchy:

```text
                     LEVEL 0: PLATFORM
              (jshERP Cloud SaaS Infrastructure)
                            │
                            ▼
                     LEVEL 1: TENANT
             (Commercial Subscriber / Account)
             e.g., "Tata Group" or "Acme Holdings"
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     LEVEL 2: ORGANIZATION       LEVEL 2: ORGANIZATION
     (Statutory Legal Entity)    (Statutory Legal Entity)
     e.g., "Acme Mfg Ltd"        e.g., "Acme Logistics Pvt Ltd"
     [CIN, GSTIN, GL, FY]        [CIN, GSTIN, GL, FY]
              │                           │
       ┌──────┴──────┐                    ▼
       ▼             ▼            LEVEL 3: BRANCH
LEVEL 3: BRANCH LEVEL 3: BRANCH   (State Hub / Depot)
(Mumbai HQ)     (Bengaluru Plant)
       │             │
       ▼             ▼
LEVEL 4: DEPOT  LEVEL 4: DEPOT
(Raw Mat Store) (FG Warehouse)
```

### 3.2 Tier Definitions & Cardinality

| Level | Domain Concept | Cardinality | Authoritative Definition |
| :---: | :--- | :---: | :--- |
| **0** | **Platform** | Single Global | The root SaaS system infrastructure managed by SuperAdmins. Governs subscription plan catalogs, tenant provisioning, system maintenance, and platform audit logs. |
| **1** | **Tenant** | 1 : Many (under Platform) | The contractual subscriber/licensee. Defines the **outer physical data isolation boundary**, tenant subscription tier, resource quotas, and billing identity. |
| **2** | **Organization** | 1 : Many (under Tenant) | An independent **statutory legal entity** (Company, LLP, Corporation, Trust). Holds corporate registration (CIN), tax registrations (GSTIN/PAN), functional currency, and sovereign financial books of account. |
| **3** | **Branch / Division** | 1 : Many (under Org) | An operating unit, regional sales office, manufacturing plant, or state-wise tax branch. Operates within the parent Organization's General Ledger. |
| **4** | **Depot / Warehouse** | 1 : Many (under Branch) | A physical storage location for inventory tracking, goods receipts, and material issues. |

### 3.3 Domain Model Relationships
1. A **Tenant** owns 1 to $N$ **Organizations**.
2. A single-company SME tenant has exactly **1 Organization** (`is_default = 1`), preserving seamless 100% backward compatibility.
3. An enterprise group tenant contains **multiple Organizations** representing corporate subsidiaries or affiliates.
4. Each **Organization** is legally sovereign: its General Ledger, Trial Balance, and Tax Returns are segregated.

---

## 4. OWNERSHIP MODEL

### 4.1 Financial & Operational Resource Ownership Matrix

| Resource Dimension | Authoritative Owner | Scope & Governance Rules |
| :--- | :---: | :--- |
| **Subscription Plan & Quotas** | **Tenant** | Quotas (Max Users, Max Orgs, Max Depots) and module entitlements are enforced at the commercial tenant level. |
| **User Identity (`erp_user`)** | **Tenant** | An employee identity is created within a Tenant and assigned to one or more Organizations via membership mappings. |
| **Master Role Definition (`erp_role`)** | **Tenant** | Roles (e.g. `FinancialController`, `CFO`) are defined at the Tenant tier and scoped to specific Organizations upon assignment. |
| **Item / Material Catalog (`erp_material`)**| **Tenant** | Master product SKUs, HSN codes, and barcode definitions are tenant-global to prevent redundant cataloging across subsidiaries. |
| **Chart of Accounts (`erp_account_coa`)** | **Hybrid (Tenant / Org)** | The Master COA template is managed at the Tenant tier; Organizations inherit the chart and may configure entity-specific sub-ledgers. |
| **Financial Year (`erp_financial_year`)** | **Organization** | **Strict Legal Ownership**: Each Organization independently owns its fiscal years, finalization state, and closing lifecycle. |
| **Fiscal Period (`erp_fiscal_period`)** | **Organization** | Monthly periods are locked and closed independently per Organization. |
| **General Ledger (`erp_gl_entry`)** | **Organization** | General Ledger fact rows MUST record both `tenant_id` and `organization_id`. Debit-credit equilibrium is strictly per-Organization. |
| **Tax Registrations (GSTIN / PAN)** | **Organization / Branch** | Organization owns the primary PAN and corporate registration; Branches own state-specific GSTINs. |
| **Currencies & Exchange Rates** | **Tenant / Org** | Tenant defines supported currency tables; each Organization designates its sovereign functional reporting currency (e.g. INR, USD). |
| **Invoices & Bills (`erp_depot_head`)** | **Organization & Branch** | Commercial invoices are legally issued by an Organization through a specific Branch and Depot. |
| **Fixed Assets (`erp_fixed_asset`)** | **Organization** | Fixed assets belong to the legal entity that holds title and depreciates them on its statutory balance sheet. |
| **Reopening Petitions (`erp_fy_reopen_request`)**| **Organization** | Track A.3 supervisory petitions are bound to a specific Organization's finalized fiscal year. |

---

## 5. ORGANIZATION LIFECYCLE

### 5.1 State Machine Specification
Each Organization progresses through a strictly governed lifecycle state machine:

```text
             ┌──────────┐
             │  DRAFT   │
             └────┬─────┘
                  │ (Activate: Validate CIN, GSTIN, Base COA, Opening FY)
                  ▼
             ┌──────────┐
      ┌─────►│  ACTIVE  │◄─────┐
      │      └────┬─────┘      │
      │           │            │
 (Reactivate)     │ (Suspend)  │ (Unsuspend)
      │           ▼            │
      │      ┌───────────┐     │
      └──────┤ SUSPENDED ├─────┘
             └────┬──────┘
                  │ (Archive: After statutory audit cut-off & final close)
                  ▼
             ┌───────────┐
             │ ARCHIVED  │ (Terminal State)
             └───────────┘
```

### 5.2 Lifecycle States & Transition Rules

| Status | Permitted Operations | Forbidden Operations | Entry Preconditions |
| :--- | :--- | :--- | :--- |
| **`DRAFT`** | Configuration, Branch setup, COA mapping, bank account setup. | Transaction posting, Invoicing, GL journal creation. | Initial provisioning by Tenant Admin. |
| **`ACTIVE`** | All operational posting, purchasing, sales, GL adjustments, FY closing. | Deletion of primary statutory details. | Valid Legal Name, Tax ID, functional currency, and active FY initialized. |
| **`SUSPENDED`** | Read-only reports, historical queries, audit trail inspections. | New postings, invoice generation, period modifications, payments. | Authorized by Tenant Admin with mandatory audit reason. |
| **`ARCHIVED`** | Statutory compliance read-only queries (retained for 8-year statutory limit). | Any mutation, reopening, or transaction entry. | All fiscal years finalized; zero open subledger balances. |

### 5.3 Behavior Upon Suspension or Archival
1. **Active Users**: Users assigned solely to a `SUSPENDED` Organization are blocked from initiating write actions; cross-org users have their active context restricted to other active organizations.
2. **Accounting Ledger**: The General Ledger becomes strictly read-only.
3. **Pending Transactions**: In-flight draft documents cannot be submitted or posted until the organization is reactivated.

---

## 6. CONFIGURATION HIERARCHY

### 6.1 Multi-Tiered Configuration Resolution Engine
Configuration settings resolve top-down with strict override semantics:

```text
+-------------------------------------------------------------------------+
| LEVEL 0: PLATFORM CONFIGURATION (erp_platform_config)                   |
| Global system endpoints, SMTP gateway, Cloud storage, Plan definitions. |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| LEVEL 1: TENANT CONFIGURATION (erp_system_config)                       |
| Multi-Org enabled flag, User quota caps, Global security policies.      |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| LEVEL 2: ORGANIZATION CONFIGURATION (erp_organization_config)           |
| Legal Name, CIN, PAN, Base Currency, FY template, Accounting method.    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| LEVEL 3: BRANCH CONFIGURATION (erp_branch_config)                       |
| State GSTIN, Local invoice prefixes, Physical address, Default depot.   |
+-------------------------------------------------------------------------+
```

### 6.2 Tier Boundary Protection
- **No Upward Mutation**: An Organization Administrator updating local invoice prefixes or state tax configurations cannot mutate Tenant-global or Platform-level settings.
- **Inheritance Fallback**: When an Organization-level setting is null, the system safely falls back to the Tenant default.

---

## 7. USER / ROLE SCOPE

### 7.1 Multi-Organization User Membership Architecture
Users belong to the Tenant and are mapped to Organizations via `erp_user_organization_membership`:

```sql
CREATE TABLE IF NOT EXISTS `erp_user_organization_membership` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL COMMENT 'Outer Physical Tenant Boundary',
  `user_id` BIGINT NOT NULL COMMENT 'User ID from erp_user',
  `organization_id` BIGINT NOT NULL COMMENT 'Assigned Legal Entity',
  `role_id` BIGINT NOT NULL COMMENT 'Role within this Organization',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Default active org on login',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, SUSPENDED',
  `data_scope_type` VARCHAR(20) NOT NULL DEFAULT 'ALL' COMMENT 'ALL, BRANCH, DEPOT, SELF',
  `data_scope_values` VARCHAR(500) DEFAULT '' COMMENT 'Comma-separated Branch/Depot IDs',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  UNIQUE KEY `uk_user_org_active` (`tenant_id`, `user_id`, `organization_id`, `delete_flag`),
  INDEX `idx_user_tenant` (`tenant_id`, `user_id`, `status`),
  INDEX `idx_org_tenant` (`tenant_id`, `organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User Organization Assignment & Scoped Roles';
```

### 7.2 Role Scope Interaction
- **Platform Admin (Tenant 0)**: Unrestricted platform-wide maintenance.
- **Tenant Admin**: Administrative management of all Organizations under their Tenant.
- **Organization Admin**: Operational and administrative authority confined to their assigned Organization.
- **Financial Controller / Chief Financial Officer**:
  - Can be assigned **Tenant-wide** (governing consolidation and cross-org financial oversight), OR
  - Assigned to **Specific Organizations** (e.g. User A is Controller for Org 101, User B is Controller for Org 102).
- **Normal Operator (Sales / Inventory)**: Scoped to specific Branches or Depots within an Organization.

---

## 8. AUTHORIZATION MATRIX

| Capability | Platform Admin | Tenant Admin | Org Admin | Financial Controller | Chief Financial Officer | Normal User |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Create Tenant** | **YES** | NO | NO | NO | NO | NO |
| **Manage Subscription Plans** | **YES** | NO | NO | NO | NO | NO |
| **Create Organization** | NO | **YES** | NO | NO | NO | NO |
| **Edit Organization Legal Profile**| NO | **YES** | **YES** (Own) | NO | NO | NO |
| **Suspend / Archive Organization**| NO | **YES** | NO | NO | NO | NO |
| **Configure Org Accounting / COA**| NO | **YES** | **YES** | **YES** (Own) | **YES** (Own) | NO |
| **Post Operational Transactions** | NO | NO | **YES** (Own) | **YES** (Own) | NO | **YES** (Scoped) |
| **Perform Month-End Period Lock** | NO | NO | NO | **YES** (Own) | **YES** (Own) | NO |
| **Execute Year-End Close (4C.4)** | NO | NO | NO | **YES** (Own) | **YES** (Own) | NO |
| **Submit Reopen Petition (A.3 K1)**| NO | NO | NO | **YES** (Own) | NO | NO |
| **Approve Reopen Petition (A.3 K2)**| NO | NO | NO | NO | **YES** (Own) | NO |
| **View Organization Reports** | NO | **YES** | **YES** (Own) | **YES** (Own) | **YES** (Own) | Scoped |
| **Run Consolidated Reports** | NO | **YES** | NO | Multi-Org Only | **YES** (Tenant) | NO |

---

## 9. DATA-ISOLATION MODEL

### 9.1 The Compound Query Invariant
To ensure mathematical security and prevent horizontal privilege escalation, every data query and mutation in Phase 5 must strictly enforce the **Dual-Boundary Compound Predicate**:

```sql
WHERE tenant_id = :trustedTenantId 
  AND organization_id = :authorizedOrgId
```

### 9.2 Non-Negotiable Isolation Rules
1. **Zero Raw `organization_id` Lookups**: Querying by `organization_id` alone without binding `tenant_id` is an architectural violation.
2. **Server-Side Trusted Resolution**: `:trustedTenantId` and `:authorizedOrgId` are derived strictly from the validated server-side security session (`TenantContext`), **never** from client-supplied HTTP request parameters.
3. **Pessimistic Cross-Tenant Defense**: If a user requests Org ID 205, the query verifies:
   ```sql
   SELECT id FROM erp_organization 
   WHERE id = 205 AND tenant_id = :sessionTenantId AND status = 'ACTIVE'
   ```
   If Org 205 belongs to Tenant B while the session is Tenant A, the lookup returns `null` and fails closed with an access-denied exception.

---

## 10. FINANCIAL-YEAR BOUNDARY

### 10.1 Authoritative Ownership: Organization
Financial Years and Monthly Fiscal Periods must be **Organization-Owned**.

### 10.2 Architectural Proof
1. **Closing Independence**: Legal Entity A and Legal Entity B close their annual books at different operational tempos. Sharing an FY record would link their closing gates.
2. **Reopening Isolation**: Under Track A.3, supervisory reopening operates on an approved petition for a specific FY. Reopening Entity A's FY 2024-2025 must NEVER unlock or affect Entity B's finalized FY 2024-2025.
3. **Database Schema Realization**:
   - `erp_financial_year` adds `organization_id BIGINT NOT NULL`.
   - `erp_fiscal_period` adds `organization_id BIGINT NOT NULL`.
   - Unique constraints:
     - `uk_fy_org_code (tenant_id, organization_id, code, delete_flag)`
     - `uk_period_org_name (tenant_id, organization_id, period_name, delete_flag)`

---

## 11. GLOBAL VS ORGANIZATION CHART OF ACCOUNTS

### 11.1 Centralized Template with Entity Partitioning
To combine reporting standardization with operational flexibility:
1. **Tenant Master COA Template**:
   - Standard chart accounts seeded at the Tenant tier (`organization_id = NULL` or `0`).
   - Defines Schedule III statutory codes (`1000 Assets`, `2000 Liabilities`, `3000 Income`, `4000 Expenses`, `2120 Retained Earnings`).
2. **Organization-Specific Leaf Ledgers**:
   - Organizations inherit the Tenant Master COA.
   - Specific bank accounts (e.g. "HDFC Current A/c - Acme Mfg") or vendor accounts are bound to the specific `organization_id`.
3. **GL Tagging**:
   - Every row in `erp_gl_entry` records `account_id`, `account_code`, `tenant_id`, and `organization_id`.
   - Account code semantics (`root_type`, `account_type`, Schedule III classification) remain 100% consistent across all organizations.

---

## 12. REPORTING SCOPE

### 12.1 Report Scoping Rules

| Report Type | Entity-Level Scope | Consolidated Scope |
| :--- | :--- | :--- |
| **Trial Balance** | Strict `organization_id = X`. Sum Dr == Sum Cr. | Sum of all selected Orgs. In-equilibrium prior to elimination. |
| **Profit & Loss** | Operating revenue/expense for Org X. Phase 4C.4 voucher exclusions active. | Aggregated P&L minus inter-company revenues/expenses. |
| **Balance Sheet** | Assets, Liabilities, and Equity of Org X. | Consolidated Assets/Liabilities minus inter-company debts/equities. |
| **Cash Flow Statement**| Operating, investing, and financing cash flows for Org X (Schedule III / AS 3). | Aggregated group cash flows minus inter-company cash transfers. |
| **GL Audit Trail** | Monotonic sequence for Org X. | Separate audit trail per Organization; no interleaved sequences. |

---

## 13. CONSOLIDATION ARCHITECTURE

### 13.1 Non-Polluting Read-Only Consolidation
Consolidated reporting must never mutate, pollute, or merge underlying organization general ledgers:

```mermaid
flowchart TD
    subgraph Organization 101 ["Organization 101 (Acme Mfg)"]
        GL101[("erp_gl_entry (Org 101)")]
        TB101["Trial Balance 101"]
    end

    subgraph Organization 102 ["Organization 102 (Acme Logistics)"]
        GL102[("erp_gl_entry (Org 102)")]
        TB102["Trial Balance 102"]
    end

    subgraph Consolidation Engine ["Consolidation Engine (Read-Only)"]
        Agg["Aggregated Trial Balance\n(TB 101 + TB 102)"]
        ElimRules["Inter-Company Elimination Rules\n(Eliminate IC Debtors vs IC Creditors)"]
        ConsolReport["Consolidated Balance Sheet & P&L"]
    end

    GL101 --> TB101 --> Agg
    GL102 --> TB102 --> Agg
    Agg --> ElimRules --> ConsolReport
```

### 13.2 Consolidation Integrity Guarantees
1. **Read-Only Projection**: Consolidation queries read from underlying GL tables without writing temporary closing rows to `erp_gl_entry`.
2. **Inter-Company Elimination**:
   - Partner accounts tagged with `inter_company_org_id`.
   - Matching balances (Receivable in Org A vs Payable in Org B) are netted out in the consolidated projection.
3. **Currency Conversion**: Non-functional currencies are translated at historical, average, or closing rates per Ind AS 21 / AS 11.
4. **Independent Auditability**: Consolidated reports display an itemized reconciliation bridge showing individual balances, eliminations, and final consolidated figures.

---

## 14. API BOUNDARY

### 14.1 REST API Specification
All endpoints reside under `/platform` and `/organization`:

```text
POST   /platform/organizations/create       - Create new Organization under active Tenant
GET    /platform/organizations/list         - List all Organizations for active Tenant
GET    /platform/organizations/{id}         - Retrieve Organization profile & status
PUT    /platform/organizations/{id}         - Update Organization metadata (CIN, Name)
POST   /platform/organizations/{id}/suspend - Suspend Organization (Requires Tenant Admin)
POST   /platform/organizations/{id}/activate- Reactivate Suspended Organization
POST   /platform/organizations/switch       - Server-authoritative Organization switch
GET    /platform/organizations/memberships  - List user's authorized Organizations
GET    /financialReports/consolidated/tb    - Generate Consolidated Trial Balance
GET    /financialReports/consolidated/bs    - Generate Consolidated Balance Sheet
GET    /financialReports/consolidated/pl    - Generate Consolidated Profit & Loss
```

### 14.2 Thin Controllers & Thick Services
Controllers must remain strictly non-business wrappers. All authorization checks, tenant boundary validations, quota locks, and cryptographic audits execute inside the service layer (`OrganizationService`, `AuthorizationService`).

---

## 15. AUDIT MODEL

### 15.1 Multi-Tiered Audit Event Catalog

| Event Code | Target Tier | Description | Log Target |
| :--- | :---: | :--- | :--- |
| `ORG_PROVISION` | Tenant / Org | New Organization provisioned under Tenant. | `erp_platform_audit_log` & `erp_document_audit_log` |
| `ORG_STATUS_CHANGE` | Organization | Organization transitioned (`ACTIVE → SUSPENDED`). | `erp_document_audit_log` |
| `ORG_SWITCH` | User / Org | User switched active organization context. | `erp_user_audit_log` |
| `ORG_MEMBERSHIP_GRANT`| User / Org | User assigned role in Organization. | `erp_document_audit_log` |
| `CONSOLIDATION_RUN` | Tenant | Consolidated financial statements generated. | `erp_document_audit_log` |

All audit logs remain strictly immutable, append-only, and tenant-bound.

---

## 16. MIGRATION & BACKWARD COMPATIBILITY

### 16.1 The Non-Destructive Auto-Seed Strategy
Phase 5 introduces multi-organization support without disrupting existing tenants:

```text
[ Existing Tenant (e.g. Tenant 149) ]
                 │
                 ▼ (Phase 5 Non-Destructive Migration)
Creates Default Primary Organization:
  - id: auto-generated
  - tenant_id: 149
  - org_code: 'ORG-MAIN'
  - org_name: SystemConfig.company_name
  - is_default: 1
  - status: 'ACTIVE'
                 │
                 ▼
Backfill Financial & Operational Tables:
  - erp_financial_year: SET organization_id = default_org_id WHERE tenant_id = 149
  - erp_fiscal_period:  SET organization_id = default_org_id WHERE tenant_id = 149
  - erp_gl_entry:       SET organization_id = default_org_id WHERE tenant_id = 149
  - erp_depot_head:     SET organization_id = default_org_id WHERE tenant_id = 149
  - erp_depot:          SET organization_id = default_org_id WHERE tenant_id = 149
  - erp_fy_reopen_req:  SET organization_id = default_org_id WHERE tenant_id = 149
```

### 16.2 Invariant Preservation
- All 440 certified financial tests (Phase 4C.4, Track A.1, Track A.2, Track A.3) run against existing tenants. Because default organizations are auto-seeded and backfilled, every certified test continues to pass with zero regressions.

---

## 17. CONCURRENCY

### 17.1 Concurrency Hazards & Guards

| Race Condition Scenario | Potential Hazard | Protective Mechanism |
| :--- | :--- | :--- |
| **Concurrent Org Creation** | Exceeding subscription quota (`override_org_limit`) | Pessimistic subscription row lock (`SELECT ... FOR UPDATE` in `QuotaEnforcementService`). |
| **Concurrent Org Profile Edit** | Lost update to tax details or CIN | Optimistic locking via `update_time` timestamp or version counter. |
| **Posting During Suspension** | Transaction posted into suspended entity | Pre-insert organization status check inside transaction boundary. |
| **Membership Revocation Race** | User posts after role revoked | Dynamic cache eviction and authoritative database check in `AuthorizationService`. |

---

## 18. SECURITY THREAT MODEL

### 18.1 Threat Matrix & Mitigations

| Threat Vector | Attack Scenario | Architectural Defense |
| :--- | :--- | :--- |
| **Tenant Spoofing** | Attacker modifies `tenantId` parameter in API request. | Fail-closed: `TenantContext` extracts tenant ID from signed server token; client parameters ignored. |
| **Horizontal Org Hijacking** | Tenant A User requests Organization belonging to Tenant B. | Mandatory SQL predicate: `WHERE id = ? AND tenant_id = :sessionTenantId`. Returns 404/403. |
| **Stale Context Abuse** | User operates under revoked organization membership. | Security context re-validates active membership on every write operation. |
| **ID Enumeration** | Brute-forcing organization primary keys. | All queries fail closed if the enumerated ID does not belong to the caller's authorized tenant. |
| **Cross-Org GL Leakage** | Voucher lines from Org A debited into Org B accounts. | Voucher validation asserts that all lines in a journal belong strictly to the same `organization_id`. |

---

## 19. TEST STRATEGY

### 19.1 Authoritative Multi-Organization Test Matrix

```text
================================================================================
PHASE 5 TEST SUITE ARCHITECTURE (Target: 30+ Integration Scenarios)
================================================================================
1. Isolation Tests:
   - TEST-ORG-01: Org A user cannot read Org B documents.
   - TEST-ORG-02: Tenant A cannot access Tenant B organizations.
   - TEST-ORG-03: Forged organization ID in request body fails closed.

2. Financial Boundary Tests:
   - TEST-ORG-04: Org A Trial Balance balances independently (Sum Dr == Sum Cr).
   - TEST-ORG-05: Org B GL entry insertion does not alter Org A account balances.
   - TEST-ORG-06: Finalizing FY in Org A leaves Org B FY in ACTIVE state.
   - TEST-ORG-07: Track A.3 reopening in Org A has zero impact on Org B.

3. Lifecycle & Governance Tests:
   - TEST-ORG-08: Suspended Organization rejects all transaction postings.
   - TEST-ORG-09: Suspended Organization permits read-only historical queries.
   - TEST-ORG-10: Quota enforcement blocks creating Orgs beyond subscription limit.

4. Consolidation Tests:
   - TEST-ORG-11: Consolidated Trial Balance matches sum of individual TBs.
   - TEST-ORG-12: Inter-company receivables and payables eliminate cleanly.
   - TEST-ORG-13: Consolidation does not mutate underlying erp_gl_entry rows.

5. Migration & Regression:
   - TEST-ORG-14: Existing single-tenant data backfills to default organization.
   - TEST-ORG-15: Complete 440-test financial regression suite passes 100%.
================================================================================
```

---

## 20. RISKS & MITIGATION

1. **Risk: Query Performance on Compound Keys**:
   - *Mitigation*: Ensure composite indexes `(tenant_id, organization_id, ...)` are provisioned on high-volume tables (`erp_gl_entry`, `erp_depot_head`).
2. **Risk: Legacy Code Calling Deprecated Tenant-Only Methods**:
   - *Mitigation*: Implement overloaded service methods with backward-compatible defaults mapping to `default_org_id`.

---

## 21. OPEN DECISIONS & RECOMMENDATIONS

1. **Inter-Company Elimination Engine**: Recommended for implementation as a modular extension in Phase 5 Slice 3, keeping basic multi-org isolation as Slice 1 and 2.
2. **Carry-Forward Items from Track A.3**:
   - `F-A3-01` (Controller cancel endpoint parameter standardization): Implement during API refinement.
   - `F-A3-02` (Conditional unique index on active reopen requests): Include in Phase 5 DDL migration.
   - `F-A3-03` (Startup DDL fallback): Disable in production deployment runbooks.

---

```text
================================================================================
PHASE 5 PRE-IMPLEMENTATION DESIGN GATE COMPLETE
Final Verdict: PHASE 5 DESIGN PASS — READY FOR IMPLEMENTATION
Signed: Enterprise Safety Review Board
Date: September 16, 2026
================================================================================
```
