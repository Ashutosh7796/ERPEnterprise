# Phase 2C + 2D — Pre-Implementation Forensic Analysis & Architecture Validation Report

**Document ID:** `FAAV-2026-PHASE2C2D-PRE-IMPL-001`  
**Date:** September 3, 2026  
**Module:** Enterprise Finance & Accounting (`ERPSystem-boot` backend + `ERPSystem-web-react` frontend)  
**Scope:** Combined Phase 2C (Customer Receipts & Supplier Payments) + Phase 2D (Advances & Bank/Cash Contra Transfers)  
**Status:** **AWAITING USER APPROVAL (PRE-IMPLEMENTATION GATE)**  
**Safety Classification:** Strictly Read-Only Forensic Analysis — Zero Code / Schema Modifications Executed

---

## 1. Executive Summary

This pre-implementation forensic analysis covers the combined requirements for **Phase 2C** (*Customer Receipts & Supplier Payments General Ledger Engine*) and **Phase 2D** (*Customer Advances, Supplier Advances & Bank/Cash Contra Transfers*).

### Forensic Conclusions:
1. **Commercial Foundation is Sound**: The ERP possesses existing data structures for financial vouchers (`erp_account_head`), line allocations (`erp_account_item`), bank/cash drawers (`erp_account`), customer/supplier open balances (`erp_supplier.all_need_get` / `all_need_pay` / `advance_in`), and invoice debts (`erp_depot_head.change_amount` / `debt`).
2. **Current GL Posting Gap**:
   - Standard cashier receipts (`Receipt` / `"收款"`), payments (`Payment` / `"付款"`), advances (`Receive Advance Payment` / `"收预付款"`), and bank transfers (`Transfer Funds` / `"转账"`) currently **do NOT write to the canonical double-entry General Ledger (`erp_gl_entry`)**.
   - Partial legacy prototypes in `SalesPaymentAllocationService` and `ApPaymentAllocationService` wrote to deprecated tables (`erp_gl_journal_entry` / `erp_gl_journal_line`) with hardcoded non-Schedule III account codes (`1002`, `1101`, `2101`).
3. **Single Authoritative Posting Path Mandate**: Phase 2C and Phase 2D must route 100% of financial voucher transactions through a dedicated, unified, idempotent posting engine: `FinancialAccountingPostingService`, posting strictly to canonical `erp_gl_entry` with Schedule III Chart of Accounts (`erp_account_coa`).
4. **Zero Impact on Upstream Modules**: Commercial invoicing, GST calculation snapshots, inventory stock valuation, and Phase 2A / 2B posting paths remain completely untouched.

---

## 2. Current MoneyIn (Customer Receipts) Architecture

```
                               CURRENT MONEYIN LIFECYCLE
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Client / UI: MoneyInList.tsx / FinancialModal.tsx                                    │
│    • Form inputs: customer (organId), settlement account (accountId), amount, remarks   │
│    • Endpoint: POST /accountHead/addAccountHeadAndDetail                                │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Controller & Service: AccountHeadController → AccountHeadService.addAccountHeadAndDetail
│    • Inserts erp_account_head: type='收款' (or 'Receipt'), status='0' (UNAUDITED)        │
│    • AccountItemService.saveDetials inserts erp_account_item rows (accountId, eachAmount)│
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Approval State Machine: POST /accountHead/batchSetStatus (status='1')                │
│    • AccountHeadService.batchSetStatus flips status='1' (AUDITED)                       │
│    • CURRENT GAP: No GL entry written to erp_gl_entry!                                  │
│    • Balance: AccountService dynamically calculates Bank Balance via AccountMapperEx    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Trace Details:
- **Entity**: `erp_account_head` (`type = '收款'` / `'Receipt'`, `organ_id = customerId`, `account_id = bankAccountId`, `change_amount = totalReceiptAmount`).
- **Sub-Items**: `erp_account_item` (`header_id = accountHead.id`, `account_id = bankAccountId`, `bill_id = salesInvoiceId`, `need_debt`, `finishDebt`, `each_amount`).
- **Dynamic Bank Balance**: `AccountService` aggregates bank balances by querying `AccountMapperEx.getAccountSumByHead` and `getAccountSumByDetail`.

---

## 3. Current MoneyOut (Supplier Payments) Architecture

```
                               CURRENT MONEYOUT LIFECYCLE
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Client / UI: MoneyOutList.tsx / FinancialModal.tsx                                   │
│    • Form inputs: vendor (organId), settlement account (accountId), amount, remarks     │
│    • Endpoint: POST /accountHead/addAccountHeadAndDetail                                │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Controller & Service: AccountHeadController → AccountHeadService.addAccountHeadAndDetail
│    • Inserts erp_account_head: type='付款' (or 'Payment'), status='0' (UNAUDITED)        │
│    • AccountItemService.saveDetials sets eachAmount = 0 - eachAmount (negative for out) │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Approval State Machine: POST /accountHead/batchSetStatus (status='1')                │
│    • AccountHeadService.batchSetStatus flips status='1' (AUDITED)                       │
│    • CURRENT GAP: No canonical GL entry written to erp_gl_entry!                        │
│    • Supplier Balance: all_need_pay updated only in separate allocation services        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Trace Details:
- **Entity**: `erp_account_head` (`type = '付款'` / `'Payment'`, `organ_id = supplierId`, `account_id = bankAccountId`, `change_amount = totalPaymentAmount`).
- **Sub-Items**: `erp_account_item` (`header_id = accountHead.id`, `bill_id = purchaseInvoiceId`, `each_amount = -amount`).
- **Supplier Balance**: `erp_supplier.all_need_pay` represents open payable balance.

---

## 4. Current Giro (Bank / Cash Contra Transfers) Architecture

```
                                CURRENT GIRO LIFECYCLE
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Client / UI: GiroList.tsx / FinancialModal.tsx                                       │
│    • Form inputs: Source Account (accountId), Destination Account (in rows), Amount     │
│    • Endpoint: POST /accountHead/addAccountHeadAndDetail (type='转账' / 'Transfer Funds')│
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Controller & Service: AccountHeadController → AccountHeadService.addAccountHeadAndDetail
│    • Inserts erp_account_head: type='转账', account_id = sourceAccountId, changeAmount  │
│    • Inserts erp_account_item: account_id = destAccountId, eachAmount = transferAmount  │
│    • Validation: Verifies sourceAccountId != destAccountId (prevents transfer to self)  │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Approval State Machine: POST /accountHead/batchSetStatus (status='1')                │
│    • AccountHeadService.batchSetStatus flips status='1' (AUDITED)                       │
│    • Dynamic Outflow: AccountMapperEx.getAccountSumByHead(sourceAccountId)             │
│    • Dynamic Inflow: AccountMapperEx.getAccountSumByDetail(destAccountId)               │
│    • CURRENT GAP: 0 GL Entries generated in erp_gl_entry!                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Target Accounting for Giro:
- **Debit:** Destination Bank / Cash Account (COA mapped from `erp_account.coa_id` of `AccountItem.accountId`).
- **Credit:** Source Bank / Cash Account (COA mapped from `erp_account.coa_id` of `AccountHead.accountId`).
- **Mathematical Invariant:** $\text{Debit} == \text{Credit}$.
- **Boundary Verification:** Zero impact on Revenue, Expense, AR, AP, GST, or Inventory!

---

## 5. AccountItem & `bill_id` Allocation Analysis

`erp_account_item` is the sub-ledger invoice allocation line connecting financial payments to commercial documents:

| Case | Scenario | Current Behavior | Target Double-Entry GL Impact |
|---|---|---|---|
| **Case A** | **Full Settlement**<br>Invoice = ₹10,000<br>Receipt = ₹10,000 | 1 `AccountItem` with `bill_id = inv.id`, `eachAmount = 10,000`, `finishDebt = 10,000`. Invoice open balance becomes ₹0. | $\text{Dr Bank 10,000} \leftrightarrow \text{Cr 1220 AR 10,000}$<br>Customer balance `all_need_get` decrements by ₹10,000. |
| **Case B** | **Partial Settlement**<br>Invoice = ₹10,000<br>Receipt = ₹6,000 | 1 `AccountItem` with `bill_id = inv.id`, `eachAmount = 6,000`, `finishDebt = 6,000`. Invoice open balance becomes ₹4,000. | $\text{Dr Bank 6,000} \leftrightarrow \text{Cr 1220 AR 6,000}$<br>Customer balance `all_need_get` decrements by ₹6,000. |
| **Case C** | **Multiple Invoices in 1 Receipt**<br>Receipt = ₹15,000<br>Inv A = ₹10,000, Inv B = ₹5,000 | 2 `AccountItem` records under same `header_id`. Each `bill_id` updated accordingly. | $\text{Dr Bank 15,000} \leftrightarrow \text{Cr 1220 AR 15,000}$<br>`all_need_get` decrements by total ₹15,000. |
| **Case D** | **1 Invoice, Multiple Receipts**<br>Inv = ₹10,000<br>R1=₹4,000, R2=₹3,000, R3=₹3,000 | 3 separate `AccountHead` vouchers over time, each creating 1 `AccountItem` pointing to `inv.id`. Cumulative `changeAmount` reaches ₹10,000. | 3 separate GL vouchers posted over time. Total credited to `1220` = ₹10,000. |
| **Case E** | **Unallocated Receipt**<br>Receipt = ₹10,000<br>No invoice selected | `AccountItem.bill_id = null`. If `type = 'Receipt'`, treats as unallocated debtor payment on `1220`. If `type = 'Receive Advance Payment'`, treats as customer advance on `2339`. | • Receipt: $\text{Dr Bank} \leftrightarrow \text{Cr 1220 AR}$<br>• Advance: $\text{Dr Bank} \leftrightarrow \text{Cr 2339 Advance Liability}$ |

---

## 6. Existing AR/AP & Balance Mutation Map

The repository was searched exhaustively for operational balance mutations to guarantee **zero double-mutations**:

| Business Event | Existing Operational Mutation | Location | GL Posting Needed? | Double-Mutation Risk & Safeguard |
|---|---|---|:---:|---|
| **Sales Invoice Approval** | `all_need_get` += Total | `SalesAccountingPostingService.java:230` | Yes (Phase 2A DONE) | **SAFE:** Single authoritative mutation point. |
| **Sales Invoice Cancellation** | `all_need_get` -= Total | `SalesAccountingPostingService.java:484` | Yes (Phase 2A DONE) | **SAFE:** Reversal batch appends inverse entry. |
| **Sales Credit Note Approval** | `all_need_get` -= Total | `SalesAccountingPostingService.java:628` | Yes (Phase 2A DONE) | **SAFE:** Single authoritative mutation point. |
| **Purchase Invoice Approval** | `all_need_pay` += Total | `PurchaseAccountingPostingService.java:320` | Yes (Phase 2B DONE) | **SAFE:** Single authoritative mutation point. |
| **Purchase Invoice Cancellation** | `all_need_pay` -= Total | `PurchaseAccountingPostingService.java:358` | Yes (Phase 2B DONE) | **SAFE:** Reversal batch appends inverse entry. |
| **Purchase Debit Note Approval** | `all_need_pay` -= Total | `PurchaseAccountingPostingService.java:555` | Yes (Phase 2B DONE) | **SAFE:** Single authoritative mutation point. |
| **Customer Receipt Approval** | `all_need_get` -= Amount | To be unified in Phase 2C | **YES (Phase 2C)** | **RISK:** Legacy `SalesPaymentAllocationService` had ad-hoc query. **Safeguard:** Centralize exclusively in `FinancialAccountingPostingService`. |
| **Customer Receipt Reversal** | `all_need_get` += Amount | To be unified in Phase 2C | **YES (Phase 2C)** | **Safeguard:** Append `CUSTOMER_RECEIPT_REVERSAL` batch and restore balance. |
| **Supplier Payment Approval** | `all_need_pay` -= Amount | To be unified in Phase 2C | **YES (Phase 2C)** | **RISK:** Legacy `ApPaymentAllocationService` had ad-hoc query. **Safeguard:** Centralize exclusively in `FinancialAccountingPostingService`. |
| **Supplier Payment Reversal** | `all_need_pay` += Amount | To be unified in Phase 2C | **YES (Phase 2C)** | **Safeguard:** Append `SUPPLIER_PAYMENT_REVERSAL` batch and restore balance. |
| **Customer Advance Approval** | `advance_in` += Amount | `SupplierService.java:290` | **YES (Phase 2D)** | **Safeguard:** Post $\text{Dr Bank} \leftrightarrow \text{Cr 2339}$. `all_need_get` is NOT touched. |
| **Customer Advance Offset** | `advance_in` -= Amount, `all_need_get` -= Amount | To be unified in Phase 2D | **YES (Phase 2D)** | **Safeguard:** Post $\text{Dr 2339} \leftrightarrow \text{Cr 1220}$. |
| **Supplier Advance Approval** | None on `all_need_pay` | To be unified in Phase 2D | **YES (Phase 2D)** | **Safeguard:** Post $\text{Dr 1260} \leftrightarrow \text{Cr Bank}$. `all_need_pay` is NOT touched. |
| **Supplier Advance Offset** | `all_need_pay` -= Amount | To be unified in Phase 2D | **YES (Phase 2D)** | **Safeguard:** Post $\text{Dr 2320} \leftrightarrow \text{Cr 1260}$. |
| **Giro Contra Transfer** | Dynamic bank balance calc | `AccountService.java:120` | **YES (Phase 2D)** | **SAFE:** Post $\text{Dr Dest Bank} \leftrightarrow \text{Cr Src Bank}$. 0 AR/AP/Revenue/Expense impact. |

---

## 7. Chart of Accounts (COA) Account Mapping

All accounts validated against Schedule III Indian Chart of Accounts in `TenantBootstrapService.java`:

| Account Code | Account Name | Root Type | Normal Balance | Schedule III Classification | Phase Role |
|:---:|---|:---:|:---:|---|---|
| **`1121` / `1232`** | Primary Operating Bank Account | `ASSET` | `DEBIT` | Cash and Cash Equivalents | Bank Receipts, Payments, Contra Transfers |
| **`1111` / `1231`** | Cash in Hand / Petty Cash | `ASSET` | `DEBIT` | Cash and Cash Equivalents | Cash Receipts, Payments, Contra Transfers |
| **`1220`** | Trade Receivables (Sundry Debtors) | `ASSET` | `DEBIT` | Current Assets - Trade Receivables | Customer Receipts (`MoneyIn`), Advance Application |
| **`2320`** | Trade Payables (Sundry Creditors) | `LIABILITY` | `CREDIT` | Current Liabilities - Trade Payables | Supplier Payments (`MoneyOut`), Advance Application |
| **`2339`** | Advance from Customers | `LIABILITY` | `CREDIT` | Current Liabilities - Other Current Liab | Customer Advances (`AdvanceIn`), Advance Offset |
| **`1260`** | Advances to Suppliers / Prepayments | `ASSET` | `DEBIT` | Current Assets - Short Term Loans & Adv | Supplier Advances, Advance Offset |
| **`4560`** | Fractional Round-Off Difference | `EXPENSE` | `DEBIT` | Administrative / Round-off | Section 170 Balancing (if any) |

---

## 8. Double-Entry Accounting Specifications

### 8.1 Customer Receipt (`CUSTOMER_RECEIPT`) — Phase 2C
```text
Dr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹Amount
    Cr 1220 Trade Receivables (party_id = customerId)           ₹Amount
```
- **Operational Sync:** Decrements `erp_supplier.all_need_get`.
- **Reversal (`CUSTOMER_RECEIPT_REVERSAL`):**
```text
Dr 1220 Trade Receivables (party_id = customerId)           ₹Amount
    Cr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹Amount
```

### 8.2 Supplier Payment (`SUPPLIER_PAYMENT`) — Phase 2C
```text
Dr 2320 Trade Payables (party_id = supplierId)              ₹Amount
    Cr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹Amount
```
- **Operational Sync:** Decrements `erp_supplier.all_need_pay`.
- **Reversal (`SUPPLIER_PAYMENT_REVERSAL`):**
```text
Dr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹Amount
    Cr 2320 Trade Payables (party_id = supplierId)              ₹Amount
```

### 8.3 Customer Advance (`CUSTOMER_ADVANCE`) — Phase 2D
```text
Dr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹GrossAdvance
    Cr 2339 Advance from Customers (party_id = customerId)      ₹GrossAdvance
```
- **Operational Sync:** Increments `erp_supplier.advance_in`. `all_need_get` is NOT changed.

### 8.4 Customer Advance Application to Invoice (`CUSTOMER_ADVANCE_OFFSET`) — Phase 2D
```text
Dr 2339 Advance from Customers (party_id = customerId)      ₹OffsetAmount
    Cr 1220 Trade Receivables (party_id = customerId)           ₹OffsetAmount
```
- **Operational Sync:** Decrements `erp_supplier.advance_in` and decrements `erp_supplier.all_need_get`.

### 8.5 Supplier Advance (`SUPPLIER_ADVANCE`) — Phase 2D
```text
Dr 1260 Advances to Suppliers (party_id = supplierId)       ₹GrossAdvance
    Cr [Bank / Cash Account] (from erp_account.coa_id / 1232)    ₹GrossAdvance
```
- **Operational Sync:** `all_need_pay` is NOT changed.

### 8.6 Supplier Advance Application to Invoice (`SUPPLIER_ADVANCE_OFFSET`) — Phase 2D
```text
Dr 2320 Trade Payables (party_id = supplierId)              ₹OffsetAmount
    Cr 1260 Advances to Suppliers (party_id = supplierId)       ₹OffsetAmount
```
- **Operational Sync:** Decrements `erp_supplier.all_need_pay`.

### 8.7 Bank / Cash Contra Transfer (`BANK_CONTRA_TRANSFER`) — Phase 2D
```text
Dr [Destination Bank / Cash Account] (from erp_account.coa_id) ₹TransferAmount
    Cr [Source Bank / Cash Account] (from erp_account.coa_id)      ₹TransferAmount
```
- **Invariant:** Total Debit = Total Credit. Revenue = 0, Expense = 0, AR = 0, AP = 0, GST = 0, Stock = 0.

---

## 9. Append-Only Reversal & Concurrency Architecture

### 9.1 Immutability & Reversals:
- Historical records in `erp_gl_entry` are **NEVER UPDATED OR DELETED**.
- When an approved receipt, payment, advance, or contra transfer is cancelled/unapproved:
  1. A new reversal batch is appended to `erp_gl_entry`.
  2. The reversal lines have `reversal_of_id` pointing to the original voucher ID.
  3. The reversal lines invert Debits and Credits exactly.
  4. Operational customer/supplier balances (`all_need_get`, `all_need_pay`, `advance_in`) are restored atomically.

### 9.2 Triple-Layer Concurrency & Idempotency Protection:
1. **Pessimistic Row Locking:** `SELECT id, status FROM erp_account_head WHERE id = ? FOR UPDATE`.
2. **Deterministic Voucher Key:** `(tenant_id, voucher_type, voucher_id)`.
3. **Database Uniqueness Constraint:** `uk_gl_voucher_line (tenant_id, voucher_type, voucher_id, line_no)` prevents duplicate line insertion under heavy concurrent retries.

---

## 10. Boundaries & Cross-Module Isolation

1. **GST Boundary:**
   - Receipts, payments, advances, and contra transfers do NOT compute or mutate GST liabilities.
   - Commercial invoice GST snapshots (`DocumentTaxSnapshot`) remain the sole authoritative source of GST accounting.
2. **Inventory / GRN Boundary:**
   - Phase 2C + 2D has **ZERO interaction with inventory, stock valuation, or GRN/GRNI**.
   - Physical stock ledgers and moving average recalculations belong strictly to **Phase 2F**.
3. **Frontend Impact:**
   - Routine cashier payment screens (`MoneyInList.tsx`, `MoneyOutList.tsx`, `AdvanceInList.tsx`, `GiroList.tsx`) remain 100% operational with no breaking UI changes. Backend GL posting executes transparently upon voucher approval.

---

## 11. Mandatory Ambiguity Register

| Ambiguity ID | Description | Forensic Finding & Architectural Resolution |
|---|---|---|
| **AMB-001** | What does an unallocated `MoneyIn` represent? | If `type = 'Receipt'`, it represents an unallocated customer receipt posted to `1220` against the customer party ledger. If `type = 'Receive Advance Payment'`, it is a customer advance posted to `2339`. |
| **AMB-002** | Can `AccountItem` support multiple invoice allocations? | **YES.** Multiple `erp_account_item` rows with different `bill_id` values share the same `header_id`. |
| **AMB-003** | How is partial settlement represented? | Represented via `AccountItem.eachAmount < AccountItem.needDebt` and cumulative increment of `DepotHead.changeAmount`. |
| **AMB-004** | How is supplier payment reflected in `all_need_pay`? | Atomically decrements `erp_supplier.all_need_pay` by the net gross settled amount upon approval. |
| **AMB-005** | Does Giro already mutate bank balances? | **YES**, dynamically via `AccountMapperEx.getAccountSumByHead` (outflow) and `getAccountSumByDetail` (inflow). |
| **AMB-006** | Does Giro already post GL entries? | **NO.** Currently 0 GL entries are created for Giro. Phase 2D will add double-entry GL posting. |
| **AMB-007** | How to distinguish customer advance from unallocated receipt? | Distinguished by `AccountHead.type`: `'Receive Advance Payment'` (`'收预付款'`) vs `'Receipt'` (`'收款'`). |
| **AMB-008** | How to distinguish supplier advance from routine payment? | Dedicated advance document type or explicit advance indicator routing to Account `1260` instead of `2320`. |
| **AMB-009** | How should advance application affect `AccountItem`? | Advance offset creates an explicit settlement event (`CUSTOMER_ADVANCE_OFFSET` / `SUPPLIER_ADVANCE_OFFSET`) moving balances from `2339` $\to$ `1220` or `1260` $\to$ `2320`. |
| **AMB-010** | What is the authoritative posting identity? | `voucher_type`: `CUSTOMER_RECEIPT`, `SUPPLIER_PAYMENT`, `CUSTOMER_ADVANCE`, `SUPPLIER_ADVANCE`, `BANK_CONTRA_TRANSFER`, `ADVANCE_OFFSET`, and their `_REVERSAL` counterparts. |

---

## 12. Proposed Implementation Structure

We recommend implementing Phase 2C + 2D through a single, clean, robust service following Karpathy guidelines:

```
ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialAccountingPostingService.java
```

### Core Methods:
1. `postCustomerReceiptToGeneralLedger(AccountHead head, List<AccountItem> items)`
2. `reverseCustomerReceiptGeneralLedger(AccountHead head)`
3. `postSupplierPaymentToGeneralLedger(AccountHead head, List<AccountItem> items)`
4. `reverseSupplierPaymentGeneralLedger(AccountHead head)`
5. `postCustomerAdvanceToGeneralLedger(AccountHead head)`
6. `reverseCustomerAdvanceGeneralLedger(AccountHead head)`
7. `postSupplierAdvanceToGeneralLedger(Long supplierId, BigDecimal amount, Long bankAccountId, ...)`
8. `postAdvanceOffsetToGeneralLedger(Long advanceId, Long invoiceId, BigDecimal offsetAmount, String partyType)`
9. `postGiroContraTransferToGeneralLedger(AccountHead head, List<AccountItem> items)`
10. `reverseGiroContraTransferGeneralLedger(AccountHead head)`

---

## 13. Test & Verification Strategy

A dedicated test suite `FinancialAccountingPostingServiceTest.java` will verify:
1. **Customer Receipt Tests:** Full invoice settlement, partial settlement, multi-invoice allocation, duplicate approval idempotency, 16 concurrent approvals, append-only reversal, AR balance sync (`all_need_get`).
2. **Supplier Payment Tests:** Full invoice settlement, partial settlement, multi-invoice allocation, duplicate approval idempotency, 16 concurrent approvals, append-only reversal, AP balance sync (`all_need_pay`).
3. **Customer Advance Tests:** Advance creation ($\text{Dr Bank} \leftrightarrow \text{Cr 2339}$), duplicate approval, cancellation reversal, advance offset against invoice ($\text{Dr 2339} \leftrightarrow \text{Cr 1220}$).
4. **Supplier Advance Tests:** Advance disbursement ($\text{Dr 1260} \leftrightarrow \text{Cr Bank}$), cancellation reversal, advance offset against purchase invoice ($\text{Dr 2320} \leftrightarrow \text{Cr 1260}$).
5. **Giro Contra Tests:** Bank-to-Bank transfer ($\text{Dr Dest Bank} \leftrightarrow \text{Cr Src Bank}$), Cash-to-Bank, duplicate approval, cancellation reversal, source/dest balance invariance.
6. **Full Regression Suite:** All 92 Phase 2A and Phase 2B tests must remain green (Target: >110 passing tests).

---

## 14. Pre-Implementation Safety Gates & Invariants

```
                               SAFETY INVARIANTS
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Invariant 1: Total Debit == Total Credit for 100% of generated GL vouchers.     │
│ Invariant 2: Exactly ONE GL posting path per financial business event.          │
│ Invariant 3: Exactly ONE reversal batch per document cancellation.              │
│ Invariant 4: ZERO UPDATE / DELETE on historical erp_gl_entry records.           │
│ Invariant 5: Concurrency safety: 16 concurrent approvals → exactly 1 GL voucher.│
│ Invariant 6: AR/AP sub-ledgers and GL remain 100% mathematically reconcilable.  │
│ Invariant 7: Advance balances (2339/1260) are never silently netted with AR/AP. │
│ Invariant 8: Contra transfers have ZERO impact on Revenue, Expense, AR, AP, Tax.│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Final Decision Gate

Based on complete code forensics, zero blocking architectural ambiguities, and complete preservation of Phase 2A / 2B boundaries:

```
================================================================================
PHASE 2C + 2D APPROVED FOR IMPLEMENTATION
================================================================================
```

---

### STOP CONDITION MET
Forensic validation report generated. Zero code, schema, or test modifications were executed. Awaiting user authorization to proceed with Phase 2C + 2D implementation.
