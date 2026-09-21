# Current Platform Configuration & Super Admin Architecture

## 1. Executive Summary
This document analyzes the current state of Platform Configuration, Super Admin infrastructure, Tenant Administration, and Global Settings within the ERP.

---

## 2. Existing Platform Architecture

### 2.1 Backend Platform Components
1. **`PlatformConfigService.java` & `PlatformConfigController.java`**:
   - Manages global key-value configuration items stored in the `erp_platform_config` / `jsh_platform_config` table.
   - Evaluates caller status via `SecurityService.isSuperAdmin()`.
   - Keys supported:
     - `aliOss_endpoint`, `aliOss_accessKeyId`, `aliOss_accessKeySecret`, `aliOss_bucketName`, `aliOss_linkUrl` (Cloud Storage)
     - `email_smtp_host`, `email_smtp_port`, `email_from`, `email_password` (Platform SMTP / Alert Dispatch)
     - `platform_title`, `platform_logo`, `platform_favicon`, `platform_footer` (Whitelabel Platform Branding)
2. **`TenantService.java` & `TenantController.java`**:
   - Manages the tenant catalog in `erp_tenant` (`tenant_id`, `login_name`, `user_num_limit`, `type`, `enabled`, `create_time`, `expire_time`, `remark`).
   - Supports tenant listing, tenant quota update (`user_num_limit`), tenant enable/disable switch, and tenant creation.
3. **`SysDictTypeService.java` & `SysDictDataService.java`**:
   - Global reference dictionaries shared across all tenants (`erp_sys_dict_type`, `erp_sys_dict_data`).
4. **`PluginService.java` & `PluginController.java`**:
   - Global plugin upload, activation, and management.

---

## 3. Existing Database Tables

```sql
-- Platform Global Key-Value Config
CREATE TABLE `erp_platform_config` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `platform_key` varchar(100) DEFAULT NULL COMMENT 'Configuration Key',
  `platform_value` text COMMENT 'Configuration Value (Encrypted or Plaintext)',
  `platform_desc` varchar(200) DEFAULT NULL COMMENT 'Description',
  `create_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tenant Directory
CREATE TABLE `erp_tenant` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) DEFAULT NULL COMMENT 'Canonical Tenant ID',
  `login_name` varchar(50) DEFAULT NULL COMMENT 'Root Administrator Login Name',
  `user_num_limit` int(11) DEFAULT '10' COMMENT 'Maximum Allowed Active Users',
  `type` varchar(20) DEFAULT 'free' COMMENT 'Plan Tier (free, try, pay)',
  `enabled` bit(1) DEFAULT b'1' COMMENT 'Tenant Status (1: Active, 0: Suspended)',
  `create_time` datetime DEFAULT NULL,
  `expire_time` datetime DEFAULT NULL COMMENT 'Subscription Expiry Date',
  `remark` varchar(500) DEFAULT NULL,
  `delete_flag` varchar(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 4. Existing Platform APIs

| Endpoint | Method | Security Scope | Purpose |
| :--- | :---: | :---: | :--- |
| `/platformConfig/list` | `GET` | Platform Super Admin | Retrieve global system properties |
| `/platformConfig/add` | `POST` | Platform Super Admin | Add platform property |
| `/platformConfig/update` | `POST` | Platform Super Admin | Update platform property |
| `/tenant/list` | `GET` | Platform Super Admin | List all tenant instances with user counts |
| `/tenant/add` | `POST` | Platform Super Admin | Provision new tenant |
| `/tenant/update` | `POST` | Platform Super Admin | Update tenant metadata and user limit |
| `/tenant/batchSetStatus` | `POST` | Platform Super Admin | Suspend / Reactivate tenant |

---

## 5. Existing Frontend Pages

1. **`PlatformDashboardPage.tsx` (`/platform/dashboard`)**:
   - Displays aggregate tenant metrics: Total Tenants, Active Tenants, Suspended Tenants, Active Support Sessions.
   - Quick tenant provisioning modal (`tenant_id`, `login_name`, `password`, `user_num_limit`, `type`).
2. **`TenantList.tsx` (`/system/tenant`)**:
   - Tabular directory of all customer tenants with status switches, user limit editing, and expiration date management.
3. **`SystemConfigList.tsx` (`/system/platform_config`)**:
   - Interface for editing global email settings, cloud storage keys, and system preferences.

---

## 6. Current Strengths & Identified Limitations

### Strengths:
- Clear separation between Tenant Administration and regular tenant user management.
- Backend RBAC in `SecurityService.java` enforces that regular tenant users cannot access `/platformConfig/*` or `/tenant/*`.

### Limitations:
- **No Structured Subscription Plan Entity**: Plan tiers (`free`, `try`, `pay`) are stored as arbitrary strings on `erp_tenant` with hardcoded behavior.
- **Single-Dimension Quota**: Only `user_num_limit` exists. Warehouse/depot quotas, branch/organization quotas, and monthly transaction limits are not tracked.
- **No Module Feature Flags**: Tenants cannot be provisioned with modular subscriptions (e.g. Sales-Only vs Full ERP vs GST E-Invoicing).
