# Phase 4C.4 Slice 4C.4.2 Independent Re-Review
## Finding `F-4C4-05` / Condition `C-4C4-01`
### Historical Financial-Year Metadata Immutability Audit

**Auditor:** Antigravity (Independent Safety Auditor)  
**Date:** 2026-09-09  
**Target Finding:** `F-4C4-05` / Condition `C-4C4-01` (Historical Financial-Year Metadata Immutability)  
**Remediation Report Audited:** `research/finance-accounting/82_phase4C_4_2_F4C4_05_REMEDIATION_REPORT.md`  
**Verdict:** `PASS — F-4C4-05 CLOSED; SAFE TO AUTHORIZE 4C.4.3`

---

## 1. Re-Review Scope

This audit was conducted strictly to independently re-verify the remediation of **`F-4C4-05` / Condition `C-4C4-01`**:
- **In Scope:**
  - SQL verification of `ON DUPLICATE KEY UPDATE` in `FinancialYearMapperEx.xml`.
  - Independent verification of MySQL column evaluation semantics during upserts.
  - Direct database-level verification of immutability across all five core fields (`status`, `delete_flag`, `start_date`, `end_date`, `code`) for `FINALIZED` and `CLOSED` years.
  - Verification that standard `ACTIVE` year upsert behavior remains operational (no accidental global freeze).
  - Verification that soft-deleted finalized years (`delete_flag = '1'`) cannot be resurrected or mutated.
  - Tenant isolation and concurrency verification.
  - Confirmation that the primary `F-4C4-03` auto-reactivation fix remains fully intact.
  - Independent execution of focused and full financial regression suites.
- **Out of Scope (Verified Untouched):**
  - No source code modifications were made during this audit.
  - No Slice 4C.4.3 functionality (P&L voucher exclusion) was started.
  - No `YearEndClosingService`, closing journals, or retained earnings transfer logic exists.

---

## 2. SQL Inspected

The production SQL in `ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml` (lines 64–74) was inspected directly:

```xml
<insert id="insert" parameterType="com.jsh.erp.datasource.entities.FinancialYear" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO erp_financial_year (tenant_id, name, code, start_date, end_date, status, delete_flag)
    VALUES (#{tenantId}, #{name}, #{code}, #{startDate}, #{endDate}, #{status}, '0')
    ON DUPLICATE KEY UPDATE 
        id = LAST_INSERT_ID(id),
        delete_flag = IF(status IN ('FINALIZED', 'CLOSED'), delete_flag, '0'),
        start_date = IF(status IN ('FINALIZED', 'CLOSED'), start_date, VALUES(start_date)),
        end_date = IF(status IN ('FINALIZED', 'CLOSED'), end_date, VALUES(end_date)),
        code = IF(status IN ('FINALIZED', 'CLOSED'), code, VALUES(code)),
        status = IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE')
</insert>
```

### Analytical Breakdown by Row Lifecycle State
1. **Existing Row = `FINALIZED`:**
   - `status IN ('FINALIZED', 'CLOSED')` evaluates to **`TRUE`**.
   - `delete_flag` $\rightarrow$ `delete_flag` (preserves existing 0 or 1).
   - `start_date` $\rightarrow$ `start_date` (preserves original committed date).
   - `end_date` $\rightarrow$ `end_date` (preserves original committed date).
   - `code` $\rightarrow$ `code` (preserves original committed code).
   - `status` $\rightarrow$ `status` (preserves `"FINALIZED"`).
2. **Existing Row = `CLOSED`:**
   - `status IN ('FINALIZED', 'CLOSED')` evaluates to **`TRUE`**.
   - All five fields resolve to `col = col`, completely preventing overwrite.
3. **Existing Row = `ACTIVE`:**
   - `status IN ('FINALIZED', 'CLOSED')` evaluates to **`FALSE`**.
   - `delete_flag` $\rightarrow$ `'0'`
   - `start_date` $\rightarrow$ `VALUES(start_date)`
   - `end_date` $\rightarrow$ `VALUES(end_date)`
   - `code` $\rightarrow$ `VALUES(code)`
   - `status` $\rightarrow$ `'ACTIVE'`

---

## 3. Independent MySQL Evaluation Semantics Verification

The audit specifically tested whether unqualified column references in MySQL `ON DUPLICATE KEY UPDATE` observe the pre-existing row value or the incoming `VALUES(...)` parameter.

### Empirical Proof
In Test 17 of `FinancialYearFinalizationFoundationTest`:
- An existing row with `status = 'FINALIZED'` was subjected to an `insert` where the incoming values had `status = 'ACTIVE'`, `code = '18-19-X'`, `start_date = 2018-05-01`, and `end_date = 2019-04-30`.
- If MySQL had evaluated `status` against the incoming parameter (`VALUES(status) = 'ACTIVE'`), the condition `status IN ('FINALIZED', 'CLOSED')` would have evaluated to `FALSE`, resulting in all fields being overwritten with the conflicting incoming values.
- In reality, the database query directly showed:
  ```text
  status      = 'FINALIZED'
  delete_flag = '0'
  start_date  = '2018-04-01'
  end_date    = '2019-03-31'
  code        = '18-19'
  ```
- **Conclusion:** MySQL unambiguously evaluates unqualified column names on the RHS of `ON DUPLICATE KEY UPDATE` against the **pre-existing row's current column values**. Furthermore, because `delete_flag`, `start_date`, `end_date`, and `code` are assigned **before** `status` is reassigned, they observe the committed row status with 100% determinism.

---

## 4. Database-Level Immutability Evidence

Direct assertions against the database table `erp_financial_year` via `jdbcTemplate` confirm zero mutation:

### Finalized Row (Test 17)
- **Pre-existing DB State:** `status = FINALIZED, delete_flag = 0, start_date = 2018-04-01, end_date = 2019-03-31, code = 18-19`
- **Conflicting Insert Payload:** `status = ACTIVE, code = 18-19-X, start_date = 2018-05-01, end_date = 2019-04-30`
- **Committed DB State After Upsert:**
  - `status`: `"FINALIZED"` (ASSERTED)
  - `delete_flag`: `"0"` (ASSERTED)
  - `start_date`: `"2018-04-01"` (ASSERTED)
  - `end_date`: `"2019-03-31"` (ASSERTED)
  - `code`: `"18-19"` (ASSERTED)

### Closed Row (Test 18)
- **Pre-existing DB State:** `status = CLOSED, delete_flag = 0, start_date = 2017-04-01, end_date = 2018-03-31, code = 17-18`
- **Conflicting Insert Payload:** `status = ACTIVE, code = 17-18-X, start_date = 2017-01-01, end_date = 2017-12-31`
- **Committed DB State After Upsert:**
  - `status`: `"CLOSED"` (ASSERTED)
  - `delete_flag`: `"0"` (ASSERTED)
  - `start_date`: `"2017-04-01"` (ASSERTED)
  - `end_date`: `"2018-03-31"` (ASSERTED)
  - `code`: `"17-18"` (ASSERTED)

---

## 5. ACTIVE Regression Verification

In Test 19, an active financial year was updated via duplicate-key insert:
- Pre-existing code: `"16-17"`
- Incoming payload: `code = "16-17-U"`
- Database query asserted: `dbRow.get("code")` equals `"16-17-U"` and `dbRow.get("status")` equals `"ACTIVE"`.
- **Verdict:** The remediation did **not** freeze active rows; active financial years retain standard updating capabilities.

---

## 6. Soft-Deleted Finalized Record Verification

In Test 20:
- A finalized year was soft-deleted (`status = 'FINALIZED'`, `delete_flag = '1'`).
- A duplicate insert attempted `status = 'ACTIVE'` with conflicting metadata.
- Database query asserted:
  - `delete_flag` remains `"1"` (not resurrected to `"0"`).
  - `status` remains `"FINALIZED"`.
  - All date and code fields remain original.
- **Verdict:** Soft-deleted finalized rows cannot be resurrected or mutated via upsert.

---

## 7. Tenant Isolation Verification

In Test 21:
- Tenant A's finalized year `"2014-15"` (`code = "14-15-A"`) and Tenant B's active year `"2014-15"` (`code = "14-15-B"`) share the same fiscal year name.
- Tenant B executed a duplicate insert updating code to `"14-15-B2"`.
- Direct database query proved:
  - Tenant B's row updated to `code = "14-15-B2"`.
  - Tenant A's row remained `status = "FINALIZED"`, `code = "14-15-A"`.
- **Verdict:** Strict tenant scoping is fully preserved.

---

## 8. `F-4C4-03` Regression Verification

The resolution path was independently re-tested:
- `FinancialYearService.resolveFinancialYear(tenantId, txDate)` for a date within a `FINALIZED` or `CLOSED` year:
  - Immediately hits the service guard:
    ```java
    if ("FINALIZED".equalsIgnoreCase(existing.getStatus()) || "CLOSED".equalsIgnoreCase(existing.getStatus())) {
        return existing;
    }
    ```
  - Returns `existing` without invoking `updateById`.
  - Does not mutate `status` in memory or in the database.
- `F-4C4-03` remains **100% resolved**.

---

## 9. Test Quality Audit

Tests 17–21 in `FinancialYearFinalizationFoundationTest.java` were audited for rigor:
- **No mocks:** Real Spring integration test against active MySQL test database.
- **Direct DB Queries:** Each test executes `jdbcTemplate.queryForMap("SELECT status, delete_flag, start_date, end_date, code FROM erp_financial_year WHERE id = ? AND tenant_id = ?", fy.getId(), ...)`.
- **False-Positive Proof:** If any column (`status`, `delete_flag`, `start_date`, `end_date`, `code`) had been overwritten by MySQL's upsert, the `assertEquals` assertions would have failed immediately (as demonstrated earlier when `code` exceeded length).
- **Assessment:** **HIGH QUALITY / ZERO FALSE POSITIVES**.

---

## 10. Concurrency Assessment

Under concurrent execution of duplicate-key requests:
1. MySQL's InnoDB row-level pessimistic lock acquired during `INSERT ... ON DUPLICATE KEY UPDATE` ensures serial execution at the database engine level.
2. The evaluated SQL preserves `FINALIZED`/`CLOSED` atomically.
3. Post-insert `financialYearMapperEx.selectByName(tenantId, fyName)` in `FinancialYearService.java` line 126 re-queries the committed row, preventing any stale in-memory entity leakage.

---

## 11. Independent Regression Results

### Focused Test Suite: `FinancialYearFinalizationFoundationTest`
```bash
mvn test "-Dtest=FinancialYearFinalizationFoundationTest"
```
```text
[INFO] Running com.jsh.erp.service.FinancialYearFinalizationFoundationTest
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 21.31 s -- in com.jsh.erp.service.FinancialYearFinalizationFoundationTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  31.413 s
[INFO] Finished at: 2026-09-09T21:05:11+05:30
[INFO] ------------------------------------------------------------------------
```

### Full 20-Class Designated Financial Regression Suite
```bash
mvn test "-Dtest=FinancialYearFinalizationFoundationTest,PeriodLockingIntegrationTest,SubledgerReconciliationServiceTest,FixedAssetEndToEndIntegrationTest,FixedAssetDomainFoundationTest,AssetDepreciationCalculationTest,AssetDepreciationRunBatchTest,AssetDisposalLifecycleTest,AssetConcurrencySafetyTest,JournalVoucherAndContraIntegrationTest,FinancialStatementIntegrationTest,GlEntryServiceTest,SalesGstAccountingIntegrationTest,PurchaseAccountingPostingServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest,FinancialPeriodServiceTest,TdsDeductionAndWithholdingTest,GstSalesInvoiceEnterpriseTest,FinancialYearRolloverTest"
```
```text
[INFO] ------------------------------------------------------------------------
[INFO] Results:
[INFO] 
[INFO] Tests run: 310, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  02:11 min
[INFO] Finished at: 2026-09-09T21:07:39+05:30
[INFO] ------------------------------------------------------------------------
```

---

## 12. Audit Findings Status

| Finding ID | Severity | Initial Status | Re-Review Status |
|---|---|---|---|
| **F-4C4-03** | **CRITICAL** | Auto-reactivation of finalized years in `resolveFinancialYear` | **CLOSED & VERIFIED** |
| **F-4C4-05** | **MEDIUM** | Metadata mutability during `ON DUPLICATE KEY UPDATE` | **CLOSED & VERIFIED** |
| **F-4C4-06** | **LOW** | Soft-deleted finalized year returned by `resolveFinancialYear` | **DEFERRED TO 4C.4.6 (Governance)** |
| **F-4C4-07** | **INFORMATIONAL** | `AssetDepreciationService` lacks explicit `"FINALIZED"` check | **DEFERRED TO 4C.4.6 (Fails Closed in GL)** |

---

## 13. Final Disposition of `F-4C4-05`

Condition `C-4C4-01` has been fully satisfied. All five core lifecycle and boundary columns (`status`, `delete_flag`, `start_date`, `end_date`, `code`) are strictly immutable during `ON DUPLICATE KEY UPDATE` whenever a financial year is `FINALIZED` or `CLOSED`. 

Finding **`F-4C4-05` is formally CLOSED**.

---

## 14. Explicit Readiness Assessment for Slice 4C.4.3

All pre-requisites for Phase 4C.4 Slice 4C.4.3 are satisfied:
1. Slice 4C.4.1 (Foundation & Migration V3_9) $\rightarrow$ PASS.
2. Slice 4C.4.2 (`F-4C4-03` Auto-reactivation Remediation) $\rightarrow$ PASS.
3. Condition `C-4C4-01` (`F-4C4-05` Metadata Immutability Hardening) $\rightarrow$ PASS.
4. Full financial regression suite: 310/310 PASS.
5. Zero regressions across Phase 4A, 4B, 4C.1, 4C.2, and 4C.3.

**Progression to Phase 4C.4 Slice 4C.4.3 is SAFE TO AUTHORIZE.**

---

## 15. Final Verdict

```text
PASS — F-4C4-05 CLOSED; SAFE TO AUTHORIZE 4C.4.3
```

*(Absolute hard stop initiated. Awaiting explicit user authorization before initiating Slice 4C.4.3.)*
