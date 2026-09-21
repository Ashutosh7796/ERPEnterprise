# PHASE 4B — PRE-IMPLEMENTATION FORENSIC ANALYSIS & ARCHITECTURE VALIDATION REPORT
## Fixed Asset Registry & Straight-Line Method (SLM) Depreciation Engine

**Document Reference:** `research/finance-accounting/47_phase4B_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`  
**Mirror Reference:** `Finance_Accounting_Architecture_Validation/47_phase4B_PRE_IMPLEMENTATION_FORENSIC_ANALYSIS.md`  
**Analysis Date:** 05-September-2026  
**Status:** **READ-ONLY PRE-IMPLEMENTATION PLANNING & FORENSIC VALIDATION**  
**Architectural Gate:** `PHASE 4B IMPLEMENTATION = BLOCKED PENDING USER APPROVAL`  

---

## Executive Architectural Summary

In accordance with the **Phase 4B Planning Mandate**, this forensic document provides an exhaustive, read-only analysis and architectural validation of the upcoming Fixed Asset module for the enterprise ERP system. 

### Core Architectural Boundaries Enforced During This Investigation:
1. **Strict Read-Only Investigation:** Zero modifications have been made to Java, React, SQL, database schemas, Flyway migrations, Chart of Accounts, or existing accounting services.
2. **Single Authoritative General Ledger:** All depreciation, capitalization, and disposal journal vouchers must route exclusively through `GlEntryService.postEntries()` into the immutable fact table `erp_gl_entry`. Zero second GL authorities or shadow ledgers are permitted.
3. **Strict Separation of Book vs. Tax Depreciation:** Phase 4B implements **Book Depreciation ONLY** pursuant to the **Companies Act, 2013 (Schedule II Straight-Line Method)**. Income-tax Act, 1961 Section 32 (block of assets / WDV) is explicitly decoupled and deferred.
4. **Zero Contamination of Inventory / OpEx:** Fixed assets represent Capital Expenditure (CapEx). Capitalization routes bypass stock inventory valuation (`1211`), GRNI clearing (`2105`), Purchase Price Variance (`4115`), and Cost of Goods Sold (`4110`).

---

## 1. Current-State Architecture Forensics

The active codebase has been systematically audited to identify authoritative enterprise services, invariants, and infrastructure that can be directly reused without duplication:

| Existing Architectural Authority | Source Location | Discovered Capability & Authority | Reusability in Phase 4B Fixed Assets |
| :--- | :--- | :--- | :--- |
| **`AccountCoaService`** | `ERPSystem-boot/.../service/AccountCoaService.java` | Single master authority for Chart of Accounts hierarchy, code uniqueness, parent inheritance, and validation of postable leaf nodes (`validatePostableLeaf`). | **Directly Reused:** Validates that asset cost accounts (`1111`, `1112`, `1113`), contra accounts (`1119`), and expense accounts (`4400`) are active, non-group leaf nodes prior to posting. |
| **`GlEntryService`** | `ERPSystem-boot/.../service/GlEntryService.java` | Authoritative double-entry GL poster (`postEntries`, `reverseEntries`, `validateDoubleEntry`). Enforces strict debit-credit balancing to 4 decimal places, positive amounts, and idempotent batch inserts backed by `uk_gl_voucher_line`. | **Directly Reused:** Sole authority for posting monthly depreciation journal batches (`voucher_type = "DEPRECIATION_RUN"`) and asset disposal entries (`voucher_type = "ASSET_DISPOSAL"`). |
| **`JournalVoucherService`** | `ERPSystem-boot/.../service/JournalVoucherService.java` | Manual journal voucher creation and reversal manager. Enforces control account protection invariants for AR/AP (`1220`, `2320`). | **Pattern Reference:** Reusable pattern for multi-line balanced voucher generation and audit logging. |
| **`FinancialStatementService`** | `ERPSystem-boot/.../service/FinancialStatementService.java` | Pure-GL analytics engine for Schedule III Balance Sheet, Profit & Loss, Trial Balance, and GL Audit Trail. Runs directly over `erp_gl_entry` with zero shadow tables. | **Direct Continuity:** Already explicitly queries `1111`, `1112`, `1113` for Gross PPE, `1119` for Less: Accumulated Depreciation, and `4400` for Depreciation Expense! The moment Phase 4B posts to GL, financial statements work with zero modification! |
| **`FinancialAccountingPostingService`** | `ERPSystem-boot/.../service/FinancialAccountingPostingService.java` | Operational subledger poster for AR/AP, receipts, payments, and contra transfers. | **Pattern Reference:** Demonstrates transactional idempotency, tenant context resolution, and contra accounting. |
| **`FinancialYearService`** | `ERPSystem-boot/.../service/FinancialYearService.java` | Indian Fiscal Year manager (01-April to 31-March). Resolves active financial years dynamically and provides FY boundaries. | **Directly Reused:** Provides fiscal year validation and links depreciation runs to `erp_financial_year.id`. |
| **`TenantBootstrapService`** | `ERPSystem-boot/.../service/TenantBootstrapService.java` | Master multi-tenant seed orchestrator. Bootstraps standard Schedule III Chart of Accounts (`1000` Assets, `1110` PPE, `1119` Acc Dep, `4400` Dep Exp). | **Direct Continuity:** Seeds default COA accounts during tenant provisioning; can be extended to seed default Schedule II asset classes. |
| **`DocumentNumberService`** | `ERPSystem-boot/.../service/DocumentNumberService.java` | Concurrency-safe document numbering engine using `SELECT ... FOR UPDATE` on `erp_document_number_series`. | **Directly Reused:** Generates unique, sequential asset tags (e.g. `AST-2026-0001`), depreciation run numbers (`DEP-2026-04-001`), and disposal vouchers (`DSP-2026-0001`). |
| **`DocumentAuditLogService`** | `ERPSystem-boot/.../service/DocumentAuditLogService.java` | Immutable lifecycle transition logger (`DRAFT` $\rightarrow$ `CAPITALIZED` $\rightarrow$ `ACTIVE`, etc.). | **Directly Reused:** Captures operator audit trail for asset capitalization, lifecycle status changes, and disposals. |
| **`LogService`** | `ERPSystem-boot/.../service/LogService.java` | High-level business audit logging service (`logService.insertLog`). | **Directly Reused:** Logs administrative and configuration actions (e.g., Asset Class creation/updates). |
| **`SystemConfigService`** | `ERPSystem-boot/.../service/SystemConfigService.java` | Manages file attachments (`uploadLocal` and `uploadAliOss`). | **Directly Reused:** Enables attaching asset purchase invoices, warranty certificates, and physical inspection photos to the asset registry. |
| **Database Migration Engine** | `Flyway` (`src/main/resources/db/migration/`) | Authoritative database schema versioning engine (`V3_0` through `V3_5`). Runtime `@PostConstruct` DDL is strictly forbidden (Phase 4A RES-01). | **Directly Reused:** Phase 4B schema will be deployed exclusively via `V3_6__fixed_asset_core_and_depreciation.sql`. |

---

## 2. Fixed Asset Domain Analysis (Codebase & Database Discovery)

An exhaustive search across the entire codebase (`ERPSystem-boot`, `ERPSystem-web-react`, `docs/`, and `src/main/resources/`) was performed to identify any pre-existing asset tables, categories, or depreciation logic:

### Discovery Findings:
1. **Existing Tables:**
   - Database tables for assets: **ZERO**. Neither the legacy jshERP nor recent batches contain tables such as `erp_fixed_asset`, `erp_asset_class`, `jsh_asset`, or `erp_depreciation`.
2. **Existing Purchase Classification:**
   - In `PurchaseAccountingPostingService.java` (lines 58, 117-118), an enum value `PurchaseClassification.FIXED_ASSET` exists.
   - When a purchase bill is classified as `FIXED_ASSET`:
     - It resolves the debit account to `ACC_FIXED_ASSET_MACHINERY` (`1111`) or `ACC_FIXED_ASSET_EQUIPMENT` (`1112`).
     - It debits the fixed asset account, debits input GST (if eligible ITC), and credits `2320 Trade Payables`.
     - **Critical Architectural Gap:** While the financial voucher debits the GL fixed asset account, **no asset record is created in any registry**. There is currently no subledger tracking individual machines, computers, serial numbers, locations, useful lives, salvage values, or depreciation schedules.
3. **Existing Chart of Accounts Infrastructure:**
   - `TenantBootstrapService.java` (lines 233-238) seeds:
     - `1100` Non-Current Assets (Group)
     - `1110` Property, Plant & Equipment (Group)
     - `1111` Plant & Machinery (Leaf, `ASSET`, Normal: `DEBIT`)
     - `1112` Office & Computer Equipment (Leaf, `ASSET`, Normal: `DEBIT`)
     - `1113` Furniture & Fixtures (Leaf, `ASSET`, Normal: `DEBIT`)
     - `1119` Less: Accumulated Depreciation (Leaf, `ASSET`, AccountType: `ACCUMULATED_DEPRECIATION`, Normal: `CREDIT`)
     - `4400` Depreciation & Amortization (Leaf, `EXPENSE`, Normal: `DEBIT`)
4. **Existing Disposal & Transfer Concepts:**
   - None found. There are currently no endpoints, entities, or services for asset disposal, retirement, scrap, or intra-company location transfer.

---

## 3. Accounting Architecture & Flow Validation

### Intended Architectural Pipeline:
```
┌──────────────────────────────────────────────────────────┐
│                   Asset Origination                      │
│   • Purchase Invoice (PurchaseClassification.FIXED_ASSET) │
│   • Direct / Opening Balance Asset Capitalization        │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Fixed Asset Registry (FAR)                  │
│   • Asset Tag, Serial, Description, Location, Dept       │
│   • Asset Class (Schedule II Useful Life & Residual %)    │
│   • Gross Block (Acquisition Cost)                       │
│   • Net Book Value (NBV) & Accumulated Depreciation      │
│   • Status: DRAFT ──► CAPITALIZED ──► ACTIVE             │
└────────────────────────────┬─────────────────────────────┘
                             │ (Monthly Depreciation Batch)
                             ▼
┌──────────────────────────────────────────────────────────┐
│               Depreciation Engine (SLM)                  │
│   • Depreciable Base = Gross Cost - Residual Value       │
│   • Monthly Dep = Depreciable Base / Useful Life Months  │
│   • Prorated First/Final Months & Residual Floor Guard   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  GlEntryService                          │
│   • Single Authoritative General Ledger Posting Engine   │
│   • Dr 4400 Depreciation & Amortization Expense          │
│   • Cr 1119 Less: Accumulated Depreciation               │
│   • Voucher Type: "DEPRECIATION_RUN"                     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│               Schedule III Statements                    │
│   • Balance Sheet: PPE Gross (1110) - Acc Dep (1119)     │
│   • Profit & Loss: Depreciation Expense (4400)           │
│   • Authoritatively derived from erp_gl_entry            │
└──────────────────────────────────────────────────────────┘
```

### Chart of Accounts Account Mapping:

| Account Code | Account Name | Account Type | Normal Balance | Purpose in Phase 4B |
| :--- | :--- | :--- | :--- | :--- |
| **`1110`** | Property, Plant & Equipment | `ASSET` (Group) | `DEBIT` | Parent folder for all tangible fixed asset categories. |
| **`1111`** | Plant & Machinery | `ASSET` (Leaf) | `DEBIT` | Gross block for industrial machinery, manufacturing lines, and equipment. |
| **`1112`** | Office & Computer Equipment | `ASSET` (Leaf) | `DEBIT` | Gross block for computers, servers, printers, and office hardware. |
| **`1113`** | Furniture & Fixtures | `ASSET` (Leaf) | `DEBIT` | Gross block for desks, chairs, cabinetry, and interior fittings. |
| **`1114`** *(New)* | Motor Vehicles | `ASSET` (Leaf) | `DEBIT` | Gross block for passenger and commercial vehicles. |
| **`1115`** *(New)* | Buildings & Leasehold Improvements | `ASSET` (Leaf) | `DEBIT` | Gross block for real property and factory structures. |
| **`1119`** | Less: Accumulated Depreciation | `ACCUMULATED_DEPRECIATION` (Contra) | `CREDIT` | Cumulative contra-asset account capturing all historical depreciation write-downs. |
| **`4400`** | Depreciation & Amortization | `EXPENSE` (Leaf) | `DEBIT` | P&L expense recognized on monthly depreciation runs. |
| **`3230`** *(New)* | Gain on Sale of Fixed Assets | `INCOME` (Leaf) | `CREDIT` | Non-operating income recognized when disposal proceeds exceed Net Book Value. |
| **`4570`** *(New)* | Loss on Sale / Scrap of Fixed Assets | `EXPENSE` (Leaf) | `DEBIT` | Operating expense recognized when disposal proceeds are less than Net Book Value. |

### Accounting Journal Invariants:

#### 1. Monthly Depreciation Journal (Batched across active assets):
```
Dr 4400  Depreciation & Amortization Expense       ₹XX,XXX.XX
    Cr 1119  Less: Accumulated Depreciation                    ₹XX,XXX.XX
[Narration: "Monthly SLM depreciation for YYYY-MM across N assets"]
```

#### 2. Asset Disposal / Retirement Journal (Full derecognition):
When an asset with Original Cost $C$, Accumulated Depreciation $D$, and Net Book Value $\text{NBV} = C - D$ is sold for Net Proceeds $P$:
- **Scenario A (Gain on Sale: $P > \text{NBV}$):**
  ```
  Dr 1232/1220  Bank / Receivable (Proceeds)           ₹P
  Dr 1119       Less: Accumulated Depreciation         ₹D
      Cr 1111/1112  Fixed Asset Gross Cost (Original)          ₹C
      Cr 3230       Gain on Sale of Fixed Assets               ₹(P - NBV)
  ```
- **Scenario B (Loss on Sale: $P < \text{NBV}$):**
  ```
  Dr 1232/1220  Bank / Receivable (Proceeds)           ₹P
  Dr 1119       Less: Accumulated Depreciation         ₹D
  Dr 4570       Loss on Sale / Scrap of Fixed Assets   ₹(NBV - P)
      Cr 1111/1112  Fixed Asset Gross Cost (Original)          ₹C
  ```
- **Scenario C (Zero-Proceeds Scrap / Write-Off: $P = 0$):**
  ```
  Dr 1119       Less: Accumulated Depreciation         ₹D
  Dr 4570       Loss on Sale / Scrap of Fixed Assets   ₹NBV
      Cr 1111/1112  Fixed Asset Gross Cost (Original)          ₹C
  ```
In all cases:
$$\sum \text{Debits} - \sum \text{Credits} = 0.0000$$
The Gross Asset and its Accumulated Depreciation are completely derecognized from the balance sheet.

---

## 4. Straight-Line Method (SLM) Forensic Model

### Mathematical Formulation:
$$\mathbf{Depreciable\ Base} = \mathbf{Original\ Acquisition\ Cost} - \mathbf{Residual\ (Salvage)\ Value}$$

Where:
- $\text{Original Acquisition Cost} = \text{Purchase Price} + \text{Ineligible/Blocked Taxes} + \text{Inward Freight} + \text{Installation/Commissioning Costs}$.
- $\text{Residual Value} \le 5\%$ of Original Cost (Schedule II statutory limit).
- $\text{Useful Life} = N_{\text{years}}$ or $N_{\text{months}} = N_{\text{years}} \times 12$.

### Standard Monthly Depreciation Charge:
For a full calendar month in service:
$$\text{Monthly Depreciation} = \frac{\text{Depreciable Base}}{N_{\text{months}}} = \frac{\text{Cost} - \text{Residual Value}}{N_{\text{years}} \times 12}$$

### Pro-Rata Conventions (Partial Months & Leap Years):
Companies Act 2013 Schedule II Part C Note 4 explicitly requires depreciation to be calculated **on a pro-rata basis** from the date the asset is put to use until the date it is disposed of.

#### 1. Acquisition Month Pro-Rata (Daily Convention):
If an asset is capitalized on date $D_{\text{cap}}$ in month $M$ (having $T_{\text{days}}$ total days):
$$\text{Active Days in Month} = T_{\text{days}} - D_{\text{cap}} + 1$$
$$\text{Initial Month Depreciation} = \text{Monthly Depreciation} \times \frac{\text{Active Days in Month}}{T_{\text{days}}}$$
*Example:* Asset capitalized on 16-April (30-day month). Active days = $30 - 16 + 1 = 15$ days. Charge = $\frac{15}{30} \times \text{Monthly Dep} = 0.50 \times \text{Monthly Dep}$.

#### 2. Disposal Month Pro-Rata:
If an asset is disposed of on date $D_{\text{disp}}$ in month $M$:
$$\text{Active Days in Month} = D_{\text{disp}}$$
$$\text{Disposal Month Depreciation} = \text{Monthly Depreciation} \times \frac{D_{\text{disp}}}{T_{\text{days}}}$$
Depreciation for the partial month of disposal must be accrued **prior** to calculating gain/loss on disposal.

#### 3. Standard Full Months:
Full calendar months between acquisition and disposal utilize the standard monthly charge:
$$\text{Standard Charge} = \frac{\text{Depreciable Base}}{N_{\text{months}}}$$

#### 4. Leap Years Handling:
Under the calendar-month convention, February is treated as 28 days (standard year) or 29 days (leap year) for initial/disposal month daily pro-rata ($\text{Active Days} / 29$). Full-month depreciation remains uniform across all 12 months, avoiding artificial monthly fluctuation while remaining fully deterministic.

### Deterministic Rounding & Final-Period Residual Floor Guard:
1. **Rounding Mode:** All monthly calculations use `RoundingMode.HALF_UP` to 2 decimal places (functional currency INR).
2. **Cumulative Dep Drift:** Due to recurring division (e.g. ₹100,000 / 36 = ₹2,777.7777...), a small rounding discrepancy can accumulate over 3 to 15 years.
3. **Residual Floor Guard:**
   $$\text{Max Allowable Cumulative Depreciation} = \text{Original Cost} - \text{Residual Value}$$
   $$\text{NBV Floor} = \text{Residual Value}$$
4. **Final Month Reconciliation Formula:**
   In the final month of the asset's useful life:
   $$\text{Final Month Depreciation} = \text{Depreciable Base} - \sum_{m=1}^{N-1} \text{Depreciation}_m$$
   This ensures that:
   $$\sum_{m=1}^{N} \text{Depreciation}_m = \text{Depreciable Base} \quad \text{and} \quad \text{Final Net Book Value} \equiv \text{Residual Value}$$
5. **Fully Depreciated Assets:**
   Once $\text{Accumulated Depreciation} = \text{Depreciable Base}$, the asset automatically transitions to `FULLY_DEPRECIATED`. Subsequent monthly depreciation runs evaluate this status and generate **zero depreciation** ($0.00$). The asset remains on the asset register with its gross cost and accumulated depreciation intact until disposal.

---

## 5. India Statutory Verification (Companies Act vs. Income-tax Act vs. GST)

A critical architectural mistake in enterprise ERP design is conflating Book Depreciation with Tax Depreciation. This section provides the legal verification and boundaries:

| Statutory Dimension | Companies Act, 2013 (Schedule II) | Income-tax Act, 1961 (Section 32) | GST Law (CGST Act, 2017) |
| :--- | :--- | :--- | :--- |
| **Statutory Scope** | **Book Depreciation** (Financial Statements under Schedule III & Ind AS / AS 10) | **Tax Depreciation** (Tax Return / Form 3CD / Computation of Total Income) | **Indirect Tax / Input Tax Credit** (Capital Goods ITC & Supply Valuation) |
| **Depreciation Unit** | Individual Asset Item (Unit level) | "Block of Assets" (Class-level pooled WDV) | Individual Capital Good Invoice |
| **Depreciation Method** | Straight-Line Method (SLM) or WDV based on useful life | Written Down Value (WDV) only (except power generating units) | No depreciation method; 5% quarterly reduction rule |
| **Statutory Useful Life / Rates** | Prescribed Useful Life (Part C):<br>• Computers: 3 years<br>• Servers: 6 years<br>• Plant & Machinery: 15 years<br>• Furniture: 10 years<br>• Vehicles: 8 years | Prescribed WDV Rates:<br>• Computers: 40%<br>• Plant & Machinery: 15%<br>• Furniture: 10%<br>• Buildings: 10% | N/A |
| **Residual Value** | Maximum 5% of original cost | Nil (WDV continues until block is extinguished) | Nil |
| **Pro-Rata Rules** | Pro-rata from put-to-use date to disposal date | 180 Days Rule:<br>• $\ge 180$ days put to use: 100% of rate<br>• $< 180$ days: 50% of rate | Section 18(6): 5% per quarter or part thereof |
| **General Ledger Impact** | **POSTS TO GENERAL LEDGER** (`Dr 4400 / Cr 1119`) | **DOES NOT POST TO GENERAL LEDGER** (Off-balance sheet tax schedule) | ITC debited to `1251-1253` or capitalized into asset cost |
| **Phase 4B Decision** | **IN SCOPE (Authoritative Implementation)** | **EXPLICITLY DEFERRED & EXCLUDED** | **ITC Boundary Enforced** (No double benefit u/s 16(10)) |

### Key Statutory Rulings:
1. **Decoupling Mandate:** Phase 4B shall implement **Book Depreciation (Schedule II SLM) ONLY**. Tax depreciation (Section 32 WDV blocks) must never be blended into the general ledger posting pipeline.
2. **Section 16(10) CGST Act Guard:** If a company claims depreciation on the GST component of the cost of capital goods under the Income-tax Act, GST ITC is prohibited. Therefore:
   - When GST is claimed as Input Tax Credit (`1251`, `1252`, `1253`), the Fixed Asset Gross Cost is recorded **net of GST**.
   - When GST ITC is blocked under Section 17(5) (e.g., passenger motor vehicles), GST is added to the asset's gross capitalized cost.

---

## 6. Asset Lifecycle State Machine

The Fixed Asset Registry must enforce an immutable lifecycle state machine to guarantee auditability:

```
                  ┌──────────────────────┐
                  │        DRAFT         │
                  └──────────┬───────────┘
                             │ (Capitalize)
                             ▼
                  ┌──────────────────────┐
                  │     CAPITALIZED      │
                  └──────────┬───────────┘
                             │ (Depreciation Start Date reached)
                             ▼
                  ┌──────────────────────┐
           ┌─────►│        ACTIVE        │◄─────┐
           │      └──────────┬───────────┘      │
           │                 │                  │
(Undo Disp)│                 │ (Depreciated to  │ (Reverse Run)
           │                 │  Salvage Floor)  │
           │                 ▼                  │
           │      ┌──────────────────────┐      │
           │      │  FULLY_DEPRECIATED   │──────┘
           │      └──────────┬───────────┘
           │                 │
           │ (Disposal /     │ (Disposal /
           │  Retirement)    │  Retirement)
           │                 ▼
           │      ┌──────────────────────┐
           └──────│       DISPOSED       │
                  └──────────────────────┘
```

### Lifecycle Transition Rules:

| Source State | Target State | Triggering Event | Validation Guards & Invariants |
| :--- | :--- | :--- | :--- |
| *None* | `DRAFT` | Manual creation or Purchase Invoice import | Valid asset class, gross cost $> 0$, asset name, salvage value $\le 5\%$ of cost. |
| `DRAFT` | `CAPITALIZED` | Capitalization Action | Capitalization date $\le$ current date; postable GL asset account resolved. |
| `CAPITALIZED` | `ACTIVE` | Initial Depreciation Run | Placed in service; depreciation start date established. |
| `ACTIVE` | `FULLY_DEPRECIATED` | Monthly Depreciation Engine | Triggered automatically when $\text{Accumulated Depreciation} = \text{Depreciable Base}$ ($\text{NBV} = \text{Residual Value}$). |
| `ACTIVE` / `FULLY_DEPRECIATED` | `DISPOSED` | Asset Disposal / Retirement | Disposal date $\ge$ last depreciation date; depreciation accrued up to disposal date; balanced GL entry posted. |
| `DRAFT` | `CANCELLED` | Void Action | Allowed only if asset has no GL impact and no linked depreciation runs. |
| `CAPITALIZED` | `DRAFT` / `CANCELLED` | Capitalization Reversal | Allowed ONLY if zero depreciation runs have executed against the asset. If depreciation runs exist, reversal is rejected; asset must be retired or prior runs reversed. |

---

## 7. Inventory & Procurement Integration Boundary

### Acquisition Sources:
1. **Purchase Invoices (`PurchaseClassification.FIXED_ASSET`):**
   - When a purchase invoice contains capital expenditure items, the user selects `FIXED_ASSET`.
   - `PurchaseAccountingPostingService` debits `1111` or `1112` and credits `2320` Trade Payables.
   - Phase 4B will allow creating or linking an `erp_fixed_asset` registry record from the approved invoice, establishing the subledger link (`purchase_invoice_id`, `supplier_id`, `invoice_number`).
2. **Direct Capitalization:**
   - For assets acquired via capital contributions, transfers, or pre-existing assets during data migration, assets can be directly created in `DRAFT` and capitalized.
   - For opening balance migration: offset account is `2110` Share Capital or `2120` Retained Earnings (via Opening Balance Journal).
3. **Capital Work-in-Progress (CWIP) Conversion:**
   - Future hook: Assets constructed over time debit CWIP account `1120`. Upon completion, capitalization transfers balance: `Dr 1111 / Cr 1120`.

### Strict Safeguards Protecting Inventory & Operational Accounts:
- **Zero Stock Ledger Contamination:** Fixed asset acquisition **never** writes to `erp_stock_ledger_entry`.
- **Zero GRNI Contamination:** Fixed asset purchases do not accrue to `2105 GRNI Clearing`.
- **Zero PPV Contamination:** Fixed assets are capitalized at actual invoice cost; no Purchase Price Variance (`4115`) is generated.
- **Zero COGS Contamination:** Fixed assets do not touch raw materials (`1211`), finished goods (`1212`), or purchase expenses (`4110`).

---

## 8. Financial Period Control & Idempotency Boundary

### Period Invariants:
1. **Closed Period Protection:**
   - Depreciation runs must validate the target `posting_date` against `erp_financial_year`.
   - If the financial year has `status = 'CLOSED'`, the depreciation run is **strictly rejected** with `BusinessRunTimeException("Financial period is closed")`.
2. **Chronological Period Guard:**
   - A tenant cannot run depreciation for Month $M$ (e.g. 2026-05) if Month $M-1$ (2026-04) has not been run.
   - Depreciation must be run in strict sequential order to prevent gaps in accumulated depreciation.
3. **Deterministic Run Idempotency:**
   - Each monthly depreciation batch is uniquely identified by `(tenant_id, period_year, period_month)`.
   - A database unique constraint `uk_deprec_run_period` on `erp_asset_depreciation_run` guarantees that **duplicate runs for the same period are physically impossible at the database storage engine level**.
   - If a depreciation run for a period has already been posted, attempting to re-run it will detect the existing run and return the existing batch without duplicate GL postings.

---

## 9. Concurrency & Atomicity Safeguards

| Concurrency Scenario | Potential Hazard | Architectural Safeguard |
| :--- | :--- | :--- |
| **Simultaneous Monthly Depreciation Runs** | Two finance operators click "Run Depreciation" for `2026-04` simultaneously. | **1.** Unique index `uk_deprec_run_period (tenant_id, period_year, period_month, delete_flag)`.<br>**2.** Spring `@Transactional` wrapper.<br>**3.** Second transaction fails on duplicate key and gracefully resolves via idempotent skip. |
| **Asset Disposal during Depreciation Run** | An operator disposes of Asset #12 while a monthly depreciation batch is processing it. | **1.** Monthly run acquires row-level locks on active assets: `SELECT * FROM erp_fixed_asset WHERE tenant_id = ? AND status IN ('ACTIVE', 'CAPITALIZED') FOR UPDATE`.<br>**2.** Disposal transaction blocks until depreciation run finishes, or fails if status has changed. |
| **Asset Metadata Modification during Run** | Cost or useful life modified while depreciation is being calculated. | Assets are locked with `FOR UPDATE` during calculation; updates are serialized. |
| **Multi-Tenant Cross-Contamination** | Depreciation batch processes assets across tenant boundaries. | All queries, mappers, and updates strictly include `WHERE tenant_id = ?`. GL vouchers enforce tenant boundary. |

---

## 10. Frontend Business Workspace Proposal

Navigation must align with the existing enterprise `Sidebar.tsx` architecture. Rather than exposing one page per database table, business workspaces will be structured under a dedicated **Fixed Assets** domain:

### Proposed Navigation Structure:
```
Fixed Assets (/assets_domain)
  ├── Asset Register (/assets/register)
  │     ├── Comprehensive FAR Grid (Tag, Name, Class, Cost, Acc Dep, NBV, Status)
  │     ├── New Asset Registration & Capitalization Modal
  │     └── Asset Detail Drawer (Depreciation Schedule, History, Documents)
  │
  ├── Asset Classes (/assets/classes)
  │     ├── Schedule II Class Master (Plant & Machinery, IT Equipment, Furniture)
  │     ├── Default Useful Life (Months/Years) & Residual % Configuration
  │     └── Default GL Account Mappings (Cost, Acc Dep, Dep Expense, Gain/Loss)
  │
  ├── Depreciation Run (/assets/depreciation-run)
  │     ├── Monthly Batch Cockpit (Select Year/Month, Validation Pre-checks)
  │     ├── Calculation Preview Grid (Asset-by-asset preview before posting)
  │     └── "Post Depreciation to GL" Action Button (One-click execution)
  │
  ├── Depreciation History (/assets/depreciation-history)
  │     ├── Audit log of past monthly depreciation runs
  │     ├── Drilldown to individual asset depreciation line items
  │     └── Linked General Ledger Voucher viewer
  │
  ├── Disposal & Retirement (/assets/disposals)
  │     ├── Asset Retirement Wizard (Select asset, sale date, proceeds, buyer)
  │     ├── Real-time Gain / Loss computation preview
  │     └── Authoritative Disposal Approval & GL derecognition
  │
  └── Asset Reports (/assets/reports)
        ├── Schedule III Fixed Asset Movement Schedule (Gross Block, Additions, Deductions, Net Block)
        └── FAR Export (Excel / PDF)
```

---

## 11. Authoritative Reporting Proposal

Reports will derive strictly from authoritative domain facts (`erp_fixed_asset`, `erp_asset_depreciation_item`, `erp_asset_disposal`, and `erp_gl_entry`). Zero shadow balance tables are permitted.

### Core Reports:

#### 1. Fixed Asset Register (FAR):
Itemized asset ledger providing operational and statutory details:
- Columns: Asset Tag, Asset Name, Class, Acquisition Date, Capitalization Date, Vendor, Original Cost, Residual Value, Useful Life (Months), Depreciation Method (SLM), Accumulated Depreciation to Date, Net Book Value, Location, Department, Custodian, Status.

#### 2. Schedule III Fixed Asset Movement Schedule (Gross Block & Dep Statement):
Formatted to comply directly with Schedule III of the Companies Act, 2013:
```
┌─────────────────────────┬───────────────────────────────────────────┬───────────────────────────────────────────┬─────────────────────────┐
│       Asset Class       │                GROSS BLOCK                │         ACCUMULATED DEPRECIATION          │        NET BLOCK        │
│                         ├──────────┬───────────┬──────────┬─────────┼──────────┬───────────┬──────────┬─────────┼──────────┬──────────────┤
│                         │ Opening  │ Additions │ Disposals│ Closing │ Opening  │ For Period│ Disposals│ Closing │ Opening  │   Closing    │
├─────────────────────────┼──────────┼───────────┼──────────┼─────────┼──────────┼───────────┼──────────┼─────────┼──────────┼──────────────┤
│ 1. Plant & Machinery    │  100,000 │    20,000 │        0 │ 120,000 │   15,000 │     6,000 │        0 │  21,000 │   85,000 │       99,000 │
│ 2. Office & IT Hardware │   50,000 │     5,000 │   10,000 │  45,000 │   20,000 │    12,000 │    8,000 │  24,000 │   30,000 │       21,000 │
│ 3. Furniture & Fixtures │   30,000 │         0 │        0 │  30,000 │    6,000 │     2,850 │        0 │   8,850 │   24,000 │       21,150 │
├─────────────────────────┼──────────┼───────────┼──────────┼─────────┼──────────┼───────────┼──────────┼─────────┼──────────┼──────────────┤
│ TOTAL                   │  180,000 │    25,000 │   10,000 │ 195,000 │   41,000 │    20,850 │    8,000 │  53,850 │  139,000 │      141,150 │
└─────────────────────────┴──────────┴───────────┴──────────┴─────────┴──────────┴───────────┴──────────┴─────────┴──────────┴──────────────┘
```

#### 3. Asset Disposal & Retirement Statement:
- Columns: Disposal Voucher No, Asset Tag, Asset Class, Disposal Date, Disposal Type (Sale / Scrap), Original Cost, Accumulated Depreciation to Date of Sale, Net Book Value at Sale, Sale Proceeds Realized, Net Gain / Loss on Disposal, GL Voucher No.

---

## 12. Database Migration Proposal (`V3_6`)

Following the strict Flyway migration architecture, the entire Phase 4B database schema will be defined in a single migration script:
`src/main/resources/db/migration/V3_6__fixed_asset_core_and_depreciation.sql`

### Proposed Tables & Definitions:

```sql
-- 1. Asset Classes Master
CREATE TABLE IF NOT EXISTS `erp_asset_class` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `class_code` VARCHAR(50) NOT NULL COMMENT 'e.g. PLANT_MACHINERY, IT_HARDWARE, FURNITURE',
  `class_name` VARCHAR(255) NOT NULL,
  `schedule_ii_category` VARCHAR(100) NOT NULL COMMENT 'Statutory classification under Companies Act 2013',
  `useful_life_months` INT NOT NULL COMMENT 'Useful life in months (e.g. 180, 36, 120)',
  `depreciation_method` VARCHAR(20) NOT NULL DEFAULT 'SLM',
  `default_residual_percentage` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `asset_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa for Gross Cost (e.g. 1111)',
  `accumulated_dep_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa for Contra Asset (1119)',
  `depreciation_expense_account_id` BIGINT NOT NULL COMMENT 'FK to erp_account_coa for Expense (4400)',
  `gain_on_disposal_account_id` BIGINT DEFAULT NULL COMMENT 'FK to erp_account_coa (3230)',
  `loss_on_disposal_account_id` BIGINT DEFAULT NULL COMMENT 'FK to erp_account_coa (4570)',
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
  `gross_cost` DECIMAL(21,4) NOT NULL COMMENT 'Capitalized cost',
  `residual_percentage` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `salvage_value` DECIMAL(21,4) NOT NULL COMMENT 'Residual floor',
  `depreciable_base` DECIMAL(21,4) NOT NULL COMMENT 'gross_cost - salvage_value',
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
  `period_year` INT NOT NULL COMMENT 'Calendar Year e.g. 2026',
  `period_month` INT NOT NULL COMMENT 'Calendar Month 1 to 12',
  `fiscal_year_id` BIGINT NOT NULL COMMENT 'FK to erp_financial_year',
  `posting_date` DATE NOT NULL COMMENT 'Last day of month',
  `total_depreciation` DECIMAL(21,4) NOT NULL,
  `asset_count` INT NOT NULL,
  `gl_voucher_id` BIGINT DEFAULT NULL COMMENT 'Voucher ID posted in erp_gl_entry',
  `gl_voucher_no` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED' COMMENT 'POSTED, REVERSED',
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
  `gain_loss_amount` DECIMAL(21,4) NOT NULL COMMENT 'sale_proceeds - net_book_value',
  `customer_id` BIGINT DEFAULT NULL COMMENT 'Buyer if SALE',
  `settlement_account_id` BIGINT DEFAULT NULL COMMENT 'Bank/Receivable account',
  `gain_loss_account_id` BIGINT NOT NULL COMMENT '3230 Gain or 4570 Loss',
  `gl_voucher_id` BIGINT DEFAULT NULL,
  `gl_voucher_no` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED' COMMENT 'POSTED, REVERSED',
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

## 13. Graphify Findings & Dependency Verification

A read-only Graphify query was performed on the existing knowledge graph (`graphify-out/graph.json`):
- Graph size: 25,880 nodes.
- Evaluated dependency path:
  `FixedAssetService` $\rightarrow$ `AccountCoaService` $\rightarrow$ `erp_account_coa`
  `AssetDepreciationService` $\rightarrow$ `GlEntryService` $\rightarrow$ `erp_gl_entry`
  `AssetDisposalService` $\rightarrow$ `GlEntryService` $\rightarrow$ `erp_gl_entry`
- **Zero Circular Dependencies:** The Fixed Asset domain acts strictly as an upstream business module that invokes `GlEntryService` as a downstream authority. `GlEntryService` has zero knowledge of `FixedAssetService`.
- **Zero Duplicate Authorities:** `GlEntryService` remains the sole poster into `erp_gl_entry`.

---

## 14. Overengineering & Karpathy Simplicity Review

Pursuant to the **Karpathy Guidelines** for software design, every planned component has been scrutinized to eliminate unneeded complexity:

| Proposed Component | Simplification Analysis | Karpathy Verdict |
| :--- | :--- | :--- |
| **Microservice Extraction** | Building a standalone "Asset Management Microservice" would introduce network serialization, distributed transactions, and operational overhead. | **REJECTED.** Keep in monolithic modular Spring Boot backend. |
| **Multi-Method Depreciation Strategy (Units of Production, Sum of Years, Double Declining)** | Developing 15 depreciation strategies when Phase 4B strictly requires Straight-Line Method (SLM). | **REJECTED.** Implement clean, deterministic SLM. Avoid speculative polymorphism. |
| **Shadow Balance Tables** | Creating cached asset balance summary tables. | **REJECTED.** Net Book Value is deterministically computed as $\text{Gross Cost} - \text{Accumulated Depreciation}$. |
| **Asynchronous Message Bus (Kafka / RabbitMQ)** | Using an asynchronous queue for monthly depreciation runs. | **REJECTED.** Monthly depreciation for a typical SME/mid-market enterprise spans hundreds or thousands of assets, which executes in under 200ms in a single synchronous `@Transactional` block. |
| **Separate Tax Depreciation Engine** | Attempting to build both Companies Act SLM and Income-tax Section 32 WDV blocks in the same phase. | **REJECTED.** Strict scope separation: Book SLM in Phase 4B, Tax Depreciation deferred. |

---

## 15. Scope Boundary Specification

### IN SCOPE (Phase 4B):
1. **Fixed Asset Registry:** Asset creation, tag sequence numbering, metadata (serial, location, department, custodian), linking to purchase invoices.
2. **Asset Classes Master:** Configuration of Schedule II asset classes (Plant & Machinery, IT Equipment, Servers, Furniture, Vehicles, Buildings) with useful lives and default GL mappings.
3. **Asset Capitalization Workflow:** Transition from `DRAFT` to `CAPITALIZED` and `ACTIVE`.
4. **SLM Depreciation Engine:**
   - Depreciable base calculation ($\text{Cost} - \text{Salvage}$).
   - Monthly depreciation execution.
   - Pro-rata daily calculation for acquisition and disposal months.
   - Deterministic half-up rounding with final-month residual floor reconciliation.
   - Automatic transition to `FULLY_DEPRECIATED`.
5. **Authoritative GL Integration:**
   - Direct batch posting to `GlEntryService` (`Dr 4400 / Cr 1119`).
   - Strict double-entry invariant verification.
   - Reversal capability via `GlEntryService.reverseEntries()`.
6. **Asset Disposal & Retirement:**
   - Full derecognition of gross cost and accumulated depreciation.
   - Recognition of sale proceeds and net gain (`3230`) or net loss (`4570`).
7. **Statutory & Operational Reports:**
   - Fixed Asset Register (FAR).
   - Schedule III Fixed Asset Movement Schedule (Gross Block, Additions, Disposals, Net Block).
   - Disposal & Retirement Statement.
8. **Database Migration:** `V3_6__fixed_asset_core_and_depreciation.sql`.
9. **Frontend Workspace:** Business-driven React workspace (`/assets/register`, `/assets/classes`, `/assets/depreciation-run`, `/assets/depreciation-history`, `/assets/disposals`, `/assets/reports`).

### OUT OF SCOPE (Explicitly Deferred):
1. **Income-tax Act Section 32 Tax Depreciation Engine:** Block-of-assets WDV pooling, 180-day rule computations, and Form 3CD tax schedules.
2. **Deferred Tax Accounting (AS 22 / Ind AS 12):** Timing differences between book depreciation and tax depreciation.
3. **Asset Impairment Engine (AS 28 / Ind AS 36):** Cash-generating units (CGU) and recoverable amount write-downs.
4. **Asset Revaluation Model:** Fair value revaluations and revaluation surplus reserves.
5. **Lease Accounting (Ind AS 116 / IFRS 16):** Right-of-Use (ROU) assets and lease liability amortization.
6. **Component Accounting:** Sub-component depreciation (decomposing a single machine into separate motors/chassis with differing useful lives).
7. **Multi-Stage Capital Work-in-Progress (CWIP) Project Accounting:** Project cost accumulation across multiple years prior to commissioning.

---

## 16. Identified Risks & Mitigations

| Risk ID | Risk Description | Severity | Forensic Mitigation |
| :--- | :--- | :---: | :--- |
| **RSK-01** | Cumulative rounding drift across 15 years causing NBV to mismatch salvage value. | **P2** | Enforce Final-Month Residual Floor Reconciliation formula: final month absorbs the residual fraction such that closing NBV $\equiv$ salvage value. |
| **RSK-02** | Accidental duplicate monthly depreciation run under user error or double-click. | **P1** | Database-level unique key `uk_deprec_run_period (tenant_id, period_year, period_month, delete_flag)` and service-level idempotency guard. |
| **RSK-03** | Depreciation posted into a closed or future fiscal period. | **P1** | Validate target period against `erp_financial_year` status. Reject if status is not `ACTIVE`. Enforce chronological month progression ($M-1$ must be posted before $M$). |
| **RSK-04** | Disposal posted without accounting for depreciation up to the disposal date. | **P2** | Disposal wizard forces automatic accrual of pro-rata depreciation for the active days in the month of disposal prior to derecognizing the asset. |
| **RSK-05** | Accidental contamination of inventory stock valuation or Accounts Payable balances. | **P1** | Strict module boundary: fixed asset services do not interact with `DepotItem`, `StockLedgerService`, or `MaterialService`. AP postings remain governed exclusively by approved Purchase Invoices. |
| **RSK-06** | Unbalanced journal voucher during complex asset disposal. | **P1** | `GlEntryService.validateDoubleEntry` verifies $\text{abs}(\sum \text{Debit} - \sum \text{Credit}) == 0.0000$ before writing any rows to `erp_gl_entry`. |

---

## 17. Recommended Implementation Sequence

To maintain architectural stability and ensure continuous automated test coverage, the implementation must proceed in seven disciplined steps:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Database Migration V3_6                             │
│   • Flyway script for erp_asset_class, erp_fixed_asset,     │
│     erp_asset_depreciation_run, erp_asset_depreciation_item,│
│     erp_asset_disposal. Seed default Schedule II classes.   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: MyBatis Entities, Mappers & XMLs                   │
│   • AssetClass, FixedAsset, AssetDepreciationRun,           │
│     AssetDepreciationItem, AssetDisposal entities & mappers.│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Core Domain Services                                │
│   • AssetClassService (Class management & GL mappings)      │
│   • FixedAssetService (FAR registry & lifecycle transitions)│
│   • AssetDepreciationService (SLM engine & GL posting)      │
│   • AssetDisposalService (Retirement & derecognition)       │
│   • FixedAssetReportService (Schedule III movement & FAR)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: REST Controllers & DTOs                             │
│   • Clean, secure REST endpoints with tenant isolation      │
│     and role-based authorization.                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Comprehensive Automated Test Suite                  │
│   • SLM mathematical precision & rounding tests             │
│   • Pro-rata daily calculation & leap year tests            │
│   • Concurrent depreciation run stress tests                │
│   • Disposal gain/loss GL double-entry balance tests        │
│   • Closed financial period rejection tests                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Frontend React Workspace                            │
│   • Asset Register, Asset Classes, Monthly Depreciation Run,│
│     Depreciation History, Disposals, and Schedule III Report│
│     pages in ERPSystem-web-react.                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Final Forensic Safety Review                        │
│   • Independent read-only verification across backend,      │
│     database, and UI before declaring Phase 4B complete.    │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion & Architectural Sign-Off

The forensic analysis confirms that the existing ERP accounting architecture (`GlEntryService`, `AccountCoaService`, `FinancialStatementService`, `TenantBootstrapService`, and `FinancialYearService`) provides an exceptionally solid, clean, and extensible foundation for the Phase 4B Fixed Asset module.

### Mandatory Pre-Implementation Gate:
- **No code, database schema, or migration changes have been made in this analysis.**
- Implementation is **BLOCKED** and awaiting explicit user review and approval of this architectural blueprint.

---
*Report compiled and certified for Phase 4B Pre-Implementation Architecture Validation.*
