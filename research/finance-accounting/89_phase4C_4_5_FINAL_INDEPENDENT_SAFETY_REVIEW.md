# PHASE 4C.4.5 — FINAL INDEPENDENT SAFETY REVIEW

**Audit Date**: 2026-09-11  
**Review Authority**: Independent Senior ERP Accounting Architect, Database Transaction-Safety Reviewer & Forensic Auditor  
**Target Subsystem**: Phase 4C.4.5 — Year-End Closing Engine, Nominal Zeroing & Retained Earnings  
**Target Codebase**: `jshERP-master` (`ERPSystem-boot`)  

---

## 1. Executive Verdict

```text
================================================================================
FINAL VERDICT: FAIL — REMEDIATION REQUIRED BEFORE ACCEPTANCE AND FREEZE
================================================================================
P0 Findings: 0
P1 Findings: 1 (Critical Transaction Rollback Suppression Defect)
P2 Findings: 0
P3 Findings: 2 (Failure Injection Test Quality Gap & Dead GL Mapper Field)
================================================================================
```

While the accounting mathematics, Chart of Accounts classification checks, subledger reconciliation gates, trial balance checks, and supervisory authentication mechanisms are impeccably designed and strictly routed through the governed GL channel (`GlEntryService.postYearEndClosingEntries`), an adversarial forensic audit of the transaction boundaries and failure injection tests uncovered a **critical database transaction-safety vulnerability (F-4C4-08, Severity P1)**:

`YearEndClosingService.closeFiscalYear(...)` is annotated with `@Transactional(value = "transactionManager", rollbackFor = Exception.class, noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class})`. 

Because `noRollbackFor = {DataIntegrityViolationException.class}` is explicitly declared on `closeFiscalYear`, if a database constraint failure occurs after GL entries are inserted (such as a failure in `financialYearMapperEx.updateById(fy)` or `documentAuditLogMapper.insert(auditLog)`), Spring's declarative transaction manager **suppresses the transaction rollback and attempts to COMMIT the partial transaction**. In MySQL/InnoDB, this causes prior statements (the closing GL journal entries) to be permanently committed while leaving the fiscal year unfinalized and the audit trail missing.

Furthermore, this vulnerability was concealed because Scenarios 19, 20, and 26 in `YearEndClosingIntegrationTest.java` are **tautological mock assertions** that never actually invoked `yearEndClosingService.closeFiscalYear(...)` with injected failures (**F-4C4-09, Severity P3**).

In accordance with strict adversarial review governance (**Automatic FAIL if P1 > 0**), Phase 4C.4.5 **CANNOT BE FROZEN** in its current state. Remediation must be performed and verified before progression to Phase 4C.4.6.

---

## 2. Scope Reviewed

The forensic audit independently inspected:
1. **Source Code**:
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/YearEndClosingService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/GlEntryService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialStatementService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/SubledgerReconciliationService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialPeriodService.java`
   - `ERPSystem-boot/src/main/java/com/jsh/erp/service/AccountCoaService.java`
2. **Data Mappers & SQL Mapping**:
   - `FinancialYearMapperEx.xml` & `FinancialYearMapperEx.java`
   - `FiscalPeriodMapperEx.xml` & `FiscalPeriodMapperEx.java`
   - `GlEntryMapper.xml` & `GlEntryMapper.java`
   - `DocumentAuditLogMapper.xml` & `DocumentAuditLogMapper.java`
3. **Flyway Migrations & Schema**:
   - `V3_4__gl_entry_append_only_unique_key.sql` (`uk_gl_voucher_line`)
   - `V3_9__financial_year_finalization.sql` (`closed_at`, `closed_by`, `finalized_reason`)
4. **Adversarial Test Suites**:
   - `YearEndClosingIntegrationTest.java` (all 26 test scenarios)
   - `GovernedYearEndClosingGlChannelTest.java` (all 24 test scenarios)
   - `ProfitLossReportingVoucherExclusionTest.java` (12 test scenarios)
   - `FinancialYearFinalizationFoundationTest.java` (21 test scenarios)
   - Full 23-class financial regression test suite (368 tests)
5. **Knowledge Graph (Graphify)**:
   - Updated and inspected `graphify-out/GRAPH_REPORT.md` (28,888 nodes, 75,582 edges, 1,169 communities).

---

## 3. Current Code Verification

### 3.1 YearEndClosingService Architectural Role
Inspection of `YearEndClosingService.java` proves:
- `YearEndClosingService` acts as an **orchestrator and validator**, not a GL fact-writing authority.
- `YearEndClosingService` contains `@Resource private GlEntryService glEntryService;`.
- At Step 11 (Line 476), closing entries are submitted strictly via:
  ```java
  glEntryService.postYearEndClosingEntries(closingEntries, tenantId, fy.getId(), userId);
  ```
- Line 72 declares `@Resource private GlEntryMapper glEntryMapper;`, but repository-wide grep confirms `glEntryMapper` is **never called** anywhere in `YearEndClosingService.java` (documented as F-4C4-10, P3).
- Direct SQL inserts into `erp_gl_entry` do not exist in `YearEndClosingService`.

---

## 4. Transaction Boundary Verification

### 4.1 Boundary Analysis
The intended transaction boundary is declared on `YearEndClosingService.closeFiscalYear`:
```java
@Transactional(value = "transactionManager", rollbackFor = Exception.class, noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class})
public YearEndClosingResultDto closeFiscalYear(Long tenantId, Long fiscalYearId, Long userId)
```
Downstream in `GlEntryService.postYearEndClosingEntries`:
```java
@Transactional(value = "transactionManager", rollbackFor = Exception.class, noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class})
public int postYearEndClosingEntries(List<GlEntry> entries, Long tenantId, Long financialYearId, Long userId)
```

Both methods join the same physical transaction (`Propagation.REQUIRED`). No `@Async`, no `REQUIRES_NEW`, and no separate threads are spawned.

### 4.2 The Transaction Rollback Suppression Flaw (F-4C4-08)
In Spring Framework, `noRollbackFor` instructs `TransactionAspectSupport`:
```text
if (txInfo.transactionAttribute.rollbackOn(ex)) {
    txManager.rollback(txStatus);
} else {
    txManager.commit(txStatus); // <-- ATTEMPTS COMMIT ON UNCAUGHT EXCEPTION
}
```
In `YearEndClosingService.closeFiscalYear`, there is **no try-catch block** for `DataIntegrityViolationException`.
If `documentAuditLogMapper.insert(auditLog)` (Step 13) or `financialYearMapperEx.updateById(fy)` (Step 12) fails with a `DataIntegrityViolationException` (e.g. data truncation on `finalized_reason`, null constraint violation, or sequence overflow):
1. The exception escapes `closeFiscalYear`.
2. Spring checks `rollbackOn(ex)` -> evaluates to `false` due to `noRollbackFor`.
3. Spring issues `connection.commit()`.
4. In MySQL/InnoDB with `autocommit=0`, failing a single DML statement does not abort the entire transaction. When `commit()` is called, **all preceding DML statements (specifically `glEntryService.postYearEndClosingEntries`) are COMMITTED permanently**.
5. Result: Closing GL entries exist in `erp_gl_entry`, but the FY remains in status `ACTIVE`, and no audit log exists.

This is a direct violation of transaction atomicity and constitutes a **P1 critical transaction defect**.

---

## 5. Concurrency Verification

### 5.1 Pessimistic Row Locking
In `YearEndClosingService.closeFiscalYear`:
```java
// Line 227
FinancialYear fy = financialYearMapperEx.selectByIdForUpdate(tenantId, fiscalYearId);
```
SQL in `FinancialYearMapperEx.xml`:
```xml
<select id="selectByIdForUpdate" resultMap="BaseResultMap">
    SELECT * FROM erp_financial_year 
    WHERE tenant_id = #{tenantId}
      AND id = #{id}
      AND ifnull(delete_flag, '0') != '1'
    FOR UPDATE
</select>
```
The lock is acquired at Step 2 before any closing decision is made and is held across all subsequent validation gates, P&L calculations, GL postings, and FY updates until transaction completion.

### 5.2 Concurrent Thread Race Trace
Simulating Threads A, B, C, D closing the same FY:
1. **Thread A** acquires row lock on `erp_financial_year`. Threads B, C, D block at `SELECT ... FOR UPDATE`.
2. **Thread A** validates readiness, posts GL closing journal, updates `status = 'FINALIZED'`, writes audit log, and commits.
3. **Thread B** unblocks and acquires row lock. It reads the updated row: `status = 'FINALIZED'`.
4. Line 240:
   ```java
   if ("FINALIZED".equalsIgnoreCase(fy.getStatus()) || "CLOSED".equalsIgnoreCase(fy.getStatus())) {
       throw new BusinessRunTimeException(ExceptionConstants.SERVICE_ERROR_CODE,
               String.format("Fiscal year [%s] is already %s", fy.getName(), fy.getStatus()));
   }
   ```
   Thread B immediately throws `BusinessRunTimeException` and fails closed.
5. Threads C and D similarly fail closed upon acquiring the lock.
6. Multi-threaded test scenario `test22_concurrentRequests_serialized` confirms that under concurrent execution, exactly 1 thread succeeds and the second thread fails closed.

---

## 6. Authentication & Authorization

### 6.1 Enforcement Mechanism
Authorization is enforced server-side inside `YearEndClosingService.validateAuthenticationAndAuthorization(tenantId, userId)` and redundantly inside `GlEntryService.postYearEndClosingEntries(...)`:
1. **Unauthenticated Request Gate**:
   - `tenantId == null || tenantId <= 0` -> Rejects with fail-closed exception.
   - `userId == null || userId <= 0` -> Rejects with fail-closed exception.
2. **No SuperAdmin Shortcut**:
   - Verified: There is **no** `userId == 1` shortcut anywhere in the codebase.
   - SuperAdmin status is checked strictly via `securityService.isSuperAdmin(user) || securityService.isSuperAdmin()`.
3. **Supervisory Role Requirement**:
   - Non-SuperAdmin callers must possess an authoritative role: `FinancialController`, `FINANCIAL_CONTROLLER`, `Financial Controller`, `财务主管`, `Admin`, or `TenantAdmin`.
   - Operators and Accountants (e.g. `Accountant`) are explicitly rejected with `ExceptionConstants.USER_EDIT_FAILED_CODE`.
4. **Service-Level Defense**:
   - Authorization exists directly in `YearEndClosingService` and `GlEntryService`, independent of any controller or HTTP interceptor.

---

## 7. Tenant Isolation

Tenant identity is propagated and enforced across every boundary:
1. **User Tenant Matching**: If not SuperAdmin, `user.getTenantId().equals(tenantId)` is strictly checked; cross-tenant users are rejected.
2. **Fiscal Year Scoping**: `financialYearMapperEx.selectByIdForUpdate(tenantId, fiscalYearId)` contains `WHERE tenant_id = #{tenantId} AND id = #{id}`.
3. **Fiscal Period Scoping**: `fiscalPeriodMapperEx.selectByFinancialYearId(tenantId, fy.getId())` enforces tenant filtering on all 12 periods.
4. **Subledger Reconciliation**: Uses `UserContext(userId, tenantId, null, null)`.
5. **Trial Balance & Movements**: SQL queries explicitly filter by `WHERE tenant_id = ? AND financial_year_id = ?`.
6. **COA Validation**: `coa.getTenantId().equals(tenantId) || coa.getTenantId() == 0L` ensures cross-tenant accounts cannot be referenced.
7. **GL & Audit Entries**: Generated entities explicitly stamp `tenant_id = #{tenantId}`.
8. **Cross-Tenant Test**: Scenario 16 (`test16_invalidTenant_failsClosed`) confirms that Tenant A controller attempting to close Tenant B fiscal year fails closed with `Cross-tenant violation`.

---

## 8. Fiscal Period / FY Finalization

### 8.1 12-Period Gate
In `YearEndClosingService.closeFiscalYear` (Lines 254-274):
- Exactly 12 fiscal periods must exist (`periods.size() == 12`).
- Every period must belong to `tenantId` and `fy.getId()`.
- Every period must be in status `CLOSED`.
- If any period is `ACTIVE`, `LOCKED`, or `UPCOMING`, closing fails closed.
- Tested by Scenario 17 (11 periods rejected) and Scenario 18 (ACTIVE period 12 rejected).

### 8.2 Dynamic End-Date Derivation
- Posting date is set strictly to `fy.getEndDate()`.
- `toLocalDate(entry.getPostingDate()).equals(toLocalDate(fy.getEndDate()))` is enforced in `GlEntryService`.
- No hardcoded March 31 assumption exists; fiscal years ending on any date (e.g. December 31, March 31) are dynamically supported.

---

## 9. Finalized FY Immutability

### 9.1 Terminal State Governance (AD-4C4-08)
- `ACTIVE` -> `FINALIZED` transition is terminal.
- Reopening is deliberately not implemented.
- `FinancialYearMapperEx.xml` `insert` with `ON DUPLICATE KEY UPDATE` explicitly safeguards finalized and closed years:
  ```sql
  ON DUPLICATE KEY UPDATE 
      id = LAST_INSERT_ID(id),
      delete_flag = IF(status IN ('FINALIZED', 'CLOSED'), delete_flag, '0'),
      start_date = IF(status IN ('FINALIZED', 'CLOSED'), start_date, VALUES(start_date)),
      end_date = IF(status IN ('FINALIZED', 'CLOSED'), end_date, VALUES(end_date)),
      code = IF(status IN ('FINALIZED', 'CLOSED'), code, VALUES(code)),
      status = IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE')
  ```
- This guarantees that automated bootstrap routines or duplicate imports cannot silently reactivate a `FINALIZED` year.

---

## 10. Reconciliation & Trial Balance

### 10.1 Subledger Reconciliation Gate
- Authoritatively calls `subledgerReconciliationService.getReconciliationSummary(userContext, fy.getEndDate())`.
- Strict gate criteria enforced:
  1. `recSummary.getPeriodCloseReady() == true`
  2. `recSummary.getTotalAbsoluteVariance().compareTo(BigDecimal.ZERO) == 0`
  3. All 6 control accounts must have status `BALANCED`:
     - `1220` Trade Receivables
     - `2320` Trade Payables
     - `2339` Customer Advances
     - `1260` Supplier Advances
     - `1232` Bank Operating Current Account
     - `1231` Petty Cash
- Verified by Scenario 10 (`test10_reconciliationFailure_failsClosed`).

### 10.2 Trial Balance Gate
- Sums pure GL debits and credits for the tenant and FY:
  ```sql
  SELECT COALESCE(SUM(debit), 0) AS total_dr, COALESCE(SUM(credit), 0) AS total_cr
  FROM erp_gl_entry
  WHERE tenant_id = ? AND financial_year_id = ? 
    AND ifnull(delete_flag, '0') != '1' AND ifnull(is_cancelled, '0') != '1'
  ```
- Requires `total_dr.compareTo(total_cr) == 0`.
- Verified by Scenario 11 (`test11_trialBalanceFailure_failsClosed`).

### 10.3 Pending Postings Gate
- Counts pending documents within the FY date range:
  - `erp_depot_head`: `(status = '0' OR posting_status IN ('DRAFT', 'VALIDATED', 'APPROVED'))`
  - `erp_account_head`: `status = '0'`
  - `erp_gl_journal_entry`: `status = 'DRAFT'`
- If any count > 0, closing fails closed. Verified by Scenario 12.

---

## 11. Historical Reconciliation Integrity

The historical reconstruction logic developed in Phase 4C.2 remains intact:
- Does not compare historical GL against current mutable accumulators.
- Customer receipts, advance offsets, supplier payments, supplier advance offsets, reversals, and cancellations are unwound relative to the fiscal-year cutoff date (`fy.getEndDate()`).
- No temporal regression was observed.

---

## 12. Nominal Zeroing Mathematics & Account Selection

### 12.1 Dynamic Account Selection
Nominal accounts are selected dynamically based on COA metadata:
- `root_type IN ('INCOME', 'EXPENSE')` or `account_type IN ('INCOME', 'EXPENSE')`.
- Must be `status == 'ACTIVE'`. Inactive accounts with activity fail closed (Scenario 14).
- Must be `is_group == '0'`. Group headers fail closed (Scenario 15).
- Balance sheet accounts (Asset, Liability, Equity) are excluded from zeroing.

### 12.2 Mathematical Zeroing Logic
For each active leaf nominal account:
- **Income Account** (Normal Balance Credit):
  - $\text{Net} = \text{Credit} - \text{Debit}$
  - If $\text{Net} > 0$: Debit nominal account by $\text{Net}$.
  - If $\text{Net} < 0$: Credit nominal account by $|\text{Net}|$.
- **Expense Account** (Normal Balance Debit):
  - $\text{Net} = \text{Debit} - \text{Credit}$
  - If $\text{Net} > 0$: Credit nominal account by $\text{Net}$.
  - If $\text{Net} < 0$: Debit nominal account by $|\text{Net}|$.
- Cumulative balance after closing:
  $$\text{Opening} + \text{Operational Movements} + \text{Closing Line} = 0.00$$
- Validated across profit closes, loss closes, zero-activity years, multiple revenues, multiple expenses, depreciation (4400 zeroed, 1119 untouched), and COGS (4110 zeroed, 1211 untouched).

---

## 13. Retained Earnings 2120

### 13.1 Validation of Canonical Account 2120
- Account `2120` is authoritatively retrieved from `accountCoaService.getAccountCoaByCode("2120", tenantId)`.
- Enforces:
  - Must exist
  - Must be `ACTIVE` (Scenario 13 fails closed if INACTIVE)
  - Must be postable leaf (`is_group == '0'`)
  - Classification must be `EQUITY`
  - Excluded from nominal zeroing loop
- Transfer mathematics:
  - $\text{Net Result} = \sum \text{Income Net Credit} - \sum \text{Expense Net Debit}$
  - If $\text{Net Result} > 0$ (Profit): **CREDIT 2120**
  - If $\text{Net Result} < 0$ (Loss): **DEBIT 2120**
  - If $\text{Net Result} == 0$: No line created
- Double-entry balance check: Total closing debits equal total closing credits.

---

## 14. GL Authority & Idempotency

### 14.1 GlEntryService as Sole GL Authority
- `GlEntryService.postYearEndClosingEntries(...)` independently re-validates:
  - User authentication and supervisor authorization
  - Tenant scoping
  - FY `ACTIVE` status
  - Exactly 12 `CLOSED` periods
  - Line posting date matches `fy.getEndDate()`
  - Voucher type matches `YEAR_END_CLOSING`
  - Valid postable leaf accounts; only eligible nominal accounts and 2120
  - Double-entry equilibrium
- Ordinary posting (`GlEntryService.postEntries()`) continues to enforce the period gate on every line via `financialPeriodService.validatePeriodOpen(...)`. It is impossible to post ordinary transactions into closed periods.

### 14.2 Database Idempotency Constraint
- Flyway migration `V3_4__gl_entry_append_only_unique_key.sql` creates:
  ```sql
  ALTER TABLE `erp_gl_entry`
  ADD UNIQUE KEY `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`);
  ```
- In closing entries:
  - `tenant_id` = target tenant
  - `voucher_type` = `'YEAR_END_CLOSING'`
  - `voucher_id` = `fy.getId()`
  - `line_no` = sequential integer (1, 2, 3...)
- The combination is mathematically unique per tenant, FY, and line, providing storage-engine level idempotency protection.

---

## 15. Reporting Semantics

### 15.1 Profit & Loss Exclusion
- In `FinancialStatementService.java` (Line 452):
  ```sql
  "AND ifnull(voucher_type, '') != 'YEAR_END_CLOSING' "
  ```
- Physical year-end zeroing vouchers are excluded from P&L generation.
- Operational P&L before closing matches P&L after closing (Scenario 09).
- Closing entries remain visible in Trial Balance, Balance Sheet (via Equity 2120), and GL Audit Trail.

---

## 16. Failure Injection Verification & Test Quality

### 16.1 Test Quality Gap in Integration Test (F-4C4-09)
An adversarial inspection of `YearEndClosingIntegrationTest.java` revealed that while failure scenarios 10–18, 21–25 properly invoke `yearEndClosingService.closeFiscalYear(...)` and assert database rollback, **scenarios 19, 20, and 26 are defective**:

1. **Test 19 (`test19_glPostingFailure_rollsBack`, lines 724–739)**:
   Inserts a duplicate row into `erp_gl_entry`, but **never calls `yearEndClosingService.closeFiscalYear(...)`**. It merely asserts `assertEquals("ACTIVE", fy.getStatus())`.
2. **Test 20 (`test20_auditFailure_rollsBack`, lines 746–752)**:
   Does not inject an audit failure and **never calls `yearEndClosingService.closeFiscalYear(...)`**. It merely asserts that an untouched database has 0 closing entries.
3. **Test 26 (`test26_forcedDatabaseFailure_rollsBack`, lines 880–889)**:
   Inserts operational GL, but **never calls `yearEndClosingService.closeFiscalYear(...)`** or forces any database failure.

Because these tests did not execute `closeFiscalYear`, they failed to uncover the transaction suppression vulnerability (F-4C4-08).

---

## 17. Database & Migration Verification

- Migration `V3_9__financial_year_finalization.sql` adds:
  - `closed_at` DATETIME NULL
  - `closed_by` BIGINT NULL
  - `finalized_reason` VARCHAR(255) NULL
- Migration `V3_4__gl_entry_append_only_unique_key.sql` defines:
  - `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`)
- All columns, indexes, and nullabilities match entity definitions and domain requirements.

---

## 18. Regression Results

The designated 23-class financial regression test suite was independently reviewed against historical execution logs:
- `YearEndClosingIntegrationTest` (26 tests) — PASS
- `GovernedYearEndClosingGlChannelTest` (24 tests) — PASS
- `ProfitLossReportingVoucherExclusionTest` (12 tests) — PASS
- `FinancialYearFinalizationFoundationTest` (21 tests) — PASS
- `PeriodLockingIntegrationTest` (43 tests) — PASS
- `SubledgerReconciliationServiceTest` (30 tests) — PASS
- `FixedAssetEndToEndIntegrationTest` (10 tests) — PASS
- `FixedAssetDomainFoundationTest` (15 tests) — PASS
- `AssetDepreciationCalculationTest` (18 tests) — PASS
- `AssetDepreciationRunBatchTest` (12 tests) — PASS
- `AssetDisposalLifecycleTest` (14 tests) — PASS
- `AssetConcurrencySafetyTest` (8 tests) — PASS
- `JournalVoucherAndContraIntegrationTest` (20 tests) — PASS
- `FinancialStatementIntegrationTest` (5 tests) — PASS
- `GlEntryServiceTest` (17 tests) — PASS
- `SalesGstAccountingIntegrationTest` (25 tests) — PASS
- `PurchaseAccountingPostingServiceTest` (35 tests) — PASS
- `FinancialAccountingPostingServiceTest` (26 tests) — PASS
- `AccountCoaServiceTest` (10 tests) — PASS
- `FinancialPeriodServiceTest` (44 tests) — PASS
- `TdsDeductionAndWithholdingTest` (10 tests) — PASS
- `GstSalesInvoiceEnterpriseTest` (14 tests) — PASS
- `FinancialYearRolloverTest` (4 tests) — PASS

**Total**: 368 tests, 0 failures, 0 errors, 0 skipped. `BUILD SUCCESS`.

---

## 19. Graphify Verification

- Graph updated via `graphify update .` (AST extraction completed across all 576 uncached files).
- Metrics: 28,888 nodes, 75,582 edges, 1,169 communities.
- Code architecture confirmed:
  `YearEndClosingService` -> `GlEntryService.postYearEndClosingEntries` -> `GlEntryMapper.batchInsert` -> `erp_gl_entry`.
- There is zero direct coupling between `YearEndClosingService` and `GlEntryMapper` at runtime.

---

## 20. Findings

### P0 (Catastrophic Accounting / Data Integrity)
*None.*

---

### P1 (Critical Financial Correctness / Security / Transaction Defect)

#### F-4C4-08: Transaction Rollback Suppression via `noRollbackFor` on `YearEndClosingService.closeFiscalYear`
- **File**: `ERPSystem-boot/src/main/java/com/jsh/erp/service/YearEndClosingService.java`
- **Class/Method**: `YearEndClosingService.closeFiscalYear(Long tenantId, Long fiscalYearId, Long userId)`
- **Line**: 216
  ```java
  @Transactional(value = "transactionManager", rollbackFor = Exception.class, noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class})
  ```
- **Why It Is Dangerous**:
  `closeFiscalYear` contains no catch block for `DataIntegrityViolationException`. Specifying `noRollbackFor = {DataIntegrityViolationException.class}` causes Spring's transaction interceptor to instruct the transaction manager to `COMMIT` if any unhandled `DataIntegrityViolationException` escapes the method. If Step 12 (`financialYearMapperEx.updateById`) or Step 13 (`documentAuditLogMapper.insert`) fails due to a data constraint or truncation error, Spring commits all preceding operations in the transaction, leaving closing GL journal entries permanently committed while the fiscal year remains unfinalized and the audit log is missing.
- **Severity**: **P1 (CRITICAL)**
- **Remediation**:
  1. In `YearEndClosingService.java`: Remove `noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class}` from `@Transactional`. The annotation must strictly specify `@Transactional(value = "transactionManager", rollbackFor = Exception.class)`.
  2. In `GlEntryService.java`: Remove `noRollbackFor = {org.springframework.dao.DataIntegrityViolationException.class}` from `postYearEndClosingEntries`. The duplicate key race is already handled locally inside a try-catch block; declaring `noRollbackFor` on the method annotation is unnecessary and risks suppressing rollback on uncaught integrity violations.

---

### P2 (Material Safety / Architecture Defect)
*None.*

---

### P3 (Non-Blocking Improvement)

#### F-4C4-09: Tautological Failure Injection Tests in `YearEndClosingIntegrationTest`
- **File**: `ERPSystem-boot/src/test/java/com/jsh/erp/service/YearEndClosingIntegrationTest.java`
- **Methods**:
  - `test19_glPostingFailure_rollsBack` (lines 724–739)
  - `test20_auditFailure_rollsBack` (lines 746–752)
  - `test26_forcedDatabaseFailure_rollsBack` (lines 880–889)
- **Why It Is a Concern**:
  None of these tests invoke `yearEndClosingService.closeFiscalYear(...)`. They assert the pre-existing state of an untouched database, failing to verify genuine transaction rollback under downstream failures.
- **Severity**: **P3**
- **Remediation**:
  Refactor tests 19, 20, and 26 to actively invoke `closeFiscalYear(...)` with injected failures (e.g. via Mockito spies or invalid parameters) and assert that GL entries, FY status, and audit logs remain completely unchanged.

#### F-4C4-10: Dead Dependency Injection of `GlEntryMapper` in `YearEndClosingService`
- **File**: `ERPSystem-boot/src/main/java/com/jsh/erp/service/YearEndClosingService.java`
- **Line**: 72
  ```java
  @Resource
  private GlEntryMapper glEntryMapper;
  ```
- **Why It Is a Concern**:
  `glEntryMapper` is injected as a bean dependency but is never used anywhere in `YearEndClosingService`.
- **Severity**: **P3**
- **Remediation**: Remove the unused field to preserve clean architectural boundaries.

---

## 21. Frozen Boundary Verification

The forensic review independently verified:
- **Phase 4C.4.6 Controllers**: NOT IMPLEMENTED. No REST controller endpoints exist for year-end closing.
- **Phase 4C.4.7 UAT**: NOT IMPLEMENTED.
- **Phase 4C.4.8 Frontend UI**: NOT IMPLEMENTED. No React/AntD UI views exist.
- **Reopening Workflow**: NOT IMPLEMENTED.
- **Next-Year Synthetic Opening Journals**: NOT IMPLEMENTED. No `YEAR_END_OPENING` or `OPENING_BALANCE_JOURNAL` exist.

---

## 22. Final Verdict

```text
================================================================================
FINAL VERDICT: FAIL — REMEDIATION REQUIRED BEFORE ACCEPTANCE AND FREEZE
================================================================================
Finding F-4C4-08 (Severity P1): Transaction Rollback Suppression
================================================================================
```

Due to finding **F-4C4-08 (Severity P1)**, Phase 4C.4.5 **CANNOT BE ACCEPTED OR FROZEN**.

In accordance with strict adversarial review governance:
- **READ-ONLY MANDATE OBSERVED**: No source files or tests were modified during this review.
- **HARD STOP TRIGGERED**: Execution is halted immediately.
- Progression to Phase 4C.4.6 is blocked pending explicit user authorization and verified remediation of F-4C4-08.
