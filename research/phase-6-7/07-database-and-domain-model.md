# Phase 6 & 7 Research — Database & Domain Model

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    erp_tenant ||--o{ erp_tenant_subscription : "has subscriptions"
    erp_tenant ||--o{ erp_user_tenant_membership : "has user memberships"
    erp_tenant ||--o{ erp_organization : "owns organizations"
    erp_tenant ||--o{ erp_depot : "owns warehouses"
    erp_tenant ||--o{ erp_financial_year : "has fiscal years"
    erp_tenant ||--o{ erp_document_number_series : "has number series"
    erp_tenant ||--o{ erp_account : "has financial accounts"
    erp_tenant ||--o{ erp_in_out_item : "has in/out categories"
    erp_tenant ||--o{ erp_platform_audit_log : "tracked in audit logs"

    erp_tenant {
        bigint id PK
        bigint tenant_id UK "Distinct Tenant Scope ID"
        varchar login_name UK "Primary Tenant Handle"
        varchar company_name "Legal Company Name"
        bigint admin_user_id "Tenant Admin User ID"
        int user_num_limit "Legacy User Limit"
        varchar type "Plan Type String"
        varchar status "PROVISIONING, ACTIVE, SUSPENDED, EXPIRED, GRACE_PERIOD, SOFT_DELETED"
        tinyint enabled "1=Enabled, 0=Disabled"
        datetime create_time
        datetime expire_time
        varchar remark
        varchar delete_flag "0=Active, 1=Deleted"
    }

    erp_tenant_subscription {
        bigint id PK
        bigint tenant_id FK
        bigint plan_id FK
        varchar plan_code
        varchar status "ACTIVE, TRIAL, GRACE_PERIOD, EXPIRED, SUSPENDED, REPLACED"
        tinyint is_active "1=Active, 0=Historical"
        bigint active_tenant_id UK "Virtual Generated Column"
        int override_user_limit
        int override_depot_limit
        int override_org_limit
        text override_features
        datetime start_date
        datetime end_date
        datetime grace_period_end
    }

    erp_user_tenant_membership {
        bigint id PK
        bigint user_id FK
        bigint tenant_id FK
        bigint role_id FK
        varchar data_scope_type "ALL, ORG, DEPOT, SELF"
        tinyint is_default
        varchar status "ACTIVE, INACTIVE, SUSPENDED, REVOKED"
    }

    erp_organization {
        bigint id PK
        bigint tenant_id FK
        varchar org_abr "HQ, BR1, etc."
        varchar org_name "Head Office, Branch, etc."
        int org_type "1=HQ, 2=Branch"
        bigint org_parent_id "-1 for Root"
        tinyint enabled
    }

    erp_depot {
        bigint id PK
        bigint tenant_id FK
        varchar name "General Warehouse"
        int type "0=Standard"
        tinyint is_default "1=Default Primary Warehouse"
        tinyint enabled
        varchar delete_flag
    }
```

---

## 2. Proposed Database Schema DDL Changes

```sql
-- 1. Add status, company_name, admin_user_id columns to erp_tenant
ALTER TABLE `erp_tenant` 
    ADD COLUMN IF NOT EXISTS `company_name` VARCHAR(128) NULL COMMENT 'Legal Enterprise / Company Name' AFTER `login_name`,
    ADD COLUMN IF NOT EXISTS `admin_user_id` BIGINT(20) NULL COMMENT 'Primary Administrator User ID' AFTER `company_name`,
    ADD COLUMN IF NOT EXISTS `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT 'Lifecycle State: PROVISIONING, ACTIVE, SUSPENDED, EXPIRED, GRACE_PERIOD, SOFT_DELETED' AFTER `type`;

-- 2. Add index for fast status queries
ALTER TABLE `erp_tenant` 
    ADD INDEX IF NOT EXISTS `idx_tenant_status` (`status`, `delete_flag`);
```

---

## 3. Java Data Transfer Objects (DTOs)

### 1. `TenantProvisioningDto.java`
```java
public class TenantProvisioningDto {
    private String loginName;          // Required: e.g. "acme_corp"
    private String companyName;        // Required: e.g. "Acme Technologies Pvt Ltd"
    private String adminFullName;      // Optional: e.g. "John Doe"
    private String adminEmail;         // Optional: e.g. "admin@acme.com"
    private String adminPhone;         // Optional: e.g. "9876543210"
    private String password;           // Optional: default "123456"
    private Long planId;               // Required: Subscription Plan ID
    private Integer durationDays;      // Optional: default 30 (Trial) or 365 (Annual)
    private String initialDepotName;   // Optional: default "General Warehouse"
    private String initialOrgName;     // Optional: default "Head Office"
    private String remark;             // Optional description
}
```

### 2. `TenantProvisioningResultDto.java`
```java
public class TenantProvisioningResultDto {
    private Long tenantId;
    private Long adminUserId;
    private String loginName;
    private String companyName;
    private String planCode;
    private String status;
    private Long rootOrgId;
    private Long defaultDepotId;
    private Long activeFinancialYearId;
    private Integer documentSeriesCount;
    private List<Long> defaultAccountIds;
    private Date expireTime;
    private String message;
}
```

### 3. `TenantLifecycleActionDto.java`
```java
public class TenantLifecycleActionDto {
    private Long tenantId;
    private String action;             // "SUSPEND", "REACTIVATE", "RENEW", "DELETE"
    private String reason;             // Required: Justification for audit log
    private Integer extendDays;        // Optional for RENEW action
    private Long newPlanId;            // Optional for plan change during renewal
}
```
