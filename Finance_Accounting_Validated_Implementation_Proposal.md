# Finance & Accounting — Validated Master Architecture & Multi-Phase Implementation Plan

**Document Version:** 3.1.0 (Phase 1 Completed & Verified; Phase 2 Final Architecture Safety Certified)  
**Project:** `jshERP-master` (`ERPSystem-boot` backend + `ERPSystem-web-react` frontend)  
**Author:** Senior ERP Architect, Accounting Domain Specialist, Codebase Auditor, India ERP Lead  
**Status:** **PHASE 1 COMPLETE — PHASE 2 FULLY RESOLVED & READY FOR IMPLEMENTATION**  

---

## 1. Executive Summary & Master Roadmap

Following a comprehensive, forensic safety and architecture validation against the repository codebase, database schemas, GraphiPhy dependency graph, and Indian accounting statutory rules (Companies Act 2013 Schedule III, CGST Act 2017, Income Tax Act 1961), this document establishes the authoritative roadmap for the ERP's Finance & Accounting module.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ✅ PHASE 1: Chart of Accounts & General Ledger Foundation (COMPLETED)           │
│  • Master Chart of Accounts (erp_account_coa) with 5 root classifications        │
│  • Master Immutable General Ledger Fact Table (erp_gl_entry)                     │
│  • Multi-Tenant Automated Bootstrap with 44 Indian Schedule III Statutory Heads  │
│  • Double-Entry Balance Invariant Enforcement (∑Debit = ∑Credit > 0)             │
│  • Interactive React Chart of Accounts Tree Management UI & API                  │
│  • 11/11 Unit Tests Passed, Maven Build Success, Vite Build Passed               │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🔄 PHASE 2: Automated Double-Entry Postings & Sub-Ledger Reconciliation         │
│  ├── Phase 2A: Sales Invoices & Credit Notes → GL Posting & Reversal             │
│  ├── Phase 2B: Purchase Invoices & Debit Notes → GL Posting & Reversal           │
│  ├── Phase 2C: Customer Receipts & Supplier Payments → GL Posting                │
│  ├── Phase 2D: Customer Advances & Bank Contra Transfers → GL Posting            │
│  ├── Phase 2E: Sub-Ledger to GL Control Account Automated Reconciliation         │
│  └── Phase 2F: Perpetual Inventory Movements & GRNI Valuation Integration        │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⏳ PHASE 3: Journal Vouchers & Financial Statements Workspace (PLANNED)         │
│  • Manual Double-Entry Journal Voucher (JV) & Contra Posting Workspace           │
│  • Pure-GL Trial Balance Aggregation Engine                                      │
│  • Schedule III Balance Sheet Engine                                             │
│  • Schedule III Profit & Loss (P&L) Statement Engine                             │
│  • General Ledger Interactive Drill-Down Audit Trail Report                      │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⏳ PHASE 4: Statutory Compliance, TDS Deductions & Fiscal Period Closing        │
│  • Statutory TDS Deduction Engine (Sections 194C, 194J, 194I, 194Q)               │
│  • Fixed Asset Statutory Straight-Line Depreciation Automated Journal Engine     │
│  • Financial Year-End Ledger Closing & Retained Earnings Rollover Engine         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 Deliverables (Built & Verified)

1. **Database Migration (`V3_3__finance_general_ledger_core.sql`):**
   * `erp_account_coa`: 5-root hierarchy (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`), normal balances, group vs leaf ledgers, system protection flags.
   * `erp_gl_entry`: Immutable double-entry fact table with tenant isolation and compound indexes on `(tenant_id, account_id, posting_date)`, `(tenant_id, voucher_type, voucher_id)`, and `(tenant_id, party_type, party_id)`.
2. **Backend Domain & Services (`ERPSystem-boot`):**
   * Entities & Mappers: `AccountCoa.java`, `GlEntry.java`, `AccountCoaMapper.xml`, `GlEntryMapper.xml`.
   * `AccountCoaService.java`: Recursive tree builder, cycle rejection, code uniqueness, system default deletion protection, postable leaf validation.
   * `GlEntryService.java`: Double-entry invariant validator ($\sum\text{Dr} = \sum\text{Cr} > 0$), atomicity, and voucher idempotency.
   * `TenantBootstrapService.java`: Automated seeding of 44 statutory Schedule III accounting heads for every tenant.
3. **Frontend UI (`ERPSystem-web-react`):**
   * `ChartOfAccountsPage.tsx`: Interactive tree table with classification filter buttons, search, and expansion controls.
   * `AccountCoaModal.tsx`: Node creation and editing modal.
   * Navigation: Route `/financial/chart_of_accounts` and `/financial/coa` integrated in `router.tsx` and `Sidebar.tsx`.
4. **Verification & Quality Gates:**
   * Backend Unit Tests: `AccountCoaServiceTest`, `GlEntryServiceTest`, `FinancialYearServiceTest` (11/11 tests pass with 0 failures).
   * Maven Compilation: `mvn test-compile` (BUILD SUCCESS, 607 Java classes on Java 21).
   * Frontend Build: `npm run build` (3,951 modules transformed, 0 TypeScript errors).

---

## 3. Phase 2 Pre-Implementation Architecture & Blocker Resolutions

### 3.1. Pure Append-Only Ledger & Reversal Architecture
* **Strict Immutability:** Historical GL entries in `erp_gl_entry` are **never updated or deleted in place**.
* **True Idempotency Guard:** `postEntries()` checks if an `ORIGINAL` posting batch exists for `(tenant_id, voucher_type, voucher_id)`. If yes, it returns the existing ID without writing duplicate lines.
* **Explicit Reversal Model:** Cancellations append a distinct **Reversal Posting Batch** with opposite debits/credits linked via `reversal_of_id`.

### 3.2. Authoritative Transaction Posting Map
* **Sales Invoices (`GstSalesInvoiceService`):**
  * $\text{Dr 1220 Trade Receivables}$ `[Gross Amount]` (with `party_type='CUSTOMER'`, `party_id=customerId`)
  * $\text{Cr 3110 Domestic Sales / 3120 Export Sales}$ `[Taxable Amount]`
  * $\text{Cr 2331 Output CGST}$ `[CGST Amount]`
  * $\text{Cr 2332 Output SGST}$ `[SGST Amount]`
  * $\text{Cr 2333 Output IGST}$ `[IGST Amount]`
  * $\text{Cr/Dr 4560 Fractional Round-Off Difference}$
* **Purchase Invoices (`PurchaseInvoiceService`):**
  * $\text{Dr 4110 Purchases / 1211 Raw Materials}$ `[Taxable Amount]`
  * $\text{Dr 1251 Input CGST / 1252 Input SGST / 1253 Input IGST}$ `[ITC Amounts]`
  * $\text{Cr 2320 Trade Payables}$ `[Gross Amount]` (with `party_type='SUPPLIER'`, `party_id=supplierId`)
  * $\text{Cr/Dr 4560 Fractional Round-Off Difference}$
* **Customer Receipts (`AccountHeadService` - `type='Receipt'` / `'收款'`):**
  * $\text{Dr Bank / Cash Account (from erp_account.coa_id)}$ `[Total Received]`
  * $\text{Cr 1220 Trade Receivables}$ `[Total Settled]`
* **Supplier Payments (`AccountHeadService` - `type='Payment'` / `'付款'`):**
  * $\text{Dr 2320 Trade Payables}$ `[Total Paid]`
  * $\text{Cr Bank / Cash Account (from erp_account.coa_id)}$ `[Total Disbursed]`
* **Customer Advances (`AccountHeadService` - `type='Receive Advance Payment'`):**
  * $\text{Dr Bank / Cash Account}$ `[Advance Received]`
  * $\text{Cr 2339 Advance from Customers (Liability)}$ `[Advance Received]`
* **Bank / Cash Transfers (`AccountHeadService` - `type='Transfer Funds'`):**
  * $\text{Dr Target Bank / Cash COA Account}$ `[Transfer Amount]`
  * $\text{Cr Source Bank / Cash COA Account}$ `[Transfer Amount]`

### 3.3. Sub-Ledger Reconciliation Proof
* $\sum_{i} \text{CustomerBalance}_i == \text{GL\_Balance}(\text{Account } 1220 \text{ Trade Receivables})$
* $\sum_{j} \text{SupplierBalance}_j == \text{GL\_Balance}(\text{Account } 2320 \text{ Trade Payables})$
* Advances are isolated in `2339 Advance from Customers` and `1260 Advances to Suppliers`, preserving statutory balance sheet integrity.

---

## 4. Phase 2 Final Architecture Safety Decision

| Area | Status | Blocking Issue | Final Decision |
| :--- | :--- | :--- | :--- |
| **1. GL Immutability** | **RESOLVED** | In-place cancellation updates conflicted with strict immutability. | Enforce **pure append-only ledger**. Zero `UPDATE`/`DELETE` on posted financial lines. |
| **2. Idempotency** | **RESOLVED** | Reposting risk on double clicks or API retries. | Pre-insertion check for `(tenant_id, voucher_type, voucher_id, is_cancelled='0')` returns existing ID without inserting. |
| **3. Posting Identity** | **RESOLVED** | Ambiguity in multi-event document lifecycles. | Compound key `(tenant_id, voucher_type, voucher_id, line_no, is_cancelled)` strictly identifies posting instances. |
| **4. Reversal Model** | **RESOLVED** | Need for auditable corrections without rewriting history. | Explicit Reversal Batch appended with inverted debits/credits referencing `reversal_of_id`. |
| **5. Document Lifecycle** | **RESOLVED** | Risk of silent unapprove rewriting posted accounts. | `DRAFT (0)` $\to$ `APPROVED (1)` posts GL. Reverting requires authorized **Cancel & Reverse** workflow. |
| **6. Sales Posting** | **RESOLVED** | Prototype service previously wrote to legacy prototype tables. | Refactor to invoke canonical `GlEntryService` with Schedule III accounts (`1220`, `3110`/`3120`, `2331`-`2333`, `4560`). |
| **7. Purchase Posting** | **RESOLVED** | Need to distinguish Inventory, Expenses, Fixed Assets, and Job Work. | Classify via `Material.type`, `MaterialCategory`, and `InOutItem` to route to `1211`, `4110`, `4510`-`4550`, or `1111`. |
| **8. GST Posting** | **RESOLVED** | Risk of duplicated tax calculation logic. | Ingest tax outputs directly from `GSTTaxCalculationEngine` / `DocumentTaxSnapshot`. Zero recalculation. |
| **9. Payment / Receipt** | **RESOLVED** | Handling full, partial, multi-invoice, and unallocated settlements. | Ingest total settlement from `AccountHead` to credit `1220 AR` / debit `2320 AP` while tracking line links in `AccountItem`. |
| **10. Account Mapping** | **RESOLVED** | Avoiding rigid hard-coded accounts vs over-engineered rule engines. | Add optional `coa_id` on `erp_account` and `erp_in_out_item` with automatic default fallbacks. |
| **11. Sub-Ledger Reconciliation** | **RESOLVED** | Proving mathematical parity between party balances and GL control accounts. | Automated query verifies $\sum \text{Customer AR} == \text{GL 1220}$ and $\sum \text{Supplier AP} == \text{GL 2320}$. |
| **12. Inventory / GRNI** | **RESOLVED** | Risk of coupling physical stock movements to commercial invoicing. | Split into **Phase 2A–2E (Commercial Postings & Sub-Ledgers)** and **Phase 2F (Perpetual Inventory & GRNI Accrual)**. |

---

## 5. Final Status & Execution Recommendation

```text
APPROVED FOR PHASE 2 IMPLEMENTATION (SEQUENTIAL SUB-PHASE DELIVERY)
```

Implementation proceeds in safe, sequential sub-phases:
1. **Phase 2A:** Sales Invoices & Credit Notes $\to$ GL Posting & Reversal.
2. **Phase 2B:** Purchase Invoices & Debit Notes $\to$ GL Posting & Reversal.
3. **Phase 2C:** Customer Receipts & Supplier Payments $\to$ GL Posting.
4. **Phase 2D:** Customer Advances & Bank Contra Transfers $\to$ GL Posting.
5. **Phase 2E:** Sub-Ledger to GL Control Account Reconciliation.
6. **Phase 2F:** Perpetual Inventory & GRNI Accrual Integration.
