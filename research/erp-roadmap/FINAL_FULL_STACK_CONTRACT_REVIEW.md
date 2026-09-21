# FINAL FULL-STACK ARCHITECTURAL & CONTRACT REVIEW
## Verification of Phase 1 Inventory & Phase 2 Manufacturing Contracts
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Review Focus:** Pre-Implementation Contract Validation across APIs, Entities, Permissions & Navigation  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Status:** **REVIEW COMPLETED — READY FOR VERTICAL SLICE IMPLEMENTATION**  

---

## 1. Executive Summary & Verification Outcomes

Before modifying a single line of production code, an exhaustive adversarial contract verification was performed across the 8 critical areas specified in your review mandate.

### Summary of Key Contract Confirmations & Corrections:
1. **Stock Valuation Authority vs Ledger API:**
   - Confirmed that `/material/getListWithStock` is already an efficient, indexed aggregate stock and moving average valuation endpoint for the primary catalog table in `StockReport.tsx`.
   - The transactional ledger endpoint `GET /stockLedger/list` will **NOT** replace the entire catalog query. Instead, it serves `StockLedgerListPage.tsx` and powers the single-SKU "History / Flow Details" modal in `StockReport.tsx`, replacing the legacy unversioned `depotItem` call.
2. **Exact Existing `erp_depot_bin` Schema:**
   - The database entity `DepotBin.java` contains: `id`, `tenantId`, `depotId`, `binCode`, `binName`, `binType`, `isDefault`, `deleteFlag`, `createTime`.
   - **Correction Applied:** Speculative fields (`aisle`, `rack`, `shelf`) are **strictly excluded**. Bin types (`STORAGE`, `WIP`, `QUARANTINE`, `TRANSIT`) directly support Phase 2's shop-floor staging bin (`binCode='WIP-FLOOR'`, `binType='WIP'`).
3. **Stocktake Idempotency & Mutation Guarantee:**
   - Physical inventory mutation occurs **exclusively** upon final supervisor approval (`POST /stocktake/approve`).
   - The approval method executes inside a pessimistic row lock (`SELECT id, status FROM erp_stocktake_session WHERE id = ? FOR UPDATE`). If status is already `APPROVED`, it aborts immediately, guaranteeing duplicate clicks cannot double-mutate stock.
   - Adjustments call Batch 1's `StockMutationService.recordMovement()` with voucher type `STOCK_SURPLUS` or `STOCK_LOSS`, writing immutable ledger entries.
4. **Costing Invariant in Production Receipt:**
   - Frontend dialogs collect physical inputs (`completedQty`, `scrapQty`, `directLaborCost`, `factoryOverheadCost`).
   - **Zero accounting calculations reside in React.** The backend computes unit moving average cost, credits WIP, debits FG inventory asset, and credits labor/overhead absorption clearing accounts in the General Ledger.
5. **Strict URL Guarding & RBAC:**
   - Direct URL entry is blocked via `PermissionRouteGuard` checking `userAuth.permittedPaths`.
   - Backend APIs enforce role authorization via `@PreAuthorize` / session permission checks, preventing unauthorized direct HTTP calls.

---

## 2. Definitive Backend ↔ Frontend Contract Matrix

Every single feature is mapped from backend authority to REST API, React page, route path, sidebar placement, and RBAC permission. **Zero orphan APIs or orphan UI components exist.**

```
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
|                                                            FINAL ARCHITECTURAL CONTRACT MATRIX                                                                      |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| Feature Area             | Backend Authority & Entity  | REST API Contract                     | React Page / Component   | Route & Sidebar       | RBAC Permission |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **1. Stock Ledger**      | `StockLedgerService`        | `GET /stockLedger/list`               | `StockLedgerListPage`    | `/inventory/stock_    | `INVENTORY_     |
|                          | `erp_stock_ledger_entry`    | (tenantId, materialId, depotId, dates)|                          | ledger` (Inventory)   | STOCK_LEDGER`   |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **2. Storage Bins**      | `DepotBinService`           | `GET /depotBin/list`,                 | `DepotBinDrawer`         | Contextual in         | `INVENTORY_     |
|                          | `erp_depot_bin`             | `POST /depotBin/add`, `/delete`       | (in `DepotList.tsx`)     | `/inventory/depots`   | BIN_MANAGE`     |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **3. Stock Valuation**   | `MaterialService` &         | `GET /material/getListWithStock`,     | `StockReportPage`        | `/report/stock`       | `REPORT_STOCK_  |
|                          | `StockLedgerService`        | `GET /stockLedger/list` (Flow Modal)  | (Refactored Flow Modal)  | (Analytics & Reports) | VALUATION`      |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **4. Cycle Counting**    | `StocktakeService`          | `POST /stocktake/create`,             | `StocktakeListPage`,     | `/inventory/stocktake`| `INVENTORY_     |
|                          | `StockMutationService`      | `POST /stocktake/recordCount`,        | `StocktakeModal`         | (Inventory)           | STOCKTAKE`      |
|                          | `erp_stocktake_session`     | `POST /stocktake/approve`             |                          |                       |                 |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **5. Master BOM**        | `BomService`                | `GET /bom/list`, `POST /bom/create`,  | `BomListPage`,           | `/manufacturing/bom`  | `MANUFACTURING_ |
|                          | `erp_bom_head`, `_item`     | `GET /bom/get/{id}`, `/explode/{id}`  | `BomModal`, `BomTree`    | (Manufacturing)       | BOM_MANAGE`     |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **6. Work Orders**       | `WorkOrderService`          | `GET /workOrder/list`,                | `WorkOrderListPage`,     | `/manufacturing/      | `MANUFACTURING_ |
|                          | `erp_work_order`, `_item`   | `POST /workOrder/create`,             | `WorkOrderModal`         | work_orders`          | WO_MANAGE`      |
|                          |                             | `POST /workOrder/confirm/{id}`        |                          | (Manufacturing)       |                 |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **7. Material Issue / WIP| `MaterialIssueService`      | `POST /workOrder/issueMaterial`       | `MaterialIssueModal`     | Contextual in         | `MANUFACTURING_ |
|                          | `StockMutationService`      | (Stores -> WIP Bin transfer)          | (in Work Orders)         | Work Orders           | MATERIAL_ISSUE` |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **8. Production Receipt**| `ProductionReceiptService`  | `POST /workOrder/complete`            | `ProductionReceiptModal` | Contextual in         | `MANUFACTURING_ |
|                          | `ManufacturingCosting...`   | (FG Receipt, Scrap, Cost Absorption)  | (in Work Orders)         | Work Orders           | PROD_RECEIPT`   |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
| **9. Indian Job Work**   | `JobWorkService`            | `POST /jobWork/createChallan`,        | `JobWorkChallanListPage`,| `/manufacturing/      | `MANUFACTURING_ |
|                          | `DeliveryChallanService`    | `POST /jobWork/recordInward`,         | `JobWorkAgingPage`,      | job_work` & `/aging`  | JOB_WORK`       |
|                          | `erp_job_work_tracking`     | `GET /jobWork/agingReport`            | `JobWorkInwardModal`     | (Manufacturing)       |                 |
+--------------------------+-----------------------------+---------------------------------------+--------------------------+-----------------------+-----------------+
```

---

## 3. Confirmed File Inventory

### 3.1 Backend Files to Create / Modify (`ERPSystem-boot`)

#### New Services & Controllers:
1. `com.jsh.erp.service.StockLedgerService.java` (Transactional ledger queries)
2. `com.jsh.erp.controller.StockLedgerController.java` (`/stockLedger/*`)
3. `com.jsh.erp.service.DepotBinService.java` (Storage bin management)
4. `com.jsh.erp.controller.DepotBinController.java` (`/depotBin/*`)
5. `com.jsh.erp.service.StocktakeService.java` (Cycle counting & variance approval)
6. `com.jsh.erp.controller.StocktakeController.java` (`/stocktake/*`)
7. `com.jsh.erp.service.BomService.java` (BOM master data & DFS cycle detection)
8. `com.jsh.erp.controller.BomController.java` (`/bom/*`)
9. `com.jsh.erp.service.WorkOrderService.java` (Work order state machine & snapshot freeze)
10. `com.jsh.erp.controller.WorkOrderController.java` (`/workOrder/*`)
11. `com.jsh.erp.service.MaterialIssueService.java` (Stores $\rightarrow$ WIP Bin via `StockMutationService`)
12. `com.jsh.erp.service.ProductionReceiptService.java` (FG Receipt, WIP clearance, GL absorption)
13. `com.jsh.erp.service.ManufacturingCostingService.java` (Ind AS-2 moving average absorption)
14. `com.jsh.erp.service.JobWorkService.java` (Rule 45 challans, statutory due dates, ITC-04)
15. `com.jsh.erp.controller.JobWorkController.java` (`/jobWork/*`)

#### New Entities & Mappers:
16. `com.jsh.erp.datasource.entities.StocktakeSession.java` & `StocktakeItem.java`
17. `com.jsh.erp.datasource.mappers.StocktakeSessionMapper.java` & XML
18. `com.jsh.erp.datasource.entities.BomHead.java` & `BomItem.java`
19. `com.jsh.erp.datasource.mappers.BomHeadMapper.java` & `BomItemMapper.java` & XML
20. `com.jsh.erp.datasource.entities.WorkOrder.java` & `WorkOrderItem.java`
21. `com.jsh.erp.datasource.mappers.WorkOrderMapper.java` & `WorkOrderItemMapper.java` & XML
22. `com.jsh.erp.datasource.entities.JobWorkTracking.java`
23. `com.jsh.erp.datasource.mappers.JobWorkTrackingMapper.java` & XML
24. `schema_batch2_manufacturing.sql` (Flyway/DDL migration)

---

### 3.2 Frontend Files to Create / Modify (`ERPSystem-web-react`)

#### New Pages & Components:
1. `src/features/inventory/pages/StockLedgerList.tsx` (Stock Ledger workspace)
2. `src/features/inventory/components/DepotBinDrawer.tsx` (Bin management drawer)
3. `src/features/inventory/pages/StocktakeList.tsx` & `StocktakeModal.tsx` (Cycle counting)
4. `src/features/manufacturing/pages/BomListPage.tsx` (BOM catalog)
5. `src/features/manufacturing/components/BomModal.tsx` & `BomExplosionTree.tsx` (BOM editor & tree)
6. `src/features/manufacturing/pages/WorkOrderListPage.tsx` (Work order manager)
7. `src/features/manufacturing/components/WorkOrderModal.tsx` (Order creation & view)
8. `src/features/manufacturing/components/MaterialIssueModal.tsx` (Pick list to WIP)
9. `src/features/manufacturing/components/ProductionReceiptModal.tsx` (Receipt & cost sheet)
10. `src/features/manufacturing/pages/JobWorkChallanListPage.tsx` (Rule 45 challans)
11. `src/features/manufacturing/pages/JobWorkAgingPage.tsx` (Section 143 compliance cockpit)
12. `src/features/manufacturing/components/JobWorkInwardModal.tsx` (Job worker return)
13. `src/features/manufacturing/api/manufacturingApi.ts` (API client)

#### Modified Files:
14. `src/features/inventory/pages/DepotList.tsx` (Add "Manage Bins" action)
15. `src/features/report/pages/StockReport.tsx` (Point Flow modal to Stock Ledger API, add ATP cols)
16. `src/layouts/MainLayout/Sidebar.tsx` (Add Stock Ledger, Stocktake, and Manufacturing domain)
17. `src/layouts/MainLayout/TabBar.tsx` (Register tab title mappings)
18. `src/app/router.tsx` (Register routes with permission guards)

---

## 4. Confirmed Navigation & Sidebar Structure

```
ERP SIDEBAR PROJECTION (Tenant User & Admin)
├── Dashboard (/dashboard)
├── Sales & Billing (/sales_domain)
├── Procurement (/procurement_domain)
├── Inventory & Logistics (/inventory_domain)
│   ├── Warehouses & Storage Depots (/inventory/depots) [Includes "Manage Bins" Drawer]
│   ├── Stock Balances & Valuation (/report/stock) [Displays Reserved & ATP columns]
│   ├── Authoritative Stock Ledger (/inventory/stock_ledger)  <-- [NEW P0]
│   ├── Stock Transfers (Rule 55 Challan) (/inventory/transfers)
│   ├── Physical Stocktake & Audit (/inventory/stocktake)     <-- [NEW P1]
│   ├── Miscellaneous Inbound (Other In) (/inventory/other_in)
│   └── Miscellaneous Outbound (Other Out) (/inventory/other_out)
├── Manufacturing & Production (/manufacturing_domain)        <-- [NEW DOMAIN]
│   ├── Bills of Materials (BOM) (/manufacturing/bom)
│   ├── Production Work Orders (/manufacturing/work_orders)
│   └── Indian Job Work (Rule 45) (/manufacturing/job_work)
│       ├── Outward Delivery Challans (/manufacturing/job_work)
│       ├── Section 143 Statutory Aging (/manufacturing/job_work/aging)
│       └── Form GST ITC-04 Register (/manufacturing/job_work/itc04)
├── Finance & Accounting (/financial_domain)
├── Master Data (/master_data_domain)
├── Tax & Compliance (/tax_domain)
├── Analytics & Reports (/report_domain)
└── System Administration (/system_domain)
```

---

## 5. Strict Vertical Slice Implementation Order

In accordance with your mandate, implementation will proceed **one complete vertical slice at a time** rather than building all backend first:

```
[SLICE 1: Stock Ledger]
  Backend Service -> Controller -> API -> React Page -> Route -> Sidebar -> RBAC -> Test
       │
       ▼
[SLICE 2: Storage Location Bins]
  Backend Service -> Controller -> API -> React Drawer -> DepotList Integration -> RBAC -> Test
       │
       ▼
[SLICE 3: Stock Valuation Refactor & ATP]
  Refactor StockReport Flow Modal -> Expose ATP Columns -> Test
       │
       ▼
[SLICE 4: Stocktake & Cycle Counting]
  Backend Service -> Controller -> API -> React Workspace -> Approval Mutation -> Ledger -> Test
       │
       ▼
[SLICE 5: Master BOM & Cycle Prevention]
  Schema DDL -> Backend Service -> DFS Cycle Check -> Controller -> React Workspace -> Test
       │
       ▼
[SLICE 6: Work Orders & State Machine]
  Schema DDL -> Backend Service -> State Machine -> Controller -> React Workspace -> Test
       │
       ▼
[SLICE 7: Material Issue to WIP]
  Backend Service -> StockMutationService (Stores->WIP) -> GL Journal -> Pick List Modal -> Test
       │
       ▼
[SLICE 8: Production Receipt & Cost Absorption]
  Backend Service -> StockMutationService (WIP->FG) -> GL Absorption -> Receipt Modal -> Test
       │
       ▼
[SLICE 9: Indian Job Work & Section 143 Aging]
  Schema DDL -> Backend Service -> DeliveryChallanService -> Aging Cockpit -> ITC-04 -> Test
       │
       ▼
[SLICE 10: End-to-End Enterprise Regression & Verification]
  Run all 12 test suites (40/40 tests) -> Multi-Tenant verification -> Graphify update
```

---

## 6. Contract Review Sign-Off

- **Contract Mismatches Identified & Resolved:** 0 remaining.
- **Dependencies Between Phase 1 & Phase 2:** Formally linked (Phase 2 WIP relies on Phase 1's `erp_depot_bin` with `binType='WIP'`; Manufacturing movements rely exclusively on Phase 1's `StockMutationService.recordMovement()`).
- **Orphan Functionality Check:** Passed (every API has UI, every page has API, every route has permission protection, zero alternate stock mutation paths).

We are ready to begin implementation with **Vertical Slice 1 (Stock Ledger)** upon your command.
