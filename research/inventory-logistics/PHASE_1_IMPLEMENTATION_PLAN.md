# Phase 1 Implementation Plan: Core Inventory Foundation & Stock Ledger Hardening

**Document Status:** Final Pre-Implementation Design (Updated with Adversarial Corrections)  
**Scope:** Phase 1 Core Inventory Foundation ONLY (No Phase 2, 3, or 4 implementation)  
**Target Codebase:** `ERPSystem-boot` (Java 17, Spring Boot 3, MyBatis, MySQL 8.0)

---

## 1. Architectural Boundaries & Anti-God-Service Design

### 1.1 Strict Separation of Physical Mutation and Financial Accounting
`StockMutationService` is strictly the **authoritative physical inventory gatekeeper**. It is **NOT an accounting service** and contains zero business-document branching (no `if (SALES_DISPATCH)` or `if (PURCHASE_RECEIPT)`).

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CALLING BUSINESS TRANSACTION                           │
│  (e.g., GoodsReceiptService, DepotHeadService for Sales Dispatch/Transfer/Adj)  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ 1. Invokes inside @Transactional
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    StockMutationService.recordMovement(...)                     │
│  - Acquires pessimistic lock: SELECT ... FOR UPDATE on (tenant, material, depot)│
│  - Validates stock sufficiency (throws BusinessRunTimeException if negative)   │
│  - Reads current moving-average unit price                                      │
│  - Calculates new moving-average rate (inbound) OR calculates COGS (outbound)   │
│  - Appends immutable row to erp_stock_ledger_entry                              │
│  - Updates erp_material_current_stock (current_number, current_unit_price)      │
│  - Returns StockMutationResult DTO                                              │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ 2. Returns StockMutationResult
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   CALLING BUSINESS SERVICE (Accounting Trigger)                 │
│  - For GRN: Calls ProcurementAccountingPostingService.postGrnToGrni(...)        │
│  - For Sales Dispatch: Calls SalesAccountingPostingService                      │
│                        .postDeliveryDispatchToCOGS(..., result.getCogsAmount()) │
│  - Inserts operational document lines into erp_depot_item                       │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ 3. Commit / Rollback
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE TRANSACTION BOUNDARY (MySQL InnoDB)                 │
│  - Success: Commits ledger, stock cache, GL vouchers, and depot items together. │
│  - Failure: Any exception rolls back ALL 4 tables atomically.                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 `StockMutationResult` Contract
`StockMutationService.recordMovement(StockMovementRequest req)` returns an immutable result object:
```java
public class StockMutationResult {
    private Long ledgerEntryId;
    private Long tenantId;
    private Long materialId;
    private Long depotId;
    private BigDecimal previousQuantity;
    private BigDecimal deltaQuantity;
    private BigDecimal resultingQuantity;   // qty_after_transaction
    private BigDecimal valuationRate;       // Effective moving average unit price
    private BigDecimal movementValue;       // deltaQuantity * valuationRate
    private BigDecimal cogsAmount;          // abs(deltaQuantity) * valuationRate (outbound only)
}
```

---

## 2. GRN / QC / Accepted Quantity Analysis

### 2.1 Invariant Lifecycle Audit
In [`GoodsReceiptService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GoodsReceiptService.java), physical receipts against Purchase Orders follow this exact quantity decomposition:

$$\text{Received Quantity} = \text{Accepted Quantity} + \text{Rejected Quantity}$$

| Quantity Type | Physical Meaning | Inward to Active Physical Stock? | Valuation Recalculation? | GRNI Accrual Posting? | Traceability Storage |
|---|---|:---:|:---:|:---:|---|
| **Received Quantity** | Total goods delivered by supplier at gate | No | No | No | Derived total (`accepted + rejected`) |
| **Accepted Quantity** | Goods that successfully passed QC | **YES** | **YES** | **YES** | `erp_depot_item.basic_number`, `erp_material_current_stock` |
| **Rejected Quantity** | Damaged, defective, or off-spec goods | **NO** | **NO** | **NO** | `erp_depot_item.remark`, `erp_po_line_fulfillment.rejected_quantity` |
| **Quarantine Quantity**| Staged items pending QC decision | N/A (Phase 1) | N/A (Phase 1) | N/A (Phase 1) | Dedicated Quarantine Bins will be introduced in Phase 2 via `erp_depot_bin` |

### 2.2 Strict Business Invariant for Phase 1
When a GRN is posted with `Received = 100`, `Accepted = 70`, `Rejected = 30`:
* Exactly **70 units** are passed to `StockMutationService.recordMovement(deltaQty = +70)`.
* Exactly **70 units** enter `erp_stock_ledger_entry` and `erp_material_current_stock`.
* Moving average valuation is recalculated using **70 units $\times$ unit purchase price**.
* GRNI General Ledger posting (`Dr Inventory Asset | Cr GRNI Accrual`) is posted for **70 units $\times$ unit purchase price**.
* The 30 rejected units are recorded in line remarks and purchase fulfillment tracking for vendor return/debit note processing, but **NEVER enter active stock**.
* *Verification:* Proved by `GoodsReceiptValuationRegressionTest.java`.

---

## 3. Scope of `qty_after_transaction` in Phase 1

### 3.1 Strict Phase 1 Invariant
In Phase 1, the authoritative physical stock balance is strictly scoped to the 3-tuple:

$$\text{Authoritative Stock Key} = (\text{tenant\_id}, \text{material\_id}, \text{depot\_id})$$

* **`qty_after_transaction`** in `erp_stock_ledger_entry` represents the running quantity for this exact 3-tuple:
  $$\text{qty\_after\_transaction} = \text{previous\_number} + \text{delta\_qty}$$
* **Metadata Fields (Non-Authoritative for Balances in Phase 1)**:
  - `bin_id`: Nullable integer stored on the ledger row for future Phase 2 tracking. Does NOT maintain bin-level running balances in Phase 1.
  - `batch_number`: String stored on the ledger row for document traceability. Does NOT maintain batch-level running ledger balances in Phase 1.
* **Phase 2 Boundary**: Phase 2 will introduce `(tenant_id, material_id, depot_id, bin_id)` running balance authority after `erp_depot_bin` is created.

---

## 4. Opening Balance Reconciliation: Fail-Closed Policy

### 4.1 Zero Unexplained Variance Mandate
Migration must **NEVER** automatically invent an adjustment row just to make mismatched numbers balance. The reconciliation policy is strictly **FAIL CLOSED**.

```text
Run Pre-Migration Reconciliation Check:
Compute: Delta = erp_material_current_stock - Reconstructed Historical Sum(erp_depot_item)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
           Delta == 0                    Delta != 0
                 │                             │
                 ▼                             ▼
       MIGRATION APPROVED               HALT MIGRATION IMMEDIATELY
       Seed Opening Ledger                     │
       with 100% confidence                    ▼
                                        Generate Discrepancy Report
                                        (List material, depot, cached, reconstructed, delta)
                                               │
                                               ▼
                                        Human Admin / Audit Investigation
                                        (Identify root cause, missing vouchers, legacy edits)
                                               │
                                               ▼
                                        Post Authorized Adjustment Bill
                                        (Formal audit trail with reason code)
                                               │
                                               ▼
                                        Re-run Reconciliation Tool
                                               │
                                               ▼
                                        Assert: Variance == 0
                                               │
                                               ▼
                                        MIGRATION APPROVED
```

### 4.2 Batch and Serial Reconciliation Baseline
To ensure no batch genealogy is lost during cutover:
* The opening ledger baseline queries active batch numbers from `erp_depot_item` where `basic_number > 0` and links them to the opening balance records.
* Serial numbers are cross-referenced against `erp_serial_number` where `is_sell = '0'`.

---

## 5. Concurrency & Lock Granularity

### 5.1 Authoritative Lock Key
The authoritative lock key for Phase 1 is:

$$\text{Pessimistic Row Lock on } \texttt{erp\_material\_current\_stock} \text{ for } (\text{tenant\_id}, \text{material\_id}, \text{depot\_id})$$

```sql
SELECT id, current_number, current_unit_price 
FROM erp_material_current_stock 
WHERE tenant_id = ? AND depot_id = ? AND material_id = ? 
FOR UPDATE;
```

### 5.2 Multi-Key Deadlock Avoidance Rule
When a single transaction mutates multiple items or multiple depots (e.g. multi-line sales dispatch, inter-depot transfer):
* All row locks MUST be acquired in **strictly ascending lexicographical order of `(depot_id, material_id)`**.
* This eliminates circular lock wait conditions and completely prevents MySQL InnoDB deadlocks (`Error 1213`).

### 5.3 Concurrency Test Scenarios (All Scenarios Covered in `StockConcurrencyStressTest.java`)

| Scenario | Threads / Operations | Target Key | Expected Behavior | Proven Invariant |
|---|---|---|---|---|
| **A. Dispatch vs Dispatch** | Thread 1: Dispatch 6<br>Thread 2: Dispatch 6<br>(Starting stock = 10) | Same `(M, D)` | Thread 1 acquires lock, deducts 6 (stock $\rightarrow$ 4), commits.<br>Thread 2 acquires lock, detects stock (4) < 6, throws 400 Insufficient Stock. | Zero overselling, zero negative stock, no lost updates. |
| **B. GRN vs Dispatch** | Thread 1: GRN +10 @ ₹150<br>Thread 2: Dispatch -5<br>(Starting stock = 10 @ ₹100) | Same `(M, D)` | Serialized in order of lock acquisition.<br>If GRN first: new rate = ₹125, dispatch COGS = $5 \times 125 = ₹625$.<br>If Dispatch first: dispatch COGS = $5 \times 100 = ₹500$, then GRN new rate = ₹133.33. | Deterministic valuation & COGS in both execution orders. |
| **C. Transfer vs Dispatch** | Thread 1: Transfer 5 from $D_1 \rightarrow D_2$<br>Thread 2: Dispatch 8 from $D_1$<br>(Starting $D_1 = 10$) | $D_1$ and $D_2$ | Sorted lock acquisition prevents deadlocks.<br>Thread 1 locks $D_1$, stock $\rightarrow$ 5. Thread 2 attempts to dispatch 8, fails with 400. | Cross-depot integrity without phantom transfers. |
| **D. Return vs Dispatch** | Thread 1: Sales Return +5<br>Thread 2: Dispatch -8<br>(Starting stock = 5) | Same `(M, D)` | Serialized on row lock.<br>If Return commits first, stock becomes 10, dispatch succeeds.<br>If Dispatch runs first, fails with insufficient stock. | Strict chronological atomicity. |
| **E. Different Materials Concurrently** | Thread 1: Dispatch $M_1$<br>Thread 2: Dispatch $M_2$ | $(M_1, D_1)$ vs $(M_2, D_1)$ | Both threads execute **simultaneously in parallel** with ZERO lock contention! | Proves NO global table lock exists. |
| **F. Same Material Different Depots** | Thread 1: Dispatch $M_1$ from $D_1$<br>Thread 2: Dispatch $M_1$ from $D_2$ | $(M_1, D_1)$ vs $(M_1, D_2)$ | Both threads execute **simultaneously in parallel** with ZERO lock contention! | Granularity strictly scoped to `(material, depot)`. |

---

## 6. Proposed Schema & Code Deliverables (Phase 1 Only)

### 6.1 Database Schema
* **`ERPSystem-boot/src/main/resources/db/migration/schema_phase1_stock_ledger.sql`**:
  ```sql
  CREATE TABLE IF NOT EXISTS `erp_stock_ledger_entry` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` bigint(20) NOT NULL,
    `material_id` bigint(20) NOT NULL,
    `depot_id` bigint(20) NOT NULL,
    `bin_id` bigint(20) DEFAULT NULL,
    `batch_number` varchar(100) DEFAULT '',
    `voucher_type` varchar(50) NOT NULL,
    `voucher_id` bigint(20) DEFAULT NULL,
    `voucher_no` varchar(64) NOT NULL,
    `posting_time` datetime NOT NULL,
    `actual_qty` decimal(24,6) NOT NULL,
    `qty_after_transaction` decimal(24,6) NOT NULL,
    `incoming_rate` decimal(24,6) DEFAULT 0.0000,
    `valuation_rate` decimal(24,6) NOT NULL,
    `stock_value` decimal(24,6) NOT NULL,
    `stock_value_difference` decimal(24,6) NOT NULL,
    `remark` varchar(500) DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_sle_mat_depot_time` (`tenant_id`, `material_id`, `depot_id`, `posting_time`),
    KEY `idx_sle_voucher` (`tenant_id`, `voucher_type`, `voucher_no`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ```

### 6.2 Java Backend Classes
1. `StockLedgerEntry.java` (Entity) & `StockLedgerEntryMapper.java` / `StockLedgerEntryMapper.xml`
2. `StockMovementRequest.java` & `StockMutationResult.java` (DTOs)
3. `StockMutationService.java` (Authoritative mutation service)
4. Wire `GoodsReceiptService.java` to call `StockMutationService.recordMovement()` for accepted quantity.
5. Wire `DepotItemService.java` to call `StockMutationService.recordMovement()` for dispatches, transfers, and adjustments.
6. Wire `DepotHeadService.java` to call `SalesAccountingPostingService.postDeliveryDispatchToCOGS()` using `result.getCogsAmount()`.

---

## 7. Mandatory Test Suites (Phase 1 Verification)

1. **`StockLedgerEnterpriseTest.java`**:
   - Monotonic `qty_after_transaction` sequence, immutable ledger append, audit verification.
2. **`StockConcurrencyStressTest.java`**:
   - Multi-threaded tests for all 6 scenarios (A through F).
3. **`SalesCogsPostingIntegrationTest.java`**:
   - Asserts outbound dispatches post `Dr COGS (5101) | Cr Finished Goods Asset (1401)` equal to `Delivered Qty * Valuation Rate`.
4. **`GoodsReceiptValuationRegressionTest.java`**:
   - Verifies Accepted (70) vs Rejected (30) logic: only 70 units mutate stock and trigger moving-average valuation.
5. **`StockMutationAtomicityTest.java`**:
   - Forces mid-transaction failure and verifies zero partial writes across `erp_depot_item`, `erp_stock_ledger_entry`, `erp_material_current_stock`, and `erp_gl_journal_entry`.
6. **`StockLedgerTenantIsolationTest.java`**:
   - Multi-tenant boundary verification: zero cross-tenant leakage.
7. **`OpeningBalanceReconciliationTest.java`**:
   - Verifies fail-closed behavior: halts on mismatch, passes only when variance is zero.

---

## 8. Graphify Verification & Stop Condition

### Graphify Baseline:
- `DepotHeadService`: 457 nodes
- `DepotItemService`: 316 nodes
- `GoodsReceiptService`: 60 nodes

### Stop Condition:
After Phase 1 tests pass and Graphify before/after comparison confirms no dependency explosion, generate:
`research/inventory-logistics/PHASE_1_FINAL_APPROVAL.md`
**Then STOP and wait for human approval.**
No progression to Phase 2 (Bins), Phase 3 (Manufacturing), or Phase 4 (Job Work).
