# Phase 4C.4 Slice 4C.4.2 Remediation Report
## Remediation of Finding `F-4C4-05` / Condition `C-4C4-01`
### Historical Financial-Year Metadata Immutability on Duplicate Key Update

**Author:** Antigravity  
**Date:** 2026-09-09  
**Status:** COMPLETE  
**Verdict:** `REMEDIATION COMPLETE — READY FOR INDEPENDENT RE-REVIEW`

---

## 1. Finding Addressed

- **Finding ID:** `F-4C4-05` (Condition `C-4C4-01`)
- **Severity:** MEDIUM
- **Component:** `ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml` (`insert` statement)
- **Description:** During `ON DUPLICATE KEY UPDATE`, the initial Slice 4C.4.2 SQL protected `status` and `delete_flag` against overwrite for `FINALIZED` and `CLOSED` records, but left `start_date`, `end_date`, and `code` assigned unconditionally via `VALUES(...)`:
  ```sql
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  code = VALUES(code)
  ```
  Consequently, an insert with conflicting dates or code against a finalized or closed financial year would mutate historical metadata in the database.

---

## 2. Root Cause Analysis

In MySQL, `ON DUPLICATE KEY UPDATE` performs column assignments whenever an `INSERT` violates a UNIQUE index (here, `(tenant_id, name)`). 
While `FinancialYearService.resolveFinancialYear` deterministically computes standard Indian fiscal dates (01-Apr to 31-Mar) for a given year name, the persistence layer itself failed to enforce historical immutability. If any caller issued `financialYearMapperEx.insert(record)` with conflicting dates or code for an existing `FINALIZED` or `CLOSED` fiscal year, MySQL directly assigned the incoming values to the committed row.

Accounting governance requires:
$$\text{FINALIZED / CLOSED Financial Year Metadata} = \text{Strictly Immutable}$$
All 5 core lifecycle and boundary fields (`status`, `delete_flag`, `start_date`, `end_date`, `code`) must be completely immune to modification during upserts once a fiscal year has been finalized or closed.

---

## 3. Exact SQL Change

In `ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml`:

```diff
     <insert id="insert" parameterType="com.jsh.erp.datasource.entities.FinancialYear" useGeneratedKeys="true" keyProperty="id">
         INSERT INTO erp_financial_year (tenant_id, name, code, start_date, end_date, status, delete_flag)
         VALUES (#{tenantId}, #{name}, #{code}, #{startDate}, #{endDate}, #{status}, '0')
         ON DUPLICATE KEY UPDATE 
             id = LAST_INSERT_ID(id),
             delete_flag = IF(status IN ('FINALIZED', 'CLOSED'), delete_flag, '0'),
-            status = IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE'),
-            start_date = VALUES(start_date),
-            end_date = VALUES(end_date),
-            code = VALUES(code)
+            start_date = IF(status IN ('FINALIZED', 'CLOSED'), start_date, VALUES(start_date)),
+            end_date = IF(status IN ('FINALIZED', 'CLOSED'), end_date, VALUES(end_date)),
+            code = IF(status IN ('FINALIZED', 'CLOSED'), code, VALUES(code)),
+            status = IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE')
     </insert>
```

---

## 4. MySQL Semantics Verification

### A. Evaluation Order & Column Referencing
In MySQL, expressions on the right-hand side of assignments in `ON DUPLICATE KEY UPDATE` operate under precise rules:
1. An unqualified column name (e.g. `status`, `start_date`) references the **current value in the existing table row** before the statement executed, unless that column was already updated by an earlier assignment in the same `UPDATE` clause.
2. `VALUES(col)` references the **incoming value** provided in the `INSERT ... VALUES` list.
3. In our revised clause, `delete_flag`, `start_date`, `end_date`, and `code` are evaluated **before** `status` is reassigned.
4. Each assignment evaluates `IF(status IN ('FINALIZED', 'CLOSED'), col, VALUES(col))`:
   - If the pre-existing row has `status = 'FINALIZED'` or `'CLOSED'`, the condition is `true`, and the assignment becomes `col = col` (a database no-op retaining the original value).
   - If the pre-existing row has `status = 'ACTIVE'` (or other non-closed status), the condition is `false`, and the assignment becomes `col = VALUES(col)` (updating to the incoming value).
5. Finally, `status` is assigned `IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE')`:
   - Finalized/closed status is retained.
   - Non-finalized rows transition/remain `ACTIVE`.

### B. Empirical Proof on Active Database
The behavior was verified on the actual project MySQL database through integration tests (Tests 17–21):
- When `status` was `'FINALIZED'` and conflicting incoming values (`code = '18-19-X'`, `start_date = 2018-05-01`, `end_date = 2019-04-30`) were passed, MySQL updated **zero** of the protected columns. The committed database state remained `18-19`, `2018-04-01`, `2019-03-31`, and `status = 'FINALIZED'`.
- When `status` was `'ACTIVE'` and updated metadata was passed (`code = '16-17-U'`), MySQL updated the column as expected.

---

## 5. Files Changed

| File Path | Role | Description of Change |
|---|---|---|
| `ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml` | Persistence Layer | Hardened `ON DUPLICATE KEY UPDATE` to guard `start_date`, `end_date`, `code`, `delete_flag`, and `status` against overwrite for `FINALIZED` and `CLOSED` records. |
| `ERPSystem-boot/src/test/java/com/jsh/erp/service/FinancialYearFinalizationFoundationTest.java` | Test Suite | Added 5 focused integration tests (Tests 17–21) asserting committed database state directly via `jdbcTemplate`. |

---

## 6. Tests Added & Changed

In `FinancialYearFinalizationFoundationTest.java`:

- **Test 17 (F-4C4-05 Test 1):** `testFinalizedMetadataImmutabilityOnDuplicateInsert`
  - Creates a `FINALIZED` financial year (`name = "2018-19"`, `code = "18-19"`, dates 2018-04-01 to 2019-03-31).
  - Executes `financialYearMapperEx.insert` with conflicting `code = "18-19-X"`, `start_date = 2018-05-01`, `end_date = 2019-04-30`, and `status = "ACTIVE"`.
  - Queries `erp_financial_year` directly via `jdbcTemplate.queryForMap`.
  - Asserts all 5 fields remain identical to original committed values.
- **Test 18 (F-4C4-05 Test 2):** `testClosedMetadataImmutabilityOnDuplicateInsert`
  - Creates a `CLOSED` financial year (`name = "2017-18"`, `code = "17-18"`, dates 2017-04-01 to 2018-03-31).
  - Executes duplicate `insert` with conflicting dates and code.
  - Queries database directly and asserts all 5 fields remain untouched.
- **Test 19 (F-4C4-05 Test 3):** `testActiveMetadataMutableOnDuplicateInsert`
  - Creates an `ACTIVE` financial year (`name = "2016-17"`, `code = "16-17"`).
  - Executes duplicate `insert` with new code (`"16-17-U"`).
  - Asserts that for `ACTIVE` rows, duplicate key update continues to allow metadata updates (`code` updated to `"16-17-U"`).
- **Test 20 (F-4C4-05 Test 4):** `testSoftDeletedFinalizedCannotBeResurrectedOrMutated`
  - Sets `status = 'FINALIZED'` and `delete_flag = '1'` directly in the database.
  - Executes duplicate insert with `status = "ACTIVE"` and conflicting dates/code.
  - Asserts that `delete_flag` remains `'1'` (not resurrected to `'0'`), `status` remains `'FINALIZED'`, and dates/code remain original.
- **Test 21 (F-4C4-05 Test 5):** `testMultiTenantIsolationDuringDuplicateInsert`
  - Tenant A has finalized year `"2014-15"`.
  - Tenant B creates active `"2014-15"` and issues duplicate update modifying its own code.
  - Asserts Tenant B's active row updates, while Tenant A's finalized row is completely unaffected.

---

## 7. Database-Level Evidence

### A. Focused Integration Suite Execution
```bash
mvn test "-Dtest=FinancialYearFinalizationFoundationTest"
```
**Output Evidence:**
```text
[INFO] Running com.jsh.erp.service.FinancialYearFinalizationFoundationTest
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 21.07 s -- in com.jsh.erp.service.FinancialYearFinalizationFoundationTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  28.227 s
[INFO] Finished at: 2026-09-09T16:23:02+05:30
[INFO] ------------------------------------------------------------------------
```

### B. MyBatis SQL Trace Capture
From test execution log:
```sql
==> Preparing: INSERT INTO erp_financial_year (tenant_id, name, code, start_date, end_date, status, delete_flag) 
               VALUES (?, ?, ?, ?, ?, ?, '0') 
               ON DUPLICATE KEY UPDATE 
                   id = LAST_INSERT_ID(id), 
                   delete_flag = IF(status IN ('FINALIZED', 'CLOSED'), delete_flag, '0'), 
                   start_date = IF(status IN ('FINALIZED', 'CLOSED'), start_date, VALUES(start_date)), 
                   end_date = IF(status IN ('FINALIZED', 'CLOSED'), end_date, VALUES(end_date)), 
                   code = IF(status IN ('FINALIZED', 'CLOSED'), code, VALUES(code)), 
                   status = IF(status IN ('FINALIZED', 'CLOSED'), status, 'ACTIVE')
==> Parameters: 8801(Long), 2018-19(String), 18-19-X(String), 2018-05-01(Timestamp), 2019-04-30(Timestamp), ACTIVE(String)
<== Updates: 1
```
Database direct query assertion:
- `dbRow.get("status")` $\rightarrow$ `"FINALIZED"`
- `dbRow.get("delete_flag")` $\rightarrow$ `"0"`
- `dbRow.get("start_date")` $\rightarrow$ `"2018-04-01"`
- `dbRow.get("end_date")` $\rightarrow$ `"2019-03-31"`
- `dbRow.get("code")` $\rightarrow$ `"18-19"`

---

## 8. Concurrency Assessment

1. **Atomic Invariant Protection:** MySQL row-level locking during `ON DUPLICATE KEY UPDATE` guarantees that status and metadata preservation occurs atomically within the database engine.
2. **Race-Condition Safety:** If Thread A finalizes a fiscal year while Thread B concurrently invokes `resolveFinancialYear` / `insert`:
   - If Thread B hits `ON DUPLICATE KEY UPDATE`, the SQL atomically preserves all 5 fields.
   - `FinancialYearService.resolveFinancialYear` then immediately performs `selectByName(tenantId, fyName)`, returning the true committed row (`status = "FINALIZED"`) to the application layer.
   - No possibility of `FINALIZED → ACTIVE` transition or metadata corruption exists.

---

## 9. Full Regression Results

The full designated 20-class financial regression suite was executed:
```bash
mvn test "-Dtest=FinancialYearFinalizationFoundationTest,PeriodLockingIntegrationTest,SubledgerReconciliationServiceTest,FixedAssetEndToEndIntegrationTest,FixedAssetDomainFoundationTest,AssetDepreciationCalculationTest,AssetDepreciationRunBatchTest,AssetDisposalLifecycleTest,AssetConcurrencySafetyTest,JournalVoucherAndContraIntegrationTest,FinancialStatementIntegrationTest,GlEntryServiceTest,SalesGstAccountingIntegrationTest,PurchaseAccountingPostingServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest,FinancialPeriodServiceTest,TdsDeductionAndWithholdingTest,GstSalesInvoiceEnterpriseTest,FinancialYearRolloverTest"
```

**Results:**
```text
[INFO] Results:
[INFO] 
[INFO] Tests run: 310, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  01:59 min
[INFO] Finished at: 2026-09-09T16:25:13+05:30
[INFO] ------------------------------------------------------------------------
```

**Regression Suite Breakdown (20 Classes, 310 Tests):**
1. `FinancialYearFinalizationFoundationTest`: **21/21 PASS** (16 baseline + 5 new)
2. `PeriodLockingIntegrationTest`: **43/43 PASS**
3. `SubledgerReconciliationServiceTest`: **19/19 PASS**
4. `FixedAssetEndToEndIntegrationTest`: **17/17 PASS**
5. `FixedAssetDomainFoundationTest`: **20/20 PASS**
6. `AssetDepreciationCalculationTest`: **11/11 PASS**
7. `AssetDepreciationRunBatchTest`: **11/11 PASS**
8. `AssetDisposalLifecycleTest`: **12/12 PASS**
9. `AssetConcurrencySafetyTest`: **4/4 PASS**
10. `JournalVoucherAndContraIntegrationTest`: **11/11 PASS**
11. `FinancialStatementIntegrationTest`: **13/13 PASS**
12. `GlEntryServiceTest`: **8/8 PASS**
13. `SalesGstAccountingIntegrationTest`: **16/16 PASS**
14. `PurchaseAccountingPostingServiceTest`: **7/7 PASS**
15. `FinancialAccountingPostingServiceTest`: **15/15 PASS**
16. `AccountCoaServiceTest`: **14/14 PASS**
17. `FinancialPeriodServiceTest`: **8/8 PASS**
18. `TdsDeductionAndWithholdingTest`: **50/50 PASS**
19. `GstSalesInvoiceEnterpriseTest`: **8/8 PASS**
20. `FinancialYearRolloverTest`: **2/2 PASS**

**Total Tests:** 310  
**Failures:** 0  
**Errors:** 0  
**Skipped:** 0  
**Build Status:** SUCCESS

---

## 10. Scope Confirmation & Boundary Enforcement

We explicitly confirm:
- **`F-4C4-03` remains resolved:** Finalized and closed years cannot be reactivated or resurrected.
- **`F-4C4-05` is remediated:** All 5 metadata fields (`status`, `delete_flag`, `start_date`, `end_date`, `code`) are strictly immutable during `ON DUPLICATE KEY UPDATE` for `FINALIZED` and `CLOSED` years.
- **No unauthorized Slice 4C.4.3–4C.4.8 functionality was authored:**
  - No `YearEndClosingService`.
  - No closing journals.
  - No P&L voucher exclusion logic.
  - No governed GL posting channel.
  - No retained earnings transfer logic.
  - No controller endpoints.
  - No reopening logic.

---

## 11. Final Verdict

```text
REMEDIATION COMPLETE — READY FOR INDEPENDENT RE-REVIEW
```
