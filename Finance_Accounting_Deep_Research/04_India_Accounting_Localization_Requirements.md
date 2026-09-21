# Internal Research Artifact: India-Specific Accounting & Statutory Localization Requirements

**Jurisdiction:** Republic of India  
**Applicable Frameworks:** Companies Act 2013 (Schedule III), Central Goods and Services Tax (CGST) Act 2017, Income Tax Act 1961 (TDS/TCS), Indian Accounting Standards (Ind AS / AS).  
**Purpose:** Establish exact statutory accounting rules and standard Chart of Accounts hierarchy for Indian SMEs and Enterprises.

---

## 1. Statutory Financial Year & Accounting Periods

- **Standard Fiscal Year:** April 1st to March 31st (e.g., `FY 2026-27` spanning `2026-04-01` to `2027-03-31`).
- **Quarterly Alignment:**
  - Q1: April – June
  - Q2: July – September
  - Q3: October – December
  - Q4: January – March
- **Statutory Year-End Closing Requirement:**
  - Balances of all Nominal Accounts (Revenue & Expense) must be rolled up into `Reserves & Surplus -> Profit & Loss Account / Retained Earnings`.
  - Balance Sheet accounts (Real and Personal accounts) carry forward their closing balances as the opening balances for the next Financial Year.
  - Period Lock: Closed financial years must be locked against backdated voucher creation or modification.

---

## 2. Standard Indian Chart of Accounts Hierarchy (Schedule III Aligned)

```
1000 - ASSETS
  1100 - Non-Current Assets
    1110 - Property, Plant & Equipment (Fixed Assets)
      1111 - Plant & Machinery
      1112 - Office Equipment & Computers
      1113 - Furniture & Fixtures
      1119 - Less: Accumulated Depreciation
    1120 - Capital Work-in-Progress (CWIP)
  1200 - Current Assets
    1210 - Inventories (Stock Assets)
      1211 - Raw Materials Inventory
      1212 - Finished Goods Inventory
      1213 - Work-in-Progress (WIP)
    1220 - Trade Receivables (Sundry Debtors)
    1230 - Cash and Cash Equivalents
      1231 - Cash in Hand / Petty Cash
      1232 - Bank Accounts (HDFC / ICICI / SBI)
    1240 - Loans, Advances & Deposits
      1241 - Advance to Suppliers
      1242 - Security Deposits
    1250 - Other Current Assets (Duties & Taxes Input Credits)
      1251 - Input CGST (Electronic Credit Ledger)
      1252 - Input SGST (Electronic Credit Ledger)
      1253 - Input IGST (Electronic Credit Ledger)
      1254 - TDS Receivable (Tax Deducted by Customers)

2000 - LIABILITIES & EQUITY
  2100 - Equity / Shareholders' Funds
    2110 - Share Capital / Partner's Capital
    2120 - Reserves & Surplus (Retained Earnings / P&L Surplus)
  2200 - Non-Current Liabilities
    2210 - Long-Term Borrowings (Bank Term Loans)
  2300 - Current Liabilities
    2310 - Short-Term Borrowings (Working Capital / OD / CC)
    2320 - Trade Payables (Sundry Creditors)
    2330 - Other Current Liabilities & Provisions
      2331 - Output CGST (Electronic Liability Ledger)
      2332 - Output SGST (Electronic Liability Ledger)
      2333 - Output IGST (Electronic Liability Ledger)
      2334 - RCM Tax Liability (Reverse Charge)
      2335 - TDS Payable - Section 194C (Contractors)
      2336 - TDS Payable - Section 194J (Professionals)
      2337 - TDS Payable - Section 194I (Rent)
      2338 - TDS Payable - Section 194Q (Purchase of Goods)
      2339 - Advance from Customers

3000 - REVENUE / INCOME
  3100 - Revenue from Operations
    3110 - Domestic Sales (Taxable Goods)
    3120 - Export Sales / Zero Rated Sales
    3130 - Job Work Service Revenue
    3140 - Scrap Sales
  3200 - Other Income
    3210 - Interest Income
    3220 - Discounts & Rebates Received

4000 - EXPENSES
  4100 - Cost of Materials & Purchases (Direct Expenses)
    4110 - Purchases of Raw Materials / Stock-in-Trade
    4120 - Inward Freight & Cartage
    4130 - Direct Job Work Processing Charges
  4200 - Employee Benefits Expense
    4210 - Salaries & Wages
    4220 - Staff Welfare & Allowances
  4300 - Finance Costs
    4310 - Bank Charges & Processing Fees
    4320 - Interest on Loans & Overdrafts
  4400 - Depreciation & Amortization
  4500 - Other Operating & Administrative Expenses (Indirect Expenses)
    4510 - Rent, Rates & Taxes
    4520 - Electricity, Power & Fuel
    4530 - Legal, Audit & Professional Fees
    4540 - Repairs & Maintenance
    4550 - Printing, Stationery & Communication
    4560 - Round-Off Difference
```

---

## 3. GST Accounting Ledger Flow (Double-Entry)

### 3.1 Outward Tax Invoice (Sales)
- **Debit:** Trade Receivables (Customer) = Gross Invoice Amount (e.g. Rs 11,800)
- **Credit:** Sales Revenue Account = Taxable Value (Rs 10,000)
- **Credit:** Output CGST Account = CGST Amount (Rs 900)
- **Credit:** Output SGST Account = SGST Amount (Rs 900)

### 3.2 Inward Tax Invoice (Purchase with ITC)
- **Debit:** Purchase Expense / Inventory = Taxable Value (Rs 5,000)
- **Debit:** Input CGST Account = Eligible CGST ITC (Rs 450)
- **Debit:** Input SGST Account = Eligible SGST ITC (Rs 450)
- **Credit:** Trade Payables (Supplier) = Gross Invoice Amount (Rs 5,900)

### 3.3 Reverse Charge Mechanism (RCM) Accounting
Under Section 9(3) / 9(4) (e.g., Goods Transport Agency / Legal Services):
- **Debit:** Freight Expense = Rs 1,000
- **Debit:** Input CGST (RCM) = Rs 25
- **Debit:** Input SGST (RCM) = Rs 25
- **Credit:** Trade Payables (GTA Vendor) = Rs 1,000
- **Credit:** Output CGST (RCM Liability) = Rs 25
- **Credit:** Output SGST (RCM Liability) = Rs 25

### 3.4 Monthly GSTR-3B Tax Offset & Payment (Contra / Settlement Entry)
At the end of the tax period, Output Tax Liability is offset against available Input Tax Credit:
```
DEBIT:  Output CGST Account                    Rs 900
DEBIT:  Output SGST Account                    Rs 900
CREDIT: Input CGST Account                     Rs 450
CREDIT: Input SGST Account                     Rs 450
CREDIT: HDFC Bank Account (Net GST Cash Paid)  Rs 900
```

---

## 4. TDS (Tax Deducted at Source) Accounting Flow

### 4.1 Purchase of Professional Services (Section 194J - 10% TDS)
- Gross Bill: Rs 1,00,000 + 18% GST (Rs 18,000) = Rs 1,18,000.
- TDS on Taxable Value (10% of Rs 1,00,000) = Rs 10,000.
```
DEBIT:  Legal & Professional Fees (Expense)   Rs 1,00,000
DEBIT:  Input CGST Account (Asset)             Rs   9,000
DEBIT:  Input SGST Account (Asset)             Rs   9,000
CREDIT: TDS Payable - Sec 194J (Liability)     Rs  10,000
CREDIT: Trade Payables (Vendor Net Payable)    Rs 1,08,000
```

### 4.2 Remittance of TDS to Government (Challan ITNS 281)
On or before the 7th of the following month:
```
DEBIT:  TDS Payable - Sec 194J                 Rs  10,000
CREDIT: HDFC Bank Account                      Rs  10,000
```

---

## 5. Classification of India-Specific Requirements

| Requirement | Category | Priority | Rationale |
|---|---|---|---|
| **Schedule III Standard Chart of Accounts** | Mandatory Core | **P0** | Foundation for all double-entry postings and balance sheets. |
| **Double-Entry General Ledger (GL Entry)** | Mandatory Core | **P0** | Ensures mathematical balancing (Debit = Credit) and audit compliance. |
| **GST Input / Output GL Ledgers** | Statutory Core | **P0** | Required for accurate tracking of ITC vs Output Tax Liability. |
| **Journal Voucher (JV) Screen & Engine** | Functional Core | **P1** | Essential for manual adjustments, depreciation, provisions, and tax offsets. |
| **Financial Statements (Trial Balance, P&L, Balance Sheet)** | Reporting Core | **P1** | Required for management reporting and statutory tax filing. |
| **TDS Ledgers & Deduction on Payment** | Statutory Core | **P1** | Required for Income Tax compliance (Sec 194C, 194J, 194Q). |
| **Bank Reconciliation (BRS)** | Operational | **P2** | Essential for matching internal bank ledger with bank statements. |
| **Financial Year Close & Period Locking** | Governance | **P2** | Prevents backdated tampering and automates P&L retained earnings rollover. |
| **Automated E-Way Bill / E-Invoice Direct API Sync** | Integration | **P3** | Already partially supported via e-Document cockpit; enhance as needed. |

---
*End of Artifact 04*
