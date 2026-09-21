# PHASE 2 EXECUTIVE PROPOSAL
## Manufacturing, Production Orders, Work-in-Progress & Indian Job Work
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Delivery Scope:** Phase 2 (Batch 2: Manufacturing Foundation & Subcontracting)  
**Status:** **RESEARCHED & PROPOSED — AWAITING HUMAN APPROVAL**  
**Date:** September 1, 2026  

---

## 1. Current-State Findings

1. **Primitive Kit Assembly Only:** The codebase currently possesses no formal discrete manufacturing capabilities. It contains only an ad-hoc, single-stage kit assembly and disassembly mechanism implemented as a bill subtype (`type='其它'`, `sub_type='组装单'` / `'拆卸单'`) in `DepotHead` and `DepotItem`.
2. **Instantaneous Stock Mutation:** In [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1200), saving an assembly bill immediately increments the parent assembly (`material_type='组合件'`) and decrements component items (`material_type='普通子件'`) in a single database transaction.
3. **No BOM Master Data:** Every assembly bill requires the operator to manually pick the parent item and each child component from scratch. There is no formula template, no standard batch quantity, no revision tracking, and no scrap factor.
4. **Zero Shop-Floor Work-in-Progress (WIP):** Components cannot be staged or issued to production in advance. Production runs spanning days or weeks cannot be represented in inventory or accounting.
5. **Zero Labor or Overhead Absorption:** Assembled unit cost is either manually typed or zero. Machine depreciation, electricity, operator labor, and factory overhead are not absorbed into finished goods inventory value.
6. **Reusable Compliance Artifacts Exist:** Earlier phases implemented [`DeliveryChallanService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DeliveryChallanService.java) (with `JOB_WORK` challan types, E-Way Bill payloads, and vehicle tracking) and [`DocumentNumberService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentNumberService.java) (with `JWC/` job-work sequence numbering). These provide solid, reusable foundations for Indian statutory job work.

---

## 2. Graphify Findings

- **Knowledge Graph Baseline:** Synchronized at **21,669 nodes**, **57,441 edges**, and **822 communities**.
- **Batch 1 Interfaces to be Consumed by Manufacturing:**
  1. [`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java): The single authoritative physical inventory mutation gateway. Exposes `recordMovement(StockMovementRequest)` and returns `StockMutationResult`.
  2. `erp_stock_ledger_entry`: Running balance immutable ledger. Receives records for `MANUFACTURING_ISSUE`, `MANUFACTURING_CONSUMPTION`, and `MANUFACTURING_RECEIPT`.
  3. `erp_depot_bin`: Storage location topology. WIP will be modeled as a dedicated bin (`zone='WIP'`, `bin_code='WIP-FLOOR'`) within the plant depot.
  4. `acquireSortedRowLocks(tenantId, keys)`: Batch 1 multi-key mutex used by manufacturing to prevent circular wait deadlocks across multi-item material issues.
- **Architectural Boundary:** Manufacturing services reside as upstream operational orchestrators. Manufacturing **never** directly updates `erp_material_current_stock` or `erp_stock_ledger_entry`.

---

## 3. MetaFresh Comparison

| Concept | MetaFresh Reference | Our Target Architecture | Key Takeaway / Difference |
| :--- | :--- | :--- | :--- |
| **BOM Template** | `PP_Product_BOM` | `erp_bom_head` | Clean normalized master BOM separate from operations. |
| **Order Snapshot** | `PP_Order_BOMLine` | `erp_work_order_item` | Copying master BOM lines to order snapshot on confirmation protects in-flight runs against master changes. |
| **Routing / Work Center** | `AD_Workflow` / `AD_WF_Node` | Lightweight Workstation entity | MetaFresh uses a complex BPMN workflow engine; we adopt a simple sequence of operations with hourly absorption rates. |
| **WIP Accounting** | Virtual financial locator | Physical WIP Bin + GL Asset | Gives shop-floor managers physical visibility of parts in process while maintaining clean `Dr WIP / Cr RM Stores` accounting. |
| **Subcontracting** | External workflow node | Indian Rule 45 Delivery Challan | MetaFresh uses generic German subcontract POs; we enforce Indian GST Rule 45/55 delivery challans with Section 143 return tracking. |

---

## 4. ERPNext Comparison

| Concept | ERPNext Reference | Our Target Architecture | Key Takeaway / Difference |
| :--- | :--- | :--- | :--- |
| **BOM & Explosions** | `BOM` (Exploded items) | `erp_bom_head` & `erp_bom_item` | DFS cycle detection prevents circular BOM loops during explosion. |
| **Work Order Lifecycle** | `Work Order` | `erp_work_order` | State machine: `DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED`. |
| **Stock Movement** | `Stock Entry` | Batch 1 `StockMutationService` | ERPNext funnels manufacturing through Stock Entry; we funnel all movements through Batch 1's `recordMovement`. |
| **WIP Representation** | `wip_warehouse` | Dedicated WIP Bin (`erp_depot_bin`) | Bin-level WIP avoids creating redundant warehouse legal entities. |
| **Job Cards & Scheduling** | `Job Card` & Gantt chart | Standard workstation rates | We deliberately reject ERPNext's complex Gantt capacity scheduling to prevent operational failure in Indian SMEs. |

---

## 5. Indian Statutory Requirements

All requirements are strictly categorized into legal and operational tiers:

### 5.1 Statutory Tier (`[STATUTORY]`)
1. **CGST Act Section 143(1) — Mandatory Return Deadlines:**
   - Inputs and semi-finished goods must be returned within **1 year** from challan date.
   - Capital goods (dies, moulds, machinery) must be returned within **3 years** from challan date.
   - *Statutory Expiry Consequence (Sec 143(3),(4)):* Non-return is deemed a taxable supply on the date of the original challan, attracting GST + Section 50 interest from the original date. Software must record explicit `statutory_due_date` and alert at 60/30/0 days.
2. **CGST Rule 55 — Delivery Challan Particulars:**
   - 16-character serialized numbering (`JWC/2627/0001`).
   - Consignor/consignee GSTIN, HSN, quantity, taxable value, tax breakdown, and reason for transportation: **"Job Work"**.
3. **CGST Rule 45 — Form GST ITC-04:**
   - Periodic statutory reporting linking Outward Delivery Challans to Inward Receipts and scrap recovery.
4. **CGST Rule 138 — E-Way Bill:**
   - Mandatory for consignment value $> \text{₹}50,000$, and **mandatory irrespective of value for inter-state job work movements**.

### 5.2 Business Requirement Tier (`[BUSINESS REQUIREMENT]`)
- Job worker stock tracking (knowing exact raw materials lying at each vendor).
- Job worker processing invoice (SAC 9988) entered via GST Purchase Invoice and capitalized into finished goods cost.
- Mass-balance scrap reconciliation (Inputs Sent vs Processed Goods + Trimmings Returned).

### 5.3 ERP Convention Tier (`[ERP CONVENTION]`)
- Virtual job worker storage bins (`JW-LOC-<SupplierID>`).
- 2-step material issue (Stores $\rightarrow$ WIP Bin, WIP Bin $\rightarrow$ Consumed).

### 5.4 Optional Tier (`[OPTIONAL]`)
- Multi-tier job work forwarding (Job worker 1 sending to Job worker 2) deferred to Phase 3.

---

## 6. Manufacturing Gaps

The current ERP lacks:
1. Multi-stage production tracking.
2. Shop-floor material staging and tracking.
3. Machine and labor capacity definition.
4. Batch-level production scheduling.
5. Work-order-linked quality inspection gates.

---

## 7. BOM Gaps

1. **No Master BOM Formula:** Bills of materials cannot be pre-configured for finished goods.
2. **No Multi-Level BOM Explosion:** Multi-tier sub-assemblies cannot be automatically indented.
3. **No Circular BOM Prevention:** Infinite loops cannot be detected.
4. **No Scrap Factor:** Normal process loss percentages cannot be factored into component planning.
5. **No Revision Control:** Engineering changes cannot be tracked.

---

## 8. Production Gaps

1. **No Work Order State Machine:** No concept of `RELEASED`, `IN_PROGRESS`, or `CLOSED`.
2. **No Component Reservations:** Raw materials cannot be soft-allocated to authorized work orders.
3. **No Material Pick Lists:** Stores personnel cannot generate picking slips for production issues.
4. **No Yield Tracking:** Actual production output cannot be compared against planned output.

---

## 9. WIP Gaps

1. **Zero WIP Visibility:** Inventory is either 100% raw material or 100% finished goods.
2. **No WIP Valuation:** Balance sheet cannot reflect in-process inventory value.
3. **No Shop-Floor Staging:** Materials issued to assembly benches are untracked.

---

## 10. Job Work Gaps

1. **No Rule 45 Delivery Challan Flow:** Job work shipments cannot be generated from production orders.
2. **No Statutory Due Date Monitoring:** System cannot track 1-year input or 3-year capital goods return limits.
3. **No Form GST ITC-04 Statement:** No capability to generate government return data.
4. **No Job Worker Stock Reconciliation:** Cannot track raw material balances held by external contractors.

---

## 11. Manufacturing Costing Gaps

1. **Zero Labor Absorption:** Direct worker labor cannot be added to product cost.
2. **Zero Factory Overhead Absorption:** Power, machine wear, and shop consumables cannot be absorbed.
3. **No Subcontract Service Capitalization:** Vendor labor invoices (SAC 9988) cannot be capitalized into item value.
4. **No Scrap Recovery Offset:** Realizable scrap value does not reduce finished good cost.

---

## 12. Proposed Target Architecture

```
                                  [ SALES DEMAND / STOCK PLAN ]
                                                │
                                                ▼
                                    [ 1. BILL OF MATERIALS ]
                                     (erp_bom_head / item)
                                     - Multi-level explosion
                                     - DFS cycle prevention
                                     - Standard scrap %
                                                │
                                                ▼
                                    [ 2. PRODUCTION ORDER ]
                                     (erp_work_order: CONFIRMED)
                                     - Freezes Order BOM Items
                                     - Soft-reserves RM in stores
                                                │
                                                ▼
                        [ 3. STEP 1: MATERIAL ISSUE NOTE (Stores -> WIP) ]
                         - Batch 1 StockMutationService.recordMovement()
                         - Decrements Stores Bin, Increments WIP Bin
                         - GL: Dr 1402 WIP Asset | Cr 1401 RM Stores Asset
                         - Work Order status -> IN_PROGRESS
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         ▼                                             ▼
               [ IN-HOUSE FABRICATION ]                      [ SUBCONTRACTING / JOB WORK ]
               - Workstation machining                       - Rule 45 / Rule 55 Challan
               - Operator labor run                          - Statutory Due Date (1 yr / 3 yrs)
               - Overhead logging                            - E-Way Bill generation
                         │                                             │
                         └──────────────────────┬──────────────────────┘
                                                │
                                                ▼
                      [ 4. STEP 2: FINISHED GOODS RECEIPT & SCRAP LOGGING ]
                       - Clears consumed materials from WIP Bin
                       - Logs actual scrap / trimmings
                       - Calculates Unit Cost (RM + Labor + Overhead + Subcontract - Scrap)
                       - Batch 1 StockMutationService.recordMovement()
                         Increments FG Stores Bin at computed unit cost
                       - GL: Dr 1401 FG Asset | Cr 1402 WIP | Cr 5202/5203 Absorption
                       - Work Order status -> COMPLETED -> CLOSED
```

---

## 13. Authority Map

```
+-----------------------------------------------------------------------------------------------------------------------------------------------+
|                                                        PHASE 2 AUTHORITY MATRIX                                                               |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| Authority Area               | Owning Service            | Database Entities                 | Invariant Enforced | Downstream Consumers      |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **BOM Authority**            | `BomService`              | `erp_bom_head`, `erp_bom_item`    | Exactly 1 default  | WorkOrderService, MRP     |
|                              |                           |                                   | per item; no cycles|                           |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Production Order           | `WorkOrderService`        | `erp_work_order`,                 | Strict state       | MaterialIssueService,     |
| Authority**                  |                           | `erp_work_order_item`             | machine transitions| CostingService            |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Material Issue & WIP       | `MaterialIssueService`    | `erp_work_order_item`,            | Issue <= Required; | StockMutationService,     |
| Authority**                  |                           | `erp_depot_bin` (zone='WIP')      | WIP bin custody    | General Ledger            |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Finished Goods Receipt     | `ProductionReceipt-       | `erp_work_order`,                 | Completion <= plan | StockMutationService,     |
| Authority**                  | Service`                  | `erp_work_order_item`             | + tolerance; WIP 0 | Inventory Valuation       |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Manufacturing Cost         | `ManufacturingCosting-    | `erp_work_order`,                 | Ind AS-2 moving    | StockMutationService,     |
| Authority**                  | Service`                  | `erp_gl_journal_entry`            | average absorption | General Ledger            |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Job Work Authority**       | `JobWorkService`          | `erp_delivery_challan`,           | Section 143 return | DeliveryChallanService,   |
|                              |                           | `erp_job_work_tracking`           | date compliance    | E-Way Bill, GST ITC-04    |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Inventory Mutation         | `StockMutationService`    | `erp_material_current_stock`,     | Single physical    | All Manufacturing Moves   |
| Authority (Batch 1)**        |                           | `erp_stock_ledger_entry`          | mutation authority |                           |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Accounting Authority**     | `Sales/Procurement-       | `erp_gl_journal_entry`,           | Balanced double-   | Financial Statements      |
| (Batch 1 & Existing)**       | AccountingPostingService` | `erp_gl_journal_line`             | entry vouchers     |                           |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
```

---

## 14. Database Changes

### Candidate Tables Evaluated
To satisfy requirements without database bloat, exactly **5 new normalized tables** are proposed:

```sql
-- 1. Bill of Materials Header
CREATE TABLE IF NOT EXISTS `erp_bom_head` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `bom_code` VARCHAR(64) NOT NULL,
  `material_id` BIGINT NOT NULL COMMENT 'Parent Manufactured Product',
  `revision_code` VARCHAR(20) NOT NULL DEFAULT '1.0',
  `output_quantity` DECIMAL(24,6) NOT NULL DEFAULT 1.000000,
  `unit_id` BIGINT NULL,
  `is_default` CHAR(1) NOT NULL DEFAULT '1',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, DRAFT, OBSOLETE',
  `remark` VARCHAR(500) NULL,
  `delete_flag` CHAR(1) DEFAULT '0',
  `creator` BIGINT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_bom_tenant_code` (`tenant_id`, `bom_code`),
  INDEX `idx_bom_mat` (`tenant_id`, `material_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Bill of Materials Components / Line Items
CREATE TABLE IF NOT EXISTS `erp_bom_item` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `bom_id` BIGINT NOT NULL,
  `component_material_id` BIGINT NOT NULL,
  `quantity` DECIMAL(24,6) NOT NULL,
  `unit_id` BIGINT NULL,
  `scrap_percent` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `issue_type` VARCHAR(20) NOT NULL DEFAULT 'MANUAL_ISSUE' COMMENT 'MANUAL_ISSUE, BACKFLUSH',
  `remark` VARCHAR(255) NULL,
  `delete_flag` CHAR(1) DEFAULT '0',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bomi_bom` (`tenant_id`, `bom_id`),
  INDEX `idx_bomi_comp` (`tenant_id`, `component_material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Production Work Order Header
CREATE TABLE IF NOT EXISTS `erp_work_order` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `order_number` VARCHAR(64) NOT NULL,
  `bom_id` BIGINT NOT NULL,
  `material_id` BIGINT NOT NULL COMMENT 'Finished Good',
  `depot_id` BIGINT NOT NULL COMMENT 'Manufacturing Facility Depot',
  `wip_bin_id` BIGINT NOT NULL COMMENT 'Shop-Floor WIP Storage Bin',
  `planned_qty` DECIMAL(24,6) NOT NULL,
  `completed_qty` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `scrapped_qty` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `start_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `sales_order_id` BIGINT NULL,
  `actual_unit_cost` DECIMAL(24,4) NOT NULL DEFAULT 0.0000,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED',
  `remark` VARCHAR(500) NULL,
  `delete_flag` CHAR(1) DEFAULT '0',
  `creator` BIGINT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_wo_num` (`tenant_id`, `order_number`),
  INDEX `idx_wo_status` (`tenant_id`, `status`),
  INDEX `idx_wo_mat` (`tenant_id`, `material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Work Order Component Snapshot & Tracking
CREATE TABLE IF NOT EXISTS `erp_work_order_item` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `work_order_id` BIGINT NOT NULL,
  `component_material_id` BIGINT NOT NULL,
  `required_qty` DECIMAL(24,6) NOT NULL,
  `issued_qty` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `consumed_qty` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `scrapped_qty` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `unit_id` BIGINT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_woi_wo` (`tenant_id`, `work_order_id`),
  INDEX `idx_woi_comp` (`tenant_id`, `component_material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Indian Job Work / Section 143 Statutory Tracking
CREATE TABLE IF NOT EXISTS `erp_job_work_tracking` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `challan_id` BIGINT NOT NULL COMMENT 'FK to erp_delivery_challan',
  `challan_number` VARCHAR(64) NOT NULL,
  `challan_date` DATE NOT NULL,
  `job_worker_id` BIGINT NOT NULL COMMENT 'FK to erp_supplier',
  `goods_type` VARCHAR(20) NOT NULL DEFAULT 'INPUTS' COMMENT 'INPUTS, CAPITAL_GOODS',
  `statutory_due_date` DATE NOT NULL COMMENT 'Challan Date + 1 Yr for Inputs, + 3 Yrs for Capital Goods',
  `material_id` BIGINT NOT NULL,
  `sent_quantity` DECIMAL(24,6) NOT NULL,
  `returned_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `waste_quantity` DECIMAL(24,6) NOT NULL DEFAULT 0.000000,
  `pending_quantity` DECIMAL(24,6) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OUTSTANDING' COMMENT 'OUTSTANDING, FULLY_RETURNED, DEEMED_SUPPLY',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_jwt_due` (`tenant_id`, `statutory_due_date`, `status`),
  INDEX `idx_jwt_worker` (`tenant_id`, `job_worker_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 15. API Changes

| HTTP Method | Endpoint | Purpose | Request / Response Contract |
| :--- | :--- | :--- | :--- |
| `POST` | `/bom/create` | Create master BOM with lines | Accepts `BomDto` (parent product, lines, scrap %); returns generated BOM ID |
| `GET` | `/bom/get/{id}` | Get BOM details with components | Returns header, line items, and active revision code |
| `GET` | `/bom/explode/{materialId}` | Recursive multi-level explosion | Returns indented hierarchy tree of all components down to raw materials |
| `POST` | `/workOrder/create` | Create Work Order | Accepts `WorkOrderDto` (product, quantity, depot, target dates) |
| `POST` | `/workOrder/confirm/{id}` | Confirm order & freeze snapshot | Validates BOM, creates `erp_work_order_item` records |
| `POST` | `/workOrder/issueMaterial` | Issue raw materials to WIP | Accepts `MaterialIssueDto`; invokes `StockMutationService` (Stores $\rightarrow$ WIP Bin) |
| `POST` | `/workOrder/complete` | Receive FG & close WIP | Calculates unit cost, receives FG into stores, posts GL vouchers |
| `POST` | `/jobWork/createChallan` | Outward Rule 45 Delivery Challan | Generates `JWC/` challan, records `statutory_due_date`, moves RM to JW virtual bin |
| `POST` | `/jobWork/recordInward` | Inward receipt from Job Worker | Reconciles returned FG, scrap, and clears job worker pending balance |
| `GET` | `/jobWork/agingReport` | Section 143 statutory aging | Returns items approaching statutory 1-year / 3-year deadlines |

---

## 16. Frontend Changes (React)

Located in `ERPSystem-web-react/src/features/manufacturing/`:
1. **`BomList.tsx` & `BomModal.tsx`:** Master formula editor. Allows specifying parent product, standard batch size, component table with quantities and scrap %, and multi-level tree preview.
2. **`WorkOrderList.tsx` & `WorkOrderModal.tsx`:** Production order manager. Displays status badge (`DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`), progress bar (`completed_qty / planned_qty`), and action buttons (*Issue Materials*, *Complete Run*).
3. **`MaterialIssueModal.tsx`:** Material pick-list interface displaying required vs available stock in raw material stores with one-click issue to shop floor.
4. **`JobWorkChallanList.tsx` & `JobWorkAgingList.tsx`:** Statutory Indian job work dashboard displaying Rule 45 challans, days remaining towards statutory due date, and E-Way Bill generation.

---

## 17. Migration Strategy

1. **Schema Migration:** Apply `schema_batch2_manufacturing.sql` into MySQL `erp_system_db`.
2. **WIP Storage Bin Seeding:** For every existing manufacturing facility in `erp_depot`, automatically seed a standard shop-floor bin in `erp_depot_bin` (`bin_code = 'WIP-FLOOR'`, `bin_name = 'Shop Floor WIP'`, `zone = 'WIP'`).
3. **Legacy Assembly Backwards Compatibility:**
   - Existing assembly bills (`组装单`) remain operational for simple instant kitting.
   - New discrete manufacturing runs use the formal `WorkOrderService`.

---

## 18. Test Strategy

Phase 2 will be verified via dedicated, non-mocked and integration test suites:
1. `BomCycleDetectionEnterpriseTest`: Verifies DFS cycle detection on direct (A $\rightarrow$ A), indirect (A $\rightarrow$ B $\rightarrow$ A), and deep multi-tier circular BOMs.
2. `WorkOrderLifecycleIntegrationTest`: Verifies `DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED` transitions, component snapshot freezing, and material pick-list generation.
3. `MaterialIssueToWipAtomicityTest`: Verifies physical transfer from Stores to WIP Bin via `StockMutationService.recordMovement()`, running balance ledger entries, and `Dr WIP / Cr RM Stores` GL posting.
4. `FinishedGoodsCostingAbsorptionTest`: Verifies moving average unit cost calculation (RM + Labor + Overhead - Scrap) and perpetual inventory GL posting (`Dr FG Asset | Cr WIP | Cr Absorption`).
5. `IndianJobWorkStatutoryAgingTest`: Verifies Rule 45 delivery challan generation, explicit calculation of statutory due dates (1 year for inputs, 3 years for capital goods), and Section 143 deemed supply alerts.
6. `ManufacturingConcurrencyStressTest`: Multi-threaded simultaneous material issues and production completions with zero negative stock and zero deadlocks.
7. `FullManufacturingRegressionTest`: Guarantees zero regressions across Batch 1 inventory, sales, procurement, accounting, and multi-tenancy.

---

## 19. Concurrency Strategy

1. **Material Issue Locks:** Calls Batch 1 `StockMutationService.acquireSortedRowLocks(tenantId, keys)` to acquire pessimistic row locks in deterministic lexicographical order before deducting stores stock.
2. **Work Order Mutex:** State transitions execute under pessimistic row lock: `SELECT id, status, planned_qty FROM erp_work_order WHERE id = ? FOR UPDATE`.
3. **Single Transaction Boundary:** All dual-writes (WIP consumption + FG receipt + GL posting) occur within a single Spring `@Transactional(rollbackFor = Exception.class)`.

---

## 20. Security Strategy

1. **Zero-Trust Multi-Tenancy:** All queries, locks, and inserts explicitly filter and persist `tenant_id = UserContext.getTenantId()`.
2. **RBAC Permissions:** Strict role checks:
   - `BOM_MANAGER`: Allowed to create/edit master BOMs.
   - `PRODUCTION_SUPERVISOR`: Allowed to confirm work orders and complete production.
   - `STORES_KEEPER`: Allowed to issue materials to WIP.
   - `COMPLIANCE_OFFICER`: Allowed to inspect Section 143 job-work aging and Form GST ITC-04.

---

## 21. Graphify Impact

- **New Nodes Expected:** ~40 structural nodes (`BomService`, `WorkOrderService`, `MaterialIssueService`, `JobWorkService`, entities, mappers).
- **Coupling State:**
  - Downstream consumers of `StockMutationService`.
  - Leaf integration with `DeliveryChallanService` for Rule 45 challans.
  - Zero circular package dependencies.

---

## 22. What Should NOT Be Built (Karpathy Engineering Filter)

1. **NO Finite Capacity Scheduling (APS):** Advanced heuristic constraint solvers and automatic rescheduling algorithms require extensive industrial engineering data and fail in real-world SME environments.
2. **NO Complex Drag-and-Drop Gantt Engines:** Basic tabular scheduling with start/due dates fulfills 100% of discrete production needs without massive client-side libraries.
3. **NO Generic BPMN Engines:** Finite state machine implemented directly in Java provides zero overhead, complete compile-time type safety, and 100% testability.
4. **NO Machine Learning / Predictive Maintenance:** Purely speculative.
5. **NO Parallel Inventory Engine:** Manufacturing will **never** have its own inventory mutation or valuation code. It consumes Batch 1 exclusively.

---

## 23. Phased Implementation & Dependency Order

```
[Phase 2A: Manufacturing Master Data]
  └─► erp_bom_head & erp_bom_item schema, BomService, DFS cycle detection
            │
            ▼
[Phase 2B: Production Work Order Engine]
  └─► erp_work_order & erp_work_order_item schema, WorkOrderService state machine
            │
            ▼
[Phase 2C: Material Issue & WIP Tracking]
  └─► WIP Bin topology, Stores -> WIP transfer via StockMutationService
            │
            ▼
[Phase 2D: Production Completion & Cost Absorption]
  └─► Finished Goods receipt, scrap accounting, Ind AS-2 cost absorption, GL posting
            │
            ▼
[Phase 2E: Indian Job Work & Subcontracting]
  └─► Rule 45/55 delivery challan integration, Section 143 statutory aging, ITC-04 export
            │
            ▼
[Phase 2F: Frontend React Implementation]
  └─► BOM Manager, Work Order Manager, Material Pick List, Job Work Dashboard
```

---

## 24. Risks & Mitigations

| # | Risk Description | Severity | Mitigation Strategy |
| :-: | :--- | :-: | :--- |
| **1** | Production over-issue / shop-floor theft | High | Strict comparison between BOM required qty vs issued qty; requires supervisor override if issued > required. |
| **2** | Section 143 Deemed Supply penalty | High | Proactive dashboard alert at 60/30/0 days prior to 1-year input / 3-year capital goods return deadlines. |
| **3** | Unbalanced GL on partial production runs | Medium | WIP cleared strictly based on consumed ratio; unit cost calculated dynamically per receipt. |
| **4** | Multi-key deadlocks on large material pick lists | Medium | Global lexicographical sorting via Batch 1 `acquireSortedRowLocks` guarantees zero circular waits. |

---

## 25. Phase 2 Acceptance Criteria

1. **BOM Master Invariant:** BOM creation with circular references is physically blocked by DFS cycle detection test.
2. **Order Snapshot Invariant:** Editing an active BOM does not alter the component requirements of an existing confirmed Work Order.
3. **Physical Stock Invariant:** Material Issue to WIP and Finished Goods Receipt execute exclusively through Batch 1 `StockMutationService`, generating valid `erp_stock_ledger_entry` records.
4. **WIP Asset Invariant:** Raw materials in process remain physically visible in the plant's WIP bin and financially visible in General Ledger Account 1402.
5. **Costing Invariant:** Finished goods moving average unit cost incorporates consumed component moving average cost + absorbed labor/overhead.
6. **Statutory Job Work Invariant:** Goods sent to job workers generate Rule 55 delivery challans with explicit statutory due dates (1 year for inputs, 3 years for capital goods).
7. **Regression Invariant:** 100% pass rate across all existing Batch 1, Sales, Procurement, and Multi-Tenant test suites.

---

## 26. Recommended Implementation Sequence

Upon human authorization of this proposal:
- **Sprint 1:** Apply database schema (`schema_batch2_manufacturing.sql`), implement `BomService` with DFS cycle detection, write `BomCycleDetectionEnterpriseTest`.
- **Sprint 2:** Implement `WorkOrderService` state machine, order BOM snapshot freezing, and reservation logic.
- **Sprint 3:** Implement `MaterialIssueService` and `ProductionReceiptService` with Batch 1 `StockMutationService` and GL absorption posting.
- **Sprint 4:** Implement Indian `JobWorkService` with Section 143 statutory due date tracking and Form GST ITC-04 export.
- **Sprint 5:** Build React frontend interfaces in `ERPSystem-web-react`.
- **Sprint 6:** Execute end-to-end verification and full regression suite.

---

## 27. Delivery Gate & Final Stop

> [!IMPORTANT]
> ### HARD STOP ACTIVATED — AWAITING HUMAN APPROVAL
> In strict accordance with user directives:
> - **Zero production Java code has been modified.**
> - **Zero SQL migrations or tables have been created.**
> - **Zero React frontend changes have been made.**
> - **Phase 1 / Batch 1 remains COMPLETE & VERIFIED.**
> - **Phase 2 / Batch 2 is RESEARCHED & PROPOSED.**
> - **Phase 3 is NOT STARTED.**
> 
> **Execution is halted. Awaiting explicit human approval of this proposal before any implementation begins.**
