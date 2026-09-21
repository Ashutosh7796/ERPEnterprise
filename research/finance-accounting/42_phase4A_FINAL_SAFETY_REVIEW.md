# PHASE 4A — FINAL FORENSIC SAFETY REVIEW
## Statutory TDS Deduction Engine (Sections 194C, 194J, 194I, 194Q, 206AA, 197)

**Document Reference:** `research/finance-accounting/42_phase4A_FINAL_SAFETY_REVIEW.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/42_phase4A_FINAL_SAFETY_REVIEW.md`  
**Review Date:** 04-September-2026  
**Auditor:** Independent Safety Reviewer (DeepMind Advanced Agentic Coding)  
**Safety Review Mandate:** Read-Only Forensic Safety Review (Zero Code Modifications, Zero Defect Fixes, No Phase 4B/4C Implementation)

---

## 1. Executive Verdict

============================================================  
**PHASE 4A SAFETY REVIEW = FAIL**  
============================================================

While the implementation successfully implements the basic mechanics of TDS deduction (credit split between Net Trade Payables `2320` and TDS Payable `2335-2338`, passes 38/38 unit tests, and passes 33/33 financial regression tests), an independent, deep forensic investigation of the actual source code, statutory law, and database behavior has revealed **severe P0 and P1 defects** that disqualify the engine from production release:

1. **P0/P1 Statutory Compliance Failure (Finance Act 2025):** The engine hard-codes outdated statutory threshold limits. Section 194J threshold was increased by Finance Act 2025 from ₹30,00,00 to **₹50,000**, and Section 194I threshold was increased from ₹2,40,000 to **₹6,00,000** (effective April 1, 2025). The engine enforces obsolete limits, leading to statutory over-withholding. Furthermore, Section 194J(1)(ba) Director Remuneration (₹0 threshold) is not implemented.
2. **P1 Accounting & Calculation Defect (Current Invoice Double-Counting):** In `GstPurchaseInvoiceService.postPurchaseInvoice()`, the invoice status is updated to `POSTED` *before* `TdsDeterminationService.determineTds()` is executed. In `determineTds()`, `invSum` queries all non-cancelled invoices in `erp_purchase_invoice`, which already includes the current invoice. The engine then adds `currentTaxableAmount` a second time (`cumulativeWithCurrent = fyPriorPurchases.add(currentTaxableAmount)`). This causes premature threshold breach and severe over-deduction (e.g. for Section 194Q, taxing the entire invoice rather than only the excess over ₹50L).
3. **P1 Control & Compliance Failure (Unvalidated Section 197 Rate):** The engine accepts `lowerCertRate` directly from the client without server-side certificate verification against a master register, date validity, monetary limit, or statutory section applicability.
4. **P1 Atomicity Failure (Swallowed Exception Breaks GL / Subledger Atomicity):** In `GstPurchaseInvoiceService.postPurchaseInvoice()`, GL posting is wrapped in a `try-catch` block that catches `Exception` and logs a warning without re-throwing or triggering transaction rollback. A failure in GL posting leaves an orphan TDS register entry and a `POSTED` invoice with zero GL entries and no AP mutation.
5. **P2 Concurrency Defect (Threshold Race Condition):** There is no pessimistic lock on the supplier record during cumulative threshold calculation. Concurrent invoices for the same supplier race on threshold evaluation.
6. **P2 Database Schema Defect (Missing Unique Constraint):** `erp_tds_register` contains a non-unique index on `(tenant_id, source_document_type, source_document_id)` instead of the mandated `UNIQUE KEY`, risking duplicate deduction facts.

---

## 2. Current Architecture & Posting Pipeline

The authoritative document and journal flow inspected in the active codebase is:

```
                          GstPurchaseInvoiceRequestDto
                                       │
                                       ▼
                       GstPurchaseInvoiceService
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
      Three-Way Match Verification               Invoice Status Transition
         (PO ↔ GRN ↔ Invoice)                    (erp_purchase_invoice)
                    │                                     │
                    ▼                                     ▼
        TdsDeterminationService                Pessimistic Locking
        (determineTds / evaluateTds)           (FOR UPDATE on invoiceId)
                    │                                     │
                    ▼                                     ▼
         erp_tds_register persistence          PurchaseAccountingPostingService
         (idempotency check by doc ID)         (postPurchaseInvoiceToGeneralLedger)
                                                          │
                               ┌──────────────────────────┴──────────────────────────┐
                               ▼                                                     ▼
                     Debits (Gross Total):                                Credits (Gross Total):
                     • Dr 2105 GRNI Accrual Clearing                      • Cr 2320 Trade Payables (Net AP)
                     • Dr/Cr 4115 PPV Variance                            • Cr 2335-2338 TDS Payable
                     • Dr 1251-1253 Input GST Recoverable                                    │
                     • Dr 1211 Blocked ITC Asset                                             ▼
                     • Dr/Cr 4560 Round-Off Difference                     erp_supplier.all_need_pay (+ Net AP)
                               │
                               ▼
                        GlEntryService ──► erp_gl_entry
```

---

## 3. Statutory Verification & Law Versioning Review

### 3.1 Statutory Rates and Threshold Comparison

| Section | Statutory Nature | Statutory Threshold (Pre-01-Apr-2025) | Statutory Threshold (w.e.f. 01-Apr-2025 / FY 25-26 & 2025 Act) | Codebase Implementation (`TdsDeterminationService`) | Forensic Audit Finding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **194C** | Contractors & Subcontractors | Single: ₹30,000<br>Aggregate: ₹1,00,000 | Single: ₹30,000<br>Aggregate: ₹1,00,000 | `THRESHOLD_194C_SINGLE` = ₹30k<br>`THRESHOLD_194C_AGGREGATE` = ₹100k | **PARTIALLY COMPLIANT** (Threshold values match, but retrospective aggregate catch-up not supported). |
| **194J (Tech)** | Technical Services / Royalty | Aggregate: ₹30,000 | **Aggregate: ₹50,000** *(Finance Act 2025)* | `THRESHOLD_194J_AGGREGATE` = ₹30k (Fixed) | **DEFECT (P1)**: Hard-coded ₹30,000 violates Finance Act 2025. |
| **194J (Prof)** | Professional Services | Aggregate: ₹30,000 | **Aggregate: ₹50,000** *(Finance Act 2025)* | `THRESHOLD_194J_AGGREGATE` = ₹30k (Fixed) | **DEFECT (P1)**: Hard-coded ₹30,000 violates Finance Act 2025. |
| **194J (Director)** | Director Fees / Remuneration | **₹0 (No Threshold)** | **₹0 (No Threshold)** | Not implemented (Treated as 194J with ₹30k threshold) | **DEFECT (P1)**: Fails Section 194J(1)(ba). |
| **194I (P&M)** | Rent of Plant & Machinery | Aggregate: ₹2,40,000 | Aggregate: ₹2,40,000 | `THRESHOLD_194I_AGGREGATE` = ₹2,40,000 | **COMPLIANT** |
| **194I (Land/Bldg)** | Rent of Land / Building | Aggregate: ₹2,40,000 | **Aggregate: ₹6,00,000** *(Finance Act 2025)* | `THRESHOLD_194I_AGGREGATE` = ₹2,40,000 (Fixed) | **DEFECT (P1)**: Hard-coded ₹2,40,000 violates Finance Act 2025. |
| **194Q** | Purchase of Goods | Aggregate: ₹50,00,000 (Excess only) | Aggregate: ₹50,00,000 (Excess only) | `THRESHOLD_194Q_AGGREGATE` = ₹50,00,000 | **COMPLIANT on rate/threshold**, but calculation is broken by double-counting. |
| **206AA** | Higher Rate for Non-PAN | 20% (General)<br>5% (194Q Proviso) | 20% (General)<br>5% (194Q Proviso) | 20% for 194C/J/I<br>5% for 194Q | **COMPLIANT** |
| **197** | Lower Deduction Certificate | Certified rate | Certified rate | Client-supplied rate accepted without server validation | **DEFECT (P1)**: Control failure. |

### 3.2 Date-Effective Law Versioning

The engine establishes a date boundary at `2026-04-01`:
- **Pre-2026-04-01:** `INCOME_TAX_ACT_1961`, `FORM_26Q`, `SEC_206AA`, `SEC_197`.
- **Post-2026-04-01:** `INCOME_TAX_ACT_2025`, `FORM_140`, `SEC_397_2`, `SEC_395`.
- **Correction handling:** If `isCorrection = true` and `originalTdsId` references a 1961 Act deduction, it retains the 1961 Act schema.

**Finding:** The engine correctly swaps metadata and form reporting codes, but does **not** dynamically version the statutory thresholds (e.g., recognizing the Finance Act 2025 changes effective April 1, 2025).

---

## 4. Detailed Forensic Section Reviews

### 4.1 Section 194C Forensic Review
- **Rates:** 1% for Individual/HUF (derived from PAN 4th char 'P'/'H'), 2% for Company/Firm.
- **Thresholds:** Single invoice ₹30,000, Aggregate FY ₹1,00,000.
- **Entity Resolution Flaw:** Line 114 of `TdsDeterminationService.java` checks `supplier.getSupplier().contains("PVT") || ... contains("LTD")` before checking the PAN 4th character. If an individual contractor has a trade name containing "LTD", they are erroneously classified as `COMPANY_FIRM` and taxed at 2% instead of 1%. Statutory constitution is strictly determined by the PAN 4th character.

### 4.2 Section 194J Forensic Review
- **Sub-types:** Technical Services (2% under `SEC_194J_TECH`), Professional Fees (10% under `SEC_194J_PROF`).
- **Defects:**
  1. Threshold is permanently locked to ₹30,000, failing the Finance Act 2025 revision to ₹50,000.
  2. Director Remuneration under Section 194J(1)(ba) has no dedicated section code or zero-threshold evaluator.

### 4.3 Section 194I Forensic Review
- **Sub-types:** Plant & Machinery (2% under `SEC_194I_PM`), Land/Building/Furniture (10% under `SEC_194I_LAND`).
- **Defects:**
  1. Land/Building rent threshold is locked to ₹2,40,000, failing the Finance Act 2025 revision to ₹6,00,000.
  2. Classification depends on `requestedSection` parameter passed from frontend/caller rather than an authoritative backend property of the expense/asset account.

### 4.4 Section 194Q — High-Risk Forensic Review
- **Buyer Turnover Condition:** Section 194Q(1) applies only if the buyer's turnover in the preceding financial year exceeded ₹10 Crore. The engine has **no condition or configuration check** for buyer turnover. It treats 194Q as universally applicable.
- **Seller Residency Condition:** Section 194Q applies only to resident sellers. No seller residency verification is performed.
- **₹50 Lakh Threshold Calculation:**
  - Standard formula in code:
    ```java
    if (fyPriorPurchases.compareTo(THRESHOLD_194Q_AGGREGATE) >= 0) {
        eligibleBase = currentTaxableAmount;
    } else {
        eligibleBase = cumulativeWithCurrent.subtract(THRESHOLD_194Q_AGGREGATE);
    }
    ```
  - While mathematically correct in isolation, this calculation fails in end-to-end invoice posting due to the double-counting defect detailed in Section 5.

---

## 5. Critical Defect Analysis: Current Invoice Double-Counting

### The Defect Mechanism

Trace `GstPurchaseInvoiceService.postPurchaseInvoice(invoiceId, userContext)`:

```java
// Line 470: Invoice status is marked POSTED
jdbcTemplate.update(
    "UPDATE `erp_purchase_invoice` SET `status` = 'POSTED', `update_time` = NOW() WHERE `id` = ? AND `tenant_id` = ?",
    invoiceId, tenantId);

// Line 509: TDS Determination is called
TdsDeterminationResultDto tdsResult = tdsDeterminationService.determineTds(
    tenantId, supplierId, taxableValue, invoiceDate, tdsSection, false, false, null, lowerCertNo, lowerCertRate);
```

Inside `TdsDeterminationService.determineTds()`:

```java
// Lines 191-196: Query cumulative purchases from erp_purchase_invoice
BigDecimal invSum = jdbcTemplate.queryForObject(
    "SELECT IFNULL(SUM(total_taxable_amount), 0) FROM `erp_purchase_invoice` " +
    "WHERE `tenant_id` = ? AND `supplier_id` = ? AND `status` != 'CANCELLED' " +
    "AND `invoice_date` >= ? AND `invoice_date` <= ?",
    BigDecimal.class, tenantId, supplierId, fyStartDate + " 00:00:00", fyEndDate + " 23:59:59");
if (invSum != null) fyPriorPurchases = fyPriorPurchases.add(invSum);

// Lines 298, 355, 409, 460: Current taxable amount is added to fyPriorPurchases
BigDecimal cumulativeWithCurrent = fyPriorPurchases.add(currentTaxableAmount);
```

### Forensic Proof of Error
1. The invoice `invoiceId` is inserted into `erp_purchase_invoice` when created (`status = 'DRAFT'`).
2. When `postPurchaseInvoice` runs, its status becomes `POSTED`.
3. The SQL query sums all invoices where `status != 'CANCELLED'`. **This includes `invoiceId`!**
4. Therefore, `fyPriorPurchases` **already contains `currentTaxableAmount`**.
5. The subsequent code `cumulativeWithCurrent = fyPriorPurchases.add(currentTaxableAmount)` **adds `currentTaxableAmount` a second time**.

### Impact Scenario (Section 194Q Over-Withholding)
- Prior genuine purchases in FY: ₹40,00,000.
- Current Invoice: ₹15,00,000.
- Statutory expected behavior: Total = ₹55,00,000. Excess over ₹50L = **₹5,00,000**. TDS @ 0.1% = **₹500.00**.
- **Engine behavior:**
  - SQL query `invSum` returns ₹40L + ₹15L = ₹55,00,000.
  - `fyPriorPurchases` = ₹55,00,000.
  - Engine evaluates: `fyPriorPurchases >= THRESHOLD_194Q_AGGREGATE` (₹55L >= ₹50L).
  - Branch taken: `eligibleBase = currentTaxableAmount` (**₹15,00,000**)!
  - TDS deducted: 0.1% of ₹15,00,000 = **₹1,500.00**.
  - **Result: Over-deduction of ₹1,000.00 (300% statutory error). Net AP underpaid to vendor.**

*Why did unit tests not catch this?*  
In `TdsDeductionAndWithholdingTest.java`, unit tests called `evaluateTds()` with mock register rows created via `recordTdsDeduction(..., "INVOICE", ...)`. None of the cumulative threshold tests created an invoice in `erp_purchase_invoice` and called `postPurchaseInvoice()`. The integration tests only posted single invoices that were already well above the single transaction threshold.

---

## 6. Section 197 & 206AA Forensic Verification

### Section 197 (Lower Deduction Certificates)
- **Code Inspection:**
  ```java
  boolean hasLowerCert = isPanValid && lowerCertNo != null && !lowerCertNo.trim().isEmpty() &&
          lowerCertRate != null && lowerCertRate.compareTo(BigDecimal.ZERO) >= 0;
  ```
- **Control Breakdown:**
  1. No server-side validation against an official certificate registry or database table.
  2. No validation of validity dates (certificate valid from / to).
  3. No validation of certificate monetary limits (cumulative amount deducted under certificate).
  4. Any arbitrary lower rate supplied in the REST API request is honored as long as it is non-negative and the supplier has a valid PAN format.

### Section 206AA (Higher Withholding for Non-PAN)
- **PAN Validation:** Validated via regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` and GSTIN substring extraction (chars 3-12).
- **Rates:**
  - Standard sections (194C, 194J, 194I): 20% penalty rate applied correctly.
  - Section 194Q: 5.0% rate applied correctly under Section 206AA proviso.

---

## 7. Accounting Integration, GL/AP Parity, and Safeguards

### 7.1 Double-Entry Parity
For any posted transaction, the GL entry is strictly balanced:
$$\sum \text{Debits} = \text{Taxable Value} + \text{Input GST} + \text{Blocked ITC} \pm \text{Round-Off} = \text{Gross Total}$$
$$\sum \text{Credits} = \text{Net Trade Payables (2320)} + \text{TDS Payable (2335–2338)} = \text{Gross Total}$$
- Supplier subledger (`erp_supplier.all_need_pay`) is incremented strictly by `Net AP` (`grossTotal - tdsAmount`).

### 7.2 GRNI, PPV, and Inventory Protection
- Phase 2F inventory and accrual accounting is 100% preserved.
- When 3-way matching is active:
  - `2105 GRNI Accrual` is debited for `grniClearingAmount`.
  - `4115 Purchase Price Variance` is debited/credited for `ppvAmount`.
  - `1211 Raw Materials Inventory` is debited for capitalized Section 17(5) blocked ITC.
- TDS affects **strictly and exclusively** the credit leg of the voucher. It never touches inventory valuation, GRNI clearing, or PPV.

### 7.3 Reversal Forensics
- Invoice cancellation executes `glEntryService.reverseEntries()`.
- Reversal is **strictly append-only**: new rows are inserted with `voucher_type = 'PURCHASE_INVOICE_REVERSAL'` and `reversal_of_id`. Historical entries are never modified or deleted.
- TDS liability is cleared via debit to `2335–2338`.
- Supplier `all_need_pay` is reduced by `Net AP`.
- `erp_tds_register` record has `status` updated to `CANCELLED`.

---

## 8. Atomicity, Idempotency, and Concurrency Review

### 8.1 Atomicity Failure (P1 Defect)
In `GstPurchaseInvoiceService.java`, lines 475–535:
```java
if (purchaseAccountingPostingService != null) {
    try {
        // TDS register recorded
        tdsDeterminationService.recordTdsDeduction(...);
        // erp_purchase_invoice updated
        jdbcTemplate.update("UPDATE `erp_purchase_invoice` SET `tds_section` = ...", ...);
        // GL posting
        purchaseAccountingPostingService.postPurchaseInvoiceToGeneralLedger(...);
    } catch (Exception e) {
        logger.warn("[Tenant {}] Purchase Invoice GL Posting notice: {}", tenantId, e.getMessage());
    }
}
```
If `postPurchaseInvoiceToGeneralLedger()` fails:
- The exception is caught and **swallowed**.
- `postPurchaseInvoice` completes successfully and returns HTTP 200 `POSTED`.
- The database transaction commits.
- Result: **Invoice is marked POSTED, TDS register has recorded a statutory fact, but ZERO GL entries exist and AP is not updated.**

### 8.2 Concurrency & Idempotency
- **Single Document Idempotency:** Strong. Document-level lock `FOR UPDATE` on `erp_purchase_invoice` and GL count check `countByVoucher` prevent duplicate postings of the same invoice.
- **FY Threshold Race Condition:** Weak. There is no vendor-level lock during `determineTds()`. Two concurrent invoices for the same vendor will execute the aggregation query simultaneously and race on threshold calculation.

---

## 9. Chart of Accounts & Schema Review

### 9.1 Chart of Accounts Integrity
The Schedule III standard chart of accounts correctly includes all required TDS liability accounts:
- `2335` TDS Payable - Section 194C (Contractors) [Liability / Tax / Credit]
- `2336` TDS Payable - Section 194J (Professional Fees) [Liability / Tax / Credit]
- `2337` TDS Payable - Section 194I (Rent) [Liability / Tax / Credit]
- `2338` TDS Payable - Section 194Q (Purchase of Goods) [Liability / Tax / Credit]
All accounts are rooted under parent `2330 Duties & Taxes (Output GST & TDS)`.

### 9.2 Schema & Index Review
- Table: `erp_tds_register`
- Missing Unique Constraint:
  ```sql
  KEY `idx_tds_doc` (`tenant_id`, `source_document_type`, `source_document_id`)
  ```
  This is a regular secondary index, **not a `UNIQUE` index**. The pre-implementation plan mandated a unique index to guarantee database-level idempotency.

---

## 10. Frontend, Scope, & Graphify Verification

### 10.1 Frontend Non-Authoritative Check
- `GstPurchaseInvoiceFormModal.tsx` calls `evaluateTds` purely for user preview.
- On invoice submission, only `tdsSection`, `lowerCertNo`, and `lowerCertRate` are sent.
- The server recalculates all values authoritatively during invoice posting.
- Frontend build succeeds cleanly (0 errors, 3.24s).

### 10.2 Phase 4B/4C Contamination Check
- Zero code exists for Fixed Assets, SLM Depreciation, Period Locking, or Nominal Account Closing.
- Scope boundary is completely clean.

### 10.3 Graphify Topology Review
- Graph traversal on `TdsDeterminationService` (52 nodes inspected) confirms single-directional flow:
  `GstPurchaseInvoiceService` $\rightarrow$ `TdsDeterminationService` $\rightarrow$ `PurchaseAccountingPostingService` $\rightarrow$ `GlEntryService` $\rightarrow$ `erp_gl_entry`.
- No circular dependencies or rogue GL posting paths were detected.

---

## 11. Comprehensive Findings Matrix

| Finding ID | Severity | Category | Description | Root Cause File & Line | Production Impact |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **F-01** | **P1** | Statutory Compliance | Outdated statutory thresholds for Sections 194J (₹30k instead of ₹50k) and 194I (₹240k instead of ₹600k) under Finance Act 2025. | `TdsDeterminationService.java:46-47` | Unlawful TDS deduction on compliant vendors below legal thresholds. |
| **F-02** | **P1** | Statutory Compliance | Missing Section 194J(1)(ba) Director Remuneration handling (statutory ₹0 threshold). | `TdsDeterminationService.java:218-221` | Director remuneration receives inappropriate ₹30k/₹50k threshold exemption. |
| **F-03** | **P1** | Accounting Correctness | Double-counting current invoice in FY cumulative threshold query (`invSum` includes current invoice, then adds it again). | `GstPurchaseInvoiceService.java:470, 509`<br>`TdsDeterminationService.java:191-208` | Severe over-deduction under 194Q (taxing full invoice instead of excess) and premature threshold breach for 194C/J/I. |
| **F-04** | **P1** | Statutory Control | Section 197 lower deduction rate accepted directly from client payload without server-side certificate validation. | `TdsDeterminationService.java:230-235` | Fraud / compliance vulnerability: client can bypass TDS by submitting fictitious certificate numbers/rates. |
| **F-05** | **P1** | Financial Atomicity | `try-catch` block in `postPurchaseInvoice` catches and swallows GL posting exceptions, leaving orphan TDS register and unposted GL state. | `GstPurchaseInvoiceService.java:475, 533-535` | Silent financial corruption: invoice marked POSTED and TDS registered with 0 GL entries. |
| **F-06** | **P2** | Concurrency Control | No pessimistic lock on vendor record during cumulative FY threshold evaluation, risking threshold races. | `TdsDeterminationService.java:189-208` | Race conditions on concurrent invoices for same vendor. |
| **F-07** | **P2** | Database Schema | `erp_tds_register` lacks `UNIQUE` index on `(tenant_id, source_document_type, source_document_id)`. | `TdsDeterminationService.java:95` | Duplicate register facts possible if application check is bypassed. |
| **F-08** | **P2** | Business Logic | Payee entity type string-matching on vendor name overrides PAN 4th character legal constitution. | `TdsDeterminationService.java:105-128` | Individual contractors with "LTD" in business name taxed at 2% instead of 1%. |
| **F-09** | **P3** | Auditability | `cancelTdsDeduction` mutates status in-place without audit columns (`cancelled_by`, `cancelled_at`, `cancel_reason`). | `TdsDeterminationService.java:596-604` | Audit trail does not record who cancelled the deduction or why. |
| **F-10** | **P3** | Governance | Runtime DDL via `@PostConstruct` without versioned migration scripts (Flyway/Liquibase). | `TdsDeterminationService.java:62-99` | Schema drift risk across environments. |

---

## 12. Final Verdict & Next Steps

============================================================  
**FINAL VERDICT: PHASE 4A SAFETY REVIEW = FAIL**  
============================================================

### Blocking Defects Requiring Resolution Prior to Authorization:
1. **Fix F-03 (Double-Counting):** Ensure `invSum` in `determineTds` excludes the current document ID, or compute prior purchases before updating invoice status.
2. **Fix F-01 & F-02 (Statutory Thresholds & Director Fees):** Implement Finance Act 2025 thresholds (₹50k for 194J, ₹600k for 194I) and ₹0 threshold for Director Remuneration.
3. **Fix F-05 (Atomicity):** Remove the exception-swallowing `try-catch` in `postPurchaseInvoice` so that GL posting failures trigger a full rollback.
4. **Fix F-04 (Section 197 Validation):** Implement server-side certificate validation.
5. **Fix F-07 (Unique Index):** Add a `UNIQUE` constraint on `(tenant_id, source_document_type, source_document_id)`.

In strict accordance with safety protocols:
- **Zero code has been modified.**
- **No defects have been touched.**
- **Phase 4B and 4C remain blocked.**
- **Hard stop enforced.**
