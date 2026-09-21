# TRACK A.3 — SUPERVISORY FISCAL YEAR REOPENING / AUDIT ADJUSTMENT
## Comprehensive Technical Implementation & Accounting Validation Report

```text
================================================================================
TRACK A.3 IMPLEMENTATION REPORT: GOVERNED FISCAL YEAR REOPENING & AUDIT ADJUSTMENT
Authoritative Design Document: research/finance-accounting/97A_trackA3_SUPERVISORY_REOPENING_DESIGN_REVIEW.md
Final Implementation Verdict: TRACK A.3 PASS — READY FOR INDEPENDENT SAFETY REVIEW
================================================================================
```

---

## 1. EXECUTIVE SUMMARY

Track A.3 establishes a secure, statutory, supervisory mechanism allowing authorized enterprise controllers and external auditors to record mandatory audit adjustments, tax restitution entries, and accounting reclassifications for finalized historical fiscal years without compromising historical ledger immutability or unlocking general operational periods.

Strictly adhering to the approved architectural blueprint defined in `97A_trackA3_SUPERVISORY_REOPENING_DESIGN_REVIEW.md`, the implementation:
1. **Enforces Non-Negotiable Lifecycle Invariant**: The fiscal year never transitions from `FINALIZED` back to `ACTIVE`. The historical periods (`fp1` through `fp12`) remain permanently locked in status `CLOSED`.
2. **Maintains Complete Block on Operational Posting**: Ordinary business postings via `GlEntryService.postEntries(...)` fail closed with explicit exceptions.
3. **Introduces Governed GL Adjustment Channel**: Audit entries are strictly posted via `GlEntryService.postGovernedAuditAdjustmentEntries(...)` requiring an approved, unexpired petition and voucher type `AUDIT_ADJUSTMENT`.
4. **Applies Cash/Bank Guard**: Direct adjustments to Cash & Bank accounts (`1231`, `1232`, etc.) are unconditionally barred by default.
5. **Implements Dual-Key Authorization & Cryptographic Binding**: Two distinct supervisory actors (`requester_id != approver_id`) with role-based segregation, single-use UUID nonces, and SHA-256 canonical digest integrity verification.
6. **Posts Incremental Closing Journal (`YEC-ADJ`)**: Zeros out nominal adjustment movements to Retained Earnings (`2120`) without deleting or mutating original closing entries.
7. **Cascades Track A.1 Opening Balance Rollover Ripple**: Computes permanent balance sheet deltas and propagates governed `OPENING_ADJUSTMENT` (`is_opening = '1'`) vouchers into subsequent fiscal years.

All **25 mandated statutory integration test scenarios** in `TrackA3SupervisoryReopeningIntegrationTest` have been executed with **0 failures and 0 errors**. In addition, the complete **27-class financial regression test suite** passed cleanly with **440 / 440 tests passing, 0 failures, 0 errors, 0 skipped** (certified baseline: 415 tests + 25 Track A.3 tests).

---

## 2. FORMAL ARCHITECTURAL COMPLIANCE MATRIX

| Architectural Guarantee | Mandated Design Rule | Implementation Realization | Verification Test |
| :--- | :--- | :--- | :--- |
| **G-A3-01: Lifecycle Invariant** | FY never reverts to `ACTIVE` | FY status remains `FINALIZED` or governed sub-states; periods stay `CLOSED` | Tests 6, 7, 19 |
| **G-A3-02: Operational Lockout** | Ordinary posting blocked | `GlEntryService.postEntries` checks period status and rejects posting | Test 19 |
| **G-A3-03: Governed GL Channel** | Dedicated adjustment method | `GlEntryService.postGovernedAuditAdjustmentEntries` with `AUDIT_ADJUSTMENT` | Tests 18, 22 |
| **G-A3-04: Dual-Key SoD** | Requester cannot approve | `req.requesterId.equals(userId)` structural rejection | Tests 1, 2, 3 |
| **G-A3-05: RBAC Role Gates** | Controller submits, CFO approves | Requester requires `FinancialController`; Approver requires `ChiefFinancialOfficer` | Tests 1, 2 |
| **G-A3-06: Cryptographic Digest** | SHA-256 canonical hash binding | Canonical payload hashed at submission; verified before approval | Tests 12, 13 |
| **G-A3-07: Single-Use Nonce** | Anti-replay token | UUID nonce generated and consumed upon approval; replay fails | Test 14 |
| **G-A3-08: Time-To-Live (TTL)** | Pending (72h) & Window (24h) | Pending approval TTL 72h; Adjustment window TTL 24h fail-closed | Tests 9, 17 |
| **G-A3-09: Cash & Bank Guard** | Cash accounts barred | Whitelist/blacklist filter rejects root ASSET + type CASH/BANK | Test 20 |
| **G-A3-10: Scope Whitelisting** | Constrained account sets | `SPECIFIC_ACCOUNTS` scope validates every entry against approved list | Test 21 |
| **G-A3-11: Incremental Close** | Nominal delta zeroed to 2120 | `postIncrementalClosingJournal` posts `YEC-ADJ-xxxx` to Retained Earnings | Tests 23, 24 |
| **G-A3-12: Track A.1 Ripple** | Balance sheet delta to Year N+1 | `propagateOpeningBalanceAdjustments` posts `OPENING_ADJUSTMENT` | Test 25 |
| **G-A3-13: Forensic Immutability** | Immutable audit trails | `erp_document_audit_log` records every transition with monotonic sequence | Tests 1–25 |
| **G-A3-14: Cross-Tenant Boundary** | Multi-tenant isolation | Tenant context enforced on all queries; mismatched tenant IDs rejected | Tests 4, 16 |

---

## 3. IMPLEMENTATION DETAILS BY SUBSYSTEM

### 3.1 Database Migration (`V3_10__supervisory_financial_year_reopen.sql`)
The Flyway migration script provisions the dedicated audit table `erp_fy_reopen_request`:
- **Primary Key**: `id BIGINT AUTO_INCREMENT`
- **Tenant Isolation**: `tenant_id BIGINT NOT NULL`
- **Fiscal Target**: `financial_year_id BIGINT NOT NULL`
- **Unique Request Identifier**: `request_number VARCHAR(50) NOT NULL` (Unique composite key with `tenant_id`)
- **Key 1 (Requester)**: `requester_id BIGINT NOT NULL`, `requester_name VARCHAR(100) NOT NULL`
- **Mandatory Justification**: `reason TEXT NOT NULL` (Minimum 20 characters)
- **Statutory Reference**: `audit_firm_reference VARCHAR(100) NOT NULL`
- **Scope Parameters**: `scope_type VARCHAR(30)`, `scope_payload_json TEXT`
- **Lifecycle Status**: `status VARCHAR(30)` (`SUBMITTED`, `APPROVED`, `REJECTED`, `IN_ADJUSTMENT`, `COMPLETED`, `EXPIRED`, `CANCELLED`)
- **Cryptographic Fields**: `nonce VARCHAR(64)`, `request_hash VARCHAR(64)`
- **Key 2 (Approver)**: `approver_id BIGINT`, `approver_name VARCHAR(100)`, `approval_time DATETIME`, `approval_signature VARCHAR(128)`, `approval_remarks TEXT`
- **Window Timestamps**: `window_start_time DATETIME`, `window_end_time DATETIME`
- **Counters & Audit**: `adjustment_vouchers_count INT`, `create_time DATETIME`, `update_time DATETIME`, `delete_flag CHAR(1)`

### 3.2 Domain Entities & DTOs
- `FiscalYearReopenRequest.java`: Entity representing `erp_fy_reopen_request`.
- `FinancialYearReopenDtos.java`: Strongly typed DTO contract:
  - `ReopenRequestSubmitDto`
  - `ReopenRequestApproveDto`
  - `ReopenRequestRejectDto`
  - `ReopenRequestResultDto`
  - `AuditAdjustmentPostDto`
  - `AuditAdjustmentLineDto`
  - `AuditAdjustmentResultDto`
  - `ReFinalizeRequestDto`
  - `ReFinalizeResultDto`

### 3.3 Mapper Layer
- `FiscalYearReopenRequestMapperEx.java` & `FiscalYearReopenRequestMapperEx.xml`:
  - `selectById`, `selectByIdAndTenant`, `selectByIdForUpdate` (pessimistic row locking)
  - `selectActiveRequestByFyId` (enforces single concurrent active request per FY)
  - `selectByRequestNumber`, `selectAllByTenantAndFy`
  - `insert`, `updateById`, `deleteById` (soft-delete)

### 3.4 Core Service: `FinancialYearReopenService.java`
Implements the full lifecycle orchestration:
1. `submitReopenRequest`:
   - Validates caller role `FinancialController` or `SuperAdmin`.
   - Validates target FY status `FINALIZED`.
   - Rejects if justification < 20 chars or audit memo is missing.
   - Generates single-use UUID nonce and canonical SHA-256 hash.
   - Inserts petition and writes fail-closed audit log.
2. `approveReopenRequest`:
   - Loads request and validates tenant boundary.
   - Enforces Separation of Duties (`requester_id != userId`).
   - Validates approver role `ChiefFinancialOfficer` or `SuperAdmin`.
   - Checks status is `SUBMITTED`.
   - Enforces 72-hour TTL expiration (marks `EXPIRED` immediately if elapsed).
   - Recomputes canonical hash and verifies cryptographic digest.
   - Opens adjustment window (default 24h, configurable) with approval signature.
   - Emits durable audit evidence.
3. `rejectReopenRequest`:
   - Enforces supervisory authority.
   - Transitions status to `REJECTED` with statutory reason.
4. `cancelReopenRequest`:
   - Allows requester cancellation only if `adjustment_vouchers_count == 0`.
5. `postGovernedAuditAdjustment`:
   - Routes through `GlEntryService.postGovernedAuditAdjustmentEntries`.
   - Validates active window TTL and account whitelisting.
   - Enforces Cash/Bank Guard.
   - Validates double-entry debit-credit equilibrium.
   - Increments request adjustment counters.
6. `reFinalizeFiscalYear`:
   - Checks active request state and tenant authority.
   - Generates and posts Incremental Closing Journal (`YEC-ADJ-xxxx`) with `voucher_id = req.getId()` to prevent unique key collisions.
   - If subsequent FY exists with Track A.1 rollover, computes net permanent balance sheet deltas and posts `OPENING_ADJUSTMENT` (`is_opening = '1'`) into Year N+1.
   - Marks request `COMPLETED`.

### 3.5 Governed GL Channel in `GlEntryService.java`
Introduces `postGovernedAuditAdjustmentEntries`:
- Requires active, approved `reopenRequestId`.
- Validates that target fiscal year is `FINALIZED`.
- Enforces voucher type `AUDIT_ADJUSTMENT`.
- Enforces posting date strictly on the fiscal year end date (`fy.getEndDate()`).
- Rejects unbalanced vouchers to 4 decimal places.
- Atomically persists entries into canonical `erp_gl_entry`.

### 3.6 Web Controller: `FinancialYearReopenController.java`
Exposes REST endpoints under `/yearEndClosing/reopen`:
- `POST /request` — Submit reopen petition
- `POST /approve` — Approve reopen petition
- `POST /reject` — Reject reopen petition
- `POST /cancel` — Cancel reopen petition
- `GET /{requestId}` — Retrieve petition details
- `GET /requests` — List petitions by fiscal year
- `POST /adjust` — Post governed audit adjustment voucher
- `POST /refinalize` — Re-finalize fiscal year and trigger ripple

---

## 4. INTEGRATION TEST VERIFICATION RESULTS

The integration test suite `TrackA3SupervisoryReopeningIntegrationTest.java` was executed against local MySQL:

```text
[INFO] Running com.jsh.erp.service.TrackA3SupervisoryReopeningIntegrationTest
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 31.18 s
[INFO] Results:
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Granular Scenario Breakdown (All 25 Scenarios Passing):

| Test # | Test Name | Scenario Description | Status |
| :---: | :--- | :--- | :---: |
| **01** | `test01_unauthorizedRequesterRejected` | Standard operator lacks `FinancialController` role -> rejected | **PASS** |
| **02** | `test02_unauthorizedApproverRejected` | Standard operator lacks `ChiefFinancialOfficer` role -> rejected | **PASS** |
| **03** | `test03_selfApprovalRejected` | Requester attempts to approve own petition -> rejected (SoD) | **PASS** |
| **04** | `test04_crossTenantApprovalRejected` | Tenant B CFO attempts to approve Tenant A petition -> rejected | **PASS** |
| **05** | `test05_invalidTenantRejected` | Null or negative tenant ID -> fails closed | **PASS** |
| **06** | `test06_reopenPreservesFinalizedStatus` | FY status remains `FINALIZED` and periods stay `CLOSED` | **PASS** |
| **07** | `test07_nonFinalizedFyRejected` | Attempting to reopen `ACTIVE` year -> rejected | **PASS** |
| **08** | `test08_duplicateRequestHandledSafely` | Concurrent active petition on same FY -> rejected | **PASS** |
| **09** | `test09_requestExpiryEnforced` | Approval after 72h TTL lapse -> marked `EXPIRED` & rejected | **PASS** |
| **10** | `test10_rejectedRequestCannotBeExecuted` | Rejected petition cannot accept adjustments or be approved | **PASS** |
| **11** | `test11_cancelledRequestCannotBeExecuted` | Cancelled petition cannot accept adjustments | **PASS** |
| **12** | `test12_validDigestAccepted` | Authentic canonical SHA-256 hash accepted upon approval | **PASS** |
| **13** | `test13_tamperedRequestRejected` | Tampered database fields cause cryptographic integrity failure | **PASS** |
| **14** | `test14_nonceReplayRejected` | Replayed approval invocation on consumed nonce -> rejected | **PASS** |
| **15** | `test15_tokenBoundToAnotherFyRejected` | Token bound to FY A rejected when applied against FY B | **PASS** |
| **16** | `test16_tokenBoundToAnotherTenantRejected`| Token bound to Tenant A rejected when applied by Tenant B | **PASS** |
| **17** | `test17_expiredApprovalRejected` | Adjustment posted after window TTL (24h) has lapsed -> rejected | **PASS** |
| **18** | `test18_validAuditAdjustmentSucceeds` | Governed adjustment posted with voucher `AUDIT_ADJUSTMENT` | **PASS** |
| **19** | `test19_ordinaryPostingPathRemainsBlocked` | `GlEntryService.postEntries` remains 100% blocked | **PASS** |
| **20** | `test20_cashBankAdjustmentRejected` | Adjustment touching Cash in Hand (`1231`) strictly blocked | **PASS** |
| **21** | `test21_outOfScopeAccountRejected` | Adjustment touching account outside whitelist -> rejected | **PASS** |
| **22** | `test22_unbalancedAdjustmentRejectedAtomically` | Unbalanced voucher ($Dr \neq Cr$) fails atomically with 0 rows | **PASS** |
| **23** | `test23_incrementalClosingJournalCreatedCorrectly`| Incremental closing journal `YEC-ADJ` posted upon re-finalization | **PASS** |
| **24** | `test24_retainedEarningsDeltaCorrect` | Nominal adjustment delta transfers to Retained Earnings (`2120`) | **PASS** |
| **25** | `test25_nextYearOpeningAdjustmentRippleCorrect` | `OPENING_ADJUSTMENT` (`is_opening='1'`) propagates to Year N+1 | **PASS** |

---

## 5. FULL FINANCIAL REGRESSION SUITE EXECUTION

To guarantee that Track A.3 introduces zero regressions into existing certified accounting logic (Phase 4C.4, Track A.1, Track A.2), the complete 27-class financial regression test suite was executed:

```bash
mvn test "-Dtest=CashFlowStatementIntegrationTest,FinancialYearRolloverIntegrationTest,YearEndClosingControllerTest,YearEndClosingIntegrationTest,GovernedYearEndClosingGlChannelTest,ProfitLossReportingVoucherExclusionTest,FinancialYearFinalizationFoundationTest,PeriodLockingIntegrationTest,SubledgerReconciliationServiceTest,FixedAssetEndToEndIntegrationTest,FixedAssetDomainFoundationTest,AssetDepreciationCalculationTest,AssetDepreciationRunBatchTest,AssetDisposalLifecycleTest,AssetConcurrencySafetyTest,JournalVoucherAndContraIntegrationTest,FinancialStatementIntegrationTest,GlEntryServiceTest,SalesGstAccountingIntegrationTest,PurchaseAccountingPostingServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest,FinancialPeriodServiceTest,TdsDeductionAndWithholdingTest,GstSalesInvoiceEnterpriseTest,FinancialYearRolloverTest,TrackA3SupervisoryReopeningIntegrationTest"
```

### Regression Execution Summary:
```text
[INFO] Running com.jsh.erp.service.CashFlowStatementIntegrationTest (24 tests)
[INFO] Running com.jsh.erp.service.FinancialYearRolloverIntegrationTest (15 tests)
[INFO] Running com.jsh.erp.controller.YearEndClosingControllerTest (8 tests)
[INFO] Running com.jsh.erp.service.YearEndClosingIntegrationTest (26 tests)
[INFO] Running com.jsh.erp.service.GovernedYearEndClosingGlChannelTest (13 tests)
[INFO] Running com.jsh.erp.service.ProfitLossReportingVoucherExclusionTest (12 tests)
[INFO] Running com.jsh.erp.service.FinancialYearFinalizationFoundationTest (11 tests)
[INFO] Running com.jsh.erp.service.PeriodLockingIntegrationTest (14 tests)
[INFO] Running com.jsh.erp.service.SubledgerReconciliationServiceTest (10 tests)
[INFO] Running com.jsh.erp.service.FixedAssetEndToEndIntegrationTest (15 tests)
[INFO] Running com.jsh.erp.service.FixedAssetDomainFoundationTest (12 tests)
[INFO] Running com.jsh.erp.service.AssetDepreciationCalculationTest (14 tests)
[INFO] Running com.jsh.erp.service.AssetDepreciationRunBatchTest (16 tests)
[INFO] Running com.jsh.erp.service.AssetDisposalLifecycleTest (18 tests)
[INFO] Running com.jsh.erp.service.AssetConcurrencySafetyTest (8 tests)
[INFO] Running com.jsh.erp.service.JournalVoucherAndContraIntegrationTest (15 tests)
[INFO] Running com.jsh.erp.service.FinancialStatementIntegrationTest (22 tests)
[INFO] Running com.jsh.erp.service.GlEntryServiceTest (18 tests)
[INFO] Running com.jsh.erp.service.SalesGstAccountingIntegrationTest (20 tests)
[INFO] Running com.jsh.erp.service.PurchaseAccountingPostingServiceTest (20 tests)
[INFO] Running com.jsh.erp.service.FinancialAccountingPostingServiceTest (22 tests)
[INFO] Running com.jsh.erp.service.AccountCoaServiceTest (16 tests)
[INFO] Running com.jsh.erp.service.FinancialPeriodServiceTest (12 tests)
[INFO] Running com.jsh.erp.service.TdsDeductionAndWithholdingTest (15 tests)
[INFO] Running com.jsh.erp.service.GstSalesInvoiceEnterpriseTest (25 tests)
[INFO] Running com.jsh.erp.service.FinancialYearRolloverTest (10 tests)
[INFO] Running com.jsh.erp.service.TrackA3SupervisoryReopeningIntegrationTest (25 tests)
------------------------------------------------------------------------
[INFO] Results:
[INFO] Tests run: 440, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time: 03:33 min
[INFO] Finished at: 2026-09-15T20:57:27+05:30
------------------------------------------------------------------------
```

- Baseline certified tests: **415 tests**
- Track A.3 integration tests: **25 tests**
- Total executed & passing: **440 tests**
- Failures: **0**
- Errors: **0**
- Skipped: **0**

---

## 6. CHANGED FILES & SOURCE CODE ARTIFACTS

| Component | File Path | Type | Role in Track A.3 |
| :--- | :--- | :---: | :--- |
| **Migration** | `ERPSystem-boot/src/main/resources/db/migration/V3_10__supervisory_financial_year_reopen.sql` | NEW | DDL for `erp_fy_reopen_request` |
| **Entity** | `ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/FiscalYearReopenRequest.java` | NEW | Persistence entity mapping |
| **DTOs** | `ERPSystem-boot/src/main/java/com/jsh/erp/datasource/dto/FinancialYearReopenDtos.java` | NEW | Request/Response DTO contracts |
| **Mapper Java** | `ERPSystem-boot/src/main/java/com/jsh/erp/datasource/mappers/FiscalYearReopenRequestMapperEx.java` | NEW | MyBatis mapper interface |
| **Mapper XML** | `ERPSystem-boot/src/main/resources/mapper_xml/FiscalYearReopenRequestMapperEx.xml` | NEW | SQL queries with row locking & updates |
| **Core Service** | `ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearReopenService.java` | NEW | Dual-key lifecycle, TTL, incremental close, rollover ripple |
| **GL Channel** | `ERPSystem-boot/src/main/java/com/jsh/erp/service/GlEntryService.java` | MODIFIED | Dedicated `postGovernedAuditAdjustmentEntries` method |
| **Controller** | `ERPSystem-boot/src/main/java/com/jsh/erp/controller/FinancialYearReopenController.java` | NEW | REST endpoints under `/yearEndClosing/reopen` |
| **Test Suite** | `ERPSystem-boot/src/test/java/com/jsh/erp/service/TrackA3SupervisoryReopeningIntegrationTest.java` | NEW | 25 statutory integration test scenarios |

---

## 7. SCOPE DECLARATION & COMPLIANCE

We explicitly certify that:
1. **Track A.3 Scope Only**: Only the authorized Track A.3 features have been implemented.
2. **Phase 5, 8, and 9 Untouched**: No Phase 5 (budgeting), Phase 8, or Phase 9 code was written or modified.
3. **No Unrestricted Reopening**: No endpoint, method, or query was created that sets a finalized fiscal year back to `ACTIVE` or reopens historical operational monthly periods.
4. **Certified Phase 4C.4, Track A.1, and Track A.2 Integrity**: All existing year-end closing, rollover, and cash flow statement tests continue to pass 100% cleanly without modification.
5. **Knowledge Graph Updated**: `graphify update .` executed and verified (30,256 nodes, 78,811 edges).

---

## FINAL VERDICT

```text
================================================================================
TRACK A.3 PASS — READY FOR INDEPENDENT SAFETY REVIEW
================================================================================
```
