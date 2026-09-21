# Platform Domain & Data Model (Final Refinement)

## 1. Executive Summary
This document delivers the final, hardened database domain model incorporating the **Active Subscription Invariant** (guaranteeing mathematically and transactionally that only one active subscription can exist per tenant), **Strict Quota Transaction Boundaries**, and **Feature Entitlement vs User RBAC Separation**.

---

## 2. Active Subscription Invariant Architecture

To guarantee that two concurrent plan assignments or race conditions can **never** result in two active subscriptions for the same tenant:

### 2.1 Database Unique Key Strategy:
MySQL allows multiple `NULL` values in a unique index, but strictly enforces uniqueness for non-null values. We use a virtual generated column `active_tenant_id`:
```sql
`active_tenant_id` bigint(20) GENERATED ALWAYS AS (IF(`is_active` = 1, `tenant_id`, NULL)) VIRTUAL,
UNIQUE KEY `uk_single_active_subscription` (`active_tenant_id`)
```
- When `is_active = 0` (historical records), `active_tenant_id` is `NULL` $\rightarrow$ Unlimited historical records allowed.
- When `is_active = 1` (active record), `active_tenant_id = tenant_id` $\rightarrow$ MySQL database engine physically blocks insertion or update of a second active row for the same tenant with a duplicate key error!

### 2.2 Transactional Handshake:
1. `TenantSubscriptionService.assignPlanToTenant(tenantId, ...)` executes inside `@Transactional`.
2. Acquires row lock: `SELECT id FROM erp_tenant_subscription WHERE active_tenant_id = #{tenantId} FOR UPDATE`.
3. If active row exists, sets `is_active = 0`, `status = 'REPLACED'`.
4. Inserts new row with `is_active = 1`, `status = 'ACTIVE'`.
5. Database unique constraint `uk_single_active_subscription` guarantees absolute consistency even if concurrent transactions bypass application logic.

---

## 3. Detailed Table Specifications

### 3.1 `erp_subscription_plan` (Plan Catalog Template)
```sql
CREATE TABLE `erp_subscription_plan` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `plan_code` varchar(50) NOT NULL COMMENT 'e.g. TRIAL, STANDARD_PRO, ENTERPRISE, CUSTOM',
  `name` varchar(100) NOT NULL COMMENT 'Human-readable plan name',
  `tier` varchar(30) NOT NULL COMMENT 'TRIAL, PRO, ENTERPRISE, CUSTOM',
  `default_user_limit` int(11) NOT NULL DEFAULT '10' COMMENT 'Default max active users',
  `default_depot_limit` int(11) NOT NULL DEFAULT '3' COMMENT 'Default max active warehouses',
  `default_org_limit` int(11) NOT NULL DEFAULT '3' COMMENT 'Default max active organization branches',
  `enabled_features` text NOT NULL COMMENT 'JSON array of enabled feature tokens (e.g. ["MODULE_SALES","MODULE_PURCHASE"])',
  `is_active` bit(1) NOT NULL DEFAULT b'1' COMMENT '1: Available for assignment, 0: Archived',
  `description` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_code` (`plan_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Subscription Plan Catalog';
```

### 3.2 `erp_tenant_subscription` (Historical & Invariant Active Subscriptions)
```sql
CREATE TABLE `erp_tenant_subscription` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) NOT NULL COMMENT 'Target Tenant ID',
  `plan_id` bigint(20) NOT NULL COMMENT 'Assigned Plan Template ID',
  `plan_code` varchar(50) NOT NULL COMMENT 'Snapshot of Plan Code at assignment',
  `status` varchar(30) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, TRIAL, GRACE_PERIOD, SUSPENDED, EXPIRED, CANCELLED',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1: Current active subscription, 0: Historical record',
  `active_tenant_id` bigint(20) GENERATED ALWAYS AS (IF(`is_active` = 1, `tenant_id`, NULL)) VIRTUAL COMMENT 'Virtual key enforcing invariant',
  `start_date` datetime NOT NULL COMMENT 'Subscription start date',
  `end_date` datetime DEFAULT NULL COMMENT 'Subscription expiry date',
  `grace_period_end` datetime DEFAULT NULL COMMENT 'End of grace period (e.g. +7 days after expiry)',
  `override_user_limit` int(11) DEFAULT NULL COMMENT 'Super Admin overridden user limit (NULL = use plan default)',
  `override_depot_limit` int(11) DEFAULT NULL COMMENT 'Super Admin overridden depot limit (NULL = use plan default)',
  `override_org_limit` int(11) DEFAULT NULL COMMENT 'Super Admin overridden org limit (NULL = use plan default)',
  `override_features` text DEFAULT NULL COMMENT 'JSON array of custom feature overrides',
  `override_reason` varchar(500) DEFAULT NULL COMMENT 'Business justification for quota/feature override',
  `override_by_user_id` bigint(20) DEFAULT NULL COMMENT 'Super Admin User ID who granted override',
  `override_time` datetime DEFAULT NULL COMMENT 'Timestamp when override was applied',
  `change_reason` varchar(500) DEFAULT NULL COMMENT 'Reason for plan change or renewal',
  `changed_by_user_id` bigint(20) DEFAULT NULL COMMENT 'Operator who assigned the plan',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_single_active_subscription` (`active_tenant_id`),
  KEY `idx_tenant_history` (`tenant_id`, `create_time`),
  KEY `idx_plan_id` (`plan_id`),
  KEY `idx_status_expiry` (`status`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tenant Subscription Instances & Full Plan History';
```

### 3.3 `erp_platform_audit_log` (Immutable Platform Governance Audit)
```sql
CREATE TABLE `erp_platform_audit_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `event_type` varchar(50) NOT NULL COMMENT 'TENANT_PROVISION, PLAN_ASSIGN, PLAN_DOWNGRADE, QUOTA_OVERRIDE, FEATURE_OVERRIDE, TENANT_SUSPEND, TENANT_ACTIVATE',
  `correlation_id` varchar(64) DEFAULT NULL COMMENT 'Request Correlation UUID',
  `operator_id` bigint(20) NOT NULL COMMENT 'Super Admin User ID',
  `operator_name` varchar(100) DEFAULT NULL COMMENT 'Super Admin Username/LoginName',
  `target_tenant_id` bigint(20) DEFAULT NULL COMMENT 'Target Customer Tenant ID',
  `action` varchar(100) NOT NULL COMMENT 'Brief action description',
  `reason` varchar(500) DEFAULT NULL COMMENT 'Business justification entered by operator',
  `before_state` text DEFAULT NULL COMMENT 'JSON snapshot of entity state prior to mutation',
  `after_state` text DEFAULT NULL COMMENT 'JSON snapshot of entity state post mutation',
  `client_ip` varchar(50) DEFAULT NULL COMMENT 'Client IP address',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Immutable event timestamp',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_event` (`target_tenant_id`, `event_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Immutable Platform Governance Audit Log';
```
