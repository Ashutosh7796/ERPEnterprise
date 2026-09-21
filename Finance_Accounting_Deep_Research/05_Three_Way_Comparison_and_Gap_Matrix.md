# Internal Research Artifact: Three-Way Comparison, Gap Matrix & "Do Not Build" Analysis

**Comparison Scope:**
1. **Our ERP (`jshERP-master`)**
2. **Metasfresh ERP (`de.metas.acct`)**
3. **ERPNext (`erpnext.accounts`)**
4. **Target Standard:** Practical, High-Reliability, Indian-Localized Enterprise ERP

---

## 1. Three-Way Capability Comparison Matrix

| Accounting Capability | Our Current ERP | Metasfresh Reference | ERPNext Reference | Recommendation for Our ERP |
|---|---|---|---|---|
| **Ledger System** | Single-entry cash/debt aggregation across 3 tables. No Debit/Credit balancing. | `Fact_Acct` immutable ledger with strict Debit/Credit balance. | `GL Entry` single immutable double-entry ledger. | **Add `jsh_gl_entry`**: Adopt the simple, robust `GL Entry` pattern. Auto-post upon document approval. |
| **Chart of Accounts** | Flat list of Bank accounts (`jsh_account`) + Income/Expense names (`jsh_in_out_item`). | `C_ElementValue` tree with Account Types (A/L/O/R/E). | `Account` tree with Root Types & semantic `account_type`. | **Add `jsh_account_coa`**: Implement a standard 4-level Indian Schedule III COA tree with pre-seeded defaults. |
| **Journal Voucher (JV)** | None. Manual adjustments impossible. | `Doc_GLJournal` with multi-line Dr/Cr entries. | `Journal Entry` with customizable entry types. | **Add Journal Voucher**: Simple header (`jsh_journal_voucher`) + multi-row Dr/Cr lines (`jsh_journal_voucher_item`). |
| **Commercial Invoicing Posting** | Stored in `DepotHead` + `DepotItem`. Updates `debt` directly. | Auto-posts to Receivables, Revenue, Tax, Inventory, COGS. | Auto-posts to Receivables, Income, Taxes & Charges. | **Enhance Invoicing**: Keep existing invoice UI; auto-generate balanced GL entries upon bill approval. |
| **Payment & Settlement (AR/AP)** | `AccountHead` + `AccountItem` (linked to `DepotHead`). | `Doc_Payment` + `Doc_Allocation`. | `Payment Entry` with invoice reference allocation. | **Keep & Enhance Existing UX**: Keep our intuitive `AccountHead` UI; auto-post GL entries upon voucher approval. |
| **Direct Income / Expense** | `AccountHead` (`type='Income'/'Expense'`) + `InOutItem`. | `Doc_Payment` to GL charge account. | `Payment Entry` or `Journal Entry`. | **Retain Existing UX**: Map `InOutItem` to corresponding COA expense/income ledgers and post to GL. |
| **GST Tax Accounting** | `DocumentTaxSnapshot` calculates GST per line, but no GL accounts. | Tax accounts on Tax Category (`T_Due_Acct`, `T_Credit_Acct`). | Itemized tax ledger posting to Input/Output CGST/SGST/IGST. | **Add GST GL Accounts**: Link tax calculations directly to Input/Output GST ledgers in the COA. |
| **TDS Withholding** | Dedicated procurement TDS register exists, but no GL posting. | Withholding configuration on Business Partner. | Tax Withholding Category with auto-deduction on Invoice/Payment. | **Link TDS to GL**: Add TDS Payable/Receivable ledgers and auto-create TDS deduction entries upon voucher creation. |
| **Bank Reconciliation (BRS)** | None. | `Doc_BankStatement` line matching. | `Bank Clearance` & `Bank Reconciliation Tool`. | **Add Lightweight BRS**: Simple statement matching screen against Bank GL entries. |
| **Financial Statements** | Only commercial reports (Sales Trend, Buy Trend, Customer Statement). | Financial Reports on `Fact_Acct`. | Trial Balance, Balance Sheet, P&L, Cash Flow on `GL Entry`. | **Add Financial Reports**: Trial Balance, Balance Sheet, and P&L computed directly from `jsh_gl_entry`. |
| **Fiscal Year Closing** | `FinancialYear` status toggle. No profit rollover. | Period closing with balance carry-forward. | Period Closing Voucher rolls P&L to Retained Earnings. | **Add Year-End Close**: Automated P&L transfer to Reserves & Surplus + period lock. |

---

## 2. Comprehensive Gap Classification

### Category A — Missing Critical Capabilities (Blocking Correctness)
- **A-1: Double-Entry General Ledger Engine (`jsh_gl_entry`)**: Mathematical guarantee that $\sum \text{Debit} = \sum \text{Credit}$ across all financial events.
- **A-2: Hierarchical Chart of Accounts (`jsh_account_coa`)**: Standard Indian Schedule III structure (Assets, Liabilities, Equity, Income, Expense).
- **A-3: Automatic Document GL Posting Engine (`GlPostingService`)**: Centralized service generating balanced GL entries for Sales Invoices, Purchase Invoices, Customer Receipts, Vendor Payments, and Expenses upon approval.

### Category B — Missing Important Capabilities (Core ERP)
- **B-1: Journal Voucher (JV) Module**: Ability for accountants to record adjustments, accruals, provisions, depreciation, and tax offsets.
- **B-2: Financial Statement Reports**: Trial Balance, Profit & Loss (Income Statement), and Balance Sheet.
- **B-3: Year-End Closing & Period Lock**: P&L retained earnings rollover to Reserves & Surplus and strict lock against backdated entries.

### Category C — Architectural Issues
- **C-1: Dynamic Calculation Overhead**: Currently, bank balances are computed by querying and aggregating 3 transactional tables on the fly. Introducing the GL ledger provides single-source-of-truth balances and instantaneous report queries.

### Category D — UX / Frontend Gaps
- **D-1: Missing Journal Voucher Screen**: Needs a clean multi-line table form with auto-balancing Debit/Credit indicators.
- **D-2: Missing Chart of Accounts Tree Visualizer**: Ant Design Tree component to view, add, and manage account heads.
- **D-3: Missing Financial Statement Views**: Clean expandable tree tables for Trial Balance, P&L, and Balance Sheet with date range filters.

### Category E — India Localization Gaps
- **E-1: GST Input/Output GL Ledger Integration**: Outward sales post to Output CGST/SGST/IGST liabilities; inward purchases post to Input CGST/SGST/IGST credits.
- **E-2: GSTR-3B Tax Offset Accounting**: Ability to record the monthly tax offset entry (contra output against input ITC) via JV.
- **E-3: TDS Payable / Receivable Ledger Postings**: Proper accounting of tax deducted under sections 194C, 194J, 194I, 194Q.

### Category F — Reporting Gaps
- **F-1: General Ledger Drill-down Report**: Filter by Account, Date Range, and Party, showing Opening Balance, Debit, Credit, Running Balance, and clickable voucher link.

### Category J — Explicitly Do Not Change (Existing Appropriate Implementations)
- **J-1: Existing `jsh_account` Bank/Cash Master**: Keep as-is! It serves as the physical bank/cash register and maps directly to a COA Bank account.
- **J-2: Existing `jsh_account_head` & `jsh_account_item` AR/AP Voucher Flow**: Keep the exact UI and cashier workflow for Receipts and Payments! Users love this intuitive screen. We simply attach GL posting behind the scenes.
- **J-3: Existing GST Calculation Engine (`DocumentTaxSnapshot`)**: The GST snapshot calculation engine is robust and accurate. We do not touch its calculation logic; we simply read its amounts for GL tax postings.
- **J-4: Existing `FinancialYear` & Sequence Generation**: Already aligned with Indian FY (April-March); preserve as the fiscal period reference.

---

## 3. Explicit "DO NOT BUILD" (Avoiding Over-Architecture)

To maintain architectural purity, performance, and simplicity, the following features are **explicitly rejected / deferred**:

1. **DO NOT BUILD: Multi-Currency Parallel Accounting Schemas (Metasfresh `C_AcctSchema`)**:
   - *Reason:* Unnecessary for Indian domestic SMEs. Indian accounting requires single functional currency (INR) reporting. Multi-currency can be handled simply via exchange rate gain/loss fields on foreign transactions without parallel ledgers.
2. **DO NOT BUILD: Complex Budgeting & Variance Engine**:
   - *Reason:* Premature optimization. SMEs need accurate actual financial accounting before corporate budgeting.
3. **DO NOT BUILD: Generic Heavyweight Rules/Workflow Engines (Camunda/Activiti)**:
   - *Reason:* Violates Karpathy simplicity guidelines. Our existing status workflow (`0=Unapproved`, `1=Approved`, `2=Completed`) is fast, deterministic, and easily maintainable in pure Spring Boot code.
4. **DO NOT BUILD: Automated Bank Statement Feed Aggregator / Open Banking Scraper**:
   - *Reason:* High fragility, third-party API costs, and security overhead. A clean manual/CSV Bank Reconciliation Statement (BRS) tool is far more reliable.
5. **DO NOT BUILD: Separate Sub-Ledger Tables for Every Entity**:
   - *Reason:* Over-normalization. Having a unified `jsh_gl_entry` table with `party_type` and `party_id` covers all sub-ledger reporting effortlessly.

---
*End of Artifact 05*
