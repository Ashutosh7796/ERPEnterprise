# Manufacturing Architecture: Authority Map, WIP Model & Costing Integration
**Topic:** Core Manufacturing Authorities, WIP Topology, Cost Absorption, and Batch 1 Integration  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Context:** Indian Enterprise ERP Modernization — Phase 2 (Batch 2)  

---

## 1. Manufacturing Authority Map

To prevent duplicate authority and maintain strict single-responsibility principles, all manufacturing responsibilities are partitioned into dedicated authorities:

```
+-----------------------------------------------------------------------------------------------------------------------------------------------+
|                                                        MANUFACTURING AUTHORITY MAP                                                            |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| Authority                    | Current Authority Today   | What It Owns                      | What It Writes     | What Phase 2 Adds         |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **BOM Authority**            | NONE (Ad-hoc bills)       | Master recipes, yields, formulas  | `erp_bom_head`,    | Versioned BOM master data,|
|                              |                           |                                   | `erp_bom_item`     | multi-level explosion,    |
|                              |                           |                                   |                    | circular dependency gate  |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Production Order           | NONE                      | Production authorization,         | `erp_work_order`,  | Formal production order   |
| Authority**                  |                           | scheduling, execution lifecycle   | `erp_work_order_   | state machine, order BOM  |
|                              |                           |                                   | item`              | snapshot, reservation     |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Material Consumption &     | NONE                      | Shop-floor material issuance,     | `erp_work_order_   | 2-step issue to WIP,      |
| WIP Authority**              |                           | WIP staging, consumption balances | item` (issued_qty, | staging bin tracking,     |
|                              |                           |                                   | consumed_qty)      | WIP aging                 |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Finished Goods Receipt     | `DepotItemService`        | Completed production inward,      | `erp_work_order`   | Inward FG receipt linked  |
| Authority**                  | (Assembly bill partial)   | yield verification                | (completed_qty)    | to Work Order, clears WIP |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Scrap Authority**          | NONE                      | Waste, trimmings, yield losses    | `erp_work_order_   | Scrap factor on BOM,      |
|                              |                           |                                   | scrap`             | scrap salvage valuation   |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Manufacturing Cost         | NONE (Flat sum)           | Component cost + labor absorption | `erp_work_order`   | Moving average absorption |
| Authority**                  |                           | + overhead absorption - scrap     | (actual_unit_cost) | (Ind AS-2 / AS-2 compliant)|
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Job Work Authority**       | `DeliveryChallanService`  | Rule 45 challans, job worker bins,| `erp_delivery_     | Section 143 statutory     |
|                              | (P7 outward returns only) | statutory aging, ITC-04 reporting | challan`, `erp_job_| tracking (1 yr / 3 yrs),  |
|                              |                           |                                   | work_tracking`     | job worker reconciliation |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Inventory Mutation         | `StockMutationService`    | Physical balance mutation,        | `erp_material_     | **NO NEW AUTHORITY.**     |
| Authority**                  | (Batch 1 Authoritative)   | pessimistic locks, running ledger | current_stock`,    | Manufacturing consumes    |
|                              |                           |                                   | `erp_stock_ledger_ | existing Batch 1 service  |
|                              |                           |                                   | entry`             | exclusively.              |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
| **Accounting Authority**     | `SalesAccountingPosting-  | General ledger double-entry       | `erp_gl_journal_   | **NO NEW AUTHORITY.**     |
|                              | Service`, `Procurement-   | vouchers, CoA debit/credits       | entry`, `erp_gl_   | Uses existing GL engine   |
|                              | AccountingPostingService` |                                   | journal_line`      | for WIP and FG vouchers.  |
+------------------------------+---------------------------+-----------------------------------+--------------------+---------------------------+
```

---

## 2. Work-in-Progress (WIP) Architectural Model

### 2.1 Evaluation of WIP Architectural Options

1. **Option A: Accounting-Only Virtual WIP (Rejected)**
   - Raw materials are credited to inventory and debited to WIP in the General Ledger, but disappear completely from warehouse stock.
   - *Failure Mode:* Shop-floor managers have zero system visibility of parts physically present on the factory floor; physical stocktakes cannot locate in-process materials.
2. **Option B: Independent Database Table `erp_wip_stock` (Rejected)**
   - Creates a separate table storing WIP quantities and values outside `erp_material_current_stock`.
   - *Failure Mode:* Violates the Batch 1 Single Inventory Mutation Authority principle; creates a parallel dual-inventory engine requiring separate locking and reconciliation.
3. **Option C: Dedicated WIP Bin Topology in Batch 1 (`erp_depot_bin`) (APPROVED)**
   - Every manufacturing depot possesses a dedicated shop-floor bin: `bin_code = 'WIP-FLOOR'`, `zone = 'WIP'`.
   - Material Issue transfers raw materials from Stores Bin to WIP Bin.
   - Material is physically tracked in `erp_material_current_stock` and `erp_stock_ledger_entry` with `bin_id = <wip_bin_id>`.
   - *Benefits:* Full stock visibility, 100% reuse of Batch 1 pessimistic locking, zero duplicate tables.

---

## 3. Batch 1 Integration Rules & Data Flow

> [!IMPORTANT]
> **Strict Integration Law:** Manufacturing services MUST NEVER execute direct SQL `UPDATE` or `INSERT` statements against `erp_material_current_stock` or `erp_stock_ledger_entry`.
> Every physical movement must call `StockMutationService.recordMovement(StockMovementRequest)`.

```
               +-------------------------------------------------------------+
               |                  PRODUCTION WORK ORDER                      |
               |                (erp_work_order: RELEASED)                   |
               +-------------------------------------------------------------+
                                              │
                                              ▼
                    STEP 1: MATERIAL ISSUE NOTE (Stores -> WIP Bin)
                                              │
                     Calls: StockMutationService.recordMovement()
                     - From: Depot (Stores Bin), Material A, -100 Units
                     - To:   Depot (WIP Bin),    Material A, +100 Units
                     Voucher Type: "MANUFACTURING_ISSUE"
                                              │
                                              ▼
                      Accounting Authority: Posts GL Voucher
                      Dr 1402 Work-in-Progress Inventory Asset
                      Cr 1401 Raw Material Stores Inventory Asset
                                              │
                                              ▼
                                 [ SHOP-FLOOR PROCESSING ]
                        Machining / Assembly / Subcontracting Run
                                              │
                                              ▼
                STEP 2: FINISHED GOODS RECEIPT & PRODUCTION COMPLETION
                                              │
                     1. Clear Consumed Materials from WIP:
                        Calls: StockMutationService.recordMovement()
                        - From: Depot (WIP Bin), Material A, -100 Units
                        Voucher Type: "MANUFACTURING_CONSUMPTION"
                                              │
                     2. Receive Completed Finished Good:
                        Calls: StockMutationService.recordMovement()
                        - To: Depot (FG Bin), Finished Good X, +10 Units
                        - Incoming Rate: Calculated Unit Cost
                        Voucher Type: "MANUFACTURING_RECEIPT"
                                              │
                     3. Accounting Authority: Posts Completion GL Voucher
                        Dr 1401 Finished Goods Inventory Asset
                        Cr 1402 Work-in-Progress Inventory Asset
                        Cr 5202 Direct Labor Absorption (Clearing)
                        Cr 5203 Factory Overhead Absorption (Clearing)
```

---

## 4. Manufacturing Costing & Valuation Authority

### 4.1 Cost Accumulation Formula (Ind AS-2 / AS-2 Compliant)
In accordance with Indian Accounting Standard 2 (Valuation of Inventories), the cost of finished goods comprises:
1. Costs of purchase (Raw materials consumed at weighted moving average cost).
2. Costs of conversion (Direct labor and systemic production overheads).
3. Other costs incurred in bringing the inventories to their present location and condition (Subcontracting processing charges).
4. Less: Realizable value of scrap / by-products.

$$\text{Unit Cost of FG} = \frac{\sum_{i=1}^{N} \left( \text{ConsumedQty}_i \times \text{MovingAvgRate}_i \right) + \text{Direct Labor Cost} + \text{Factory Overhead Cost} + \text{Job Work Charges} - \text{Scrap Value}}{\text{Completed Finished Good Quantity}}$$

### 4.2 Single Valuation Authority Integration
- When Finished Goods are received into stock, `StockMutationService.recordMovement` receives `incomingRate = Unit Cost of FG`.
- Batch 1's moving average algorithm updates the finished good's weighted moving average price in `erp_material_current_stock.current_unit_price` and `erp_material_extend.purchase_decimal`.
- The valuation authority remains **singular and unified across the entire ERP**.
