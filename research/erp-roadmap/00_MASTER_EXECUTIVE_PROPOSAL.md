# Master Executive Proposal: ERP Inventory → Logistics → Manufacturing → MRP (3-Batch Roadmap)

**Document Reference:** `research/erp-roadmap/00_MASTER_EXECUTIVE_PROPOSAL.md`  
**Author:** Antigravity Agentic Architecture Team  
**Date:** September 1, 2026 (Updated with Final Canonical Roadmap Corrections)  
**Document Status:** Approved Delivery Structure — Awaiting Batch 1 Implementation Authorization  
**Corpus Scope:** `e:\Codes\ERP\jshERP-master` (Java 17, Spring Boot 3, MyBatis, MySQL 8.0, React 19)  
**Domain References:** MetaFresh (`metasfresh/metasfresh`), ERPNext (`frappe/erpnext`), Indian Statutory (CGST Act 2017, Ind AS 2)

---

# 1. Current ERP State

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                      CURRENT CODEBASE INVENTORY & COSTING MAP                  │
├────────────────────────────────┬───────────────────────────────────────────────┤
│ Transaction Header             │ erp_depot_head (DepotHeadService.java)        │
│ Operational Line Items         │ erp_depot_item (DepotItemService.java)        │
│ Current Stock Cache            │ erp_material_current_stock                    │
│ Opening Stock Baseline         │ erp_material_initial_stock                    │
│ Sales Order Stock Reservation  │ erp_stock_reservation                         │
│                                │ (StockReservationService.java)                │
│ Authoritative GRN & QC Engine  │ GoodsReceiptService.java (P3 Engine)          │
│ Landed Cost Capitalization     │ erp_landed_cost_voucher                       │
│                                │ (LandedCostVoucherService.java)               │
│ Outward Return Delivery Challan│ erp_delivery_challan                          │
│                                │ (DeliveryChallanService.java)                 │
│ Universal Double-Entry GL      │ erp_gl_journal_entry & _line                  │
│ Legacy Assembly / Disassembly  │ SpecialBillList.tsx (组装单 / 拆卸单)         │
└────────────────────────────────┴───────────────────────────────────────────────┘
```

### Existing Authoritative Foundations (Preserved without Big-Bang Refactor):
* **Tenant & Subscription Authority**: Complete (`erp_tenant`, `TenantSubscriptionService`).
* **Document Numbering Authority**: Complete with Indian Fiscal Year formats (`DocumentNumberService`, `FinancialYearService`).
* **Document Lineage Authority**: Complete cross-document traceability (`erp_document_relationship`, [`DocumentRelationshipService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentRelationshipService.java)).
* **GST Statutory & E-Invoicing Engine**: Complete for Rule 46, Rule 53, IRN generation, QR rendering, and E-Way Bill distance calculation.
* **General Ledger Authority**: Complete double-entry posting bridge ([`erp_gl_journal_entry`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/GlJournalEntry.java)).

---

# 2. Graphify Findings

Analysis of the code knowledge graph (21,106 nodes, commit `5d546ab1`) established:
1. **Central Community Hubs**: `DepotHead` and `DepotItem` form the largest operational hubs in the backend, coupled to over 140 downstream mappers and report controllers.
2. **Coupling Bottleneck**: All stock inquiries (including sales order availability checks, stocktake reconciliations, and reporting) route directly to [`DepotItemService.getStockByParam()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1070).
3. **Disconnected COGS Node**: `postDeliveryDispatchToCOGS` has an in-degree of 0 from all production controller and workflow nodes—confirming it is dead code in production dispatches.
4. **Assembly/Disassembly Isolation**: Legacy bills (`组装单`/`拆卸单`) operate as simple inventory receipts/issues without any graph linkage to sales orders, production orders, or GL accounts.

---

# 3. MetaFresh Findings

From inspecting the `metasfresh/metasfresh` repository:
1. **Transaction Ledger Pattern**: MetaFresh routes all physical movements through `M_Transaction`. Stock balances are never computed by scanning order lines; they are maintained in `M_StorageOnHand` and audited against `M_Transaction`.
2. **Cost Schema**: MetaFresh's multi-schema costing (`M_Cost`) allows standard, FIFO, and weighted average. However, maintaining multi-currency, multi-schema cost matrices requires 18+ database tables.
3. **Takeaway for Our ERP**: Adopt the immutable transaction ledger concept (`erp_stock_ledger_entry`), but strictly avoid the multi-costing schema bloat.

---

# 4. ERPNext Findings

From inspecting the `frappe/erpnext` repository:
1. **Unified Stock Ledger (`tabStock Ledger Entry`)**: ERPNext channels all inventory through a single entry point: `make_sl_entries()`. Every entry records:
   $$\text{actual\_qty}, \quad \text{qty\_after\_transaction}, \quad \text{valuation\_rate}, \quad \text{stock\_value\_difference}$$
2. **Pragmatic Manufacturing Flow**:
   - `BOM` (Multi-level with component scrap %).
   - `Work Order` authorizes production.
   - `Stock Entry` (Purpose: *Material Transfer for Manufacture*) moves raw materials from Stores to WIP.
   - `Stock Entry` (Purpose: *Manufacture*) moves finished goods into Stores, deducts WIP, and posts absorption GL vouchers.
3. **Takeaway for Our ERP**: This exact 2-step manufacturing transfer is the gold standard for mid-market manufacturing. It avoids complex MES scheduling while ensuring 100% financial and inventory integrity.

---

# 5. Indian ERP Requirements

| Classification | Statutory / Regulatory Reference | Specific Mandate & Target Architecture Impact |
|---|---|---|
| **STATUTORY** | Rule 55 of CGST Rules 2017 | Delivery challan / transportation of goods without invoice, including relevant job-work transportation, goods sent on approval, and supply of liquid gas. Consecutive gapless FY sequence $\le 16$ characters in triplicate format. |
| **STATUTORY** | Rule 45 of CGST Rules 2017 | Conditions and procedure for goods sent to job worker, including mandatory challan fields (HSN, description, value, tax rate) and quarterly reporting in **Form GST ITC-04**. |
| **STATUTORY** | Section 143(1) of CGST Act 2017 | Applicable statutory return/supply deadlines: **1 year for inputs**, **3 years for capital goods**. The system must store the actual statutory due date rather than assuming every case is a flat 365 days. If exceeded, treated as a deemed taxable supply from dispatch date. |
| **STATUTORY** | Section 17(5)(h) of CGST Act 2017 | Mandatory **ITC Reversal** on destroyed, lost, stolen, or written-off inventory. Stock adjustment/scrap module must flag ITC reversals for GSTR-3B Table 4B. |
| **STATUTORY** | Section 7(1)(c) / Schedule I | Interstate branch transfers between distinct GSTINs are **Deemed Taxable Supplies** requiring GST Tax Invoices and E-Way Bills. |
| **ACCOUNTING STANDARD**| Ind AS 2 / AS-2 (ICAI) | Inventories valued at lower of Cost and Net Realizable Value. **Weighted Average or FIFO permitted; LIFO strictly prohibited**. Landed costs must be capitalized into inventory. |
| **BUSINESS PRACTICE** | Standard Industrial Practice | Multi-Level BOM, Work Orders, Work Center hourly machine rates. |
| **ERP CONVENTION** | Inventory Design | Two-tier warehouse/bin hierarchy, batch numbers, serial tracking. |
| **OPTIONAL** | Advanced WMS | 5-tier bin coordinates (Aisle/Bay/Level), automated conveyor routing, wave picking. |

---

# 6. Inventory Gap Analysis

* **Scan-Based Calculation Bottleneck**: Current stock is calculated by an un-locked O(N) aggregate SQL scan (`SELECT SUM(CASE WHEN...)`) across all historical rows in `erp_depot_item` ([`DepotItemMapperEx.xml#L794`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/DepotItemMapperEx.xml#L794)).
* **Missing Stock Ledger**: There is no immutable `erp_stock_ledger_entry` recording sequential balance changes.
* **Fragmented Mutation & Missing Locks**: While GRN uses `SELECT ... FOR UPDATE` in [`GoodsReceiptService.java#L202`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GoodsReceiptService.java#L202), all dispatches, transfers, and adjustments route through [`DepotItemService.java#L1242`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1242) (`updateCurrentStockFun`), which executes un-locked reads and writes, creating vulnerability to lost updates and negative stock spikes under concurrent load.
* **Disconnected COGS**: [`SalesAccountingPostingService.postDeliveryDispatchToCOGS()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java#L205) is tested in isolation, but has 0 callers in production code.

---

# 7. Warehouse Gap Analysis

* **Current State**: Flat depot list in `erp_depot`. No sub-locations, bins, or shop-floor areas. Item master only has an unindexed freeform text field `erp_material.position`.
* **Gap**: Cannot distinguish central storage racks from shop-floor Work-in-Progress (WIP) locations or quarantine inspection areas.
* **Architectural Decision**: A **2-Tier Model (`Depot` $\rightarrow$ `Storage Bin / WIP Location`)** satisfies 100% of factory stores, WIP, and quarantine requirements without the data-entry friction of 5-tier coordinate systems.

---

# 8. Logistics Gap Analysis

* **Current State**: Outbound dispatches are recorded via `erp_depot_head` (`sub_type='出库'`), printable via `DeliveryChallanPrint.tsx`, and linked to E-Way Bills (`GstEwayBillValidityService.java`).
* **Gap**: Lacks in-transit goods tracking between distant depots and inter-state branch transfers under different GSTINs.
* **Architectural Decision**: Keep direct dispatch mechanism; add in-transit depot state for physical transfers. Defer pick/pack wave WMS engines to prevent overengineering.

---

# 9. Manufacturing Readiness

> [!CAUTION]
> **Readiness Verdict: NOT READY FOR MANUFACTURING YET.**
>
> 7 out of 20 technical prerequisites for discrete manufacturing are strictly missing. Attempting to implement multi-level BOMs and multi-day Work Orders on top of the current scan-based foundation will cause severe O(N) performance degradation, concurrency lost updates, and phantom inventory.

---

# 10. Manufacturing Gap Analysis

| Manufacturing Area | Existing Codebase State | Target Requirement | Gap Status |
|---|---|---|:---:|
| **BOM Master** | Manual line entry per bill in `SpecialBillList.tsx` | Standard BOM template with revision code and batch qty | **MISSING** |
| **Multi-Level Explosion** | Flat single-level only | Recursive indented tree explosion for sub-assemblies | **MISSING** |
| **Work Centers & Routing** | Zero machine or labor tracking | Minimal Workstation definition with hourly rate | **MISSING** |
| **Work Orders** | No production orders exist | Formal Work Order authorizing factory production | **MISSING** |
| **Material Issue to WIP** | Raw materials consumed immediately | 2-step transfer: Stores $\rightarrow$ WIP Bin (`Dr WIP \| Cr Stores`) | **MISSING** |
| **Finished Goods Receipt** | Handled ad-hoc in assembly bill | FG Receipt: Clears WIP, absorbs overhead (`Dr FG \| Cr WIP`) | **MISSING** |
| **Scrap / Yield Loss** | No scrap field on bills | Component scrap % factor and actual scrap logging | **MISSING** |
| **Job Work (Rule 45 & Sec 143)** | No subcontracting challans | Outward Rule 45 challan + Section 143 statutory due date tracking (1 yr inputs / 3 yrs capital goods) | **MISSING** |

---

# 11. MRP Readiness

* **Current Codebase State**: ZERO automated replenishment. Replenishment is triggered manually by viewing reports and typing purchase requisitions.
* **Lead Time & Safety Stock**: No procurement/manufacturing lead times or safety stock thresholds on item master.
* **Prerequisite Dependency**: MRP is 100% dependent on reliable inventory balances (Batch 1) and active BOM structures (Batch 2). Building MRP before Batch 1 and Batch 2 exist is strictly rejected.

---

# 12. The Three-Batch Delivery Roadmap

> [!IMPORTANT]
> **Architecture Principle for Future Batches:**
> Proposed class and table names in Batch 2 and Batch 3 are **candidate architectures**, not fixed commitments.
> Before implementing any component in Batch 2 or Batch 3, the active codebase state will be inspected to determine the minimal sufficient design. Components will never be created merely because they are listed in this roadmap.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BATCH 1: INVENTORY FOUNDATION + WAREHOUSE + LOGISTICS                                  │
│ 1A. Inventory Mutation Authority (StockMutationService)                                │
│ 1B. Immutable Stock Ledger (erp_stock_ledger_entry)                                     │
│ 1C. Inventory Concurrency (Row locks & deadlock avoidance)                             │
│ 1D. Inventory Valuation Hardening (Moving average centralization)                      │
│ 1E. 2-Tier Warehouse & Storage Bins (erp_depot_bin & WIP virtual bins)                 │
│ 1F. Stock Reservation / Allocation (Multi-document support)                            │
│ 1G. Stock Transfer / Logistics (In-transit state & Rule 55 challans)                   │
│ 1H. Physical Stocktake / Cycle Counting                                                │
│ 1I. Inventory-to-Accounting Integration (Authoritative COGS posting)                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [MANDATORY HUMAN APPROVAL GATE 1]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BATCH 2: MANUFACTURING + PRODUCTION + JOB WORK                                         │
│ 2A. Manufacturing Master Data (UOM, Scrap %, Item Types)                               │
│ 2B. Bill of Materials [Candidate: erp_bom_head & erp_bom_item]                         │
│ 2C. Multi-Level BOM Explosion                                                          │
│ 2D. BOM Revision Control                                                               │
│ 2E. Work Centers & Machine Capacities [Candidate: erp_work_center]                     │
│ 2F. Routing Operations & Standard Times                                                │
│ 2G. Production Work Orders [Candidate: erp_work_order]                                  │
│ 2H. Material Issue to WIP (Stores -> WIP Bin via StockMutationService)                │
│ 2I. WIP Inventory Tracking                                                             │
│ 2J. Job Cards & Operator Dispatch                                                      │
│ 2K. Finished Goods Receipt (WIP -> FG Stores via StockMutationService)                 │
│ 2L. Scrap & Waste Logging                                                              │
│ 2M. Manufacturing Cost Roll-Up & Overhead Absorption                                   │
│ 2N. Indian Job Work / Subcontracting (Rule 45 Challans & Sec 143 Statutory Due Dates)  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [MANDATORY HUMAN APPROVAL GATE 2]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BATCH 3: MRP + ADVANCED PLANNING + ENTERPRISE HARDENING                                │
│ 3A. Demand Planning (Sales Orders & Reorder Triggers)                                  │
│ 3B. Safety Stock & Minimum Reorder Quantities                                          │
│ 3C. Projected Inventory Availability                                                   │
│ 3D. Open PO Consideration                                                              │
│ 3E. Open Production Consideration                                                      │
│ 3F. Multi-Level BOM Net Shortage Explosion                                             │
│ 3G. Deterministic Gross-to-Net Engine [Candidate: MRPEngineService]                    │
│ 3H. Automated Purchase Requisition Generation                                          │
│ 3I. Automated Work Order Generation                                                    │
│ 3J. Lead Time Offsetting                                                               │
│ 3K. Minimum Order Quantity (MOQ) Rounding                                              │
│ 3L. Reorder Quantity Optimization                                                      │
│ 3M. Planning Exception Dashboard                                                       │
│ 3N. Planning Auditability & Lineage Tracking                                           │
│ 3O. Final Cross-Module Enterprise Hardening                                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 13. Key Architecture Decisions

### Decision 1: StockMutationService Boundary (Anti-God-Service Design)
* `StockMutationService` is strictly the physical inventory mutation authority. It contains **zero business-document branching** and **zero direct GL posting logic**.
* Calling business service (e.g. `GoodsReceiptService`, `DepotHeadService`) invokes `StockMutationService.recordMovement(req)`, receives `StockMutationResult` (`previousQty`, `resultingQty`, `valuationRate`, `cogsAmount`), and invokes existing accounting authority (`SalesAccountingPostingService` or `ProcurementAccountingPostingService`). All operations execute within the same database transaction.

### Decision 2: Option B Over Option A for Stock Ledger
* `erp_depot_item` is mutable by design (rows are deleted on draft edits via `batchDeleteDepotItemByDepotHeadIds`) and contains non-stock lines (Quotations, Orders).
* Dedicated `erp_stock_ledger_entry` is strictly append-only, ensuring immutability, zero regression risk to 140+ existing mappers, and sub-millisecond point-in-time stock audits.

### Decision 3: GRN / QC Quantity Invariant
* **Only the quantity classified by existing ERP business rules as accepted/available stock may mutate active inventory.**
* The implementation preserves existing partial receipt, rejection, quarantine, over-receipt tolerance, and QC inspection behavior in `GoodsReceiptService`.
* Rejection quantities remain off-balance-sheet in fulfillment tracking and line remarks for debit note / vendor return processing, and **never** enter active sellable inventory.

### Decision 4: Concurrency Language & Authoritative Lock Key
* The authoritative lock key for Phase 1 is: `(tenant_id, material_id, depot_id)`.
* **Operations on distinct stock keys are independently lockable and do not require a global inventory lock.**
* Multi-key operations acquire row locks in **deterministic lexicographical order of `(depot_id, material_id)`**, eliminating circular wait deadlocks.

### Decision 5: Fail-Closed Opening Reconciliation
* Migration checks: $\Delta = \text{Current Stock Cache} - \text{Reconstructed Historical Sum}$.
* If $\Delta \neq 0$, migration **halts immediately**. No automatic phantom adjustments. Migration passes only when variance is verified to be **EXACTLY ZERO**.

---

# 14. Existing Authorities Preserved

```text
┌───────────────────────────────┬───────────────────────────────┬────────────────────────────────┐
│ Data Domain                   │ Authoritative Table           │ Authoritative Gatekeeper       │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
│ Stock Physical Movements      │ erp_stock_ledger_entry        │ StockMutationService.java      │
│ Physical Stock Balance Cache  │ erp_material_current_stock    │ StockMutationService.java      │
│ Storage & WIP Bins            │ erp_depot_bin                 │ DepotService.java              │
│ Bill of Materials (BOM)       │ erp_bom_head & erp_bom_item   │ BomService.java [Candidate]   │
│ Production Orders             │ erp_work_order & _item        │ WorkOrderService.java [Cand.]  │
│ General Ledger Accounting     │ erp_gl_journal_entry & _line  │ Existing Posting Services      │
│ Document Lineage              │ erp_document_relationship     │ DocumentRelationshipService    │
│ GST Statutory Authority       │ GSTTaxCalculationEngine      │ GSTTaxCalculationEngine.java  │
└───────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```
**Anti-Duplication Invariants:**
1. Zero duplicate stock authorities: `StockMutationService` is the sole writer to `erp_stock_ledger_entry` and `erp_material_current_stock`.
2. Zero duplicate accounting authorities: All GL postings write to existing `erp_gl_journal_entry` and `erp_gl_journal_line`.
3. Zero duplicate valuation authorities: Incremental moving-average valuation logic is centralized in `StockMutationService`.

---

# 15. Exact Changes Required (Batch 1 Scope)

### Change 1: Universal Stock Mutation Gatekeeper & Ledger
* **File to Create:** `ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java`
* **Table to Create:** `erp_stock_ledger_entry`
* **Problem Solved:** Replaces the un-locked O(N) aggregate scan with an atomic, row-locked ledger write.
* **Dependency:** `erp_material_current_stock`
* **Test Required:** `StockConcurrencyStressTest.java` (Scenarios A through F).

### Change 2: Connect Outbound Dispatch to Authoritative COGS Posting
* **File to Modify:** [`DepotHeadService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotHeadService.java)
* **Current Behavior:** Outbound dispatch (`sub_type='出库'`) only decrements quantity without calling COGS posting.
* **Proposed Change:** Receives `StockMutationResult` and calls `SalesAccountingPostingService.postDeliveryDispatchToCOGS(dispatchId, dispatchNumber, result.getCogsAmount(), tenantId, userContext)`.
* **Problem Solved:** Eliminates disconnected inventory-to-GL accounting.
* **Test Required:** `SalesCogsPostingIntegrationTest.java`.

### Change 3: Storage Bin & WIP Location Table
* **Table to Create:** `erp_depot_bin`
* **File to Modify:** [`DepotService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotService.java)
* **Problem Solved:** Provides physical bin locations and shop-floor WIP holding areas.
* **Test Required:** `DepotBinBootstrapTest.java`.

---

# 16. What We Should NOT Build Yet

To strictly follow Karpathy engineering guidelines and prevent bloat, the following are **EXPLICITLY REJECTED**:
1. ❌ **5-Tier WMS Hierarchy (Zone/Aisle/Rack/Shelf/Bin)**: Unnecessary complexity for mid-market operations.
2. ❌ **Multiple Costing Schema Engines (LIFO, Standard Cost Matrices)**: LIFO is illegal under Ind AS 2; moving average is legally sufficient.
3. ❌ **Complex Finite Capacity Shop-Floor Scheduling (APS)**: Genetic algorithm dispatchers are premature; simple Work Orders suffice.
4. ❌ **Microservices / Event Buses (Kafka/RabbitMQ)**: Monolithic Spring Boot transactional envelopes guarantee ACID integrity without distributed network failure modes.
5. ❌ **Generic Workflow Execution Engines (Camunda/Activiti)**: High maintenance overhead; declarative state machines are superior.
6. ❌ **AI/ML Forecasting in MRP**: Stochastic heuristics add unpredictability; deterministic gross-to-net calculation is required.

---

# 17. Migration Strategy: Fail-Closed Reconciliation

### 17.1 Pre-Migration Discrepancy Gate
Before executing ledger cutover, run diagnostic reconciliation query:
$$\Delta = \text{Current Stock Cache}(\text{mcs}) - \text{Reconstructed History Sum}(\text{di})$$
* If $\Delta \neq 0$: Halt migration. Generate audit report. Post authorized adjustment bill.
* Migration proceeds **ONLY** when $\Delta == 0$ across all items.

### 17.2 Opening Ledger Seeding with Batch Context
```sql
INSERT INTO `erp_stock_ledger_entry` 
(`tenant_id`, `material_id`, `depot_id`, `bin_id`, `batch_number`, `voucher_type`, `voucher_no`, `posting_time`, `actual_qty`, `qty_after_transaction`, `incoming_rate`, `valuation_rate`, `stock_value`, `stock_value_difference`, `remark`)
SELECT 
    mcs.tenant_id,
    mcs.material_id,
    mcs.depot_id,
    b.id,
    IFNULL(di.batch_number, ''),
    'OPENING_SNAPSHOT',
    CONCAT('INIT-DEPOT-', mcs.depot_id),
    NOW(),
    SUM(IFNULL(di.basic_number, 0)),
    mcs.current_number,
    mcs.current_unit_price,
    mcs.current_unit_price,
    (mcs.current_number * mcs.current_unit_price),
    (mcs.current_number * mcs.current_unit_price),
    'Cutover Stock Ledger Baseline with Batch Context'
FROM erp_material_current_stock mcs
JOIN erp_depot_bin b ON b.depot_id = mcs.depot_id AND b.is_default = 1
LEFT JOIN erp_depot_item di ON di.material_id = mcs.material_id AND di.depot_id = mcs.depot_id AND IFNULL(di.delete_flag,'0') != '1'
WHERE mcs.current_number > 0 AND IFNULL(mcs.delete_flag, '0') != '1'
GROUP BY mcs.tenant_id, mcs.material_id, mcs.depot_id, b.id, di.batch_number, mcs.current_number, mcs.current_unit_price;
```

---

# 18. Test Strategy: Multi-Tier Matrix

1. **`StockLedgerEnterpriseTest.java`**: Monotonic `qty_after_transaction` sequence, immutable ledger append, audit verification.
2. **`StockConcurrencyStressTest.java`**: Multi-threaded tests proving operations on distinct keys are independently lockable while identical keys are serialized without deadlocks.
3. **`SalesCogsPostingIntegrationTest.java`**: Asserts outbound dispatches post `Dr COGS (5101) | Cr Finished Goods Asset (1401)` equal to `Delivered Qty * Valuation Rate`.
4. **`GoodsReceiptValuationRegressionTest.java`**: Preserves existing QC behavior: only accepted/available quantity mutates stock and triggers moving-average valuation.
5. **`StockMutationAtomicityTest.java`**: Forces mid-transaction failure and verifies zero partial writes across `erp_depot_item`, `erp_stock_ledger_entry`, `erp_material_current_stock`, and `erp_gl_journal_entry`.
6. **`StockLedgerTenantIsolationTest.java`**: Multi-tenant boundary verification: zero cross-tenant leakage.
7. **`OpeningBalanceReconciliationTest.java`**: Verifies fail-closed behavior: halts on mismatch, passes only when variance is zero.

---

# 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Performance lock contention on shared high-velocity items** | High | Row locks are held only for the duration of the mutation; multi-item transactions lock in canonical sorted order to eliminate deadlocks. |
| **Historical balance mismatch during Stock Ledger seeding** | Critical | Fail-closed reconciliation gate halts migration if $\Delta \neq 0$. Zero unexplained variance allowed. |
| **Job work statutory deadline violation (CGST Sec 143)** | High | Store specific statutory due dates (1 year for inputs, 3 years for capital goods) and trigger automated alerts before deadline. |
| **Accidental coupling of StockMutationService to accounting** | Medium | Strict contract: `StockMutationService` calculates and returns numbers; caller calls existing accounting services. |

---

# 20. Dependencies Between Batches

```text
BATCH 1: Core Inventory & Stock Ledger Foundation
   │ (Establishes atomic stock mutations, immutable ledger, and moving-average rate)
   ▼
BATCH 2: Manufacturing & Job Work
   │ (Consumes StockMutationService for WIP issue and FG receipt; adds BOM candidates and Rule 45 challans)
   ▼
BATCH 3: Deterministic MRP & Advanced Planning
     (Consumes accurate Batch 1 on-hand balances and Batch 2 BOMs for gross-to-net explosion)
```

---

# 21. Batch Acceptance Criteria

### Batch 1 Acceptance Criteria (Must ALL pass before Batch 2):
1. Exactly ONE physical stock mutation authority exists (`StockMutationService`).
2. Exactly ONE immutable stock ledger exists (`erp_stock_ledger_entry`).
3. Outbound sales dispatches automatically post balanced double-entry COGS GL vouchers.
4. Concurrency tests prove operations on distinct stock keys are independently lockable and identical keys are safely serialized.
5. Opening reconciliation verifies zero unexplained variance against historical lines.
6. Multi-tenancy isolation tests pass with zero cross-tenant leakage.
7. Existing Sales (S1–S7) and Procurement (P1–P7) regression tests remain 100% green.
8. Graphify before/after comparison confirms no unexpected edge explosions.

---

# 22. Recommended Implementation Order

### Delivery Status:
The 3-Batch Roadmap is accepted as the strategic delivery structure.
1. **Batch 1 (Inventory Foundation + Warehouse + Logistics)**: Ready for implementation authorization.
2. **Batch 2 (Manufacturing + Production + Job Work)**: Awaits Batch 1 completion and verification.
3. **Batch 3 (MRP + Advanced Planning + Enterprise Hardening)**: Awaits Batch 2 completion and verification.

**HARD STOP:** Human approval is mandatory after every batch before proceeding to the next batch. No code will be implemented until explicit Batch 1 authorization is issued.
