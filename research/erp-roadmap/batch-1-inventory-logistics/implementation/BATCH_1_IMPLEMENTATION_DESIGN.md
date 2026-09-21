# Batch 1: Final Implementation Design & Execution Plan
## Inventory Foundation + Warehouse + Logistics

**Scope:** Batch 1 Implementation Authorization  
**Author:** Antigravity Agentic Architecture Team  
**Date:** September 1, 2026  
**Document Status:** Approved Pre-Implementation Design  

---

## 1. Inventory Authority Architecture

### 1.1 Strict Authority Boundaries
To ensure the ERP has exactly ONE source of truth for each domain:

```text
┌───────────────────────────────┬───────────────────────────────┬────────────────────────────────┐
│ Authority Domain              │ Authoritative Table           │ Authoritative Component        │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
│ Physical Stock Quantity       │ erp_material_current_stock    │ StockMutationService.java      │
│ Immutable Stock Ledger        │ erp_stock_ledger_entry        │ StockMutationService.java      │
│ Inventory Valuation           │ Moving average unit price     │ StockMutationService.java      │
│ Warehouse & Storage Bins      │ erp_depot & erp_depot_bin     │ DepotService.java              │
│ Stock Reservation             │ erp_stock_reservation         │ StockReservationService.java   │
│ General Ledger Accounting     │ erp_gl_journal_entry & _line  │ Existing GL Posting Services   │
│ Document Lineage              │ erp_document_relationship     │ DocumentRelationshipService    │
│ Statutory Tax & E-Way Bill    │ GSTTaxCalculationEngine      │ GSTTaxCalculationEngine.java  │
└───────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```

### 1.2 Anti-God-Service Execution Sequence
`StockMutationService` is strictly the physical inventory mutation gatekeeper. It has zero document-specific branching (`if SALES_DISPATCH`, `if PURCHASE_RECEIPT`) and zero direct GL posting logic.

```text
Calling Service (e.g., GoodsReceiptService, DepotHeadService)
        │
        ▼ 1. Enters @Transactional boundary
StockMutationService.recordMovement(StockMovementRequest req)
        │
        ├── 2. Acquires row lock: SELECT ... FOR UPDATE on (tenant_id, material_id, depot_id)
        ├── 3. Validates stock sufficiency (throws 400 if negative stock disallowed)
        ├── 4. Reads current moving average unit price
        ├── 5. Calculates new moving average (inbound) OR calculates COGS (outbound)
        ├── 6. Appends immutable row to erp_stock_ledger_entry
        ├── 7. Updates erp_material_current_stock (current_number, current_unit_price)
        └── 8. Returns StockMutationResult DTO
        │
        ▼ 9. Calling service receives StockMutationResult
Caller triggers existing Accounting Authority:
  - If GRN: ProcurementAccountingPostingService.postGrnToGrni(...)
  - If Sales Dispatch: SalesAccountingPostingService.postDeliveryDispatchToCOGS(..., result.getCogsAmount())
        │
        ▼ 10. Inserts operational line items into erp_depot_item
Transaction Commits (MySQL InnoDB releases row lock)
```

---

## 2. GRN / QC / Accepted Quantity Invariant

In [`GoodsReceiptService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GoodsReceiptService.java):
* **Received Quantity** = Total goods delivered by vendor (`accepted + rejected`).
* **Accepted Quantity** = Goods passing QC inspection. This is the **ONLY** quantity that:
  - Mutates active physical inventory (`deltaQty = +accepted`).
  - Enters `erp_stock_ledger_entry`.
  - Triggers moving-average valuation recalculation.
  - Posts to GRNI Accrual (`Dr Inventory Asset | Cr GRNI Accrual`).
* **Rejected Quantity** = Damaged, defective, or off-spec goods. Stays off-balance-sheet; logged in line remarks and `erp_po_line_fulfillment.rejected_quantity` for vendor return / debit note processing, and **never** enters active sellable inventory.

---

## 3. Scope of `qty_after_transaction`

* In Phase 1, the authoritative running balance is strictly scoped to the 3-tuple:
  $$\text{Running Balance Key} = (\text{tenant\_id}, \text{material\_id}, \text{depot\_id})$$
* `qty_after_transaction` in `erp_stock_ledger_entry` records the running quantity for this exact tuple.
* `bin_id` (nullable) and `batch_number` (string) are retained as movement metadata on the ledger line, but **do not** maintain separate running balance authority in Phase 1. (Phase 2 will introduce bin-level running balance authority once `erp_depot_bin` is created).

---

## 4. Concurrency, Lock Granularity & Deadlock Avoidance

### 4.1 Authoritative Lock Key
Pessimistic row lock on `erp_material_current_stock` for `(tenant_id, material_id, depot_id)`:
```sql
SELECT id, current_number, current_unit_price 
FROM erp_material_current_stock 
WHERE tenant_id = ? AND depot_id = ? AND material_id = ? 
FOR UPDATE;
```

### 4.2 Canonical Ordering Deadlock Avoidance Rule
When a single transaction mutates multiple items or multiple depots (e.g. multi-line sales dispatch, inter-depot transfer):
* All row locks MUST be acquired in **strictly ascending lexicographical order of `(depot_id, material_id)`**.
* This eliminates circular wait deadlocks.
* Distinct stock keys are independently lockable and do not require a global inventory lock.

---

## 5. Fail-Closed Opening Balance Reconciliation

* Pre-migration diagnostic query computes:
  $$\Delta = \text{Current Stock Cache}(\text{mcs}) - \text{Reconstructed History Sum}(\text{di})$$
* If $\Delta \neq 0$: **MIGRATION HALTS IMMEDIATELY**.
* No automatic adjustments are permitted.
* An investigation generates a discrepancy report for human administrative review.
* An explicit, authorized adjustment bill is posted with audit trail.
* Re-run reconciliation tool. Migration is approved **ONLY** when $\Delta == 0$ across all items.

---

## 6. Implementation Sequence for Batch 1

```text
Step 1: Database Migration Schema
        Create erp_stock_ledger_entry table.
        Create erp_depot_bin table (with default bin bootstrap).

Step 2: Backend Entities & Mappers
        StockLedgerEntry.java entity, mapper interface, and XML mapper.
        StockMovementRequest.java & StockMutationResult.java DTOs.

Step 3: StockMutationService Implementation
        Core atomic service implementing the 8-step sequence with SELECT ... FOR UPDATE
        and canonical sorted lock acquisition for multi-item transactions.

Step 4: Integration Wiring
        Refactor GoodsReceiptService to call StockMutationService for accepted qty.
        Refactor DepotItemService / DepotHeadService to call StockMutationService for dispatches,
        transfers, and adjustments.
        Wire outbound dispatches to call SalesAccountingPostingService.postDeliveryDispatchToCOGS().

Step 5: Mandatory Test Suite Execution
        1. StockLedgerEnterpriseTest
        2. StockConcurrencyStressTest (Scenarios A through F + Reverse lock acquisition)
        3. SalesCogsPostingIntegrationTest
        4. GoodsReceiptValuationRegressionTest
        5. StockMutationAtomicityTest
        6. StockLedgerTenantIsolationTest
        7. OpeningBalanceReconciliationTest

Step 6: Regression Verification & Graphify Comparison
        Run full Sales, Procurement, and GST regression suite.
        Run Graphify, record after-metrics, assert no unexpected edge explosion.

Step 7: Produce Batch 1 Final Verification Report
        Create research/erp-roadmap/batch-1-inventory-logistics/verification/BATCH_1_FINAL_VERIFICATION.md
        STOP AND WAIT FOR HUMAN APPROVAL.
```
