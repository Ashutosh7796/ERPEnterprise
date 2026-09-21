# Track A.1 — Next-Year Synthetic Opening Balance Rollover Implementation Report

**Document ID**: `94_trackA1_SYNTHETIC_OPENING_BALANCE_ROLLOVER_IMPLEMENTATION_REPORT`  
**Track**: Track A.1 — Next-Year Synthetic Opening Balance Rollover  
**Baseline Certified Phase**: Phase 4C.4 (Release Gate Certified)  
**Date**: September 11, 2026  
**Status**: COMPLETE  
**Final Verdict**: `TRACK A.1 PASS — READY FOR INDEPENDENT SAFETY REVIEW`

---

## 1. Accounting Objective

The primary objective of Track A.1 is to generate governed synthetic opening journal entries in the subsequent financial year (FY $N+1$) that carry forward the permanent Balance Sheet balances from the finalized prior financial year (FY $N$).

```text
FY 2025–26
     ↓
FINALIZED (Durable read-only historical state)
     ↓
Permanent Closing Balances (Assets 1xxx, Liabilities/Equity 2xxx incl. Retained Earnings 2120)
     ↓
Synthetic Opening Journal (is_opening = '1', voucher_type = 'OPENING', date = 2026-04-01)
     ↓
FY 2026–27 (ACTIVE)
```

### Core Invariants:
1. **Prior FY permanent balance = Next FY opening balance**, represented faithfully using double-entry debits and credits.
2. **Strict Nominal Exclusion**: Revenue ($3xxx$) and Expense ($4xxx$) accounts are nominal period accounts and are strictly excluded from rollover.
3. **Double-Entry Equilibrium**: $\sum \text{Opening Debits} == \sum \text{Opening Credits}$ and $\text{Assets} == \text{Liabilities} + \text{Equity}$.

---

## 2. Existing Architecture Discovered

1. **Schema Support**:
   - `erp_gl_entry.is_opening` exists as `CHAR(1) NOT NULL DEFAULT '0'` with comment `'1=Opening Balance, 0=Regular'`.
   - Unique constraint: `uk_gl_voucher_line (tenant_id, voucher_type, voucher_id, line_no)` exists in `erp_gl_entry`.
2. **Voucher Identification**:
   - Canonical voucher type `OPENING` is documented in `V3_3__finance_general_ledger_core.sql` alongside `JOURNAL_VOUCHER`, `CONTRA`, and `YEAR_END_CLOSING`.
   - Opening voucher number follows standard sequence format: `OPN-YYYY-YY` (e.g. `OPN-2026-27`).
   - Voucher ID maps directly to the target financial year ID (`voucher_id = targetFy.getId()`).
3. **Fiscal Year Resolution & Bootstrapping**:
   - `FinancialYearService.resolveFinancialYear(Long tenantId, Date targetDate)` resolves or creates a financial year for the given date.
   - `FinancialPeriodService.ensurePeriodsForFinancialYear(FinancialYear fy)` idempotently bootstraps the 12 monthly fiscal periods (April through March) in status `ACTIVE`.
4. **Schedule III Financial Statement Calculations**:
   - `FinancialStatementService.getTrialBalance(startDate, endDate)` filters `posting_date < startDate` for opening balances and `startDate <= posting_date <= endDate` for period movements.
   - `FinancialStatementService.getProfitLoss` aggregates accounts where `root_type IN ('INCOME', 'EXPENSE')` or `account_type IN ('INCOME', 'EXPENSE')`. Because opening entries only touch `ASSET`, `LIABILITY`, and `EQUITY`, opening entries never pollute Profit & Loss.

---

## 3. Authoritative Opening-Balance Definition

In this ERP system, an opening balance is authoritatively defined as:
- A persisted ledger row in `erp_gl_entry`.
- Explicit opening indicator: `is_opening = '1'`.
- Voucher identification: `voucher_type = 'OPENING'`, `voucher_no = 'OPN-' + targetFy.getName()`, `voucher_id = targetFy.getId()`.
- Fiscal temporal placement: `financial_year_id = targetFy.getId()`, `posting_date = targetFy.getStartDate()`, `transaction_date = targetFy.getStartDate()`.
- Double-entry balance: each active leaf account with a non-zero cumulative balance up to the source year's closing date has either a debit line (if net debit $> 0$) or a credit line (if net credit $> 0$). Zero-balance accounts are omitted.

---

## 4. Source-to-Target Financial Year Flow

```text
Source Financial Year (e.g., FY 2025–26, ID: 1001)
├── Status: FINALIZED (Read-only historical fact)
├── End Date: 2026-03-31
└── Periods: All 12 CLOSED
         │
         │ (Rollover execution triggered by Financial Controller / SuperAdmin)
         ▼
Target Financial Year Resolution
├── Target Date: 2026-04-01 (sourceFy.endDate + 1 day)
├── Resolved / Bootstrapped: FY 2026–27 (ID: 1002)
├── Status: ACTIVE
└── Fiscal Period 1 (2026-04): ACTIVE (2026-04-01 to 2026-04-30)
         │
         ▼
Pessimistic Serialization Lock
├── selectByIdForUpdate(sourceFiscalYearId)
└── selectByIdForUpdate(targetFiscalYearId)
         │
         ▼
Idempotency Gate
└── countByVoucher(tenantId, 'OPENING', targetFyId) == 0 ? proceed : return existing summary
         │
         ▼
Extraction & Transformation
├── Leaf Permanent Accounts: root_type IN ('ASSET', 'LIABILITY', 'EQUITY')
├── Posting Date <= 2026-03-31
├── Net > 0 -> Debit, Net < 0 -> Credit
└── Verify Sum(Debit) == Sum(Credit)
         │
         ▼
Governed Batch GL Insertion
└── erp_gl_entry (voucher_type='OPENING', is_opening='1', posting_date='2026-04-01')
         │
         ▼
Immutable Audit Log
└── erp_document_audit_log (document_type='OPENING_BALANCE', action_type='ROLLOVER_OPENING_BALANCE')
```

---

## 5. Account Inclusion Rules

| Account Class | Root Type | Inclusion in A.1 Rollover | Justification |
| :--- | :--- | :--- | :--- |
| **Assets (1xxx)** | `ASSET` | **INCLUDED** (if non-zero) | Permanent economic resources carrying forward to new year |
| **Contra-Assets (1119)** | `ASSET` | **INCLUDED** (as Credit) | Accumulated depreciation reducing net fixed assets |
| **Liabilities (2xxx)** | `LIABILITY` | **INCLUDED** (if non-zero) | Permanent third-party obligations carrying forward |
| **Equity & Capital (2110)** | `LIABILITY` / `EQUITY` | **INCLUDED** (if non-zero) | Permanent ownership equity carrying forward |
| **Retained Earnings (2120)** | `LIABILITY` / `EQUITY` | **INCLUDED** (as Credit/Debit) | Finalized cumulative reserves & surplus from prior year |
| **Revenue (3xxx)** | `INCOME` | **STRICTLY EXCLUDED** | Nominal accounts; zeroed to 2120 at year-end; new year starts at 0 |
| **Expenses (4xxx)** | `EXPENSE` | **STRICTLY EXCLUDED** | Nominal accounts; zeroed to 2120 at year-end; new year starts at 0 |
| **Zero-Balance Accounts** | Any | **OMITTED** | Accounts with net balance == 0.00 generate no lines to prevent ledger bloat |

---

## 6. Retained Earnings Treatment

Phase 4C.4 Year-End Closing Engine already finalized net operational profit/loss into Account `2120` (`Reserves & Surplus`) as of March 31 of FY $N$.

Track A.1:
- Treats Account `2120` identically to any other permanent equity account.
- Extracts Account `2120`'s cumulative net credit (or debit, in case of cumulative loss) position up to `sourceFy.getEndDate()`.
- Generates an opening equity entry in FY $N+1$ for Account `2120`.
- **Zero Double-Counting**: Track A.1 does NOT re-calculate P&L and does NOT post closing transfers. It carries forward the finalized position directly.

---

## 7. GL Entry Design

Each generated opening GL line in `erp_gl_entry` is populated with:

```java
entry.setTenantId(tenantId);
entry.setFinancialYearId(targetFy.getId());
entry.setVoucherType("OPENING");
entry.setVoucherId(targetFy.getId());
entry.setVoucherNo("OPN-" + targetFy.getName());
entry.setLineNo(lineIndex++);
entry.setPostingDate(targetFy.getStartDate()); // 2026-04-01
entry.setTransactionDate(targetFy.getStartDate());
entry.setAccountId(rec.accountId);
entry.setAccountCode(rec.accountCode);
entry.setAccountName(rec.accountName);
entry.setDebit(debit);
entry.setCredit(credit);
entry.setNarration("Opening balance carry-forward from FY " + sourceFy.getName());
entry.setIsOpening("1"); // CANONICAL FLAG
entry.setIsCancelled("0");
entry.setDeleteFlag("0");
entry.setCreator(userId);
```

---

## 8. Tenant Isolation Design

- Every database query in `FinancialYearRolloverService` enforces `WHERE tenant_id = ?`.
- Source FY lookup uses `selectByIdAndTenant(tenantId, sourceFiscalYearId)`. If a tenant requests another tenant's financial year, it fails with 404 / exception.
- Target FY resolution is explicitly scoped: `resolveFinancialYear(tenantId, targetOpeningDate)`.
- User tenant membership is strictly validated: non-super users cannot execute operations across tenant boundaries.
- Verified in Test 8: Tenant B cannot roll over Tenant A's fiscal year, and Tenant A's rollover generates 0 entries in Tenant B.

---

## 9. Idempotency Design

Running rollover multiple times for the same source and target financial year is guaranteed idempotent:
1. **Pre-Insert Check**: `glEntryMapper.countByVoucher(tenantId, "OPENING", targetFy.getId())`.
   - If $> 0$, the service computes the existing opening totals and returns a `YearEndRolloverResultDto` with status `ALREADY_COMPLETED`.
   - Zero duplicate rows are inserted.
2. **Database Unique Constraint**: `uk_gl_voucher_line (tenant_id, voucher_type, voucher_id, line_no)` acts as the physical database engine safety net.
3. Verified in Test 9: Running rollover twice produces identical row counts, identical balances, and safe `ALREADY_COMPLETED` status.

---

## 10. Concurrency Design

Concurrent rollover attempts for the same financial year are serialized and resolved without duplicate entries:
1. **Source FY Pessimistic Lock**: `financialYearMapperEx.selectByIdForUpdate(tenantId, sourceFiscalYearId)` acquires an exclusive row-level lock immediately upon entering `executeOpeningBalanceRollover`.
2. **Target FY Pessimistic Lock**: `financialYearMapperEx.selectByIdForUpdate(tenantId, targetFy.getId())` serializes target year operations.
3. **Transaction Isolation**: Service method is annotated with `isolation = Isolation.READ_COMMITTED` to guarantee that subsequent serialized transactions observe committed target FY rows and opening journal counts without stale MVCC snapshots.
4. **DuplicateKey Protection**: Any concurrent race caught at the database level returns the already-inserted journal summary.
5. Verified in Test 10: 4 concurrent worker threads executing rollover simultaneously result in 0 unhandled exceptions, 1 logical opening journal, and exact row counts.

---

## 11. Transaction Boundaries

- Boundary is placed at `FinancialYearRolloverService.executeOpeningBalanceRollover`.
- `@Transactional(value = "transactionManager", isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)`.
- Controller `YearEndClosingController.rolloverOpeningBalances` is non-transactional, ensuring sanitization of business responses and no nested transaction leaks.
- Single atomic unit: Target period validation + permanent balance extraction + double entry verification + batch insertion + document audit log.

---

## 12. Files Changed

### New Files Created:
1. `ERPSystem-boot/src/main/java/com/jsh/erp/datasource/dto/YearEndRolloverResultDto.java`
   - DTO representing the execution result of the opening balance rollover.
2. `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearRolloverService.java`
   - Core domain service implementing Track A.1 synthetic opening balance rollover.
3. `ERPSystem-boot/src/test/java/com/jsh/erp/service/FinancialYearRolloverIntegrationTest.java`
   - 15 authoritative integration test scenarios verifying the full Track A.1 test matrix.

### Modified Files:
1. `ERPSystem-boot/src/main/java/com/jsh/erp/controller/YearEndClosingController.java`
   - Injected `FinancialYearRolloverService`.
   - Exposed `POST /yearEndClosing/rollover` administrative REST endpoint.
2. `ERPSystem-boot/src/test/java/com/jsh/erp/controller/YearEndClosingControllerTest.java`
   - Added `test10_rolloverOpeningBalancesEndpoint` verifying controller-level rollover execution.

---

## 13. Focused Test Results

Test suite: `FinancialYearRolloverIntegrationTest`  
Results: **15 / 15 PASS** (100%)

| Test Case | Scenario | Status |
| :--- | :--- | :--- |
| `test01_basicRollover` | Finalize source FY, execute rollover, verify opening entries generated | **PASS** |
| `test02_permanentBalanceSheetBalancesCarriedForward` | Assets, Liabilities, and Equity carry forward exact balances | **PASS** |
| `test03_nominalAccountsExcluded` | Nominal accounts (Revenue 3xxx, Expense 4xxx) excluded from opening balances | **PASS** |
| `test04_retainedEarningsCarriedForward` | Finalized Retained Earnings (2120) becomes opening equity credit | **PASS** |
| `test05_openingFlagPresentOnAllEntries` | Every generated entry has `is_opening = '1'` | **PASS** |
| `test06_correctFiscalYearAndDate` | Entries belong to target FY and have `posting_date = targetFy.startDate` | **PASS** |
| `test07_sourceFiscalYearImmutable` | Source finalized FY and its closing entries are completely unchanged | **PASS** |
| `test08_tenantIsolation` | Zero cross-tenant opening entries or operations | **PASS** |
| `test09_idempotencySecondRunSafe` | Running rollover twice creates no duplicate opening journal | **PASS** |
| `test10_concurrencySafety` | Concurrent rollover attempts serialize without duplicate rows | **PASS** |
| `test11_balancedJournalDebitEqualsCredit` | Total opening debits equal total opening credits | **PASS** |
| `test12_accountingEquationPreserved` | Assets = Liabilities + Equity in target FY after opening entries | **PASS** |
| `test13_zeroBalanceAccountsOmitted` | Zero-balance accounts omitted; zero ledger completes safely | **PASS** |
| `test14_noSourceYearMutation` | Source GL rows and financial year state remain untouched | **PASS** |
| `test15_nonFinalizedSourceFyRejected` | Negative test: rollover rejected if source FY is not in FINALIZED status | **PASS** |

Controller test: `YearEndClosingControllerTest`  
Results: **8 / 8 PASS** (including `test10_rolloverOpeningBalancesEndpoint`)

---

## 14. Full Financial Regression Results

Maven Command:
```bash
mvn test "-Dtest=FinancialYearRolloverIntegrationTest,YearEndClosingControllerTest,YearEndClosingIntegrationTest,GovernedYearEndClosingGlChannelTest,ProfitLossReportingVoucherExclusionTest,FinancialYearFinalizationFoundationTest,PeriodLockingIntegrationTest,SubledgerReconciliationServiceTest,FixedAssetEndToEndIntegrationTest,FixedAssetDomainFoundationTest,AssetDepreciationCalculationTest,AssetDepreciationRunBatchTest,AssetDisposalLifecycleTest,AssetConcurrencySafetyTest,JournalVoucherAndContraIntegrationTest,FinancialStatementIntegrationTest,GlEntryServiceTest,SalesGstAccountingIntegrationTest,PurchaseAccountingPostingServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest,FinancialPeriodServiceTest,TdsDeductionAndWithholdingTest,GstSalesInvoiceEnterpriseTest,FinancialYearRolloverTest"
```

Execution Summary:
```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
...
[INFO] Results:
[INFO] 
[INFO] Tests run: 391, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  03:08 min
[INFO] Finished at: 2026-09-11T17:27:09+05:30
[INFO] ------------------------------------------------------------------------
```

- Tests Run: **391**
- Failures: **0**
- Errors: **0**
- Skipped: **0**
- Status: **BUILD SUCCESS**

---

## 15. Accounting Reconciliation Evidence

From `test02_permanentBalanceSheetBalancesCarriedForward`, `test11_balancedJournalDebitEqualsCredit`, and `test12_accountingEquationPreserved`:

### Source FY 2025–26 Finalized Balances:
- Bank (`1232`): Dr 400,000.00
- Cash in Hand (`1231`): Dr 300,000.00
- Plant & Machinery (`1110`): Dr 500,000.00
- Accumulated Depreciation (`1119`): Cr 50,000.00
- Share Capital (`2110`): Cr 1,000,000.00
- Net Profit (Sales 300,000 - Depr 50,000 - Salary 100,000) closed to Retained Earnings (`2120`): Cr 150,000.00

### Target FY 2026–27 Synthetic Opening Journal:
- Voucher Type: `OPENING`
- Voucher No: `OPN-2026-27`
- Posting Date: `2026-04-01`
- `is_opening`: `'1'`

| Account Code | Account Name | Root Type | Account Type | Debit (INR) | Credit (INR) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `1110` | Plant & Machinery | `ASSET` | `ASSET` | 500,000.00 | 0.00 |
| `1119` | Accumulated Depreciation | `ASSET` | `ACCUMULATED_DEPRECIATION` | 0.00 | 50,000.00 |
| `1231` | Cash in Hand | `ASSET` | `CASH` | 300,000.00 | 0.00 |
| `1232` | Bank Current Account | `ASSET` | `BANK` | 400,000.00 | 0.00 |
| `2110` | Share Capital | `LIABILITY` | `EQUITY` | 0.00 | 1,000,000.00 |
| `2120` | Reserves & Surplus | `LIABILITY` | `EQUITY` | 0.00 | 150,000.00 |
| **Total** | | | | **1,200,000.00** | **1,200,000.00** |

### Accounting Proofs:
1. $\sum \text{Opening Debits} == \sum \text{Opening Credits} == 1,200,000.00$ (Difference: $0.00$)
2. $\text{Total Assets} = 500,000 + 300,000 + 400,000 - 50,000 = 1,150,000.00$
3. $\text{Total Liabilities \& Equity} = 1,000,000 + 150,000 = 1,150,000.00$
4. $\text{Assets} == \text{Liabilities} + \text{Equity}$ holds with zero variance.

---

## 16. Scope Limitations

1. **General Ledger Boundary**: Track A.1 is strictly scoped to the General Ledger opening balance rollover.
2. **Backend API Scope**: As authorized, Track A.1 implements the backend service, locking, validation, and administrative REST endpoint (`POST /yearEndClosing/rollover`). Frontend UI integration is intentionally deferred until backend independent safety review is passed.
3. **No Prior-Year Mutation**: The source finalized fiscal year is strictly read-only. No reactivation, no back-dating, and no journal mutations occur.

---

## 17. Deferred Items

1. **Subledger Itemized Rollover**:
   - Subledger-specific granular carryovers (such as individual invoice-level open item aging tracking, fixed asset individual asset card year-end carry forward, and batch inventory shelf-life rollover) are managed within their respective subledger modules and are deferred beyond Track A.1.
2. **Frontend Cockpit Rollover Button**:
   - Integrating a "Rollover to Next Year" trigger button in the React Cockpit UI is deferred to the UI integration slice after Track A.1 independent safety certification.
3. **Subsequent Tracks**:
   - Track A.2 (Prior-Period Adjustments) is NOT started.
   - Track A.3 is NOT started.
   - Phase 5 / 8 / 9 are NOT started.

---

## 18. Final Verdict

```text
TRACK A.1 PASS — READY FOR INDEPENDENT SAFETY REVIEW
```

Every requirement of Track A.1 has been implemented, validated, and proven with mathematical and empirical precision. The system is stopped and ready for independent adversarial safety review.
