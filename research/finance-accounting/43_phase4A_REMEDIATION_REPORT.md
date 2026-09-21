# PHASE 4A — STATUTORY TDS DEDUCTION ENGINE
## CONTROLLED REMEDIATION REPORT (F-01 THROUGH F-08)

**Document Reference:** `research/finance-accounting/43_phase4A_REMEDIATION_REPORT.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/43_phase4A_REMEDIATION_REPORT.md`  
**Date:** September 4, 2026  
**Status:** **REMEDIATION COMPLETED — PENDING INDEPENDENT FORENSIC SAFETY REVIEW**  
**Phase State:** **Phase 4A NOT DECLARED COMPLETE | Phase 4B BLOCKED | Phase 4C BLOCKED**

---

## 1. Executive Summary

Following the formal safety review (`42_phase4A_FINAL_SAFETY_REVIEW.md`), all eight forensic defects (**F-01 through F-08**) have been systematically remediated in the active codebase under controlled isolation.

Every remediation strictly adhered to user mandates:
1. **F-04:** Invalid Section 197 certificate requests **fail closed** (`BusinessRunTimeException`). The system never silently falls back to standard rates.
2. **F-06:** Supplier `FOR UPDATE` lock is acquired **before** cumulative FY reads and held through the complete posting transaction.
3. **F-07:** Duplicate detection verified 0 duplicate rows in `erp_tds_register` before enforcing the database engine `UNIQUE KEY uk_tds_doc`.
4. **Scope Boundaries:** Zero code written for Phase 4B (Fixed Assets/SLM Depreciation) or Phase 4C (Fiscal Year Closing). Zero second GL authorities or shadow ledgers created.

All 49 unit and integration tests in `TdsDeductionAndWithholdingTest` passed (100% pass rate). All 33 tests in the financial regression suite (`FinancialStatementIntegrationTest`, `JournalVoucherAndContraIntegrationTest`) passed with zero regressions. The frontend build completed cleanly.

---

## 2. Summary of Findings & Remediation Verification

| Defect ID | Severity | Category | Description | Remediation Implemented | Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | High | Statutory Compliance | Outdated statutory thresholds for 194J & 194I Land under Finance Act 2025 | Implemented date-effective threshold resolver `resolveSectionThreshold()` supporting ₹50,000 for 194J and ₹6,00,000 for 194I Land effective 2025-04-01 | Tests 39, 40 |
| **F-02** | High | Statutory Compliance | Director Remuneration under 194J(1)(ba) lacked ₹0 threshold and section separation | Created first-class section `SEC_194J_DIRECTOR` (`"194J_DIRECTOR"`) with ₹0 threshold, 10% standard rate, 20% non-PAN rate, and UI option | Test 41 |
| **F-03** | Critical | Ledger Integrity | FY Cumulative Aggregation double-counted the current invoice | Pass `sourceDocType` and `sourceDocId` to `determineTds()` and filter `AND id != ?` and `AND NOT (...)` | Test 42 |
| **F-04** | Critical | Statutory Compliance | Form 13 (Section 197) accepted unvalidated rates and fell back silently | Created authoritative table `erp_lower_deduction_certificate`; validated status, validity dates, PAN, section, and threshold limit; **fails closed** | Tests 6, 11, 16, 37, 43, 44, 45, 46 |
| **F-05** | Critical | Transactional Atomicity | GL posting exceptions swallowed, creating zombie TDS records without GL vouchers | Removed try-catch swallowing in `postPurchaseInvoice()`; unhandled exceptions trigger full Spring `@Transactional` rollback | Test 47 |
| **F-06** | High | Concurrency Safety | Lack of supplier row lock allowed race condition during concurrent threshold evaluation | Acquired `SELECT id FROM erp_supplier WHERE id = ? AND tenant_id = ? FOR UPDATE` before FY cumulative reads and held through transaction | Tests 35, 42 |
| **F-07** | High | Database Integrity | TDS register lacked DB engine UNIQUE constraint, relying solely on app-level check | Executed duplicate check (0 found), added `UNIQUE KEY uk_tds_doc (tenant_id, source_document_type, source_document_id)` | Test 48 |
| **F-08** | Medium | Statutory Compliance | Payee entity classification used loose name substrings ("PVT", "LTD") | 4th char of PAN (`P`/`H` vs others) is statutory conclusive proof; master data fallback only if PAN missing; no name matching | Test 49 |

---

## 3. Detailed Technical Remediation Audit

### F-01: Finance Act 2025 Date-Effective Statutory Thresholds
- **Problem:** Finance Act 2025 amended Section 194J aggregate threshold from ₹30,000 to ₹50,000, and Section 194I (Land and Building) aggregate threshold from ₹2,40,000 to ₹6,00,000, effective April 1, 2025 (FY 2025-26). The previous code used hardcoded pre-2025 thresholds regardless of transaction date.
- **Remediation:**
  - Added statutory date-effective resolver `resolveSectionThreshold(sectionCode, transactionDate)` in [`TdsDeterminationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/TdsDeterminationService.java).
  - Pre-2025-04-01 transactions evaluate against ₹30,000 (194J) and ₹2,40,000 (194I Land).
  - Post-2025-04-01 transactions evaluate against ₹50,000 (194J) and ₹6,00,000 (194I Land).
  - Section 194I (Plant & Machinery) remains ₹2,40,000 across all dates.
- **Evidence:** Tests 39 & 40 explicitly verify that a ₹35,000 194J payment is taxable in 2024 but exempt in 2025, and a ₹3,00,000 rent payment is taxable in 2024 but exempt in 2025.

### F-02: Section 194J(1)(ba) Director Remuneration Zero-Threshold Enforcement
- **Problem:** Section 194J(1)(ba) mandates that fees paid to a director (other than salary) are subject to TDS at 10% without any statutory threshold (i.e. deductible from ₹1). Previously, director remuneration was bundled with professional fees and improperly subjected to the aggregate threshold.
- **Remediation:**
  - Introduced explicit statutory code `SEC_194J_DIRECTOR` (`"194J_DIRECTOR"`).
  - Assigned `THRESHOLD_194J_DIRECTOR = BigDecimal.ZERO`.
  - Configured 10% standard rate, 20% Section 206AA non-PAN penalty rate, reporting code `94J-Dir`, and Form 26Q / Form 140 provisions.
  - Added option in frontend [`GstPurchaseInvoiceFormModal.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/procurement/components/GstPurchaseInvoiceFormModal.tsx): `"Sec 194J(1)(ba) — Director Remuneration (10%, ₹0 threshold) [Acct 2336]"`.
- **Evidence:** Test 41 verifies that a payment of ₹10,000 to a director triggers ₹1,000 TDS with valid PAN, and ₹2,000 TDS without PAN.

### F-03: Elimination of FY Cumulative Double-Counting
- **Problem:** In `GstPurchaseInvoiceService.postPurchaseInvoice()`, the invoice status was updated to `POSTED` prior to invoking `determineTds()`. The cumulative query `SELECT SUM(total_taxable_amount) FROM erp_purchase_invoice WHERE status != 'CANCELLED'` included the current invoice in `fyPriorPurchases`, and then `determineTds()` added `currentTaxableAmount` again, doubling the current invoice's weight against the ₹50 Lakh buffer.
- **Remediation:**
  - Updated `determineTds()` signature to accept `sourceDocType` and `sourceDocId`.
  - Added SQL predicate `AND id != sourceDocId` to the `erp_purchase_invoice` query.
  - Added SQL predicate `AND NOT (source_document_type = ? AND source_document_id = ?)` to the `erp_tds_register` query.
  - Passed `"PURCHASE_INVOICE"` and `invoiceId` from `postPurchaseInvoice()`.
- **Evidence:** Test 42 seeds a ₹40L prior purchase and posts a ₹15L invoice under Section 194Q. The system taxable base is strictly ₹5,00,000 (₹55L - ₹50L buffer), yielding ₹500 TDS (proving the current invoice was not double-counted as ₹70L cumulative).

### F-04: Authoritative Section 197 Certificate Table & Fail-Closed Validation
- **Problem:** Form 13 Lower Deduction Certificates were accepted without backend verification against an authoritative table. When invalid, the engine silently defaulted to standard rates rather than failing closed.
- **Remediation:**
  - Created persistent authoritative table `erp_lower_deduction_certificate`:
    ```sql
    CREATE TABLE IF NOT EXISTS `erp_lower_deduction_certificate` (
      `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      `tenant_id` bigint(20) NOT NULL,
      `certificate_no` varchar(64) NOT NULL,
      `supplier_id` bigint(20) NOT NULL,
      `pan` varchar(15) NOT NULL,
      `section_code` varchar(64) NOT NULL,
      `rate` decimal(8,4) NOT NULL,
      `valid_from` date NOT NULL,
      `valid_to` date NOT NULL,
      `threshold_limit` decimal(18,4) NOT NULL,
      `utilized_amount` decimal(18,4) NOT NULL DEFAULT 0.0000,
      `status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
      `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_tenant_cert` (`tenant_id`, `certificate_no`),
      KEY `idx_cert_supplier` (`tenant_id`, `supplier_id`),
      KEY `idx_cert_pan` (`tenant_id`, `pan`)
    );
    ```
  - Fail-closed checks enforce `BusinessRunTimeException(400, ...)` if:
    1. Certificate does not exist in `erp_lower_deduction_certificate`.
    2. Status is not `ACTIVE`.
    3. `transactionDate` is outside `valid_from` and `valid_to`.
    4. Certificate PAN does not match payee PAN.
    5. Certificate section does not cover the invoice section.
    6. `utilized_amount + currentTaxableAmount > threshold_limit`.
    7. Certificate rate is negative.
  - Utilization amount is incremented upon recording and decremented upon invoice reversal.
- **Evidence:** Tests 37, 43, 44, 45, and 46 verify that invalid rate, expired certificate, section mismatch, PAN mismatch, and limit breach each throw `BusinessRunTimeException`.

### F-05: Transactional Atomicity on GL Posting Failure
- **Problem:** `postPurchaseInvoice()` wrapped `purchaseAccountingPostingService.postPurchaseInvoiceToGeneralLedger()` in a `try-catch` block that logged a warning and swallowed exceptions. If GL posting failed, the invoice remained `POSTED` and TDS was registered, but zero GL entries were created.
- **Remediation:**
  - Removed the exception-swallowing `try-catch` block.
  - Allowed GL exceptions to propagate so Spring's `@Transactional(rollbackFor = Exception.class)` triggers full rollback of invoice status, TDS register, and P1 lineage.
- **Evidence:** Test 47 triggers GL failure by deleting the AP COA. The test asserts that `postPurchaseInvoice()` throws an exception, the invoice status rolls back to unposted, and exactly 0 TDS register entries remain.

### F-06: Concurrency Serialization via Supplier Row Locking
- **Problem:** Competing threads posting invoices for the same vendor could execute concurrent reads of `erp_purchase_invoice` and `erp_tds_register`, causing duplicate threshold exemptions.
- **Remediation:**
  - Mandated pessimistic row locking in `postPurchaseInvoice()` and `determineTds()`:
    ```sql
    SELECT id FROM erp_supplier WHERE id = ? AND tenant_id = ? FOR UPDATE
    ```
  - Lock is acquired before reading FY cumulative purchases and held until the end of the transaction boundary.
- **Evidence:** Test 35 (concurrency stress with 4 competing threads) and Test 42 execute cleanly with zero race conditions.

### F-07: Database Engine Uniqueness Constraint on TDS Register
- **Problem:** `erp_tds_register` relied solely on an application-level `SELECT id ... LIMIT 1` check before insert, leaving the table vulnerable to duplicate records during concurrent postings.
- **Remediation:**
  - In `initSchema()`, added duplicate row detection before schema alteration.
  - Confirmed 0 duplicate rows existed in `erp_tds_register`.
  - Replaced non-unique index with `UNIQUE KEY uk_tds_doc (tenant_id, source_document_type, source_document_id)`.
- **Evidence:** Test 48 attempts a direct SQL insert bypassing application checks; the database engine rejects the duplicate and Spring throws `DuplicateKeyException`.

### F-08: Conclusive PAN 4th Character Payee Entity Classification
- **Problem:** `resolvePayeeEntityType` previously performed substring matching on vendor names (`"PVT"`, `"LTD"`, etc.) before evaluating PAN, misclassifying sole proprietors whose trade names contained these strings.
- **Remediation:**
  - Under statutory Income-tax rules, the 4th character of PAN is conclusive legal proof:
    - `'P'` (Individual) and `'H'` (HUF) $\rightarrow$ `INDIVIDUAL_HUF` (1% under 194C).
    - `'C'`, `'F'`, `'L'`, `'J'`, `'T'`, `'G'`, `'A'`, `'B'` $\rightarrow$ `COMPANY_FIRM` (2% under 194C).
  - Master data `supplier.getType()` is used strictly as a secondary fallback when PAN is missing.
  - Eliminated all name substring matching.
- **Evidence:** Test 49 creates a sole proprietorship with trade name `"Ramesh Logistics Pvt Ltd Agency"` and PAN `AABPR1234F` (4th char `'P'`). Evaluated under 194C, the payee is conclusively classified as `INDIVIDUAL_HUF` with a 1% TDS rate (₹500 TDS on ₹50k, not ₹1,000).

---

## 4. Test Suite Execution Results

### 4.1. TDS Deduction & Withholding Integration Test Suite
Command: `mvn test -Dtest=TdsDeductionAndWithholdingTest`  
Class: `com.jsh.erp.service.TdsDeductionAndWithholdingTest`
```
[INFO] Running com.jsh.erp.service.TdsDeductionAndWithholdingTest
[INFO] Tests run: 49, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 49.53 s
[INFO] BUILD SUCCESS
```

Coverage breakdown of all 49 test scenarios:
- **194C (Contractors):** 6 tests (Individual 1%, Company 2%, Single ₹30k threshold, Aggregate ₹1L threshold, Non-PAN 20%, Lower cert 0.5%)
- **194J (Tech/Prof):** 5 tests (Technical 2%, Professional 10%, Pre-2025 ₹30k threshold, Non-PAN 20%, Lower cert 1.5%)
- **194I (Rent):** 5 tests (Plant & Machinery 2%, Land & Building 10%, Pre-2025 ₹2.4L threshold, Non-PAN 20%, Lower cert 3.0%)
- **194Q (Goods):** 7 tests (Buyer turnover > 10Cr, Resident seller, Preceding turnover boundary, ₹50L buffer, Crossing threshold, Excess taxable base, Non-PAN 5% capped)
- **Accounting & Ledger Parity:** 6 tests (Expense/GST/AP/TDS split, GST exclusion, GRNI clearing, PPV independence, TDS register vs GL parity, AP subledger parity)
- **Reversal Lifecycle:** 4 tests (Invoice cancellation, TDS liability reversal, Register CANCELLED status, AP restoration)
- **Safety & Concurrency Baseline:** 5 tests (Idempotency, Concurrent duplicate posting, Tenant isolation, Expired cert safety, Date boundary)
- **Remediation Suite (F-01 to F-08):** 11 tests:
  - Test 39: 194J date-effective threshold (₹30k vs ₹50k) [F-01]
  - Test 40: 194I Land date-effective threshold (₹2.4L vs ₹6.0L) [F-01]
  - Test 41: 194J(1)(ba) Director Remuneration ₹0 threshold [F-02]
  - Test 42: FY aggregation without current invoice double-counting [F-03, F-06]
  - Test 43: Section 197 expired cert fail-closed [F-04]
  - Test 44: Section 197 section mismatch fail-closed [F-04]
  - Test 45: Section 197 PAN mismatch fail-closed [F-04]
  - Test 46: Section 197 limit exceeded fail-closed [F-04]
  - Test 47: Transactional atomicity on GL failure [F-05]
  - Test 48: DB engine UNIQUE KEY uk_tds_doc enforcement [F-07]
  - Test 49: PAN 4th character conclusive entity classification [F-08]

### 4.2. Financial Core Regression Test Suite
Command: `mvn test "-Dtest=FinancialStatementIntegrationTest,JournalVoucherAndContraIntegrationTest"`
```
[INFO] Running com.jsh.erp.service.FinancialStatementIntegrationTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.JournalVoucherAndContraIntegrationTest
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 4.3. Frontend Build Verification
Command: `npm run build` in `ERPSystem-web-react`
```
✓ built in 4.37s
dist/index.html                           0.45 kB │ gzip:     0.29 kB
dist/assets/index-DrHtIR0Z.css            5.11 kB │ gzip:     1.53 kB
dist/assets/index-cwTYfV6V.js         5,074.25 kB │ gzip: 1,483.65 kB
```

---

## 5. Architectural Integrity & Scope Isolation

1. **No Scope Contamination:**
   - **Phase 4B (Fixed Assets & Depreciation):** No code written. BLOCKED.
   - **Phase 4C (Fiscal Year Closing):** No code written. BLOCKED.
2. **No Second GL Authority:**
   - All GL vouchers originate from `PurchaseAccountingPostingService` / `JournalVoucherService` and flow into `GlEntryService`.
3. **No Second TDS Authority:**
   - All withholding calculations flow strictly through `TdsDeterminationService.determineTds()`.
4. **Knowledge Graph Updated:**
   - `graphify update .` executed and verified (25,737 nodes, 67,932 edges, 986 communities).

---

## 6. Mandatory Forensic Stop & Next Steps

As explicitly mandated:
- **Phase 4A is NOT declared complete.**
- **Phase 4B is NOT started.**
- **All implementation activities are halted.**

This report is submitted for **independent forensic safety review**. Execution will resume only upon explicit user instruction following that independent audit.
