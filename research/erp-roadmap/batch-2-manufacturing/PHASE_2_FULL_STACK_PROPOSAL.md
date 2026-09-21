# PHASE 2 FULL-STACK PROPOSAL
## Manufacturing, Production Orders, Work-in-Progress & Indian Job Work
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Delivery Scope:** Full-Stack Architecture (Backend Services + React Frontend)  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Status:** **PROPOSED — AWAITING HUMAN APPROVAL**  

---

## 1. Current Backend State

- **Phase 1 Complete:** Batch 1 established the authoritative physical inventory mutation gateway ([`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java)), running immutable ledger (`erp_stock_ledger_entry`), storage location bin topology (`erp_depot_bin`), deterministic row-level mutex (`acquireSortedRowLocks`), weighted moving average valuation, perpetual COGS GL posting, and fail-closed opening balance reconciliation.
- **Legacy Manufacturing Code:** Limited to primitive kit assembly bills (`type='其它'`, `sub_type='组装单'` / `'拆卸单'`) in [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1200). Mutates stock instantaneously without formulas, work orders, or WIP tracking.
- **Reusable Statutory Artifacts:** [`DeliveryChallanService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DeliveryChallanService.java) already manages `erp_delivery_challan` with `JOB_WORK` challan types and E-Way Bill payloads; [`DocumentNumberService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentNumberService.java) already generates `JWC/` job-work sequence numbers.

---

## 2. Current Frontend State

- **Application Architecture:** React 18 SPA (`ERPSystem-web-react`) styled with Ant Design 5 and Tailwind CSS.
- **Existing Inventory Pages:** [`DepotList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/DepotList.tsx), [`StockTransferList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/StockTransferList.tsx), [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx), and [`StockReport.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/report/pages/StockReport.tsx).
- **Frontend Gaps:**
  - Zero screens exist for Bills of Materials, Production Work Orders, or Indian Job Work.
  - The legacy assembly screen (`SpecialBillList.tsx`) routes to `BillModal.tsx` which lacks the `material_type` column, making assembly unusable in the React UI.
  - Phase 1's Stock Ledger (`erp_stock_ledger_entry`) and Bins (`erp_depot_bin`) have no frontend presence.

---

## 3. Manufacturing Domain Gaps

1. **BOM Master Missing:** No recipe templates; ratios entered manually on every transaction.
2. **Shop-Floor WIP Missing:** Materials cannot be staged or issued in advance of completion.
3. **Yield & Scrap Missing:** Process loss and defective trimmings are unrecorded.
4. **Cost Absorption Missing:** Finished goods unit cost ignores direct labor and factory overhead.
5. **Job Work Statutory Aging Missing:** No tracking of Section 143 1-year input or 3-year capital goods return limits.

---

## 4. Graphify Analysis

- **Baseline Knowledge Graph:** Synchronized at **21,669 nodes**, **57,441 edges**, and **822 communities**.
- **Structural Integration Path:**
  ```
  React Frontend -> Manufacturing Controller -> Manufacturing Service -> StockMutationService -> Stock Ledger + Current Stock
  ```
- **Coupling State:** Manufacturing services will reside as clean upstream consumers of Batch 1's `StockMutationService` and `DeliveryChallanService`. Zero circular package dependencies.

---

## 5. MetaFresh Comparison

- **BOM Snapshot:** Like MetaFresh's `PP_Order_BOMLine`, our `erp_work_order_item` copies master BOM lines upon order confirmation. In-flight production runs are strictly insulated against subsequent master BOM edits.
- **WIP Accounting:** MetaFresh uses abstract financial locators; we use a dedicated physical WIP bin (`zone='WIP'`) inside the plant depot, preserving real shop-floor stock visibility alongside `Dr WIP / Cr RM Stores` GL posting.
- **What We Do NOT Copy:** MetaFresh's complex BPMN workflow engine and finite capacity APS scheduler are explicitly rejected to avoid operational failure in Indian SME environments.

---

## 6. ERPNext Comparison

- **Unified Stock Movement:** Like ERPNext's `Stock Entry`, all physical movements in our manufacturing flow execute exclusively through Batch 1's `StockMutationService.recordMovement()`.
- **BOM Multi-Level Explosion:** DFS cycle detection prevents circular sub-assembly loops during explosion.
- **What We Do NOT Copy:** ERPNext's complex Gantt capacity scheduling and monolithic stock controllers.

---

## 7. Indian ERP Requirements

```
+----------------------------------------------------------------------------------------------------+
|                                    REQUIREMENT CLASSIFICATION                                      |
+--------------------------+-------------------------------------------------------------------------+
| Category                 | Specific Requirements & Legal / Operational Basis                       |
+--------------------------+-------------------------------------------------------------------------+
| **[STATUTORY]**          | 1. CGST Section 143(1): Inputs returned within 1 year; Capital goods   |
|                          |    within 3 years (stored as explicit statutory_due_date).                 |
|                          | 2. CGST Rule 55: Serialized 16-char delivery challans (JWC/2627/0001).     |
|                          | 3. CGST Rule 45: Form GST ITC-04 biannual statement generation.            |
|                          | 4. CGST Rule 138: E-Way Bill mandatory for inter-state job work.          |
+--------------------------+-------------------------------------------------------------------------+
| **[BUSINESS]**           | 1. Job worker raw material stock tracking (virtual bins).               |
|                          | 2. Job work processing charge invoice (SAC 9988) capitalized into FG.    |
|                          | 3. Mass-balance scrap reconciliation (inputs vs output + trimmings).    |
+--------------------------+-------------------------------------------------------------------------+
| **[ERP CONVENTION]**     | 1. 2-step material issue (Stores -> WIP Bin, WIP Bin -> Consumed).     |
|                          | 2. Dedicated shop-floor WIP bin (zone='WIP') in plant depot.            |
+--------------------------+-------------------------------------------------------------------------+
| **[OPTIONAL]**           | Multi-tier job work forwarding (Job worker 1 -> Job worker 2) deferred. |
+--------------------------+-------------------------------------------------------------------------+
```

---

## 8. Backend Architecture

### Architectural Layers:
1. **Controller Layer:** `BomController`, `WorkOrderController`, `JobWorkController`. Enforce authentication, extract `UserContext`, validate input DTOs, and delegate to services.
2. **Domain Service Layer:**
   - `BomService`: Manages master BOMs, revisions, and DFS cycle detection.
   - `WorkOrderService`: Manages production state machine, BOM freezing, and reservations.
   - `MaterialIssueService`: Orchestrates 2-step Stores $\rightarrow$ WIP material movements.
   - `ProductionReceiptService`: Orchestrates WIP $\rightarrow$ FG completion, scrap logging, and cost absorption.
   - `JobWorkService`: Manages Rule 45 challans, Section 143 statutory aging, and ITC-04 statements.
3. **Authoritative Downstream Gateways:**
   - **Physical Inventory:** Batch 1 `StockMutationService.recordMovement(StockMovementRequest)`.
   - **General Ledger:** Existing `SalesAccountingPostingService` / GL journal services.

---

## 9. Frontend Architecture

### Technology & Conventions:
- **Framework:** React 18, TypeScript, Ant Design 5, Tailwind CSS, Lucide / Ant Design Icons.
- **State Management:** Zustand (`useAppStore`, `usePermissionStore`).
- **Data Fetching:** HTTP client (`@core/api/client`) with automatic `X-Access-Token` injection.
- **Directory Structure:** `ERPSystem-web-react/src/features/manufacturing/`:
  - `pages/`: `BomListPage.tsx`, `WorkOrderListPage.tsx`, `JobWorkChallanListPage.tsx`, `JobWorkAgingPage.tsx`.
  - `components/`: `BomModal.tsx`, `BomExplosionTree.tsx`, `WorkOrderModal.tsx`, `MaterialIssueModal.tsx`, `ProductionReceiptModal.tsx`.
  - `api/`: `manufacturingApi.ts`.

---

## 10. Authority Map

```
+--------------------------------------------------------------------------------------------------------------------+
|                                              PHASE 2 AUTHORITY MATRIX                                              |
+--------------------------+-----------------------+-----------------------------+-----------------------------------+
| Capability               | Owning Service        | Database Entity Written     | Downstream Consumers              |
+--------------------------+-----------------------+-----------------------------+-----------------------------------+
| Master BOM               | `BomService`          | `erp_bom_head`, `erp_bom_item` | WorkOrderService, MRP             |
| Production Work Orders   | `WorkOrderService`    | `erp_work_order`            | MaterialIssueService, Costing     |
| Order BOM Snapshot       | `WorkOrderService`    | `erp_work_order_item`       | MaterialIssueService, Shop Floor  |
| Material Issue to WIP    | `MaterialIssueService`| `erp_work_order_item`       | StockMutationService, GL Asset    |
| Finished Goods Receipt   | `ProductionReceipt...`| `erp_work_order`            | StockMutationService, Valuation   |
| Manufacturing Costing    | `ManufacturingCost...`| `erp_work_order`, GL Lines  | StockMutationService, GL Journal  |
| Indian Job Work          | `JobWorkService`      | `erp_job_work_tracking`     | DeliveryChallanService, ITC-04    |
| Physical Stock Mutation  | `StockMutationService`| `erp_material_current_stock`| All Manufacturing Moves           |
| Stock Ledger Audit       | `StockMutationService`| `erp_stock_ledger_entry`    | Financial & Inventory Audits      |
+--------------------------+-----------------------+-----------------------------+-----------------------------------+
```

---

## 11. API Contracts

### 11.1 BOM Endpoints
- `POST /bom/create`: Accepts `{ bomCode, materialId, outputQuantity, isDefault, items: [{ componentMaterialId, quantity, scrapPercent }] }`. Returns `{ code: 200, data: { id } }`. Throws `400` on circular dependency.
- `GET /bom/get/{id}`: Returns complete BOM header and line items.
- `GET /bom/explode/{materialId}`: Returns recursive indented component tree.

### 11.2 Work Order Endpoints
- `POST /workOrder/create`: Accepts `{ bomId, materialId, depotId, plannedQty, startDate, dueDate }`. Returns `{ code: 200, data: { id, orderNumber } }`.
- `POST /workOrder/confirm/{id}`: Freezes snapshot into `erp_work_order_item`, soft-reserves stock, transitions status to `CONFIRMED`.
- `POST /workOrder/issueMaterial`: Accepts `{ workOrderId, items: [{ componentMaterialId, issueQty, fromBinId }] }`. Invokes `StockMutationService` (Stores $\rightarrow$ WIP Bin), sets status to `IN_PROGRESS`.
- `POST /workOrder/complete`: Accepts `{ workOrderId, completedQty, scrapQty, scrapReason, directLaborCost, overheadCost }`. Clears WIP, receives FG into stores at computed moving average cost, posts GL absorption vouchers, sets status to `COMPLETED`.

### 11.3 Indian Job Work Endpoints
- `POST /jobWork/createChallan`: Accepts `{ workOrderId, jobWorkerId, goodsType: 'INPUTS'|'CAPITAL_GOODS', items: [...] }`. Generates `JWC/` delivery challan, calculates `statutory_due_date` ($+1\text{ yr}$ or $+3\text{ yrs}$), transfers stock to job worker virtual bin.
- `GET /jobWork/agingReport`: Returns outstanding items, days remaining, and Section 143 expiry alerts.

---

## 12. Database Model

Five normalized tables migrated via `schema_batch2_manufacturing.sql`:
1. `erp_bom_head`: Master formula header (`tenant_id`, `bom_code`, `material_id`, `output_quantity`, `is_default`, `status`).
2. `erp_bom_item`: BOM components (`tenant_id`, `bom_id`, `component_material_id`, `quantity`, `scrap_percent`, `issue_type`).
3. `erp_work_order`: Production order (`tenant_id`, `order_number`, `bom_id`, `material_id`, `depot_id`, `wip_bin_id`, `planned_qty`, `completed_qty`, `status`).
4. `erp_work_order_item`: Order snapshot & tracking (`tenant_id`, `work_order_id`, `component_material_id`, `required_qty`, `issued_qty`, `consumed_qty`).
5. `erp_job_work_tracking`: Statutory Indian compliance (`tenant_id`, `challan_id`, `job_worker_id`, `goods_type`, `statutory_due_date`, `sent_quantity`, `returned_quantity`, `status`).

---

## 13. Sidebar & Navigation Design

A dedicated **Manufacturing** domain module will be added to `Sidebar.tsx`:

```
MANUFACTURING (/manufacturing_domain)
├── Manufacturing Dashboard (/manufacturing/dashboard)
├── Bills of Materials (BOM) (/manufacturing/bom)
├── Production Work Orders (/manufacturing/work_orders)
├── Shop-Floor Material Issue (/manufacturing/material_issue)
└── Indian Job Work (Rule 45) (/manufacturing/job_work)
      ├── Outward Delivery Challans
      ├── Section 143 Statutory Aging
      └── Form GST ITC-04 Register
```

---

## 14. Screen & Workspace Design

1. **`BomListPage.tsx` & `BomModal.tsx`:** Filter by product/code; modal provides header fields, component line grid with scrap %, and indented explosion preview drawer.
2. **`WorkOrderListPage.tsx` & `WorkOrderModal.tsx`:** Order tracking grid with status badges (`DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`), progress bars, and lifecycle buttons.
3. **`MaterialIssueModal.tsx`:** Shop-floor pick list displaying required vs available stock in stores with one-click issue to WIP bin.
4. **`ProductionReceiptModal.tsx`:** Output receipt dialog capturing actual finished goods quantity, scrap trimmings, direct labor, and absorbed overhead.
5. **`JobWorkAgingPage.tsx`:** Section 143 compliance cockpit displaying countdown days to statutory due date, high-severity alerts for overdue materials, and ITC-04 export.

---

## 15. Workflow & State-Machine Mapping

```
               [ DRAFT ] ──────────► [ CONFIRMED ] ──────────► [ IN_PROGRESS ]
                   │                       │                          │
                   │ (Cancel)              │ (Cancel)                 ▼
                   ▼                       ▼                    [ COMPLETED ]
              [ CANCELLED ]           [ CANCELLED ]                   │
                                                                      ▼
                                                                  [ CLOSED ]
```

- **Frontend Button Derivation:**
  - `DRAFT`: Shows `[Edit]`, `[Confirm Order]`, `[Cancel]`.
  - `CONFIRMED`: Shows `[Issue Materials to WIP]`, `[Send to Job Worker]`, `[Cancel]`.
  - `IN_PROGRESS`: Shows `[Issue Additional Materials]`, `[Complete Production]`.
  - `COMPLETED`: Shows `[Close Order]`, `[View Cost Breakdown]`.
  - `CLOSED` / `CANCELLED`: Terminal state; read-only view.

---

## 16. Permission Mapping

Integrated into existing RBAC (`usePermissionStore` & `RoleList.tsx`):
- `MANUFACTURING_BOM_VIEW` / `MANUFACTURING_BOM_EDIT`: Access to BOM catalog.
- `MANUFACTURING_WO_CREATE` / `MANUFACTURING_WO_CONFIRM`: Work order creation and authorization.
- `MANUFACTURING_MATERIAL_ISSUE`: Stores dispatch to WIP bin.
- `MANUFACTURING_RECEIPT_POST`: Shop-floor production completion and scrap logging.
- `MANUFACTURING_JOB_WORK_DISPATCH`: Rule 45 challan generation and Section 143 monitoring.

---

## 17. Error Handling

- **BOM Circular Dependency:** Returns clear validation error: `"Circular BOM dependency detected: Finished Good A -> Component B -> Finished Good A"`.
- **Insufficient Raw Material Stock:** Returns `"Material [Item Name] stock insufficient in Stores: Required 100, Available 65"`.
- **Concurrent Issue / Race Condition:** Batch 1 sorted locking prevents deadlocks; UI prompts user to retry.
- **Section 143 Expiry Trap:** Dashboard flags red alert: `"Challan JWC/2526/0010 expires in 15 days. Unreturned materials will be deemed a taxable supply under Section 143(3)"`.

---

## 18. Inventory Integration

- **Stores $\rightarrow$ WIP:** Calls `StockMutationService.recordMovement` with voucher type `MANUFACTURING_ISSUE`.
- **WIP $\rightarrow$ Consumed:** Calls `StockMutationService.recordMovement` with voucher type `MANUFACTURING_CONSUMPTION`.
- **WIP $\rightarrow$ FG Stores:** Calls `StockMutationService.recordMovement` with voucher type `MANUFACTURING_RECEIPT` at calculated moving average unit cost.
- **Zero SQL Bypass:** Manufacturing code possesses zero direct write queries against inventory tables.

---

## 19. Accounting Integration

- **Material Issue:**
  $$\text{Debit: 1402 Work-in-Progress Asset} \quad | \quad \text{Credit: 1401 Raw Material Stores Asset}$$
- **Production Completion & Overhead Absorption:**
  $$\text{Debit: 1401 Finished Goods Asset}$$
  $$\text{Credit: 1402 Work-in-Progress Asset}$$
  $$\text{Credit: 5202 Direct Labor Absorption Clearing}$$
  $$\text{Credit: 5203 Factory Overhead Absorption Clearing}$$

---

## 20. Indian Job Work Integration

- Outward movement generates statutory Rule 55 delivery challan via `DeliveryChallanService` (`JWC/2627/0001`) with reason `"Job Work"`.
- Transfers stock from Stores to Job Worker Virtual Bin (`JW-LOC-<SupplierID>`).
- Tracks exact statutory return date ($+1\text{ year}$ for inputs, $+3\text{ years}$ for capital goods).
- Form GST ITC-04 generator compiles outward challan vs return receipt quantities.

---

## 21. Migration Strategy

1. Apply `schema_batch2_manufacturing.sql` into MySQL `erp_system_db`.
2. Seed default WIP storage bin (`bin_code='WIP-FLOOR'`, `zone='WIP'`) for every manufacturing warehouse in `erp_depot_bin`.
3. Preserve legacy `组装单` for simple kitting; new production orders use formal `WorkOrderService`.

---

## 22. Test Strategy

1. `BomCycleDetectionEnterpriseTest`: DFS cycle detection on direct and deep circular BOMs.
2. `WorkOrderLifecycleIntegrationTest`: Full state machine lifecycle and snapshot freezing.
3. `MaterialIssueToWipAtomicityTest`: Physical transfer to WIP bin and atomic GL posting.
4. `FinishedGoodsCostingAbsorptionTest`: Moving average unit cost calculation and absorption vouchers.
5. `IndianJobWorkStatutoryAgingTest`: Rule 45 challans, statutory due dates, and Section 143 alerts.
6. `FullManufacturingRegressionTest`: 100% green pass across all existing Batch 1, sales, procurement, and accounting suites.

---

## 23. Graphify Impact

- Adds ~40 structural nodes (services, controllers, DTOs, mappers).
- All manufacturing nodes integrate downstream from `StockMutationService`.
- Zero circular package dependencies.

---

## 24. What Should NOT Be Built (Karpathy Filter)

1. **NO Finite Capacity Scheduling (APS):** Too complex and brittle for real-world SME manufacturing.
2. **NO Client-Side Gantt Drag-and-Drop Engines:** Clean tabular lists with start/due dates satisfy 100% of needs.
3. **NO Generic BPMN Engines:** Type-safe Java enum state machine used.
4. **NO Machine Learning / Predictive Maintenance:** Purely speculative.
5. **NO Parallel Inventory Mutation Engine:** Manufacturing consumes Batch 1 exclusively.

---

## 25. Phased Implementation Dependency Order

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
[Phase 2F: React Frontend Workspaces & Integration Testing]
```

---

## 26. Risks & Mitigations

| Risk | Severity | Mitigation |
| :--- | :-: | :--- |
| **BOM In-Flight Mutation Drift** | High | Work order confirmation freezes component snapshot into `erp_work_order_item`. |
| **Section 143 Deemed Supply Tax Penalty** | High | Proactive alerts at 60/30/0 days before statutory 1-year / 3-year deadlines. |
| **Negative WIP Balance on Partial Runs** | Medium | Consumed materials deducted proportionally from WIP bin with strict non-negative gate. |
| **Multi-Item Pick List Deadlocks** | Medium | Batch 1 `acquireSortedRowLocks` sorts row locks lexicographically before execution. |

---

## 27. Acceptance Criteria

1. **BOM Cycle Block:** Circular BOM creation is physically blocked and returns descriptive validation errors.
2. **Frozen Snapshot:** Modifying an active BOM has zero impact on existing confirmed work orders.
3. **Physical Stock Integrity:** All manufacturing stock movements execute exclusively through `StockMutationService.recordMovement()`.
4. **WIP Visibility:** Materials in process remain physically visible in the shop-floor WIP bin and financially visible in GL Account 1402.
5. **Statutory Job Work:** Goods sent to job workers generate Rule 55 challans with explicit statutory due dates (1 year for inputs, 3 years for capital goods).
6. **Zero Regression:** 100% pass rate across all 12 existing test suites (40 tests).
