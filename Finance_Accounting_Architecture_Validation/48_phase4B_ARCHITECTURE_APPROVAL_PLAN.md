# PHASE 4B — ARCHITECTURE APPROVAL & STATUTORY VALIDATION PLAN
## Fixed Asset Registry & Straight-Line Method (SLM) Depreciation Engine

**Document Reference:** `research/finance-accounting/48_phase4B_ARCHITECTURE_APPROVAL_PLAN.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/48_phase4B_ARCHITECTURE_APPROVAL_PLAN.md`  
**Prior Reference:** `research/finance-accounting/47_phase4B_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`  
**Verification Date:** 05-September-2026  
**Status:** **READ-ONLY ARCHITECTURE APPROVAL PLAN — AWAITING HUMAN SIGN-OFF**  
**Gate Status:** `PHASE 4B IMPLEMENTATION = STRICTLY BLOCKED PENDING USER APPROVAL`  

---

## Executive Architectural Summary

This document establishes the definitive, implementation-ready architectural contract for **Phase 4B: Fixed Asset Registry & Straight-Line Method (SLM) Depreciation Engine**. It converts the pre-implementation forensic findings from Report 47 into an authoritative technical design, statutory proof, domain model, GL posting pipeline, and phased implementation schedule.

### Strict Governance Constraints Enforced:
1. **Zero Modifications in this Phase:** No code, SQL migrations, database schemas, frontend components, or Chart of Accounts entries have been altered.
2. **Single Authoritative General Ledger:** All financial postings route exclusively through `GlEntryService.postEntries(...)` into `erp_gl_entry`. Zero shadow ledgers or secondary posting engines.
3. **Decoupled Statutory Boundary:** **Book Depreciation ONLY** pursuant to the **Companies Act, 2013 (Schedule II SLM)** and **Ind AS 16 / AS 10**. Tax depreciation under Section 32 of the Income-tax Act, 1961 is explicitly decoupled and deferred.
4. **Absolute CapEx / Inventory Segregation:** Fixed assets represent Capital Expenditure (CapEx). Capitalization and depreciation have zero touchpoints with stock valuation (`1211`), GRNI (`2105`), PPV (`4115`), or COGS (`4110`).

---

## 1. Statutory Verification (Mandatory Legal Framework)

To ensure statutory compliance without converting ERP policy assumptions into unverified rules, the legal frameworks governing fixed assets in India have been independently analyzed and strictly categorized:

```
                               ┌────────────────────────────────────────────────────────┐
                               │             INDIAN FIXED ASSET FRAMEWORK               │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                    ┌─────────────────────────────────────┴─────────────────────────────────────┐
                    ▼                                                                           ▼
┌───────────────────────────────────────┐                                   ┌───────────────────────────────────────┐
│           BOOK DEPRECIATION           │                                   │           TAX DEPRECIATION            │
│   (Financial Statements / Schedule III)│                                   │       (Income Tax / Form 3CD)         │
├───────────────────────────────────────┤                                   ├───────────────────────────────────────┤
│ • Companies Act, 2013 (Schedule II)   │                                   │ • Income-tax Act, 1961 (Section 32)   │
│ • Ind AS 16 / AS 10 (PPE)             │                                   │ • Block of Assets Concept (Sec 2(11)) │
│ • Individual Asset Unit Accounting    │                                   │ • WDV Pooling across Asset Classes    │
│ • Depreciable Base = Cost - Salvage   │                                   │ • 180-Day Put-to-Use Rule (50% / 100%)│
│ • Straight-Line Method (SLM)          │                                   │ • Zero GL Posting (Off-balance sheet) │
│ • Posts to General Ledger (Dr 4400 /  │                                   │                                       │
│   Cr 1119)                            │                                   │                                       │
│ ═════════════════════════════════════ │                                   │ ═════════════════════════════════════ │
│       STATUS: IN SCOPE (PHASE 4B)     │                                   │      STATUS: DEFERRED / OUT OF SCOPE  │
└───────────────────────────────────────┘                                   └───────────────────────────────────────┘
```

### Statutory Comparison & Evidence:

| Dimension | A. Companies Act, 2013 (Schedule II) | B. Ind AS 16 / AS 10 (Revised) | C. Income-tax Act, 1961 (Section 32) | D. ERP Accounting Policy (Phase 4B) |
| :--- | :--- | :--- | :--- | :--- |
| **Legal Mandate** | Section 123(2) mandates depreciation for dividend distribution and Schedule III compliance. | Authoritative accounting standards for Property, Plant & Equipment. | Tax return computation (Form 3CD, ITR-6). | Configurable enterprise parameters within statutory bounds. |
| **Depreciation Unit** | Individual Asset Item. | Individual component / asset. | **Block of Assets** (Class pool). | **Individual Asset Item** (FAR unit). |
| **Depreciation Method** | SLM or WDV based on useful life. | SLM, WDV, or Units of Production. | **WDV only** (except power units). | **Straight-Line Method (SLM)**. |
| **Useful Life** | Prescribed indicative useful lives in Part C (e.g. Computers 3 yrs, Servers 6 yrs, P&M 15 yrs). | Period over which an asset is expected to be available for use. | N/A (Prescribes fixed statutory WDV rates). | Default to Schedule II Part C indicative useful lives per class. |
| **Residual (Salvage) Value** | Part C Note 3: **"Shall not be more than 5% of the original cost."** | Expected realization upon disposal after useful life. | **NIL** (Block WDV continues indefinitely). | **Default: 5.00%** of original cost; configurable between 0.00% and 5.00%. |
| **Depreciation Commencement** | Date asset is put to use (Part C Note 4). | When available for use in intended location/condition (Para 50). | Date asset is "put to use" in the previous year. | **Capitalization Date** (Available / Put to Use date). |
| **Pro-Rata Rules** | Part C Note 4: **Calculated on a pro-rata basis** from date of addition up to date of disposal. | Depreciates while available for use until derecognition. | **180-Day Rule**: $<180$ days $\rightarrow 50\%$; $\ge 180$ days $\rightarrow 100\%$. No monthly pro-rata. | **Day-Level Pro-Rata** for partial months (Acquisition & Disposal). |
| **GL Impact** | **Mandatory GL Posting** (`Dr 4400 / Cr 1119`). | **Mandatory GL Posting**. | **Zero GL Posting** (Tax computation schedule only). | **Direct GL Posting via `GlEntryService`**. |

### Explicit Statutory Boundary Mandate:
- **Phase 4B is BOOK DEPRECIATION ONLY.**
- Tax depreciation (Section 32 WDV pooling, 180-day rule, Form 3CD depreciation schedule) is **EXPLICITLY DEFERRED**. Blending tax depreciation into the general ledger would violate Indian AS 10 / Ind AS 16 and corrupt Schedule III financial reporting.

---

## 2. Depreciation Policy Decision (Partial Months & Pro-Rata)

Schedule II Part C Note 4 of the Companies Act, 2013 explicitly mandates:
> *"Where, during any financial year, any addition has been made to any asset, or where any asset has been sold, discarded, demolished or destroyed, the depreciation on such assets shall be calculated on a pro-rata basis from the date of such addition or, as the case may be, up to the date on which such asset has been sold, discarded, demolished or destroyed."*

### Policy Evaluation:

1. **Option A: Full-Month Convention**
   - *Rule:* Full month charged if capitalized on or before the 15th; zero charged if after the 15th.
   - *Forensic Critique:* Arbitrary, creates distortion for assets acquired late in the month, and fails strict statutory auditor scrutiny under Schedule II Note 4.
2. **Option B: Day-Level Pro-Rata (Selected Enterprise Standard)**
   - *Rule:*
     - **Partial Acquisition Month:** Charged for exact active days:
       $$\text{Active Days} = \text{Total Days in Month} - \text{Capitalization Day} + 1$$
       $$\text{Depreciation}_{\text{init}} = \text{Monthly Charge} \times \frac{\text{Active Days}}{\text{Total Days in Month}}$$
     - **Full Intermediate Months:** Uniform monthly depreciation:
       $$\text{Monthly Charge} = \frac{\text{Depreciable Base}}{\text{Useful Life Months}} = \frac{\text{Cost} - \text{Salvage}}{N_{\text{years}} \times 12}$$
     - **Partial Disposal Month:** Charged for exact active days prior to disposal:
       $$\text{Depreciation}_{\text{disp}} = \text{Monthly Charge} \times \frac{\text{Disposal Day}}{\text{Total Days in Month}}$$
     - **Final Month Residual Floor Reconciliation:**
       $$\text{Depreciation}_{\text{final}} = \text{Depreciable Base} - \sum_{m=1}^{N-1} \text{Depreciation}_m$$
   - *Forensic Justification:* 100% deterministic, exact, reproducible, auditable, fully compliant with Companies Act Schedule II, and guarantees closing Net Book Value matches Salvage Value to the exact penny.

### Definitive Policy Selection for Phase 4B:
**Day-Level Pro-Rata for partial acquisition and disposal months, combined with uniform monthly depreciation for full intermediate months and final-month residual floor reconciliation.**

---

## 3. Fixed Asset Domain Model

### Minimum Authoritative Asset Model:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        erp_fixed_asset                                 │
├────────────────────────────────────────────────────────────────────────┤
│ PK: id (BIGINT)                                                        │
│ Tenant: tenant_id (BIGINT)                                             │
│ Code: asset_code (VARCHAR(64), UNIQUE)                                 │
│ Description: asset_name (VARCHAR(255))                                 │
│ Class: asset_class_id (BIGINT, FK to erp_asset_class)                  │
│ Physical: serial_number, location, department, custodian_user_id       │
│ Dates: acquisition_date, capitalization_date, depreciation_start_date  │
│ Financials:                                                            │
│   • gross_cost (DECIMAL(21,4))                                         │
│   • residual_percentage (DECIMAL(5,2), Default 5.00%)                  │
│   • salvage_value (DECIMAL(21,4), gross_cost * residual_pct / 100)      │
│   • depreciable_base (DECIMAL(21,4), gross_cost - salvage_value)       │
│   • useful_life_months (INT)                                           │
│   • remaining_life_months (INT)                                        │
│   • depreciation_method (VARCHAR(20), 'SLM')                           │
│   • accumulated_depreciation (DECIMAL(21,4), Cumulative posted)        │
│   • net_book_value (DECIMAL(21,4), gross_cost - accum_dep)             │
│   • last_depreciation_date (DATE)                                      │
│ Accounts: gl_cost_account_id, gl_accum_dep_account_id,                 │
│           gl_dep_expense_account_id                                    │
│ Source Linkage: source_document_type, source_document_id, supplier_id  │
│ Status: status (DRAFT, CAPITALIZED, ACTIVE, FULLY_DEPRECIATED, DISPOSED)│
│ Audit: delete_flag, creator, create_time, updater, update_time         │
└────────────────────────────────────────────────────────────────────────┘
```

### Immutability Rules After Capitalization:

| Field Group | Field Name | State: `DRAFT` | State: `CAPITALIZED` / `ACTIVE` | Forensic Rationale |
| :--- | :--- | :---: | :---: | :--- |
| **Financial Core** | `gross_cost`, `salvage_value`, `depreciable_base` | Mutable | **IMMUTABLE** | Prevents corrupting historical double-entry GL capitalization facts. |
| **Statutory Life** | `useful_life_months`, `depreciation_method` | Mutable | **IMMUTABLE** | Useful life revisions must occur through formal, auditable revision transactions. |
| **Dates** | `capitalization_date`, `depreciation_start_date` | Mutable | **IMMUTABLE** | Anchors the chronological depreciation timeline. |
| **GL Accounts** | `gl_cost_account_id`, `gl_accum_dep_account_id`, `gl_dep_expense_account_id` | Mutable | **IMMUTABLE** | Prevents orphaned subledger balances mismatching GL control accounts. |
| **Procurement Link**| `source_document_type`, `source_document_id` | Mutable | **IMMUTABLE** | Preserves immutable 3-way lineage back to the purchase invoice. |
| **Operational Meta**| `asset_name`, `serial_number`, `location`, `department`, `custodian_user_id` | Mutable | **MUTABLE** | Allows operational reassignment, location transfer, and metadata correction. |

---

## 4. Asset Lifecycle State Machine

```
              ┌───────────────────────────┐
              │           DRAFT           │
              └─────────────┬─────────────┘
                            │ (Capitalize)
                            ▼
              ┌───────────────────────────┐
              │        CAPITALIZED        │
              └─────────────┬─────────────┘
                            │ (Placed in service / 1st Dep Run)
                            ▼
              ┌───────────────────────────┐
      ┌──────►│          ACTIVE           │◄──────┐
      │       └─────────────┬─────────────┘       │
      │                     │                     │
      │                     │ (NBV = Salvage      │ (Reverse Run)
(Undo │                     │  Floor)             │
Disp) │                     ▼                     │
      │       ┌───────────────────────────┐       │
      │       │     FULLY_DEPRECIATED     │───────┘
      │       └─────────────┬─────────────┘
      │                     │
      │ (Disposal /         │ (Disposal /
      │  Retirement)        │  Retirement)
      │                     ▼
      │       ┌───────────────────────────┐
      └───────│         DISPOSED          │
              └───────────────────────────┘
```

### Legal Transitions & Boundary Invariants:

1. **`DRAFT` $\rightarrow$ `CANCELLED`:** Allowed at any time prior to capitalization. Soft-deletes the record (`delete_flag = '1'`). Zero GL impact.
2. **`DRAFT` $\rightarrow$ `CAPITALIZED`:** Requires valid asset class, cost $>0$, valid leaf GL accounts, and capitalization date. Transitions asset to capitalization-locked state.
3. **`CAPITALIZED` $\rightarrow$ `DRAFT` (Capitalization Correction):** Permitted **ONLY IF ZERO depreciation runs have posted against the asset**. If direct capitalization posted a GL entry, that entry must be reversed via `GlEntryService.reverseEntries()`. If any depreciation runs have posted, direct decapping is **strictly rejected**.
4. **`CAPITALIZED` $\rightarrow$ `ACTIVE`:** Automatically transitions upon execution of the initial monthly depreciation run covering the asset's depreciation start date.
5. **`ACTIVE` $\rightarrow$ `FULLY_DEPRECIATED`:** Triggered deterministically when $\text{Accumulated Depreciation} = \text{Depreciable Base}$ ($\text{Net Book Value} \equiv \text{Salvage Value}$). Future monthly depreciation runs generate zero charge ($0.00$) for this asset.
6. **Disposal Mid-Period:** When an active asset is disposed on Day $D$ of Month $M$:
   - System first calculates and accrues partial depreciation for Day $1$ through Day $D$.
   - Posts monthly depreciation item and GL voucher.
   - Transitions to `DISPOSED` and executes full derecognition.
7. **Disposal of Fully Depreciated Asset:** Derecognition clears gross cost (`Cr 1111`), clears accumulated depreciation (`Dr 1119`), recognizes proceeds (`Dr 1232`), and records gain/loss against residual salvage floor.

---

## 5. Capitalization Authority Architecture

### The Core Architectural Rule:
$$\mathbf{ONE\ Economic\ Capitalization} = \mathbf{ONE\ GL\ Posting}$$

Under no circumstances may an asset acquisition generate two General Ledger postings.

### Authoritative Architecture Decision:
In the current ERP, `PurchaseAccountingPostingService` is the **sole authoritative posting engine for procurement**. It already contains:
`PurchaseClassification.FIXED_ASSET` (lines 58, 117-118 of `PurchaseAccountingPostingService.java`).

When a Purchase Invoice classified as `FIXED_ASSET` is approved:
1. `PurchaseAccountingPostingService` executes the single authoritative GL posting:
   ```
   Dr 1111/1112/1113  Fixed Asset Gross Cost Account     ₹Taxable Value (+ Blocked GST)
   Dr 1251/1252/1253  Input GST (Eligible ITC)            ₹Eligible GST
       Cr 2320            Trade Payables (Net AP)             ₹Net AP
       Cr 2335-2338       TDS Payable (Withholding)           ₹TDS
   ```
2. `PurchaseAccountingPostingService` posts this voucher directly to `GlEntryService.postEntries(...)` with `voucher_type = "PURCHASE_INVOICE"`.
3. **Subledger Registry Creation (`PurchaseAccountingPostingService` $\rightarrow$ `FixedAssetService`):**
   - `PurchaseAccountingPostingService` notifies `FixedAssetService.createCapitalizedAssetFromPurchase(...)`.
   - `FixedAssetService` creates the `erp_fixed_asset` row with status = `CAPITALIZED`, linked to `source_document_id = invoiceId`, `source_document_number = invoiceNumber`, `gl_cost_account_id = debitAccount.getId()`.
   - **`FixedAssetService` DOES NOT POST TO GL.** The GL posting was already performed by `PurchaseAccountingPostingService`.
4. **Direct / Manual Capitalization (Non-Purchase Origination):**
   - For opening balance migrations, gifts, or CWIP capitalization where no purchase invoice exists:
   - `FixedAssetService.capitalizeDirect(...)` creates the `erp_fixed_asset` row AND posts the capitalization voucher (`Dr 1111 / Cr 2110 Share Capital or Cr 1120 CWIP`) via `GlEntryService.postEntries(...)`.
   - This ensures that manual capitalization also satisfies the rule: exactly ONE GL posting.

---

## 6. Depreciation Authority & General Ledger Pipeline

### Authoritative Processing Pipeline:
```
┌─────────────────────────────────────────────────────────────┐
│                 AssetDepreciationService                    │
│   • Selects all ACTIVE / CAPITALIZED assets for tenant      │
│   • Calculates deterministic SLM depreciation per asset     │
│   • Creates erp_asset_depreciation_run (Batch Header)       │
│   • Creates erp_asset_depreciation_item (Line Facts)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GlEntryService (AUTHORITY)                  │
│   • Validates double-entry invariants (Debit == Credit)     │
│   • Generates balanced Journal Voucher:                     │
│       Dr 4400 Depreciation & Amortization Expense           │
│       Cr 1119 Less: Accumulated Depreciation                │
│   • Enforces database-level idempotency via                 │
│     uk_gl_voucher_line (tenant_id, voucher_type, id, line)  │
│   • Batch inserts into erp_gl_entry                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FinancialStatementService                   │
│   • Pure-GL Balance Sheet & P&L automatically reflect       │
│     depreciation facts with ZERO code changes!              │
└─────────────────────────────────────────────────────────────┘
```

### Chart of Accounts Verification:
- **`4400` Depreciation & Amortization:** Confirmed in `TenantBootstrapService.java` (Line 297). Root: `EXPENSE`, Type: `EXPENSE`, Normal Balance: `DEBIT`.
- **`1119` Less: Accumulated Depreciation:** Confirmed in `TenantBootstrapService.java` (Line 238). Root: `ASSET`, Type: `ACCUMULATED_DEPRECIATION`, Normal Balance: `CREDIT`.

---

## 7. Disposal & Retirement Accounting

### Mathematical Formulation:
$$\mathbf{Carrying\ Amount\ (Net\ Book\ Value)} = \mathbf{Gross\ Asset\ Cost} - \mathbf{Accumulated\ Depreciation}$$
$$\mathbf{Gain\ /\ Loss\ on\ Disposal} = \mathbf{Net\ Disposal\ Proceeds} - \mathbf{Carrying\ Amount}$$

Where:
- $\text{Gain} > 0 \rightarrow$ Recognized in Profit & Loss as **Other Income**.
- $\text{Loss} < 0 \rightarrow$ Recognized in Profit & Loss as **Operating / Administrative Expense**.

### Double-Entry Accounting Invariants:
The disposal transaction derecognizes the gross block and accumulated depreciation completely:

```
Scenario A: Sale with Net Gain (Proceeds ₹12,000 > NBV ₹10,000; Original Cost ₹50,000, Acc Dep ₹40,000)
    Dr 1232  Bank Current Account (Proceeds)            ₹12,000.00
    Dr 1119  Less: Accumulated Depreciation             ₹40,000.00
        Cr 1111  Plant & Machinery (Gross Cost)                     ₹50,000.00
        Cr 3230  Gain on Sale of Fixed Assets                       ₹ 2,000.00
    [Total Debits = ₹52,000.00 | Total Credits = ₹52,000.00]

Scenario B: Sale with Net Loss (Proceeds ₹6,000 < NBV ₹10,000; Original Cost ₹50,000, Acc Dep ₹40,000)
    Dr 1232  Bank Current Account (Proceeds)            ₹ 6,000.00
    Dr 1119  Less: Accumulated Depreciation             ₹40,000.00
    Dr 4570  Loss on Sale / Scrap of Fixed Assets       ₹ 4,000.00
        Cr 1111  Plant & Machinery (Gross Cost)                     ₹50,000.00
    [Total Debits = ₹50,000.00 | Total Credits = ₹50,000.00]

Scenario C: Scrap / Write-Off (Proceeds ₹0; NBV ₹10,000; Original Cost ₹50,000, Acc Dep ₹40,000)
    Dr 1119  Less: Accumulated Depreciation             ₹40,000.00
    Dr 4570  Loss on Sale / Scrap of Fixed Assets       ₹10,000.00
        Cr 1111  Plant & Machinery (Gross Cost)                     ₹50,000.00
    [Total Debits = ₹50,000.00 | Total Credits = ₹50,000.00]
```

### Chart of Accounts Decision for Disposal:
- `3230` Gain on Sale of Fixed Assets (Root: `INCOME`, Subgroup: `3200 Other Income`, Normal: `CREDIT`).
- `4570` Loss on Sale / Scrap of Fixed Assets (Root: `EXPENSE`, Subgroup: `4500 Other Expenses`, Normal: `DEBIT`).
- **Approval Decision:** Neither account is currently seeded in `TenantBootstrapService`. Both will be seeded via `V3_6` migration.

---

## 8. Depreciation Idempotency Architecture

A batch identifier alone is insufficient to prevent duplicate depreciation. The system must enforce **database-level invariants**:

### Database-Enforced Invariants:
1. **Per-Asset Period Uniqueness:**
   In `erp_asset_depreciation_item`:
   `UNIQUE KEY uk_asset_deprec_item (tenant_id, asset_id, period_year, period_month, delete_flag)`
   *Effect:* Physically impossible for the database storage engine to insert two depreciation lines for the same asset in the same month.
2. **Per-Tenant Period Uniqueness:**
   In `erp_asset_depreciation_run`:
   `UNIQUE KEY uk_deprec_run_period (tenant_id, period_year, period_month, delete_flag)`
   *Effect:* Physically impossible to execute two depreciation runs for the same tenant and month.
3. **General Ledger Voucher Uniqueness:**
   In `erp_gl_entry`:
   `UNIQUE KEY uk_gl_voucher_line (tenant_id, voucher_type, voucher_id, line_no)`
   *Effect:* Prevents duplicate GL postings even under high-concurrency race conditions.

### Failure & Rerun Semantics:
- **Transaction Rollback:** The entire monthly depreciation batch is wrapped in a single Spring `@Transactional(rollbackFor = Exception.class)` block. If any asset calculation or GL insertion fails, the entire batch rolls back to zero state.
- **Retry Behavior:** A failed batch leaves no residual rows in the database; retrying the batch executes cleanly.
- **Idempotent Skip:** If an operator clicks "Run Depreciation" for an already-posted period, the service detects `countByPeriod > 0` and returns the existing batch without duplicate GL postings.
- **Reversal Capability:** Reversing a depreciation run invokes `GlEntryService.reverseEntries()`, appends mirror GL rows, marks `erp_asset_depreciation_run` as `REVERSED`, soft-deletes the items, and rolls back asset accumulated depreciation and NBV.

---

## 9. Concurrency & Locking Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Transaction Starts (@Transactional)                      │
├─────────────────────────────────────────────────────────────┤
│ 2. Acquire Row-Level Locks:                                 │
│    SELECT id FROM erp_fixed_asset                           │
│    WHERE tenant_id = ? AND status IN ('ACTIVE','CAPITALIZED')│
│    FOR UPDATE                                               │
├─────────────────────────────────────────────────────────────┤
│ 3. Check Period Invariant:                                  │
│    SELECT id FROM erp_asset_depreciation_run                │
│    WHERE tenant_id = ? AND period_year = ?                  │
│      AND period_month = ? AND delete_flag = '0'             │
│    FOR UPDATE                                               │
├─────────────────────────────────────────────────────────────┤
│ 4. Calculate SLM Depreciation & Update Asset Balances       │
├─────────────────────────────────────────────────────────────┤
│ 5. Insert Run Header & Item Lines                           │
├─────────────────────────────────────────────────────────────┤
│ 6. Post Double-Entry Journal Voucher into GlEntryService    │
├─────────────────────────────────────────────────────────────┤
│ 7. Transaction Commits & Locks Released                     │
└─────────────────────────────────────────────────────────────┘
```

### Protection Against Disposal vs. Depreciation Race:
- When an asset disposal is submitted, it acquires `SELECT * FROM erp_fixed_asset WHERE id = ? FOR UPDATE`.
- If a monthly depreciation run is active, the disposal transaction blocks until the depreciation run commits.
- Once unblocked, the disposal transaction reads the updated `accumulated_depreciation` and `last_depreciation_date`, preventing calculation drift.

---

## 10. Financial Period Control

The system integrates directly with [FinancialYearService](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearService.java):
1. **Open Period Check:** `posting_date` must fall within an existing `erp_financial_year` record where `status = 'ACTIVE'`.
2. **Closed Period Guard:** If `status = 'CLOSED'`, the depreciation run is **strictly rejected** with `BusinessRunTimeException("Financial year is closed. Depreciation cannot be posted.")`.
3. **Sequential Month Progression:** Month $M$ cannot be run unless Month $M-1$ has already been run.
4. **Phase 4C Boundary:** Period locking rules are enforced here; year-end P&L closing to Retained Earnings (`2120`) remains strictly reserved for Phase 4C.

---

## 11. Inventory & Procurement Boundary

$$\mathbf{FIXED\ ASSET} \ne \mathbf{INVENTORY}$$

### Strict Separation Invariants:
1. **Zero Stock Ledger Impact:** Fixed asset acquisitions never create records in `erp_stock_ledger_entry`.
2. **Zero GRNI Impact:** Fixed asset purchases bypass `2105 GRNI Clearing`.
3. **Zero PPV Impact:** Fixed assets are capitalized at actual invoice cost; no Purchase Price Variance (`4115`) is generated.
4. **Zero COGS Impact:** Depreciation debits `4400 Depreciation & Amortization`; it never touches raw materials (`1211`), finished goods (`1212`), or purchase COGS (`4110`).

---

## 12. Reporting Proposal

Reports derive directly from authoritative domain facts (`erp_fixed_asset`, `erp_asset_depreciation_item`, `erp_asset_disposal`, and `erp_gl_entry`):

### Authoritative Workspaces:
1. **Fixed Asset Register (FAR):** Itemized asset inventory (Tag, Description, Class, Capitalization Date, Vendor, Cost, Salvage Value, Useful Life, Acc Dep, NBV, Location, Dept, Status).
2. **Schedule III Fixed Asset Movement Schedule:**
   - Gross Block: Opening + Additions - Disposals = Closing Gross Block.
   - Accumulated Depreciation: Opening + Depreciation for Period - Deductions on Disposal = Closing Accumulated Depreciation.
   - Net Block: Opening Net Book Value vs. Closing Net Book Value.
3. **Depreciation Run History & Breakdown:** Batch execution records with full asset-by-asset drilldown and linked GL vouchers.
4. **Disposal & Retirement Statement:** Itemized statement of sold/scrapped assets showing cost, accumulated depreciation, NBV, sales proceeds, and net gain/loss.

---

## 13. Database Schema & Migration Specification (`V3_6`)

File: `src/main/resources/db/migration/V3_6__fixed_asset_core_and_depreciation.sql`

```sql
-- 1. Asset Classes Master
CREATE TABLE IF NOT EXISTS `erp_asset_class` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `class_code` VARCHAR(50) NOT NULL COMMENT 'PLANT_MACHINERY, IT_HARDWARE, FURNITURE, VEHICLES, BUILDINGS',
  `class_name` VARCHAR(255) NOT NULL,
  `schedule_ii_category` VARCHAR(100) NOT NULL,
  `useful_life_months` INT NOT NULL,
  `depreciation_method` VARCHAR(20) NOT NULL DEFAULT 'SLM',
  `default_residual_percentage` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `asset_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa',
  `accumulated_dep_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa',
  `depreciation_expense_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa',
  `gain_on_disposal_account_id` BIGINT DEFAULT NULL,
  `loss_on_disposal_account_id` BIGINT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  `creator` BIGINT DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updater` BIGINT DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_asset_class_code` (`tenant_id`, `class_code`, `delete_flag`),
  INDEX `idx_asset_class_tenant` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Fixed Asset Registry (FAR)
CREATE TABLE IF NOT EXISTS `erp_fixed_asset` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `asset_code` VARCHAR(64) NOT NULL COMMENT 'Unique asset tag e.g. AST-2026-0001',
  `asset_name` VARCHAR(255) NOT NULL,
  `asset_class_id` BIGINT NOT NULL COMMENT 'FK to erp_asset_class',
  `serial_number` VARCHAR(100) DEFAULT NULL,
  `location` VARCHAR(100) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `custodian_user_id` BIGINT DEFAULT NULL,
  `acquisition_date` DATE NOT NULL,
  `capitalization_date` DATE NOT NULL,
  `depreciation_start_date` DATE NOT NULL,
  `source_document_type` VARCHAR(50) DEFAULT NULL COMMENT 'PURCHASE_INVOICE, MANUAL_ENTRY, OPENING',
  `source_document_id` BIGINT DEFAULT NULL,
  `source_document_number` VARCHAR(100) DEFAULT NULL,
  `supplier_id` BIGINT DEFAULT NULL,
  `gross_cost` DECIMAL(21,4) NOT NULL,
  `residual_percentage` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `salvage_value` DECIMAL(21,4) NOT NULL,
  `depreciable_base` DECIMAL(21,4) NOT NULL,
  `useful_life_months` INT NOT NULL,
  `remaining_life_months` INT NOT NULL,
  `accumulated_depreciation` DECIMAL(21,4) NOT NULL DEFAULT 0.0000,
  `net_book_value` DECIMAL(21,4) NOT NULL,
  `last_depreciation_date` DATE DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, CAPITALIZED, ACTIVE, FULLY_DEPRECIATED, DISPOSED',
  `gl_cost_account_id` BIGINT NOT NULL,
  `gl_accum_dep_account_id` BIGINT NOT NULL,
  `gl_dep_expense_account_id` BIGINT NOT NULL,
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  `creator` BIGINT DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updater` BIGINT DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_asset_code` (`tenant_id`, `asset_code`, `delete_flag`),
  INDEX `idx_asset_tenant_status` (`tenant_id`, `status`),
  INDEX `idx_asset_class` (`tenant_id`, `asset_class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Monthly Depreciation Run Execution Batch
CREATE TABLE IF NOT EXISTS `erp_asset_depreciation_run` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `run_number` VARCHAR(64) NOT NULL COMMENT 'e.g. DEP-2026-04-001',
  `period_year` INT NOT NULL,
  `period_month` INT NOT NULL,
  `fiscal_year_id` BIGINT NOT NULL,
  `posting_date` DATE NOT NULL,
  `total_depreciation` DECIMAL(21,4) NOT NULL,
  `asset_count` INT NOT NULL,
  `gl_voucher_id` BIGINT DEFAULT NULL,
  `gl_voucher_no` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED',
  `remark` VARCHAR(500) DEFAULT NULL,
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  `creator` BIGINT DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updater` BIGINT DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_deprec_run_period` (`tenant_id`, `period_year`, `period_month`, `delete_flag`),
  INDEX `idx_deprec_run_tenant_date` (`tenant_id`, `posting_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Line-Level Depreciation Facts per Asset
CREATE TABLE IF NOT EXISTS `erp_asset_depreciation_item` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `run_id` BIGINT NOT NULL COMMENT 'FK to erp_asset_depreciation_run',
  `asset_id` BIGINT NOT NULL COMMENT 'FK to erp_fixed_asset',
  `asset_code` VARCHAR(64) NOT NULL,
  `period_year` INT NOT NULL,
  `period_month` INT NOT NULL,
  `opening_nbv` DECIMAL(21,4) NOT NULL,
  `depreciation_amount` DECIMAL(21,4) NOT NULL,
  `closing_nbv` DECIMAL(21,4) NOT NULL,
  `cumulative_depreciation` DECIMAL(21,4) NOT NULL,
  `days_depreciated` INT NOT NULL,
  `is_final_period` CHAR(1) NOT NULL DEFAULT '0',
  `cost_account_id` BIGINT NOT NULL,
  `accum_dep_account_id` BIGINT NOT NULL,
  `dep_expense_account_id` BIGINT NOT NULL,
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_asset_deprec_item` (`tenant_id`, `asset_id`, `period_year`, `period_month`, `delete_flag`),
  INDEX `idx_deprec_item_run` (`tenant_id`, `run_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Asset Disposal & Retirement Record
CREATE TABLE IF NOT EXISTS `erp_asset_disposal` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `disposal_number` VARCHAR(64) NOT NULL COMMENT 'e.g. DSP-2026-0001',
  `asset_id` BIGINT NOT NULL COMMENT 'FK to erp_fixed_asset',
  `asset_code` VARCHAR(64) NOT NULL,
  `disposal_date` DATE NOT NULL,
  `disposal_type` VARCHAR(30) NOT NULL COMMENT 'SALE, SCRAP, WRITE_OFF',
  `gross_cost` DECIMAL(21,4) NOT NULL,
  `accumulated_depreciation` DECIMAL(21,4) NOT NULL,
  `net_book_value` DECIMAL(21,4) NOT NULL,
  `sale_proceeds` DECIMAL(21,4) NOT NULL DEFAULT 0.0000,
  `gain_loss_amount` DECIMAL(21,4) NOT NULL,
  `customer_id` BIGINT DEFAULT NULL,
  `settlement_account_id` BIGINT DEFAULT NULL,
  `gain_loss_account_id` BIGINT NOT NULL,
  `gl_voucher_id` BIGINT DEFAULT NULL,
  `gl_voucher_no` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED',
  `remarks` VARCHAR(500) DEFAULT NULL,
  `delete_flag` CHAR(1) NOT NULL DEFAULT '0',
  `creator` BIGINT DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updater` BIGINT DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_asset_disposal` (`tenant_id`, `asset_id`, `delete_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 14. Chart of Accounts Approval Decisions

### Account Verification & Resolution:

| Account Code | Account Name | Root Type | Account Type | Normal Balance | Status in Codebase | Proposed Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`1111`** | Plant & Machinery | `ASSET` | `ASSET` | `DEBIT` | Exists in `TenantBootstrapService` | **APPROVED** (Reuse existing) |
| **`1112`** | Office & Computer Equipment | `ASSET` | `ASSET` | `DEBIT` | Exists in `TenantBootstrapService` | **APPROVED** (Reuse existing) |
| **`1113`** | Furniture & Fixtures | `ASSET` | `ASSET` | `DEBIT` | Exists in `TenantBootstrapService` | **APPROVED** (Reuse existing) |
| **`1119`** | Less: Accumulated Depreciation | `ASSET` | `ACCUMULATED_DEPRECIATION` | `CREDIT` | Exists in `TenantBootstrapService` | **APPROVED** (Reuse existing) |
| **`4400`** | Depreciation & Amortization | `EXPENSE` | `EXPENSE` | `DEBIT` | Exists in `TenantBootstrapService` | **APPROVED** (Reuse existing) |
| **`3230`** | Gain on Sale of Fixed Assets | `INCOME` | `INCOME` | `CREDIT` | Missing | **APPROVAL DECISION:** Seed in `V3_6` migration under parent `3200` (Other Income). |
| **`4570`** | Loss on Sale / Scrap of Fixed Assets | `EXPENSE` | `EXPENSE` | `DEBIT` | Missing | **APPROVAL DECISION:** Seed in `V3_6` migration under parent `4500` (Other Operating Expenses). |

---

## 15. Frontend Business Workspace Design

The React frontend (`ERPSystem-web-react`) will present clean, business-oriented workflows that communicate strictly via authenticated REST APIs:

```
Fixed Assets (/assets_domain)
  ├── Asset Register (/assets/register)
  │     ├── FAR Data Grid (Search, Class filter, Status filter, NBV sorting)
  │     ├── "Register New Asset" Modal Form
  │     └── Asset Detail Drawer (Depreciation schedule, History, Attachments)
  │
  ├── Asset Classes (/assets/classes)
  │     ├── Schedule II Asset Class Cards (P&M, Computers, Furniture, Vehicles)
  │     └── Edit Class Modal (Useful life in months, Residual %, Default GL accounts)
  │
  ├── Monthly Depreciation Run (/assets/depreciation-run)
  │     ├── Batch Run Cockpit (Year/Month selector, Validation pre-checks)
  │     ├── Interactive Calculation Preview Grid (Check totals before committing)
  │     └── "Post Depreciation to GL" Action Button with Confirmation Modal
  │
  ├── Depreciation History (/assets/depreciation-history)
  │     ├── Past Monthly Batches Table (Run No, Period, Total Dep, Asset Count, JV No)
  │     └── Batch Detail Drawer (Asset-by-asset line breakdown, GL Voucher link)
  │
  ├── Asset Disposal & Retirement (/assets/disposals)
  │     ├── Asset Retirement Wizard (Select asset, sale date, proceeds, buyer)
  │     ├── Real-time Gain / Loss Computation Preview
  │     └── "Authorize Disposal & Derecognize" Action Button
  │
  └── Asset Reports (/assets/reports)
        ├── Schedule III Fixed Asset Movement Schedule (Gross/AccDep/Net Block Grid)
        └── Export Options (Excel / PDF / Print)
```

---

## 16. Implementation-Ready Test Matrix

### Test Coverage Suite (Zero Regressions Mandate):

| Test Category | Test Case Identifier | Test Scenario & Verification Objective | Expected Result |
| :--- | :--- | :--- | :--- |
| **Lifecycle** | `TEST_LIFECYCLE_01` | Create asset in `DRAFT` $\rightarrow$ Capitalize $\rightarrow$ Check status = `CAPITALIZED`. | Valid status transition; immutability locks engage. |
| | `TEST_LIFECYCLE_02` | Cancel asset in `DRAFT` $\rightarrow$ verify soft delete (`delete_flag = '1'`). | Asset soft-deleted; zero GL entries posted. |
| | `TEST_LIFECYCLE_03` | Attempt to decapitalize asset after depreciation run has executed. | Throws `BusinessRunTimeException`; decap rejected. |
| **SLM Calculation** | `TEST_SLM_01` | Standard asset: Cost ₹1,20,000, Salvage 5% (₹6,000), Life 3 yrs (36 mos). Full month charge. | Depreciable Base = ₹1,14,000; Monthly Dep = ₹3,166.67. |
| | `TEST_SLM_02` | Zero residual value asset: Cost ₹60,000, Salvage 0%, Life 5 yrs (60 mos). | Depreciable Base = ₹60,000; Monthly Dep = ₹1,000.00. |
| | `TEST_SLM_03` | Final-month residual floor reconciliation: verify sum of all 36 months equals exact Depreciable Base. | $\sum Dep = ₹1,14,000.00$; Closing NBV $\equiv ₹6,000.00$. |
| | `TEST_SLM_04` | Fully depreciated asset included in next monthly run. | Depreciation amount = ₹0.00; status remains `FULLY_DEPRECIATED`. |
| **Dates & Pro-Rata** | `TEST_DATE_01` | Capitalized on 16-April (30-day month): verify 15 active days pro-rata charge. | Initial Dep = Monthly Dep $\times (15 / 30)$. |
| | `TEST_DATE_02` | Capitalized in February of Leap Year (2024 / 2028): verify 29-day pro-rata divisor. | Divisor = 29 days; calculation strictly deterministic. |
| | `TEST_DATE_03` | Mid-month disposal on Day 10 of month: verify 10 days depreciation accrued prior to derecognition. | Disposal Dep = Monthly Dep $\times (10 / 30)$; NBV updated. |
| **Accounting & GL** | `TEST_GL_01` | Monthly depreciation batch posting: verify double-entry balance. | `Dr 4400 / Cr 1119` posted; Debit sum $\equiv$ Credit sum. |
| | `TEST_GL_02` | Disposal with Gain: Cost ₹1,00,000, Acc Dep ₹80,000 (NBV ₹20,000), Sale ₹25,000. | `Dr Bank ₹25k, Dr 1119 ₹80k / Cr 1111 ₹100k, Cr 3230 ₹5k`. Balanced. |
| | `TEST_GL_03` | Disposal with Loss: Cost ₹1,00,000, Acc Dep ₹80,000 (NBV ₹20,000), Sale ₹15,000. | `Dr Bank ₹15k, Dr 1119 ₹80k, Dr 4570 ₹5k / Cr 1111 ₹100k`. Balanced. |
| **Safety & Concurrency**| `TEST_SAFETY_01` | Duplicate depreciation run: attempt to run 2026-04 twice for same tenant. | Idempotency guard blocks 2nd run; zero duplicate GL lines. |
| | `TEST_SAFETY_02` | Multi-threaded concurrent depreciation run stress test (10 parallel threads). | Exactly 1 run succeeds; 9 fail gracefully or skip; 0 duplicates. |
| | `TEST_SAFETY_03` | Closed financial period protection: attempt run on closed fiscal year. | Blocked with exception; zero GL posting. |
| | `TEST_SAFETY_04` | Multi-tenant isolation: Tenant A run processes zero Tenant B assets. | Strict tenant boundary verified. |
| **Regression** | `TEST_REGRESS_01` | Purchase Invoice approval with `FIXED_ASSET` classification. | `PurchaseAccountingPostingService` posts cleanly; AP updated. |
| | `TEST_REGRESS_02` | Phase 3B Financial Statements: verify Schedule III Balance Sheet reflects Gross PPE and Acc Dep. | PPE Gross (1110) - Acc Dep (1119) matches FAR NBV. |
| | `TEST_REGRESS_03` | Phase 4A TDS: verify TDS withholding on fixed asset purchases remains 100% operational. | TDS deducted on vendor invoice; net AP credited. |

---

## 17. Karpathy Overengineering Review

Pursuant to the **Karpathy Guidelines** for minimal, robust software design, all architectural proposals have been strictly evaluated to eliminate accidental complexity:

| Evaluated Architecture Pattern | Engineering Assessment | Karpathy Decision |
| :--- | :--- | :--- |
| **Microservice Architecture** | Separate "Fixed Asset Microservice" with gRPC/REST RPCs. | **REJECTED.** Monolithic modular Spring Boot service eliminates network failures and distributed transactions. |
| **Event Bus / Message Queue (Kafka/RabbitMQ)** | Asynchronous event-driven depreciation run. | **REJECTED.** Monthly depreciation for a mid-market enterprise finishes in $<200$ms in a synchronous `@Transactional` method. |
| **CQRS (Command Query Responsibility Segregation)** | Separate read/write databases for fixed assets. | **REJECTED.** Standard relational indexing on `tenant_id`, `status`, and `period` is vastly simpler and faster. |
| **Multi-Method Strategy Pattern (15 Depreciation Methods)** | Complex polymorphic factory supporting Units of Production, Declining Balance, etc. | **REJECTED.** Phase 4B strictly requires Straight-Line Method (SLM). Simple, clean, deterministic implementation. |
| **Shadow Balance Caching Tables** | Pre-aggregated asset balance tables. | **REJECTED.** `Net Book Value = Gross Cost - Accumulated Depreciation`. Derives dynamically without cache invalidation bugs. |
| **Premature Component Hierarchy** | Breaking each laptop into separate CPU, screen, and battery sub-assets. | **REJECTED.** Standard unit-level fixed asset registry. Component accounting is out of scope. |

---

## 18. Implementation Sequence & Independent Gates

The execution of Phase 4B will be divided into **10 internal implementation slices** (not new roadmap phases), each protected by an independent verification gate:

```
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.1: Database Migration & Domain Foundation          │
│   • Flyway V3_6 migration script (5 tables + COA seeds)     │
│   • MyBatis Entities, Mappers & XML configurations          │
│   • GATE: Flyway migration runs clean; tables exist in DB    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.2: Asset Capitalization Integration                │
│   • AssetClassService (Class management & GL mappings)      │
│   • FixedAssetService (FAR registry & capitalization logic) │
│   • Integration with PurchaseAccountingPostingService       │
│   • GATE: Invoice approval creates capitalized asset in FAR  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.3: SLM Calculation Engine                          │
│   • Deterministic SLM calculation, daily pro-rata logic     │
│   • Residual floor reconciliation formula                   │
│   • GATE: Unit tests pass for 36/60-month rounding & salvage│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.4: Depreciation Posting Authority                  │
│   • AssetDepreciationService (Batch orchestration)          │
│   • Integration with GlEntryService (Dr 4400 / Cr 1119)     │
│   • Period control & uk_deprec_run_period idempotency       │
│   • GATE: Monthly run generates balanced, idempotent GL JV  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.5: Asset Disposal & Retirement                     │
│   • AssetDisposalService (Accrual + full derecognition)     │
│   • Gain (3230) / Loss (4570) GL posting integration       │
│   • GATE: Disposal clears gross cost & acc dep; balanced GL │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.6: Statutory & Operational Reporting               │
│   • FixedAssetReportService (FAR export & Schedule III grid)│
│   • Direct aggregation from erp_fixed_asset & erp_gl_entry  │
│   • GATE: Schedule III report reconciles to Balance Sheet   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.7: REST API & Controller Layer                     │
│   • FixedAssetController, AssetClassController,             │
│     AssetDepreciationController, AssetDisposalController    │
│   • GATE: All REST endpoints authenticated & tenant-scoped  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.8: Frontend React Workspaces                       │
│   • Asset Register, Asset Classes, Monthly Run Cockpit,     │
│     Depreciation History, Disposals, and Movement Schedule  │
│   • GATE: React build succeeds; pages render & interact cleanly│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.9: Full Integration & Concurrency Test Suite       │
│   • Run all tests in Test Matrix (Lifecycle, SLM, Dates, GL,│
│     Safety, Multi-threaded stress, Regression)              │
│   • GATE: 100% tests pass; zero regressions in P2/P3/P4A    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Slice 4B.10: Final Independent Forensic Safety Review       │
│   • Comprehensive post-implementation safety audit report   │
│   • GATE: Formal human sign-off & phase acceptance          │
└─────────────────────────────-───────────────────────────────┘
```

---

## 19. Explicit Scope Boundaries

### IN SCOPE (Phase 4B):
- Fixed Asset Registry (FAR) with sequential tag numbering (`AST-`).
- Asset Classes master aligned with Companies Act, 2013 Schedule II indicative lives.
- Asset Capitalization (both from Purchase Invoices and Direct/Opening entry).
- Straight-Line Method (SLM) monthly depreciation engine.
- Day-level pro-rata calculation for partial acquisition and disposal months.
- Deterministic half-up rounding with final-month residual floor reconciliation.
- Authoritative General Ledger posting (`Dr 4400 / Cr 1119`) via `GlEntryService`.
- Asset Disposal & Retirement with complete derecognition and Gain (`3230`) / Loss (`4570`).
- Period controls, closed period protection, and database-level idempotency constraints.
- Schedule III Fixed Asset Movement Schedule and itemized FAR reports.
- Database migration `V3_6__fixed_asset_core_and_depreciation.sql`.
- Business workspaces in `ERPSystem-web-react`.

### OUT OF SCOPE (Explicitly Deferred):
- **Tax Depreciation (Income-tax Act Section 32):** Block of assets pooling, 180-day rule, and Form 3CD schedules.
- **Deferred Tax Accounting (AS 22 / Ind AS 12):** Timing differences between book and tax depreciation.
- **Asset Impairment (AS 28 / Ind AS 36):** Cash-generating units and recoverable amount write-downs.
- **Asset Revaluation Model:** Fair value revaluations and revaluation surplus equity reserves.
- **Lease Accounting (Ind AS 116):** Right-of-Use (ROU) asset amortization and lease liabilities.
- **Component Accounting:** Sub-component asset decomposition.
- **Complex Multi-Stage CWIP Construction Projects.**

---

## Conclusion & Architectural Sign-Off

The architecture presented in this document provides a clean, robust, mathematically sound, and statutory-compliant blueprint for Phase 4B. It adheres strictly to enterprise accounting invariants, reuses existing authorities without duplication, and guarantees zero contamination of operational inventory or accounts payable.

### ABSOLUTE HARD STOP
- **No production code, database schema, migration file, frontend file, or COA changes have been made.**
- **Implementation is BLOCKED and awaiting explicit human approval before Step 4B.1 begins.**

---
*Report compiled and certified for Phase 4B Architecture Approval.*
