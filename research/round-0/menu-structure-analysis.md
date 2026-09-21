# Role-Based Menu Hierarchy & Navigation Architecture

## Executive Summary
This document provides a detailed mapping and architectural analysis of the navigation menu structures for **Platform Super Admin**, **Tenant Administrator**, **Support Specialist**, and **Standard Business User** roles in our ERP. It traces how menu trees stored in `jsh_function` interact with `PermissionRegistry` and the React sidebar router, and presents a modern domain-driven enterprise menu structure compared against **metasfresh** and **ERPNext**.

---

## 1. Existing Menu Routing & Metadata Model

In our ERP, menu items are modeled as hierarchical nodes in the database:
* **Database Table**: `jsh_function`
* **Java Entity**: [`Function.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Function.java)
* **Key Attributes**:
  * `number` (`String`): Unique hierarchical node code (e.g. `01`, `0101`, `02`).
  * `name` (`String`): Display title in sidebar.
  * `parentNumber` (`String`): Parent node code for nested menus.
  * `url` (`String`): Frontend route identifier (e.g. `/bill/sale_order`, `/system/depot`).
  * `component` (`String`): React component binding.
  * `pushBtn` (`String`): Comma-separated button permissions (e.g. `add,edit,delete,audit`).
  * `type` (`String`): Menu item classification (`menu` or `btn`).

---

## 2. Role-Based Navigation Trees

### 2.1 Platform Super Admin Menu Tree
```text
PLATFORM MANAGEMENT
├── 📊 Platform Dashboard (/platform/dashboard)
├── 🏢 Tenant Management (/system/tenant)
│   ├── Tenant Directory
│   ├── Subscriptions & Quotas
│   └── Tenant Deactivation
├── ⚙️ Platform Configuration (/system/platform_config)
│   ├── Platform Branding & SMTP
│   └── Verification Code Settings
├── 📖 System Dictionaries (/system/dict)
├── 🔌 Plugin Management (/system/plugin)
├── 🗺️ Menu & Function Registry (/system/function)
└── 📋 Global Audit Logs (/system/log)
```

### 2.2 Customer Tenant Admin & Business User Menu Tree
```text
COMMERCIAL ERP WORKSPACE
├── 📈 Business Dashboard (/dashboard)
├── 🛒 Sales & Invoicing
│   ├── Sales Orders (/bill/sale_order)
│   ├── Sales Outbound & Delivery (/bill/sale_out)
│   ├── Sales Returns & Credit Notes (/bill/sale_back)
│   └── Retail Point of Sale (/bill/retail_out)
├── 📦 Procurement & Requisitions
│   ├── Purchase Requisitions (/bill/purchase_apply)
│   ├── Purchase Orders (/bill/purchase_order)
│   ├── Goods Receipts (/bill/purchase_in)
│   ├── 3-Way Invoice Matching (/bill/three_way_match)
│   └── Purchase Returns & Debit Notes (/bill/purchase_back)
├── 🏭 Inventory & Logistics
│   ├── Warehouse Depots (/system/depot)
│   ├── Stock Transfers (/bill/allocation_out)
│   ├── Stock Inbound / Outbound (/bill/other_in, /bill/other_out)
│   └── Assembly & Disassembly (/bill/assemble, /bill/disassemble)
├── 💰 Finance & Banking
│   ├── Customer Receipts (/financial/money_in)
│   ├── Vendor Payments (/financial/money_out)
│   ├── Account Transfers & Giro (/financial/giro)
│   └── Chart of Accounts (/system/account)
├── 🏷️ Master Data
│   ├── Materials & Products (/material/material)
│   ├── Categories & Attributes (/material/material_category)
│   ├── Suppliers & Vendors (/system/vendor)
│   ├── Customers & Clients (/system/customer)
│   └── Staff & Personnel (/system/person)
├── 🏛️ Statutory GST & Compliance
│   ├── GST Invoices (Rule 46) (/gst/sales_invoices)
│   ├── Credit / Debit Notes (Rule 53) (/gst/credit_debit_notes)
│   ├── E-Invoice & IRN Portal (/gst/einvoice)
│   └── E-Way Bills (/gst/eway_bill)
├── 📊 Analytics & Reports
│   ├── Inventory Stock Valuation (/report/stock)
│   ├── Sales & Purchase Trends (/report/sale_out_report)
│   └── Customer & Vendor Statements (/report/customer)
├── 🏢 Tenant Administration
│   ├── Organizational Structure (/system/organization)
│   ├── User Management (/system/user)
│   ├── Roles & Permissions (/system/role)
│   └── Company GSTIN Setup (/tax/company_gstin)
└── 🛟 Support & Diagnostics
    ├── Support Center (/support/center)
    └── Diagnostic Logs (/support/diagnostics)
```

### 2.3 Support Specialist Menu Tree
```text
SUPPORT OPERATIONS WORKSPACE
├── 🛟 Support Operations Dashboard (/support/dashboard)
├── 🎫 Customer Support Queue (/support/tickets)
├── 🚀 Active Support Session Launcher (/support/session/launcher)
├── 🔍 Diagnostic Test Runner (/support/diagnostics)
├── 📈 Statutory API & E-Invoice Logs (/support/api_logs)
└── 📋 Support Session Audit History (/support/attendance)
```

---

## 3. Multi-System Menu Hierarchy Comparison

| Menu Dimension | Our Current ERP | metasfresh | ERPNext / Frappe |
| :--- | :--- | :--- | :--- |
| **Menu Representation** | Flat tree in `jsh_function` filtered by role permissions. | Dynamic Menu Tree (`AD_Menu`, `AD_TreeNodeMM`) supporting nested folders, windows, and processes. | Modular Workspace Sidebar with collapsible categories, shortcuts, and document cards. |
| **Menu Customization** | Role-based assignment in `jsh_user_business`. | Configurable per Role and Tenant Client (`AD_Menu_Access`). | Customizable Workspaces saved per User or Role Profile. |
| **Separation of Domains** | Clean separation: `/platform/*`, `/support/*`, `/system/*`, `/bill/*`. | Separated by `AD_Client_ID = 0` (System) vs. Client Workspaces. | Separated by System Settings workspace vs. Operational modules. |

---

## 4. Structured Recommendation

#### 1. What We Have
A functional hierarchical menu structure with distinct entry points for Super Admins, Tenant Admins, Support Operators, and Standard Users.

#### 2. What Reference Systems Do
- **metasfresh**: Organizes menus by business domain (Master Data, Procurement, Order to Cash, Accounting) with standard search and bookmark capabilities.
- **ERPNext**: Groups menus into domain "Workspaces" with quick-create action buttons directly embedded into the sidebar navigation.

#### 3. What is Missing
Our legacy menu tree stored in `jsh_function` contains static Chinese/legacy numbering codes (`01`, `02`, `0101`) mixed with modern English titles, which makes programmatically extending menus via migrations cumbersome.

#### 4. What Should Change
Standardize all menu keys using semantic alphanumeric module codes (e.g. `SALES_ORDER`, `PURCHASE_REQ`, `FINANCE_RECEIPT`) corresponding 1-to-1 with `PermissionRegistry` tokens.

#### 5. Why
Eliminates numeric index collision when adding new feature menus and establishes a clean unified contract between database menus, frontend router paths, and server-side authorization tokens.

#### 6. How It Should Work
1. The frontend queries `/function/findUserAuthorization` upon login.
2. The response returns authorized menu items keyed by semantic permission tokens.
3. The React sidebar builds the dynamic navigation hierarchy based on semantic category groupings.
