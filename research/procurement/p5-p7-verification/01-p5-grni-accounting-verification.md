# 01 - Procurement Phase P5: GRNI Accrual & GL Accounting Verification

**Document Ref**: `PROC-P5-VERIF-01`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE STATUTORY & ACCOUNTING VERIFICATION**  

---

## 1. Executive Summary & Objective

This document verifies the accounting, statutory, and general ledger architecture for **Phase P5: Goods Received Not Invoiced (GRNI) Accrual, Invoice Clearing, Price/Quantity Variance, and Canonical Double-Entry General Ledger (GL) Integration**.

Every assumption from the initial proposal is evaluated against:
1. **Official Statutory & Accounting Standards**: Ind AS 2 / AS 2 (*Inventories*), Ind AS 37 (*Provisions, Contingent Liabilities & Contingent Assets*), Ind AS 1 / AS 1 (*Presentation of Financial Statements*), Framework for Preparation of Financial Statements.
2. **Industry Implementation References**: Frappe/ERPNext (`Stock Received But Not Billed`), metasfresh (`Unbilled Receipts & IPV`), Nexterp (*verifiable source status recorded*).
3. **Current Enterprise Core**: Reusing the canonical GL engine (`erp_gl_journal_entry`, `erp_gl_journal_line`) certified in Sales S5.

---

## 2. Statutory & Accounting Standards Baseline

### 2.1 Accrual Principle & Timing of Recognition
- **Ind AS 1 (Para 27-28) / AS 1**: Financial statements must be prepared on an accrual basis. Expenses and assets are recognized when they occur, not when cash or final supplier bills are received.
- **Ind AS 2 (Inventories, Para 10-11)**: Inventories are recognized when the entity obtains control, risks, and economic benefits of the goods, which occurs upon physical inward delivery and satisfactory quality inspection.
- **Liability Recognition (Ind AS 37)**: Upon receipt and acceptance of goods at the warehouse, a present legal/constructive obligation arises. If the supplier's formal tax invoice has not yet been processed, the liability is recognized as an accrued liability: **Goods Received Not Invoiced (GRNI)** / **Stock Received But Not Billed**.

### 2.2 Rejection & Quarantine Inventory Treatment
- Goods that fail quality inspection (QC Rejected / Quarantine) **must NOT** be capitalized to the active Inventory Asset account (`1401`).
- Rejected items remain in a quarantine suspense ledger at zero financial valuation or vendor custody liability, ensuring no inflation of sellable inventory or cost of goods sold.

---

## 3. Double-Entry Journal Lifecycle Verification

### Step 1: Goods Receipt (GRN Posting)
Upon GRN verification and QC acceptance of merchandise:

$$\text{Debit: Inventory Asset Account (1401)} \quad [\text{Accepted Qty} \times \text{PO Purchase Price}]$$
$$\text{Credit: Goods Received Not Invoiced (GRNI) Accrual (2105)} \quad [\text{Accepted Qty} \times \text{PO Purchase Price}]$$

* **Classification**: **CONFIRMED**
* **Statutory Justification**: Complies with Ind AS 2 for perpetual inventory recognition at acquisition cost and Ind AS 37 for accrued inward purchase obligations.

---

### Step 2: Statutory Purchase Invoice Posting (Matching GRN)
Upon receipt and 3-Way Match validation of the supplier's statutory tax invoice:

$$\text{Debit: GRNI / Stock Received But Not Billed (2105)} \quad [\text{Invoiced Qty} \times \text{PO Rate}]$$
$$\text{Debit: Input CGST Account (1301)} \quad [\text{Intra-state Eligible Tax}]$$
$$\text{Debit: Input SGST Account (1302)} \quad [\text{Intra-state Eligible Tax}]$$
$$\text{Debit: Input IGST Account (1303)} \quad [\text{Inter-state Eligible Tax}]$$
$$\text{Debit/Credit: Purchase Price Variance (PPV) (5105)} \quad [\text{Price Variance, if any}]$$
$$\text{Debit/Credit: Round Off Account (5901)} \quad [\text{Section 170 Rounding Adjustment}]$$
$$\text{Credit: Supplier Accounts Payable (Creditors) (2101)} \quad [\text{Total Statutory Invoice Amount}]$$

* **Classification**: **CONFIRMED**
* **Statutory Justification**: Clears the temporary GRNI accrual, establishes final legal Accounts Payable liability under Section 31 of CGST Act / Contract Law, and records input tax credit under Section 16(2) of CGST Act.

---

### Step 3: Purchase Price Variance (PPV) & Quantity Variance Handling

| Variance Type | Scenario | Accounting Treatment | Classification |
| :--- | :--- | :--- | :--- |
| **Quantity Variance (Over-Bill)** | Invoiced Qty > Accepted GRN Qty | **3-Way Match Gate BLOCKS posting**. Invoicing beyond accepted receipt requires GRN correction or vendor credit note. | **CONFIRMED** |
| **Quantity Variance (Partial Bill)** | Invoiced Qty < Accepted GRN Qty | GRNI is cleared proportionally for the invoiced quantity. Residual GRNI balance remains open until remaining invoice is posted or GRN closed. | **CONFIRMED** |
| **Price Variance (Standard Costing)** | Invoice Unit Rate $\neq$ PO Unit Rate | Difference posts to `5105 Purchase Price Variance (PPV)` expense/gain account. | **CONFIRMED** |
| **Price Variance (Moving Average Perpetual)** | Invoice Unit Rate $\neq$ PO Unit Rate | If stock remains on hand, moving average unit price on `erp_material_current_stock` is dynamically adjusted. If stock is already consumed/sold, variance posts to PPV/COGS. | **CONFIRMED** |

---

## 4. Single Canonical GL Architecture Review

### 4.1 Strict Single Source of Truth
The enterprise General Ledger was established and certified in Sales Phase S5 with the following schema:
- `erp_gl_journal_entry` (Voucher Header: Voucher Number, Source Doc Type, Source Doc ID, Total Debit, Total Credit, Status)
- `erp_gl_journal_line` (Voucher Lines: Account ID, Account Code, Account Name, Party ID, Entry Type `DEBIT`/`CREDIT`, Amount)

### 4.2 Prohibited Anti-Patterns
- **NO parallel Procurement GL table**: Procurement MUST NOT create `erp_procurement_gl_entry` or separate journal tables.
- **NO duplicate Chart of Accounts**: Both Sales and Procurement share canonical account codes:
  - `1002`: Bank / Cash Account
  - `1101`: Accounts Receivable (Debtors)
  - `1301`: Input CGST Recoverable
  - `1302`: Input SGST Recoverable
  - `1303`: Input IGST Recoverable
  - `1401`: Inventory Asset (Raw Materials / Spares / Finished Goods)
  - `2101`: Accounts Payable (Creditors)
  - `2105`: Goods Received Not Invoiced (GRNI) Accrual
  - `2106`: Landed Cost Clearing Account
  - `2205`: TDS Payable on Purchases (Section 194Q)
  - `4101`: Sales Revenue
  - `5101`: Cost of Goods Sold (COGS)
  - `5105`: Purchase Price Variance (PPV)
  - `5901`: Round Off Difference Account (Section 170)

---

## 5. Verification Assessment Matrix

| Design Area | Proposed Behavior | Reference Standard | Finding | Status |
| :--- | :--- | :--- | :--- | :--- |
| **GRNI Recognition** | Accrue at GRN acceptance | Ind AS 2, Ind AS 37, ERPNext, metasfresh | Matches accrual accounting principles | **CONFIRMED** |
| **Quarantine Stock** | Zero asset valuation impact | Ind AS 2 (Rejection criteria) | Prevents inventory inflation | **CONFIRMED** |
| **Invoice Clearing** | Debit GRNI, Credit AP | Ind AS 37, standard ERP practice | Accrual cleared upon bill recognition | **CONFIRMED** |
| **Input Tax Credit** | Debit Input CGST/SGST/IGST | CGST Act Section 16(2) | Authoritative tax recognition | **CONFIRMED** |
| **Blocked ITC (17(5))** | Debit Inventory Cost (Capitalized) | CGST Act Sec 17(5), Ind AS 2 Para 11 | Non-recoverable tax added to cost | **CONFIRMED** |
| **Price Variance** | Debit/Credit PPV Account | Ind AS 2 / Cost Accounting Standards | Standard variance accounting | **CONFIRMED** |
| **GL Posting Engine** | Reuse `SalesAccountingPostingService` GL | Certified Enterprise Baseline | Single canonical GL preserved | **CONFIRMED** |
