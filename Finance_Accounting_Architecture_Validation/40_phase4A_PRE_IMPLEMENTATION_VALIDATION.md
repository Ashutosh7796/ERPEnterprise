# PHASE 4A — PRE-IMPLEMENTATION FORENSIC ARCHITECTURE & STATUTORY VALIDATION REPORT
## Direct Tax TDS Deduction Engine (Sections 194C, 194J, 194I, 194Q, 206AA, 197)

**Document Reference:** `research/finance-accounting/40_phase4A_PRE_IMPLEMENTATION_VALIDATION.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/40_phase4A_PRE_IMPLEMENTATION_VALIDATION.md`  
**Verification Date:** 04-September-2026  
**Status:** **READ-ONLY FORENSIC VALIDATION — NO PRODUCTION MODIFICATIONS PERFORMED**  
**Validation Verdict:** `PHASE 4A PRE-IMPLEMENTATION VALIDATION = READY`

---

## 1. Executive Summary & Scope

This forensic document provides the pre-implementation architectural, statutory, and accounting validation for **Phase 4A: Statutory TDS Deduction Engine**. 

In accordance with strict safety mandates:
1. **Zero production code, schema migrations, or Chart of Accounts modifications** have been executed.
2. All existing financial posting authorities (`PurchaseAccountingPostingService`, `GlEntryService`, `AccountCoaService`, `ApPaymentAllocationService`, `TenantBootstrapService`) have been inspected in their active state.
3. Indian direct tax statutory rules (Income-tax Act, 1961 Chapter XVII-B and Income-tax Act, 2025 Date-Effective Framework) and authoritative CBDT Circulars have been verified.

---

## 2. Current TDS Implementation & Codebase Discovery

An exhaustive inspection of the current codebase reveals the following existing components:

| Component | Current File Location | Current State & Responsibility | Phase 4A Required Evolution |
| :--- | :--- | :--- | :--- |
| **`TdsDeterminationService`** | `ERPSystem-boot/.../service/TdsDeterminationService.java` | Implements Date-Effective Law Versioning (1961 Act vs 2025 Act), 194Q calculation with ₹50L threshold, 206AA (5% for 194Q), and `erp_tds_register` persistence. | Expand determination rules to cover Sections 194C, 194J (Tech & Prof), 194I (P&M & Land), single-invoice & aggregate FY thresholds. |
| **`erp_tds_register`** | MySQL Database Table (`initSchema` in `TdsDeterminationService`) | Stores authoritative statutory deduction records (`tenant_id`, `law_version`, `provision_ref`, `party_id`, `pan`, `taxable_base_amount`, `tds_rate`, `tds_amount`, `status`, `reporting_form`, `reporting_code`). | Add unique index on `(tenant_id, source_document_type, source_document_id)` to ensure idempotency. |
| **`PurchaseAccountingPostingService`** | `ERPSystem-boot/.../service/PurchaseAccountingPostingService.java` | Authoritative purchase invoice double-entry GL poster. Currently credits `2320 Trade Payables` for `grossTotal` and debits GRNI `2105`, PPV `4115`, GST `1251-1253`, Round-off `4560`. | Integrate TDS split: Credit `2320 Net AP` + Credit `2335-2338 TDS Payable`. Update `erp_supplier.all_need_pay` with `Net AP`. |
| **`GstPurchaseInvoiceService`** | `ERPSystem-boot/.../service/GstPurchaseInvoiceService.java` | Handles 3-Way Match validation, invoice status transition (`DRAFT` $\rightarrow$ `POSTED`), and triggers `PurchaseAccountingPostingService`. | Invoke `TdsDeterminationService.determineTds(...)` during invoice posting and record TDS register entry. |
| **`ApPaymentAllocationService`** | `ERPSystem-boot/.../service/ApPaymentAllocationService.java` | Handles multi-invoice AP settlements (`Dr 2320 / Cr 1232 Bank / Cr 2335-2338 TDS`) and Supplier Advance disbursements with TDS. | Already calls `TdsDeterminationService`; ensure alignment with multi-section TDS chart. |
| **`TenantBootstrapService`** | `ERPSystem-boot/.../service/TenantBootstrapService.java` | Seeds default Schedule III COA including TDS accounts `2335`, `2336`, `2337`, `2338`. | Master accounts already exist in standard COA. |
| **`TdsRegisterReportPage`** | `ERPSystem-web-react/.../pages/TdsRegisterReportPage.tsx` | Frontend compliance workspace displaying TDS deductions, PAN status, law versions, and Form 26Q/140 reporting. | Existing frontend works cleanly with the backend `getTdsRegisterRecords` API. |

---

## 3. Preserving Existing Financial & Accounting Authorities

TDS deduction is **not** an independent ledger or a disconnected shadow payable system. It is a statutory statutory allocation of the buyer's liability to the vendor.

### Authoritative Document Flow:
```
Purchase Invoice (Taxable Base + GST)
       │
       ├──► 3-Way Match Gate (PO ↔ GRN ↔ Invoice)
       │
       ▼
PurchaseAccountingPostingService (Single Authoritative GL Poster)
       │
       ├──► Dr 2105 GRNI Clearing (Accrual Relief)
       ├──► Dr/Cr 4115 Purchase Price Variance (PPV Isolation)
       ├──► Dr 1251 / 1252 / 1253 Input GST (ITC Ledger)
       ├──► Dr 1211 Raw Materials (Sec 17(5) Blocked ITC Capitalization)
       ├──► Dr/Cr 4560 Fractional Round-Off Difference
       │
       ├──► Cr 2320 Trade Payables [Net AP = Gross - TDS] ──► erp_supplier.all_need_pay
       │
       └──► Cr 2335 / 2336 / 2337 / 2338 TDS Payable [Statutory Withholding]
                   │
                   └──► erp_tds_register (Authoritative Statutory Fact Table)
```

### Strict Architectural Invariants:
1. **No Second AP Engine:** `erp_supplier.all_need_pay` remains the single operational Accounts Payable control ledger.
2. **No Second GL Engine:** All double-entry postings route strictly through `GlEntryService.postEntries(...)` into `erp_gl_entry`.
3. **No Second GST Engine:** Input Tax Credit (ITC) calculation and Sec 17(5) blocked ITC logic remain 100% untouched.
4. **No Inventory / GRNI Contamination:** TDS affects **only** the credit side of the journal voucher; it **never** touches `2105 GRNI`, `1211 Inventory Asset`, or `4115 PPV`.

---

## 4. Statutory Rule Verification & Rate Matrix

The statutory provisions under Chapter XVII-B of the Income-tax Act, 1961 (and corresponding sections under the date-effective Income-tax Act, 2025) have been verified against authoritative CBDT notifications:

| Section | Nature of Payment | Payer / Payee Conditions | Single Transaction Threshold | Aggregate FY Threshold | Standard Rate (with Valid PAN) | Non-PAN Penalty Rate (Sec 206AA) | Lower Cert (Sec 197) | Schedule III Account Code & Name | Authoritative Circular / Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **194C** | Payments to Contractors & Subcontractors | • Payer: Any entity subject to audit / Company / Firm / Govt<br>• Payee: Resident Contractor | **₹30,000** | **₹1,00,000** | • **1.0%** (Individual / HUF)<br>• **2.0%** (Company / Firm / LLP / AOP) | **20.0%** | Concessional Rate u/s 197 (Form 13) | **`2335`** TDS Payable - Section 194C (Contractors) | CBDT Circular No. 23/2017; Sec 194C(1)/(2) |
| **194J (Tech)** | Fees for Technical Services (FTS), Royalty, Call Center | • Payee: Resident Consultant / Tech Service Provider | N/A | **₹30,000** | **2.0%** (Amended by FA 2020) | **20.0%** | Concessional Rate u/s 197 | **`2336`** TDS Payable - Section 194J (Professional Fees) | Finance Act 2020 Amendment; CBDT Circular 23/2017 |
| **194J (Prof)** | Professional Fees, Non-compete, Director Remuneration | • Payee: Resident Professional (Legal, Medical, Accountancy, etc.) | N/A (Director fees: ₹0) | **₹30,000** | **10.0%** | **20.0%** | Concessional Rate u/s 197 | **`2336`** TDS Payable - Section 194J (Professional Fees) | Section 194J(1); Sec 194J(1)(ba) |
| **194I (P&M)** | Rent of Plant, Machinery, Equipment | • Payee: Resident Lessor | N/A | **₹2,40,000** | **2.0%** | **20.0%** | Concessional Rate u/s 197 | **`2337`** TDS Payable - Section 194I (Rent) | Sec 194I(a); CBDT Circular No. 23/2017 |
| **194I (Land)** | Rent of Land, Building, Furniture, Fittings | • Payee: Resident Landlord / Lessor | N/A | **₹2,40,000** | **10.0%** | **20.0%** | Concessional Rate u/s 197 | **`2337`** TDS Payable - Section 194I (Rent) | Sec 194I(b); CBDT Circular No. 23/2017 |
| **194Q** | Purchase of Goods | • Buyer turnover > ₹10 Cr in preceding FY<br>• Resident Seller | N/A | **₹50,00,000** | **0.1%** (on excess over ₹50L) | **5.0%** *(Special proviso to Sec 206AA)* | Concessional Rate if configured | **`2338`** TDS Payable - Section 194Q (Purchase of Goods) | CBDT Circular No. 13/2021 dated 30-06-2021 |

---

## 5. Tax Base Determination Rules

### Authoritative Tax Base Definition:
$$\mathbf{TDS\ Base} = \mathbf{Total\ Taxable\ Value\ of\ Invoice\ (Excluding\ GST)}$$

### Verification of Component Treatment:

| Invoice Component | TDS Base Inclusion | Statutory Rationale & Authority |
| :--- | :---: | :--- |
| **Taxable Amount (Goods/Services)** | **YES** | Core consideration payable for supply. |
| **CGST / SGST / IGST / UTGST** | **NO** | **CBDT Circular No. 23/2017 (dated 19-July-2017):** Confirmed that wherever GST is indicated separately on the invoice, TDS under Chapter XVII-B must be deducted on the value without including the GST component. |
| **GST Compensation Cess** | **NO** | Excluded under Circular 23/2017 as part of indirect taxes. |
| **Freight / Transportation Inward** | **YES** *(if composite)* / **Per 194C** *(if separate)* | If freight is included in item taxable value as a composite supply, it forms part of the taxable base. If billed separately by a GTA, Section 194C applies. |
| **Other Incidental Packing/Loading** | **YES** | Forms part of the assessable taxable value. |
| **Section 170 Round-Off Difference** | **NO** | Pure fractional rounding adjustment ($\le \pm ₹0.50$); excluded from taxable base. |
| **Advance Payments (Uninvoiced)** | **YES (Gross)** | **CBDT Circular No. 13/2021 (Question 5):** When advance is paid before invoice issuance and GST component cannot be ascertained, TDS is deducted on the gross advance amount. Offset against invoice subsequently adjusts the balance. |
| **Credit Notes (Rate Difference / Rebate)** | **ADJUSTABLE** | TDS on original invoice is not re-opened in historical GL. Future TDS deductions are offset or reported in quarterly TDS correction statements (Form 26Q). |

---

## 6. Dedicated Section 194Q Special Review

### Forensic Verification of 194Q Mechanics:
1. **Applicability Threshold:** Applicable only if the buyer's gross turnover/sales in the preceding financial year exceeded **₹10,00,00,000 (₹10 Crore)**.
2. **Cumulative FY Threshold:** TDS applies only after cumulative purchases of goods from a resident seller exceed **₹50,00,000 (₹50 Lakh)** in the current financial year.
3. **Excess-Only Calculation:**
   - Case A ($\text{Prior Purchases} + \text{Current Invoice} \le ₹50\text{L}$): **No TDS**.
   - Case B ($\text{Prior Purchases} < ₹50\text{L} \land \text{Prior Purchases} + \text{Current Invoice} > ₹50\text{L}$):
     $$\text{Eligible Tax Base} = (\text{Prior Purchases} + \text{Current Taxable Amount}) - ₹50,00,000$$
     $$\text{TDS Amount} = \text{Eligible Tax Base} \times 0.1\% \quad (\text{or } 5.0\% \text{ if no PAN})$$
   - Case C ($\text{Prior Purchases} \ge ₹50\text{L}$):
     $$\text{Eligible Tax Base} = \text{Current Taxable Amount}$$
     $$\text{TDS Amount} = \text{Current Taxable Amount} \times 0.1\% \quad (\text{or } 5.0\% \text{ if no PAN})$$
4. **Non-PAN Rate Constraint (Sec 206AA Proviso):**
   - Unlike Sections 194C/J/I where non-PAN rate is **20.0%**, the second proviso to Section 206AA specifically caps the Section 194Q non-PAN rate at **5.0%**. The current implementation in `TdsDeterminationService.java` correctly sets `appliedRate = new BigDecimal("0.0500")`.
5. **Priority Over Section 206C(1H) (TCS):**
   - Section 194Q(5) stipulates that if TDS is deductible by the buyer under Section 194Q, the seller shall not collect TCS under Section 206C(1H).

---

## 7. Party / Vendor Master Data Architecture

### Existing Schema (`erp_supplier`):
- Existing fields: `id`, `supplier`, `contacts`, `phone_num`, `email`, `tax_num`, `type`, `all_need_pay`, `all_need_get`, `advance_in`, `tenant_id`, `delete_flag`.
- Note: `tax_num` currently stores either GSTIN (15 characters) or PAN (10 characters).

### Required Vendor Master Fields for TDS:
To support clean determination without redundant master tables:
1. **`entity_type`**: Enum/Varchar (`INDIVIDUAL_HUF`, `COMPANY_FIRM`, `TRUST_SOCIETY`, `GOVERNMENT`). Needed for Section 194C (1% vs 2%).
2. **`pan`**: Dedicated 10-character PAN column. (Auto-derived from GSTIN characters 3 to 12 if GSTIN present).
3. **`is_pan_valid`**: Tinyint/Boolean computed via regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`.
4. **`tds_applicable`**: Tinyint/Boolean flag (default `1` for commercial suppliers).
5. **`default_tds_section`**: Enum/Varchar (`SEC_194C`, `SEC_194J_TECH`, `SEC_194J_PROF`, `SEC_194I_PM`, `SEC_194I_LAND`, `SEC_194Q`, `EXEMPT`).
6. **`lower_tds_cert_no`**, **`lower_tds_rate`**, **`lower_tds_valid_from`**, **`lower_tds_valid_to`**: Optional fields for Section 197 concessional deduction certificates.

---

## 8. Financial-Year Aggregation & Threshold Reconstruction

Threshold tracking must be **deterministic, reproducible, and reconstructed directly from authoritative data**, not from volatile mutable counters.

### Cumulative Calculation Logic:
For any transaction on `transactionDate`, the Indian Financial Year is:
$$\text{FY Start} = \begin{cases} \text{Year}(D)\text{-04-01} & \text{if Month}(D) \ge \text{April} \\ (\text{Year}(D)-1)\text{-04-01} & \text{if Month}(D) < \text{April} \end{cases}$$
$$\text{FY End} = \begin{cases} (\text{Year}(D)+1)\text{-03-31} & \text{if Month}(D) \ge \text{April} \\ \text{Year}(D)\text{-03-31} & \text{if Month}(D) < \text{April} \end{cases}$$

### Reconstruction Query:
```sql
SELECT IFNULL(SUM(total_taxable_amount), 0)
FROM erp_purchase_invoice
WHERE tenant_id = :tenantId
  AND supplier_id = :supplierId
  AND status = 'POSTED'
  AND transaction_date >= :fyStartDate
  AND transaction_date < :currentTransactionDate
```

---

## 9. TDS Register Authority & Reconciled Invariants

### Invariant Equation:
$$\mathbf{Invoice\ Gross\ Total} = \mathbf{Net\ Trade\ Payables\ (2320)} + \mathbf{TDS\ Payable\ (2335\text{-}2338)}$$
$$\mathbf{TDS\ Register\ Sum} = \mathbf{GL\ TDS\ Liability\ Account\ Balance\ (Cr\ 2335\text{-}2338)}$$

### Reconciliation State Table:

| Source | Metric | Destination Ledger | Invariant Rule |
| :--- | :--- | :--- | :--- |
| **`erp_purchase_invoice`** | Gross Total | General Ledger | $\text{Dr Items/GRNI} + \text{Dr GST} \pm \text{Dr/Cr RoundOff} = \text{Cr AP} + \text{Cr TDS}$ |
| **`erp_tds_register`** | `tds_amount` | `erp_gl_entry` (Account 2335-2338) | Must exactly match line item credit on TDS account. |
| **`erp_supplier`** | `all_need_pay` | `erp_gl_entry` (Account 2320) | Must increment strictly by $\text{Gross Total} - \text{TDS Amount}$. |

---

## 10. GRNI & PPV Interaction (Phase 2F Integration)

In a 3-way matching purchase flow, Goods Receipt Note (GRN) and Purchase Invoice interact as follows:

```
1. Goods Receipt Note (GRN) Approved:
   Dr 1211 Raw Materials Inventory Asset              ₹1,00,000
   Cr 2105 GRNI Accrual Clearing Account                        ₹1,00,000

2. Purchase Invoice (with Price Variance & 194Q TDS):
   Dr 2105 GRNI Accrual Clearing Account              ₹1,00,000
   Dr 4115 Unfavorable Purchase Price Variance (PPV)    ₹10,000
   Dr 1251 Input CGST (9%)                               ₹9,900
   Dr 1252 Input SGST (9%)                               ₹9,900
   Cr 2320 Trade Payables (Net AP)                              ₹1,29,690
   Cr 2338 TDS Payable - Sec 194Q (0.1% on ₹1,10,000)                 ₹110

Check: Total Debits (₹1,29,800) == Total Credits (₹1,29,800).
TDS enters strictly as a credit split; GRNI, PPV, and Inventory asset valuation are 100% unaffected.
```

---

## 11. Reversal, Cancellation & Credit Note Behavior

When an invoice with TDS is cancelled or reversed:
1. **Append-Only Immutable Reversal:** `PurchaseAccountingPostingService.reversePurchaseInvoiceGeneralLedger` generates an inverse voucher (`PURCHASE_INVOICE_REVERSAL`):
   - $\text{Dr 2320 Trade Payables (Net AP Amount)}$
   - $\text{Dr 2335-2338 TDS Payable (TDS Amount)}$
   - $\text{Cr 2105 GRNI / 4110 Purchases / 1251-1253 GST / 4560 Round-off}$
2. **TDS Register Status Update:** The corresponding `erp_tds_register` record is updated to `status = 'CANCELLED'` (or a negative correction record is appended with `is_correction = 1` and `original_tds_id = X`).
3. **Supplier Payable Synchronization:** `erp_supplier.all_need_pay` is decremented strictly by `Net AP Amount`.

---

## 12. Idempotency & Concurrency Guarantees

1. **Pessimistic Row Lock:** `SELECT id FROM erp_purchase_invoice WHERE id = ? FOR UPDATE` prevents concurrent duplicate processing.
2. **GL Duplicate Gate:** `glEntryMapper.countByVoucher(tenantId, "PURCHASE_INVOICE", invoiceId)` guarantees that repeated API triggers or HTTP timeouts skip GL re-posting.
3. **TDS Register Idempotency:** Check existence of active deduction record for `(tenant_id, source_document_type, source_document_id)` prior to insert.

---

## 13. Multi-Tenant Isolation

1. All queries in `TdsDeterminationService`, `PurchaseAccountingPostingService`, and `erp_tds_register` filter strictly by `tenant_id`.
2. FY purchase history aggregation for a vendor is isolated strictly within the calling tenant. No cumulative vendor turnover or PAN data leaks across tenant boundaries.

---

## 14. Fiscal Period Lock Compatibility

1. Phase 4A TDS engine posts all GL journals through `GlEntryService.postEntries(...)` and `glEntryService.reverseEntries(...)`.
2. When Phase 4C (Fiscal Period Locking) is implemented, `GlEntryService` will enforce `isPeriodOpen(tenantId, postingDate)`. No TDS journal will bypass this future validation gate.

---

## 15. Frontend Scope & UI Verification

1. **Display & Simulation:** In `GstPurchaseInvoiceFormModal.tsx`, estimated TDS and Net Payable should be computed live for preview using the same calculation rules.
2. **Non-Authoritative Client:** The frontend **never** dictates the TDS amount, rate, threshold check, or GL lines. The backend `TdsDeterminationService` and `PurchaseAccountingPostingService` remain the sole authorities upon submission.
3. **TDS Register Report:** `TdsRegisterReportPage.tsx` provides viewing, filtering, and export capabilities for Form 26Q and Form 140 compliance returns.

---

## 16. Test Matrix Specification (Required Integration Tests)

The future Phase 4A implementation test suite (`TdsAccountingIntegrationTest.java`) must cover:

| Test Case ID | Section & Scenario | Test Description & Verifiable Assertion |
| :--- | :--- | :--- |
| **TC-TDS-01** | Section 194C Individual | Contractor payment to Individual with PAN $\rightarrow$ 1.0% TDS deducted; Cr 2335, Cr 2320 (Net), `erp_tds_register` populated. |
| **TC-TDS-02** | Section 194C Company | Contractor payment to Private Limited Company with PAN $\rightarrow$ 2.0% TDS deducted; Cr 2335. |
| **TC-TDS-03** | Section 194C Threshold | Single invoice $\le$ ₹30,000 with cumulative FY $\le$ ₹1,00,000 $\rightarrow$ 0% TDS. |
| **TC-TDS-04** | Section 194C No PAN | Payee missing valid PAN $\rightarrow$ 20.0% TDS penalty rate u/s 206AA applied. |
| **TC-TDS-05** | Section 194J Technical | Fees for Technical Services $\rightarrow$ 2.0% TDS deducted u/s 194J; Cr 2336. |
| **TC-TDS-06** | Section 194J Professional | Legal / Professional Fees $\rightarrow$ 10.0% TDS deducted u/s 194J; Cr 2336. |
| **TC-TDS-07** | Section 194I P&M Rent | Rent of Plant & Machinery $\rightarrow$ 2.0% TDS deducted u/s 194I; Cr 2337. |
| **TC-TDS-08** | Section 194I Land Rent | Factory Building Rent $\rightarrow$ 10.0% TDS deducted u/s 194I; Cr 2337. |
| **TC-TDS-09** | Section 194Q Threshold | Cumulative FY purchases $\le$ ₹50L $\rightarrow$ 0% TDS; cumulative crosses ₹50L $\rightarrow$ 0.1% TDS on excess only; Cr 2338. |
| **TC-TDS-10** | Section 194Q No PAN | Goods purchases exceeding ₹50L with invalid/no PAN $\rightarrow$ 5.0% TDS (not 20%) capped under Sec 206AA proviso. |
| **TC-TDS-11** | Section 197 Lower Cert | Valid Form 13 certificate provided $\rightarrow$ Concessional rate (e.g. 0.5%) applied and certificate number recorded. |
| **TC-TDS-12** | 3-Way Match & GRNI | Purchase Invoice matching GRN with PPV and TDS $\rightarrow$ Dr 2105 GRNI, Dr/Cr 4115 PPV, Dr 1251-1253 GST, Cr 2320 Net AP, Cr 2335-2338 TDS. Balanced entry. |
| **TC-TDS-13** | Append-Only Reversal | Cancelling invoice with TDS $\rightarrow$ Reverse GL voucher posted; `erp_tds_register` status marked `CANCELLED`; `all_need_pay` restored. |
| **TC-TDS-14** | Idempotency & Retries | Duplicate invoice posting calls $\rightarrow$ GL posted exactly once; TDS register created exactly once. |
| **TC-TDS-15** | Multi-Tenant Isolation | Simultaneous transactions in Tenant 1 and Tenant 2 $\rightarrow$ Zero leakage of vendor FY turnover or TDS records. |

---

## 17. Forensic Findings & Issue Classification

| Defect / Finding ID | Severity | Category | Description & Impact | Resolution Strategy in Phase 4A Implementation |
| :--- | :---: | :--- | :--- | :--- |
| **FINDING-P1-01** | **P1** | Accounting Authority | `PurchaseAccountingPostingService` currently credits 100% of `grossTotal` to `ACC_TRADE_PAYABLES (2320)` without splitting statutory TDS into `2335-2338`. | Refactor `postPurchaseInvoiceToGeneralLedger` to accept TDS parameters and post balanced split: $\text{Cr 2320 (Net)} + \text{Cr 2335-2338 (TDS)}$. |
| **FINDING-P1-02** | **P1** | AP Ledger Balance | `erp_supplier.all_need_pay` currently increases by `grossTotal` rather than `Net AP` ($\text{Gross} - \text{TDS}$), causing vendor ledger to overstate net payable cash liability. | Update `erp_supplier.all_need_pay` with `Net AP` ($\text{grossTotal} - \text{tdsAmount}$). |
| **FINDING-P2-01** | **P2** | Master Data | `erp_supplier` lacks explicit fields for `entity_type` (Individual vs Company) and `default_tds_section`. | Add non-breaking nullable columns to `erp_supplier` or maintain helper mapping during bootstrap. |
| **FINDING-P2-02** | **P2** | Service Coverage | `TdsDeterminationService` currently supports Section 194Q and generic advance payments, but needs explicit rules for Sections 194C, 194J, and 194I. | Extend `TdsDeterminationService.determineTds(...)` to support Section enum selection and multi-threshold evaluation. |
| **FINDING-P3-01** | **P3** | Frontend UX | `GstPurchaseInvoiceFormModal.tsx` does not show a live preview of estimated TDS deduction before invoice submission. | Add live preview cards in the invoice modal displaying Taxable Base, TDS Section, Rate, TDS Withheld, and Net Payable. |

---

## 18. Recommended Implementation Architecture

```
                                 [Purchase Invoice Creation / Posting]
                                                 │
                                                 ▼
                                     [TdsDeterminationService]
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │ Evaluates:                    │
                                 │ 1. Vendor PAN & Entity Type   │
                                 │ 2. TDS Section & Rates        │
                                 │ 3. Single / FY Thresholds     │
                                 │ 4. Lower Cert (Sec 197)       │
                                 │ 5. Date-Effective Law Regime  │
                                 └───────────────┬───────────────┘
                                                 │
                                 Returns: TdsDeterminationResultDto
                                 (Base, Rate, TDS Amount, Account Code)
                                                 │
                                                 ▼
                               [PurchaseAccountingPostingService]
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │ 1. Debits:                    │
                                 │    - GRNI (2105) / Direct Exp │
                                 │    - PPV (4115)               │
                                 │    - Input GST (1251-1253)    │
                                 │    - Sec 17(5) ITC (1211)     │
                                 │    - Round-off (4560)         │
                                 │                               │
                                 │ 2. Credits:                   │
                                 │    - Net Trade Payables (2320)│
                                 │    - TDS Payable (2335-2338)  │
                                 │                               │
                                 │ 3. Mutates:                   │
                                 │    - erp_supplier.all_need_pay│
                                 │    - erp_tds_register         │
                                 │    - erp_gl_entry (Immutable) │
                                 └───────────────────────────────┘
```

---

## 19. Open Questions & Resolution Status

- **Q1: Should Section 194Q be auto-determined based on total vendor turnover or manually selected?**  
  *Resolution:* The engine should auto-evaluate Section 194Q based on cumulative FY purchase history and buyer turnover configuration, while allowing the procurement officer to select other applicable sections (194C, 194J, 194I) based on the nature of supply.
- **Q2: Does TDS apply on GST if not broken down?**  
  *Resolution:* Per CBDT Circular 23/2017, if GST is broken down on the invoice, TDS applies strictly on the taxable base. If unsegregated (e.g. advance without invoice), TDS applies on the gross amount.
- **Q3: Are any blocking dependencies unresolved?**  
  *Resolution:* **None.** All Schedule III COA accounts (`2335`, `2336`, `2337`, `2338`), database tables (`erp_tds_register`, `erp_gl_entry`), and posting services are in place.

---

## 20. Conclusion & Final Status

The forensic architecture validation for Phase 4A confirms that the existing codebase, Chart of Accounts, and statutory frameworks are completely sound and ready for implementation.

```
================================================================================
PHASE 4A PRE-IMPLEMENTATION VALIDATION = READY
================================================================================
```
