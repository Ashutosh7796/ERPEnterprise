# FRONTEND IMPLEMENTATION & INTEGRATION AUDIT
## Full-Stack Synchronization: Phase 1 Inventory & Phase 2 Manufacturing
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Target Applications:** `ERPSystem-boot` (Spring Boot 3 / MyBatis) & `ERPSystem-web-react` (React 18 / Ant Design 5)  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Status:** **AUDITED & ARCHITECTED — AWAITING IMPLEMENTATION AUTHORIZATION**  

---

## 1. Executive Summary & Audit Mission

This audit establishes the **end-to-end architectural synchronization** between the verified backend authorities and the React user interface for both:
- **Phase 1:** Core Inventory, Storage Location Bins, Stock Ledger, Cycle Counting, and Valuation.
- **Phase 2:** Discrete Manufacturing, BOM, Work Orders, Shop-Floor WIP, Finished Goods Receipt, Scrap Accounting, and Indian Statutory Job Work (CGST Section 143 & Rule 45).

### Fundamental Architectural Laws Enforced
1. **The Backend Is the Exclusive Domain & Mutation Authority:**
   The frontend is an orchestration, presentation, and workflow guidance layer. The React application must **NEVER** calculate authoritative stock balances, unit moving-average valuations, COGS, tax liabilities, or tenant context on the client side.
2. **Single Physical Inventory Mutation Gateway:**
   Manufacturing and stocktaking services must **NEVER** directly execute SQL `UPDATE` or `INSERT` statements against `erp_material_current_stock` or `erp_stock_ledger_entry`. All physical mutations funnel exclusively through Batch 1's [`StockMutationService.recordMovement(StockMovementRequest)`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java).
3. **Immutable Running Ledger Principle:**
   The stock ledger (`erp_stock_ledger_entry`) is append-only and provides the authoritative chronological record of every physical transaction, running balance, and financial valuation impact.

---

## 2. Complete Repository Architecture Audit

### 2.1 React Frontend Architecture (`ERPSystem-web-react`)

| Architectural Dimension | Codebase Implementation | Evaluation & Constraints |
| :--- | :--- | :--- |
| **Framework & UI Library** | React 18, TypeScript, Ant Design 5.14, Tailwind CSS, Lucide & Ant Design Icons | Ant Design table, form, modal, and drawer patterns must be strictly adhered to. New pages must visually match the existing enterprise design system. |
| **Routing System** | React Router DOM 6.22 (`src/app/router.tsx`) | Routes are nested under `MainLayout`. Sub-paths follow domain grouping (`/inventory/*`, `/sales/*`, `/procurement/*`, `/manufacturing/*`). |
| **State Management** | Zustand (`authStore.ts`, `useAppStore.ts`, `permissionStore.ts`) | User session, active tenant ID, permitted paths, and button permission arrays are cached in Zustand. |
| **HTTP API Client** | Custom fetch client (`src/core/api/client.ts`) | Automatically injects `X-Access-Token`, handles baseURL routing (`/ERPSystem-boot`), and unifies error responses through `ApiError`. |
| **Sidebar & Menu System** | `Sidebar.tsx` + `TabBar.tsx` | Generates menu items dynamically based on domain (`TENANT`, `PLATFORM`, `SUPPORT`). Uses `ROUTE_TO_FUNCTION_URL` to filter menu items against `userAuth.permittedPaths`. Automatically opens parent domains via path prefix (`/inventory_domain`, `/manufacturing_domain`). |
| **RBAC & Permissions** | `HasPermission.tsx` & `RoleList.tsx` | Menu-level authorization is enforced by URL filtering. Button-level authorization is enforced declaratively via `<HasPermission urlPath="..." btnId={...}>`. |

### 2.2 Backend Architecture (`ERPSystem-boot`)

| Architectural Dimension | Codebase Implementation | Evaluation & Constraints |
| :--- | :--- | :--- |
| **Controller Architecture** | Spring Boot `@RestController` in `com.jsh.erp.controller` | Workflow controllers (e.g., `ProcurementWorkflowController`, `SalesWorkflowController`) group cohesive business processes. Standard CRUD delegates to BaseController. |
| **Domain Services** | `com.jsh.erp.service` | `StockMutationService` owns physical inventory; `DeliveryChallanService` owns Rule 55 challans; `SalesAccountingPostingService` owns GL journal vouchers. |
| **Data Access Layer** | MyBatis Mappers (`com.jsh.erp.datasource.mappers`) | MyBatis XML and Java mapper interfaces handle SQL execution. |
| **Concurrency Control** | Row-Level Pessimistic Mutex | `StockMutationService.acquireSortedRowLocks(tenantId, keys)` enforces deterministic lexicographical lock ordering across multi-item movements to prevent circular wait deadlocks. |
| **Multi-Tenancy** | Zero-Trust Isolation | Every query, lock, and insert explicitly filters and persists `tenant_id = UserContext.getTenantId()`. |

---

## 3. Phase 1 Frontend Audit: Resolving Audited Gaps

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASE 1 FRONTEND GAP MATRIX                                     |
+--------------------------+-----------------------+---------------------+---------------------------+
| Feature Area             | Current Codebase State| Target Requirement  | Architectural Solution    |
+--------------------------+-----------------------+---------------------+---------------------------+
| **1. Stock Ledger**      | **COMPLETELY MISSING**| Full audit trail of | Create `StockLedgerList`  |
|                          | No page, route, or API| running balances,   | page, route `/inventory/  |
|                          | for stock ledger.     | incoming rates, and | stock_ledger`, and API    |
|                          |                       | valuation deltas.   | `GET /stockLedger/list`.  |
+--------------------------+-----------------------+---------------------+---------------------------+
| **2. Bin Management**    | **COMPLETELY MISSING**| Storage location bin| Add "Manage Bins" drawer  |
|                          | `DepotList.tsx` only  | hierarchy (aisle,   | to `DepotList.tsx` with   |
|                          | manages `erp_depot`.  | rack, shelf, bin) & | zone tags (`WIP`, `FG`,   |
|                          |                       | zone tagging.       | `RAW_MATERIAL`).          |
+--------------------------+-----------------------+---------------------+---------------------------+
| **3. Stock Valuation**   | **INACCURATE FLOW**   | Stock flow modal    | Refactor `StockReport.tsx`|
|                          | Queries legacy        | must reflect running| to query `/stockLedger/   |
|                          | `depotItem` endpoint. | balances & moving   | list` for authoritative   |
|                          |                       | average valuations. | flow history.             |
+--------------------------+-----------------------+---------------------+---------------------------+
| **4. Cycle Counting**    | **COMPLETELY MISSING**| Systematic cycle    | Create `StocktakeList`    |
|                          | Adjustments forced    | counts with Book Qty| page, route `/inventory/  |
|                          | into Other In/Out.    | vs Counted Qty      | stocktake`, posting to    |
|                          |                       | variance approval.  | `StockMutationService`.   |
+--------------------------+-----------------------+---------------------+---------------------------+
| **5. ATP & Reservations**| **MISSING IN UI**     | Visibility into soft| Add `Reserved Qty` and    |
|                          | Shows only gross      | allocated stock for | `Available (ATP)` columns |
|                          | on-hand stock.        | open sales orders.  | in `StockReport.tsx`.     |
+--------------------------+-----------------------+---------------------+---------------------------+
```

### 3.1 Implementation Specification: Stock Ledger (`StockLedgerListPage.tsx`)
- **Backend Service:** `StockLedgerService.java` querying `StockLedgerEntryMapper`.
- **REST Endpoint:** `GET /stockLedger/list` (Supports `materialId`, `depotId`, `binId`, `startDate`, `endDate`, `voucherType`, pagination).
- **Frontend Page:** `ERPSystem-web-react/src/features/inventory/pages/StockLedgerList.tsx`.
- **Table Columns:**
  1. `Date & Time` (`createTime`)
  2. `Voucher Type` (`voucherType` badge: `PURCHASE_RECEIPT`, `SALES_DISPATCH`, `TRANSFER`, `STOCK_ADJUSTMENT`, `MANUFACTURING_ISSUE`, `MANUFACTURING_RECEIPT`)
  3. `Voucher Number` (`voucherNo`)
  4. `Warehouse` (`depotName`)
  5. `Storage Bin` (`binCode`)
  6. `Product` (`materialName` & `barCode`)
  7. `Change Qty` (`quantityChange`: green `+` for inbound, red `-` for outbound)
  8. `Running Balance` (`qtyAfterTransaction` — authoritative post-transaction on-hand balance)
  9. `Incoming Rate` (`incomingRate` — purchase / production cost per unit)
  10. `Valuation Rate` (`valuationRate` — updated moving average rate)
  11. `Stock Value Delta` (`stockValueDifference` — GL inventory asset delta)
- **Permissions:** `INVENTORY_STOCK_LEDGER_VIEW` (Function ID `/inventory/stock_ledger`).

### 3.2 Implementation Specification: Bin Management Drawer in `DepotList.tsx`
- **Backend Service:** `DepotBinService.java` querying `DepotBinMapper`.
- **REST Endpoints:**
  - `GET /depotBin/list?depotId={depotId}`: Returns all active bins in the warehouse.
  - `POST /depotBin/add`: Creates a new bin (`bin_code`, `bin_name`, `zone`, `aisle`, `rack`, `shelf`, `bin`).
  - `POST /depotBin/update`: Edits bin details or enables/disables bin.
  - `POST /depotBin/delete`: Soft-deletes bin (validated to ensure zero current stock lies in bin).
- **Frontend Component:** `ERPSystem-web-react/src/features/inventory/components/DepotBinDrawer.tsx`.
- **Zone Taxonomy:** `RAW_MATERIAL`, `WORK_IN_PROGRESS` (WIP), `FINISHED_GOODS`, `QUARANTINE`, `REJECTED`.
- **Phase 2 Linkage:** When a plant depot is created, a default `WIP-FLOOR` bin with `zone='WORK_IN_PROGRESS'` is automatically seeded, providing the physical container for shop-floor material staging.

### 3.3 Implementation Specification: Stock Valuation Refactor (`StockReport.tsx`)
- **Action:** Refactor `fetchFlowData` in `StockReport.tsx` from `/depotItem/findDetailByDepotIdsAndMaterialId` to `/stockLedger/list?materialId={id}&depotIds={depotIds}`.
- **Result:** When users click "History / Flow" on any SKU in the stock report, they receive the true chronological ledger showing exact running balance, incoming rate, and moving average rate adjustments rather than raw document lines.

### 3.4 Implementation Specification: Cycle Counting (`StocktakeListPage.tsx`)
- **Backend Service:** `StocktakeService.java` integrating with `StockMutationService.java`.
- **REST Endpoints:**
  - `POST /stocktake/create`: Initializes a stocktake session for a warehouse/zone; freezes book quantities.
  - `POST /stocktake/recordCount`: Enters physical count for SKUs.
  - `POST /stocktake/approve`: Approves count; computes variance ($\text{Variance} = \text{Counted Qty} - \text{Book Qty}$).
  - Invokes `StockMutationService.recordMovement()`:
    - If $\text{Variance} > 0$: Issues `STOCK_SURPLUS` (+Qty, incoming rate = current moving avg, GL: `Dr 1401 Asset | Cr 5301 Inventory Surplus`).
    - If $\text{Variance} < 0$: Issues `STOCK_LOSS` (-Qty, GL: `Dr 5302 Inventory Shrinkage Loss | Cr 1401 Asset`).
- **Frontend Page:** `ERPSystem-web-react/src/features/inventory/pages/StocktakeList.tsx` and `StocktakeModal.tsx`.

---

## 4. Phase 2 Frontend Architecture: Manufacturing & Job Work

```
+----------------------------------------------------------------------------------------------------+
|                                    MANUFACTURING UI WORKSPACES                                     |
+--------------------------+-----------------------+---------------------+---------------------------+
| Manufacturing Dimension  | React Page Component  | Navigation Route    | Key Workflow Actions      |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Bill of Materials**    | `BomListPage.tsx` &   | `/manufacturing/    | Create master formula, add|
|                          | `BomModal.tsx`        | bom`                | scrap %, preview indented |
|                          |                       |                     | sub-assembly tree.        |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Production Orders**    | `WorkOrderListPage.tsx`| `/manufacturing/   | Schedule order, freeze BOM|
|                          | & `WorkOrderModal.tsx`| work_orders`        | snapshot, track progress, |
|                          |                       |                     | transition state machine. |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Material Issue / WIP** | `MaterialIssueModal`  | Contextual modal on | Interactive pick list     |
|                          | (in Work Orders)      | Work Order list     | (required vs stores stock)|
|                          |                       |                     | dispatch to WIP bin.      |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Production Completion**| `ProductionReceipt-   | Contextual modal on | Receive FG into stores,   |
|                          | Modal` (Work Orders)  | Work Order list     | clear consumed WIP, log   |
|                          |                       |                     | scrap, absorb labor/cost. |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Indian Job Work**      | `JobWorkChallanList`  | `/manufacturing/    | Issue Rule 45 challans    |
|                          | & `JobWorkAgingList`  | job_work` & `/aging`| (JWC/), monitor Section   |
|                          |                       |                     | 143 return due dates.     |
+--------------------------+-----------------------+---------------------+---------------------------+
```

### 4.1 Bill of Materials Workspace (`BomListPage.tsx` & `BomModal.tsx`)
1. **Header Formulation:**
   - Parent Product selector (`material_id`) with active SKU details.
   - Standard Batch Output Quantity (`output_quantity`) and UOM (`unit_id`).
   - Revision Code (`revision_code`, e.g. `1.0`, `1.1`) and Default Flag (`is_default`).
2. **Component Item Grid (`erp_bom_item`):**
   - Editable sub-table: Component SKU, Required Quantity per Batch, UOM, Standard Scrap % (`scrap_percent`), and Issue Method (`MANUAL_ISSUE` vs `BACKFLUSH`).
3. **Interactive Explosion Drawer (`BomExplosionTree.tsx`):**
   - Renders a multi-level indented tree structure for sub-assemblies.
   - Visual cycle warning: If the user creates a recursive reference, the UI highlights the path in red and disables submission based on backend DFS cycle detection.

### 4.2 Work Order State Machine & Lifecycle UI (`WorkOrderListPage.tsx`)
The Work Order UI dynamically derives permitted actions strictly from the backend state machine:

```
+--------------------+---------------------------------------------+------------------------------------+
| Order Status       | Visual UI Badge                             | Permitted Action Buttons           |
+--------------------+---------------------------------------------+------------------------------------+
| `DRAFT`            | Grey Badge: "Draft"                         | `[Edit Order]`, `[Confirm Order]`  |
| `CONFIRMED`        | Blue Badge: "Confirmed / Scheduled"         | `[Issue Materials to WIP]`, `[Cancel]` |
| `IN_PROGRESS`      | Orange Badge: "In Progress (Shop Floor)"    | `[Issue Additional]`, `[Record Completion]` |
| `COMPLETED`        | Green Badge: "Production Completed"         | `[Close Order]`, `[View Cost Sheet]` |
| `CLOSED`           | Purple Badge: "Order Closed"                | `[View Audit & GL Journal]`        |
| `CANCELLED`        | Red Badge: "Cancelled"                      | Read-Only                          |
+--------------------+---------------------------------------------+------------------------------------+
```

### 4.3 Material Issue Dialog (`MaterialIssueModal.tsx`)
- **Purpose:** Guided shop-floor pick list invoked from a `CONFIRMED` or `IN_PROGRESS` Work Order.
- **Workflow:**
  1. Displays each required component from the frozen order snapshot (`erp_work_order_item`).
  2. Columns: `Component SKU`, `Standard Required Qty`, `Already Issued Qty`, `Remaining Qty`, `Stores Available Stock`, `Issue Qty`, `Target WIP Bin`.
  3. Pre-flight check: If `Stores Available Stock < Issue Qty`, the row highlights in red with tooltip *"Insufficient Stores Inventory"*.
  4. On Submit: Calls `POST /workOrder/issueMaterial`. The backend invokes `StockMutationService.recordMovement()` moving materials from Stores to the Plant's WIP Bin and posts `Dr 1402 WIP Asset / Cr 1401 RM Stores`.

### 4.4 Production Completion & Cost Absorption Dialog (`ProductionReceiptModal.tsx`)
- **Purpose:** Records finished goods receipt, yield losses, and cost absorption upon run completion.
- **Input Fields:**
  - `Completed Quantity`: Finished goods units received into FG Stores.
  - `Scrap Quantity` & `Scrap Reason`: Defective units or trimmings logged for mass-balance audit.
  - `Direct Labor Cost`: Actual operator labor incurred on the run.
  - `Factory Overhead Cost`: Absorbed machine electricity, depreciation, and overhead.
  - `Target FG Storage Location`: Warehouse and Bin for finished product.
- **Unit Cost Breakdown Card:**
  Displays calculated moving average cost:
  $$\text{Unit Cost} = \frac{\text{Consumed RM Cost} + \text{Direct Labor} + \text{Overhead} - \text{Scrap Salvage Value}}{\text{Completed FG Quantity}}$$
- **On Submit:** Calls `POST /workOrder/complete`. Backend invokes `StockMutationService.recordMovement()` to receive FG into stock at calculated moving average cost, clears consumed materials from the WIP bin, and posts balanced double-entry vouchers (`Dr 1401 FG Asset | Cr 1402 WIP Asset | Cr 5202 Labor Absorption | Cr 5203 Overhead Absorption`).

### 4.5 Indian Statutory Job Work Cockpit (`JobWorkAgingList.tsx`)
- **Purpose:** Specialized Indian compliance workspace enforcing CGST Section 143 return tracking.
- **Key Visual Indicators:**
  - `Goods Type`: `INPUTS / SEMI-FINISHED` (1-year return deadline) vs `CAPITAL GOODS` (3-year return deadline).
  - `Statutory Due Date`: Explicit statutory date calculated from Challan Date ($+1\text{ year}$ or $+3\text{ years}$).
  - `Days Remaining Countdown`:
    - Green Badge: $> 60$ days remaining.
    - Yellow Badge: $30 - 60$ days remaining.
    - Red Alert Badge: $< 30$ days remaining (Warning: Urgent return required).
    - Flashing Red Badge: **EXPIRED / OVERDUE** (Section 143 Deemed Supply penalty triggered).
- **Statutory Actions:**
  - `[Generate E-Way Bill]`: Formats payload for NIC portal under CGST Rule 138.
  - `[Record Job Worker Return]`: Inward receipt modal clearing pending raw material quantities and logging processed goods.
  - `[Export Form GST ITC-04]`: Generates statutory JSON / Excel matching government schema.

---

## 5. Sidebar & Navigation Architecture

### 5.1 Complete Sidebar Navigation Structure
To maintain an intuitive, enterprise-grade navigation experience, menus are organized into cohesive business domains in [`Sidebar.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/layouts/MainLayout/Sidebar.tsx):

```
ERP MAIN MENU
├── Dashboard (/dashboard)
├── Sales & Billing (/sales_domain)
├── Procurement (/procurement_domain)
├── Inventory & Logistics (/inventory_domain)          <-- [RESTRUCTURED]
│   ├── Warehouses & Storage Depots (/inventory/depots) [Includes Bin Drawer]
│   ├── Stock Balances & Valuation (/report/stock)
│   ├── Authoritative Stock Ledger (/inventory/stock_ledger)  <-- [NEW P0]
│   ├── Stock Transfers (Rule 55 Challan) (/inventory/transfers)
│   ├── Physical Stocktake & Audit (/inventory/stocktake)     <-- [NEW P1]
│   ├── Miscellaneous Inbound (Other In) (/inventory/other_in)
│   └── Miscellaneous Outbound (Other Out) (/inventory/other_out)
├── Manufacturing & Production (/manufacturing_domain)  <-- [NEW DOMAIN]
│   ├── Bills of Materials (BOM) (/manufacturing/bom)
│   ├── Production Work Orders (/manufacturing/work_orders)
│   ├── Shop-Floor Material Issue (/manufacturing/material_issue)
│   └── Indian Job Work (Rule 45) (/manufacturing/job_work)
│       ├── Outward Delivery Challans (/manufacturing/job_work/challans)
│       ├── Section 143 Statutory Aging (/manufacturing/job_work/aging)
│       └── Form GST ITC-04 Register (/manufacturing/job_work/itc04)
├── Finance & Accounting (/financial_domain)
├── Master Data (/master_data_domain)
├── Tax & Compliance (/tax_domain)
├── Analytics & Reports (/report_domain)
└── System Administration (/system_domain)
```

### 5.2 TabBar Title Mapping (`TabBar.tsx`)
Every new route is registered in `PATH_TO_TITLE` in `TabBar.tsx` to provide clear, human-readable tab labels:
- `'/inventory/stock_ledger'`: `'Stock Ledger'`
- `'/inventory/stocktake'`: `'Physical Stocktake'`
- `'/manufacturing/bom'`: `'Bills of Materials (BOM)'`
- `'/manufacturing/work_orders'`: `'Production Work Orders'`
- `'/manufacturing/material_issue'`: `'Material Issue'`
- `'/manufacturing/job_work'`: `'Indian Job Work (Rule 45)'`
- `'/manufacturing/job_work/aging'`: `'Section 143 Statutory Aging'`
- `'/manufacturing/job_work/itc04'`: `'Form GST ITC-04'`

---

## 6. Full-Stack Backend ↔ Frontend Contract Matrix

```
+---------------------------------------------------------------------------------------------------------------------------------------------------------------+
|                                                        BACKEND ↔ FRONTEND CONTRACT MATRIX                                                             |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| Feature Area             | Backend Service           | REST API Endpoint                 | React Page / Component | Route Path & Sidebar     | RBAC Permission|
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Stock Ledger**         | `StockLedgerService`      | `GET /stockLedger/list`           | `StockLedgerListPage`  | `/inventory/stock_ledger`| `INVENTORY_    |
|                          |                           |                                   |                        | (Inventory & Logistics)  | STOCK_LEDGER`  |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Storage Bins**         | `DepotBinService`         | `GET /depotBin/list`,             | `DepotBinDrawer`       | Drawer inside            | `INVENTORY_    |
|                          |                           | `POST /depotBin/add`, `/delete`   | (in `DepotList.tsx`)   | `/inventory/depots`      | BIN_MANAGE`    |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Stock Valuation**      | `StockMutationService` &  | `GET /material/getListWithStock`, | `StockReportPage`      | `/report/stock`          | `REPORT_STOCK_ |
|                          | `StockLedgerService`      | `GET /stockLedger/list`           | (Refactored Flow Modal)| (Analytics & Reports)    | VALUATION`     |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Cycle Counting**       | `StocktakeService`        | `POST /stocktake/create`,         | `StocktakeListPage`,   | `/inventory/stocktake`   | `INVENTORY_    |
|                          |                           | `POST /stocktake/recordCount`,    | `StocktakeModal`       | (Inventory & Logistics)  | STOCKTAKE`     |
|                          |                           | `POST /stocktake/approve`         |                        |                          |                |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Master BOM**           | `BomService`              | `POST /bom/create`, `/update`,    | `BomListPage`,         | `/manufacturing/bom`     | `MANUFACTURING_|
|                          |                           | `GET /bom/get/{id}`,              | `BomModal`,            | (Manufacturing)          | BOM_MANAGE`    |
|                          |                           | `GET /bom/explode/{matId}`        | `BomExplosionTree`     |                          |                |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Work Orders**          | `WorkOrderService`        | `POST /workOrder/create`,         | `WorkOrderListPage`,   | `/manufacturing/         | `MANUFACTURING_|
|                          |                           | `POST /workOrder/confirm/{id}`,   | `WorkOrderModal`       | work_orders`             | WO_MANAGE`     |
|                          |                           | `POST /workOrder/close/{id}`      |                        | (Manufacturing)          |                |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Material Issue / WIP** | `MaterialIssueService`    | `POST /workOrder/issueMaterial`   | `MaterialIssueModal`   | Contextual Modal in      | `MANUFACTURING_|
|                          |                           |                                   |                        | Work Orders              | MATERIAL_ISSUE`|
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Production Receipt**   | `ProductionReceiptService`| `POST /workOrder/complete`        | `ProductionReceipt-    | Contextual Modal in      | `MANUFACTURING_|
|                          |                           |                                   | Modal`                 | Work Orders              | PROD_RECEIPT`  |
+--------------------------+-----------------------+-----------------------------------+------------------------+--------------------------+----------------+
| **Indian Job Work**      | `JobWorkService`          | `POST /jobWork/createChallan`,    | `JobWorkChallanListPage`| `/manufacturing/job_work`| `MANUFACTURING_|
|                          |                           | `POST /jobWork/recordInward`,     | & `JobWorkAgingPage`   | (Manufacturing)          | JOB_WORK`      |
|                          |                           | `GET /jobWork/agingReport`        |                        |                          |                |
+--------------------------+---------------------------+-----------------------------------+------------------------+--------------------------+----------------+
```

---

## 7. Phased Implementation Plan & Dependency Order

Implementation will execute in strict dependency order across two sequential phases:

### Phase 1 Frontend Delivery Sequence (Inventory Foundation)
1. **Sprint 1A: Stock Ledger API & UI (P0)**
   - Backend: Implement `StockLedgerService.java` and `StockLedgerController.java` (`GET /stockLedger/list`).
   - Frontend: Implement `StockLedgerListPage.tsx`, register route `/inventory/stock_ledger`, add sidebar item under `Inventory & Logistics`, add title in `TabBar.tsx`.
2. **Sprint 1B: Bin Management Drawer & API (P1)**
   - Backend: Implement `DepotBinService.java` and `DepotBinController.java` (`list`, `add`, `delete`).
   - Frontend: Implement `DepotBinDrawer.tsx` inside `DepotList.tsx`, enabling warehouse bin CRUD and zone tags (`RAW_MATERIAL`, `WIP`, `FG`).
3. **Sprint 1C: Stock Report Flow Refactor (P1)**
   - Frontend: Refactor `StockReport.tsx` flow modal to consume authoritative `/stockLedger/list`.
   - Add `Reserved Qty` and `Available (ATP)` columns to `StockReport.tsx`.
4. **Sprint 1D: Physical Stocktake & Cycle Counting (P1)**
   - Backend: Implement `StocktakeService.java` and `StocktakeController.java` calling Batch 1 `StockMutationService` for surplus/loss movements.
   - Frontend: Implement `StocktakeListPage.tsx` and `StocktakeModal.tsx`, register route `/inventory/stocktake`.
5. **Sprint 1E: Phase 1 Frontend Integration Testing**
   - End-to-end testing of Stock Ledger, Bin Drawer, Stocktake, and Valuation Flow.

### Phase 2 Full-Stack Delivery Sequence (Manufacturing & Job Work)
1. **Sprint 2A: BOM Master Data & Cycle Detection Engine**
   - Backend: Apply schema `erp_bom_head` & `erp_bom_item`, implement `BomService.java` with DFS cycle detection and `BomController.java`.
   - Frontend: Implement `BomListPage.tsx`, `BomModal.tsx`, and `BomExplosionTree.tsx`, register route `/manufacturing/bom`.
2. **Sprint 2B: Work Order Engine & Snapshot Freezing**
   - Backend: Apply schema `erp_work_order` & `erp_work_order_item`, implement `WorkOrderService.java` state machine and `WorkOrderController.java`.
   - Frontend: Implement `WorkOrderListPage.tsx` and `WorkOrderModal.tsx`, register route `/manufacturing/work_orders`.
3. **Sprint 2C: Material Issue & Shop-Floor WIP Tracking**
   - Backend: Implement `MaterialIssueService.java` calling Batch 1 `StockMutationService` (Stores $\rightarrow$ WIP Bin) and GL posting.
   - Frontend: Implement `MaterialIssueModal.tsx` pick list with real-time stock sufficiency checks.
4. **Sprint 2D: Production Completion & Cost Absorption**
   - Backend: Implement `ProductionReceiptService.java` and `ManufacturingCostingService.java` (FG Receipt, WIP clearance, Ind AS-2 cost absorption).
   - Frontend: Implement `ProductionReceiptModal.tsx` with moving average unit cost calculation card.
5. **Sprint 2E: Indian Job Work & Section 143 Compliance**
   - Backend: Apply schema `erp_job_work_tracking`, implement `JobWorkService.java` (Rule 45 challans, statutory due dates, ITC-04 export).
   - Frontend: Implement `JobWorkChallanListPage.tsx`, `JobWorkAgingPage.tsx`, and `JobWorkInwardModal.tsx`.
6. **Sprint 2F: End-to-End Enterprise Testing & Verification**
   - Full regression suite, multi-tenant verification, and Graphify synchronization.

---

## 8. Delivery Gate & Final Stop Condition

> [!IMPORTANT]
> ### HARD STOP ACTIVATED — READY FOR IMPLEMENTATION AUTHORIZATION
> In accordance with your explicit instructions:
> - **Zero production code has been modified.**
> - **Zero database migrations have been executed.**
> - **Zero React production files have been changed.**
> - **Phase 1 Backend remains COMPLETE & VERIFIED.**
> - **Phase 1 Frontend is AUDITED with all gap specifications ready.**
> - **Phase 2 Backend & Frontend are ARCHITECTED & SYNCHRONIZED.**
> - **Phase 3 remains NOT STARTED.**
> 
> **Awaiting your explicit Human Approval of this Implementation & Integration Plan before code implementation begins.**
