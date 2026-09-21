# Enterprise Finance & Accounting Architecture — Roadmap & Status Summary

**Document ID:** `FAAV-2026-ROADMAP-SUMMARY-001`  
**Date:** September 3, 2026  
**Architecture:** Double-Entry General Ledger, Schedule III Chart of Accounts, CGST Act 2017 & Companies Act 2013 Compliance  
**Current Milestone:** Phase 2B Completed & Safety Reviewed $\implies$ **Ready for Phase 2C**

---

## 1. Executive Status Overview

| Phase Category | Phase Name | Status | Test Coverage | Key Capabilities Delivered / Planned |
|---|---|:---:|:---:|---|
| **Phase 1** | Foundation: Chart of Accounts & GL Engine | **COMPLETED & APPROVED** | 100% | `erp_account_coa`, `erp_gl_entry`, Schedule III Tree Hierarchy, COA Manager UI. |
| **Phase 2A** | Sales Invoices & Credit Notes GL Engine | **COMPLETED & APPROVED** | 75/75 (100%) | `SALES_INVOICE`, `SALES_CREDIT_NOTE`, Output GST (2331-2333), Round-Off, Append-Only Reversals. |
| **Phase 2B** | Purchase Invoices & Debit Notes GL Engine | **COMPLETED & VERIFIED** | 92/92 (100%) | `PURCHASE_INVOICE`, `PURCHASE_DEBIT_NOTE`, 4-Way Classification (4110/4510/1111/4130), Sec 17(5) Blocked ITC, AP Balance. |
| **Phase 2C** | Customer Receipts & Supplier Payments GL | **NEXT IN LINE** | Planned | Cashier receipts (`MoneyIn` $\to$ Dr Bank, Cr AR 1220), Payments (`MoneyOut` $\to$ Dr AP 2320, Cr Bank), balance sync. |
| **Phase 2D** | Customer Advances & Bank Contra Transfers | **PENDING** | Planned | Customer Advances (Cr 2339 Liability), Supplier Advances (Dr 1260 Asset), Bank-to-Bank Contra (Giro). |
| **Phase 2E** | Sub-Ledger to GL Automated Reconciliation | **PENDING** | Planned | Automated variance detection: AR (1220 vs Customer balance), AP (2320 vs Vendor balance), Bank accounts. |
| **Phase 2F** | Perpetual Inventory Valuation & GRNI Accrual | **PENDING** | Planned | Physical GRN Accrual (Dr 1211 $\leftrightarrow$ Cr 2105), 3-Way Match Clearing, Delivery COGS (Dr 5001 $\leftrightarrow$ Cr 1212). |
| **Phase 3** | Journal Vouchers & Financial Statements | **PENDING** | Planned | Manual JV UI/Service, Trial Balance, Schedule III Profit & Loss, Balance Sheet, GL Drill-Down. |
| **Phase 4** | India Statutory Governance & Year-End Close | **PENDING** | Planned | TDS deductions (Sec 194C/J/I/Q), Challan 281, FY Retained Earnings Closing Wizard, Bank Reconciliation (BRS). |

---

## 2. Work Completed in Detail

### Phase 1: Accounting Foundation & Chart of Accounts (Completed)
1. **Hierarchical Chart of Accounts (`erp_account_coa`)**:
   - 5 root types: `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`.
   - Pre-seeded Indian Schedule III compliant template with parent-child rollups and leaf-node posting validation (`is_group = 0`).
2. **Double-Entry General Ledger Fact Table (`erp_gl_entry`)**:
   - Canonical append-only ledger storing `tenant_id`, `posting_date`, `account_id`, `party_type`, `party_id`, `debit`, `credit`, `voucher_type`, `voucher_id`, `voucher_no`, `line_no`, `narration`, `reversal_of_id`.
   - Strict invariant validator: $\sum \text{Debit} == \sum \text{Credit}$ down to 4 decimal places.
3. **Frontend Tree Manager**:
   - `/financial/chart_of_accounts` interactive COA hierarchy manager.

### Phase 2A: Sales Invoices & Credit Notes Auto-Posting (Completed)
1. **Sales Invoice GL Engine (`SALES_INVOICE`)**:
   - $\text{Dr 1220 Trade Receivables (Debtors)} \leftrightarrow \text{Cr 3110 Sales Revenue} + \text{Cr 2331/2332/2333 Output GST} \pm \text{Cr/Dr 4560 Round-Off}$.
2. **Sales Credit Note GL Engine (`SALES_CREDIT_NOTE`)**:
   - $\text{Dr 3110 Sales Return} + \text{Dr 2331/2332/2333 Output GST Reversal} \leftrightarrow \text{Cr 1220 Trade Receivables}$.
3. **Append-Only Reversals & Concurrency**:
   - Cancellations append inverse reversal batches with `reversal_of_id`.
   - Pessimistic locking (`SELECT ... FOR UPDATE`) + composite unique constraint `uk_gl_voucher_line`.

### Phase 2B: Purchase Invoices & Debit Notes Auto-Posting (Completed)
1. **Schedule III Purchase Classification Routing**:
   - **Direct Stock Purchases** $\implies$ $\text{Dr 4110 Purchases of Raw Materials} + \text{Dr 1251-1253 Input GST} \leftrightarrow \text{Cr 2320 Trade Payables}$.
   - **Operating Expenses** $\implies$ $\text{Dr 4510 Operating Expenses} + \text{Dr 1251-1253 Input GST} \leftrightarrow \text{Cr 2320 Trade Payables}$.
   - **Fixed Capital Assets** $\implies$ $\text{Dr 1111/1112 Plant \& Machinery / IT} + \text{Dr 1251-1253 Input GST} \leftrightarrow \text{Cr 2320 Trade Payables}$.
   - **Job Work Subcontracting** $\implies$ $\text{Dr 4130 Job Work Charges} + \text{Dr 1251-1253 Input GST} \leftrightarrow \text{Cr 2320 Trade Payables}$.
2. **Section 17(5) Ineligible Blocked ITC**:
   - Capitalized directly into purchase/expense head (0 Input Tax asset lines on 1251-1253).
3. **Purchase Debit Notes (`PURCHASE_DEBIT_NOTE`)**:
   - $\text{Dr 2320 Trade Payables} \leftrightarrow \text{Cr 4110/4510/1111/4130} + \text{Cr 1251-1253 Input GST Reversal}$.
4. **Single Authoritative AP Mutation Point**:
   - Atomic sync of `erp_supplier.all_need_pay`.

---

## 3. Remaining Phases & Next Steps

```
CURRENT STATUS: PHASE 2B COMPLETED & SAFETY REVIEWED
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ NEXT STEP: Phase 2C — Customer Receipts & Supplier Payments GL Engine           │
│ • Cashier MoneyIn (Receipts): Dr Bank/Cash COA ↔ Cr 1220 Trade Receivables      │
│ • Cashier MoneyOut (Payments): Dr 2320 Trade Payables ↔ Cr Bank/Cash COA        │
│ • Operational Sub-ledger sync: all_need_get & all_need_pay atomic adjustments   │
│ • Append-only reversal batches on receipt/payment cancellation                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2D — Customer Advances & Bank Contra Transfers                            │
│ • Customer Advances: Dr Bank/Cash ↔ Cr 2339 Advance Liability (Current Liab)    │
│ • Supplier Advances: Dr 1260 Advances to Suppliers (Current Asset) ↔ Cr Bank    │
│ • Contra Transfers (Giro): Dr Destination Bank/Cash ↔ Cr Source Bank/Cash       │
│ • Invoice Advance Settling: Dr 2339 Advance Liability ↔ Cr 1220 Receivables     │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2E — Sub-Ledger to GL Automated Reconciliation Dashboard                  │
│ • Customer AR reconciliation: erp_supplier.all_need_get vs GL Account 1220     │
│ • Supplier AP reconciliation: erp_supplier.all_need_pay vs GL Account 2320     │
│ • Bank Balance reconciliation: erp_account.current_amount vs GL Bank Accounts   │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2F — Perpetual Inventory Valuation & GRNI Accrual Integration             │
│ • Physical Goods Receipt (GRN): Dr 1211 Raw Materials ↔ Cr 2105 GRNI Accrual    │
│ • Commercial Invoice 3-Way Match: Dr 2105 GRNI Clearing ↔ Cr 2320 Payables     │
│ • Purchase Price Variance (PPV): Dr/Cr 4115 PPV on rate discrepancies           │
│ • Delivery Dispatch COGS: Dr 5001 Cost of Goods Sold ↔ Cr 1212 Finished Goods   │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Phase 3 — Journal Voucher Module & Real-Time Financial Statements               │
│ • Manual Journal Voucher Form & Approval Workflow (/financial/journal_vouchers) │
│ • Real-time Trial Balance (/financial/trial_balance)                            │
│ • Schedule III Profit & Loss Statement (/financial/profit_loss)                 │
│ • Schedule III Balance Sheet with Net Profit roll-forward (/financial/bs)       │
│ • General Ledger Drill-Down Report (/financial/general_ledger)                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Phase 4 — India Statutory Governance & Year-End Period Closing                  │
│ • TDS Ledger Deductions (Sec 194C/J/I/Q) & Challan ITNS 281 Tax Payment JV      │
│ • Financial Year Retained Earnings Closing Wizard (Nominal Account zeroing)     │
│ • Bank Reconciliation Statement (BRS) statement upload tool                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 2C Detailed Specification (Immediate Next Scope)

When authorized, **Phase 2C** will implement:

### 1. Customer Receipts (`MoneyIn` / `Receipt`)
- **Trigger**: Approval of Receipt Voucher in `AccountHeadService.batchSetStatus()` / `MoneyIn`.
- **Double-Entry Journal Batch**:
  - **Debit:** Bank Account / Cash Drawer (COA mapped from `erp_account.coa_id` e.g. `1121 HDFC Bank Current A/c` or `1111 Cash in Hand`).
  - **Credit:** `1220 Trade Receivables (Debtors)` (`party_type = 'CUSTOMER'`, `party_id = customerId`).
- **Sub-Ledger Adjustment**: Decrements `erp_supplier.all_need_get` atomically.
- **Lineage**: Links `AccountItem.bill_id` to update individual invoice outstanding debt fields.

### 2. Supplier Payments (`MoneyOut` / `Payment`)
- **Trigger**: Approval of Payment Voucher in `AccountHeadService.batchSetStatus()` / `MoneyOut`.
- **Double-Entry Journal Batch**:
  - **Debit:** `2320 Trade Payables (Creditors)` (`party_type = 'SUPPLIER'`, `party_id = supplierId`).
  - **Credit:** Bank Account / Cash Drawer (COA mapped from `erp_account.coa_id`).
- **Sub-Ledger Adjustment**: Decrements `erp_supplier.all_need_pay` atomically.

### 3. Reversals & Cancellations
- Reversing/voiding an approved receipt or payment appends an exact inverse journal batch (`RECEIPT_REVERSAL`, `PAYMENT_REVERSAL`) and restores the customer/supplier operational balances.

### 4. Idempotency & Pessimistic Concurrency
- `SELECT id FROM erp_account_head WHERE id = ? FOR UPDATE`
- Existence check on `erp_gl_entry`
- `uk_gl_voucher_line` database unique constraint.

---

## 5. Summary Metrics

- **Completed Phases:** Phase 1, Phase 2A, Phase 2B (3 milestones)
- **Remaining Phases in Phase 2:** Phase 2C, Phase 2D, Phase 2E, Phase 2F (4 milestones)
- **Major Subsequent Phases:** Phase 3 (Financial Statements & JV), Phase 4 (Statutory TDS & FY Close) (2 milestones)
- **Total Passing Tests to Date:** 92 / 92 (100% Build Success)
