# 05 - Procurement Phase P6: AP Payment Allocation & Advance Settlement Verification

**Document Ref**: `PROC-P6-VERIF-05`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE DESIGN & ACCOUNTING VERIFICATION**  

---

## 1. Executive Summary & Objective

This document verifies the operational workflows, double-entry general ledger mechanics, and document relationship DAG integration for **Phase P6: Accounts Payable (AP) Payment Settlement, Vendor Advances, and Multi-Invoice Allocation**.

The design mirrors the certified Sales S6 customer payment allocation architecture to ensure complete architectural symmetry across Sales and Procurement while incorporating Indian statutory TDS and MSME requirements.

---

## 2. Shared Financial Core Alignment

### 2.1 Reusing Financial Voucher Headers & Item Tables
Rather than creating procurement-specific payment tables, P6 reuses the canonical financial entities:
- `erp_account_head` (Financial Voucher Header: Type `付款` for Supplier Payment, `OrganId` for Supplier ID, `AccountId` for Bank Account, `TotalPrice`, `ChangeAmount`).
- `erp_account_item` (Allocation Breakdown Lines: Links `header_id` to `bill_id` [Purchase Invoice ID], `need_debt` [Gross Invoiced AP], `finish_debt` [Cumulative Paid], `each_amount` [Allocation on this voucher]).
- `erp_document_relationship` (DAG Lineage: `PURCHASE_INVOICE` $\rightarrow$ `PAYMENT_VOUCHER` under edge type `PAYMENT_SETTLEMENT`).

---

## 3. Financial Workflow Lifecycles & GL Journals

### 3.1 Standard Supplier Payment (Post-Invoice Settlement)
When paying one or more posted purchase invoices:

$$\text{Debit: Supplier Accounts Payable (2101)} \quad [\text{Gross Invoiced AP Settled}]$$
$$\text{Credit: Bank / Cash Account (1002)} \quad [\text{Net Cash Remitted to Vendor}]$$
$$\text{Credit: TDS Payable u/s 194Q (2205)} \quad [\text{TDS Deducted, if applicable}]$$
$$\text{Credit: Early Payment Cash Discount Received (4205)} \quad [\text{Prompt Payment Rebate, if any}]$$

* **Party Master Update**: Decrements `erp_supplier.all_need_pay` by the gross settled amount.
* **Invoice State Update**: Sets `pay_type` on `erp_depot_head` to `FULLY_PAID` or `PARTIALLY_PAID`.

---

### 3.2 Supplier Advance Payment (Pre-Invoice Disbursement)
When issuing an advance payment prior to receiving goods or supplier invoice:

$$\text{Debit: Supplier Advances & Prepayments (1105)} \quad [\text{Gross Advance Amount}]$$
$$\text{Credit: Bank / Cash Account (1002)} \quad [\text{Net Cash Disbursed}]$$
$$\text{Credit: TDS Payable u/s 194Q (2205)} \quad [\text{TDS on Advance per CBDT Circular 13/2021}]$$

---

### 3.3 Advance Adjustment Against Final Purchase Invoice
When the purchase invoice is subsequently posted and the advance is settled against it:

$$\text{Debit: Supplier Accounts Payable (2101)} \quad [\text{Invoice Amount Offset by Advance}]$$
$$\text{Credit: Supplier Advances & Prepayments (1105)} \quad [\text{Advance Balance Consumed}]$$

*Note*: Since TDS was already deducted at the advance stage, no secondary TDS is deducted on the portion of the invoice covered by the advance, preventing double deduction.

---

## 4. Multi-Invoice Settlement Engine Algorithms

When a single bank transfer / payment voucher settles multiple invoices:
1. **FIFO Allocation (Default)**: Automatically settles oldest overdue invoices first (critical for MSME 43B(h) priority compliance).
2. **Explicit Line Allocation**: User specifies exact amounts against individual invoice rows in the UI modal.
3. **Over-Allocation Guard**: Prevents allocation amount from exceeding the remaining unpaid invoice balance (`grossTotal - previousPaid`).

---

## 5. Verification Matrix

| Feature | Sales Architecture Baseline | Proposed Procurement P6 Architecture | Finding | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Voucher Header** | `erp_account_head` (type `收款`) | `erp_account_head` (type `付款`) | Shared table, symmetric type | **CONFIRMED** |
| **Allocation Lines** | `erp_account_item` | `erp_account_item` | Full multi-invoice split supported | **CONFIRMED** |
| **GL Journal** | `erp_gl_journal_entry` | `erp_gl_journal_entry` | Single canonical GL preserved | **CONFIRMED** |
| **Open Balances** | `erp_supplier.all_need_get` | `erp_supplier.all_need_pay` | Clean party master updates | **CONFIRMED** |
| **DAG Tracking** | `DocumentRelationshipService` | `DocumentRelationshipService` | Unified audit trail & graph visualization | **CONFIRMED** |
