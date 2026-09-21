# Internal Research Artifact: Existing Finance & Accounting Architecture Forensic Analysis

**Repository:** `jshERP-master` (`ERPSystem-boot` backend + `ERPSystem-web-react` frontend)  
**Date:** September 2026  
**Auditor:** Senior ERP Architect & Forensic Codebase Auditor  

---

## 1. Executive Summary of Current Architecture

The current ERP implementation uses a **Cash & Settlement Voucher System** augmented with a document-level **Receivables/Payables (AR/AP) Debt Tracking Mechanism**. It does **NOT** currently implement an immutable Double-Entry General Ledger (GL), a Hierarchical Chart of Accounts (COA), Journal Vouchers (JVs), or standard financial statement generators (Trial Balance, P&L, Balance Sheet).

Instead, financial operations are built around:
1. **Settlement Accounts (`jsh_account`)**: Standalone bank accounts or cash registers (e.g., "HDFC Current Account", "Petty Cash").
2. **Financial Bill Headers (`jsh_account_head`)**: Document envelopes for 6 specific cash/bank transaction types (`Receipt`, `Payment`, `Receive Advance Payment`, `Transfer Funds`, `Income`, `Expense`).
3. **Financial Bill Details (`jsh_account_item`)**: Line items connecting financial vouchers to invoices (`billId` on `DepotHead`), income/expense categories (`inOutItemId`), or bank accounts (`accountId`).
4. **Commercial Debt Accumulators on Commercial Documents (`jsh_depot_head`)**: Tracks `total_price`, `discount_money`, `change_amount` (settled cash), and `debt` (outstanding balance) directly on sales and purchase bills.
5. **Auxiliary Category Heads (`jsh_in_out_item`)**: Flat dictionary items for miscellaneous income/expenses.
6. **GST Engine (`jsh_document_tax_snapshot`, `jsh_document_item_tax_snapshot`, `jsh_tax_rate`, `jsh_tax_rule`)**: High-accuracy snapshotting of CGST, SGST, IGST, UTGST, and RCM on transactional documents, but without posting to General Ledger tax liability/credit accounts.

---

## 2. Forensic Codebase & Schema Inspection

### 2.1 Database Entities & Relationships

```
+---------------------+           +------------------------+
|    jsh_account      |           |   jsh_account_head     |
|---------------------|           |------------------------|
| id (PK)             |           | id (PK)                |
| name                |           | type (Receipt, Pay...) |
| serial_no (A/c No)  |           | organ_id (Party PK)    |
| initial_amount      |<----+     | hands_person_id        |
| current_amount      |     |     | account_id (Bank PK)   |--+
| enabled, is_default |     |     | total_price, change_amt|  |
| tenant_id, del_flag |     |     | bill_no, bill_time     |  |
+---------------------+     |     | status (0=Un, 1=Audit) |  |
                            |     +------------------------+  |
                            |                 | 1             |
                            |                 |               |
                            |                 | N             |
                            |     +------------------------+  |
                            |     |   jsh_account_item     |  |
                            |     |------------------------|  |
                            |     | id (PK)                |  |
                            |     | header_id (FK) --------+  |
                            +-----| account_id (FK)        |  |
                            |     | in_out_item_id (FK)    |  |
                            |     | bill_id (FK DepotHead) |  |
                            |     | need_debt, finish_debt |  |
                            |     | each_amount, remark    |  |
                            |     +------------------------+  |
                            |                 |               |
                            |                 | N             |
                            |                 v 1             |
+---------------------+     |     +------------------------+  |
|   jsh_in_out_item   |     |     |    jsh_depot_head      |  |
|---------------------|     |     |------------------------|  |
| id (PK)             |     |     | id (PK)                |  |
| name                |     |     | type (Inbound/Outbound)|  |
| type (Income/Exp)   |<----+     | sub_type (Sales/Purch) |  |
| enabled, sort       |           | organ_id (Party PK)    |  |
| tenant_id, del_flag |           | account_id (Bank PK) --+--+
+---------------------+           | total_price, debt      |
                                  | discount_money         |
                                  | change_amount (paid)   |
                                  | many_account_id/money  |
                                  +------------------------+
```

### 2.2 Trace of Financial Workflows

#### A. Commercial Sales / Purchase Invoicing & Debt Lifecycle
1. When a Sales Invoice (`DepotHead` with `sub_type='Sales'`) is saved:
   - `total_price` = sum of line item prices + taxes.
   - `change_amount` = immediate cash/bank settlement amount received at invoice time (if any).
   - `discount_money` = invoice-level discount.
   - `debt` = `total_price - change_amount - discount_money`.
   - If `change_amount > 0`, the settlement is linked to `account_id` (or multi-account JSON in `many_account_id`).
2. When a Customer Payment Receipt (`AccountHead` with `type='Receipt'`) is recorded:
   - `AccountHead` record is created with `organId` (Customer ID) and `accountId` (Receiving Bank ID).
   - `AccountItem` records are created for each settled invoice (`billId` = `DepotHead.id`), recording `needDebt` (balance before payment) and `finishDebt` (amount paid now).
   - `AccountItemService.saveDetials()` calls `depotHeadService.getDebtByBill(dh)` to compute remaining debt and updates `DepotHead.debt`.

#### B. Direct Expenses & Incomes
- User creates an `AccountHead` with `type='Expense'` (or `Income`), selecting an `accountId` (paying/receiving bank) and detail rows in `AccountItem` pointing to `inOutItemId` (`jsh_in_out_item`).
- Money in the bank account is calculated dynamically via SQL aggregation in `AccountMapperEx.xml`.

#### C. Dynamic Balance Computation (No Pre-computed Ledger)
In `AccountService.java`:
```java
BigDecimal currentAmount = currentAccountSumMap.get(al.getId())
        .add(currentAccountSumByHeadMap.get(al.getId()))
        .add(currentAccountSumByDetailMap.get(al.getId()))
        .add(getManyAccountSumParse(al.getId(), currentManyAmountList))
        .add(al.getInitialAmount());
```
- Bank account balance is calculated by joining and aggregating across `jsh_depot_head`, `jsh_account_head`, and `jsh_account_item` on every query.
- While fast for small databases, this is not an auditable double-entry ledger.

---

## 3. Critical Architectural & Domain Deficiencies Identified

| Component | Current Implementation | Critical Deficiency |
|---|---|---|
| **Double-Entry General Ledger** | Non-existent. Single-entry cash sum only. | Cannot guarantee Debit = Credit. No audit-proof historical ledger entries. Adjustments and reversals cannot be traced mathematically. |
| **Chart of Accounts (COA)** | Only flat bank list (`jsh_account`) + simple expense names (`jsh_in_out_item`). | No classification into Assets, Liabilities, Equity, Revenue, Expense. No account codes (e.g., 1000 Assets -> 1100 Current Assets -> 1110 Bank). |
| **Journal Voucher (JV)** | Non-existent. | Cannot record depreciation, tax adjustments, accruals, payroll postings, provisions, or period-end closing entries. |
| **Financial Statements** | Only commercial reports (Sales Trend, Buy Trend, Customer Statement, Stock Valuation). | Cannot generate Balance Sheet, Profit & Loss (Income Statement), or Trial Balance. |
| **Tax Accounting** | Tax calculated & stored on document snapshots (`DocumentTaxSnapshot`). | Tax amounts are NOT posted to Input Tax Credit (ITC) or Output Tax Liability ledger accounts. GSTR-3B tax offset against electronic credit ledger cannot be tracked in accounting. |
| **TDS / Withholding** | Dedicated procurement TDS register exists (`/procurement/tds-register`), but not posted to TDS Payable GL account. | No accounting link between TDS deduction at invoice payment and Challan ITNS 281 tax remittance. |
| **Fiscal Year Period Close** | `FinancialYear` entity exists with status ('Active', 'Closed'). | Closing a year does not execute Retained Earnings roll-forward or lock historical transactions against retroactive alteration. |

---

## 4. Strengths & Reusable Building Blocks

1. **Robust Multi-Tenancy**: All tables strictly enforce `tenant_id` and Soft Deletion (`delete_flag`).
2. **Comprehensive GST Calculation Engine**: `TaxRule`, `TaxRate`, `HsnSac`, `DocumentTaxSnapshot`, `GstSalesInvoiceForm`, and `CompanyGstin` are already mature and highly accurate.
3. **Clean AR/AP Debt Settlement Flow**: `AccountHead` + `AccountItem` + `DepotHead` provides an intuitive user experience for cashiers and accounts clerks settling customer/vendor bills.
4. **Strong Document Numbering & Sequence Control**: `FinancialYear` and `FySequence` provide strict fiscal-year-scoped sequence generation (`INV/2026-27/0001`).
5. **Modern React 19 Frontend System**: Consistent Ant Design UI with modular feature folders, breadcrumbs, tab bars, and permissions.

---
*End of Artifact 01*
