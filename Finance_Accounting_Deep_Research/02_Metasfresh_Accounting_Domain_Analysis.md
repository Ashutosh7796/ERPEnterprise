# Internal Research Artifact: Metasfresh ERP Accounting Domain Architecture Analysis

**Reference System:** Metasfresh Open Source ERP (`de.metas.acct`)  
**Heritage:** Compiere / ADempiere Financial Engine  
**Purpose:** Extract proven enterprise ERP accounting patterns without inheriting unnecessary legacy complexity.

---

## 1. Core Architectural Pillars of Metasfresh Finance

```
+-----------------------------------------------------------------------------------+
|                            METASFRESH ACCOUNTING ENGINE                           |
+-----------------------------------------------------------------------------------+
|  1. Chart of Accounts (COA)       : C_ElementValue (Tree, Account Types A/L/O/R/E)|
|  2. Accounting Schema             : C_AcctSchema (Defaults, Currency, Mapping)    |
|  3. Accounting Dimensions         : Partner, Product, Cost Center, Org            |
|  4. Document Processors (Doc_*)   : Invoice, Payment, Allocation, GLJournal       |
|  5. Immutable Double-Entry Ledger : Fact_Acct (Debit/Credit Journal Facts)        |
|  6. Financial Periods & Locks     : C_Period, C_PeriodControl                     |
|  7. Reporting Engine              : Balance Sheet, Trial Balance, P&L on Fact_Acct|
+-----------------------------------------------------------------------------------+
```

---

## 2. Metasfresh Data Model Breakdown

### 2.1 Chart of Accounts: `C_ElementValue`
Metasfresh structures accounts into a strict hierarchy:
- **`Value`**: Unique alphanumeric account code (e.g. `1110`, `2110`, `4100`, `5100`).
- **`Name`**: Descriptive title (e.g. `Trade Debtors / Accounts Receivable`, `GST Output CGST`).
- **`AccountType`**:
  - `A` - Asset
  - `L` - Liability
  - `O` - Owner's Equity
  - `R` - Revenue
  - `E` - Expense
  - `M` - Memo
- **`AccountSign`**:
  - `Natural` (Debit for Assets/Expenses, Credit for Liabilities/Equity/Revenue)
  - `Debit`
  - `Credit`
- **`IsSummary`**: Boolean flag indicating header/folder nodes vs postable leaf accounts. Only leaf accounts can receive postings.

### 2.2 Default Accounting Mapping: `C_AcctSchema_Default`
Metasfresh solves the problem of "How does the system know which account to debit/credit when an invoice is saved?" via **Schema Defaults**:
- `C_Receivable_Acct`: Default Accounts Receivable for Customers.
- `V_Liability_Acct`: Default Accounts Payable for Suppliers.
- `P_Revenue_Acct`: Default Sales Revenue account.
- `P_Expense_Acct`: Default Cost of Goods Sold / Purchase Expense account.
- `T_Due_Acct`: Tax Output Liability account.
- `T_Credit_Acct`: Tax Input Credit account.
- `B_InTransit_Acct`: Bank in-transit / unallocated payment clearing account.
- `RealizedGain_Acct` / `RealizedLoss_Acct`: Forex and settlement discount variance.

### 2.3 The Core Fact Table: `Fact_Acct`
Every business event that affects financial balance writes immutable rows into `Fact_Acct`:
```sql
CREATE TABLE Fact_Acct (
    Fact_Acct_ID      BIGINT PRIMARY KEY,
    AD_Client_ID      BIGINT NOT NULL,      -- Tenant
    AD_Org_ID         BIGINT NOT NULL,      -- Organization / Branch
    C_AcctSchema_ID   BIGINT NOT NULL,      -- Accounting Schema
    Account_ID        BIGINT NOT NULL,      -- FK C_ElementValue (COA)
    DateTrx           TIMESTAMP NOT NULL,   -- Transaction Date
    DateAcct          DATE NOT NULL,        -- Accounting Posting Date
    C_Period_ID       BIGINT NOT NULL,      -- Fiscal Period
    AD_Table_ID       BIGINT NOT NULL,      -- Source Document Table (e.g. C_Invoice)
    Record_ID         BIGINT NOT NULL,      -- Source Document ID
    Line_ID           BIGINT,               -- Source Document Line ID
    AmtSourceDr       NUMERIC(16,2),        -- Source Currency Debit
    AmtSourceCr       NUMERIC(16,2),        -- Source Currency Credit
    AmtAcctDr         NUMERIC(16,2),        -- Functional/Base Currency Debit
    AmtAcctCr         NUMERIC(16,2),        -- Functional/Base Currency Credit
    C_Currency_ID     BIGINT NOT NULL,      -- Currency
    C_BPartner_ID     BIGINT,               -- Business Partner (Customer/Vendor)
    M_Product_ID      BIGINT,               -- Product Dimension
    C_Activity_ID     BIGINT,               -- Cost Center Dimension
    PostingType       CHAR(1) DEFAULT 'A'   -- 'A'=Actual, 'B'=Budget, 'S'=Statistical
);
```

### 2.4 Transaction-to-Posting Flows in Metasfresh

#### Flow 1: Sales Invoice Posting (`Doc_Invoice`)
```
[Sales Invoice Total: Rs 11,800 (Taxable: Rs 10,000, 18% GST: Rs 1,800)]
-------------------------------------------------------------------------
DEBIT:  Accounts Receivable (Asset)            Rs 11,800  (Party=Customer)
CREDIT: Sales Revenue Account (Revenue)        Rs 10,000  (Product=Widget A)
CREDIT: GST Output SGST Account (Liability)       Rs 900
CREDIT: GST Output CGST Account (Liability)       Rs 900
-------------------------------------------------------------------------
TOTAL DEBIT = Rs 11,800 | TOTAL CREDIT = Rs 11,800  [BALANCED]
```

#### Flow 2: Customer Payment Receipt Posting (`Doc_Payment`)
```
[Customer pays Rs 11,800 via Bank Transfer into HDFC Bank]
-------------------------------------------------------------------------
DEBIT:  HDFC Current Bank Account (Asset)      Rs 11,800  (Bank=HDFC)
CREDIT: Accounts Receivable (Asset)            Rs 11,800  (Party=Customer)
-------------------------------------------------------------------------
TOTAL DEBIT = Rs 11,800 | TOTAL CREDIT = Rs 11,800  [BALANCED]
```

#### Flow 3: Purchase Invoice & Vendor Payment
```
[Purchase Invoice Total: Rs 5,900 (Taxable: Rs 5,000, 18% GST Input: Rs 900)]
DEBIT:  Purchase Expense / COGS (Expense)      Rs  5,000
DEBIT:  GST Input SGST (Asset/Credit)          Rs    450
DEBIT:  GST Input CGST (Asset/Credit)          Rs    450
CREDIT: Accounts Payable (Liability)           Rs  5,900  (Party=Vendor)

[Vendor Payment of Rs 5,900 from Bank Account]
DEBIT:  Accounts Payable (Liability)           Rs  5,900  (Party=Vendor)
CREDIT: HDFC Current Bank Account (Asset)      Rs  5,900
```

---

## 3. Key Takeaways & Lessons for Our Architecture

1. **Keep the Fact Table Simple and Focused**:
   - Compiere/Metasfresh's `Fact_Acct` pattern is the undisputed gold standard for ERP ledger design.
   - We should adopt a clean `jsh_gl_entry` (General Ledger Entry) table that records source document references, account, debit, credit, transaction date, and party/cost-center dimensions.
2. **Do Not Overcomplicate with Multi-Schema Engine**:
   - Metasfresh supports parallel multi-currency schemas (`C_AcctSchema`) with multiple cost methods (FIFO, LIFO, Standard) simultaneously. For an Indian SME ERP, a single primary accounting schema per tenant is simpler, faster, and much easier to maintain.
3. **Automated Posting Hooks**:
   - Posting must be triggered synchronously or event-driven upon document approval (`status='1'`), and reversed cleanly upon un-approval or cancellation.

---
*End of Artifact 02*
