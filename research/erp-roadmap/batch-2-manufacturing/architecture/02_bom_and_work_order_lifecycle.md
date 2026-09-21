# Manufacturing Architecture: BOM & Work Order Lifecycle Engine
**Topic:** BOM Data Model, Circular Graph Prevention, Work Order State Machine, and Concurrency  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Context:** Indian Enterprise ERP Modernization — Phase 2 (Batch 2)  

---

## 1. Bill of Materials (BOM) Architecture

### 1.1 Minimum Correct BOM Data Model
To satisfy discrete manufacturing without overengineering, the BOM structure is modeled in two normalized entities:
1. **BOM Header (`erp_bom_head`):**
   - Defines the parent finished good (`material_id`), BOM code, revision (`revision_code`), standard batch output quantity (`output_quantity`), effective dates, and status (`ACTIVE`, `DRAFT`, `OBSOLETE`).
   - Flag: `is_default` enforces that each finished good has exactly one active primary BOM per tenant.
2. **BOM Items (`erp_bom_item`):**
   - Defines components and raw materials (`component_material_id`), required quantity per batch (`quantity`), UOM (`unit_id`), scrap percentage (`scrap_percent`), and issue type (`MANUAL_ISSUE` vs `BACKFLUSH`).
   - Supports sub-assemblies where `component_material_id` is itself a manufactured item with its own active BOM.

### 1.2 Circular Dependency Prevention Algorithm
In multi-level BOM structures, circular references (e.g. Sub-Assembly A requires Sub-Assembly B, which requires Sub-Assembly A) cause infinite loops during explosion and planning.

```
       [ALGORITHM: DFS BOM CYCLE DETECTION]
       Input: Parent Material ID (M_parent), BOM Items List
       
       1. Initialize recursion stack set: VisitedInCurrentBranch = { M_parent }
       2. For each child item C in BOM:
            If C is a sub-assembly (has active BOM):
                If C in VisitedInCurrentBranch:
                    THROW BusinessRunTimeException("Circular BOM Dependency Detected: " + Path);
                Else:
                    Recurse: CheckCycle(C, VisitedInCurrentBranch.add(C))
       3. Remove M_parent from VisitedInCurrentBranch upon backtrack
```
- **Validation Gate:** The cycle detection algorithm executes on every BOM creation, revision update, and BOM line modification before database commit.

---

## 2. Production Work Order State Machine

```
               +-------------------------------------------------------+
               |                        DRAFT                          |
               |       - Work Order created with planned quantity      |
               |       - Editable dates, BOM reference, and depot      |
               +-------------------------------------------------------+
                                           │
                                           ▼ [Action: Confirm Order]
               +-------------------------------------------------------+
               |                      CONFIRMED                        |
               |       - Freezes BOM Snapshot into erp_work_order_item |
               |       - Soft-reserves component quantities            |
               |       - Generates Material Pick List                  |
               +-------------------------------------------------------+
                                           │
                                           ▼ [Action: Issue Materials to WIP]
               +-------------------------------------------------------+
               |                     IN_PROGRESS                       |
               |       - Stores -> WIP Bin physical transfer posted    |
               |       - GL: Dr WIP Asset | Cr RM Stores Asset         |
               |       - Shop-floor machining / assembly running       |
               +-------------------------------------------------------+
                                           │
                                           ▼ [Action: Complete Production]
               +-------------------------------------------------------+
               |                      COMPLETED                        |
               |       - WIP -> FG Stores receipt posted               |
               |       - Scrap logged & WIP consumption cleared        |
               |       - GL: Dr FG Asset | Cr WIP | Cr Absorption       |
               +-------------------------------------------------------+
                                           │
                                           ▼ [Action: Close Order]
               +-------------------------------------------------------+
               |                       CLOSED                          |
               |       - Final cost variance reconciliation completed  |
               |       - Immutable terminal state; zero further edits  |
               +-------------------------------------------------------+
```

### 2.1 State Transition Invariants
1. `DRAFT` $\rightarrow$ `CONFIRMED`:
   - Validates that the referenced BOM is `status='ACTIVE'`.
   - Copies BOM lines into `erp_work_order_item` with `required_qty = bom_item.quantity * (work_order.planned_qty / bom_head.output_quantity)`.
   - Freezing the snapshot protects the active order against future master BOM changes.
2. `CONFIRMED` $\rightarrow$ `IN_PROGRESS`:
   - Triggered automatically upon the first physical Material Issue Note.
   - Enforces that `issued_qty > 0`.
   - Batch 1 `StockMutationService` moves materials from Stores to WIP Bin.
3. `IN_PROGRESS` $\rightarrow$ `COMPLETED`:
   - Permitted when completed quantity satisfies tolerance ($\text{completed\_qty} \ge \text{planned\_qty}$ or authorized partial close).
   - Consumes issued materials from WIP Bin.
   - Receives finished goods into FG Depot at computed unit cost.
4. `CANCELLED`:
   - Permitted only from `DRAFT` or `CONFIRMED`.
   - Forbidden if any material has been issued (`issued_qty > 0`). If materials were issued, they must be formally returned to stores before cancellation is allowed.

---

## 3. Concurrency Control & Deadlock Prevention

### 3.1 Concurrency Failure Scenarios & Mitigations
1. **Concurrent Material Issue by Multiple Operators:**
   - *Risk:* Two warehouse operators simultaneously issue components for different work orders from the same raw material store, causing negative stock.
   - *Mitigation:* `MaterialIssueService` calls `StockMutationService.acquireSortedRowLocks(tenantId, keys)`. Rows in `erp_material_current_stock` are locked in deterministic sorted order before balance validation.
2. **Concurrent Completion of Split Production Runs:**
   - *Risk:* Simultaneous partial receipts for the same Work Order update `completed_qty` and WIP balance concurrently.
   - *Mitigation:* Work Order row is locked via `SELECT id, status, planned_qty, completed_qty FROM erp_work_order WHERE id = ? FOR UPDATE`.
3. **Multi-Location Subcontracting Dispatch:**
   - *Risk:* Transferring materials to a job worker locks Stores and Job Worker virtual bins.
   - *Mitigation:* Composite key `(depot_id, material_id)` sorting eliminates circular wait deadlocks.
