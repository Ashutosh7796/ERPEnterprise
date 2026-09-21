# Comprehensive Dashboard Architecture & Widget Analysis

## Executive Summary
This document delivers an exhaustive architectural review and comparative analysis of all dashboards across the three primary authority domains in our ERP: **Platform Super Admin**, **Customer Tenant Admin**, and **Support Specialist**. For every dashboard, all widgets, KPIs, data sources, role visibility rules, security implications, and enterprise requirements are evaluated against **metasfresh** and **ERPNext**.

---

## 1. Platform Super Admin Dashboard (`PlatformDashboardPage.tsx`)

Located at [`PlatformDashboardPage.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/dashboard/pages/PlatformDashboardPage.tsx), this workspace is exclusively accessible to users with `PLATFORM` authority (`isSuperAdmin = true`).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM SUPER ADMIN DASHBOARD                       │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐  │
│  │ Total Tenants   │ │ Active Tenants  │ │ Active Support Sessions   │  │
│  │ [ 14 ]          │ │ [ 12 ]          │ │ [ 2 ]                     │  │
│  └─────────────────┘ └─────────────────┘ └───────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Tenant Subscription & Quota Management Table                      │  │
│  │ • Tenant ID / Login Name / Quota Limit / Expiry / Status / Actions │  │
│  │ • Actions: [Quick Login] [Set Limit] [Extend] [Suspend] [Delete]   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Platform Operations & Quick Actions                               │  │
│  │ • [+ Register Support Staff]  • [System Dicts]  • [Platform Logs] │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Widget & KPI Inventory:
1. **Total Tenants KPI**:
   - *Data Source*: `GET /tenant/list` (counts non-deleted tenant records).
   - *Visible To*: Platform Super Admin only.
   - *Security Implication*: Aggregates platform-wide subscriber count; does not expose private customer data.
2. **Active vs. Suspended Tenants KPI**:
   - *Data Source*: Aggregated from `jsh_tenant.enabled` boolean flags.
   - *Visible To*: Platform Super Admin only.
3. **Active Support Sessions Counter**:
   - *Data Source*: `GET /support/session/active` (counts active diagnostic sessions).
   - *Purpose*: Provides real-time visibility into operator activity across customer tenants.
4. **Tenant Master Table & Actions**:
   - *Data Source*: `jsh_tenant` joined with user counts.
   - *Capabilities*: Provisioning, seat quota updates, subscription extension, account suspension.

---

## 2. Customer Tenant Admin Dashboard (`DashboardPage.tsx`)

Located at [`DashboardPage.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/dashboard/pages/DashboardPage.tsx), this workspace serves customer executives and operations managers.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     TENANT BUSINESS DASHBOARD                           │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐  │
│  │ Today's Sales   │ │ Monthly Revenue │ │ Inventory Low-Stock Alert │  │
│  │ [ ₹ 1,45,200 ]  │ │ [ ₹ 48,20,000 ] │ │ [ 8 Items Below Min ]     │  │
│  └─────────────────┘ └─────────────────┘ └───────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐  │
│  │ Sales & Purchase Revenue Trend  │ │ Top 10 Selling Products Chart │  │
│  │ (Multi-Month Bar/Line Chart)    │ │ (Ad-valorem & Quantity Donut) │  │
│  └─────────────────────────────────┘ └───────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Recent Commercial Orders & Approval Tasks                         │  │
│  │ • Pending Sales Orders  • Pending Purchase Requisitions (3-Way)   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Widget & KPI Inventory:
1. **Commercial KPI Cards (Sales, Purchase, Retail Revenue)**:
   - *Data Source*: `GET /depotHead/getBuyAndSaleStatistics` partitioned by `tenant_id`.
   - *Security Implication*: Enforces strict tenant isolation; only displays financial numbers for the logged-in customer.
2. **Inventory Stock Alerts**:
   - *Data Source*: `GET /material/getMaterialEnableList` matching stock $\le$ safety stock.
3. **Revenue Trend & Analytics Charts**:
   - *Data Source*: Monthly aggregation of approved `jsh_depot_head` sales/purchase invoices.
4. **Actionable Approval Queue**:
   - *Data Source*: `GET /depotHead/list` where `status = '0'` (Pending Approval).

---

## 3. Support Specialist Dashboard (`SupportDashboardPage.tsx`)

Located at [`SupportDashboardPage.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/dashboard/pages/SupportDashboardPage.tsx), this workspace is designed for enterprise technical support and diagnostic engineers.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPPORT OPERATIONS WORKSPACE                        │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐  │
│  │ Active Sessions │ │ Pending Approval│ │ Open Support Tickets      │  │
│  │ [ 1 Active ]    │ │ [ 2 Pending ]   │ │ [ 5 High Priority ]       │  │
│  └─────────────────┘ └─────────────────┘ └───────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Active Support Session Launcher (Consent Gated)                   │  │
│  │ • Session Code: SUP-2026-0819 | Tenant: Acme Corp (149)           │  │
│  │ • Mode: READ_ONLY | Remaining: 24 min | Justification: Inv Sync   │  │
│  │ • Action: [🚀 Enter Client ERP Workspace] [End Session]          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Global Customer Support Ticket Queue                              │  │
│  │ • Ticket # / Customer / Priority / Category / Status / Actions     │  │
│  │ • Action: [Request Diagnostic Access] [Update Ticket]              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-System Dashboard Comparison

| Dashboard / Persona | Our Current ERP | metasfresh | ERPNext | Mid-Market ERP Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Platform KPIs (Tenants, Active Sessions), Tenant table, Staff modal. | System Workspaces (`System Admin Dashboard`) with DB performance, queue locks. | Frappe Cloud SaaS metrics + Desk System Health dashboard. | **Include**: Tenant growth, subscription MRR, background job failures, tenant storage quotas. |
| **Tenant Admin** | Financial KPIs, Sales/Purchase trend, low-stock warnings, recent orders. | Role-customizable Workspaces with drill-down business views & KPI tiles. | Workspace pages with customizable Number Cards, Quick Lists, and Shortcuts. | **Include**: Cash flow projection, overdue AR/AP receivables, GST compliance status card. |
| **Support Operator** | Consent-gated session launcher, time-remaining countdown, ticket queue. | Direct technical diagnostic consoles & integration log viewer (`AD_Issue`). | Frappe Support Desk with SLA trackers and ticket assignment. | **Include**: Real-time SSE instant unlock, failed statutory API log monitor, diagnostic test runner. |

---

## 5. Structured Recommendation

#### 1. What We Have
Three distinct, domain-specific dashboard pages (`PlatformDashboardPage`, `DashboardPage`, `SupportDashboardPage`) tailored for Super Admins, Business Users, and Support Specialists.

#### 2. What Reference Systems Do
- **metasfresh**: Allows users to configure personal workspace dashboards with interactive drill-down tiles linking directly to filtered document lists.
- **ERPNext**: Implements modular "Workspaces" with configurable Number Cards and Chart blocks saved as JSON schemas.

#### 3. What is Missing
Our dashboards are currently static React components; tenant admins cannot customize which KPI widgets are visible to specific internal roles (e.g. hiding Revenue cards from warehouse supervisors).

#### 4. What Should Change
Implement role-based dashboard widget visibility rules leveraging `PermissionRegistry` (e.g., only show Revenue KPI card if user has `FINANCE_REPORT_VIEW` permission).

#### 5. Why
Prevents sensitive financial revenue figures from leaking to shop-floor or warehouse personnel viewing the home dashboard.

#### 6. How It Should Work
1. The dashboard component checks `hasPermission(widget.requiredPermission)` before rendering each card.
2. If unauthorized, the card is omitted from the grid layout seamlessly.
