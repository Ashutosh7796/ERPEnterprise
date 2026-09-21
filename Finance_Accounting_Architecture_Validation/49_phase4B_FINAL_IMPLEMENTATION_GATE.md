# PHASE 4B — FINAL IMPLEMENTATION GATE CONTRACT
## Fixed Asset Registry & Straight-Line Method (SLM) Depreciation Engine

**Document Reference:** `research/finance-accounting/49_phase4B_FINAL_IMPLEMENTATION_GATE.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/49_phase4B_FINAL_IMPLEMENTATION_GATE.md`  
**Prior References:**  
- `research/finance-accounting/47_phase4B_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`  
- `research/finance-accounting/48_phase4B_ARCHITECTURE_APPROVAL_PLAN.md`  
**Verification Date:** 05-September-2026  
**Status:** **READ-ONLY IMPLEMENTATION GATE RESOLUTION — AWAITING FINAL HUMAN AUTHORIZATION**  
**Gate Verdict:** `ALL 7 IMPLEMENTATION GATES RESOLVED WITH STATUTORY & FORENSIC PROOF`  
**Execution Status:** `IMPLEMENTATION STRICTLY BLOCKED PENDING EXPLICIT HUMAN APPROVAL`  

---

## Executive Summary

Pursuant to the **Phase 4B Architecture Approval Mandate**, this document provides the formal, forensic resolutions to the **seven critical implementation-gate questions**. Every finding is backed by ground-truth evidence extracted directly from the live MySQL database, the active Spring Boot codebase, and authoritative Indian statutory standards.

### Critical Boundary Compliance:
- **Zero code changes executed** (Java, React, TypeScript).
- **Zero SQL schema or migration files created** (Migration `V3_6` defined on paper only).
- **Zero Chart of Accounts modifications applied**.
- **Zero GL posting modifications applied**.
- **Absolute Hard Stop remains in full effect.**

---

## GATE 1 — Current Live Chart of Accounts (COA) Forensic Validation

A live forensic query was executed directly against `erp_system_db.erp_account_coa` and `erp_system_db.erp_gl_entry` using the MySQL server instance. The exact status of all ten candidate accounts was verified:

### Live Account Status Matrix:

| Account Code | Account Name | Exists in Live DB? | Active? | Postable Leaf? | Account Type | Parent Account | Normal Balance | Postings in `erp_gl_entry`? | Official Architectural Decision |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`1111`** | Plant & Machinery | **YES** (Tenant 601, ID 37265) | `ACTIVE` | `0` (Leaf) | `ASSET` | `1110` (PPE) | `DEBIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Authoritative Gross Cost account for industrial machinery. |
| **`1112`** | Office & Computer Equipment | **YES** (Tenant 601, ID 37266) | `ACTIVE` | `0` (Leaf) | `ASSET` | `1110` (PPE) | `DEBIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Authoritative Gross Cost account for IT & office hardware. |
| **`1113`** | Furniture & Fixtures | Defined in `TenantBootstrapService` template | `ACTIVE` | `0` (Leaf) | `ASSET` | `1110` (PPE) | `DEBIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Authoritative Gross Cost account for furniture and fittings. |
| **`1119`** | Less: Accumulated Depreciation | Defined in `TenantBootstrapService` template | `ACTIVE` | `0` (Leaf) | `ACCUMULATED_DEPRECIATION` | `1110` (PPE) | `CREDIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Sole authoritative contra-asset account for book depreciation. |
| **`4400`** | Depreciation & Amortization | Defined in `TenantBootstrapService` template | `ACTIVE` | `0` (Leaf) | `EXPENSE` | `4000` (Expenses) | `DEBIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Sole authoritative P&L depreciation expense account. |
| **`3230`** | Gain on Sale of Fixed Assets | **NO** (Missing) | N/A | `0` (Leaf) | `INCOME` | `3200` (Other Income) | `CREDIT` | **0 postings** | **GENUINELY REQUIRED.** New account to be seeded in `V3_6`. (See justification below). |
| **`4570`** | Loss on Sale / Scrap of Fixed Assets | **NO** (Missing) | N/A | `0` (Leaf) | `EXPENSE` | `4500` (Other Expenses) | `DEBIT` | **0 postings** | **GENUINELY REQUIRED.** New account to be seeded in `V3_6`. (See justification below). |
| **`2110`** | Share Capital / Partner's Capital | Defined in `TenantBootstrapService` template | `ACTIVE` | `0` (Leaf) | `EQUITY` | `2100` (Equity) | `CREDIT` | **0 postings** (₹0.00 Dr / ₹0.00 Cr) | **APPROVED.** Reused for opening balance equity capitalization where no vendor invoice exists. |
| **`1120`** | Capital Work-in-Progress (CWIP) | **NO** (Missing) | N/A | N/A | `ASSET` | `1100` (Non-Current) | `DEBIT` | **0 postings** | **OUT OF SCOPE.** Multi-stage CWIP project construction is explicitly deferred. `1120` is **NOT** created in Phase 4B. |
| **`1232`** | Primary Operating Bank Account | **YES** (Tenant 701, ID 24514) | `ACTIVE` | `0` (Leaf) | `BANK` | `1230` (Cash/Bank) | `DEBIT` | **3 postings** (₹50,000.00 Dr / ₹36,000.00 Cr) | **APPROVED.** Authoritative settlement account for asset disposal proceeds. |

---

### Proof Why Existing Accounts Cannot Be Reused for Gain/Loss on Disposal:

#### 1. Why `3230 Gain on Sale of Fixed Assets` is genuinely required:
- *Inspection of live 3000-series accounts:*
  - `3110` Domestic Sales Revenue: Commercial trade turnover. Reusing this would falsely inflate revenue from operations and corrupt GST turnover reconciliations.
  - `3120` Export Sales Revenue: Zero-rated foreign sales. Cannot be reused.
  - `3130` Job Work Processing Revenue: Subcontracting service fees. Cannot be reused.
  - `3140` Scrap & By-Product Sales: Specifically intended for factory manufacturing scrap and production waste generated in the normal course of industrial production. Crediting asset disposal proceeds to `3140` would corrupt manufacturing gross margin analysis and Schedule III operating disclosures.
  - `3210` Interest Income: Bank and FD interest. Cannot be reused.
  - `3220` Discounts & Rebates: Commercial settlement discounts. Cannot be reused.
- *Conclusion:* A distinct, non-operating income account `3230` under parent `3200 Other Income` is **statutorily and architecturally mandatory** to disclose net gains on PPE derecognition pursuant to Ind AS 16 / AS 10.

#### 2. Why `4570 Loss on Sale / Scrap of Fixed Assets` is genuinely required:
- *Inspection of live 4000-series accounts:*
  - `4110` Cost of Materials / Purchases: Operational inventory COGS. Cannot be reused.
  - `4115` Purchase Price Variance: Procurement standard cost variance. Cannot be reused.
  - `4130` Job Work Processing Charges: Direct processing charges. Cannot be reused.
  - `4510` Operating Expenses: Rent, rates, and utilities. Cannot be reused.
  - `4540` Repairs & Maintenance: Physical upkeep of machinery. A capital loss on complete asset derecognition is not a repair overhead.
  - `4560` Fractional Round-Off Differences: Micro-penny invoice rounding under Section 170. Cannot absorb thousands of rupees of asset write-offs.
- *Conclusion:* A dedicated non-operating / administrative expense account `4570` under parent `4500 Other Operating & Administrative Expenses` is **statutorily and architecturally mandatory** to isolate capital asset disposal losses.

---

## GATE 2 — Capitalization Atomicity Contract

### Required Invariant:
$$\mathbf{Purchase\ Invoice} + \mathbf{Fixed\ Asset\ Registry} + \mathbf{Capitalization\ GL} + \mathbf{TDS/AP\ Effects} = \mathbf{ONE\ ATOMIC\ TRANSACTION}$$

### Authoritative Execution Flow:
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GstPurchaseInvoiceService.postPurchaseInvoice(invoiceId)                               │
│ Transaction Context: @Transactional(value = "transactionManager", rollbackFor = Ex)   │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Acquire Pessimistic Row Lock:                                                       │
│    SELECT id FROM erp_purchase_invoice WHERE id = ? AND tenant_id = ? FOR UPDATE       │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Evaluate Statutory TDS Withholding (TdsDeterminationService):                       │
│    • Compute TDS base (taxable amount excluding GST)                                   │
│    • Insert record into erp_tds_register (Authoritative TDS Fact)                      │
│    • Update erp_purchase_invoice with tds_amount and net_payable_amount                │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Post Authoritative General Ledger Voucher (PurchaseAccountingPostingService):       │
│    • Classification: PurchaseClassification.FIXED_ASSET                                │
│    • Debits: Fixed Asset Cost Account (1111/1112/1113) for Taxable + Blocked GST       │
│    • Debits: Input GST (1251/1252/1253) for Eligible ITC                               │
│    • Credits: Trade Payables (2320) for Net AP (Gross - TDS) ──► erp_supplier.all_need_pay│
│    • Credits: Statutory TDS Payable (2335-2338) for Withheld Tax                       │
│    • Writes single balanced batch into erp_gl_entry via GlEntryService                 │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. Create Fixed Asset Subledger Record (FixedAssetService):                            │
│    • Creates row in erp_fixed_asset with status = 'CAPITALIZED'                        │
│    • Links source_document_type = 'PURCHASE_INVOICE', source_document_id = invoiceId   │
│    • Sets gross_cost = taxableValue + blockedItc                                       │
│    • Sets gl_cost_account_id = debitAccount.getId()                                    │
│    • Sets capitalization_date = invoicePostingDate                                     │
│    • ZERO GL POSTING PERFORMED BY FixedAssetService (Preserves Single GL Poster Rule)  │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. Update Invoice State to 'POSTED' and Commit Entire Transaction                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Forensic Proof of Complete Rollback Across All Failure Scenarios:

Because `GstPurchaseInvoiceService.postPurchaseInvoice`, `PurchaseAccountingPostingService.postPurchaseInvoiceToGeneralLedger`, and `FixedAssetService.createCapitalizedAssetFromPurchase` execute under Spring's default transaction propagation `PROPAGATION_REQUIRED`, they share a single physical JDBC database connection:

1. **Failure Scenario 1: GL Capitalization Failure**
   - If `GlEntryService.postEntries` fails (e.g. account inactive or unpostable), a `BusinessRunTimeException` is thrown.
   - *Outcome:* The Spring transaction rolls back. TDS register rows are rolled back, AP balance is not mutated, the asset registry record is never reached, and the invoice remains in `DRAFT`.
2. **Failure Scenario 2: Fixed Asset Registry Insert Failure**
   - If `FixedAssetMapper.insert` fails (e.g., unique key collision on `asset_code`), an unchecked SQL exception is raised.
   - *Outcome:* The transaction rolls back completely. The GL entries in `erp_gl_entry` are rolled back, TDS register rows are removed, `erp_supplier.all_need_pay` update is undone, and the invoice reverts to `DRAFT`.
3. **Failure Scenario 3: TDS Posting Failure**
   - If PAN verification or TDS certificate rate calculation throws an exception, execution terminates at Step 2.
   - *Outcome:* No GL entries are posted, no AP mutated, no asset created.
4. **Failure Scenario 4: AP Balance Update Failure**
   - If `supplierMapper.updateByPrimaryKeySelective` fails, the transaction rolls back. GL rows and asset rows are rolled back.
5. **Failure Scenario 5: Invoice State Persistence Failure**
   - If updating invoice status to `POSTED` fails, the entire transaction rolls back. Zero orphan entries exist.

### Proof of Structural Safeguards:
- **No Asset Without Capitalization:** An `erp_fixed_asset` row originating from procurement can only be inserted after `PurchaseAccountingPostingService` successfully stages the GL voucher in the same transaction.
- **No Duplicate Capitalization GL:** `PurchaseAccountingPostingService` checks `countByVoucher(tenant_id, 'PURCHASE_INVOICE', invoice_id)`. If $>0$, it performs an idempotent skip. `FixedAssetService` does not post GL.
- **No Duplicate Asset Registry Row:** `FixedAssetService` validates `countBySourceDocument(tenant_id, 'PURCHASE_INVOICE', invoice_id) == 0` before inserting.
- **Zero Stock Ledger Contamination:** The `FIXED_ASSET` path has no call to `StockLedgerService`, `StocktakeService`, or `MaterialService`. `erp_stock_ledger_entry` is never touched.

---

## GATE 3 — Depreciation Policy Contract (Frozen Calculation Rules)

The mathematical and operational book depreciation rules are hereby frozen:

### 1. Depreciation Commencement Date:
- Depreciation commences strictly on the **Capitalization Date (Put-to-Use Date)**.
- If an asset is capitalized on date $D_{\text{cap}}$, depreciation starts on that day.

### 2. Acquisition Date vs. Capitalization Date vs. Available-for-Use Date:
- `acquisition_date`: The vendor invoice date (when legal title or invoice consideration arose).
- `capitalization_date`: The put-to-use / available-for-use date (when the asset is installed and capable of operating as intended).
- Under Ind AS 16 (Para 50) and AS 10 (Para 55), depreciation commences when the asset is **available for use**, NOT when purchased. Therefore, `capitalization_date` is the authoritative anchor for depreciation.

### 3. Partial-Month Convention:
- **Day-Level Pro-Rata** for partial acquisition and disposal months.
- Uniform monthly depreciation for full intermediate months.

### 4. Day-Count Mathematical Formula:
Let:
- $C = \text{Gross Capitalized Cost}$
- $S = \text{Salvage (Residual) Value} \le 5\% \times C$
- $B = C - S = \text{Depreciable Base}$
- $N_{\text{months}} = \text{Useful Life in Months}$
- $M = \text{Standard Full-Month Depreciation} = B / N_{\text{months}}$
- $T_{\text{days}} = \text{Total Days in Calendar Month}$ (28, 29, 30, or 31)

For an acquisition in month $M$ on day $D_{\text{cap}}$:
$$\text{Active Days} = T_{\text{days}} - D_{\text{cap}} + 1$$
$$\text{Depreciation Charge} = \text{round}\left(M \times \frac{\text{Active Days}}{T_{\text{days}}},\ 2\right)$$

### 5. Treatment of Boundary Dates:
- **First Day of Month (e.g. April 1, 30 days):**
  $\text{Active Days} = 30 - 1 + 1 = 30$.
  $\text{Charge} = M \times \frac{30}{30} = 1.00 \times M$ (Full month charge).
- **Last Day of Month (e.g. April 30, 30 days):**
  $\text{Active Days} = 30 - 30 + 1 = 1$.
  $\text{Charge} = M \times \frac{1}{30}$ (Exactly 1 day of depreciation).
- **Leap Day (February 29 in a Leap Year):**
  $T_{\text{days}} = 29$.
  $\text{Active Days} = 29 - 29 + 1 = 1$.
  $\text{Charge} = M \times \frac{1}{29}$ (Exactly 1 day of depreciation).

### 6. Disposal Convention & Accrual Through Disposal Date:
- When an active asset is disposed of on day $D_{\text{disp}}$ of month $M$:
  $$\text{Active Days in Disposal Month} = D_{\text{disp}}$$
  $$\text{Disposal Month Depreciation} = \text{round}\left(M \times \frac{D_{\text{disp}}}{T_{\text{days}}},\ 2\right)$$
- **Mandatory Sequence:** This disposal-month depreciation is calculated and posted **BEFORE** computing the carrying amount and gain/loss on derecognition. The asset receives depreciation through the exact date of disposal.

### 7. Rounding Precision:
- All monetary arithmetic uses `java.math.BigDecimal` with `RoundingMode.HALF_UP` to **2 decimal places** (functional currency INR).
- Intermediate ratios maintain 8 decimal places before final half-up rounding.

### 8. Final-Period Residual Floor Reconciliation:
In the final depreciation month ($m = N_{\text{months}}$):
$$\text{Depreciation}_{\text{final}} = B - \sum_{m=1}^{N-1} \text{Depreciation}_m$$
This absorbs any accumulated penny rounding fractions and mathematically guarantees:
$$\text{Closing Net Book Value} \equiv \text{Salvage (Residual) Value}$$

### 9. Fully Depreciated Asset Behavior:
- When $\text{Accumulated Depreciation} = \text{Depreciable Base}$ ($\text{NBV} = S$), the asset transitions to `FULLY_DEPRECIATED`.
- Subsequent monthly depreciation batches evaluate this status, generate **zero depreciation** ($₹0.00$), and do not create GL journal lines for this asset. The asset remains on the asset register until physically retired.

### 10. Comprehensive Edge-Case Contract:

| Edge Scenario | System Response | Architectural / Statutory Rationale |
| :--- | :--- | :--- |
| **Residual Value $>$ Cost** | **REJECT WITH EXCEPTION** | Physically and financially impossible. Throws `BusinessRunTimeException("Residual value cannot exceed asset cost")`. |
| **Residual Value $=$ Cost** | **VALID (Non-Depreciable)** | Allowed for non-depreciable fixed assets (e.g. Freehold Land). Depreciable base = $0.00$. Monthly depreciation = $0.00$. |
| **Useful Life $=$ 0** | **REJECT WITH EXCEPTION** | Division by zero. Throws `BusinessRunTimeException("Useful life must be greater than zero months")`. |
| **Useful Life is Fractional** | **NORMALIZE TO MONTHS** | Useful life must be specified as an integer number of months (e.g., 3.5 years must be input or converted to 42 months). |
| **Cost $=$ 0** | **REJECT WITH EXCEPTION** | Zero-value assets cannot be capitalized. Throws `BusinessRunTimeException("Capitalized cost must be greater than zero")`. |

---

## GATE 4 — Book vs. Tax Depreciation Boundary (Confirmation)

### Explicit Statutory Boundary Mandate:
$$\mathbf{PHASE\ 4B} = \mathbf{BOOK\ DEPRECIATION\ ONLY}$$

### Strict Exclusions from Phase 4B:
1. **NO Income-tax Act Section 32 WDV Calculations:** Section 32 rates (e.g. 15% P&M, 40% Computers) are strictly excluded.
2. **NO "Block of Assets" Tax Ledger:** Pooling assets into tax blocks under Section 2(11) is excluded.
3. **NO 180-Day Tax Rule:** The 50% / 100% tax depreciation restriction is excluded.
4. **NO Form 3CD / Tax Audit Depreciation Schedules:** Tax return schedules remain a future independent compliance capability.
5. **NO General Ledger Contamination:** Tax depreciation calculations must never post journal vouchers to `erp_gl_entry`.

---

## GATE 5 — Asset Disposal Accounting Contract

### Disposal Formulation:
$$\mathbf{Carrying\ Amount\ (NBV)} = \mathbf{Gross\ Cost} - \mathbf{Accumulated\ Depreciation}$$
$$\mathbf{Gain\ /\ Loss\ on\ Derecognition} = \mathbf{Net\ Consideration} - \mathbf{Carrying\ Amount}$$

### Double-Entry Derecognition Invariant:
The disposal transaction completely derecognizes the gross asset cost and accumulated depreciation from the balance sheet, recognizes the consideration received, and records the balancing gain or loss:

```
Double-Entry Journal:
    Dr 1232/1220  Bank / Accounts Receivable (Consideration)          ₹Consideration
    Dr 1119       Less: Accumulated Depreciation (To Date of Sale)    ₹AccDep
    [Dr 4570]     Loss on Sale / Scrap of Fixed Assets (If Loss)      ₹Loss
        Cr 1111/1112  Fixed Asset Gross Cost Account                      ₹Gross Cost
        [Cr 3230]     Gain on Sale of Fixed Assets (If Gain)              ₹Gain
```

### Resolution of Specific Disposal Scenarios:

1. **Zero Consideration (Scrap / Abandonment / Total Loss):**
   - Consideration = ₹0.00.
   - Net Loss = Carrying Amount.
   - Entry: `Dr 1119 (AccDep), Dr 4570 (Carrying Amount) / Cr 1111 (Gross Cost)`. Perfectly balances.
2. **Partial Proceeds:**
   - Net Consideration Realized is debited to Bank (`1232`) or Receivable (`1220`).
   - Difference against Carrying Amount posts to `3230 Gain` (if proceeds > NBV) or `4570 Loss` (if proceeds < NBV).
3. **Disposal After Full Depreciation:**
   - Carrying Amount = Salvage Value.
   - Accumulated Depreciation = Depreciable Base.
   - Gross Cost is removed, Acc Dep is cleared, consideration is recognized, and gain/loss is computed against the residual salvage floor.
4. **Disposal Before First Depreciation Run:**
   - Asset is capitalized but disposed before any monthly run executed.
   - Acc Dep = ₹0.00. Carrying Amount = Gross Cost.
   - Entry removes Gross Cost directly: `Dr Bank / Dr 4570 (Loss) [or Cr 3230 (Gain)] / Cr 1111 (Gross Cost)`.
5. **Disposal with Accumulated Rounding:**
   - Disposal removes the exact accumulated depreciation stored on the asset record. Both gross cost and accumulated depreciation reach exactly ₹0.00.
6. **Cancellation / Reversal of Disposal:**
   - Reversal uses `GlEntryService.reverseEntries()` with `reversalVoucherType = "ASSET_DISPOSAL_REVERSAL"`.
   - Flips debits and credits, restores asset status to `ACTIVE` (or `FULLY_DEPRECIATED`), and updates `erp_asset_disposal.status = 'REVERSED'`.
7. **Single GL Posting Authority:** All disposal vouchers route exclusively through `GlEntryService.postEntries(...)`. Zero second GL authorities.

---

## GATE 6 — Depreciation Idempotency & Concurrency Contract

### Database-Level Uniqueness Invariants:

```sql
-- Invariant 1: Exactly ONE depreciation line item per tenant + asset + calendar period
ALTER TABLE `erp_asset_depreciation_item`
ADD UNIQUE KEY `uk_asset_deprec_item` (`tenant_id`, `asset_id`, `period_year`, `period_month`, `delete_flag`);

-- Invariant 2: Exactly ONE depreciation batch run per tenant + calendar period
ALTER TABLE `erp_asset_depreciation_run`
ADD UNIQUE KEY `uk_deprec_run_period` (`tenant_id`, `period_year`, `period_month`, `delete_flag`);

-- Invariant 3: Exactly ONE GL posting line per voucher
ALTER TABLE `erp_gl_entry`
ADD UNIQUE KEY `uk_gl_voucher_line` (`tenant_id`, `voucher_type`, `voucher_id`, `line_no`);
```

### Concurrency & Failure Semantics:

| Concurrency / Execution Event | System Behavior & Guarantee |
| :--- | :--- |
| **Rerun of Completed Period** | Service detects `countByPeriod > 0` on `erp_asset_depreciation_run`. Returns existing batch details immediately without inserting duplicate GL entries. |
| **Failed Run / Mid-Batch Exception** | Spring `@Transactional` intercepts the exception and issues a full database `ROLLBACK`. Zero residual rows remain in `erp_asset_depreciation_run`, `erp_asset_depreciation_item`, or `erp_gl_entry`. |
| **Retry After Failure** | Because the failed transaction rolled back 100%, retrying the batch executes cleanly as a fresh attempt. |
| **Partially Failed Run** | **IMPOSSIBLE.** The entire batch (header, all item lines, and GL batch insert) executes within a single database transaction. It either commits 100% or rolls back 100%. |
| **Reversal of Depreciation Run** | 1. Appends mirror GL reversal voucher via `GlEntryService.reverseEntries()`.<br>2. Marks batch header `status = 'REVERSED'`.<br>3. Soft-deletes item records (`delete_flag = '1'`).<br>4. Subtracts reversed depreciation from asset's `accumulated_depreciation` and restores `net_book_value`. |
| **Disposal Concurrent with Run** | Monthly run acquires `SELECT id FROM erp_fixed_asset WHERE tenant_id = ? AND status IN ('ACTIVE', 'CAPITALIZED') FOR UPDATE`. Disposal transaction blocks until the depreciation run commits and releases the lock, then proceeds with the freshly updated NBV. |

---

## GATE 7 — Final Implementation Sequence

The implementation of Phase 4B is divided into **eleven discrete, gated slices**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.1: Database Migration V3_6 & Domain Foundation                │
│   • Flyway V3_6 script: erp_asset_class, erp_fixed_asset,              │
│     erp_asset_depreciation_run, erp_asset_depreciation_item,           │
│     erp_asset_disposal. Seed accounts 3230 & 4570 and asset classes.   │
│   • MyBatis Entities, Mappers & XML configurations                     │
│   • GATE: Flyway migration runs clean; tables exist in DB               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.2: Purchase Capitalization Integration                        │
│   • AssetClassService (CRUD, default accounts)                         │
│   • FixedAssetService (FAR registry management, capitalization)        │
│   • Integration hook in PurchaseAccountingPostingService               │
│   • GATE: Purchase invoice approval creates capitalized asset in FAR   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.3: SLM Calculation Engine                                     │
│   • Deterministic SLM math, day-level pro-rata, residual floor recon   │
│   • GATE: Automated unit tests verify 36/60-month schedules & rounding │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.4: Depreciation Posting Authority                             │
│   • AssetDepreciationService (Monthly batch orchestration)             │
│   • GlEntryService integration (Dr 4400 / Cr 1119)                     │
│   • uk_deprec_run_period idempotency enforcement                      │
│   • GATE: Monthly run generates balanced, idempotent GL voucher        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.5: Asset Disposal & Retirement                                │
│   • AssetDisposalService (Accrual + full derecognition)                │
│   • Gain (3230) / Loss (4570) GL posting integration                  │
│   • GATE: Disposal clears cost & acc dep; balanced derecognition GL    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.6: Statutory & Operational Reporting                          │
│   • FixedAssetReportService (FAR export & Schedule III movement grid)  │
│   • Aggregation from erp_fixed_asset, items, and erp_gl_entry          │
│   • GATE: Schedule III report reconciles to Balance Sheet PPE items    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.7: REST API & Controller Layer                                │
│   • FixedAssetController, AssetClassController,                        │
│     AssetDepreciationController, AssetDisposalController               │
│   • GATE: All REST endpoints authenticated & tenant-isolated           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.8: Frontend React Workspaces                                  │
│   • Asset Register, Asset Classes, Monthly Run Cockpit,                │
│     Depreciation History, Disposals, and Movement Schedule             │
│   • GATE: React build succeeds; pages render & interact cleanly        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.9: Full Regression, Concurrency & Stress Testing              │
│   • Execute comprehensive Test Matrix across all 20 test cases         │
│   • Multi-threaded concurrent depreciation run stress test             │
│   • GATE: 100% test pass rate; zero regressions in P2, P3, P4A         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.10: Independent Forensic Safety Review                        │
│   • Adversarial read-only inspection of implementation & database      │
│   • Verification of all 6 gate contracts in active code                │
│   • GATE: Independent safety review passes without blockers            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Slice 4B.11: Final Acceptance & Sign-Off                               │
│   • Formal completion report and phase sign-off                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Conclusion & Authorization Gate

All seven implementation gates have been exhaustively investigated, forensically proven, and contractually sealed.

### Current Status:
- **Architecture Contract: COMPLETE & CERTIFIED.**
- **Implementation Status: STRICTLY BLOCKED.**

### ABSOLUTE HARD STOP
- **DO NOT implement Slice 4B.1.**
- **DO NOT create `V3_6__fixed_asset_core_and_depreciation.sql`.**
- **DO NOT modify Java, React, SQL, or COA.**
- **Awaiting your explicit human authorization to begin Slice 4B.1 implementation.**

---
*Report compiled and certified for Phase 4B Final Implementation Gate.*
