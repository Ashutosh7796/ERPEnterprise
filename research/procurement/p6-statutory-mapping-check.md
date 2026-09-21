# Procurement P6: Authoritative Statutory Mapping & Verification Report

**Audit Date**: 2026-08-21  
**Scope**: Line-by-line statutory mapping check of Income-tax Act, 1961 vs Income-tax Act, 2025 provisions for Phase P6 (TDS on Purchase of Goods, Higher Withholding, Lower Deduction Certificates, Quarterly Returns, and MSME 43B(h)).

---

## 1. Statutory Mapping & Verification Summary

### Mapping 1: TDS on Purchase of Goods
- **Old Provision**: `Income-tax Act, 1961 — Section 194Q`
- **New Provision**: `Income-tax Act, 2025 — Section 393(1), Table Serial No. 8(ii)`
- **Effective Date**: 01-Apr-2026 (for Act 2025); 01-Jul-2021 (for Act 1961)
- **Official Source**: Income-tax Act, 2025 Chapter XIX (Deduction of Tax at Source), Section 393(1) Table; CBDT Circular 13/2021 & Circular 20/2021.
- **Statutory Rules**:
  - **Buyer Eligibility**: Turnover in immediately preceding FY $> ₹10\text{ Crore}$ ($₹100,000,000$).
  - **Transaction Threshold**: Aggregate purchase value from resident seller $> ₹50\text{ Lakhs}$ ($₹5,000,000$) in current Financial Year.
  - **Deduction Base**: Net taxable value excluding GST on invoice credit; Gross amount on advance payment.
  - **Statutory Rate**: **0.1000%** on amount exceeding ₹50 Lakhs.
  - **Timing / Trigger**: Earlier of credit to seller's account (invoice/suspense) or payment/advance disbursement.
  - **Precedence**: Overrides seller TCS under Section 206C(1H) / 2025 equivalent.
- **Required ERP Fields**:
  - `law_version`: `'INCOME_TAX_ACT_1961'` | `'INCOME_TAX_ACT_2025'`
  - `provision_ref`: `'SEC_194Q'` | `'SEC_393_1_TAB_8_II'`
  - `provision_display_name`: `'Income-tax Act, 1961 — Section 194Q'` | `'Income-tax Act, 2025 — Section 393(1), Table 8(ii)'`
  - `reporting_form`: `'FORM_26Q'` | `'FORM_140'`
  - `tds_rate`: `0.0010` (0.1%)
  - `threshold_amount`: `5000000.0000`
- **Regression Test**: `testTdsLawVersioningAndThreshold()` in `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java`.

---

### Mapping 2: Higher Deduction for Non-Furnishing of PAN (No-PAN Rate)
- **Old Provision**: `Income-tax Act, 1961 — Section 206AA` (and Section 206AB for non-filers)
- **New Provision**: `Income-tax Act, 2025 — Section 397(2)`
- **Effective Date**: 01-Apr-2026 (for Section 397(2)); 01-Apr-2010 (for Section 206AA)
- **Official Source**: Income-tax Act, 2025 Section 397(2) (Mandatory Requirement to furnish PAN and consequence of failure).
- **Statutory Rules**:
  - If the resident seller fails to furnish a valid 10-character alphanumeric PAN, tax is deductible at the rate of **5.0000%** (for purchase of goods) instead of the standard 0.1%.
- **Required ERP Fields**:
  - `penalty_rate_ref`: `'SEC_206AA'` | `'SEC_397_2'`
  - `is_pan_valid`: `BOOLEAN`
  - `applied_tds_rate`: `0.0500` (5.0% when PAN missing)
- **Regression Test**: `testMissingPanHigherRateDeduction()` in `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java`.

---

### Mapping 3: Lower or Nil Deduction Certificate
- **Old Provision**: `Income-tax Act, 1961 — Section 197`
- **New Provision**: `Income-tax Act, 2025 — Section 395` *(Corrected from tentative Section 397)*
- **Effective Date**: 01-Apr-2026 (for Section 395); 01-Apr-1962 (for Section 197)
- **Official Source**: Income-tax Act, 2025 Section 395 (Certificate for deduction at lower rate or no deduction of tax).
- **Statutory Rules**:
  - Where the Assessing Officer issues a certificate u/s 197 / Section 395 authorizing nil or lower deduction, the buyer deducts tax at the rate specified in the certificate upon validation of certificate number and validity date range.
- **Required ERP Fields**:
  - `certificate_section_ref`: `'SEC_197'` | `'SEC_395'`
  - `lower_deduction_cert_no`: `VARCHAR(64)`
  - `certificate_rate`: `DECIMAL(8,4)`
  - `certificate_valid_until`: `DATE`
- **Regression Test**: `testLowerDeductionCertificateApplication()` in `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java`.

---

### Mapping 4: Quarterly TDS Reporting Form
- **Old Form**: `Form 26Q` (Quarterly Statement of Tax Deducted at Source on payments other than salary)
- **New Form**: `Form 140` (Quarterly Return of Tax Deducted at Source under Income-tax Act, 2025)
- **Effective Date**: Form 26Q for quarters ending on or before 31-Mar-2026; Form 140 for quarters commencing on or after 01-Apr-2026.
- **Official Source**: Income Tax Rules & Notification on Annual/Quarterly Return Forms under IT Act 2025.
- **Statutory Rules**:
  - Form 26Q reports Section 194Q under payment code `194Q`.
  - Form 140 reports Section 393(1) under Table Code / Payment Code `393(1)-8(ii)`.
- **Required ERP Fields**:
  - `reporting_form`: `'FORM_26Q'` | `'FORM_140'`
  - `reporting_quarter`: `VARCHAR(10)` (e.g. `'2026-Q1'`, `'2026-Q2'`)
  - `challan_bsr_code`: `VARCHAR(32)`
  - `challan_date`: `DATE`
  - `challan_serial_no`: `VARCHAR(32)`
- **Regression Test**: `testQuarterlyTdsReturnFormGeneration()` in `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java`.

---

### Mapping 5: MSME Development Act Section 15 & Income Tax Section 43B(h)
- **Governing Law**: MSMED Act, 2006 (Sections 15, 16, 22, 23) & Income-tax Act, 1961 Section 43B(h) / IT Act 2025 equivalent.
- **Effective Date**: AY 2024-25 onwards.
- **Official Source**: MSMED Act, 2006; Finance Act, 2023; Ministry of MSME OM 02/07/2021 & 01/09/2021 (Trader exclusion).
- **Statutory Rules**:
  - **Protected Categories**: `MICRO` ($\le ₹1\text{ Cr}$ investment, $\le ₹5\text{ Cr}$ turnover) and `SMALL` ($\le ₹10\text{ Cr}$ investment, $\le ₹50\text{ Cr}$ turnover) manufacturers & service providers.
  - **Excluded Categories**: `MEDIUM` and Wholesale/Retail `TRADER` (Udyam NIC codes 45, 46, 47).
  - **Statutory Due Date**: $\min(\text{Agreed Days}, 45)$ with agreement; $15\text{ days}$ without agreement, computed from Day of Acceptance (or deemed acceptance if objection raised within 15 days).
  - **43B(h) Disallowance**: Unpaid invoice beyond statutory due date as of 31st March is disallowed as an expense in current FY.
  - **Section 16 Penal Interest**: 3x RBI Bank Rate compounded with monthly rests, debited to `5802 Inadmissible Penal Interest` (`tax_deductible = FALSE`).
- **Required ERP Fields**:
  - `supplier_msme_type`: `'MICRO'` | `'SMALL'` | `'MEDIUM'` | `'TRADER'` | `'NON_MSME'`
  - `udyam_registration_number`: `VARCHAR(64)`
  - `acceptance_date`: `DATE`
  - `statutory_due_date`: `DATE`
  - `msme_compliance_status`: `'COMPLIANT_PAID'` | `'WITHIN_LIMIT'` | `'OVERDUE_AT_RISK'` | `'DISALLOWED_43BH'`
  - `penal_interest_accrued`: `DECIMAL(18,4)`
- **Regression Test**: `testMsmeClassificationAnd43BhRisk()` in `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java`.

---

## 2. Dual Reference Storage Schema Matrix

| Stored Column | Pre-01-Apr-2026 Sample | Post-01-Apr-2026 Sample |
| :--- | :--- | :--- |
| `law_version` | `INCOME_TAX_ACT_1961` | `INCOME_TAX_ACT_2025` |
| `provision_ref` | `SEC_194Q` | `SEC_393_1_TAB_8_II` |
| `provision_display_name` | `Income-tax Act, 1961 — Section 194Q` | `Income-tax Act, 2025 — Section 393(1), Table 8(ii)` |
| `penalty_rate_ref` | `SEC_206AA` | `SEC_397_2` |
| `lower_cert_section_ref`| `SEC_197` | `SEC_395` |
| `reporting_form` | `FORM_26Q` | `FORM_140` |
| `reporting_code` | `194Q` | `393(1)-8(ii)` |
