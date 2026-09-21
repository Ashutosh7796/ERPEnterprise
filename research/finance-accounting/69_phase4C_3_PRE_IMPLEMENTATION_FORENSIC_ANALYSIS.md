# PHASE 4C.3 — PRE-IMPLEMENTATION FORENSIC ANALYSIS & ARCHITECTURE VALIDATION REPORT
## Period Closing State Machine, Pre-Close Reconciliation Gate & Fiscal Immutability

**Document ID**: `research/finance-accounting/69_phase4C_3_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`  
**Date**: September 7, 2026  
**Author**: Principal Enterprise Systems Architect & Lead Financial Systems Auditor  
**Approved Baseline Commit**: `5d546ab15cc0047442e33d0533131e38d65a7253`  
**Phase Status**: READ-ONLY FORENSIC ANALYSIS ONLY — ABSOLUTE FREEZE ENFORCED (ZERO CODE/SCHEMA MUTATIONS)  
**Target Milestone**: Phase 4C.3 — Period Closing State Machine  
**Prior Milestones**:
- Phase 4B (Enterprise Fixed Asset Accounting) = PRODUCTION CUTOVER COMPLETE / FROZEN
- Phase 4C.1 (Period Locking Infrastructure) = ACCEPTED / FROZEN
- Phase 4C.2 (Pre-Close Subledger Reconciliation Gate) = ACCEPTED / FROZEN

---

## 1. Executive Summary

This forensic analysis establishes the technical, architectural, and governance foundation for **Phase 4C.3 (Period Closing State Machine)**. In strict accordance with governance directives, this analysis is **100% read-only**. Zero Java classes, React frontend components, SQL migrations, database tables, or business records have been modified, created, or deleted.

### 1.1 Key Forensic Discoveries

1. **State Machine Foundation Available, Closing Logic Missing**:
   - `FiscalPeriodStatus.java` already defines the lifecycle enum: `UPCOMING`, `ACTIVE`, `LOCKED`, and `CLOSED`, with transition rules preventing transitions out of `CLOSED`.
   - However, `FinancialPeriodService.java` currently implements only `lockPeriod` (`ACTIVE -> LOCKED`) and `unlockPeriod` (`LOCKED -> ACTIVE`). The method `closePeriod` does **not** exist in the codebase.
2. **Authoritative Reconciliation Gate Established & Ready**:
   - Phase 4C.2 established `SubledgerReconciliationService.java` with method `reconcileFiscalPeriod(tenantId, periodName)`. It evaluates 6 statutory control accounts across General Ledger ($A$), Maintained Subledger ($B$), and Granular Transactional Reconstruction ($C$), exposing `summary.getPeriodCloseReady()`.
   - `getPeriodCloseReady()` returns `true` if and only if all 6 control accounts have status `BALANCED` (zero absolute variance).
3. **Critical Accounting Distinction: LOCKED vs CLOSED**:
   - `LOCKED` represents an **operational posting freeze** (soft lock) applied at month-end to halt general user data entry while Finance conducts adjustments, accruals, depreciation runs, and reconciliations. It is reversible by an authorized Financial Controller.
   - `CLOSED` represents **statutory fiscal closure** (hard lock). Once closed, the period is permanent and immutable.
4. **Concurrency Safety Proven at Database Engine Level**:
   - `GlEntryService.postEntries()` executes `selectByDateForShare` (Shared S-Lock) in InnoDB.
   - `FinancialPeriodService.lockPeriod()` executes `selectByPeriodNameForUpdate` (Exclusive X-Lock).
   - Because MySQL InnoDB S-locks and X-locks are mutually exclusive, a concurrent GL posting and period closing cannot interleave unsafely. If posting starts first, closing waits; if closing starts first, posting blocks and subsequently fails closed when reading `status = CLOSED`.
5. **Operational Document Mutation Bypass Risk Discovered (Finding F-4C3-02, P1)**:
   - While `GlEntryService` strictly enforces `validatePeriodOpen`, operational services (e.g., `GstSalesInvoiceService.java:324`) catch GL posting exceptions and log a warning (`logger.warn`), allowing operational document state transitions to advance while GL posting fails. This would cause a subledger-to-GL discrepancy.
6. **Multi-Tenant Leakage Risk on Period Update (Finding F-4C3-01, P2)**:
   - `FiscalPeriodMapperEx.xml`'s `updateById` query filters `WHERE id = #{id}` without checking `tenant_id = #{tenantId}`, which violates the strict multi-tenant isolation pattern enforced elsewhere in the repository.

---

## 2. Current Architecture & Component Inventory

### 2.1 Backend Component Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               REST CONTROLLERS (Web Tier)                             │
│   ReconciliationController     FinancialYearController     [PeriodController - 4C.3]   │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER (Business Logic)                            │
│  ┌─────────────────────────────┐                    ┌───────────────────────────────┐  │
│  │   FinancialPeriodService    │◄───(reconciles)────┤ SubledgerReconciliationSvc    │  │
│  │  (Period Lifecycle Auth)   │                    │  (3-Way Gate Authority)       │  │
│  └──────────────┬──────────────┘                    └───────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 ▼                                                   │                  │
│  ┌─────────────────────────────┐                                    │                  │
│  │       GlEntryService        │                                    │                  │
│  │   (Posting Chokepoint)      │                                    │                  │
│  └──────────────┬──────────────┘                                    │                  │
└─────────────────┼───────────────────────────────────────────────────┼──────────────────┘
                  │                                                   │
                  ▼                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE TIER (MySQL 8 / InnoDB)                          │
│   erp_fiscal_period         erp_financial_year       erp_gl_entry (Fact Ledger)        │
│   erp_document_audit_log    erp_supplier             erp_depot_head                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Call Graph Verification

The operational and financial posting flow proceeds through the following verified call sequence:

```
Operational Document (e.g. Sales, Purchase, JV, Payment, Asset Depreciation)
    ↓
Operational Posting Service (e.g. SalesAccountingPostingService, PurchaseAccountingPostingService)
    ↓
GlEntryService.postEntries() [Transactional Chokepoint]
    ↓
FinancialPeriodService.validatePeriodOpen(tenantId, entry.getPostingDate())
    ↓
FiscalPeriodMapperEx.selectByDateForShare(tenantId, normalizedDate) [S-Lock on erp_fiscal_period]
    ↓
FinancialYearService.getFinancialYearByDate(tenantId, normalizedDate)
    ↓
[Verification: FY.status == 'ACTIVE' AND Period.status == 'ACTIVE']
    ↓
GlEntryMapper.batchInsert() -> erp_gl_entry
```

Where Period Status is Currently Enforced:
- **`GlEntryService.java:128`**: Invokes `financialPeriodService.validatePeriodOpen(tenantId, entry.getPostingDate())` for *every* individual line in a voucher batch.
- **`GlEntryService.java:132`**: Enforces the single-period voucher invariant: all lines in a voucher must resolve to the identical `periodName`.
- **`GlEntryService.java:194`**: In `reverseEntries()`, validates that `actualReversalDate` belongs to an active, open period before generating reversal lines.

---

## 3. Current Period Lifecycle State & Source Code Audit

### 3.1 Domain Entity: `FiscalPeriod.java`
Located at `ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/FiscalPeriod.java`:
- Fields: `id`, `tenantId`, `financialYearId`, `periodNumber` (1-12), `periodName` (e.g. `2026-04`), `startDate`, `endDate`, `status`, `lockedBy`, `lockedTime`, `lockReason`, `deleteFlag`, `createTime`, `updateTime`.

### 3.2 State Enumeration: `FiscalPeriodStatus.java`
Located at `ERPSystem-boot/src/main/java/com/jsh/erp/constants/FiscalPeriodStatus.java`:
```java
public enum FiscalPeriodStatus {
    UPCOMING,
    ACTIVE,
    LOCKED,
    CLOSED;

    public boolean canTransitionTo(FiscalPeriodStatus target) {
        if (target == null) return false;
        if (this == target) return true; // Idempotent no-op
        switch (this) {
            case UPCOMING:
                return target == ACTIVE;
            case ACTIVE:
                return target == LOCKED || target == CLOSED;
            case LOCKED:
                return target == ACTIVE || target == CLOSED;
            case CLOSED:
                return false; // CLOSED is strictly immutable
            default:
                return false;
        }
    }
}
```

### 3.3 Service Implementation: `FinancialPeriodService.java`
Located at `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialPeriodService.java`:
- `validatePeriodOpen(Long tenantId, Date postingDate)` [Lines 65-117]: Acquires shared lock `selectByDateForShare`. Checks that parent `FinancialYear` status is `ACTIVE` and `FiscalPeriod` status is `ACTIVE`. Rejects `UPCOMING`, `LOCKED`, and `CLOSED`.
- `ensurePeriodsForFinancialYear(FinancialYear fy)` [Lines 277-330]: Idempotently generates 12 calendar-accurate monthly periods (Period 1 = April through Period 12 = March), computing February leap-year boundaries dynamically via `java.time.YearMonth`.
- `lockPeriod(Long tenantId, String periodName, String reason, Long userId)` [Lines 346-381]:
  - Executes `selectByPeriodNameForUpdate` (X-Lock).
  - Asserts `status == ACTIVE`.
  - Sets `status = LOCKED`, records `locked_by`, `locked_time`, `lock_reason`.
  - Appends audit entry to `erp_document_audit_log`.
- `unlockPeriod(Long tenantId, String periodName, String reason, Long userId)` [Lines 388-422]:
  - Executes `selectByPeriodNameForUpdate` (X-Lock).
  - Asserts `status == LOCKED`.
  - Sets `status = ACTIVE`, clears `locked_by` and `locked_time`.
  - Appends audit entry to `erp_document_audit_log`.
- **Gaps Identified**:
  - No `closePeriod` method exists.
  - No pre-close reconciliation check is called during any transition.
  - No role-based access control (RBAC) is verified inside `unlockPeriod` (any authenticated user ID can be passed).

---

## 4. Definition of Period States & State-Transition Matrix

### 4.1 State Definitions

| State | Purpose & Operational Meaning | GL Posting Permitted? | Document Reversals Permitted? | Document Approvals Permitted? | Reopening Permitted? |
|---|---|:---:|:---:|:---:|:---:|
| **`UPCOMING`** | Future monthly period that has been provisioned but whose calendar window has not commenced. Prevents premature postings while allowing advance scheduling. | **NO** | **NO** | **NO** | N/A (Transitions to ACTIVE) |
| **`ACTIVE`** | Normal operational accounting period. Transactions, invoices, payments, JVs, receipts, and reversals can be freely posted. | **YES** | **YES** | **YES** | N/A (Already Active) |
| **`LOCKED`** | Operational posting freeze (soft lock). Standard business users cannot post new transactions or approvals. Used by Finance to conduct month-end reconciliations, accruals, and review. | **NO** | **NO** (Unless date in open period) | **NO** | **YES** (By Financial Controller with Reason & Audit) |
| **`CLOSED`** | Statutory final closure (hard lock). Final financial statements and tax filings are signed off. General Ledger entries for this period are permanently frozen and immutable. | **NO** | **NO** | **NO** | **NO** (Strictly Immutable) |

### 4.2 State-Transition Matrix

```
       ┌───────────┐
       │ UPCOMING  │
       └─────┬─────┘
             │ activatePeriod()
             ▼
       ┌───────────┐       lockPeriod()        ┌───────────┐
       │  ACTIVE   │ ────────────────────────> │  LOCKED   │
       └─────┬─────┘ <──────────────────────── └─────┬─────┘
             │             unlockPeriod()            │
             │                                       │
             │ closePeriod()                         │ closePeriod()
             │ [Gate: Reconciled == true]            │ [Gate: Reconciled == true]
             ▼                                       ▼
       ┌───────────────────────────────────────────────────┐
       │                      CLOSED                       │
       │               (Strictly Immutable)                │
       └───────────────────────────────────────────────────┘
```

| Source Status | Target Status | Operation | Role Required | Reconciliation Gate Required? | Audit Log Generated? | Concurrency Mechanism |
|---|---|---|---|:---:|:---:|---|
| `UPCOMING` | `ACTIVE` | `activatePeriod()` | `FINANCIAL_CONTROLLER` / Auto | No | Yes | `FOR UPDATE` row lock |
| `ACTIVE` | `LOCKED` | `lockPeriod()` | `FINANCIAL_CONTROLLER` | No (Freeze must be allowed during discrepancy) | Yes | `FOR UPDATE` row lock |
| `LOCKED` | `ACTIVE` | `unlockPeriod()` | `FINANCIAL_CONTROLLER` | No | Yes | `FOR UPDATE` row lock |
| `ACTIVE` | `CLOSED` | `closePeriod()` | `FINANCIAL_CONTROLLER` | **YES** (`periodCloseReady == true`) | Yes | `FOR UPDATE` row lock |
| `LOCKED` | `CLOSED` | `closePeriod()` | `FINANCIAL_CONTROLLER` | **YES** (`periodCloseReady == true`) | Yes | `FOR UPDATE` row lock |
| `CLOSED` | `*` | Any transition | Prohibited | N/A | Logged failure attempt | Throws `BusinessRunTimeException` |
| `*` | Same Status | Duplicate call | Caller | No | No (Idempotent return) | Idempotent no-op |

---

## 5. Critical Architectural Analysis: LOCKED vs CLOSED

### 5.1 Why Both States Are Required

In modern ERP financial systems (SAP FI, NetSuite, Microsoft Dynamics 365):
1. **The Operational Dilemma**:
   Month-end close is an iterative, multi-day process. At 23:59:59 on April 30, April is complete. On May 1, normal billing for May must continue, but sales clerks must **not** continue creating April invoices.
   However, the finance team cannot immediately close April on May 1 because:
   - Bank statements are being reconciled.
   - Depreciation runs must execute.
   - Accruals and provisions must be computed.
   - If an error is found during reconciliation, an adjusting journal entry must be posted into April.
2. **The Role of `LOCKED`**:
   `LOCKED` provides an administrative operational freeze. Standard users are blocked from posting to April, while May remains `ACTIVE`. If an adjustment is necessary, a privileged Financial Controller can unlock April (`LOCKED -> ACTIVE`), post the adjustment, and re-lock it.
3. **The Role of `CLOSED`**:
   Once all reconciliations pass with zero variance and statutory returns (GSTR-1, GSTR-3B, TDS Form 26Q) are finalized, the period is marked `CLOSED`.
   - Under statutory standards (Companies Act 2013, Ind AS 8, AS 5), closed periods **cannot be retroactively modified**.
   - If an error is discovered months later, statutory accounting requires posting a "Prior Period Error Correction" in the **current open period**, never rewriting historical books.

### 5.2 Immutability Policy for CLOSED

The four governance options for `CLOSED` periods were evaluated:

| Option | Architecture & Governance Model | Statutory Compliance | Audit Risk | Recommendation Status |
|---|---|:---:|:---:|:---:|
| **Option 1: Permanently Immutable in Code** | `CLOSED -> *` is strictly forbidden in application code. Any attempt throws fatal exception. Reopening requires direct DBA database intervention. | **HIGH** (Full compliance with Ind AS 8 / AS 5) | **ZERO** (No retroactive tampering) | **RECOMMENDED (Default)** |
| **Option 2: Controlled Disaster-Recovery Reopen** | Dual-authorization workflow requiring digital signatures of both `CFO` and `SYSTEM_ADMIN` with mandatory justification document. Automatically marks subsequent periods for re-reconciliation. | **ACCEPTABLE** (Under strict audit disclosure) | **LOW** (Cryptographic audit trail) | **ALTERNATIVE (Conditional)** |
| **Option 3: Single-User Supervisory Unlock** | Financial Controller can reopen `CLOSED` with reason. | **NON-COMPLIANT** (Allows retroactive book alteration) | **EXTREME** (Audit qualification risk) | **REJECTED** |
| **Option 4: Non-Strict Close (Soft Close Only)** | Merges `LOCKED` and `CLOSED` into a single toggleable state. | **NON-COMPLIANT** | **UNACCEPTABLE** | **REJECTED** |

**Architectural Verdict**: Option 1 is already codified in `FiscalPeriodStatus.java:33` (`case CLOSED: return false`). We recommend maintaining Option 1 as the system boundary. If business operations require emergency corrections, Option 2 can be introduced under a formal multi-signature governance protocol in a future administrative phase.

---

## 6. Pre-Close Reconciliation Gate Integration

### 6.1 Authority Consumption: `SubledgerReconciliationService`

Phase 4C.2 established `SubledgerReconciliationService` as the sole reconciliation authority. Phase 4C.3 must consume it as a **read-only gatekeeper**.

```java
// Method signature in SubledgerReconciliationService:
public ReconciliationSummaryDto reconcileFiscalPeriod(Long tenantId, String periodName);
```

### 6.2 The 6 Control Accounts

Closing a period requires mathematical parity across all 6 statutory control accounts:
1. **`1220` — Trade Receivables (Sundry Debtors)**: $GL = SL = \text{Granular}$
2. **`2320` — Trade Payables (Sundry Creditors)**: $GL = SL = \text{Granular}$
3. **`2339` — Advance from Customers**: $GL = SL = \text{Granular}$
4. **`1260` — Advances to Suppliers**: $GL = SL = \text{Granular}$
5. **`1232` — Operating Bank Account**: $GL = \text{Authoritative Ledger}$
6. **`1231` — Petty Cash in Hand**: $GL = \text{Authoritative Ledger}$

### 6.3 Gate Truth Table & Gate Decisions

| Reconciliation Result | `overallStatus` | `periodCloseReady` | Action on `closePeriod()` | Rationale |
|---|---|:---:|:---:|---|
| **All 6 Accounts `BALANCED`** | `BALANCED` | `true` | **PROCEED (ALLOW CLOSE)** | Complete 3-way mathematical agreement. |
| **Balances match, Drafts exist** | `WARNING_DRAFTS_EXIST` | `true` | **PROCEED WITH WARNING** | Financial ledger is balanced; drafts do not impact accounting fact ledger. |
| **`GRANULARITY_DISCREPANCY`** | `DISCREPANCY` | `false` | **FAIL CLOSED (BLOCK CLOSE)** | $GL = SL$, but underlying documents do not sum to total. High fraud/corruption risk. |
| **`DISCREPANT`** | `DISCREPANCY` | `false` | **FAIL CLOSED (BLOCK CLOSE)** | Direct ledger-to-subledger mismatch ($GL \neq SL$). |
| **`PARTIAL_DISCREPANCY`** | `DISCREPANCY` | `false` | **FAIL CLOSED (BLOCK CLOSE)** | Multi-tier breakdown across $GL$, $SL$, and Granular. |
| **Query Failure / DB Timeout** | Exception thrown | N/A | **FAIL CLOSED (BLOCK CLOSE)** | Never close on uncertain or partial data. |

### 6.4 Gate Placement: Before LOCKED vs Before CLOSED

- **Validation Before `LOCKED`**: **PROHIBITED**.
  - If reconciliation fails due to a discrepancy, an administrator **must** be allowed to `LOCK` the period immediately to prevent further transactions from widening the variance while the investigation occurs.
- **Validation Before `CLOSED`**: **MANDATORY**.
  - A period cannot transition to `CLOSED` unless `summary.getPeriodCloseReady() == true`.

---

## 7. Year-End Dependency Analysis (Phase 4C.3 vs Phase 4C.4)

Phase 4C.3 is strictly **Monthly Period Closing**. It must not implement annual nominal account closing or Retained Earnings transfers.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 4C DEPENDENCY PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 1. Phase 4C.1 (FROZEN): Period Locking Infrastructure                           │
│    - erp_fiscal_period table, validatePeriodOpen(), lockPeriod(), unlockPeriod()│
│                                                                                 │
│ 2. Phase 4C.2 (FROZEN): Pre-Close Subledger Reconciliation Gate                 │
│    - 3-Way Reconciliation across 6 control accounts, reconcileFiscalPeriod()    │
│                                                                                 │
│ 3. Phase 4C.3 (CURRENT TARGET): Period Closing State Machine                    │
│    - closePeriod() method with Subledger Reconciliation barrier check           │
│    - Sequential monthly closure (Month 1 -> 12)                                 │
│    - Immutability enforcement for CLOSED status                                 │
│    - Audit trail logging and multi-tenant security                              │
│                                                                                 │
│ 4. Phase 4C.4 (DEFERRED TO NEXT PHASE): Year-End Close & Retained Earnings      │
│    - Annual FinancialYear closing (FinancialYear.status = 'CLOSED')             │
│    - Aggregation of all Nominal accounts (Revenue 3xxx, Expense 4xxx)           │
│    - Posting YEAR_END_CLOSE journal voucher to Retained Earnings (Account 2120) │
│    - Creation of erp_year_end_closing audit record                              │
│    - Roll-forward of Balance Sheet opening balances to subsequent year          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Strict Scope Isolation**: Phase 4C.3 must **not** zero out nominal accounts or touch Account `2120` (Retained Earnings).

---

## 8. Backdated Posting & Temporal Contract Analysis

### 8.1 Investigation of the 4 Key Scenarios

#### Scenario 1: Document Dated April 2026, Current Period May 2026, April is CLOSED
- **User Action**: User attempts to post a Sales Invoice, Purchase Bill, or JV dated `2026-04-15`.
- **System Behavior**:
  - `GlEntryService.postEntries()` receives entry with `postingDate = 2026-04-15`.
  - `financialPeriodService.validatePeriodOpen(tenantId, 2026-04-15)` executes `selectByDateForShare`.
  - The returned `FiscalPeriod` (`2026-04`) has `status = 'CLOSED'`.
  - `validatePeriodOpen` throws:
    ```
    BusinessRunTimeException("Posting rejected: Fiscal period [2026-04] is CLOSED (Posting date: 2026-04-15)")
    ```
  - Result: **Posting fails closed**. No GL entries are inserted.

#### Scenario 2: Document Date = April, Approval Date = May
- **Business Event**: Invoice received or drafted on April 28, but operational review and approval occurs on May 3.
- **Posting Date Contract**:
  - Under the Phase 4C.2 temporal contract, accounting recognition occurs when the document is **approved/posted**, using the approval timestamp (`new Date()` in May).
  - Since May is `ACTIVE`, GL entries post into May with `posting_date = 2026-05-03`.
  - In April reconciliation ($D = \text{April 30}$), this transaction has `posting_date > D` and is cleanly excluded.
  - In May reconciliation, it is included across GL, Subledger, and Granular layers.
  - **Verdict**: Fully compliant with Phase 4C.2 dual-timeline contract.

#### Scenario 3: Document Date = March (FY 2025-26), Approval Date = April (FY 2026-27)
- **Business Event**: Vendor bill dated March 25 approved on April 5 across the annual fiscal year boundary.
- **System Behavior**:
  - If March (Period 12 of FY 2025-26) is CLOSED, posting into March is blocked.
  - The posting date must be April in the new financial year (`2026-27`), ensuring that closed prior-year statutory accounts remain unmodified.

#### Scenario 4: Original Posting Date = April, Reversal Date = May
- **Business Event**: Document posted in April is cancelled or reversed in May.
- **System Behavior**:
  - `GlEntryService.reverseEntries()` sets `postingDate = actualReversalDate` (May).
  - `validatePeriodOpen` validates May. Since May is `ACTIVE`, the reversal succeeds.
  - The original April GL rows remain 100% historically intact (append-only ledger).
  - April cumulative reports run historically remain deterministic. May accounts for the reversal delta.

---

## 9. Period Closing Concurrency Analysis

### 9.1 The Thread A (Posting) vs Thread B (Closing) Race Condition

Consider the critical interleaving:
- **Thread A**: User initiates GL posting for ₹500,000 on April 30.
- **Thread B**: Financial Controller initiates `closePeriod("2026-04")`.

```
Timeline:
Thread A: Validates period is ACTIVE
Thread B: Closes period (status = CLOSED)
Thread A: Commits batchInsert to erp_gl_entry
```
**Risk**: If this sequence occurs, a transaction would commit into a `CLOSED` period!

### 9.2 Mathematical Proof of Protection via MySQL InnoDB Locks

We verify the actual transaction boundaries and lock modes in the current codebase:

1. **Thread A Transaction Boundary (`GlEntryService.java:92-167`)**:
   - Annotated with `@Transactional(value = "transactionManager")`.
   - Executes line 128:
     ```java
     FiscalPeriod fp = financialPeriodService.validatePeriodOpen(tenantId, entry.getPostingDate());
     ```
   - Inside `validatePeriodOpen`, executes `FiscalPeriodMapperEx.xml:52`:
     ```sql
     SELECT * FROM erp_fiscal_period 
     WHERE tenant_id = #{tenantId}
       AND DATE(#{targetDate}) >= start_date AND DATE(#{targetDate}) <= end_date
       AND ifnull(delete_flag, '0') != '1'
     FOR SHARE;
     ```
   - **Lock Acquired**: **Shared Read Lock (S-Lock)** on the `erp_fiscal_period` row.
   - In InnoDB, this S-Lock is held for the entire duration of Thread A's transaction until `COMMIT` or `ROLLBACK`.

2. **Thread B Transaction Boundary (`FinancialPeriodService.java:346`)**:
   - Annotated with `@Transactional(value = "transactionManager")`.
   - Executes `FiscalPeriodMapperEx.xml:36`:
     ```sql
     SELECT * FROM erp_fiscal_period 
     WHERE tenant_id = #{tenantId}
       AND period_name = #{periodName}
       AND ifnull(delete_flag, '0') != '1'
     FOR UPDATE;
     ```
   - **Lock Requested**: **Exclusive Write Lock (X-Lock)** on the same row.

3. **InnoDB Lock Compatibility Matrix**:
   ```
                 Requested Lock
   Existing Lock │  S-Lock (Read)  │  X-Lock (Write)
   ──────────────┼─────────────────┼──────────────────
   S-Lock (Read) │    COMPATIBLE   │   CONFLICT (BLOCK)
   X-Lock (Write)│ CONFLICT (BLOCK)│   CONFLICT (BLOCK)
   ```

4. **Proof of Mutual Exclusion**:
   - **Case 1 (Thread A starts first)**:
     - Thread A acquires S-Lock on `erp_fiscal_period` for April.
     - Thread B attempts `SELECT ... FOR UPDATE` (X-Lock).
     - Because X-Lock conflicts with S-Lock, **Thread B BLOCKS** at the database level and waits for Thread A.
     - Thread A inserts its GL lines and commits. S-Lock is released.
     - Thread B unblocks, acquires X-Lock, and executes `reconcileFiscalPeriod()`.
     - Because Thread A committed, Thread B's reconciliation query **sees Thread A's committed GL lines**!
     - If balanced, Thread B closes April.
   - **Case 2 (Thread B starts first)**:
     - Thread B acquires X-Lock on `erp_fiscal_period` for April.
     - Thread A attempts `SELECT ... FOR SHARE` (S-Lock).
     - Because S-Lock conflicts with X-Lock, **Thread A BLOCKS** and waits for Thread B.
     - Thread B updates `status = 'CLOSED'` and commits. X-Lock is released.
     - Thread A unblocks and reads the updated row: `status = 'CLOSED'`.
     - Thread A's `validatePeriodOpen()` executes lines 110-114:
       ```java
       if (!"ACTIVE".equalsIgnoreCase(period.getStatus())) {
           throw new BusinessRunTimeException("Posting rejected: Fiscal period is CLOSED");
       }
       ```
     - Thread A throws an exception and rolls back! **Zero GL entries are inserted.**

**Conclusion**: The existing Phase 4C.1 `FOR SHARE` / `FOR UPDATE` mechanism **guarantees 100% serializability and concurrency safety**. A posting cannot commit into a closed period under any race condition.

---

## 10. Reopening and Unlock Governance

### 10.1 Reopening a LOCKED Period
- **Allowed Status Transition**: `LOCKED -> ACTIVE`.
- **Governance Requirements**:
  1. **Permission / Role**: Elevated role only (`FINANCIAL_CONTROLLER`, `CFO`, or `TENANT_ADMIN`).
  2. **Mandatory Reason**: Non-blank justification string (minimum 10 characters).
  3. **Audit Trail**: Real-time event recorded in `erp_document_audit_log` with `action_type = 'UNLOCK'`, capturing `operator_id`, `operator_name`, `previous_status = 'LOCKED'`, `new_status = 'ACTIVE'`, and `event_time`.

### 10.2 Reopening a CLOSED Period
- **Standard Policy**: **FORBIDDEN**.
  - `FiscalPeriodStatus.validateTransition()` throws:
    ```
    "Invalid period lifecycle transition: CLOSED fiscal periods are immutable and cannot be transitioned to ACTIVE"
    ```
- **Disaster Recovery Governance (If Ever Approved)**:
  If a catastrophic operational failure or judicial order demands reopening a closed period, it must require:
  - Dual-key authorization (SuperAdmin + CFO).
  - Formal incident reference ticket number.
  - Statutory warning that all filed returns and statements for that period become invalid.

---

## 11. Audit Architecture & Historical Logging

### 11.1 Verification of `erp_document_audit_log`
The table schema in `ERPSystem-boot/docs/ERPSystem.sql:238` was inspected:
- Columns: `id`, `tenant_id`, `document_type`, `document_id`, `document_number`, `sequence_number`, `previous_status`, `new_status`, `action_type`, `operator_id`, `operator_name`, `reason`, `event_time`.
- Unique Index: `uq_audit_tenant_doc_seq (tenant_id, document_id, sequence_number)`.

### 11.2 Audit Capability Matrix

| Lifecycle Event | `document_type` | `action_type` | `previous_status` | `new_status` | Supported in Existing Table? |
|---|---|---|---|---|:---:|
| **Lock Period** | `FISCAL_PERIOD` | `LOCK` | `ACTIVE` | `LOCKED` | **YES** |
| **Unlock Period** | `FISCAL_PERIOD` | `UNLOCK` | `LOCKED` | `ACTIVE` | **YES** |
| **Close Period** | `FISCAL_PERIOD` | `CLOSE` | `LOCKED` / `ACTIVE` | `CLOSED` | **YES** |
| **Close Failure (Discrepancy)** | `FISCAL_PERIOD` | `CLOSE_FAILED` | `LOCKED` | `LOCKED` | **YES** |
| **Attempted Post to Closed** | `FISCAL_PERIOD` | `POST_REJECTED` | `CLOSED` | `CLOSED` | **YES** |

**Conclusion**: The existing audit table `erp_document_audit_log` is **100% sufficient**. Creating a new audit table is completely unnecessary and would violate the single-audit-authority architecture.

---

## 12. Multi-Tenant Safety Audit

### 12.1 Scoping Audit Across Mappers & Services

Every SQL query in `FiscalPeriodMapperEx.xml` was inspected for tenant isolation:

| Query ID | SQL Operation | Tenant Filter Present? | Tenant Safety Verdict |
|---|---|:---:|:---:|
| `selectById` | `SELECT ... WHERE tenant_id = #{tenantId} AND id = #{id}` | **YES** | **PASS** |
| `selectByPeriodName` | `SELECT ... WHERE tenant_id = #{tenantId} AND period_name = #{periodName}` | **YES** | **PASS** |
| `selectByPeriodNameForUpdate` | `SELECT ... WHERE tenant_id = #{tenantId} ... FOR UPDATE` | **YES** | **PASS** |
| `selectByDate` | `SELECT ... WHERE tenant_id = #{tenantId} ...` | **YES** | **PASS** |
| `selectByDateForShare` | `SELECT ... WHERE tenant_id = #{tenantId} ... FOR SHARE` | **YES** | **PASS** |
| `selectByFinancialYearId` | `SELECT ... WHERE tenant_id = #{tenantId} ...` | **YES** | **PASS** |
| `selectOverlappingPeriods` | `SELECT ... WHERE tenant_id = #{tenantId} ...` | **YES** | **PASS** |
| `selectAll` | `SELECT ... WHERE tenant_id = #{tenantId}` | **YES** | **PASS** |
| `insert` / `insertIgnore` | `INSERT INTO erp_fiscal_period (tenant_id, ...)` | **YES** | **PASS** |
| `deleteById` | `UPDATE ... WHERE tenant_id = #{tenantId} AND id = #{id}` | **YES** | **PASS** |
| **`updateById`** | `UPDATE erp_fiscal_period ... WHERE id = #{id}` | **NO** | **DEFECT (Finding F-4C3-01)** |

### 12.2 Vulnerability Finding: F-4C3-01 (P2)
- **Problem**: Line 124 of `FiscalPeriodMapperEx.xml` defines `updateById` as:
  ```xml
  UPDATE erp_fiscal_period
  SET ...
  WHERE id = #{id}
  ```
  It lacks `AND tenant_id = #{tenantId}`. While current service methods retrieve the entity via `selectByPeriodNameForUpdate(tenantId, ...)` before calling `updateById`, any direct call with an ID from Tenant B could update Tenant B's record.
- **Required Remediation in Phase 4C.3 Scope**: Update `updateById` to include `AND tenant_id = #{tenantId}`.

---

## 13. Idempotency Specification

| Operation | Calling Scenario | Expected Behavior | State Change | Return Value |
|---|---|---|:---:|---|
| `lockPeriod(P)` | Period `P` is `ACTIVE` | Normal transition | `ACTIVE -> LOCKED` | Updated `FiscalPeriod` |
| `lockPeriod(P)` | Period `P` is already `LOCKED` | Idempotent success | None | Current `FiscalPeriod` |
| `unlockPeriod(P)` | Period `P` is `LOCKED` | Normal transition | `LOCKED -> ACTIVE` | Updated `FiscalPeriod` |
| `unlockPeriod(P)` | Period `P` is already `ACTIVE` | Idempotent success | None | Current `FiscalPeriod` |
| `closePeriod(P)` | Period `P` is `LOCKED`/`ACTIVE` & Balanced | Normal transition | `-> CLOSED` | Updated `FiscalPeriod` |
| `closePeriod(P)` | Period `P` is already `CLOSED` | Idempotent success | None | Current `FiscalPeriod` |
| `closePeriod(P)` | Period `P` has Discrepancy | Rejected / Fail Closed | None | Throws `BusinessRunTimeException` |
| `closePeriod(P)` | Period `P` is `UPCOMING` | Rejected / Fail Closed | None | Throws `BusinessRunTimeException` |

---

## 14. Failure Mode & Fail-Closed Analysis

The core architectural principle of Phase 4C is: **NO SILENT SUCCESS**.

| Failure Scenario | Immediate Detection Chokepoint | System Reaction | Financial Ledger Protection |
|---|---|---|---|
| **Reconciliation service times out or throws DB exception** | `closePeriod()` calling `reconcileFiscalPeriod()` | Catches exception, aborts close, rolls back transaction. | Period remains in prior state. Zero data corruption. |
| **Control account has 0.01 variance** | `summary.getPeriodCloseReady()` returns `false` | Throws `BusinessRunTimeException` listing exact account code and variance. | Period remains unclosed. |
| **Unposted draft documents exist** | `summary.getOverallStatus() == 'WARNING_DRAFTS_EXIST'` | Permitted with explicit supervisor parameter `allowDrafts=true`, else blocked. | Drafts cannot impact GL facts. |
| **User context has invalid / missing tenant ID** | `resolveTenantId()` in controller / service | Throws `BusinessRunTimeException(401, "Unauthorized")`. | Multi-tenant boundary preserved. |
| **Concurrent state modification (Thread A locks while Thread B closes)** | MySQL InnoDB row lock on `erp_fiscal_period` | Serialized by `FOR UPDATE`. Second thread reads committed state and acts idempotently. | Zero race conditions. |
| **Audit log insert fails (e.g. sequence collision)** | `@Transactional` rollback in `FinancialPeriodService` | Transaction rolls back completely; status change is cancelled. | No un-audited state changes exist. |

---

## 15. Database Constraint Analysis (`erp_fiscal_period`)

### 15.1 Current Constraints in `V3_8__fiscal_period_and_locking.sql`
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_period_tenant_name (tenant_id, period_name, delete_flag)`
- `KEY idx_period_tenant_dates (tenant_id, start_date, end_date, delete_flag)`
- `KEY idx_period_tenant_fy (tenant_id, financial_year_id, delete_flag)`

### 15.2 Constraint Gaps Identified (Design Documentation Only — No Schema Alteration)
1. **No Check Constraint on Period Number**: Database permits arbitrary integers outside `[1, 12]`. Application layer (`validatePeriodDateRange`) enforces `periodNumber >= 1 && periodNumber <= 12`.
2. **No Check Constraint on Status**: Database permits arbitrary strings. Application layer enforces `FiscalPeriodStatus` enum values.
3. **No Check Constraint on Dates (`start_date <= end_date`)**: Enforced in `validatePeriodDateRange`.
4. **No Foreign Key to `erp_financial_year(id)`**: Omitted in MySQL schema per project convention; referential integrity maintained in service layer.

---

## 16. Accounting Immutability & Operational Mutation Paths

### 16.1 Critical Forensic Investigation: Can Operational Documents Mutate Without GL?

A deep forensic inspection was conducted across operational services to determine whether an operational document can be modified, approved, or cancelled while its accounting period is closed:

1. **`GlEntryService.java`**: **100% IMMUTABLE CHOKEPOINT**.
   - Inspection of line 155 and line 243 confirms that `glEntryMapper.batchInsert()` is called **only** inside `GlEntryService.java`. Zero other services write directly to `erp_gl_entry`.
   - Every posting and reversal strictly verifies `financialPeriodService.validatePeriodOpen()`.
2. **Operational Document Status Transition Risk: Finding F-4C3-02 (P1)**:
   - In `GstSalesInvoiceService.java:324-326`:
     ```java
     try {
         salesAccountingPostingService.postSalesInvoiceToGeneralLedger(...);
     } catch (Exception e) {
         logger.warn("[Tenant {}] GL Posting notice: {}", tenantId, e.getMessage());
     }
     ```
   - **Forensic Finding**: If an invoice dated in a CLOSED period is submitted for state transition to `POSTED`, `stateMachineService.transitionStatus()` marks the invoice as `POSTED` in `erp_depot_head`. Then `postSalesInvoiceToGeneralLedger()` throws `BusinessRunTimeException` (period closed), but the catch block **swallows** the exception and merely logs a warning!
   - **Consequence**: The operational document becomes `POSTED`, but zero GL entries are created!
   - This creates a severe desynchronization between operational tables and the General Ledger.

### 16.2 Required Architectural Remedy for Phase 4C.3 Scope
In Phase 4C.3 implementation, operational mutation endpoints must enforce an **upfront period check** or guarantee **atomic rollback**:
- Either `isPeriodOpen()` must be called before advancing operational document status,
- Or the catch block must **rethrow** the exception so that the operational transaction rolls back atomically.

---

## 17. Reporting Engine Behavior Across Period States

Inspection of `FinancialStatementService.java` confirms that financial reports (Trial Balance, Balance Sheet, P&L, GL Audit Trail) are pure-GL queries executing against `erp_gl_entry` directly with `@Transactional(readOnly = true)`.

| Report | Behavior in ACTIVE Period | Behavior in LOCKED Period | Behavior in CLOSED Period |
|---|---|---|---|
| **Trial Balance** | Reflects all postings up to date $T$. Dynamic as new postings arrive. | Deterministic snapshot while locked (no standard postings can arrive). | **Permanently immutable and mathematically frozen**. |
| **Schedule III Balance Sheet** | Calculates cumulative assets, liabilities, and dynamic P&L net margin. | Frozen while locked. | **Permanently immutable and mathematically frozen**. |
| **Schedule III Profit & Loss** | Calculates discrete period revenues and expenses. | Frozen while locked. | **Permanently immutable and mathematically frozen**. |
| **GL Audit Trail** | Chronological ledger statement. | Frozen while locked. | **Permanently immutable**. |

**Reporting Semantics Verdict**: Monthly period closing does **not** alter reporting formulas or journal entries. Reports run for historical closed periods are deterministic and read-only.

---

## 18. API and UI Architecture Boundaries

### 18.1 Proposed Backend REST APIs (Phase 4C.3 Scope)

A dedicated `FinancialPeriodController` will be introduced in Phase 4C.3:

```
GET    /financial/period/list?financialYearId={id}  -> List all 12 monthly periods with statuses
GET    /financial/period/{periodName}               -> View single period metadata & status
POST   /financial/period/{periodName}/lock          -> Lock period (Reason required)
POST   /financial/period/{periodName}/unlock        -> Unlock period (Reason required, Controller role)
POST   /financial/period/{periodName}/close         -> Close period (Executes 3-way reconciliation gate)
GET    /financial/period/{periodName}/audit         -> Retrieve immutable lifecycle audit history
GET    /financial/period/{periodName}/verify        -> Run pre-close reconciliation check without closing
```

### 18.2 Frontend UI Boundary & Sidebar Navigation

- **Location in Existing React Navigation**:
  - `ERPSystem-web-react/src/layouts/MainLayout/Sidebar.tsx:181` defines the `Finance & Accounting` menu.
  - The appropriate location for Period Administration is:
    ```
    Finance & Accounting
       ├── Chart of Accounts
       ├── Journal Vouchers
       ├── Period Closing & Locking  <-- NEW COCKPIT
       └── Financial Statements
    ```
  - Route: `/financial/period_closing` (mapped to `PeriodClosingPage.tsx`).

---

## 19. Authoritative Architecture Map

| Domain / Responsibility | Authoritative Service | Database Table of Record | Phase 4C.3 Role |
|---|---|---|---|
| **Financial Year Calendar** | `FinancialYearService` | `erp_financial_year` | Reused (FY parent lookup) |
| **Fiscal Period Lifecycle** | `FinancialPeriodService` | `erp_fiscal_period` | **Extended** (Add `closePeriod()`) |
| **Double-Entry Fact Ledger** | `GlEntryService` | `erp_gl_entry` | Reused (Chokepoint period gate) |
| **Pre-Close Reconciliation**| `SubledgerReconciliationService`| Multiple (3-way calculation)| Reused (Consumed as gatekeeper) |
| **Audit Trail Logging** | `DocumentAuditLogService` | `erp_document_audit_log` | Reused (Records period events) |
| **Chart of Accounts** | `AccountCoaService` | `erp_account_coa` | Reused (Leaf node validation) |
| **Document Sequences** | `FinancialYearSequenceService` | `erp_fy_sequence` | Reused (Voucher sequencing) |

**Duplicate Authority Policy**: No secondary period service or duplicate reconciliation engine will be created.

---

## 20. Frozen Boundary Compatibility Proof

- **Phase 4B (Enterprise Fixed Asset Accounting)**: **STRICTLY FROZEN**.
  - `FixedAssetService`, `AssetDepreciationService`, `AssetDisposalService` post exclusively via `GlEntryService.postEntries()`.
  - Zero lines of Phase 4B code will be touched in Phase 4C.3.
- **Phase 4C.1 (Period Locking Infrastructure)**: **FROZEN FOUNDATION**.
  - Provides `FiscalPeriod`, `FiscalPeriodStatus`, and `validatePeriodOpen()`.
  - Phase 4C.3 builds on top of `FinancialPeriodService` without altering Phase 4C.1 locking semantics.
- **Phase 4C.2 (Pre-Close Subledger Reconciliation Gate)**: **FROZEN FOUNDATION**.
  - Consumed strictly via `subledgerReconciliationService.reconcileFiscalPeriod()`.
  - Zero alterations to 4C.2 formulas, unwinding mathematics, or query structures.

---

## 21. Knowledge Graph Telemetry (Graphify)

The codebase architecture graph (`graphify-out/graph.json`) was queried:
- Traversal verified the single directed dependency path:
  `GlEntryService -> FinancialPeriodService -> FiscalPeriod / FinancialYear`
- Path query from `GlEntryService` to `FinancialPeriodService`: 1 hop (Direct reference).
- Path query from `SubledgerReconciliationService` to `FinancialPeriodService`: 1 hop (`getPeriodByName`).
- Traversal confirmed **zero direct mapper inserts to `erp_gl_entry` outside `GlEntryService`**.

---

## 22. Forensic Findings & Risk Classification

| Finding ID | Severity | Category | Description | Proposed Architectural Remedy |
|---|:---:|---|---|---|
| **F-4C3-01** | **P2** | Multi-Tenant Security | `FiscalPeriodMapperEx.xml:updateById` lacks `tenant_id` scoping in WHERE clause. | Add `AND tenant_id = #{tenantId}` to `updateById` in Phase 4C.3. |
| **F-4C3-02** | **P1** | Accounting Immutability | Operational document transitions (e.g. `GstSalesInvoiceService:324`) swallow GL posting exceptions, allowing operational document status to advance while GL fails closed. | Ensure operational transitions fail closed on GL exception, or check `isPeriodOpen` prior to operational transition. |
| **F-4C3-03** | **P2** | Sequential Lifecycle | Current codebase has no validation preventing Month $M+1$ from closing if Month $M$ is open. | Enforce sequential period closing invariant in `closePeriod()`: Period $M$ must be CLOSED before Period $M+1$ can close. |
| **F-4C3-04** | **P2** | Governance & RBAC | `unlockPeriod()` currently lacks explicit role verification for `FINANCIAL_CONTROLLER`. | Add role validation in `unlockPeriod()` and `closePeriod()`. |
| **F-4C3-05** | **P3** | Database Integrity | `erp_fiscal_period` lacks DB-level CHECK constraints on `period_number` and `status`. | Enforced strictly in Java application layer (`validatePeriodDateRange` and `FiscalPeriodStatus`). |

---

## 23. Proposed Architecture Decisions (For Approval)

### AD-04: Strict Reconciliation Requirement for Period Closure
A monthly fiscal period cannot transition to `CLOSED` unless `SubledgerReconciliationService.reconcileFiscalPeriod()` returns `summary.getPeriodCloseReady() == true` (all 6 statutory control accounts evaluate to `BALANCED`).

### AD-05: Sequential Monthly Period Closing
Monthly periods within a financial year must be closed sequentially: Period $M$ (e.g. May) can only be closed if Period $M-1$ (April) is already in `CLOSED` status.

### AD-06: Strict Immutability of CLOSED Fiscal Periods
A fiscal period in `CLOSED` status is permanently immutable. Transitions out of `CLOSED` throw a fatal `BusinessRunTimeException`. Reopening a closed period requires an extraordinary dual-signature administrative override.

### AD-07: Operational Document Fail-Closed Alignment
Operational services must not swallow GL posting exceptions when transitioning documents. If a GL posting fails because a period is `LOCKED` or `CLOSED`, the operational transition must fail and roll back atomically.

### AD-08: Dedicated Period Administration API & UI Boundary
Period lifecycle operations will be exposed via a dedicated `FinancialPeriodController` and surfaced in the React frontend under `Finance & Accounting -> Period Closing & Locking`.

---

## 24. Explicit Scope for Phase 4C.3

1. Implement `FinancialPeriodService.closePeriod(Long tenantId, String periodName, String reason, Long userId)`:
   - Acquires pessimistic write lock `selectByPeriodNameForUpdate`.
   - Validates sequential period closing (Period $M-1$ is `CLOSED`).
   - Invokes `subledgerReconciliationService.reconcileFiscalPeriod(tenantId, periodName)`.
   - Asserts `summary.getPeriodCloseReady() == true`; rejects closure if any discrepancy exists.
   - Updates `status = 'CLOSED'`, records timestamp and operator ID.
   - Logs immutable audit record in `erp_document_audit_log`.
2. Implement RBAC authorization checks on `lockPeriod`, `unlockPeriod`, and `closePeriod`.
3. Fix multi-tenant scoping in `FiscalPeriodMapperEx.xml:updateById` (Finding F-4C3-01).
4. Implement `FinancialPeriodController` with REST endpoints for list, get, lock, unlock, close, and verify.
5. Create comprehensive automated integration tests covering the complete state-transition matrix, concurrency, and pre-close reconciliation blocking.

---

## 25. Explicit Out-of-Scope Items (Preserved for Phase 4C.4+)

1. **Nominal Account Closing Engine (P&L Zeroing)**: Deferred to Phase 4C.4.
2. **Retained Earnings Transfer (Account `2120`)**: Deferred to Phase 4C.4.
3. **Annual `FinancialYear` Closure (`FinancialYear.status = 'CLOSED'`)**: Deferred to Phase 4C.4.
4. **Schedule III Cash Flow Statement**: Deferred to Phase 5.
5. **Multi-dimensional Cost Center Accounting**: Deferred to future roadmap.

---

## 26. Acceptance Criteria for Phase 4C.3 Implementation

- [ ] AC-01: `closePeriod()` transitions an active or locked period to `CLOSED` when all 6 control accounts reconcile to `BALANCED`.
- [ ] AC-02: `closePeriod()` fails closed and throws `BusinessRunTimeException` if any control account has a discrepancy (`DISCREPANT`, `GRANULARITY_DISCREPANCY`, `PARTIAL_DISCREPANCY`).
- [ ] AC-03: `closePeriod()` enforces sequential closure: Month $N$ cannot close unless Month $N-1$ is already `CLOSED`.
- [ ] AC-04: Once a period is `CLOSED`, any attempt to unlock or reopen it throws an immutable exception.
- [ ] AC-05: `GlEntryService.postEntries()` and `reverseEntries()` reject postings into a `CLOSED` period.
- [ ] AC-06: Concurrency test proves that GL posting and period closing serialize without dirty writes or race conditions.
- [ ] AC-07: All lifecycle transitions (`LOCK`, `UNLOCK`, `CLOSE`, `CLOSE_FAILED`) produce deterministic records in `erp_document_audit_log`.
- [ ] AC-08: Multi-tenant test proves Tenant A cannot lock, unlock, close, or view Tenant B's periods.
- [ ] AC-09: Idempotency test proves calling `closePeriod()` on an already closed period returns safely without re-execution.
- [ ] AC-10: Phase 4B Fixed Assets test suite remains 100% passing with zero source modifications.
- [ ] AC-11: Phase 4C.2 Subledger Reconciliation suite (55 tests) remains 100% passing.
- [ ] AC-12: Full financial regression test suite passes with 0 failures and 0 errors.

---

## 27. Final Readiness Verdict

```
================================================================================
FINAL VERDICT:
CONDITIONALLY READY — ARCHITECTURE DECISIONS REQUIRED
================================================================================
Forensic analysis of the Period Closing State Machine is complete.
The current code baseline is verified, dependencies are mapped, and concurrency
safety is mathematically proven via MySQL InnoDB lock mechanics.

Implementation of Phase 4C.3 may proceed upon executive approval of
Proposed Architecture Decisions AD-04 through AD-08.
================================================================================
```

---

## 28. Absolute Hard Stop

In strict adherence to governance instructions:
- **No Java source code has been modified.**
- **No React frontend source has been modified.**
- **No SQL or Flyway migrations have been created.**
- **No period statuses have been altered.**
- **No APIs or UI components have been added.**
- **Execution is completely halted.**
- **Awaiting formal architecture approval before Phase 4C.3 implementation.**
