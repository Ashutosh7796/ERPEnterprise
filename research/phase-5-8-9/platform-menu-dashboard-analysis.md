# Platform Menu, Navigation & Dashboard Analysis

## 1. Executive Summary
This document analyzes the Super Admin menu tree, UI navigation layout, metrics telemetry, and dashboard instrumentation for platform health and tenant oversight.

---

## 2. Super Admin Navigation Architecture

The Super Admin interface is partitioned under the dedicated `/platform/*` and `/system/*` namespaces:

```text
Platform Super Admin Navigation Tree
├── 📊 Platform Dashboard (/platform/dashboard)
│   ├── Active Tenant Health Telemetry
│   ├── Aggregated System Storage & Compute Metrics
│   ├── Expiring Subscriptions & Grace Alerts
│   └── Live Support Session Audit Monitor
├── 🏢 Tenant Management (/system/tenant)
│   ├── Tenant Instance Directory
│   ├── Plan Tier & Billing Assignment
│   ├── Quota Overrides (Users, Depots, Orgs)
│   └── Tenant Suspension / Reactivation Lifecycle
├── 💳 Subscription Plans (/platform/plans) [NEW]
│   ├── Plan Catalog (TRIAL, PRO, ENTERPRISE, CUSTOM)
│   ├── Resource Quota Defaults
│   └── Feature Module Entitlement Packages
├── ⚙️ Global Configuration (/system/platform_config)
│   ├── Cloud Storage Credentials (OSS / S3)
│   ├── Platform SMTP & Email Dispatch
│   └── Whitelabel Branding & Logos
├── 🧩 Plugin Registry (/system/plugin)
│   ├── Jar Upload & OSGi Plugin Container
│   └── Global Integration Hooks
├── 📖 Master Dictionaries (/system/dict)
│   └── Global Reference Dictionaries (SysDictType, SysDictData)
└── 🛡️ Platform Audit Logs (/system/log)
    └── Centralized Security, Provisioning & Support Audit Trail
```

---

## 3. Platform Health & Telemetry Metrics

| Dashboard Widget | Data Source | Calculation Logic | Refresh Interval |
| :--- | :--- | :--- | :---: |
| **Total Registered Tenants** | `erp_tenant` | `COUNT(id) WHERE delete_flag = '0'` | 30s |
| **Active Subscriptions** | `erp_tenant_subscription` | `COUNT(id) WHERE status = 'ACTIVE'` | 30s |
| **Expiring within 7 Days** | `erp_tenant_subscription` | `COUNT(id) WHERE expire_time BETWEEN NOW() AND NOW() + 7 DAYS` | 60s |
| **Suspended Instances** | `erp_tenant` | `COUNT(id) WHERE enabled = 0` | 30s |
| **Live Support Sessions** | `erp_support_session` | `COUNT(id) WHERE status = 'ACTIVE' AND expires_at > NOW()` | Real-time |
| **Total Global Active Users** | `erp_user` | `COUNT(id) WHERE status = 0 AND delete_flag = '0'` | 60s |

---

## 4. UI/UX Interaction Flows

### 4.1 Tenant Quick-Provisioning Workflow:
1. Super Admin clicks **"+ Provision Tenant"** on Dashboard.
2. Selects pre-configured Plan (e.g. `ENTERPRISE`).
3. Form automatically populates default quotas (`100 Users`, `20 Depots`, `10 Orgs`).
4. Super Admin enters Tenant Name, Domain Prefix, and Administrator Email.
5. Click **"Submit"** $\rightarrow$ Backend executes atomic transactional bootstrap $\rightarrow$ Tenant created with seeded roles and initial Administrator.

### 4.2 Super Admin Quota Override Workflow:
1. Super Admin navigates to `/system/tenant`.
2. Clicks **"Manage Quotas"** on Tenant row.
3. Overrides `User Limit` from `15` to `25`.
4. Enters audit justification: *"Approved seasonal sales expansion"*.
5. Saves $\rightarrow$ Audit entry recorded $\rightarrow$ Tenant can immediately create 10 additional users.
