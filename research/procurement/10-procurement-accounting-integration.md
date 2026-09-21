# 10 - Procurement Accounting & Double-Entry GL Integration

**Core Accounting System**: Single Authoritative General Ledger (`erp_gl_journal_entry` & `erp_gl_journal_line`)  
**Standard**: Indian Accounting Standards (Ind AS) & Double-Entry Bookkeeping Principles  

---

## 1. Accounting Timing & Journal Vouchers

To maintain strict parity with standard mid-market ERP accounting (and avoid premature AP liabilities), journal entries are posted at specific document lifecycle trigger events:

```text
========================================================================================
                      PROCUREMENT GENERAL LEDGER POSTING RULES
========================================================================================
  Trigger Event 1: Goods Receipt Note (GRN) Posting (Physical Inventory Inward)
    Dr. Inventory Asset Account (1401)                     [Net Material Value]
    Cr. Goods Received Not Invoiced / GRNI Accrual (2102)  [Net Material Value]

  Trigger Event 2: Purchase Invoice Posting (Commercial AP & Statutory Tax)
    Dr. Goods Received Not Invoiced / GRNI (2102)          [Clear GRNI Accrual]
    Dr. Input CGST Asset (1301)                            [Creditable Input Tax]
    Dr. Input SGST Asset (1302)                            [Creditable Input Tax]
    Dr. Input IGST Asset (1303)                            [Creditable Input Tax]
    Dr./Cr. Round Off Expense/Income (5901)                [Section 170 Rounding]
    Cr. Vendor Accounts Payable / Sundry Creditors (2101)  [Total Invoice Payable]

  Trigger Event 3: Reverse Charge (RCM) Purchase Invoice Posting
    Dr. Input GST Asset (1301)                             [Creditable Tax Amount]
    Cr. RCM Tax Output Liability (2205)                    [Tax Payable to Govt]

  Trigger Event 4: Vendor Payment Voucher Settlement
    Dr. Vendor Accounts Payable (2101)                     [Gross Paid Amount]
    Cr. Bank Account (1002) / Cash (1001)                  [Disbursed Funds]
    Cr. Early Payment Discount Received (4201)             [Cash Discount if any]

  Trigger Event 5: Purchase Return & Debit Note Posting
    Dr. Vendor Accounts Payable (2101)                     [Total Note Amount]
    Cr. Input CGST Reversal (1301)                         [Reversed Tax]
    Cr. Input SGST Reversal (1302)                         [Reversed Tax]
    Cr. Input IGST Reversal (1303)                         [Reversed Tax]
    Cr. Inventory Asset (1401) / Purchase Return (5102)    [Returned Goods Value]
========================================================================================
```

---

## 2. Prevention of Conflicting Accounting Truths

1. **No Duplicate Ledger Engines**: All financial entries flow through `SalesAccountingPostingService` / `ProcurementAccountingPostingService` directly into `erp_gl_journal_entry` and `erp_gl_journal_line`.
2. **Vendor Balance Reconciliation**: `erp_supplier.all_need_pay` (AP balance) is treated as a **transactionally updated cached accumulator** strictly reconciled against the posted GL AP account (`2101`).
3. **GRNI Clearing Verification**: The Three-Way Match Engine guarantees that the GRNI Accrual Account (`2102`) balances to zero once all receipts are fully invoiced.
