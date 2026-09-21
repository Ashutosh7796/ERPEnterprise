# PHASE 2 FULL-STACK EXECUTIVE APPROVAL PROPOSAL
## Phase 1 Frontend Audit & Phase 2 Full-Stack Manufacturing Architecture
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Submission Scope:** Phase 1 Frontend Audit + Phase 2 Backend & Frontend Design  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Status:** **SUBMITTED FOR HUMAN APPROVAL — NO CODE MODIFIED**  

---

## 1. Executive Summary & Review Gate

This document serves as the **single authoritative review document** for:
1. **Phase 1 Frontend Audit:** Aligning the verified Phase 1 inventory foundation backend with the React frontend ([`ERPSystem-web-react`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react)).
2. **Phase 2 Full-Stack Design:** Architecting Manufacturing, Bills of Materials, Production Work Orders, Shop-Floor Work-in-Progress (WIP), Cost Absorption, and Indian Statutory Job Work (CGST Section 143 & Rule 45).

```
+----------------------------------------------------------------------------------------------------+
|                                     CURRENT ROADMAP STATUS                                         |
+--------------------------+-----------------------+---------------------+---------------------------+
| Project Module           | Backend Status        | Frontend Status     | Implementation State      |
+--------------------------+-----------------------+---------------------+---------------------------+
| **Phase 1: Inventory**   | COMPLETE & VERIFIED   | AUDITED (Gaps Found)| Production Ready (Backend)|
| **Phase 2: Manufacturing**| RESEARCHED & DESIGNED | DESIGNED            | STOPPED (Awaiting Sign-off)|
| **Phase 3: Advanced MRP**| NOT STARTED           | NOT STARTED         | Awaiting Future Gate      |
+--------------------------+-----------------------+---------------------+---------------------------+
```

> [!IMPORTANT]
> **STRICT STOP ENFORCED:** Zero Java production code, database tables, migrations, or React components have been created or modified during this research and design cycle. Implementation remains completely halted until explicit human approval is granted.

---

## 2. Phase 1 Frontend Audit

### 2.1 What Currently Exists in the Frontend
- **Storage Locations / Depots ([`DepotList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/DepotList.tsx)):** Manages `erp_depot` (warehouse name, address, handling rates, enabled flag).
- **Stock Transfers ([`StockTransferList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/StockTransferList.tsx)):** Dispatches inter-warehouse movements (`subType="调拨出库"`) and prints delivery challans via [`DeliveryChallanPrint.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/DeliveryChallanPrint.tsx).
- **Miscellaneous Movements ([`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx)):** Generic Inbound (`其它入库`) and Generic Outbound (`其它出库`).
- **Stock Valuation Report ([`StockReport.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/report/pages/StockReport.tsx)):** Displays current stock and total inventory valuation aggregated by product.

### 2.2 What Is Missing in the Frontend
1. **Authoritative Stock Ledger UI:** The immutable append-only ledger (`erp_stock_ledger_entry`) created in Batch 1 has **zero UI presence**. Users cannot view running stock balances, incoming rates, or valuation changes over time.
2. **Storage Location Bin Management:** The `erp_depot_bin` table created in Batch 1 has no corresponding frontend screen or drawer. Aisles, racks, shelves, and bins cannot be configured.
3. **Physical Stocktake / Cycle Counting UI:** No cycle counting interface exists; discrepancies cannot be systematically audited against book stock.
4. **Stock Reservation & ATP Visibility:** Users see only total on-hand stock; soft-reserved stock allocated to open sales orders is invisible.

### 2.3 What Should NOT Be Changed in Phase 1
- **DO NOT change the Phase 1 Backend:** [`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java), the moving average formula, pessimistic row locking, deterministic lock ordering, tenant isolation, and atomic rollback are 100% verified (40/40 tests green) and must not be touched.
- **DO NOT change the core design system:** React components must preserve existing Ant Design 5 + Tailwind styling, spacing, typography, and modal conventions.

---

### 2.4 Proposed Phase 1 Frontend Fixes (Structured Analysis)

#### [P0 Fix] Stock Ledger Workspace & API
- **WHAT:** Implement `StockLedgerListPage.tsx` and backend endpoint `GET /stockLedger/list`.
- **WHY:** Exposes the authoritative immutable stock ledger (`erp_stock_ledger_entry`) with running balance (`qty_after_transaction`), incoming rate, valuation rate, and stock value delta.
- **WHERE:** Frontend: `ERPSystem-web-react/src/features/inventory/pages/StockLedgerList.tsx`. Backend: `StockLedgerController.java`.
- **DEPENDENCY:** Batch 1 `erp_stock_ledger_entry` table and `StockLedgerEntryMapper`.
- **BUSINESS VALUE:** Provides auditors, accountants, and warehouse managers with an indisputable chronological audit trail of every stock mutation.
- **RISK:** High query volume over millions of historical entries. *Mitigation:* Backed by compound index `idx_sle_mat_depot_time` with mandatory tenant and date-range filtering.
- **TEST:** Frontend render test checking running balance column; backend controller test verifying pagination and tenant isolation.
- **GRAPHIFY IMPACT:** Adds `StockLedgerController` as an upstream consumer of `StockLedgerEntryMapper`.

#### [P1 Fix] Warehouse Bin Management Drawer
- **WHAT:** Add a "Manage Bins" drawer in `DepotList.tsx` and backend endpoints `/depotBin/list`, `/depotBin/add`, `/depotBin/delete`.
- **WHY:** Allows warehouse supervisors to define sub-locations (aisle, rack, shelf, bin) and designate specialized zones (`WIP`, `FG`, `RAW_MATERIAL`).
- **WHERE:** Frontend: `DepotList.tsx`. Backend: `DepotBinController.java`.
- **DEPENDENCY:** Batch 1 `erp_depot_bin` table and `DepotBinMapper`.
- **BUSINESS VALUE:** Enables discrete location tracking required for shop-floor WIP staging in Phase 2.
- **RISK:** Low. Completely additive.
- **TEST:** Unit test verifying unique key constraint `(tenant_id, depot_id, bin_code)`.
- **GRAPHIFY IMPACT:** Connects `DepotBinController` to `DepotBinMapper`.

#### [P1 Fix] Authoritative Stock Flow Integration in Stock Report
- **WHAT:** Refactor the Stock Flow modal in `StockReport.tsx` to consume `/stockLedger/list?materialId={id}` instead of legacy `/depotItem/findDetailByDepotIdsAndMaterialId`.
- **WHY:** The legacy endpoint returns unversioned movements without running balances or valuation changes.
- **WHERE:** `ERPSystem-web-react/src/features/report/pages/StockReport.tsx`.
- **DEPENDENCY:** `StockLedgerController` (`GET /stockLedger/list`).
- **BUSINESS VALUE:** Eliminates discrepancy between the Stock Valuation report and the underlying general ledger.
- **RISK:** None. Read-only visualization improvement.
- **TEST:** UI integration test verifying that opening the modal displays accurate running balance history.
- **GRAPHIFY IMPACT:** Redirects frontend dependency from legacy `DepotItem` to authoritative `StockLedgerEntry`.

#### [P1 Fix] Physical Stocktake / Cycle Counting Workspace
- **WHAT:** Implement `StocktakeListPage.tsx` and `StocktakeModal.tsx` allowing cycle counting with Book Qty vs Physical Count variance calculation.
- **WHY:** Physical inventory adjustments currently occur via arbitrary "Other Inbound/Outbound" bills with zero variance tracking.
- **WHERE:** Frontend: `ERPSystem-web-react/src/features/inventory/pages/StocktakeList.tsx`.
- **DEPENDENCY:** Batch 1 `StockMutationService.recordMovement()` (`STOCK_SURPLUS` / `STOCK_LOSS`).
- **BUSINESS VALUE:** Enforces rigorous warehouse cycle counting and prevents unaccounted shrinkage.
- **RISK:** Low. Uses existing Batch 1 inventory mutation authority.
- **TEST:** End-to-end test verifying that approved variances update active stock and append running ledger entries.
- **GRAPHIFY IMPACT:** Leaf controller calling existing inventory service.

---

## 3. Phase 2 Full-Stack Manufacturing Design

### 3.1 Backend Architecture Changes (Structured Analysis)

#### [Change B2-01] Master Bill of Materials Engine (`BomService`)
- **WHAT:** Normalized master BOM header and line tables (`erp_bom_head`, `erp_bom_item`) with DFS circular dependency detection.
- **WHY:** Eliminates manual ad-hoc assembly bills; provides authoritative multi-level recipe templates with standard scrap percentages.
- **WHERE:** Backend: `com.jsh.erp.service.BomService`, `com.jsh.erp.controller.BomController`.
- **DEPENDENCY:** None (uses existing `Material` master data).
- **BUSINESS VALUE:** Guarantees standardized production formulas and accurate material requirements.
- **RISK:** Infinite recursion during multi-level BOM explosion. *Mitigation:* Algorithmic DFS recursion-stack cycle detection physically blocks circular references before commit.
- **TEST:** `BomCycleDetectionEnterpriseTest` (asserts that A $\rightarrow$ B $\rightarrow$ A throws `BusinessRunTimeException`).
- **GRAPHIFY IMPACT:** Introduces `BomService` as a clean, decoupled master data service.

#### [Change B2-02] Production Work Order State Machine (`WorkOrderService`)
- **WHAT:** State machine (`DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED`) with order snapshot freezing.
- **WHY:** Authorizes production runs against sales orders or forecast, locks BOM component requirements at confirmation, and tracks execution progress.
- **WHERE:** Backend: `com.jsh.erp.service.WorkOrderService`, `erp_work_order`, `erp_work_order_item`.
- **DEPENDENCY:** `BomService`, `StockMutationService`.
- **BUSINESS VALUE:** Full shop-floor production control; guarantees in-flight runs are insulated against subsequent master BOM changes.
- **RISK:** Race conditions during simultaneous confirmation. *Mitigation:* Pessimistic row locking on the work order record.
- **TEST:** `WorkOrderLifecycleIntegrationTest` (verifies all state transitions and snapshot integrity).
- **GRAPHIFY IMPACT:** Upstream orchestrator calling `StockMutationService`.

#### [Change B2-03] Shop-Floor Material Issue to WIP (`MaterialIssueService`)
- **WHAT:** 2-step physical material dispatch moving raw materials from Stores Bin to Shop-Floor WIP Bin (`zone='WIP'`).
- **WHY:** Incurred materials must remain physically visible on the factory floor and financially accounted for as Work-in-Progress assets.
- **WHERE:** Backend: `com.jsh.erp.service.MaterialIssueService`.
- **DEPENDENCY:** Batch 1 `StockMutationService.recordMovement()`, `erp_depot_bin`.
- **BUSINESS VALUE:** Accurate real-time tracking of components physically lying at assembly workstations.
- **RISK:** Negative stock in stores during concurrent issues. *Mitigation:* Deterministic multi-key locking via `acquireSortedRowLocks`.
- **TEST:** `MaterialIssueToWipAtomicityTest` (proves stores decrement, WIP bin increment, and `Dr WIP / Cr RM` GL posting).
- **GRAPHIFY IMPACT:** Upstream consumer of `StockMutationService` and GL posting services.

#### [Change B2-04] Production Completion & Cost Absorption (`ProductionReceiptService`)
- **WHAT:** Clears consumed raw materials from WIP, receives finished goods into stores, records actual scrap, and absorbs direct labor/overhead into inventory valuation.
- **WHY:** Implements Indian Ind AS-2 / AS-2 compliant valuation: Finished Goods unit cost = Consumed Materials (Moving Avg) + Direct Labor + Factory Overhead $-$ Realizable Scrap Value.
- **WHERE:** Backend: `com.jsh.erp.service.ProductionReceiptService`, `ManufacturingCostingService`.
- **DEPENDENCY:** Batch 1 `StockMutationService.recordMovement()`, General Ledger posting engine.
- **BUSINESS VALUE:** True manufactured cost accounting; eliminates distorted gross margins.
- **RISK:** Unbalanced absorption clearing accounts. *Mitigation:* Balanced double-entry voucher: `Dr 1401 FG Asset | Cr 1402 WIP Asset | Cr 5202 Labor Absorption | Cr 5203 Overhead Absorption`.
- **TEST:** `FinishedGoodsCostingAbsorptionTest` (validates exact mathematical cost absorption down to individual paisa).
- **GRAPHIFY IMPACT:** Integrates manufacturing with inventory valuation and General Ledger.

#### [Change B2-05] Indian Statutory Job Work Engine (`JobWorkService`)
- **WHAT:** Generates Rule 45/55 delivery challans (`JWC/2627/0001`), computes explicit statutory return due dates (Challan Date $+ 1\text{ year}$ for inputs, $+ 3\text{ years}$ for capital goods), manages job worker virtual bins, and generates Form GST ITC-04.
- **WHY:** Strictly complies with CGST Act Section 143; prevents the statutory trap where unreturned goods become deemed taxable supplies with backdated interest under Section 143(3),(4).
- **WHERE:** Backend: `com.jsh.erp.service.JobWorkService`, `erp_job_work_tracking`.
- **DEPENDENCY:** Existing `DeliveryChallanService`, `StockMutationService`.
- **BUSINESS VALUE:** 100% compliance with Indian GST laws; protects against severe statutory tax and interest liabilities.
- **RISK:** Expiry oversight by operational staff. *Mitigation:* Automated proactive aging alerts at 60, 30, and 0 days prior to statutory due date.
- **TEST:** `IndianJobWorkStatutoryAgingTest` (verifies 1-year input vs 3-year capital goods deadline calculation and alert triggering).
- **GRAPHIFY IMPACT:** Links `JobWorkService` with `DeliveryChallanService`.

---

### 3.2 Frontend Architecture Changes (Structured Analysis)

#### [Change F2-01] Manufacturing Workspace & Navigation
- **WHAT:** Add dedicated **Manufacturing** domain module to [`Sidebar.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/layouts/MainLayout/Sidebar.tsx) and register routes in [`router.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/app/router.tsx).
- **WHY:** Groups discrete manufacturing capabilities logically instead of scattering them across generic inventory screens.
- **WHERE:** `Sidebar.tsx`, `router.tsx`.
- **STRUCTURE:**
  ```
  MANUFACTURING (/manufacturing_domain)
  ├── Manufacturing Dashboard (/manufacturing/dashboard)
  ├── Bills of Materials (BOM) (/manufacturing/bom)
  ├── Production Work Orders (/manufacturing/work_orders)
  ├── Shop-Floor Material Issue (/manufacturing/material_issue)
  └── Indian Job Work (Rule 45) (/manufacturing/job_work)
  ```
- **DEPENDENCY:** Phase 2 backend controllers.
- **BUSINESS VALUE:** Intuitive, enterprise-grade navigation tailored to production managers and shop-floor supervisors.
- **RISK:** None. Standard routing extension.
- **TEST:** Route navigation and RBAC visibility tests.

#### [Change F2-02] BOM Catalog & Recipe Editor
- **WHAT:** Implement `BomListPage.tsx`, `BomModal.tsx`, and `BomExplosionTree.tsx`.
- **WHY:** Enables production engineers to define standard output quantities, add component line items with scrap %, and visually preview recursive indented sub-assembly trees.
- **WHERE:** `ERPSystem-web-react/src/features/manufacturing/pages/BomListPage.tsx`.
- **DEPENDENCY:** Backend `/bom/*` APIs.
- **BUSINESS VALUE:** Error-free formula authoring with immediate visual feedback on sub-assembly structures.
- **RISK:** Low.
- **TEST:** Jest component test verifying form validation, line item additions, and cycle detection error banner.

#### [Change F2-03] Work Order Manager & Shop-Floor Tracking
- **WHAT:** Implement `WorkOrderListPage.tsx` and `WorkOrderModal.tsx` with dynamic status-derived action buttons.
- **WHY:** Allows supervisors to monitor order progress (`completed_qty / planned_qty`), confirm draft orders, and trigger shop-floor issue/receipt dialogs.
- **WHERE:** `ERPSystem-web-react/src/features/manufacturing/pages/WorkOrderListPage.tsx`.
- **DEPENDENCY:** Backend `/workOrder/*` APIs.
- **BUSINESS VALUE:** Real-time visibility into active factory runs.
- **RISK:** Low.
- **TEST:** Component test verifying button rendering according to backend status (`CONFIRMED` $\rightarrow$ Issue button; `IN_PROGRESS` $\rightarrow$ Complete button).

#### [Change F2-04] Material Pick List & Shop-Floor Issue Dialog
- **WHAT:** Implement `MaterialIssueModal.tsx`.
- **WHY:** Stores keepers require an interactive pick list showing required component quantities versus real-time available stock in raw material stores before dispatching to WIP.
- **WHERE:** `ERPSystem-web-react/src/features/manufacturing/components/MaterialIssueModal.tsx`.
- **DEPENDENCY:** Backend `/workOrder/issueMaterial` API.
- **BUSINESS VALUE:** Eliminates stockouts on the shop floor; prevents unauthorized material over-issues.
- **RISK:** Low.
- **TEST:** UI test verifying that insufficient stock prompts clear warning.

#### [Change F2-05] Indian Job Work Cockpit & Section 143 Aging
- **WHAT:** Implement `JobWorkChallanListPage.tsx` and `JobWorkAgingPage.tsx`.
- **WHY:** Indian compliance officers must monitor materials lying with external job workers, track days remaining towards statutory due dates, generate Rule 55 delivery challans with E-Way Bills, and export Form GST ITC-04.
- **WHERE:** `ERPSystem-web-react/src/features/manufacturing/pages/JobWorkAgingPage.tsx`.
- **DEPENDENCY:** Backend `/jobWork/*` APIs.
- **BUSINESS VALUE:** Eliminates GST non-compliance risks and interest penalties under Section 143.
- **RISK:** Low.
- **TEST:** UI test verifying countdown badge colors (Green $>60$ days, Orange $30-60$ days, Red $<30$ days, Flashing Red = Overdue).

---

## 4. Master Authority & Integration Map

```
               [ FRONTEND LAYER (Presentation & Navigation) ]
                      React 18 SPA (ERPSystem-web-react)
               ├── BomListPage & BomModal
               ├── WorkOrderListPage & WorkOrderModal
               ├── MaterialIssueModal (Pick List)
               └── JobWorkAgingPage (Section 143 Cockpit)
                                      │
                                      ▼ (REST APIs via JSON)
               [ MANUFACTURING ORCHESTRATION LAYER (Backend) ]
               ├── BomService (Cycle Detection, Revisions)
               ├── WorkOrderService (State Machine, Snapshot Freezing)
               ├── MaterialIssueService (Pick Lists, Stores -> WIP)
               ├── ProductionReceiptService (WIP -> FG, Scrap Logging)
               ├── ManufacturingCostingService (Ind AS-2 Moving Avg Absorption)
               └── JobWorkService (Rule 45 Challans, Section 143 Aging, ITC-04)
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
[ PHYSICAL INVENTORY AUTHORITY ]              [ FINANCIAL ACCOUNTING AUTHORITY ]
    StockMutationService                          SalesAccountingPostingService
  - Pessimistic Row Locking                     - Double-Entry GL Journals
  - Weighted Moving Average                     - Dr WIP Asset / Cr RM Stores
  - Immutable Stock Ledger                      - Dr FG Asset / Cr WIP Asset
  - Atomic Dual-Write Protection                - Cr Labor/Overhead Absorption
               │                                             │
               ▼                                             ▼
  erp_material_current_stock                    erp_gl_journal_entry
  erp_stock_ledger_entry                        erp_gl_journal_line
  erp_depot_bin (zone='WIP')                    Chart of Accounts (1401, 1402, 5202)
```

---

## 5. Summary of Candidate Database Tables

Exactly **5 normalized tables** will be created upon implementation approval:

| Table Name | Core Purpose | Primary Constraints & Indexes |
| :--- | :--- | :--- |
| `erp_bom_head` | Master recipe header per finished good | `UK(tenant_id, bom_code)`, `INDEX(tenant_id, material_id, status)` |
| `erp_bom_item` | Component materials, quantities, scrap % | `INDEX(tenant_id, bom_id)`, `INDEX(tenant_id, component_material_id)` |
| `erp_work_order` | Production order lifecycle & scheduling | `UK(tenant_id, order_number)`, `INDEX(tenant_id, status)` |
| `erp_work_order_item` | Frozen order BOM snapshot & consumption tracking | `INDEX(tenant_id, work_order_id)`, `INDEX(tenant_id, component_material_id)` |
| `erp_job_work_tracking` | Indian Section 143 statutory aging & reconciliation | `INDEX(tenant_id, statutory_due_date, status)`, `INDEX(tenant_id, job_worker_id)` |

---

## 6. What Is Explicitly Excluded (Karpathy Filter)

To ensure high engineering velocity, avoid overengineering, and prevent operational failure in Indian SME manufacturing environments, the following are **strictly excluded**:
1. **NO Finite Capacity Scheduling (APS):** No complex heuristic constraint solvers. Simple start/due date scheduling fulfills 100% of discrete production needs.
2. **NO Client-Side Gantt Drag-and-Drop Engines:** Tabular work order management provides faster data entry and zero external library bloat.
3. **NO Generic BPMN Engines:** Native Java enum state machines provide complete type safety and zero runtime overhead.
4. **NO Machine Learning / Predictive Maintenance:** Purely speculative.
5. **NO Parallel Inventory Mutation Engine:** Manufacturing will **never** have its own inventory mutation or valuation code. It consumes Batch 1 exclusively.

---

## 7. Phased Implementation Dependency Order

```
[Phase 2A: BOM Master Data & Cycle Detection]
              │
              ▼
[Phase 2B: Work Order Engine & Snapshot Freezing]
              │
              ▼
[Phase 2C: Material Issue & Shop-Floor WIP Tracking]
              │
              ▼
[Phase 2D: Production Completion & Cost Absorption]
              │
              ▼
[Phase 2E: Indian Job Work & Section 143 Tracking]
              │
              ▼
[Phase 2F: React Frontend Workspaces & Integration Verification]
```

---

## 8. Final Expected State & Delivery Gate

```
====================================================================================================
                                      DELIVERY GATE ENFORCED
====================================================================================================
  PHASE 1 BACKEND:  COMPLETE & VERIFIED (FINAL PASS)
  PHASE 1 FRONTEND: AUDITED & GAPS IDENTIFIED (P0/P1/P2 ROADMAP DEFINED)
  PHASE 2 BACKEND:  RESEARCHED & ARCHITECTED (DESIGN READY)
  PHASE 2 FRONTEND: RESEARCHED & ARCHITECTED (DESIGN READY)
  PHASE 3:          NOT STARTED
====================================================================================================
```

> [!IMPORTANT]
> ### HARD STOP ACTIVATED
> In accordance with the instructions:
> - **Zero production code has been modified.**
> - **Execution is halted.**
> - **Awaiting your explicit Human Approval of this proposal before proceeding to Phase 2 implementation.**
