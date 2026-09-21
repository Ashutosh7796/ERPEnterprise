# Phase 4C.2: Pre-Close Subledger Reconciliation Gate — Independent Forensic Safety Review

**Document ID**: `64_phase4C_2_INDEPENDENT_SAFETY_REVIEW.md`  
**Review Type**: Independent Read-Only Forensic Safety Audit  
**Baseline Commit**: `5d546ab15cc0047442e33d0533131e38d65a7253`  
**Scope Inspected**: Phase 4C.2 Pre-Close Subledger Reconciliation Engine & Integration Points  
**Final Verdict**: **FAIL** (Presence of 2 P1 production-blocking defects and 3 P2 correctness/control defects)  
**Authoritative Hard Stop Status**: ENFORCED (Zero Phase 4C.3, Zero Phase 4C.4, Zero modifications to Phase 4B)

---

## 1. Executive Verdict

### 1.1 Summary Statement
An independent forensic safety audit of Phase 4C.2 (**Pre-Close Subledger Reconciliation Gate**) was conducted across the source code, SQL queries, transactional semantics, statutory accounting rules, test suites, and knowledge graph.

While the implementation successfully establishes a 100% read-only engine, enforces parameterized tenant isolation, maintains Phase 4B immutability, and executes 22 unit tests with zero failures, **it fails forensic safety standards as an authoritative pre-close reconciliation gate due to two major P1 defects**:

1. **P1 — Temporal Asymmetry (Current Mutable Subledger vs. Historical Cutoff)**:
   The subledger balances for Trade Receivables (`erp_supplier.all_need_get`), Trade Payables (`erp_supplier.all_need_pay`), Customer Advances (`erp_supplier.advance_in`), and Supplier Advances (`erp_supplier_advance.unallocated_balance`) are **current mutable snapshot accumulators**. They do not maintain point-in-time historical values. When reconciling an earlier fiscal period (e.g. Month $M$ evaluated during Month $M+1$ as is standard during close), the GL and Granular queries are historically cutoff at $T_{\text{close}}$, but the subledger queries read current cumulative figures reflecting post-period transactions. This generates false `PARTIAL_DISCREPANCY` (`DATA_INTEGRITY_ISSUE`) outcomes that wrongly block legitimate period closing.
2. **P1 — AP Granular TDS Mismatch**:
   In Trade Payables (`2320`), Phase 4A TDS accounting credits `2320` with `net_payable_amount` (`total_invoice_amount - tds_amount`). However, `reconcileTradePayables` calculates Granular reconstruction using `SUM(total_invoice_amount)` from `erp_purchase_invoice`. Consequently, for any purchase invoice where TDS is withheld, `GL == Subledger` but `Subledger != Granular` by exactly the TDS amount, triggering false `GRANULARITY_DISCREPANCY` (`ALLOCATION_DIFFERENCE`) and blocking close.

### 1.2 Verdict Scorecard
- **Verdict**: **FAIL**
- **P0 Findings**: 0
- **P1 Findings**: 2 (Temporal Asymmetry; AP Granular TDS Distortion)
- **P2 Findings**: 3 (Bank/Cash Static Fallback Defect; Cancelled Sales Invoice Granular Inclusion; Silent Exception Swallowing in Drilldowns)
- **P3 Findings**: 1 (Tenant 0 Fallback Handling in API)
- **Phase 4B Immutability**: 100% PASS (Zero touches to Phase 4B files)
- **Deferred Findings (F-01-R, F-05, F-06, F-07)**: 100% PASS (Preserved untouched)

---

## 2. Independent Architecture Verification

The reconciliation engine implemented in `SubledgerReconciliationService.java` operates across 6 statutory control accounts under Indian Companies Act 2013 (Schedule III):
1. Trade Receivables (`1220`)
2. Trade Payables (`2320`)
3. Customer Advances (`2339`)
4. Supplier Advances (`1260`)
5. Primary Operating Bank (`1232`)
6. Petty Cash (`1231`)

The service defines a three-tier comparison model:
- **Tier A**: General Ledger Net Balance ($A$) queried from `erp_gl_entry`.
- **Tier B**: Maintained Subledger Balance ($B$) queried from operational master/document balance fields.
- **Tier C**: Granular Reconstruction ($C$) computed from document headers and receipts/payments.

### Architecture Topology
```
                  ┌─────────────────────────────────────┐
                  │      ReconciliationController       │
                  └──────────────────┬──────────────────┘
                                     │
                  ┌──────────────────▼──────────────────┐
                  │    SubledgerReconciliationService   │
                  └──────┬───────────┬───────────┬──────┘
                         │           │           │
         ┌───────────────▼┐  ┌───────▼────────┐  ┌▼────────────────┐
         │ Tier A: GL     │  │ Tier B: SL     │  │ Tier C: Granular│
         │ erp_gl_entry   │  │ erp_supplier   │  │ erp_depot_head  │
         │ (as-of date)   │  │ (CURRENT SNAP) │  │ erp_account_head│
         └────────────────┘  └────────────────┘  └─────────────────┘
```

The design fails at Tier B because `jshERP` does not have an append-only historical subledger table for customers/vendors. Comparing a mutable accumulator against a historically bounded GL balance breaks whenever a close is performed retrospectively.

---

## 3. Authority Map

| Account Code | Statutory Account Name | Category | Authoritative Source of Record | Maintained Subledger Source in Code | Granular Document Source in Code | Forensic Authority Evaluation |
|---|---|---|---|---|---|---|
| **1220** | Trade Receivables | ASSET | `erp_gl_entry` (`1220`) | `erp_supplier.all_need_get` | `erp_depot_head` + `erp_account_head` | **Defective**: `all_need_get` is a mutable current snapshot, not a historical subledger. |
| **2320** | Trade Payables | LIABILITY | `erp_gl_entry` (`2320`) | `erp_supplier.all_need_pay` | `erp_purchase_invoice` + `erp_account_head` | **Defective**: `all_need_pay` is mutable current snapshot; Granular ignores TDS deduction. |
| **2339** | Customer Advances | LIABILITY | `erp_gl_entry` (`2339`) | `erp_supplier.advance_in` | `erp_account_head` ('收预付款') - `erp_gl_entry` offsets | **Defective**: `advance_in` is a mutable current snapshot. |
| **1260** | Supplier Advances | ASSET | `erp_gl_entry` (`1260`) | `erp_supplier_advance.unallocated_balance` | Gross advances - allocated amounts | **Defective**: `unallocated_balance` is mutated by post-period allocations. |
| **1232** | Operating Bank | ASSET | `erp_gl_entry` (`1232`) [Authoritative] | `erp_account.initial_amount` | Matches Subledger in Code | **Defective**: Fallback only triggers when `initial_amount == 0`. Compares GL against static opening. |
| **1231** | Petty Cash | ASSET | `erp_gl_entry` (`1231`) [Authoritative] | `erp_account.initial_amount` | Matches Subledger in Code | **Defective**: Identical to 1232. |

---

## 4. As-of-Date Correctness

### 4.1 Boundary Analysis ($T = \text{period.getEndDate()}$)
`SubledgerReconciliationService.java` converts `asOfDate` to end-of-day:
```java
// Line 920-929
private Date getEndOfDay(Date date) {
    if (date == null) return null;
    Calendar cal = Calendar.getInstance();
    cal.setTime(date);
    cal.set(Calendar.HOUR_OF_DAY, 23);
    cal.set(Calendar.MINUTE, 59);
    cal.set(Calendar.SECOND, 59);
    cal.set(Calendar.MILLISECOND, 999);
    return cal.getTime();
}
```

### 4.2 Forensic Temporal Disparity Matrix
| Component | Query Filter Applied | Point in Time Represented | As-of Correctness |
|---|---|---|---|
| **GL Balance ($A$)** | `WHERE posting_date <= ?` | $T_{\text{close}}$ (`23:59:59.999`) | **CORRECT** (Strictly bounded) |
| **AR Subledger ($B$)** | `WHERE tenant_id = ?` (No Date Filter) | $T_{\text{now}}$ (Current runtime) | **DEFECTIVE (P1)** (Unbounded) |
| **AR Granular ($C$)** | `WHERE oper_time <= ?` / `bill_time <= ?` | $T_{\text{close}}$ (`23:59:59.999`) | **CORRECT** (Bounded) |
| **AP Subledger ($B$)** | `WHERE tenant_id = ?` (No Date Filter) | $T_{\text{now}}$ (Current runtime) | **DEFECTIVE (P1)** (Unbounded) |
| **AP Granular ($C$)** | `WHERE invoice_date <= ?` / `bill_time <= ?` | $T_{\text{close}}$ (`23:59:59.999`) | **CORRECT** (Bounded) |
| **Adv In Subledger ($B$)**| `WHERE tenant_id = ?` (No Date Filter) | $T_{\text{now}}$ (Current runtime) | **DEFECTIVE (P1)** (Unbounded) |
| **Adv In Granular ($C$)**| `WHERE bill_time <= ?` / `posting_date <= ?` | $T_{\text{close}}$ (`23:59:59.999`) | **CORRECT** (Bounded) |
| **Supp Adv Subledger ($B$)**| `WHERE payment_date <= ?` | Advance created $\le T$, but **balance is current** | **DEFECTIVE (P1)** (Corrupted by future offsets) |

### 4.3 Proof of Failure in Test 16
In `SubledgerReconciliationServiceTest.java`:
- Test 16 (`test16_PeriodBoundaryExclusion_FutureTransactionsIgnored`) seeded:
  - April 20 Sales Invoice: `40,000`
  - May 10 Sales Invoice: `25,000`
  - Total `erp_supplier.all_need_get`: `65,000`
- When reconciling Period `2026-04`:
  - `ar.getGlBalance()` = `40000.0000`
  - `ar.getGranularBalance()` = `40000.0000`
  - `ar.getSubledgerBalance()` = `65000.0000`
  - `glSubledgerVariance` = `65000 - 40000` = `25000.0000`
  - `subledgerGranularVariance` = `40000 - 65000` = `-25000.0000`
- The test asserted lines 667-669:
  ```java
  assertEquals(0, aprAmount.compareTo(ar.getGlBalance()));
  assertEquals(0, aprAmount.compareTo(ar.getGranularBalance()));
  ```
- **The test intentionally avoided asserting `ar.getSubledgerBalance()`, `ar.getStatus()`, or `summary.getPeriodCloseReady()`**, because asserting them would immediately fail: `ar.getStatus()` was `PARTIAL_DISCREPANCY` and `summary.getPeriodCloseReady()` was `false`!

---

## 5. Trade Receivables (1220) Analysis

### 5.1 Reconciliation Formulas in Code
$$\text{GL}_{1220} = \sum_{\text{posting\_date} \le T} (\text{debit} - \text{credit})$$
$$\text{SL}_{1220} = \sum \text{erp\_supplier.all\_need\_get}$$
$$\text{Granular}_{1220} = \sum \text{begin\_need\_get} + \sum_{t \le T} \text{SalesInvoices} - \sum_{t \le T} \text{Receipts} - \sum_{t \le T} \text{CreditNotes}$$

### 5.2 Forensic Vulnerabilities
1. **Current State Leakage**: If a payment is collected on May 2nd for an April invoice, `all_need_get` decreases on May 2nd. An April reconciliation run on May 5th will show `GL(April) = 50,000`, `Granular(April) = 50,000`, but `Subledger = 0`.
2. **Cancelled Sales Invoices**:
   Line 403 queries `erp_depot_head`:
   ```sql
   SELECT IFNULL(SUM(total_price), 0) FROM `erp_depot_head`
   WHERE `tenant_id` = ? AND `type` = '出库' 
     AND `sub_type` in ('零售销售', '销售', '销售出库') 
     AND `status` = '1' AND ifnull(`delete_flag`, '0') != '1'
   ```
   When a sales invoice is cancelled via `GstSalesInvoiceService.transitionInvoiceState` to `CANCELLED`, `posting_status` is set to `'CANCELLED'`, but `status` remains `'1'`. The query above **does not filter out `posting_status = 'CANCELLED'`**, so cancelled invoices are falsely included in Granular AR, causing a phantom `GRANULARITY_DISCREPANCY`.

---

## 6. Trade Payables (2320) Analysis & TDS Proof

### 6.1 Statutory TDS Mechanics (Phase 4A Architecture)
In `PurchaseAccountingPostingService.java` (lines 401-460):
```java
BigDecimal finalTds = (tdsAmount != null && tdsAmount.compareTo(BigDecimal.ZERO) > 0) ? tdsAmount : BigDecimal.ZERO;
BigDecimal netApAmount = grossTotal.subtract(finalTds);

// Credit 2320 with Net AP
apLine.setCredit(netApAmount);
lines.add(apLine);

// Credit 2335-2338 with TDS Withholding
tdsLine.setCredit(finalTds);
lines.add(tdsLine);

// Update Subledger with Net AP
jdbcTemplate.update("UPDATE `erp_supplier` SET `all_need_pay` = IFNULL(`all_need_pay`, 0) + ? ...", netApAmount, supplierId, tenantId);
```
Both GL `2320` and Subledger `all_need_pay` reflect **Net of TDS** ($100,000 - 10,000 = 90,000$).

### 6.2 Granular AP Reconstruction in Code
In `SubledgerReconciliationService.java` (lines 472-484):
```java
BigDecimal purchaseBills = (endOfDay != null)
    ? queryScalarBigDecimal("SELECT IFNULL(SUM(total_invoice_amount), 0) FROM `erp_purchase_invoice` WHERE `tenant_id` = ? AND `status` in ('APPROVED', 'POSTED')" + pinvDateFilter, tenantId, endOfDay)
    : ...;

granularBalance = beginAp.add(purchaseBills).subtract(payments).subtract(debitNotes);
```
`purchaseBills` sums `total_invoice_amount` (**Gross of TDS: 100,000**)!

### 6.3 Resulting Discrepancy
- $\text{GL}_{2320} = 90,000$
- $\text{SL}_{2320} = 90,000$
- $\text{Granular}_{2320} = 100,000$
- $\text{GL-SL Variance} = 0$
- $\text{SL-Granular Variance} = -10,000$
- Status: **`GRANULARITY_DISCREPANCY`** (`ALLOCATION_DIFFERENCE`)
- Decision: **`BLOCKED`** (Annual) / **`EXCEPTION_REQUIRED`** (Monthly)
Every purchase invoice with statutory TDS withholding creates an artificial failure that halts period closing.

---

## 7. Customer Advances (2339) Analysis

- **GL Formula**: $\sum (\text{credit} - \text{debit})$ for account `2339` as of $T_{\text{close}}$.
- **Subledger Formula**: $\sum \text{erp\_supplier.advance\_in}$ (Current snapshot).
- **Granular Formula**: $\sum \text{account\_head ('收预付款')} - \sum \text{gl\_entry ('CUSTOMER\_ADVANCE\_OFFSET')}$.
- **Finding**: When a customer advance is received in Period 1 and applied against an invoice in Period 2:
  - For Period 1, GL balance is credit 10,000, Granular balance is 10,000.
  - But `erp_supplier.advance_in` was decremented to 0 during Period 2 settlement.
  - Reconciling Period 1 in Period 2 fails with `PARTIAL_DISCREPANCY`.

---

## 8. Supplier Advances (1260) Analysis

- **Subledger Query** (lines 560-561):
  ```sql
  SELECT IFNULL(SUM(unallocated_balance), 0) 
  FROM `erp_supplier_advance` 
  WHERE `tenant_id` = ? AND `status` in ('ACTIVE', 'FULLY_SETTLED') 
    AND (payment_date IS NULL OR payment_date <= ?)
  ```
- **Granular Query** (lines 569-575):
  ```sql
  SELECT IFNULL(SUM(gross_advance_amount), 0) - IFNULL(SUM(allocated_amount), 0)
  FROM `erp_supplier_advance`
  WHERE `tenant_id` = ? AND `status` in ('ACTIVE', 'FULLY_SETTLED')
    AND (payment_date IS NULL OR payment_date <= ?)
  ```
- **Finding**:
  Both `unallocated_balance` and `allocated_amount` on `erp_supplier_advance` are mutable columns updated in-place when bills are allocated. If an advance was paid on 2026-04-10 and allocated to a bill on 2026-05-15:
  - As of 2026-04-30, GL `1260` balance is 50,000.
  - But querying `erp_supplier_advance` with `payment_date <= '2026-04-30'` reads `unallocated_balance = 0` and `allocated_amount = 50,000`!
  - Granular evaluates to $50,000 - 50,000 = 0$.
  - Period 2026-04 fails with `DISCREPANT` / `ACCOUNTING_INCONSISTENCY`.

---

## 9. Bank (1232) and Cash (1231) Analysis

Lines 602-608 of `SubledgerReconciliationService.java`:
```java
BigDecimal subledgerBalance = queryLiquidAccountSum(tenantId, "BANK");
// Clarification 2: GL is the authoritative source. If no separate erp_account subledger registered or if 0, GL is authoritative
if (subledgerBalance.compareTo(BigDecimal.ZERO) == 0 && glBalance.compareTo(BigDecimal.ZERO) != 0) {
    subledgerBalance = glBalance;
}
dto.setSubledgerBalance(subledgerBalance);
dto.setGranularBalance(subledgerBalance);
```
Line 1006 queries:
```sql
SELECT IFNULL(SUM(initial_amount), 0) FROM `erp_account`
WHERE `tenant_id` = ? AND (name NOT LIKE '%现金%' AND name NOT LIKE '%cash%') 
  AND ifnull(delete_flag, '0') != '1'
```
- **Finding**:
  `erp_account.initial_amount` is the static opening balance defined when the account was created. It never changes with transactions.
  If a tenant has an initial bank amount of 100,000, `subledgerBalance` is 100,000. The condition `subledgerBalance == 0` is false, so `subledgerBalance` is NOT overridden by `glBalance`.
  If GL balance is 150,000 due to April transactions, the reconciliation compares GL 150,000 against initial amount 100,000, reporting a permanent discrepancy of -50,000!
  **Mandatory Clarification #2** directed that GL be treated as the sole authority because no subledger exists; the fallback condition should not be conditioned on `initial_amount == 0`.

---

## 10. Three-Way Reconciliation Logic & Taxonomy

The truth table in `computeVariancesAndClassification` (lines 1042-1059) strictly adheres to the specified taxonomy:

| Condition | Status | Primary Variance Classification | Period Close Gate Decision |
|---|---|---|---|
| $GL == SL \land SL == Granular$ | `BALANCED` | `NONE` | **PASS** |
| $GL == SL \land SL \neq Granular$ | `GRANULARITY_DISCREPANCY` | `ALLOCATION_DIFFERENCE` | **BLOCKED** |
| $GL \neq SL \land SL == Granular$ | `DISCREPANT` | `ACCOUNTING_INCONSISTENCY` | **BLOCKED** |
| $GL \neq SL \land SL \neq Granular$ | `PARTIAL_DISCREPANCY` | `DATA_INTEGRITY_ISSUE` | **BLOCKED** |

The classification logic itself is deterministic and mathematically sound. The failure arises from supplying corrupted Tier B/C inputs.

---

## 11. Fail-Closed Analysis

### 11.1 Positive Fail-Closed Implementations
- `queryGlNetBalance`: SQL exceptions throw `BusinessRunTimeException(500, ...)` (lines 963-965).
- `queryScalarBigDecimal`: General SQL exceptions throw `BusinessRunTimeException(500, ...)` (lines 1024-1026); only `EmptyResultDataAccessException` returns 0.
- `reconcileFiscalPeriod`: Invalid or non-existent period names throw `BusinessRunTimeException(404, ...)` (lines 86-88).

### 11.2 Fail-Open Exceptions Discovered (P2 Finding)
In drilldown methods:
- Line 807 (`drilldownCustomerAdvances`): `} catch (Exception ignored) {}`
- Line 859 (`drilldownSupplierAdvances`): `} catch (Exception ignored) {}`
- Line 906 (`drilldownLiquidAccounts`): `} catch (Exception ignored) {}`
- Line 1009 (`queryLiquidAccountSum`): `} catch (Exception e) { return BigDecimal.ZERO...; }`
- Line 1098 (`countDrafts`): `} catch (Exception e) { dto.setUnpostedDraftCount(0); ... }`
These blocks swallow errors and return zero, violating strict fail-closed principles.

---

## 12. Read-Only Proof

An exhaustive AST and SQL trace confirms that `SubledgerReconciliationService` contains:
- **0** `INSERT` statements
- **0** `UPDATE` statements
- **0** `DELETE` statements
- **0** GL journal postings
- **0** Fiscal period state transitions
- All entry points are marked `@Transactional(readOnly = true)`.
- Dependency calls to `FinancialPeriodService.getPeriodByName` and `FinancialYearService.getFinancialYearById` execute pure read queries.
**Verdict**: 100% Read-Only invariant is fully satisfied.

---

## 13. Transaction / Snapshot Consistency

- Service methods are annotated with `@Transactional(readOnly = true)`.
- Under MySQL InnoDB default `REPEATABLE READ`, a consistent read view is established on the first `SELECT` statement and held throughout the transaction.
- **Limitation**: While transaction snapshotting ensures that all queries observe a mutually consistent point-in-time database snapshot $S$ at runtime, it **does not solve the temporal asymmetry defect (Finding 1)** because Query 1 explicitly includes `WHERE posting_date <= T_close` while Query 2 has no date constraint at all within snapshot $S$.

---

## 14. Period Integration

- `reconcileFiscalPeriod(tenantId, periodName)` correctly queries `FinancialPeriodService.getPeriodByName(tenantId, periodName)`.
- Period start date, end date, status, number, and financial year metadata are correctly mapped to `ReconciliationSummaryDto`.
- Period status is never mutated.
- Cross-tenant lookups fail closed with 404.

---

## 15. Tenant Isolation

All 27 SQL queries parameterize `tenant_id = ?`:
- GL queries: `WHERE tenant_id = ? AND account_code = ? ...`
- Subledger queries: `WHERE tenant_id = ? ...`
- Granular queries: `WHERE tenant_id = ? ...`
- Draft queries: `WHERE tenant_id = ? ...`
Test 10 (`test10_MultiTenantIsolation`) verified that data in Tenant 801 does not cross into Tenant 802.

---

## 16. Document Lifecycle Handling

| Document Lifecycle State | GL Treatment | Subledger Treatment | Granular Treatment | Defect Identified |
|---|---|---|---|---|
| **Draft** (`status = '0'`) | Excluded | Excluded | Excluded | None (Reported in warning count) |
| **Approved / Posted** | Included | Included | Included | None |
| **Cancelled Invoice** | Reversal GL posted | Decremented | **STILL INCLUDED IN AR (P2)** | Line 403 filters only `status = '1'`, ignoring `posting_status = 'CANCELLED'`. |
| **Purchase Invoice w/ TDS** | Net AP credited | Net AP credited | **GROSS INVOICE SUMMED (P1)** | Line 473 sums `total_invoice_amount` instead of `net_payable_amount`. |

---

## 17. Monetary Precision

- All arithmetic utilizes `java.math.BigDecimal`.
- All variances and balances are normalized to 4 decimal places (`setScale(4, RoundingMode.HALF_UP)`).
- Strict zero comparison: `compareTo(BigDecimal.ZERO) == 0`.
- No floating point types (`double`, `float`) are used.
- No loose tolerance thresholds exist.

---

## 18. Determinism

- Repeated executions against static database states produce identical numeric balances, identical variances, and identical discrepancy classifications.
- Drilldown lists sort by `ORDER BY s.id ASC`.
- Verified in Test 20 (`test20_DeterministicRepeatedExecution`).

---

## 19. API Security

- `ReconciliationController` endpoints are secured by `LogCostFilter` requiring authenticated user session.
- `resolveUserContext` resolves `tenantId` from request attributes or security context.
- **P3 Finding**: In `getSummary` and `getDrilldown`, if `tenantId` is resolved as `0L`, it executes against `tenant_id = 0` rather than throwing `BusinessRunTimeException(400, "Valid tenant ID is required")` like `reconcileFiscalPeriod` does.

---

## 20. Performance & Query Correctness

- Queries use simple indexed aggregates (`SUM`, `COUNT`) bounded by `tenant_id` and date.
- No Cartesian products or unindexed cross-joins.
- Aggregate queries run in under 30ms total across all 6 accounts.

---

## 21. Concurrency Analysis

- Test 14 executed 16 concurrent threads with zero errors.
- Read-only queries under `REPEATABLE READ` do not acquire write locks or cause database contention.
- If a write occurs concurrently during reconciliation, MySQL MVCC serves the consistent snapshot established at the transaction start.

---

## 22. Test Quality Assessment

### 22.1 Test Suite Metrics
- Total Tests: 22 Phase 4C.2 Tests + 117 Full Regression Tests = **139 Tests** (All PASS).

### 22.2 Critical Testing Deficiencies Discovered
1. **Blind Spot in Test 16**: Test 16 created April and May transactions, but deliberately avoided asserting `ar.getSubledgerBalance()` or `summary.getOverallStatus()`, hiding the Temporal Asymmetry defect.
2. **Missing TDS Test**: Not a single test in `SubledgerReconciliationServiceTest` evaluated a purchase invoice with statutory TDS withholding against AP reconciliation.
3. **Missing Liquid Account Movement Test**: Test 8 only tested bank/cash where `initial_amount` exactly equaled the opening GL entry with zero operational movements.

---

## 23. Graphify Verification

Graphify AST analysis confirmed:
- Zero mutation edges from `SubledgerReconciliationService` to database write mappers.
- Zero cyclic dependencies.
- No duplicate reconciliation engines.

---

## 24. Phase 4B Immutability

Independent verification against baseline `5d546ab15cc0047442e33d0533131e38d65a7253`:
- `git diff 5d546ab15cc0047442e33d0533131e38d65a7253 --name-only` confirms **zero changes** to:
  - `FixedAsset*`
  - `AssetClass*`
  - `AssetDepreciation*`
  - `AssetDisposal*`
  - `Schedule III`
  - Phase 4B SQL migrations

---

## 25. Deferred Findings Integrity

The deferred findings remain intact:
- **F-01-R** (Fiscal Year Non-Contiguous Validation) $\rightarrow$ Phase 4C.4
- **F-05** (Retained Earnings Equity Carryforward) $\rightarrow$ Phase 4C.4
- **F-06** (Closing Journal Audit Trail) $\rightarrow$ Phase 4C.4
- **F-07** (Period State Transition Guards) $\rightarrow$ Phase 4C.3

---

## 26. Findings with Severity

### P1 — Production-Blocking Correctness Defects
1. **F-4C2-01: Temporal Asymmetry Between Mutable Subledger and Historical Cutoff**
   - **Files**: `SubledgerReconciliationService.java` (lines 376, 448, 510, 560)
   - **Description**: Subledger balances query current snapshot fields (`all_need_get`, `all_need_pay`, `advance_in`, `unallocated_balance`) with no historical as-of scoping. Retrospective reconciliations compare historical GL against current subledger, producing false discrepancies.
2. **F-4C2-02: AP Granular Reconstruction Gross Total vs Net Payable TDS Distortion**
   - **Files**: `SubledgerReconciliationService.java` (line 473)
   - **Description**: Queries `SUM(total_invoice_amount)` instead of `net_payable_amount` (or `total_invoice_amount - tds_amount`). Every purchase invoice with TDS creates a persistent `GRANULARITY_DISCREPANCY` equal to the TDS amount.

### P2 — Significant Correctness & Control Weaknesses
3. **F-4C2-03: Bank and Petty Cash Static Fallback Comparison**
   - **Files**: `SubledgerReconciliationService.java` (lines 604, 626)
   - **Description**: Only treats GL as authoritative if `initial_amount == 0`. If a bank account has an opening balance, GL is compared against static opening amount indefinitely.
4. **F-4C2-04: Granular AR Includes Cancelled Sales Invoices**
   - **Files**: `SubledgerReconciliationService.java` (line 403)
   - **Description**: Queries `erp_depot_head` with `status = '1'` without checking `posting_status != 'CANCELLED'`. Cancelled invoices distort Granular AR.
5. **F-4C2-05: Silent Exception Swallowing in Drilldown Queries**
   - **Files**: `SubledgerReconciliationService.java` (lines 807, 859, 906, 1009, 1098)
   - **Description**: Uses `catch (Exception ignored) {}` and catches returning `BigDecimal.ZERO`, violating fail-closed requirements.

### P3 — Maintenance & Defense-in-Depth Observations
6. **F-4C2-06: Permissive Tenant 0 Handling in Drilldown and Summary Endpoints**
   - **Files**: `ReconciliationController.java` (lines 76, 97)
   - **Description**: Endpoints permit execution when `tenantId == 0L` instead of failing closed with 400.

---

## 27. Final Recommendation & Action Plan

### 27.1 Recommendation
The implementation **CANNOT BE ACCEPTED AS IS**. It must be remediated under a targeted **Phase 4C.2 Remediation Authorization** before proceeding to Phase 4C.3.

### 27.2 Required Remediation Scope
1. **Remediate F-4C2-01 (Temporal Asymmetry)**:
   For retrospective period close, the subledger must either be reconstructed historically as of $T_{\text{close}}$ from underlying ledger/movement events or reconciled against as-of party sub-aggregates.
2. **Remediate F-4C2-02 (AP TDS Alignment)**:
   Update line 473 of `SubledgerReconciliationService.java` to query `IFNULL(SUM(net_payable_amount), 0)` (or `IFNULL(SUM(total_invoice_amount - IFNULL(tds_amount, 0)), 0)`).
3. **Remediate F-4C2-03 (Bank/Cash Sole Authority)**:
   In accordance with Mandatory Clarification #2, treat GL as the sole authoritative ledger for accounts `1232` and `1231`, without synthetic comparison to static `initial_amount`.
4. **Remediate F-4C2-04 (Cancelled Invoice Exclusion)**:
   Add `AND ifnull(posting_status, '') != 'CANCELLED'` to `erp_depot_head` granular queries.
5. **Remediate F-4C2-05 (Fail-Closed Drilldowns)**:
   Replace all empty `catch (Exception ignored)` blocks with fail-closed logging and `BusinessRunTimeException(500, ...)`.

---

## 28. Absolute Hard Stop Enforcement

This review is complete.
- **Zero code changes have been made.**
- **Zero Phase 4C.3 or 4C.4 work has been started.**
- **Phase 4B remains 100% frozen.**
- Execution is strictly stopped pending user review of this forensic report.
