# Phase 4C.4: Architecture Gap Remediation & Design Validation Report
## Fiscal Year-End Closing, Retained Earnings, Nominal Account Zeroing & Fiscal-Year Finalization

**Document Reference:** `research/finance-accounting/76_phase4C_4_ARCHITECTURE_GAP_REMEDIATION_VALIDATION.md`  
**Execution Timestamp:** `2026-09-09T14:15:00+05:30`  
**Author:** Independent Financial Systems Safety Reviewer & Principal Enterprise Architect  
**Subsystem Target:** Phase 4C.4 — Financial Year-End Closing Engine & Retained Earnings  
**Corpus / Repository:** `Ashutosh7796/ERPEnterprise` (`jshERP-master`)  
**Audit Protocol:** Second Read-Only Forensic Architecture Validation, AST Call Graph Tracing, Concurrency Proof, Multi-Tenant Boundary Inspection, Double-Counting Safety Analysis.

---

## 1. Executive Summary

This second forensic architecture validation independently investigated the four findings surfaced in Report 75 (`F-4C4-01`, `F-4C4-02`, `F-4C4-03`, `F-4C4-04`) under the **Absolute No-Change Rule**. No source code, database tables, migrations, or configurations were modified.

### Key Conclusions of the Second Forensic Audit:
1. **`F-4C4-01` (P1) is CONFIRMED:** `FinancialStatementService.getProfitLoss()` queries nominal accounts (`3xxx` and `4xxx`) across `[startDate, endDate]` without filtering by `voucher_type`. If physical closing journals zero out nominal accounts on March 31, historical Profit & Loss statements for closed years will report ₹0.00 revenue, ₹0.00 expense, and ₹0.00 net profit.
2. **`F-4C4-02` (P1) is CONFIRMED:** `GlEntryService.postEntries()` enforces `financialPeriodService.validatePeriodOpen()`, which rejects any posting if the period status is not `ACTIVE`. Because fiscal-year closing requires all 12 monthly periods to be `CLOSED`, standard GL posting of the March 31 closing journal will fail closed and abort.
3. **`F-4C4-03` (P1) is CONFIRMED & SEVERE:** `FinancialYearService.resolveFinancialYear()` line 95 explicitly mutates any non-active financial year back to `ACTIVE` (`if (!"ACTIVE".equals(existing.getStatus())) { existing.setStatus("ACTIVE"); updateById(existing); }`). Calling `resolveFinancialYear()` on a finalized year silently un-finalizes it in the database. Furthermore, `FinancialYearMapperEx.xml` line 52 executes `ON DUPLICATE KEY UPDATE status = 'ACTIVE'`.
4. **`F-4C4-04` (P2) is CONFIRMED:** `FinancialYearMapperEx.updateById()` and `deleteById()` update `erp_financial_year` using only `WHERE id = #{id}` without binding `tenant_id = #{tenantId}`, violating Architecture Decision AD-04.
5. **Retained Earnings Account 2120 is System-Protected:** Account `2120` (`Reserves & Surplus (P&L Retained Earnings)`) is bootstrapped in `TenantBootstrapService` under group `2100` (`Equity & Reserves`) as an active leaf node with `is_system = '1'`. It cannot be deleted via `AccountCoaService.deleteAccountCoa()`. Account ID is tenant-specific; lookup must be performed by canonical code `"2120"`.
6. **Closing Journal Architecture Dispositions:**
   - **Physical Zeroing (Option A)** remains the required standard for Indian Schedule III and pure-GL Trial Balance opening balances, provided `FinancialStatementService.getProfitLoss()` excludes `voucher_type = 'YEAR_END_CLOSING'`.
   - **Specially Governed GL Channel:** `GlEntryService` must remain the **sole GL authority**. Year-end closing must be handled via a strictly governed method `GlEntryService.postYearEndClosingEntries()` that validates Controller authority, 12 closed periods, balanced entries, and idempotency, preventing arbitrary closed-period posting.
   - **Dual-Lock Concurrency Invariant:** Concurrency protection requires acquiring row locks on **both** `erp_financial_year` (`FOR UPDATE`) and all 12 `erp_fiscal_period` rows (`FOR UPDATE`) to serialize reconciliation, prevent period unlocking, and block concurrent operational postings.

Because all four findings remain open in the physical codebase pending architecture approval and authorized implementation, the final gate is:  
**`NOT READY — ARCHITECTURE GAP`**.

---

## 2. Independent Verification of Finding F-4C4-01

### 2.1 The Issue
Report 75 asserted that if a year-end closing journal is posted to GL on March 31, historical Profit & Loss statements for that closed year would be wiped out to ₹0.00.

### 2.2 Independent Code Inspection
Inspection of [FinancialStatementService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialStatementService.java#L442-L460):
```sql
SELECT account_id, account_code, account_name,
       COALESCE(SUM(debit), 0) AS total_debit, 
       COALESCE(SUM(credit), 0) AS total_credit
FROM erp_gl_entry
WHERE tenant_id = ? AND delete_flag = '0' AND is_cancelled = '0'
  AND posting_date >= ? AND posting_date <= ?
  AND (account_code LIKE '3%' OR account_code LIKE '4%')
GROUP BY account_id, account_code, account_name
```
And inspection of lines 784–796:
```java
private BigDecimal getIncomeMovement(Map<String, BigDecimal[]> movementMap, String code) {
    BigDecimal[] m = movementMap.getOrDefault(code, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
    // Income is Credit - Debit
    BigDecimal netCr = m[1].subtract(m[0]);
    return netCr.compareTo(BigDecimal.ZERO) > 0 ? netCr : BigDecimal.ZERO;
}
```

### 2.3 Independent Forensic Trace
1. Suppose FY 2025-26 operational transactions generate:
   - Domestic Sales (`3110`): ₹1,000,000 Credit (Net Cr = ₹1,000,000)
   - Purchases / COGS (`4110`): ₹600,000 Debit (Net Dr = ₹600,000)
   - Net Profit: ₹400,000
2. If a physical closing journal is posted on `2026-03-31`:
   - Line 1: Debit `3110` for ₹1,000,000
   - Line 2: Credit `4110` for ₹600,000
   - Line 3: Credit Retained Earnings `2120` for ₹400,000
3. When a user runs `getProfitLoss(2025-04-01, 2026-03-31)`:
   - For `3110`: `total_debit` = ₹1,000,000, `total_credit` = ₹1,000,000.
   - `getIncomeMovement` calculates `netCr = total_credit - total_debit = 0.00`!
   - For `4110`: `total_debit` = ₹600,000, `total_credit` = ₹600,000.
   - `getExpenseMovement` calculates `netDr = total_debit - total_credit = 0.00`!
   - Domestic Sales reports: **₹0.00**
   - COGS reports: **₹0.00**
   - Net Profit reports: **₹0.00**

### 2.4 Architectural Analysis: Option A vs. Option B

| Architectural Dimension | Option A: Physical Zeroing via Closing Journal | Option B: No Physical Zeroing (Date-Bounded Reporting Only) |
| :--- | :--- | :--- |
| **P&L Semantics** | Requires `getProfitLoss` to exclude `voucher_type = 'YEAR_END_CLOSING'`. Once filtered, P&L is 100% accurate. | P&L is naturally bounded by date range `[startDate, endDate]`. No filter required. |
| **Trial Balance in FY N+1** | **Seamless.** Opening balance query (`posting_date < April 1`) sees ₹0.00 for all nominal accounts. Only balance sheet accounts appear in opening balance. | **Broken.** Opening balance query (`posting_date < April 1`) sees prior-year sales and expenses as opening balances! Requires major rewrite of `getTrialBalance`. |
| **Balance Sheet Reserves** | **Seamless.** Account `2120` holds cumulative prior-year profit. `currentPeriodNetProfit` computes only current-year profit. Total reserves = `2120 + currentPeriodNetProfit`. | **Distorted.** Account `2120` remains permanently ₹0.00. `currentPeriodNetProfit` sums all nominal movements since company inception! |
| **Audit Trail & GL Fact** | Explicit, immutable double-entry journal documenting annual closing. | No GL record exists. Finalization is merely a metadata flag on `erp_financial_year`. |
| **Statutory Alignment** | Standard Indian Schedule III & GAAP double-entry closing procedure. | Deviates from traditional double-entry closing conventions. |

### 2.5 Verdict on F-4C4-01
**Finding CONFIRMED (P1).** Option A (Physical Zeroing) is the mathematically superior architecture for this pure-GL ERP because Option B would corrupt Trial Balance opening balances and Balance Sheet reserves. The mandatory remediation is:
`FinancialStatementService.getProfitLoss()` **MUST** append `AND voucher_type != 'YEAR_END_CLOSING'` to nominal queries.

---

## 3. Independent Verification of Finding F-4C4-02

### 3.1 The Issue
Report 75 asserted that `GlEntryService.postEntries()` rejects postings to closed periods, preventing the closing journal from posting on March 31 once Period 12 is closed.

### 3.2 Independent Code Inspection
Inspection of [GlEntryService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GlEntryService.java#L123-L135):
```java
String expectedPeriodName = null;
for (int i = 0; i < entries.size(); i++) {
    GlEntry entry = entries.get(i);
    FiscalPeriod fp = financialPeriodService.validatePeriodOpen(tenantId, entry.getPostingDate());
    // ...
}
```
Inspection of [FinancialPeriodService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialPeriodService.java#L128-L133):
```java
String periodStatus = period.getStatus();
if (periodStatus == null || !"ACTIVE".equalsIgnoreCase(periodStatus)) {
    throw new BusinessRunTimeException(ExceptionConstants.SERVICE_ERROR_CODE,
            String.format("Posting rejected: Fiscal period [%s] is %s (Posting date: %s)",
                    period.getPeriodName(), (periodStatus != null ? periodStatus.toUpperCase() : "UNKNOWN"), postingDate));
}
```

### 3.3 Independent Trace of the Deadlock
1. Phase 4C.3 established invariant: **A period must be CLOSED before subsequent closing operations.**
2. For year-end finalization, Period 12 (March) must be `CLOSED` to ensure no operational transactions can be introduced after reconciliation.
3. Once Period 12 is `CLOSED`, its status in `erp_fiscal_period` is `'CLOSED'`.
4. The closing engine generates the year-end closing journal dated `March 31` (`2026-03-31`).
5. Calling `glEntryService.postEntries(entries, tenantId, userId)` iterates over each entry and invokes `financialPeriodService.validatePeriodOpen(tenantId, "2026-03-31")`.
6. `validatePeriodOpen()` finds Period 12 has status `'CLOSED'`, and throws:
   `BusinessRunTimeException: "Posting rejected: Fiscal period [2026-03] is CLOSED"`.
7. **Deadlock:** The closing journal cannot be posted because the period is closed; but the period cannot be safely left open during annual close.

### 3.4 Evaluation of Architectural Alternatives

- **Option A: General-Purpose Closed-Period Bypass:**
  - *Risk:* Severe. Allowing an `allowClosedPeriodPosting` flag in `postEntries` could be abused by operational services, destroying Phase 4C.1–4C.3 invariants.
  - *Verdict:* **REJECTED.**
- **Option B: Period 13 / Adjustment Period:**
  - *Risk:* Requires adding a 13th month to `erp_fiscal_period`, modifying date ranges, altering leap year calculations, and redesigning UI.
  - *Verdict:* **REJECTED AS OVERCOMPLICATED.**
- **Option C: Dedicated Governed Method `GlEntryService.postYearEndClosingEntries()`:**
  - *Architecture:*
    - Exists strictly inside `GlEntryService` (preserving single GL authority).
    - Requires `FinancialController` or platform `SuperAdmin` authority.
    - Requires that `FinancialYear.status == 'ACTIVE'` (or `'FINALIZING'`).
    - Requires that **ALL 12 monthly periods for that FY are in `CLOSED` status**.
    - Requires `voucher_type == 'YEAR_END_CLOSING'`.
    - Requires posting date to equal the financial year's `endDate` (`March 31`).
    - Validates that lines only contain nominal accounts (`3xxx`, `4xxx`) and Retained Earnings (`2120`).
    - Enforces full double-entry balance and leaf-node checks.
    - Uses database unique constraint `uk_gl_voucher_line` for idempotency.
  - *Verdict:* **RECOMMENDED.** Preserves closed-period immutability for all operational business users while providing an authoritative, auditable channel for annual closing.

---

## 4. Independent Verification of Finding F-4C4-03

### 4.1 The Issue
Report 75 asserted that `FinancialYearService.resolveFinancialYear()` silently mutates finalized financial years back to `ACTIVE`.

### 4.2 Independent Code Inspection
Inspection of [FinancialYearService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearService.java#L74-L101):
```java
FinancialYear fy = null;
try {
    fy = financialYearMapperEx.selectByDate(tenantId, targetDate);
    if (fy != null) {
        return fy;
    }
} catch (Exception ignored) {}

// ... Calculates FY name (e.g. "2025-26") dynamically ...

FinancialYear existing = financialYearMapperEx.selectByName(tenantId, fyName);
if (existing != null) {
    if ("1".equals(existing.getDeleteFlag()) || !"ACTIVE".equals(existing.getStatus())) {
        existing.setDeleteFlag("0");
        existing.setStatus("ACTIVE");
        financialYearMapperEx.updateById(existing);
    }
    return existing;
}
```
And inspection of [FinancialYearMapperEx.xml](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml#L46-L56):
```xml
<insert id="insert" parameterType="com.jsh.erp.datasource.entities.FinancialYear" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO erp_financial_year (tenant_id, name, code, start_date, end_date, status, delete_flag)
    VALUES (#{tenantId}, #{name}, #{code}, #{startDate}, #{endDate}, #{status}, '0')
    ON DUPLICATE KEY UPDATE 
        id = LAST_INSERT_ID(id),
        delete_flag = '0',
        status = 'ACTIVE',
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        code = VALUES(code)
</insert>
```

### 4.3 Independent Forensic Trace
1. A financial year `2025-26` is successfully finalized by the Financial Controller (`status = 'FINALIZED'`).
2. Subsequent operational actions occur:
   - An accountant creates a sales invoice dated `2025-05-15` or generates a document number for an old audit report.
   - `DocumentNumberService.generateNextNumber()` calls `financialYearService.resolveFinancialYear(tenantId, targetDate)`.
   - If `selectByDate()` encounters any parameter or date normalization discrepancy, the code falls through to line 93: `selectByName(tenantId, "2025-26")`.
   - Line 95 evaluates: `!"ACTIVE".equals(existing.getStatus())`.
   - Because `status == 'FINALIZED'`, this condition evaluates to **`TRUE`**.
   - Lines 96–98 execute:
     `existing.setStatus("ACTIVE");`
     `financialYearMapperEx.updateById(existing);`
3. **Catastrophe:** The finalized financial year is silently mutated in the database back to `ACTIVE`!
4. Furthermore, any call to `insert()` that hits a unique key collision on `(tenant_id, name)` executes:
   `ON DUPLICATE KEY UPDATE status = 'ACTIVE'`.

### 4.4 Mandatory Remediation (AD-4C4-01 / AD-4C4-08)
Lines 95–99 of `FinancialYearService.java` must be remediated:
- Only resurrect if `deleteFlag == '1'`.
- If `existing.getStatus()` is `'FINALIZED'` or `'CLOSED'`, it **MUST NEVER** be mutated back to `'ACTIVE'`.
- Line 52 of `FinancialYearMapperEx.xml` must NOT overwrite `status = 'ACTIVE'` if the existing status is `'FINALIZED'`.

---

## 5. Independent Verification of Finding F-4C4-04

### 5.1 The Issue
Report 75 asserted that `FinancialYearMapperEx.updateById` lacks tenant scoping.

### 5.2 Independent Code Inspection
Inspection of [FinancialYearMapperEx.xml](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/FinancialYearMapperEx.xml#L58-L74):
```xml
<update id="updateById" parameterType="com.jsh.erp.datasource.entities.FinancialYear">
    UPDATE erp_financial_year
    <set>
        <if test="name != null">name = #{name},</if>
        <if test="code != null">code = #{code},</if>
        <if test="startDate != null">start_date = #{startDate},</if>
        <if test="endDate != null">end_date = #{endDate},</if>
        <if test="status != null">status = #{status},</if>
        <if test="deleteFlag != null">delete_flag = #{deleteFlag},</if>
    </set>
    WHERE id = #{id}
</update>

<update id="deleteById">
    UPDATE erp_financial_year SET delete_flag = '1' WHERE id = #{id}
</update>
```

### 5.3 Independent Security Assessment
- Neither `updateById` nor `deleteById` contains `AND tenant_id = #{tenantId}`.
- Although `FinancialYearService` attempts to validate tenant context in Java, if an erroneous or forged entity is passed with another tenant's `id`, the MyBatis layer executes cross-tenant mutations without database-level protection.
- In Phase 4C.3, `FiscalPeriodMapperEx.updateById` was remediated under Architecture Decision AD-04 to mandate `AND tenant_id = #{tenantId}`.
- **Verdict: Finding CONFIRMED (P2).** Must be elevated to ensure strict multi-tenant boundary isolation across all financial year DML queries.

---

## 6. Retained Earnings Verification (Account 2120)

Independent inspection of `erp_account_coa` structure and `AccountCoaService.java`:
1. **Tenant Seeding:** In `TenantBootstrapService.java` line 260:
   `{"2120", "Reserves & Surplus (P&L Retained Earnings)", "2100", "LIABILITY", "EQUITY", "CREDIT", "0", "52", "Accumulated Retained Earnings"}`
   Seeded for 100% of tenants during bootstrap.
2. **Leaf Node & System Protection:**
   - `is_group = '0'` (postable leaf).
   - `is_system = '1'` (system-protected default).
   - In `AccountCoaService.java` line 150:
     `if ("1".equals(existing.getIsSystem())) throw new BusinessRunTimeException("System default account cannot be deleted");`
   - Account `2120` **cannot be deleted by any user**.
3. **Primary Key Stability:**
   - `id` is auto-generated per tenant (`BIGINT AUTO_INCREMENT`).
   - Account code `"2120"` is the stable, authoritative identifier.
   - Closing service must resolve account ID via `accountCoaService.getAccountCoaByCode("2120", tenantId)`.
4. **Accidental Target Protection:**
   - The closing engine must strictly validate that the resolved account has `account_code = '2120'`, `root_type = 'LIABILITY'`, and `account_type = 'EQUITY'` before accepting it as the balancing account.

---

## 7. Closing Journal Architecture Alternatives

```
                 CLOSING JOURNAL ARCHITECTURAL TOPOLOGY
                 ──────────────────────────────────────

                       YearEndClosingService
                                │
                                ▼
                       GlEntryService
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
      postEntries(...)             postYearEndClosingEntries(...)
      (Operational Path)           (Governed Finalization Path)
              │                                   │
              ├─► validatePeriodOpen()            ├─► Validate Controller Role
              │   (Must be ACTIVE)                ├─► Validate 12 Periods CLOSED
              │                                   ├─► Validate FY ACTIVE
              │                                   ├─► Validate voucher_type
              │                                   ├─► Validate Dr == Cr
              │                                   └─► Validate Leaf Accounts
              │                                           │
              └─────────────────┬─────────────────────────┘
                                ▼
                           batchInsert
                                │
                                ▼
                          erp_gl_entry
```

### Architectural Comparison:

| Criteria | Standard `postEntries` Channel | Dedicated `postYearEndClosingEntries` Channel | Direct Mapper Insert (Bypass) |
| :--- | :--- | :--- | :--- |
| **Sole GL Authority** | Preserved | **Preserved inside `GlEntryService`** | Violated (Split Authority) |
| **Closed Period Protection** | Blocks closing journal | **Maintains operational block; permits governed closing** | Completely bypasses period checks |
| **Double-Entry Validation** | Validated | **Identical validation shared** | Unvalidated |
| **Idempotency Enforcement** | `uk_gl_voucher_line` | **`uk_gl_voucher_line`** | Manual or unconstrained |
| **RBAC Security** | General operational roles | **Restricted strictly to Financial Controller / Super Admin** | Unenforced at service layer |

---

## 8. Fiscal-Year Lifecycle State Machine

```
              FISCAL YEAR STATE MACHINE LIFECYCLE
              ───────────────────────────────────

                         [ACTIVE]
                            │
                            │ 1. All 12 monthly periods CLOSED
                            │ 2. Subledger reconciliation BALANCED
                            │ 3. Trial balance balanced
                            │ 4. Zero unposted drafts
                            ▼
                      [FINALIZING]  (In-Memory / Row Locked)
                            │
                            ├─► Post YEAR_END_CLOSING Journal Batch
                            ├─► Update status to FINALIZED
                            ├─► Write FINANCIAL_YEAR Audit Log
                            ▼
                       [FINALIZED]  (Terminal State)
                            │
                            ▼
                   REOPENING FORBIDDEN
```

### Lifecycle Execution Sequence:
1. **Readiness Verification:** Check all 12 periods `CLOSED`, 6 control accounts `BALANCED`, Trial Balance balanced.
2. **Transaction Start:** Begin Spring `@Transactional` boundary.
3. **Pessimistic Locking:** Acquire `SELECT ... FOR UPDATE` on `erp_financial_year` AND all 12 `erp_fiscal_period` rows.
4. **GL Fact Insertion:** Post `YEAR_END_CLOSING` double-entry batch via `GlEntryService.postYearEndClosingEntries()`.
5. **State Transition:** Update `erp_financial_year.status = 'FINALIZED'`.
6. **Audit Trail Recording:** Insert immutable audit log into `erp_document_audit_log` (`document_type = 'FINANCIAL_YEAR'`).
7. **Commit:** Release locks and persist all mutations atomically.

---

## 9. Atomicity Analysis

The entire finalization process must execute inside a single Spring transaction:  
`@Transactional(value = "transactionManager", rollbackFor = Exception.class)`.

### Failure Matrix:
- If subledger reconciliation fails $\rightarrow$ Transaction aborts. Zero GL entries. FY remains `ACTIVE`.
- If GL posting fails $\rightarrow$ Transaction aborts. Zero GL entries. FY remains `ACTIVE`.
- If FY update fails $\rightarrow$ Spring initiates rollback. InnoDB discards GL insertions. FY remains `ACTIVE`.
- If audit log insertion fails $\rightarrow$ Spring initiates rollback. InnoDB discards GL insertions. FY remains `ACTIVE`.

**Conclusion:** It is physically impossible to produce an orphaned closing journal without a finalized financial year, or a finalized financial year without closing journals.

---

## 10. Idempotency Analysis

The idempotency of year-end closing is guaranteed at three distinct architectural levels:

1. **State Machine Level:** If `financialYear.getStatus() == 'FINALIZED'`, the closing service returns the existing finalized state immediately without repeating calculations.
2. **Database Unique Constraint Level:**
   `erp_gl_entry` enforces unique index `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`).
   - `tenant_id` = active tenant
   - `voucher_type` = `'YEAR_END_CLOSING'`
   - `voucher_id` = `financialYearId`
   - `line_no` = `1, 2, ... K`
   Any duplicate attempt to insert lines for the same financial year will be physically rejected by MySQL InnoDB with `ERROR 1062 (23000): Duplicate entry`.
3. **Concurrency Serialization Level:** Row locks held on `erp_financial_year` force concurrent requests to queue, preventing parallel execution.

---

## 11. Concurrency Analysis & Formal Proof

### 11.1 The Multi-Row Locking Requirement
In Phase 4C.3, locking only the parent entity was proven insufficient when child states can be manipulated concurrently.

```
Scenario: Finalization vs. Period Unlock
────────────────────────────────────────
Thread A (Year-End Finalization)            Thread B (Controller Period Unlock)
─────────────────────────────────            ───────────────────────────────────
BEGIN TRANSACTION                            BEGIN TRANSACTION
SELECT * FROM erp_financial_year             
WHERE id = ? FOR UPDATE;                     
  │                                            │
  ├─► Financial Year Lock Acquired             │
  │                                            ▼
  ├─► SELECT * FROM erp_fiscal_period          SELECT * FROM erp_fiscal_period
  │   WHERE financial_year_id = ?              WHERE period_name = '2026-03'
  │   FOR UPDATE;                              FOR UPDATE;
  │     │                                        │
  │     ├─► Period 1..12 Locks Acquired          ├─► BLOCKED by Thread A
  │     │                                        │   (Waits for Thread A to commit)
  │     ▼                                        │
  │   Validates all 12 periods CLOSED            │
  │   Posts YEAR_END_CLOSING journal             │
  │   Updates FY status = 'FINALIZED'            │
  │   COMMIT;                                    │
  │     │ (Releases all locks)                   │
  └─────┴───────────────────────────────────────►│
                                                 ├─► Lock Acquired
                                                 ▼
                                               Re-reads Period 12 & FY status
                                               Detects Parent FY is 'FINALIZED'
                                               REJECTS UNLOCK (Throws HTTP 400)
                                               ROLLBACK;
```

### 11.2 Concurrency Invariant:
**Both `erp_financial_year` AND all 12 child `erp_fiscal_period` rows must be locked `FOR UPDATE` inside the finalization transaction.** This guarantees that:
- Period unlock requests cannot alter period statuses while reconciliation and closing journals are in-flight.
- Operational writers requesting `FOR SHARE` on any period row are blocked.
- Reconciliation cannot become stale before finalization commits.

---

## 12. Reporting / Double-Counting Analysis

### 12.1 Profit & Loss Statement
- **Query:** `FinancialStatementService.getProfitLoss()`
- **Vulnerability:** Unfiltered queries include closing entries.
- **Remediation:** Must add `AND voucher_type != 'YEAR_END_CLOSING'` to nominal queries in lines 442–448.
- **Audit Verification:** Proves that operating revenues and expenses remain visible in historical reports after finalization.

### 12.2 Balance Sheet
- **Query:** `FinancialStatementService.getBalanceSheet()`
- **Behavior:** `balanceByCode` sums GL entries up to `asOfDate`.
- **Closed Year:** Closing journal zeros out nominal accounts. `currentPeriodNetProfit` evaluates to ₹0.00. Account `2120` holds the closed profit. Reserves & Surplus = `2120 + 0 = Net Profit`.
- **Subsequent Year:** Account `2120` holds prior-year profit. Nominal accounts reflect only subsequent-year operations. `currentPeriodNetProfit` reflects only subsequent-year profit. Reserves & Surplus = Prior (`2120`) + Current (`currentPeriodNetProfit`).
- **Audit Verification:** Proves zero double counting across multi-year intervals.

---

## 13. Tenant Isolation Analysis

Every query, lock, DML statement, and mapper involved in Phase 4C.4 must bind `tenant_id`:
1. `FiscalPeriodMapperEx.selectByFinancialYearId(tenantId, fyId)` $\rightarrow$ Scoped.
2. `AccountCoaMapper.selectByCode(code, tenantId)` $\rightarrow$ Scoped.
3. `FinancialYearMapperEx.updateById(...)` $\rightarrow$ **Remediation required to add `AND tenant_id = #{tenantId}` (`F-4C4-04`)**.
4. `FinancialYearMapperEx.deleteById(...)` $\rightarrow$ **Remediation required to add `AND tenant_id = #{tenantId}`**.
5. `GlEntryMapper.batchInsert(...)` $\rightarrow$ Scoped via `entry.setTenantId(tenantId)`.
6. `DocumentAuditLogMapper.insert(...)` $\rightarrow$ Scoped.

Cross-tenant finalization or inspection is mathematically impossible when database-level tenant binding is strictly enforced.

---

## 14. Security & Authorization Analysis

Server-side authorization is mandatory:
- **Pre-Close Readiness (`GET /financialYear/checkCloseReadiness`):** Requires `Accountant`, `FinancialController`, `TenantAdmin`, or platform `SuperAdmin`.
- **Finalization Execution (`POST /financialYear/finalize`):** Restricted strictly to `FinancialController` or platform `SuperAdmin`. `TenantAdmin` without Controller role is rejected with HTTP 403.
- **Unauthenticated Requests:** Rejected immediately with HTTP 401.
- **No Client Trust:** Frontend UI buttons are disabled as visual guidance only. Backend security enforces all decisions authoritatively.

---

## 15. Revalidated Architecture Decisions

| Decision ID | Summary | Accounting Consequence | Security Consequence | Implementation Consequence |
| :--- | :--- | :--- | :--- | :--- |
| **AD-4C4-01** | Fiscal-year finalization is an irreversible annual lifecycle event transitioning status from `ACTIVE` to `FINALIZED`. | Formal closure of statutory accounts. | Requires Controller/SuperAdmin authority. | Update `FinancialYearService` lifecycle validation. |
| **AD-4C4-02** | Nominal account zeroing dynamically aggregates active leaf `INCOME` and `EXPENSE` accounts across the fiscal year. | Resets nominal opening balances in FY N+1 to ₹0.00. | Read-only aggregation over canonical GL. | Dynamic balance query in `YearEndClosingService`. |
| **AD-4C4-03** | Account `2120` (`Reserves & Surplus`) is the sole authoritative balancing account for retained earnings. | Persistent balance sheet equity accumulation. | Protected system account; non-deletable. | Resolved dynamically by code `"2120"` per tenant. |
| **AD-4C4-04** | Closing journals posted exclusively via `GlEntryService.postYearEndClosingEntries()`. | Immutable GL record under `YEAR_END_CLOSING`. | Enforces single GL authority; prevents bypasses. | Dedicated governed channel in `GlEntryService`. |
| **AD-4C4-05** | Finalization preconditions: 12 monthly periods `CLOSED`, Period 12 reconciliation `BALANCED`, Trial Balance balanced, 0 unposted drafts. | Prevents premature or unbalanced fiscal close. | Prevents unauthorized state advancement. | Readiness validation service and endpoint. |
| **AD-4C4-06** | Single `@Transactional` boundary across GL journal, FY status update, and audit log. | All-or-nothing guarantee; zero partial commits. | Transactional integrity under HikariCP. | Orchestrated in `YearEndClosingService`. |
| **AD-4C4-07** | Triple-layer idempotency via state machine check, row locks, and `uk_gl_voucher_line` database constraint. | Prevents duplicate profit postings under retries. | Engine-level mathematical uniqueness. | Natural enforcement via MySQL unique key. |
| **AD-4C4-08** | Finalized financial years are permanently terminal and cannot be reopened. | Prior period items adjusted in active periods (Ind AS 8). | Prevents historical tampering. | `validateTransition` forbids exiting `FINALIZED`. |
| **AD-4C4-09** | Pure-GL dynamic opening balances; zero synthetic opening balance journal entries. | Eliminates 2x double counting. | Reduces ledger bloat; prevents shadow ledgers. | No opening balance generator needed. |
| **AD-4C4-10** | Dual-tier role governance: Execution restricted to `FinancialController` or platform `SuperAdmin`. | Segregation of duties for high-impact close. | Server-side enforcement via `SecurityService`. | Validated in Controller and Service layers. |
| **AD-4C4-11** | Dual-lock concurrency: Row locks acquired on `erp_financial_year` AND all 12 `erp_fiscal_period` rows (`FOR UPDATE`). | Prevents TOCTOU races between reconciliation & close. | Prevents concurrent period unlocking. | MyBatis `selectByIdForUpdate` and period locks. |
| **AD-4C4-12** | `FinancialStatementService.getProfitLoss()` must exclude `voucher_type = 'YEAR_END_CLOSING'`. | Historical P&L reports accurate operational numbers. | Prevents P&L zero-wipeout defect (`F-4C4-01`). | Append SQL filter to P&L queries. |
| **AD-4C4-13** | Flyway migration `V3_9` to add `closed_at`, `closed_by`, and `finalized_reason` to `erp_financial_year`. | Structural parity with `erp_fiscal_period`. | Audit traceability at schema level. | Non-breaking column additions via DDL. |

---

## 16. Recommended Implementation Boundary (Planning Only)

*Note: Planning boundaries only. Implementation is strictly unauthorized.*

1. **Step 1: Database Migration & Mapper Remediation (`F-4C4-04`):**
   - Create Flyway migration `V3_9__financial_year_finalization.sql`.
   - Remediate `FinancialYearMapperEx.xml` `updateById` and `deleteById` to include `AND tenant_id = #{tenantId}`.
2. **Step 2: Service-Layer Hardening (`F-4C4-03`):**
   - Remediate `FinancialYearService.resolveFinancialYear()` to eliminate auto-reactivation of `FINALIZED` years.
   - Remediate `FinancialYearMapperEx.xml` `insert` `ON DUPLICATE KEY UPDATE` to preserve `FINALIZED` status.
3. **Step 3: Reporting Filter Remediation (`F-4C4-01`):**
   - Update `FinancialStatementService.getProfitLoss()` to append `AND voucher_type != 'YEAR_END_CLOSING'`.
4. **Step 4: Governed GL Channel Implementation (`F-4C4-02`):**
   - Introduce `GlEntryService.postYearEndClosingEntries(...)` with strict Controller role and 12-closed-period validation.
5. **Step 5: Year-End Closing Engine:**
   - Implement `YearEndClosingService` (precondition verification, nominal account balance calculation, atomic orchestration).
6. **Step 6: Controller & Security Exposure:**
   - Expose `/financialYear/checkCloseReadiness` and `/financialYear/finalize` under `FinancialController` authority.
7. **Step 7: Verification & Regression:**
   - Author integration test suite `YearEndClosingIntegrationTest` covering atomicity, failure injection, concurrency, and statement verification.

---

## 17. Remaining Architecture Gaps

The four identified architecture findings remain open in the physical codebase:
- `F-4C4-01 (P1)`: Historical P&L wipeout unmitigated in `FinancialStatementService`.
- `F-4C4-02 (P1)`: Absence of governed closing channel in `GlEntryService`.
- `F-4C4-03 (P1)`: Silent auto-reactivation flaw unmitigated in `FinancialYearService`.
- `F-4C4-04 (P2)`: Missing tenant scoping in `FinancialYearMapperEx.xml`.

Because Phase 4C.4 is currently in read-only validation status, these gaps cannot be fixed during this session.

---

## 18. Final Architecture Gate Verdict

In accordance with Section 25 of the instructions:
Because three blocking P1 architectural findings (`F-4C4-01`, `F-4C4-02`, `F-4C4-03`) and one P2 finding (`F-4C4-04`) are open in the codebase:

```
========================================================================================
                          FINAL ARCHITECTURE GATE VERDICT
========================================================================================

                       NOT READY — ARCHITECTURE GAP

========================================================================================
```

---

## Absolute Hard Stop

In strict compliance with the review instructions:
- **Report 76 is delivered.**
- **All activities have stopped.**
- **Phase 4C.4 implementation remains strictly NOT AUTHORIZED.**
- Zero code, schemas, mappers, or tests were modified during this validation.
- Awaiting explicit user authorization before any remediation or implementation may proceed.
