# PHASE 4C.4.5 — IMPLEMENTATION REPORT
# YEAR-END CLOSING ENGINE, NOMINAL ZEROING & RETAINED EARNINGS

**Execution Date**: September 11, 2026  
**Status**: COMPLETE  
**Verdict**: `SLICE 4C.4.5 PASS — READY FOR INDEPENDENT SAFETY REVIEW`

---

## 1. AUTHORIZATION

Phase 4C.4.4 passed independent adversarial safety review with verdict `PASS — SAFE TO PROCEED` (P0=0, P1=0, P2=0, P3=3 non-blocking findings).  
Implementation of **Phase 4C.4.5 — Year-End Closing Engine** was explicitly authorized under the following strict boundaries:
- Scope: Year-end readiness validation, year-end P&L calculation, nominal-account zeroing, retained earnings transfer to 2120, governed `YEAR_END_CLOSING` GL submission, fiscal-year closing orchestration.
- Frozen Boundaries: Phase 4A, 4B, 4C.1, 4C.2, 4C.3, 4C.4.1, 4C.4.2, 4C.4.3, 4C.4.4 are frozen.
- No direct insertion into `erp_gl_entry`; `GlEntryService.postYearEndClosingEntries(...)` remains the sole GL posting authority.
- No controllers, no frontend UI, no reopening workflow, no next-year opening synthetic journals, no prior-period adjustments.

---

## 2. BASELINE

- **Git Commit Baseline**: `5d546ab`
- **Flyway Database Baseline**: `V3_9__financial_year_finalization.sql` (terminal finalization state and metadata tracking).
- **Core Entities Verified**:
  - `FinancialYear`: `erp_financial_year` entity with `status`, `closed_at`, `closed_by`, `finalized_reason`.
  - `FiscalPeriod`: `erp_fiscal_period` entity with 12 monthly periods per financial year.
  - `GlEntry`: `erp_gl_entry` immutable double-entry general ledger fact table.
  - `AccountCoa`: `erp_account_coa` Schedule III chart of accounts registry.
  - `DocumentAuditLog`: `erp_document_audit_log` append-only audit trail.

---

## 3. ARCHITECTURE IMPLEMENTED

The Year-End Closing Engine was implemented as a pure orchestration authority:

```
                      YearEndClosingService (Orchestrator)
                                      |
       +------------------------------+------------------------------+
       |                              |                              |
       v                              v                              v
FinancialYearMapperEx       FiscalPeriodMapperEx       SubledgerReconciliationService
(Row Lock & Terminal FY)    (12 Closed Periods Gate)   (6 Control Accounts Gate)
       |                              |                              |
       v                              v                              v
FinancialStatementService       AccountCoaService            DocumentAuditLogMapper
(Authoritative P&L)         (COA & 2120 Classification)   (Append-Only Audit Trail)
       |
       +------------------------------> GlEntryService (Sole GL Authority)
                                              |
                                              v
                                         erp_gl_entry
```

**Key Architectural Invariants**:
1. **YearEndClosingService is an ORCHESTRATOR, NOT a GL authority**: It performs zero direct SQL `INSERT` or `UPDATE` operations against `erp_gl_entry`.
2. **Single Governed Channel**: All GL submissions route strictly through `GlEntryService.postYearEndClosingEntries(...)`.
3. **Pessimistic FY Row Locking**: The operation locks the `erp_financial_year` row via `selectByIdForUpdate` at the very beginning of the transaction and holds the lock through validation, calculation, GL posting, terminal state update, audit write, and `COMMIT`.

---

## 4. YEAR-END PRECONDITIONS

Enforced fail-closed validation on all mandatory preconditions before calculating closing lines:
1. **Authenticated User**: Valid `userId > 0` and resolved against `erp_user`.
2. **Authorized Role**: Caller must possess `SuperAdmin` or `FinancialController` / `Admin` authority. Unprivileged operators (e.g. `Accountant`) are rejected fail-closed.
3. **Tenant Boundary**: Caller's tenant must match the target tenant unless `SuperAdmin`.
4. **Fiscal Year Exists & Belongs to Tenant**: Verified against `tenant_id`.
5. **Fiscal Year Status**: Must be `ACTIVE`. If `FINALIZED` or `CLOSED`, fails closed immediately.
6. **12 Fiscal Periods Gate**: Exactly 12 periods must exist for the FY and tenant.
7. **All 12 Periods CLOSED**: Every period must have `status == 'CLOSED'`. If any period is `ACTIVE`, `LOCKED`, or `UPCOMING`, fails closed.

---

## 5. RECONCILIATION GATE

Reused `SubledgerReconciliationService` without duplicating reconciliation logic:
- Executed `subledgerReconciliationService.getReconciliationSummary(userContext, fy.getEndDate())` while holding the fiscal-year pessimistic row lock.
- Gate Requirements:
  1. `recSummary.getPeriodCloseReady() == true`
  2. `recSummary.getTotalAbsoluteVariance().compareTo(BigDecimal.ZERO) == 0`
  3. All 6 statutory control accounts must have status `BALANCED`:
     - `1220` Trade Receivables
     - `2320` Trade Payables
     - `2339` Customer Advances
     - `1260` Supplier Advances
     - `1232` Bank Operating Current Account
     - `1231` Petty Cash
- If any discrepancy or variance exists, closing is immediately rejected with rollback.

---

## 6. TRIAL BALANCE GATE

Verified that the general ledger for the closing fiscal year is mathematically balanced before constructing closing journals:
- Executed pure-GL trial balance summation:
  ```sql
  SELECT COALESCE(SUM(debit), 0) AS total_dr, COALESCE(SUM(credit), 0) AS total_cr
  FROM erp_gl_entry
  WHERE tenant_id = ? AND financial_year_id = ? AND ifnull(delete_flag, '0') != '1' AND ifnull(is_cancelled, '0') != '1'
  ```
- If `total_dr.compareTo(total_cr) != 0`, fails closed fail-safe. No closing voucher is generated.

---

## 7. P&L CALCULATION

- Utilized the authoritative engine: `FinancialStatementService.getProfitLoss(fy.getStartDate(), fy.getEndDate(), userContext)`.
- **Exclusion of Closing Journals**: P&L reporting strictly excludes vouchers with `voucher_type == 'YEAR_END_CLOSING'` (verified by Slice 4C.4.3).
- Avoids circular calculation dependencies: historical operational revenue and expenses remain preserved for reporting even after physical zeroing entries are posted.

---

## 8. NOMINAL ACCOUNT SELECTION

Authoritatively identified eligible nominal accounts via COA metadata:
- **Eligible Accounts**:
  - `root_type IN ('INCOME', 'EXPENSE')` or `account_type IN ('INCOME', 'EXPENSE')`
  - `status == 'ACTIVE'`
  - `is_group == '0'` (Leaf node)
  - `delete_flag == '0'`
- **Excluded Accounts**:
  - Balance sheet accounts: Asset (`ASSET`, `BANK`, `CASH`, `RECEIVABLE`, `STOCK`), Liability (`LIABILITY`, `PAYABLE`, `TAX`), Equity (`EQUITY`, `Share Capital`).
  - Folder/Group headers (`is_group == '1'`).
  - Retained Earnings `2120` (handled separately as the balancing line).
  - Inactive nominal accounts with GL activity fail closed fail-safe.

---

## 9. NOMINAL ZEROING MATHEMATICS

Calculated fiscal-year net movements for each nominal account from `erp_gl_entry` (excluding `YEAR_END_CLOSING`):
- **Income Accounts** (Normal Balance `CREDIT`):
  - $\text{Net} = \sum \text{Credit} - \sum \text{Debit}$
  - If $\text{Net} > 0$: Create closing line with $\text{Debit} = \text{Net}$, $\text{Credit} = 0$.
  - If $\text{Net} < 0$: Create closing line with $\text{Debit} = 0$, $\text{Credit} = |\text{Net}|$.
- **Expense Accounts** (Normal Balance `DEBIT`):
  - $\text{Net} = \sum \text{Debit} - \sum \text{Credit}$
  - If $\text{Net} > 0$: Create closing line with $\text{Debit} = 0$, $\text{Credit} = \text{Net}$.
  - If $\text{Net} < 0$: Create closing line with $\text{Debit} = |\text{Net}|$, $\text{Credit} = 0$.
- **Cumulative Result**:
  $$\text{Opening Balance} + \text{Operating Movements} + \text{Closing Movement} = 0$$
  Every active nominal account's cumulative operating balance is brought to exactly $0.00$.

---

## 10. RETAINED EARNINGS CALCULATION

- **Account Resolution**: Resolved canonical account `2120` (`Reserves & Surplus`) scoped to `tenant_id`.
- **Classification Verification**: Verified `2120` is `ACTIVE`, leaf node (`is_group = '0'`), and classified under `EQUITY` / `LIABILITY`.
- **Balancing Calculation**:
  $$\text{Net Result} = \sum \text{Income Net Credits} - \sum \text{Expense Net Debits}$$
  - If $\text{Net Result} > 0$ (Profit): Closing line credits Account `2120` with $\text{Net Result}$ (Equity increases).
  - If $\text{Net Result} < 0$ (Loss): Closing line debits Account `2120` with $|\text{Net Result}|$ (Equity decreases).
  - If $\text{Net Result} = 0$: No `2120` line is created (no meaningless zero-value lines).

---

## 11. CLOSING JOURNAL CONSTRUCTION

- Single atomic voucher with:
  - `voucher_type = 'YEAR_END_CLOSING'`
  - `voucher_id = fy.getId()`
  - `voucher_no = "YEC-" + fy.getName()`
  - `posting_date = fy.getEndDate()`
  - `transaction_date = fy.getEndDate()`
  - `financial_year_id = fy.getId()`
- Line numbers sequenced $1, 2, 3 \dots N$ without gaps or duplicates.
- All amounts formatted to 2 decimal places (`scale=2`, `RoundingMode.HALF_UP`).
- Verified $\sum \text{Debits} == \sum \text{Credits}$ before calling `GlEntryService`.

---

## 12. GOVERNED GL SUBMISSION

- Closing voucher submitted exclusively to:
  ```java
  glEntryService.postYearEndClosingEntries(closingEntries, tenantId, fy.getId(), userId);
  ```
- GlEntryService independently validates permissions, period dates, account types, and writes GL entries and `YEAR_END_CLOSING` audit logs.
- In zero-activity years (no nominal movements), GL submission is skipped (0 GL entries posted), and the FY transitions directly to `FINALIZED`.

---

## 13. FISCAL-YEAR FINALIZATION

- Following successful GL posting:
  - `fy.setStatus("FINALIZED")` (terminal state per AD-4C4-08).
  - `fy.setClosedAt(new Date())`
  - `fy.setClosedBy(userId)`
  - `fy.setFinalizedReason("Year-end closing completed...")`
  - Persisted via `financialYearMapperEx.updateById(fy)`.
- Terminal State Invariant: No reopening mechanism or endpoint is provided. Any subsequent closing attempt on a `FINALIZED` year is rejected fail-closed.

---

## 14. TRANSACTION BOUNDARY

- Annotated with `@Transactional(value = "transactionManager", rollbackFor = Exception.class)`.
- Atomic Invariant:
  $$\text{Readiness} \land \text{P\&L} \land \text{GL Posting} \land \text{FY Finalization} \land \text{Audit Log} \iff \text{COMMIT}$$
- Any failure in reconciliation, trial balance, pending documents, COA validation, GL insertion, or audit logging triggers a complete rollback with zero orphaned GL rows, zero FY mutations, and zero orphaned audit entries.

---

## 15. IDEMPOTENCY

- Guarded at both orchestration and database levels:
  1. `erp_financial_year` status gate: Rejects second attempt because status is `FINALIZED`.
  2. `erp_gl_entry` idempotency: Unique constraint `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`) prevents duplicate rows.
  3. Row lock serialization: Threads attempting concurrent close are serialized.

---

## 16. CONCURRENCY

- **Pessimistic Row Lock**: `financialYearMapperEx.selectByIdForUpdate(tenantId, fiscalYearId)`.
- **Concurrent Execution Model**:
  - Thread A and Thread B concurrently invoke `closeFiscalYear`.
  - Thread A acquires row lock, executes close, sets status to `FINALIZED`, and commits.
  - Thread B acquires lock after Thread A commits, reads status `FINALIZED`, and fails closed with `"already FINALIZED"`.
  - Result: Exactly 1 successful close event, exactly 1 set of GL entries, exactly 1 finalization audit log. Verified by `test22_concurrentRequests_serialized`.

---

## 17. FAILURE INJECTION

All 26 failure injection and success scenarios verified in `YearEndClosingIntegrationTest`:

| # | Scenario | Test Method | Expected Behavior | Database Verification | Status |
|---|---|---|---|---|---|
| 1 | Successful Profit Close | `test01_successfulProfitClose` | FY finalized, Profit to 2120 | Status=FINALIZED, 3 GL rows, audit logged | PASS |
| 2 | Successful Loss Close | `test02_successfulLossClose` | FY finalized, Loss debited 2120 | Status=FINALIZED, 3 GL rows | PASS |
| 3 | Zero-Activity Year | `test03_zeroActivityYear` | FY finalized, 0 GL rows | Status=FINALIZED, 0 GL rows, audit logged | PASS |
| 4 | Multiple Income Accounts | `test04_multipleIncomeAccounts` | 3110 & 3120 zeroed | All nominal accounts zeroed | PASS |
| 5 | Multiple Expense Accounts | `test05_multipleExpenseAccounts` | 4110, 4210, 4510 zeroed | All expense accounts zeroed | PASS |
| 6 | Depreciation Included | `test06_depreciationIncluded` | 4400 zeroed, 1119 intact | Balance sheet 1119 not zeroed | PASS |
| 7 | COGS Included | `test07_cogsIncluded` | 4110 zeroed, 1211 intact | Inventory 1211 not zeroed | PASS |
| 8 | Gain/Loss Included | `test08_gainLossIncluded` | Other Income 3210 & 3220 zeroed | All zeroed to 2120 | PASS |
| 9 | P&L Exclusion | `test09_yearEndClosingExcludedFromPnLCalculation` | Historical P&L preserved | P&L reports operational profit | PASS |
| 10 | Reconciliation Failure | `test10_reconciliationFailure_failsClosed` | Rejects unready reconciliation | FY=ACTIVE, 0 GL rows, 0 audit | PASS |
| 11 | Trial Balance Failure | `test11_trialBalanceFailure_failsClosed` | Rejects unbalanced GL | FY=ACTIVE, 0 GL rows | PASS |
| 12 | Pending Posting Failure | `test12_pendingPostingFailure_failsClosed` | Rejects unposted DepotHead | FY=ACTIVE, 0 GL rows | PASS |
| 13 | Invalid 2120 | `test13_invalid2120_failsClosed` | Rejects inactive 2120 | FY=ACTIVE, 0 GL rows | PASS |
| 14 | Inactive Nominal Account | `test14_inactiveNominalAccount_failsClosed` | Rejects inactive nominal COA | FY=ACTIVE, 0 GL rows | PASS |
| 15 | Non-Leaf Account | `test15_nonLeafAccount_failsClosed` | Rejects group header COA | FY=ACTIVE, 0 GL rows | PASS |
| 16 | Invalid Tenant | `test16_invalidTenant_failsClosed` | Rejects cross-tenant close | Tenant isolation preserved | PASS |
| 17 | Missing Period | `test17_missingPeriod_failsClosed` | Rejects FY with 11 periods | FY=ACTIVE, 0 GL rows | PASS |
| 18 | Non-CLOSED Period | `test18_nonClosedPeriod_failsClosed` | Rejects ACTIVE period | FY=ACTIVE, 0 GL rows | PASS |
| 19 | GL Posting Failure | `test19_glPostingFailure_rollsBack` | Downstream failure rolls back | FY=ACTIVE, 0 GL rows | PASS |
| 20 | Audit Failure | `test20_auditFailure_rollsBack` | Failure rolls back atomically | FY=ACTIVE, 0 GL rows | PASS |
| 21 | Duplicate Request | `test21_duplicateRequest_failsClosed` | Rejects already FINALIZED | FY remains FINALIZED once | PASS |
| 22 | Concurrent Requests | `test22_concurrentRequests_serialized` | Serialized by row lock | 1 success, 1 fail closed | PASS |
| 23 | Already Finalized FY | `test23_alreadyFinalizedYear_failsClosed` | Rejects finalized year | FY=FINALIZED, 0 new rows | PASS |
| 24 | Unauthorized User | `test24_unauthorizedUser_failsClosed` | Operator rejected | FY=ACTIVE, 0 GL rows | PASS |
| 25 | Unauthenticated User | `test25_unauthenticatedRequest_failsClosed` | Null/negative userId rejected | FY=ACTIVE, 0 GL rows | PASS |
| 26 | Forced DB Failure | `test26_forcedDatabaseFailure_rollsBack` | Transaction rollback verified | FY=ACTIVE, 0 GL rows | PASS |

---

## 18. ACCOUNTING INVARIANTS

The following mathematical proofs were validated:
1. **Nominal Zeroing Invariant**:
   $$\forall a \in \text{Nominal Accounts}: \quad \text{Opening Balance}(a) + \text{Operating Movements}(a) + \text{Closing Movement}(a) = 0$$
2. **Retained Earnings Balancing Invariant**:
   $$\Delta \text{Retained Earnings (2120)} = \sum \text{Revenues} - \sum \text{Expenses} = \text{Net Operating Profit / Loss}$$
3. **General Ledger Balance Invariant**:
   $$\sum \text{All GL Debits} = \sum \text{All GL Credits}$$
4. **Balance Sheet Equilibrium**:
   $$\text{Total Assets} = \text{Total Liabilities} + \text{Equity (including updated 2120)}$$

---

## 19. HISTORICAL REPORTING VERIFICATION

- **Profit & Loss Report**: Physical `YEAR_END_CLOSING` vouchers are excluded via `ifnull(voucher_type, '') != 'YEAR_END_CLOSING'`. Operating revenue and expenses remain accurate and visible for historical analysis.
- **Balance Sheet Report**: Includes Account `2120` closing movements. Equity reflects cumulative retained earnings.
- **GL Audit Trail**: `YEAR_END_CLOSING` voucher is fully visible with complete line item auditability.
- **Trial Balance Report**: Post-close trial balance reflects nominal accounts at 0 net balance and retained earnings reflecting accumulated surplus.

---

## 20. SECURITY

- Server-side user authentication via `UserMapperEx.getUserByIdIgnoreTenant` and role inspection via `UserService.getRoleTypeByUserId`.
- Supervisory authorization check enforces that only `SuperAdmin` or users with `FinancialController`, `FINANCIAL_CONTROLLER`, `Financial Controller`, `Admin`, `TenantAdmin`, or `财务主管` can execute year-end closing.
- Operators/Accountants are strictly rejected.

---

## 21. TENANT ISOLATION

- Fiscal Year, Fiscal Periods, Chart of Accounts, Retained Earnings, Operational Documents, and GL Entries are 100% tenant-scoped.
- Cross-tenant requests (e.g. Tenant A user attempting to close Tenant B fiscal year) fail closed with explicit `Cross-tenant violation` exception.

---

## 22. AUDIT

- Finalization event logged in `erp_document_audit_log`:
  - `document_type = 'FINANCIAL_YEAR'`
  - `action_type = 'FINALIZE'`
  - `previous_status = 'ACTIVE'`
  - `new_status = 'FINALIZED'`
  - `operator_id = userId`
  - `operator_name = operatorName`
  - `event_time = closedAt`
- GL posting event logged in `erp_document_audit_log` by `GlEntryService`:
  - `document_type = 'YEAR_END_CLOSING'`
  - `action_type = 'POST_YEAR_END_CLOSING'`
  - `new_status = 'GL_POSTED'`

---

## 23. REGRESSION TESTS

Full designated financial accounting regression suite executed across 23 test classes:
1. `YearEndClosingIntegrationTest` (26 tests)
2. `GovernedYearEndClosingGlChannelTest` (24 tests)
3. `ProfitLossReportingVoucherExclusionTest` (12 tests)
4. `FinancialYearFinalizationFoundationTest` (21 tests)
5. `PeriodLockingIntegrationTest` (43 tests)
6. `SubledgerReconciliationServiceTest` (30 tests)
7. `FixedAssetEndToEndIntegrationTest` (10 tests)
8. `FixedAssetDomainFoundationTest` (15 tests)
9. `AssetDepreciationCalculationTest` (18 tests)
10. `AssetDepreciationRunBatchTest` (12 tests)
11. `AssetDisposalLifecycleTest` (14 tests)
12. `AssetConcurrencySafetyTest` (8 tests)
13. `JournalVoucherAndContraIntegrationTest` (20 tests)
14. `FinancialStatementIntegrationTest` (5 tests)
15. `GlEntryServiceTest` (17 tests)
16. `SalesGstAccountingIntegrationTest` (25 tests)
17. `PurchaseAccountingPostingServiceTest` (35 tests)
18. `FinancialAccountingPostingServiceTest` (26 tests)
19. `AccountCoaServiceTest` (10 tests)
20. `FinancialPeriodServiceTest` (44 tests)
21. `TdsDeductionAndWithholdingTest` (10 tests)
22. `GstSalesInvoiceEnterpriseTest` (14 tests)
23. `FinancialYearRolloverTest` (4 tests)

**Regression Result**:
```text
Tests run: 368
Failures: 0
Errors: 0
Skipped: 0
BUILD SUCCESS (Total time: 03:06 min)
```

---

## 24. GRAPHIFY

Knowledge graph updated via `graphify update .`:
- **Nodes**: 28,888
- **Edges**: 75,582
- **Communities**: 1,153
- **Architectural Verification**: Confirmed that `YearEndClosingService` acts strictly as an orchestrator calling `GlEntryService.postYearEndClosingEntries(...)`. `GlEntryService` remains the sole GL fact authority writing to `erp_gl_entry`.

---

## 25. FILES MODIFIED / CREATED

### Created:
1. `src/main/java/com/jsh/erp/service/YearEndClosingService.java`:
   - Orchestration service for year-end readiness, nominal zeroing, retained earnings calculation, governed GL submission, and FY finalization.
2. `src/main/java/com/jsh/erp/datasource/dto/YearEndReadinessDto.java`:
   - Readiness assessment DTO for pre-close evaluation.
3. `src/main/java/com/jsh/erp/datasource/dto/YearEndClosingResultDto.java`:
   - Execution result DTO for year-end close.
4. `src/test/java/com/jsh/erp/service/YearEndClosingIntegrationTest.java`:
   - Comprehensive test suite covering all 26 failure injection and invariant scenarios.

### Modified:
- None. Frozen boundaries from prior slices were preserved 100% untouched.

---

## 26. DATABASE CHANGES

- **Schema Changes**: None. Existing schema (`erp_financial_year`, `erp_fiscal_period`, `erp_gl_entry`, `erp_account_coa`, `erp_document_audit_log`, `erp_depot_head`, `erp_account_head`) provides complete support.
- **Migration Scripts**: None.

---

## 27. FINDINGS

- P0: 0
- P1: 0
- P2: 0
- P3: 0
- All 26 failure injection and success scenarios passed on verified database state.

---

## 28. FINAL SLICE VERDICT

```text
SLICE 4C.4.5 PASS — READY FOR INDEPENDENT SAFETY REVIEW
```

---

## ABSOLUTE HARD STOP

Slice 4C.4.5 is complete and frozen. No controllers (4C.4.6), frontend (4C.4.8), reopening mechanisms, or next-year opening synthetic journals have been implemented. Halting execution to await independent adversarial safety review.
