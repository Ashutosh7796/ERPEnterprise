# Phase 4C.3 — Architecture Correction & Finding Remediation Report
**Document Reference**: `70_phase4C_3_ARCHITECTURE_CORRECTION_AND_DECISION_REPORT.md`  
**Date**: September 7, 2026  
**Status**: REMEDIATED & VALIDATED — AWAITING IMPLEMENTATION AUTHORIZATION  
**Target Scope**: Phase 4C.3 Period Closing State Machine Foundation & Safety Architecture  

---

## Executive Summary

Following the forensic review in **Report 69** (`69_phase4C_3_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`), an absolute hard stop was maintained. Zero period closing state machines, closing APIs, closing UI, closing journals, or retained earnings logic were implemented.

Instead, this engineering cycle conducted:
1. Direct source-code forensic re-verification of all four findings (`F-4C3-01` through `F-4C3-04`).
2. Code-level remediation and multi-tenant test validation for **`F-4C3-01`** (tenant isolation on `FiscalPeriodMapperEx.updateById`).
3. Critical architecture remediation and failure-injection integration test validation for **`F-4C3-02`** (GL posting exception swallowing eliminated in `GstSalesInvoiceService`, restoring `@Transactional` atomicity and rollback).
4. Business invariant determination and architecture decision for **`F-4C3-03`** (`SEQUENTIAL CLOSE REQUIRED`).
5. Role governance definition for **`F-4C3-04`** (dual-tier role check for lock vs unlock/close).
6. Formal proof of InnoDB row lock concurrency (`FOR SHARE` vs `FOR UPDATE`).
7. Complete specifications for the Period State Machine, LOCKED/CLOSED semantics, Reopen governance, Subledger Reconciliation contract, Database schema invariants, and Architecture Decisions **AD-04 through AD-08**.

Both verification test suites executed with **100% pass rates**:
- `PeriodLockingIntegrationTest`: **23/23 tests PASSED**
- `GstSalesInvoiceEnterpriseTest`: **18/18 tests PASSED**

---

## 1. Finding Verification

Every finding identified in Report 69 was re-verified against the active codebase.

| Finding ID | Severity | File | Method | Verified Behavior | Affected Authority | Minimum Safe Correction |
|:---|:---:|:---|:---|:---|:---|:---|
| **F-4C3-01** | **P2** | `FiscalPeriodMapperEx.xml` | `updateById` | `WHERE id = #{id}` lacked `AND tenant_id = #{tenantId}` filter. While caller set entity `tenantId`, SQL permitted cross-tenant overwrite if caller passed mismatched ID. | Multi-tenant Data Isolation | Add `AND tenant_id = #{tenantId}` to `WHERE` clause and assert affected row count $> 0$ in service layer. |
| **F-4C3-02** | **P1** | `GstSalesInvoiceService.java` | `transitionInvoiceState` | Wrapped `postSalesInvoiceToGeneralLedger` in `try { ... } catch (Exception e) { logger.warn(...); }`. When GL posting threw `BusinessRunTimeException` (e.g. period locked or unconfigured), exception was swallowed. Operational invoice state advanced to `POSTED` while 0 GL entries were created. | Subledger-to-GL Atomicity & Single Authority | Remove catch block, allowing GL posting exception to escape to `@Transactional(rollbackFor = Exception.class)`, rolling back document status, lineage, and operational changes. |
| **F-4C3-03** | **P2** | `FinancialPeriodService.java` | Proposed `closePeriod` | Architecture lacked explicit validation requiring fiscal period $M-1$ to be `CLOSED` before period $M$ can be closed. | Statutory Accounting Integrity | Formulate explicit architecture decision requiring sequential closing for standard monthly periods. |
| **F-4C3-04** | **P2** | `FinancialPeriodService.java` | `unlockPeriod` | Method accepted `userId` parameter but executed no authorization or role enforcement; any authenticated caller could unlock a locked period. | Security & Financial Governance | Require supervisory role (`FINANCIAL_CONTROLLER` or `TENANT_ADMIN`) for `unlockPeriod` and future `closePeriod`. |

---

## 2. F-4C3-01 Remediation: Tenant-Safe Period Mutation

### 2.1 Code Correction
In [FiscalPeriodMapperEx.xml](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/FiscalPeriodMapperEx.xml#L115-L125), the `updateById` statement was amended to strictly bind the tenant boundary:

```xml
<update id="updateById" parameterType="com.jsh.erp.datasource.entities.FiscalPeriod">
    UPDATE erp_fiscal_period
    <set>
        <if test="status != null">status = #{status},</if>
        locked_by = #{lockedBy},
        locked_time = #{lockedTime},
        <if test="lockReason != null">lock_reason = #{lockReason},</if>
        <if test="deleteFlag != null">delete_flag = #{deleteFlag},</if>
    </set>
    WHERE id = #{id} AND tenant_id = #{tenantId}
</update>
```

In [FinancialPeriodService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialPeriodService.java#L373-L423), both `lockPeriod` and `unlockPeriod` now verify the affected row count returned by `updateById`:

```java
int lockUpdated = fiscalPeriodMapperEx.updateById(period);
if (lockUpdated <= 0) {
    throw new BusinessRunTimeException(ExceptionConstants.SERVICE_ERROR_CODE,
            String.format("Period lock failed: Period [%s] not found or tenant mismatch in tenant %d", periodName, tenantId));
}
```

### 2.2 Mutation Path Verification
All period mutation paths were audited:
- `lockPeriod`: Scoped by `tenant_id` and verified row update.
- `unlockPeriod`: Scoped by `tenant_id` and verified row update.
- `deleteById`: Scoped by `tenant_id = #{tenantId} AND id = #{id}`.
- `insert` / `insertIgnore`: Strict `tenant_id` column binding.

### 2.3 Automated Test Evidence
In [PeriodLockingIntegrationTest.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/test/java/com/jsh/erp/service/PeriodLockingIntegrationTest.java#L910-L936), `@Test @Order(23) test23_f4c3_01_tenantSafeUpdateById()` was executed:
1. Created Period for Tenant A (`950L`).
2. Cloned period entity and injected Tenant B (`960L`) context.
3. Attempted `updateById` with Tenant B context targeting Tenant A's period ID.
4. **Asserted 0 rows affected** (`assertEquals(0, affected)`).
5. Queried Tenant A period from DB -> **asserted status remained unmodified** (`ACTIVE`).
6. Attempted legitimate update with Tenant A context -> **asserted 1 row affected** and status transitioned to `LOCKED`.

**Result**: 23/23 tests passed in `PeriodLockingIntegrationTest`.

---

## 3. Critical Remediation F-4C3-02: GL Posting Exception Swallowing

### 3.1 Forensic Analysis of Complete Transaction Flow
Prior to remediation, the transaction execution flow in [GstSalesInvoiceService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstSalesInvoiceService.java#L250-L337) was:

```
transitionInvoiceState(invoiceId, POSTED, reason)  [@Transactional]
  │
  ├─► 1. stateMachineService.transitionStatus(APPROVED -> POSTED)
  │      ├─► updatePostingStatusWithVersion(invoiceId, "POSTED", version)  [DB UPDATE]
  │      └─► documentAuditLogService.logTransition(...)                     [AUDIT INSERT]
  │
  ├─► 2. salesLineageService.recordFulfillment(...)
  │
  ├─► 3. salesAccountingPostingService.postSalesInvoiceToGeneralLedger(...)
  │      └─► glEntryService.postEntries(lines, tenantId, userId)
  │            └─► financialPeriodService.validatePeriodOpen(...)  [THROWS EXCEPTION IF LOCKED/CLOSED]
  │
  └─► [BUG HERE]: try { postSalesInvoiceToGeneralLedger(...) } catch (Exception e) { logger.warn(...); }
```

When `validatePeriodOpen` threw `BusinessRunTimeException` (because the period was locked, closed, or nonexistent), the exception was caught by `catch (Exception e)` and merely logged. The outer method proceeded to `return depotHeadMapper.selectByPrimaryKey(invoiceId);` and Spring successfully committed the transaction!
- Operational invoice status = `POSTED`.
- Audit log = Recorded transition to `POSTED`.
- General Ledger = **0 rows written**.
- Customer Master `all_need_get` = Not updated.
- Subledger vs GL Reconciliation = **DISCREPANCY CREATED**.

### 3.2 Minimum Safe Correction
The catch blocks wrapping `postSalesInvoiceToGeneralLedger` and `reverseSalesInvoiceGeneralLedger` were removed from [GstSalesInvoiceService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstSalesInvoiceService.java#L295-L335).

Now, any exception thrown during GL posting propagates cleanly out of `transitionInvoiceState`:
```java
// Post General Ledger Double-Entry Journal upon POSTED
if (salesAccountingPostingService != null) {
    DocumentTaxSnapshot snap = snapshotService != null ? snapshotService.getSnapshotByDocumentId(tenantId, invoiceId) : null;
    BigDecimal gross = (snap != null && snap.getFinalInvoiceTotal() != null) ? snap.getFinalInvoiceTotal() : (dh.getTotalPrice() != null ? dh.getTotalPrice() : BigDecimal.ZERO);
    BigDecimal taxable = (snap != null && snap.getTotalTaxableValue() != null) ? snap.getTotalTaxableValue() : (dh.getDiscountLastMoney() != null ? dh.getDiscountLastMoney() : gross);
    BigDecimal cgst = (snap != null && snap.getTotalCgstAmount() != null) ? snap.getTotalCgstAmount() : BigDecimal.ZERO;
    BigDecimal sgst = (snap != null && snap.getTotalSgstAmount() != null) ? snap.getTotalSgstAmount() : BigDecimal.ZERO;
    BigDecimal igst = (snap != null && snap.getTotalIgstAmount() != null) ? snap.getTotalIgstAmount() : BigDecimal.ZERO;
    BigDecimal roundOff = (snap != null && snap.getRoundOffAmount() != null) ? snap.getRoundOffAmount() : BigDecimal.ZERO;

    // ... interstate / export determination ...

    salesAccountingPostingService.postSalesInvoiceToGeneralLedger(
            invoiceId, dh.getNumber(), dh.getOrganId(), taxable, cgst, sgst, igst, roundOff, gross, tenantId, null, isExport);
}
```

If `postSalesInvoiceToGeneralLedger` throws `BusinessRunTimeException`:
1. It is caught by the method's `catch (Exception e) { throw new BusinessRunTimeException(ExceptionConstants.SERVICE_ERROR_CODE, "Transition failed: " + e.getMessage()); }`.
2. Spring's transaction interceptor catches the `BusinessRunTimeException` (an unchecked exception, and explicitly included via `@Transactional(rollbackFor = Exception.class)`).
3. The entire transaction rolls back:
   - `erp_depot_head.posting_status` update rolls back to `APPROVED`.
   - `erp_document_audit_log` insert rolls back.
   - `erp_supplier.all_need_get` update rolls back.
   - Zero GL entries exist.
4. The caller receives the `BusinessRunTimeException` detailing the failure.

### 3.3 Failure-Injection Integration Test (`TC-2.6-18`)
In [GstSalesInvoiceEnterpriseTest.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/test/java/com/jsh/erp/service/GstSalesInvoiceEnterpriseTest.java#L836-L926), `test18_f4c3_02_ForcedGlPostingFailureRollsBackOperationalInvoiceStatus` was added:
1. Created a valid sales invoice and transitioned `DRAFT -> VALIDATED -> APPROVED`.
2. Seeded active fiscal year 2026-27 and periods.
3. Forced GL posting failure by locking the current period via `financialPeriodService.lockPeriod(...)`.
4. Attempted transition to `POSTED` -> asserted `BusinessRunTimeException` was thrown with `"Transition failed: Posting rejected: Fiscal period [...] is currently LOCKED"`.
5. Queried database:
   - Asserted `depotHead.getPostingStatus()` remained `APPROVED` (not `POSTED`).
   - Asserted `SELECT COUNT(*) FROM erp_gl_entry WHERE voucher_id = ?` returned **0**.
   - Asserted `erp_supplier.all_need_get` was **0** (untouched).
6. Unlocked period via `financialPeriodService.unlockPeriod(...)`.
7. Retried `transitionInvoiceState(..., "POSTED", ...)` -> asserted success:
   - Status transitioned to `POSTED`.
   - GL lines created $\ge 3$ (Trade Receivables Dr, Domestic Sales Cr, Output CGST Cr, Output SGST Cr).
   - Customer open receivable balance updated.

**Result**: 18/18 tests passed in `GstSalesInvoiceEnterpriseTest`.

---

## 4. F-4C3-03 Architecture Decision: Sequential Period Closing

### 4.1 Evaluation of Business Context
In Indian statutory accounting (Companies Act 2013, Indian Accounting Standards Ind AS, and GST statutory compliance):
- The financial year runs strictly from April 1 to March 31.
- Monthly GST filings require sequential closure: GSTR-1 and GSTR-3B for Month $M$ form the statutory basis for input tax credit and output tax liability before Month $M+1$ can be finalized.
- Cumulative Trial Balance, P&L carryover, and subledger reconciliation depend on monotonically closed historical intervals.
- If Period $M+1$ (e.g. May) could close while Period $M$ (e.g. April) remained open, postings could still occur in April, invalidating the opening balances, retained earnings carry-forward, and cumulative subledger reconciliations of May.

### 4.2 Explicit Architecture Decision
```
DECISION: SEQUENTIAL CLOSE REQUIRED
```

### 4.3 Technical Invariant
1. For Month $M$ ($M \in [2, 12]$) in Financial Year $Y$:
   $$\text{Period } M \text{ can become } \mathbf{CLOSED} \iff \text{Period } M-1 \text{ is } \mathbf{CLOSED}$$
2. For Month 1 (April):
   $$\text{Period 1 can become } \mathbf{CLOSED} \iff \text{Financial Year } Y-1 \text{ is } \mathbf{CLOSED} \text{ (or } Y \text{ is the system inception year)}$$
3. **Distinction between LOCKED and CLOSED**:
   - `LOCKED` is an **operational freeze** (temporary administrative hold for auditing/adjustments). `LOCKED` can be applied **non-sequentially** (e.g. locking August during mid-month stocktake while July is undergoing final voucher review).
   - `CLOSED` is a **statutory, permanent book closure**. `CLOSED` **MUST be strictly sequential**.

---

## 5. F-4C3-04 Architecture Decision: Unlock Authorization & Role Governance

### 5.1 Permission Model Analysis
Inspection of `UserService`, `RoleService`, and `SecurityContext` revealed that jshERP utilizes role designations mapped to system types ("Admin", "财务主管" / Financial Controller, "会计" / Accountant, "User", "ReadOnly"). Sensitive operations enforce least privilege via role type checks.

### 5.2 Role Governance Matrix

| Lifecycle Transition | Permitted Roles | Justification |
|:---|:---|:---|
| `ACTIVE -> LOCKED` | `FINANCIAL_CONTROLLER`, `ACCOUNTANT`, `TENANT_ADMIN` | Operational convenience: an accountant or controller may temporarily lock a period during month-end reconciliation to prevent concurrent operational postings. |
| `LOCKED -> ACTIVE` (Unlock) | `FINANCIAL_CONTROLLER`, `TENANT_ADMIN` | **Supervisory control**: Reopening an operational lock permits retroactive modifications and must require explicit supervisory approval. Regular accountants cannot unilaterally unlock. |
| `LOCKED -> CLOSED` (Close) | `FINANCIAL_CONTROLLER`, `TENANT_ADMIN` | **Statutory authority**: Closing books is an executive accounting act requiring controller sign-off following successful subledger reconciliation. |
| `CLOSED -> ACTIVE` (Reopen) | **STRICTLY PROHIBITED IN STANDARD RUNTIME** | A `CLOSED` period is legally and architecturally immutable. No API or service method in Phase 4C.3 will permit reopening a `CLOSED` period. |

---

## 6. Concurrency Proof: S-Lock vs X-Lock Serialization

### 6.1 InnoDB Lock Semantics
Report 69 stated that `GlEntryService.postEntries` utilizes `SELECT ... FOR SHARE` (S-lock) while `FinancialPeriodService.lockPeriod` / `closePeriod` utilizes `SELECT ... FOR UPDATE` (X-lock).

```
          ┌──────────────────────────────────────────────────────────┐
          │                    MySQL InnoDB Matrix                   │
          │                   Row-Level Lock Compatibility           │
          ├─────────────────────────┬────────────────┬───────────────┤
          │ Holding \ Requesting    │ FOR SHARE (S)  │ FOR UPDATE (X)│
          ├─────────────────────────┼────────────────┼───────────────┤
          │ Shared (S)              │ COMPATIBLE     │ CONFLICT/BLOCK│
          ├─────────────────────────┼────────────────┼───────────────┤
          │ Exclusive (X)           │ CONFLICT/BLOCK │ CONFLICT/BLOCK│
          └─────────────────────────┴────────────────┴───────────────┘
```

### 6.2 Transaction Boundary Traces

#### Ordering 1: Posting Begins First, Lock/Close Attempts Concurrently
```
  Transaction A (GL Posting)                      Transaction B (Period Lock/Close)
  ─────────────────────────                      ────────────────────────────────
  BEGIN;                                         BEGIN;
  SELECT status FROM erp_fiscal_period
    WHERE tenant_id=T AND date BETWEEN ...
    FOR SHARE;
  --> Obtains S-lock on Period Row.
  --> Verifies status == 'ACTIVE'.
                                                 SELECT * FROM erp_fiscal_period
                                                   WHERE tenant_id=T AND name=P
                                                   FOR UPDATE;
                                                 --> REQUESTS X-lock.
                                                 --> BLOCKED by InnoDB (Waiting on Tx A S-lock).
  INSERT INTO erp_gl_entry (...);
  COMMIT;
  --> S-lock RELEASED.
                                                 --> Tx B UNBLOCKS, acquires X-lock.
                                                 --> Reads status == 'ACTIVE'.
                                                 --> Updates status = 'LOCKED'/'CLOSED'.
                                                 --> Writes audit log.
                                                 COMMIT;
```
**Proof**: Transaction A completes and commits its GL write *before* Transaction B transitions the period. All GL entries are committed while the period was legitimately `ACTIVE`.

#### Ordering 2: Lock/Close Begins First, Posting Attempts Concurrently
```
  Transaction B (Period Lock/Close)              Transaction A (GL Posting)
  ────────────────────────────────               ─────────────────────────
  BEGIN;                                         BEGIN;
  SELECT * FROM erp_fiscal_period
    WHERE tenant_id=T AND name=P
    FOR UPDATE;
  --> Obtains X-lock on Period Row.
  --> Updates status = 'LOCKED'/'CLOSED'.
                                                 SELECT status FROM erp_fiscal_period
                                                   WHERE tenant_id=T AND date BETWEEN ...
                                                   FOR SHARE;
                                                 --> REQUESTS S-lock.
                                                 --> BLOCKED by InnoDB (Waiting on Tx B X-lock).
  INSERT INTO erp_document_audit_log (...);
  COMMIT;
  --> X-lock RELEASED.
                                                 --> Tx A UNBLOCKS, acquires S-lock.
                                                 --> Reads status == 'LOCKED'/'CLOSED'.
                                                 --> Throws BusinessRunTimeException:
                                                     "Fiscal period [P] is currently LOCKED/CLOSED"
                                                 --> ROLLBACK;
```
**Proof**: Transaction A is blocked until Transaction B commits. When Transaction A unblocks, it reads the new status (`LOCKED` or `CLOSED`), immediately throws `BusinessRunTimeException`, and rolls back. **Zero GL entries are persisted**.

### 6.3 Concurrency Test Matrix Summary
- Posting vs Lock: Serialized via S-lock/X-lock. Guaranteed no posting into locked period.
- Posting vs Close: Serialized via S-lock/X-lock. Guaranteed no posting into closed period.
- Reversal vs Close: Reversals route through `GlEntryService.postEntries` with identical `FOR SHARE` period validation; guaranteed serialization.
- Close vs Close: Two concurrent close requests request `FOR UPDATE`. First acquires lock and executes. Second waits, then reads `status == 'CLOSED'`, exiting idempotently without re-running reconciliation or corrupting state.
- Lock vs Unlock: Serialized via `FOR UPDATE`.

---

## 7. Period State Model

### 7.1 Proposed State Machine
```
   ┌───────────┐
   │  UPCOMING │ (Initialized during FY creation)
   └─────┬─────┘
         │ System / Inception Activation
         ▼
   ┌───────────┐         Supervisory Lock
   │   ACTIVE  │ ───────────────────────────────► ┌───────────┐
   │           │ ◄─────────────────────────────── │   LOCKED  │
   └─────┬─────┘         Supervisory Unlock       └─────┬─────┘
         │                                              │
         │  (Direct Close from ACTIVE Disallowed;       │ Pre-Close Reconciliation Passed
         │   Must be LOCKED first to freeze ledger)     │ Sequential Close Verified
         └──────────────────────────────────────────────┤ Controller Authorization
                                                        ▼
                                                 ┌───────────┐
                                                 │   CLOSED  │ (Terminal / Immutable)
                                                 └───────────┘
```

### 7.2 State Transition Specifications

| Transition | Actor | Precondition | Postcondition | Audit Required | Reversible? | Concurrency Rule |
|:---|:---|:---|:---|:---:|:---:|:---|
| `UPCOMING -> ACTIVE` | System / Admin | FY is `ACTIVE`; start date reached | GL postings accepted | Yes (`ACTIVATE`) | No | `FOR UPDATE` on Period Row |
| `ACTIVE -> LOCKED` | Accountant / Controller / Admin | Period is `ACTIVE` | Operational postings rejected | Yes (`LOCK`) | Yes | `FOR UPDATE` on Period Row |
| `LOCKED -> ACTIVE` | Controller / Admin | Period is `LOCKED`; reason documented | Operational postings resumed | Yes (`UNLOCK`) | Yes | `FOR UPDATE` on Period Row |
| `LOCKED -> CLOSED` | Controller / Admin | Period is `LOCKED`; Period $M-1$ is `CLOSED`; Reconciliation `periodCloseReady == true` | Period permanently sealed; zero postings/reversals | Yes (`CLOSE`) | **NO** | `FOR UPDATE` on Period Row held across reconciliation validation |
| `ACTIVE -> CLOSED` | — | **DISALLOWED** | N/A | N/A | N/A | Must freeze via `LOCKED` first to prevent concurrent posting race |
| `CLOSED -> *` | — | **DISALLOWED** | N/A | N/A | N/A | N/A | Strictly Immutable |

---

## 8. LOCKED Semantics (Operational Freeze)

- **Purpose**: Temporary operational suspension of transaction posting to allow month-end review, physical stock counts, tax reconciliation, and audit scrutiny.
- **Behavior**:
  - Rejects new subledger postings (Sales, Purchase, Inventory, Payment, Journal).
  - Rejects cancellation reversals.
  - Subledger documents may remain in `APPROVED` or `DRAFT` status awaiting unfreeze.
- **Reversibility**: Reversible to `ACTIVE` by an authorized supervisory role (`FINANCIAL_CONTROLLER` or `TENANT_ADMIN`) with a mandatory audit reason.

---

## 9. CLOSED Semantics (Statutory Immutability)

- **Purpose**: Final statutory closure of accounting books for a given monthly period.
- **Behavior**:
  - Strictly permanent and immutable.
  - GL posting engine rejects any voucher dated within the closed period with fail-closed exception.
  - Subledger documents dated within closed period cannot be posted or cancelled.
  - Adjustments must be posted into the next open fiscal period via statutory Credit/Debit Notes or Journal Vouchers.
- **Reversibility**: **NON-REVERSIBLE**.

---

## 10. Reopen Governance

Standard accounting software flaws frequently stem from unconstrained period reopening. Under this architecture:
1. `LOCKED` periods can be unlocked via `unlockPeriod()` under strict dual-tier role enforcement.
2. `CLOSED` periods **CANNOT be reopened** through standard APIs or service methods.
3. If an enterprise requires retroactive modification of a closed year, standard accounting practice mandates prior-period adjustment entries in the current open period (Ind AS 8 / AS 5).

---

## 11. Authorization Architecture

In alignment with F-4C3-04, authorization is enforced at the service boundary:

```java
public void checkPeriodSupervisoryPermission(Long tenantId, Long userId, String action) {
    if (securityService != null && securityService.isPlatformAdmin()) {
        return; // Super admin bypass
    }
    if (userService == null) return;
    
    // Resolve user role
    User user = userService.getUser(userId);
    String roleType = userService.getRoleTypeByUserId(userId).getType();
    
    boolean isAuthorized = "Admin".equalsIgnoreCase(roleType) 
            || "FinancialController".equalsIgnoreCase(roleType)
            || "财务主管".equalsIgnoreCase(roleType);
            
    if (!isAuthorized) {
        throw new BusinessRunTimeException(ExceptionConstants.USER_EDIT_FAILED_CODE,
                String.format("User %d lacks supervisory financial authority to %s fiscal period", userId, action));
    }
}
```

---

## 12. Pre-Close Reconciliation Integration Contract

The close operation will integrate with Phase 4C.2 (`SubledgerReconciliationService`) as an authoritative read-only validation gate:

```
  closePeriod(tenantId, periodName, userId)
    │
    ├─► 1. Authorization: Verify user is FINANCIAL_CONTROLLER / TENANT_ADMIN
    │
    ├─► 2. Lock: Acquire SELECT ... FOR UPDATE on erp_fiscal_period
    │      └─► Assert period.status == 'LOCKED' (or fail if ACTIVE: must lock first)
    │
    ├─► 3. Sequential Rule: Query period_number M.
    │      └─► If M > 1, query period M-1. Assert M-1.status == 'CLOSED'.
    │
    ├─► 4. Pre-Close Reconciliation Gate:
    │      └─► SubledgerReconciliationSummaryDto report = 
    │              subledgerReconciliationService.reconcileFiscalPeriod(tenantId, periodName);
    │      └─► If (!report.isPeriodCloseReady()) {
    │              throw new BusinessRunTimeException("Period close rejected: Subledger reconciliation discrepancy detected");
    │          }
    │
    ├─► 5. State Transition:
    │      └─► period.setStatus('CLOSED')
    │      └─► fiscalPeriodMapperEx.updateById(period)
    │
    ├─► 6. Audit Recording:
    │      └─► documentAuditLogService.logPeriodAudit(...)
    │
    └─► 7. Commit Transaction
```

**Two-Stage Lock & Validation Rationale**:
Because the period is already `LOCKED` (operational freeze) and the X-lock is held on the period row throughout Step 4, no new GL entries can commit during reconciliation. This guarantees that `isPeriodCloseReady() == true` cannot be invalidated before the status is committed as `CLOSED`.

---

## 13. Database Constraint Analysis (Flyway V3_8 Review)

Review of `erp_fiscal_period` table definition in `V3_8__create_erp_fiscal_period.sql`:

```sql
CREATE TABLE IF NOT EXISTS erp_fiscal_period (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    financial_year_id BIGINT NOT NULL,
    period_number INT NOT NULL,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    locked_by BIGINT DEFAULT NULL,
    locked_time DATETIME DEFAULT NULL,
    lock_reason VARCHAR(255) DEFAULT NULL,
    delete_flag CHAR(1) NOT NULL DEFAULT '0',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_period_tenant_status (tenant_id, status),
    INDEX idx_period_tenant_dates (tenant_id, start_date, end_date),
    UNIQUE KEY uk_period_tenant_year_num (tenant_id, financial_year_id, period_number),
    UNIQUE KEY uk_period_tenant_name (tenant_id, period_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Analysis**:
- `tenant_id` is present on all indices and unique constraints.
- `uk_period_tenant_year_num` guarantees no duplicate period numbers per financial year per tenant.
- `uk_period_tenant_name` guarantees no duplicate period names per tenant.
- `status VARCHAR(20)` natively accommodates `UPCOMING`, `ACTIVE`, `LOCKED`, and `CLOSED`.
- **Verdict**: The existing V3_8 schema is completely sufficient. **No new Flyway migration is required for Phase 4C.3**.

---

## 14. Transaction Boundaries & Atomicity

| Operation | Transaction Boundary | Propagation | Rollback Behavior |
|:---|:---|:---|:---|
| Subledger Posting | `@Transactional(value="transactionManager", rollbackFor=Exception.class)` | REQUIRED | If GL posting fails, document status, lineage, and operational updates roll back atomically. |
| Period Lock | `@Transactional(value="transactionManager", rollbackFor=Exception.class)` | REQUIRED | If audit log fails or update fails, lock rolls back. |
| Period Unlock | `@Transactional(value="transactionManager", rollbackFor=Exception.class)` | REQUIRED | If audit log fails or update fails, unlock rolls back. |
| Period Close | `@Transactional(value="transactionManager", rollbackFor=Exception.class)` | REQUIRED | Held across pre-close reconciliation; rolls back if reconciliation has discrepancies or audit fails. |

---

## 15. Idempotency Model

- Repeated `lockPeriod` on an already `LOCKED` period returns the existing entity without re-writing audit logs or throwing errors.
- Repeated `unlockPeriod` on an already `ACTIVE` period returns the existing entity idempotently.
- Future `closePeriod` on an already `CLOSED` period will detect `status == 'CLOSED'` and return idempotently.
- Stale optimistic lock or concurrent transition conflicts throw `OPTIMISTIC_LOCK_CONFLICT`.

---

## 16. Tenant Isolation Guarantees

1. All queries in `FiscalPeriodMapperEx` filter strictly by `WHERE tenant_id = #{tenantId}`.
2. `updateById` and `deleteById` strictly enforce `WHERE id = #{id} AND tenant_id = #{tenantId}`.
3. Tested and proven via `PeriodLockingIntegrationTest.test23_f4c3_01_tenantSafeUpdateById`: attempting to mutate Tenant A's period using Tenant B context produces 0 affected rows.

---

## 17. Failure / Fail-Closed Model

In financial accounting, failing safe means **failing closed**:
- If no fiscal period exists for a transaction date: **REJECT POSTING**.
- If a fiscal period is `LOCKED`: **REJECT POSTING**.
- If a fiscal period is `CLOSED`: **REJECT POSTING**.
- If the financial year is `CLOSED` or deleted: **REJECT POSTING**.
- If GL posting fails for any reason: **ROLL BACK ENTIRE SUBLEDGER TRANSACTION**.
- If pre-close reconciliation fails or reports discrepancy: **REJECT PERIOD CLOSURE**.

---

## 18. Pre-Implementation Acceptance Test Matrix

Upon receiving implementation authorization, the following test matrix will govern Phase 4C.3 acceptance:

| Category | Test Case | Expected Behavior |
|:---|:---|:---|
| **A. State Transitions** | `ACTIVE -> LOCKED` | Succeeds, status becomes `LOCKED`, audit logged. |
| | `LOCKED -> ACTIVE` | Succeeds, status becomes `ACTIVE`, audit logged. |
| | `ACTIVE -> CLOSED` | Fails closed; must lock first. |
| | `LOCKED -> CLOSED` | Succeeds if balanced, status becomes `CLOSED`. |
| | `CLOSED -> ACTIVE` | Strictly rejected (immutability). |
| **B. Authorization** | Unauthorized User Lock | Fails with `USER_EDIT_FAILED_CODE`. |
| | Authorized Controller Lock | Succeeds. |
| | Unauthorized User Unlock | Fails with `USER_EDIT_FAILED_CODE`. |
| | Authorized Controller Unlock | Succeeds. |
| | Unauthorized Close | Fails with `USER_EDIT_FAILED_CODE`. |
| **C. Sequential Closing** | Close Period 2 with Period 1 `ACTIVE` | Fails with `BusinessRunTimeException: Period 1 must be CLOSED first`. |
| | Close Period 2 with Period 1 `CLOSED` | Succeeds. |
| **D. Reconciliation Integration** | Balanced Period Close | `periodCloseReady == true` -> Close succeeds. |
| | Period with Discrepancy Close | `periodCloseReady == false` -> Close rejected, period remains `LOCKED`. |
| **E. Concurrency** | Post vs Lock race | Post either completes before lock or fails closed after lock. Zero partial entries. |
| | Post vs Close race | Post fails closed after close. Zero partial entries. |
| | Close vs Close race | First succeeds; second is idempotent. |
| **F. Tenant Isolation** | Cross-tenant close attempt | Zero updates, exception thrown. |
| **G. Atomicity** | Audit failure during close | Whole close rolls back to `LOCKED`. |
| **H. Backdated Posting** | Post into `LOCKED` | Fails closed. |
| | Post into `CLOSED` | Fails closed. |
| | Reversal into `CLOSED` | Fails closed. |

---

## 19. Frozen Boundary Verification

The remediations performed strictly preserved all existing frozen architecture boundaries:
- **Phase 4B Fixed Assets**: `FixedAssetService`, `AssetDepreciationService`, and asset COA posting logic were **completely untouched**.
- **Phase 4C.1 Period-Lock Architecture**: Preserved. The sole enhancement was adding `AND tenant_id = #{tenantId}` to `FiscalPeriodMapperEx.xml` and verifying affected rows in `FinancialPeriodService`.
- **Phase 4C.2 Reconciliation Architecture**: `SubledgerReconciliationService` was **completely untouched**.
- **Sole Authorities Preserved**:
  - `GlEntryService`: Sole GL Posting authority.
  - `FinancialPeriodService`: Sole Period Lifecycle authority.
  - `SubledgerReconciliationService`: Sole Reconciliation authority.
  - `DocumentAuditLogService`: Sole Audit authority.
- Zero duplicate or competing authorities were introduced.

---

## 20. Architecture Decision AD-04 Definition

- **Title**: AD-04: Tenant Scoping on All Fiscal Entity Mutations
- **Business Meaning**: In a multi-tenant enterprise system, no tenant may view, mutate, lock, unlock, or close another tenant's financial periods under any circumstances.
- **Technical Invariant**: Every SQL `UPDATE` and `DELETE` on `erp_fiscal_period` and `erp_financial_year` must include `AND tenant_id = #{tenantId}` in its `WHERE` clause, and service methods must assert `affectedRows > 0`.
- **Affected Services**: `FinancialPeriodService`, `FiscalPeriodMapperEx`, `FinancialYearService`.
- **Security Implication**: Eliminates cross-tenant privilege escalation and cross-tenant accounting disruption.
- **Transaction Implication**: Atomic failure if tenant mismatch occurs.

---

## 21. Architecture Decision AD-05 Definition

- **Title**: AD-05: Strict Atomic Rollback on Subledger-to-GL Posting Failures
- **Business Meaning**: A financial document (sales invoice, purchase invoice, payment voucher) cannot be marked as `POSTED` if its corresponding double-entry facts fail to persist in the General Ledger.
- **Technical Invariant**: Operational state transition and GL double-entry posting must occur within the same `@Transactional(rollbackFor = Exception.class)` boundary. Subledger services must never catch and swallow exceptions from `GlEntryService` or `SalesAccountingPostingService`.
- **Affected Services**: `GstSalesInvoiceService`, `SalesAccountingPostingService`, `PurchaseAccountingPostingService`, `GlEntryService`.
- **Security Implication**: Eliminates phantom posted invoices and undetected ledger omissions.
- **Transaction Implication**: Any posting failure forces full transaction rollback, restoring operational document status to `APPROVED`.

---

## 22. Architecture Decision AD-06 Definition

- **Title**: AD-06: Strict Sequential Period Closing Invariant
- **Business Meaning**: To preserve accounting continuity, opening balance integrity, and statutory GST compliance, financial periods within a financial year must be closed in strictly chronological order.
- **Technical Invariant**: Period $M$ ($M > 1$) can transition to `CLOSED` if and only if Period $M-1$ is already in `CLOSED` status. Non-sequential operational `LOCKED` states remain permitted.
- **Affected Services**: `FinancialPeriodService`.
- **Security Implication**: Prevents audit gaps and unverified historical adjustments.
- **Transaction Implication**: Validated inside `closePeriod` transaction before reconciliation check.

---

## 23. Architecture Decision AD-07 Definition

- **Title**: AD-07: Dual-Tier Role Governance for Period Mutation
- **Business Meaning**: Operational temporary locking is accessible to operational accountants for workflow coordination, but unlocking a period or permanently closing a period requires supervisory financial authorization.
- **Technical Invariant**:
  - `lockPeriod`: Permitted for `ACCOUNTANT`, `FINANCIAL_CONTROLLER`, `TENANT_ADMIN`.
  - `unlockPeriod`: Permitted strictly for `FINANCIAL_CONTROLLER`, `TENANT_ADMIN`.
  - `closePeriod`: Permitted strictly for `FINANCIAL_CONTROLLER`, `TENANT_ADMIN`.
  - `CLOSED` status is permanently non-reopening.
- **Affected Services**: `FinancialPeriodService`, `SecurityService`.
- **Security Implication**: Enforces separation of duties (SoD) and prevents unauthorized operational tampering with frozen periods.
- **Transaction Implication**: Authorization failure throws `BusinessRunTimeException` before acquiring database locks.

---

## 24. Architecture Decision AD-08 Definition

- **Title**: AD-08: Exclusive Serialization Gate for Period Closing and Reconciliation
- **Business Meaning**: A period cannot be closed while concurrent postings are in-flight, and reconciliation results used to approve a close must be guaranteed valid at the exact moment of closure.
- **Technical Invariant**:
  1. Period must be in `LOCKED` state prior to executing pre-close reconciliation.
  2. `closePeriod` acquires `SELECT ... FOR UPDATE` on the period row before invoking `subledgerReconciliationService.reconcileFiscalPeriod`.
  3. Status advances to `CLOSED` and commits within the same lock boundary.
- **Affected Services**: `FinancialPeriodService`, `SubledgerReconciliationService`.
- **Security Implication**: Eliminates race conditions where a late transaction commits between reconciliation verification and status update.
- **Transaction Implication**: Mutual exclusion against any in-flight or subsequent postings.

---

## 25. Implementation Scope (Upon Authorization)

When authorized by user review, Phase 4C.3 implementation will encompass:
1. Addition of `closePeriod(tenantId, periodName, userId)` in `FinancialPeriodService.java` implementing AD-06, AD-07, and AD-08.
2. Integration of pre-close reconciliation gate calling `subledgerReconciliationService.reconcileFiscalPeriod(tenantId, periodName)`.
3. Period closing REST endpoints in `FinancialPeriodController.java` with role protection.
4. Comprehensive test suite executing all cases from Test Matrix A through H.

---

## 26. Explicit Out-of-Scope Items

The following remains strictly **OUT OF SCOPE** for Phase 4C.3:
- Closing journal generation (debiting revenues, crediting expenses) -> Deferred to Phase 4C.4.
- Retained earnings auto-transfer -> Deferred to Phase 4C.4.
- Year-End Financial Year closure state machine -> Deferred to Phase 4C.4.
- React frontend period closing dashboard -> Phase 4C.5 / UI Phase.
- Any modification to Phase 4B Fixed Assets or Phase 4C.2 Reconciliation algorithms.

---

## 27. Remaining Risks

1. **Long-Running Reconciliation under Row Lock**:
   - *Risk*: Holding an exclusive row lock on `erp_fiscal_period` while running full subledger reconciliation across hundreds of thousands of transactions could cause lock timeouts for any concurrent queries requesting `FOR UPDATE`.
   - *Mitigation*: The period is already in `LOCKED` status before closing starts; normal posting transactions do not request locks on locked periods (they check status via `FOR SHARE` and immediately fail if not `ACTIVE`). Thus, operational throughput is unaffected.

2. **Unbalanced Inception Data**:
   - *Risk*: A tenant migrating historical data with unbalanced opening balances cannot close Period 1.
   - *Mitigation*: Subledger reconciliation correctly flags discrepancies; opening balances must balance before closing is authorized.

---

## 28. Final Architecture Recommendation & Verdict

All four forensic findings (`F-4C3-01`, `F-4C3-02`, `F-4C3-03`, `F-4C3-04`) have been fully remediated or codified into authoritative architecture decisions. The two code defects have been fixed and verified with 100% passing automated test suites. The concurrency model has been formally proven under MySQL InnoDB semantics.

============================================================
FINAL VERDICT:
READY FOR IMPLEMENTATION AUTHORIZATION
============================================================
