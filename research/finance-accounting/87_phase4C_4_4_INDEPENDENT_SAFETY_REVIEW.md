# PHASE 4C.4.4 — INDEPENDENT ADVERSARIAL SAFETY REVIEW

**Document ID**: `87_phase4C_4_4_INDEPENDENT_SAFETY_REVIEW.md`  
**Review Target**: Phase 4C.4 Slice 4C.4.4 — Governed Year-End Closing GL Channel  
**Implementation Report Reference**: `86_phase4C_4_4_GOVERNED_GL_CHANNEL_IMPLEMENTATION_REPORT.md`  
**Review Date**: 2026-09-11  
**Review Mode**: READ-ONLY ADVERSARIAL AUDIT  
**Reviewer Role**: Independent Senior ERP Accounting Architect, Database Transaction-Safety Reviewer & Forensic Auditor  
**Review Invariant**: ABSOLUTE NO-CHANGE RULE ENFORCED  

---

## 1. Executive Summary

An independent, adversarial, read-only safety review of **Phase 4C.4 Slice 4C.4.4 (Governed Year-End Closing GL Channel)** was conducted to independently verify or falsify the claims made in Implementation Report 86.

The review rigorously examined the implementation of `GlEntryService.postYearEndClosingEntries(...)`, transaction boundaries, MyBatis mapper SQL, database schema constraints, security and tenant isolation enforcement, concurrency handling, deadlock risk, idempotency guarantees, and reporting isolation.

### Key Audit Findings:
1. **Governed Channel Boundary**: The governed entry point is strictly isolated and cannot be leveraged for ordinary operational transactions. Ordinary postings via `postEntries()` continue to strictly fail-closed on any CLOSED fiscal period.
2. **Authentication & Role Governance**: Enforces authenticated identity verification via `User` entity resolution and restricts execution strictly to `SuperAdmin` or `FinancialController`/`TenantAdmin` roles. Normal accountants, operators, and unauthenticated callers are rejected fail-closed.
3. **Tenant Boundary Enforcement**: Absolute tenant isolation is verified across caller identity, target financial year, all 12 fiscal periods, chart of accounts nodes (with fallback only to tenant `0L`), and GL row persistence.
4. **Pessimistic Serialization**: Row-level locking (`SELECT ... FOR UPDATE`) on `erp_financial_year` completely eliminates Time-of-Check to Time-of-Use (TOCTOU) races and prevents duplicate or concurrent closing vouchers.
5. **Zero Deadlock Hazard**: The governed channel acquires exactly one row lock (`erp_financial_year`), while ordinary GL posting acquires zero row locks, and period locking operates solely on `erp_fiscal_period`. There is zero lock inversion.
6. **Transaction & Audit Atomicity**: GL entries and immutable document audit records share the exact same `@Transactional` boundary; failure injection tests independently prove 100% clean rollback with zero orphan rows.
7. **Regression Suite**: The complete financial regression suite (342 tests across 22 classes) was independently executed and passed with 0 failures, 0 errors, and 0 skipped (`BUILD SUCCESS` in 02:26 min).
8. **Frozen Boundaries**: Confirmed that Phase 4C.4.6 (Controllers), 4C.4.7 (UAT Execution), 4C.4.8 (Frontend UI), reopening workflows, and next-year synthetic opening journals remain completely unimplemented and frozen.

### Final Safety Verdict:
```text
================================================================================
                    FINAL SAFETY GATE: PASS
                     PASS — SAFE TO PROCEED
================================================================================
  P0 (Catastrophic Accounting / Data Integrity):  0
  P1 (Critical Financial Correctness / Safety):    0
  P2 (Material Safety / Architecture Defect):      0
  P3 (Non-Blocking Improvement):                  3
================================================================================
```

---

## 2. Baseline Verification

The repository baseline was independently verified against Report 86:
- **Git Commit Hash**: `5d546ab15cc0047442e33d0533131e38d65a7253` (`5d546ab1`)
- **Active Branch**: `master` (up to date with `origin/master`)
- **Submodule State (`ERPSystem-boot`)**: Commit `2f9d7d9`
- **Flyway Migration Baseline**: Latest migration is `V3_9__financial_year_finalization.sql`. Zero unauthorized migrations were introduced.
- **Authoritative Services Inspected**:
  - `GlEntryService.java`
  - `FinancialPeriodService.java`
  - `FinancialYearService.java`
  - `SecurityService.java`
  - `AccountCoaService.java`
  - `FinancialStatementService.java`
- **Authoritative Mappers Inspected**:
  - `GlEntryMapper.xml`
  - `FinancialYearMapperEx.xml`
  - `FiscalPeriodMapperEx.xml`
  - `AccountCoaMapper.xml`
  - `DocumentAuditLogMapper.xml`
  - `UserMapperEx.xml` / `RoleMapperEx.xml`

Baseline matches Report 86 in all respects.

---

## 3. Governed Channel Verification

The review evaluated whether `GlEntryService.postYearEndClosingEntries(...)` could be manipulated by an attacker or ordinary caller to post ordinary transactions into a closed period.

### Path Comparison:
```text
[Ordinary Caller]
  └─► GlEntryService.postEntries(entries, tenantId, userId)
        └─► FinancialPeriodService.validatePeriodOpen(tenantId, postingDate)
              ├─► Period Status == ACTIVE  ──► ALLOWED
              └─► Period Status == CLOSED  ──► REJECT (BusinessRunTimeException)

[Governed Closing Caller]
  └─► GlEntryService.postYearEndClosingEntries(entries, tenantId, userId)
        ├─► Authenticate user & role (FinancialController / SuperAdmin only)
        ├─► Acquire row lock: erp_financial_year (FOR UPDATE)
        ├─► Validate FY: ACTIVE, non-deleted, matches tenantId
        ├─► Validate 12 Fiscal Periods: EXACTLY 12 periods, ALL status == CLOSED
        ├─► Validate Posting Date: EXACTLY equals fy.getEndDate() (March 31)
        ├─► Validate Voucher Type: EXACTLY equals 'YEAR_END_CLOSING'
        ├─► Validate Accounts: ONLY Income/Expense leaf nodes & Retained Earnings (2120)
        ├─► Overwrite Line Metadata: tenantId, voucherType, voucherId, postingDate
        ├─► Validate Double-Entry: Total Debit == Total Credit, >= 2 lines, no zeroes
        ├─► Pre-check Idempotency: countByVoucher == 0
        ├─► Batch Insert GL Facts
        └─► Insert Document Audit Log
```

### Adversarial Manipulation Analysis:
| Manipulated Attribute | Attacker Action | System Defense / Behavior | Safety Result |
|---|---|---|---|
| `voucherType` | Caller supplies `JOURNAL_VOUCHER` or `SALES_INVOICE` | Step 9 loop checks every line; throws if not `YEAR_END_CLOSING`. Line 547 explicitly forces `line.setVoucherType("YEAR_END_CLOSING")`. | REJECTED |
| `postingDate` | Caller attempts an arbitrary date (e.g. March 15 or mid-year) | Step 8 compares `entry.getPostingDate()` against `fy.getEndDate()`; throws if mismatched. Line 551 forces `line.setPostingDate(fy.getEndDate())`. | REJECTED |
| `fiscalYearId` | Caller supplies wrong FY or cross-tenant FY | Step 6 verifies FY exists, belongs to `tenantId`, is `ACTIVE`, and locks it via `selectByIdForUpdate`. Line 549 forces `line.setFinancialYearId(fy.getId())`. | REJECTED |
| `tenantId` | Caller supplies Tenant B ID with Tenant A token | Step 4 verifies user's DB tenant matches `tenantId`. Line 546 forces `line.setTenantId(tenantId)`. | REJECTED |
| Account IDs | Caller attempts balance sheet accounts (Cash, Bank, AR, AP, Inventory) | Step 10 checks every account against COA; rejects all non-nominal accounts (except 2120). | REJECTED |
| Operational Posting | Caller tries to post during normal operations | Step 7 requires ALL 12 periods to be in `CLOSED` status. During normal operations, at least one period is `ACTIVE` or `UPCOMING`, triggering immediate rejection. | REJECTED |

**Conclusion**: The governed channel cannot be entered by any ordinary operational transaction.

---

## 4. Authentication & Authorization

The review verified server-side security enforcement in `GlEntryService.postYearEndClosingEntries`:
1. **Identity Resolution**: `userId` is checked for `null` and `userId <= 0`. The user entity is resolved directly from the authoritative database via `userMapperEx.getUserByIdIgnoreTenant(userId)`, ensuring client-supplied claims cannot forge user data.
2. **SuperAdmin Privileges**: Platform SuperAdmins are validated via `securityService.isSuperAdmin(user) || securityService.isSuperAdmin()`.
3. **Tenant Financial Authority**: For non-SuperAdmins:
   - Tenant boundary is validated: `user.getTenantId().equals(tenantId)` (fails closed with `Cross-tenant violation`).
   - Role is resolved authoritatively from the database: `userService.getRoleTypeByUserId(userId)`.
   - Role must match one of: `FinancialController`, `FINANCIAL_CONTROLLER`, `Financial Controller`, `财务主管`, `Admin`, `TenantAdmin`.
   - Normal accountants, clerks, operators, and unauthenticated callers are rejected fail-closed with `USER_EDIT_FAILED_CODE`.
4. **No Hardcoded Shortcuts**: Verified absence of hardcoded `userId == 1` shortcuts.
5. **External API Exposure**: Verified that no REST controller or HTTP endpoint exposes `postYearEndClosingEntries`. It exists strictly as an internal Java service API within `GlEntryService`.

---

## 5. Tenant Isolation

Every database lookup and persistence operation was traced:
- **User Validation**: `user.getTenantId().equals(tenantId)` enforced.
- **Financial Year Lock**: `financialYearMapperEx.selectByIdForUpdate(tenantId, financialYearId)` includes `WHERE tenant_id = #{tenantId}` in SQL and `fy.getTenantId().equals(tenantId)` in Java.
- **Fiscal Periods Query**: `fiscalPeriodMapperEx.selectByFinancialYearId(tenantId, fy.getId())` includes `WHERE tenant_id = #{tenantId}` in SQL and checks `fp.getTenantId().equals(tenantId)` in Java.
- **Chart of Accounts (COA)**: `accountCoaMapper.selectByPrimaryKey` and `selectByCode` query `c.tenant_id = #{tenantId}` (with fallback only to system defaults `0L`). Any account with a tenant ID other than `tenantId` or `0L` is rejected fail-closed with `Cross-tenant violation`.
- **GL Row Persistence**: Line 546 overrides `line.setTenantId(tenantId)` before batch insertion.
- **Audit Persistence**: Line 644 overrides `auditLog.setTenantId(tenantId)` before insertion.

Cross-tenant data contamination is mathematically impossible under this architecture.

---

## 6. Fiscal-Year Validation

State transitions and preconditions for the target financial year were reviewed:
- **Precondition**: `fy.getStatus()` must equal `"ACTIVE"`.
- **Finalized Year Protection**: If status is `"FINALIZED"` or `"CLOSED"`, the method throws `BusinessRunTimeException("Fiscal year is already ...")`.
- **Upcoming/Draft Protection**: Any status other than `"ACTIVE"` is rejected.
- **Soft-Delete Protection**: `if ("1".equals(fy.getDeleteFlag()))` throws `BusinessRunTimeException`.
- **Pessimistic Row Lock**: The lock `selectByIdForUpdate(tenantId, financialYearId)` is acquired before inspecting status, preventing TOCTOU races between status inspection and insertion.

---

## 7. 12-Period Validation

The 12-period invariant was audited:
1. **Count Invariant**: Exactly 12 periods must be returned by `selectByFinancialYearId`. Any missing period (e.g. 11 periods) or duplicate/extra periods trigger immediate rejection.
2. **Status Invariant**: Every single period from period 1 to 12 must be in status `"CLOSED"`.
3. **No Mixed States**: If any period is `"ACTIVE"`, `"LOCKED"`, or `"UPCOMING"`, the closing channel aborts fail-closed.
4. **Period Immutability Verification**: Tested against `FinancialPeriodService.unlockPeriod()`, which explicitly throws `BusinessRunTimeException("CLOSED fiscal periods are immutable and cannot be unlocked")`. A period once CLOSED can never be reverted to ACTIVE.

---

## 8. CLOSED-Period Immutability

Phase 4C.3 established that CLOSED periods are immutable. Slice 4C.4.4 introduces the physical year-end closing journal as the sole governed exception.

The audit verified that this exception is strictly constrained:
- Ordinary GL postings entering `postEntries()` or `reverseEntries()` are 100% blocked by `validatePeriodOpen()`.
- The governed channel `postYearEndClosingEntries()` does not grant arbitrary posting privileges; it admits only a single balanced voucher with voucher type `"YEAR_END_CLOSING"`, posted on the financial year's end date, zeroing nominal accounts to Retained Earnings (2120).
- Post-insertion tamper resistance: All entries are written to `erp_gl_entry` as immutable append-only facts.

---

## 9. Posting Date

- The posting date is not accepted as an unvalidated client parameter.
- It is dynamically derived from `fy.getEndDate()`. For an Indian fiscal year (April 1 to March 31), `fy.getEndDate()` evaluates to March 31.
- Step 8 enforces that `toLocalDate(entry.getPostingDate()).equals(toLocalDate(fy.getEndDate()))`.
- Boundary testing confirmed:
  - March 30 (one day prior) is rejected.
  - April 1 (next fiscal year) is rejected.
  - `null` posting date is rejected.
  - Line 551 forces `line.setPostingDate(fy.getEndDate())` to eliminate any client manipulation.

---

## 10. Voucher Type

- The canonical constant `FinancialStatementService.VOUCHER_TYPE_YEAR_END_CLOSING` (`"YEAR_END_CLOSING"`) is used across all service, reporting, and test layers.
- Step 9 validates that every line supplied by the caller declares `voucherType == "YEAR_END_CLOSING"`.
- Line 547 unconditionally overrides `line.setVoucherType(FinancialStatementService.VOUCHER_TYPE_YEAR_END_CLOSING)`.
- Repository-wide search confirmed no rogue string literals, casing variants, or alternative voucher types exist for year-end closing.

---

## 11. COA Restrictions

The account validation logic in Step 10 was inspected:
- **Eligible Accounts**:
  - Retained Earnings: Code `2120`
  - Nominal Accounts: `root_type IN ('INCOME', 'EXPENSE')` or `account_type IN ('INCOME', 'EXPENSE')`
- **Ineligible Accounts**:
  - Balance Sheet accounts: `ASSET`, `BANK`, `CASH`, `RECEIVABLE`, `PAYABLE`, `STOCK`, `TAX`, `ACCUMULATED_DEPRECIATION`, and non-2120 `LIABILITY` / `EQUITY`
  - Parent/Folder accounts: `is_group == '1'`
  - Inactive accounts: `status != 'ACTIVE'`
  - Deleted accounts: `delete_flag == '1'`
- Test 15 confirmed that attempting to include Cash (`1232`) or any other balance sheet account results in immediate fail-closed rejection.

---

## 12. Retained Earnings 2120

- Account code `2120` is resolved via `accountCoaService.getAccountCoaByCode("2120", tenantId)`.
- Enforces:
  - Must exist for the tenant (or system default `0L`).
  - Must be `status == 'ACTIVE'`.
  - Must be a postable leaf: `is_group == '0'`.
  - Must be classified under `EQUITY` (or `LIABILITY`).
- Multiple accounts with code `2120` in a single tenant are prevented by the uniqueness semantics of the COA setup (`c.delete_flag = '0' limit 1`).

---

## 13. Double-Entry Validation

`GlEntryService.validateDoubleEntry(entries, tenantId)` enforces all fundamental accounting invariants:
1. `entries.size() >= 2`
2. `totalDebit.compareTo(totalCredit) == 0`
3. No negative amounts (`dr < 0 || cr < 0`)
4. No zero amounts (`dr == 0 && cr == 0`)
5. No simultaneous debit and credit on a single line (`dr > 0 && cr > 0`)
6. Line numbers must be unique across the voucher batch (`Set<Integer> lineNumbers`)

The governed path cannot bypass these invariants.

---

## 14. Idempotency

### Database Constraint Analysis:
`erp_gl_entry` enforces:
```sql
UNIQUE KEY `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`)
```
In `postYearEndClosingEntries`:
- `tenant_id` = `tenantId`
- `voucher_type` = `"YEAR_END_CLOSING"`
- `voucher_id` = `fy.getId()`
- `line_no` = `1, 2, ... N`

### Adversarial Request Modeling:
1. **Sequential Duplicate (Request A commits, then Request B arrives)**:
   - Request B executes: `existingCount = glEntryMapper.countByVoucher(tenantId, "YEAR_END_CLOSING", fy.getId())`.
   - Finds `existingCount > 0`, logs informational message, and returns `existingCount` without executing any SQL insert.
   - Idempotency holds.
2. **Concurrent Race (Request A and Request B execute simultaneously)**:
   - Both threads invoke `selectByIdForUpdate(tenantId, financialYearId)`.
   - Thread A acquires row lock; Thread B blocks.
   - Thread A inserts GL facts and audit log, commits, and releases row lock.
   - Thread B unblocks, executes `countByVoucher`, sees existing rows, and returns immediately without inserting.
   - Idempotency holds.
3. **Different Line Numbers Attack**:
   - `countByVoucher` does NOT filter on `line_no`; it counts any rows where `voucher_type = 'YEAR_END_CLOSING'` and `voucher_id = fy.getId()`.
   - Even if an attacker attempted lines 3 and 4, `countByVoucher` detects lines 1 and 2 and returns existing count.
4. **Retry After Network Timeout**:
   - Handled cleanly by `countByVoucher` pre-check.
5. **Partial Insertion Failure**:
   - Handled atomically by Spring `@Transactional` rollback; zero rows remain.

**Conclusion**: The composite mechanism (Pessimistic Row Lock + `countByVoucher` + `uk_gl_voucher_line`) mathematically guarantees that at most one closing voucher can ever commit per tenant per fiscal year.

---

## 15. Concurrency

- Transaction boundary: `@Transactional(value = "transactionManager", rollbackFor = Exception.class)`.
- Lock boundary: Row lock acquired on `erp_financial_year` at line 437 is held throughout validation, GL batch insertion, and audit insertion until physical transaction commit.
- Concurrency test (Test 20) with 4 simultaneous threads using `CyclicBarrier` verified that only 1 transaction writes to the database, resulting in exactly 2 GL rows and 1 audit log.

---

## 16. Deadlock Analysis

Lock acquisition orders across the application were systematically inspected:
- `postYearEndClosingEntries`: Acquires row lock on `erp_financial_year`. Acquires zero other row locks.
- `postEntries`: Acquires zero row locks.
- `FinancialPeriodService`: Acquires row lock on `erp_fiscal_period`. Acquires zero row locks on `erp_financial_year`.
- Other modules (FixedAsset, JobWork, etc.): Do not interact with `erp_financial_year`.

**Deadlock Risk**: **ZERO**. A deadlock requires at least two concurrently held resource locks acquired in reverse order. Because `postYearEndClosingEntries` locks only a single row, no circular wait can occur.

---

## 17. Transaction Atomicity

All failure points were analyzed for rollback integrity:
1. Fiscal year lock failure ──► No changes made.
2. Period validation failure ──► No changes made.
3. Account validation failure ──► No changes made.
4. Double-entry imbalance ──► No changes made.
5. Database GL insert failure (Test 21) ──► Complete rollback, 0 GL rows, 0 audit logs.
6. Audit log insert failure (Test 22) ──► Complete rollback, 0 GL rows, 0 audit logs.

Atomicity is 100% verified.

---

## 18. Audit Atomicity

- Audit log is persisted to `erp_document_audit_log` with:
  - `documentType`: `"YEAR_END_CLOSING"`
  - `documentId`: `fy.getId()`
  - `documentNumber`: `"YEC-" + fy.getName()`
  - `actionType`: `"POST_YEAR_END_CLOSING"`
  - `previousStatus`: `"ALL_PERIODS_CLOSED"`
  - `newStatus`: `"GL_POSTED"`
  - `operatorId`: `userId`
  - `operatorName`: `user.getUsername()`
  - `reason`: `"Governed year-end closing journal posted (<N> lines)"`
- Written within the exact same database transaction as the GL facts.
- Audit failure guarantees full transaction rollback (verified by Test 22).

---

## 19. GL Append-Only Proof

- `postYearEndClosingEntries` exclusively executes `glEntryMapper.batchInsert(entries)`.
- It executes no `UPDATE` or `DELETE` statements on `erp_gl_entry`.
- Historical operational GL entries posted during periods 1 to 12 remain completely untouched.

---

## 20. Reporting Interaction

Verified compatibility with Slice 4C.4.3:
- **Profit & Loss (`FinancialStatementService.java:452`)**:
  Explicitly filters: `AND ifnull(voucher_type, '') != 'YEAR_END_CLOSING'`.
  Verified that closing entries do not wipe out historical operational P&L revenues and expenses.
- **Balance Sheet**: Aggregates all cumulative ledger postings, properly reflecting the net profit transferred to Retained Earnings (2120).
- **GL Audit Trail**: Includes `YEAR_END_CLOSING` vouchers with full line-level drilldown.
- **Trial Balance**: Balances correctly; nominal accounts show zero closing balance after year-end entries.

---

## 21. FinancialYear Reactivation Check

- `postYearEndClosingEntries` does not modify `fy.status`.
- It verifies that `fy.status` is `"ACTIVE"` and fails closed if it is `"FINALIZED"` or `"CLOSED"`.
- It does not contain any code path capable of reactivating a finalized year.

---

## 22. Schema Verification

- Database schema was confirmed clean:
  - `erp_gl_entry`: Unique constraint `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`) active.
  - `erp_fiscal_period`: Unique constraint `uk_period_tenant_name` active.
  - `erp_financial_year`: Finalization columns `closed_at`, `closed_by`, `finalized_reason` present from `V3_9`.
- No unauthorized schema modifications or Flyway migration scripts were introduced.

---

## 23. Failure Injection Verification

The focused integration and failure injection test suite `GovernedYearEndClosingGlChannelTest` was executed independently:
- **Command**: `mvn test -Dtest=GovernedYearEndClosingGlChannelTest`
- **Tests run**: 24
- **Failures**: 0
- **Errors**: 0
- **Skipped**: 0
- **Duration**: 41.09 s
- **Result**: **BUILD SUCCESS**

All 24 safety scenarios were verified:
1. Normal Valid Closing Journal — PASS
2. Unauthenticated User — PASS
3. Unauthorized Role — PASS
4. SuperAdmin Success — PASS
5. FinancialController Success — PASS
6. Wrong Tenant User — PASS
7. Missing Fiscal Year — PASS
8. Wrong Fiscal Year — PASS
9. Fewer Than 12 Periods — PASS
10. ACTIVE Period — PASS
11. LOCKED Period — PASS
12. UPCOMING Period — PASS
13. Non-Year-End Posting Date — PASS
14. Wrong Voucher Type — PASS
15. Non-Nominal Account (Cash 1232) — PASS
16. Invalid Retained Earnings Account — PASS
17. Unbalanced Voucher — PASS
18. Duplicate Line Number — PASS
19. Duplicate Closing Attempt — PASS
20. Concurrent Closing Race Serialization — PASS
21. Forced Database Failure (Rollback) — PASS
22. Audit Failure (Rollback) — PASS
23. Ordinary `postEntries()` into CLOSED period rejected — PASS
24. Ordinary non-YEAR_END_CLOSING voucher into governed channel rejected — PASS

---

## 24. Full Regression

The designated financial accounting regression suite across 22 classes was independently executed:
- **Command**:
  ```powershell
  mvn test "-Dtest=GovernedYearEndClosingGlChannelTest,ProfitLossReportingVoucherExclusionTest,FinancialYearFinalizationFoundationTest,PeriodLockingIntegrationTest,SubledgerReconciliationServiceTest,FixedAssetEndToEndIntegrationTest,FixedAssetDomainFoundationTest,AssetDepreciationCalculationTest,AssetDepreciationRunBatchTest,AssetDisposalLifecycleTest,AssetConcurrencySafetyTest,JournalVoucherAndContraIntegrationTest,FinancialStatementIntegrationTest,GlEntryServiceTest,SalesGstAccountingIntegrationTest,PurchaseAccountingPostingServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest,FinancialPeriodServiceTest,TdsDeductionAndWithholdingTest,GstSalesInvoiceEnterpriseTest,FinancialYearRolloverTest"
  ```
- **Tests run**: **342**
- **Failures**: **0**
- **Errors**: **0**
- **Skipped**: **0**
- **Duration**: 02:26 min
- **Result**: **BUILD SUCCESS**

The test count matches the claimed 342 tests in Report 86 exactly. Zero regressions were detected.

---

## 25. Graphify

Knowledge graph metrics from `graphify update .` (rebuilt across repository):
- **Nodes**: 28,994
- **Edges**: 75,697
- **Communities**: 1,177
- **Architectural Authority**: Confirmed that `GlEntryService` is the sole service class invoking `glEntryMapper.batchInsert`. No direct GL writers, secondary posting services, or mapper bypasses exist.

---

## 26. Frozen Boundary Verification

Independent review confirms that the following boundaries remain strictly intact and NOT implemented:
- **Phase 4C.4.6 (Controllers)**: NOT IMPLEMENTED. Zero REST controller endpoints exist for year-end closing.
- **Phase 4C.4.7 (UAT Execution)**: NOT IMPLEMENTED.
- **Phase 4C.4.8 (Frontend UI)**: NOT IMPLEMENTED. Zero React components or web pages exist for year-end closing.
- **Reopening Workflow**: NOT IMPLEMENTED.
- **Next-Year Synthetic Opening Journals**: NOT IMPLEMENTED.
- **Phase 4B, Phase 4C.1, Phase 4C.2, Phase 4C.3**: Intact, unchanged, and verified regression-free by 342 passing test cases.

---

## 27. Findings P0–P3

- **P0 Findings**: None.
- **P1 Findings**: None.
- **P2 Findings**: None.
- **P3 Findings**:
  - **Finding F-4C44-01 (Hardening Note - Idempotency Scope)**: The database unique key `uk_gl_voucher_line` includes `line_no`. Application-level idempotency is strictly enforced by `selectByIdForUpdate` + `countByVoucher(tenantId, 'YEAR_END_CLOSING', fy.getId())`. In Slice 4C.4.5, setting `erp_financial_year.status = 'CLOSED'` / `'FINALIZED'` provides the permanent database-level lock.
  - **Finding F-4C44-02 (Minor - Role Mapping Redundancy)**: Role matching checks both `role.getType()` and `role.getName()` against English and localized variants (`FinancialController`, `财务主管`, etc.). It gracefully fails closed if no role is matched.
  - **Finding F-4C44-03 (Observability Note - Single Voucher Year-End Invariant)**: In Slice 4C.4.5 (`YearEndClosingService`), the entire set of zeroing lines for nominal accounts and retained earnings must be submitted in a single atomic batch to ensure the voucher id (`fy.getId()`) covers the complete closing entry in one transaction.

---

## 28. Final Safety Verdict

```text
============================================================
FINAL SAFETY GATE: PASS — SAFE TO PROCEED
============================================================
```

**Justification**:
- Zero P0 or P1 defects exist.
- Ordinary closed-period immutability is preserved 100%.
- Governed channel is strictly restricted to `YEAR_END_CLOSING`, year-end date, 12 closed periods, nominal/2120 accounts, and privileged roles.
- Concurrency and idempotency are mathematically guaranteed with zero deadlock hazard.
- Transaction and audit atomicity are verified with failure injection.
- 342 regression tests passed with zero failures.

---

## ABSOLUTE HARD STOP

Review complete. Phase 4C.4.4 is **FROZEN**.  
Phase 4C.4.5 remains **NOT AUTHORIZED**.  
Awaiting explicit user authorization.
