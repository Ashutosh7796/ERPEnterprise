# Procurement Phase P6: Deep Edge-Case, Statutory Boundary & Concurrency Verification

**Document Ref**: `PROC-P6-EDGE-CASES-VERIF`  
**Evaluation Date**: August 2026  
**Status**: **EXHAUSTIVE STATUTORY & MATHEMATICAL PROOF**  

---

## 1. Executive Summary & Verification Matrix
This document provides formal mathematical proofs, statutory citations, double-entry accounting entries, and concurrency models for all 14 complex edge cases across Accounts Payable settlement, Supplier Advances, date-effective TDS, and MSME Section 43B(h) compliance.

---

## 2. Comprehensive 14 Edge-Case Analysis & Proofs

### Case 1: TDS Threshold Crossed Exactly at ₹50,00,000
- **Statutory Authority**: Section 194Q(1) (pre-2026) / Section 393(1) Table 8(ii) (from 2026).
- **Condition**: Prior cumulative purchases in FY = ₹49,00,000. Next transaction = ₹1,00,000.
- **Evaluation**:
  - Total cumulative purchase = ₹50,00,000.
  - Excess over statutory threshold = $\max(0, 50,00,000 - 50,00,000) = \text{₹0.00}$.
  - TDS Base = **₹0.00**, TDS Amount = **₹0.00**.
  - On the subsequent transaction (e.g. ₹50,000), prior purchases = ₹50,00,000 $\ge$ ₹50L threshold; therefore, 100% of the ₹50,000 is subjected to TDS ($50,000 \times 0.1\% = \text{₹50.00}$).

---

### Case 2: Threshold Crossed by an Advance
- **Statutory Authority**: "Earlier of credit or payment" trigger under Section 194Q / Section 393(1).
- **Condition**: Prior purchases = ₹40,00,000. Advance disbursed = ₹20,00,000.
- **Evaluation**:
  - Total cumulative value = ₹60,00,000 (crosses threshold by ₹10,00,000).
  - Taxable Base for Advance = $\text{₹10,00,000}$.
  - TDS Withheld at Advance Stage = $10,00,000 \times 0.1\% = \text{₹1,000.00}$.
  - Net Bank Disbursed = $20,00,000 - 1,000 = \text{₹19,99,000.00}$.
- **Canonical GL Entry**:
  $$\text{Dr 1105 Supplier Advances Asset } [20,00,000.00]$$
  $$\text{Cr 1002 Bank Account } [19,99,000.00]$$
  $$\text{Cr 2205 TDS Payable Liability } [1,000.00]$$
  $$\text{Proof: } \sum \text{Debits} = 20,00,000.00 = \sum \text{Credits} = 20,00,000.00$$

---

### Case 3: Invoice Split Around the Threshold
- **Statutory Authority**: CBDT Circular No. 13 of 2021 (TDS applies to base taxable value excluding GST when tax is separately charged).
- **Condition**: Prior purchases = ₹45,00,000. Current Invoice = ₹10,00,000 taxable + ₹1,80,000 GST = ₹11,80,000 gross.
- **Evaluation**:
  - Exempt Threshold Buffer = $50,00,000 - 45,00,000 = \text{₹5,00,000.00}$.
  - Taxable Base Subject to TDS = $10,00,000 - 5,00,000 = \text{₹5,00,000.00}$.
  - TDS Deducted = $5,00,000 \times 0.1\% = \text{₹500.00}$.
  - Net AP Settlement = $11,80,000 - 500 = \text{₹11,79,500.00}$.

---

### Case 4: TDS Certificate Applied After Previous Deductions
- **Statutory Authority**: Section 197 (pre-2026) / Section 395 (from 2026).
- **Rule**: A Lower / Nil Deduction Certificate issued by the Assessing Officer is **prospective** from the date of issuance / validity date stated on the certificate.
- **ERP Behavior**:
  - Prior deductions (Invoices 1–3) remain validly deducted at 0.10% (or 5.0%) and immutable in `erp_tds_register`.
  - Invoices posted after certificate receipt capture `lower_cert_no` and apply the certified lower rate (e.g. 0.02%) up to the sanctioned certificate threshold.

---

### Case 5: TDS Reversal / Correction
- **Statutory Authority**: CBDT Circular No. 13 of 2021 & TRACES Correction Guidelines.
- **Condition**: Deduction made in error or order cancelled prior to remittance.
- **ERP Behavior**:
  - If un-remitted: Reversal journal entry posted: $\text{Dr 2205 TDS Payable, Cr 2101 AP}$.
  - `erp_tds_register` records a correction entry with `is_correction = 1` and links `original_tds_id`.
  - If already deposited: Reversal is routed through TRACES correction statement (Form 26Q / Form 140 Correction).

---

### Case 6: Supplier PAN Status Changing During Financial Year
- **Statutory Authority**: Section 206AA (pre-2026) / Section 397(2) (from 2026).
- **Condition**: Supplier had missing PAN in Q1 (deducted @ 5.0% penal rate); furnishes valid PAN in Q2.
- **Rule**: Prior deductions deposited @ 5.0% stand as completed. Subsequent transactions immediately switch to the standard 0.10% rate upon PAN update in `erp_supplier`.
- **ERP Behavior**: Real-time PAN regex and checksum validation on supplier master update; automatic rate switching for subsequent transactions.

---

### Case 7: Pre-2026 Transaction Corrected After April 2026
- **Statutory Authority**: Income Tax Department Transitional Filing Guidelines for Income-tax Act, 2025.
- **Rule**: Any rectification, correction, or supplementary statement relating to TDS deducted prior to 01-Apr-2026 remains governed under the `INCOME_TAX_ACT_1961` and filed on `FORM_26Q` (Code `194Q`).
- **ERP Behavior**: Evaluator inspects `isCorrection` and `original_tds_id`. If `original.law_version == INCOME_TAX_ACT_1961`, the correction retains `INCOME_TAX_ACT_1961` and `FORM_26Q` regardless of current execution date.

---

### Case 8: Advance Partially Adjusted Against Multiple Invoices
- **Condition**: Advance of ₹1,00,000 (Doc `ADV-901`) settled against Invoice 1 (₹60,000) and Invoice 2 (₹70,000).
- **Step 1 (Settle Inv 1)**:
  - Offset = ₹60,000. Adv Remaining = ₹40,000. Inv 1 Remaining = ₹0 (FULLY_PAID).
  - GL: $\text{Dr 2101 AP (Inv 1) } [60,000], \text{Cr 1105 Advances } [60,000]$.
- **Step 2 (Settle Inv 2)**:
  - Offset = ₹40,000. Adv Remaining = ₹0 (CLOSED). Inv 2 Remaining = ₹30,000 (PARTIALLY_PAID).
  - GL: $\text{Dr 2101 AP (Inv 2) } [40,000], \text{Cr 1105 Advances } [40,000]$.
- **Balance Invariance**: Cumulative debits to AP = ₹1,00,000 = Cumulative credits to Advances = ₹1,00,000.

---

### Case 9: Payment Discount + TDS + Partial Allocation Simultaneously
- **Condition**: Open Invoice = ₹1,00,000. Partial allocation of ₹60,000 with ₹1,000 cash discount and ₹50 TDS withholding.
- **Net Cash Calculation**:
  $$\text{Net Bank Paid} = \text{Gross Allocation } (60,000) - \text{Discount } (1,000) - \text{TDS } (50) = \text{₹58,950.00}$$
- **Canonical GL Posting**:
  $$\text{Dr 2101 Accounts Payable } [60,000.00]$$
  $$\text{Cr 1002 Bank Account } [58,950.00]$$
  $$\text{Cr 2205 TDS Payable } [50.00]$$
  $$\text{Cr 4205 Cash Discount Received } [1,000.00]$$
  $$\text{Proof: } 60,000.00 = 58,950.00 + 50.00 + 1,000.00 \quad \text{[BALANCED]}$$

---

### Case 10: MSME Status Changing During the Financial Year
- **Statutory Authority**: Ministry of MSME Notification S.O. 4926(E) dated 18-Oct-2022.
- **Rule**:
  - In case of **upward graduation** (e.g. Small $\to$ Medium), the enterprise continues to enjoy MSME payment protection under Section 15 for **3 years** from the date of graduation.
  - In case of **downward reclassification** (e.g. Medium $\to$ Small), the benefit of payment protection is applicable immediately from the date of revision.
- **ERP Behavior**: Invoice compliance is evaluated based on the classification and grace status active at the invoice acceptance date.

---

### Case 11: 15/45-Day Boundary Date Tests
- **Statutory Authority**: Section 15 of MSMED Act, 2006.
- **Boundary Scenarios**:
  - **No Agreement**: Due Date = $\text{Acceptance Date} + 15 \text{ Days}$.
  - **Agreed 30 Days**: Due Date = $\text{Acceptance Date} + 30 \text{ Days}$.
  - **Agreed 45 Days**: Due Date = $\text{Acceptance Date} + 45 \text{ Days}$.
  - **Agreed 60 Days**: Statutorily capped at $\text{Acceptance Date} + 45 \text{ Days}$ (agreements beyond 45 days are void u/s 15).

---

### Case 12: Payment on the Exact Statutory Due Date
- **Scenario**: Invoice accepted on May 1, 2026; Statutory Due Date = June 15, 2026 (Day 45).
- **Payment on June 15, 2026 (Exact Due Date)**:
  - $\text{Days Overdue} = 0$.
  - Status = `COMPLIANT_PAID`.
  - Section 16 Penal Interest = **₹0.00**.
  - Tax Deduction u/s 43B(h) = **100% Allowable**.
- **Payment on June 16, 2026 (Day 46 — 1 Day Late)**:
  - $\text{Days Overdue} = 1$.
  - Status = `OVERDUE_AT_RISK` (or `COMPLIANT_PAID_LATE`).
  - Section 16 Penal Interest = $P \times [(1 + \frac{0.2025}{12})^{1/30} - 1] > 0$.

---

### Case 13: Duplicate Payment Retry Guard
- **Defense Mechanism**:
  1. Financial voucher header enforces unique bill number / idempotency token.
  2. Line allocator checks $\text{paid\_amount} + \text{alloc\_amount} \le \text{total\_invoice\_amount}$.
  3. If duplicate request arrives when invoice is already settled, transaction is **REJECTED** with error: `"Allocation amount exceeds open balance"`.
  4. Zero duplicate GL journal entries created.

---

### Case 14: Concurrent Payment Allocation to Same Invoice
- **Scenario**: Two concurrent sessions attempt to allocate payments against an open invoice of ₹50,000 (Session A attempts ₹30,000; Session B attempts ₹40,000).
- **Defense Mechanism**:
  - Service executes inside `@Transactional(value = "transactionManager")`.
  - Uses row-level lock (`SELECT ... FOR UPDATE` / atomic check) on `erp_purchase_invoice`.
  - Session A acquires lock $\to$ updates paid to ₹30,000 (open balance = ₹20,000) $\to$ commits.
  - Session B acquires lock $\to$ reads open balance = ₹20,000 < requested ₹40,000 $\to$ **REJECTED and rolled back**.
  - Total payments cannot exceed ₹50,000 under any concurrency load.
