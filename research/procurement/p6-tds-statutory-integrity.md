# Procurement Phase P6: Date-Effective TDS Statutory Integrity & Dual-Track Verification

## 1. Statutory Architecture & Dual-Track Law Model
Under Indian tax law transition, the system enforces strict temporal boundary rules:
- **Prior to 01-Apr-2026**: Governed by `Income-tax Act, 1961` (Provision: `Section 194Q`, Reporting Return: `Form 26Q`).
- **From 01-Apr-2026**: Governed by `Income-tax Act, 2025` (Provision: `Section 393(1), Table Serial No. 8(ii)`, Reporting Return: `Form 140`).

---

## 2. 10-Point Authoritative Backend Determination Engine
The backend service (`TdsDeterminationService.java`) acts as the sole source of truth for TDS evaluation:
1. **Law Version Resolution**: Automatically determined by transaction date ($t < \text{2026-04-01} \implies \text{1961 Act}$; $t \ge \text{2026-04-01} \implies \text{2025 Act}$).
2. **Buyer Eligibility Check**: Asserts whether buyer turnover exceeded ₹10 Crore threshold in preceding financial year.
3. **Seller Residency Check**: Withholding under 194Q / 393(1) applies exclusively to resident suppliers.
4. **Section 206C(1H) Non-Applicability Priority**: 194Q / 393(1) takes statutory precedence over TCS under 206C(1H).
5. **Cumulative Turnover Tracking**: Deductions apply only to cumulative purchase turnover exceeding ₹50,00,000 threshold in the fiscal year.
6. **Earlier-of-Credit-or-Payment Trigger**: TDS withheld at point of credit (Invoice posting) or payment/advance disbursement, whichever occurs earlier.
7. **PAN Validation & Higher Penal Rate**:
   - Pre-2026: `Section 206AA` @ 5.0% for missing/invalid PAN.
   - Post-2026: `Section 397(2)` @ 5.0% for missing/invalid PAN.
8. **Lower / Nil Deduction Certificate Handling**:
   - Pre-2026: `Section 197` certificate number & custom rate.
   - Post-2026: `Section 395` certificate number & custom rate.
9. **Dual-Track Reporting Resolution**:
   - Form and schedule dynamically resolved based on provision and law version (`FORM_26Q` vs `FORM_140`).
10. **Dual-Track Machine & Human Readable Storage**:
    - Machine identifiers: `law_version`, `provision_ref`, `penalty_rate_ref`, `lower_cert_section_ref`, `reporting_form`, `reporting_code`.
    - Human labels: `provision_display_name`, certificate numbers, description.

---

## 3. Pre-2026 Correction Preservation Rule
Per Income Tax Department guidelines:
- Any rectification, supplementary withholding, or correction relating to transactions executed prior to 01-Apr-2026 (even when filed after April 2026) remains governed under `INCOME_TAX_ACT_1961` and filed on `Form 26Q`.
- The system checks `is_correction` flag and links `original_tds_id` to preserve original statutory framework.

---

## 4. Statutory Mapping Matrix

| Dimension | Pre-01-Apr-2026 (`INCOME_TAX_ACT_1961`) | From 01-Apr-2026 (`INCOME_TAX_ACT_2025`) |
| :--- | :--- | :--- |
| **Statute Name** | Income-tax Act, 1961 | Income-tax Act, 2025 |
| **Purchase of Goods Provision** | Section 194Q | Section 393(1), Table Serial No. 8(ii) |
| **Machine Provision Ref** | `SEC_194Q` | `SEC_393_1_TAB_8_II` |
| **Base Deduction Rate** | 0.10% (0.0010) | 0.10% (0.0010) |
| **Higher Rate (No PAN)** | Section 206AA (5.0%) | Section 397(2) (5.0%) |
| **Lower Deduction Certificate** | Section 197 | Section 395 |
| **Quarterly Return Form** | Form 26Q | Form 140 |
| **Reporting Schedule / Code** | `194Q` | `393(1)-8(ii)` |
