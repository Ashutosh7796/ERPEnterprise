# Phase 2 Validation: Business Transaction Lifecycle Tracing

**Auditor:** Senior ERP Architect & Accounting Systems Auditor  
**Scope:** Forensic repository lifecycle trace for all commercial, procurement, inventory, and payment transactions.

---

## 1. Complete Business Transaction Lifecycle Traces

### 1.1. Sales Invoice (Outward Commercial Sale)
```text
Business Document: GstSalesInvoice (DepotHead with subType='Sales' / 'XSCK')
      ↓
Existing Domain Model: DepotHead, DepotItem, DocumentTaxSnapshot, Supplier (Customer)
      ↓
Existing Status Lifecycle: DRAFT ('0') → APPROVED ('1') → POSTED / E-INVOICED → CANCELLED ('0' / '9')
      ↓
Existing Amount Calculation: ∑(quantity * unit_price - discount) = Taxable Amount
      ↓
Existing Tax Calculation: GSTTaxCalculationEngine.calculateTaxes(...) -> CGST, SGST, IGST, UTGST, CESS
      ↓
Existing Customer Balance: erp_supplier.all_need_get += GrossTotal (via SalesAccountingPostingService / SalesPaymentAllocationService)
      ↓
Accounting Event: Invoice Transition to APPROVED / POSTED state
      ↓
Canonical GL Posting:
  - Dr 1220 Trade Receivables (Customer Control Head) [Gross Total]
  - Cr 3110 Domestic Sales / 3120 Export Sales (Revenue Head) [Taxable Amount]
  - Cr 2331 Output CGST (Electronic Liability Ledger) [CGST Amount]
  - Cr 2332 Output SGST (Electronic Liability Ledger) [SGST Amount]
  - Cr 2333 Output IGST (Electronic Liability Ledger) [IGST Amount]
  - Cr/Dr 4560 Fractional Round-Off Difference [Rounding Delta]
```

### 1.2. Purchase Invoice (Inward Procurement & Bill Booking)
```text
Business Document: PurchaseInvoice (DepotHead with subType='Purchase' / 'CGRK')
      ↓
Existing Domain Model: DepotHead, DepotItem, DocumentTaxSnapshot, Supplier (Vendor)
      ↓
Existing Status Lifecycle: DRAFT ('0') → 3-WAY MATCHED / APPROVED ('1') → POSTED → CANCELLED
      ↓
Existing Amount Calculation: ∑(quantity * unit_price) = Net Bill Value
      ↓
Existing Tax Calculation: GSTTaxCalculationEngine.calculateTaxes(...) -> Input CGST, SGST, IGST (Eligible ITC under Sec 16)
      ↓
Existing Supplier Balance: erp_supplier.all_need_pay += GrossTotal (via ProcurementAccountingPostingService)
      ↓
Accounting Event: Purchase Bill Final Approval / 3-Way Match Verification
      ↓
Canonical GL Posting:
  - Dr 4110 Purchases of Stock / Raw Materials (or 1211 Inventory Asset) [Taxable Amount]
  - Dr 1251 Input CGST (Electronic Credit Ledger) [CGST Amount]
  - Dr 1252 Input SGST (Electronic Credit Ledger) [SGST Amount]
  - Dr 1253 Input IGST (Electronic Credit Ledger) [IGST Amount]
  - Cr 2320 Trade Payables (Vendor Control Head) [Gross Total]
  - Cr/Dr 4560 Fractional Round-Off Difference [Rounding Delta]
```

### 1.3. Customer Receipt (Incoming AR Settlement)
```text
Business Document: MoneyIn / Collection (AccountHead with type='Receipt' / '收款')
      ↓
Existing Domain Model: AccountHead (source/dest account_id), AccountItem (bill_id -> DepotHead, each_amount), Supplier
      ↓
Existing Status Lifecycle: UN_AUDIT ('0') → AUDIT ('1') → SETTLED
      ↓
Existing Amount Calculation: AccountHead.total_price = ∑(AccountItem.each_amount)
      ↓
Existing Customer Balance: erp_supplier.all_need_get -= total_price (via SalesPaymentAllocationService)
      ↓
Accounting Event: Receipt Approval ('AUDIT')
      ↓
Canonical GL Posting:
  - Dr 1231 Cash in Hand / 1232 Operating Bank Account (from erp_account.coa_account_id) [Total Received]
  - Cr 1220 Trade Receivables (Customer Control Head, party_id=organ_id) [Total Settled]
```

### 1.4. Supplier Payment (Outgoing AP Settlement)
```text
Business Document: MoneyOut / Payment (AccountHead with type='Payment' / '付款')
      ↓
Existing Domain Model: AccountHead (source account_id), AccountItem (bill_id -> DepotHead, each_amount), Supplier
      ↓
Existing Status Lifecycle: UN_AUDIT ('0') → AUDIT ('1') → SETTLED
      ↓
Existing Amount Calculation: AccountHead.total_price = ∑(AccountItem.each_amount)
      ↓
Existing Supplier Balance: erp_supplier.all_need_pay -= total_price (via ApPaymentAllocationService)
      ↓
Accounting Event: Payment Voucher Approval ('AUDIT')
      ↓
Canonical GL Posting:
  - Dr 2320 Trade Payables (Vendor Control Head, party_id=organ_id) [Total Paid]
  - Cr 1231 Cash in Hand / 1232 Operating Bank Account (from erp_account.coa_account_id) [Total Disbursed]
```

### 1.5. Customer Advance (Unadjusted Deposit Received)
```text
Business Document: AdvanceIn (AccountHead with type='Receive Advance Payment' / '收预付款')
      ↓
Existing Domain Model: AccountHead (account_id, organ_id=customer_id, total_price)
      ↓
Existing Status Lifecycle: UN_AUDIT ('0') → AUDIT ('1')
      ↓
Existing Customer Balance: erp_supplier.advance_in += total_price (via SupplierService.updateAdvanceIn)
      ↓
Accounting Event: Advance Voucher Approval
      ↓
Canonical GL Posting:
  - Dr 1232 Operating Bank Account (from erp_account.coa_account_id) [Advance Amount]
  - Cr 2339 Advance from Customers (Current Liability Head, party_id=organ_id) [Advance Amount]
```

### 1.6. Supplier Advance (Advance Disbursed to Vendor)
```text
Business Document: AdvanceOut (AccountHead with type='Payment' with no bill_id linkage)
      ↓
Existing Domain Model: AccountHead, AccountItem, Supplier (Vendor)
      ↓
Existing Status Lifecycle: UN_AUDIT ('0') → AUDIT ('1')
      ↓
Accounting Event: Advance Disbursement Approval
      ↓
Canonical GL Posting:
  - Dr 1220 / 1260 Advances to Suppliers (Current Asset Head, party_id=organ_id) [Advance Amount]
  - Cr 1232 Operating Bank Account (from erp_account.coa_account_id) [Disbursed Amount]
```

### 1.7. Bank / Cash Transfer (Contra Entry)
```text
Business Document: Giro (AccountHead with type='Transfer Funds' / '转账')
      ↓
Existing Domain Model: AccountHead (source account_id), AccountItem (target account_id, each_amount)
      ↓
Existing Status Lifecycle: UN_AUDIT ('0') → AUDIT ('1')
      ↓
Accounting Event: Bank Transfer Approval
      ↓
Canonical GL Posting:
  - Dr Target Bank / Cash COA Account (from target erp_account.coa_account_id) [Transfer Amount]
  - Cr Source Bank / Cash COA Account (from source erp_account.coa_account_id) [Transfer Amount]
```

### 1.8. Sales Credit Note (Rule 53 Credit Memo)
```text
Business Document: CreditNote (DepotHead with subType='CreditNote' / 'SalesReturn')
      ↓
Existing Domain Model: DepotHead, DepotItem, DocumentTaxSnapshot, Supplier
      ↓
Existing Status Lifecycle: DRAFT ('0') → APPROVED ('1') → POSTED
      ↓
Existing Customer Balance: erp_supplier.all_need_get -= GrossTotal
      ↓
Accounting Event: Credit Note Approval / Posting
      ↓
Canonical GL Posting:
  - Dr 3110 Domestic Sales (or 3190 Sales Return & Allowances) [Taxable Amount]
  - Dr 2331 Output CGST (or Output GST Reversal) [CGST Amount]
  - Dr 2332 Output SGST [SGST Amount]
  - Dr 2333 Output IGST [IGST Amount]
  - Cr 1220 Trade Receivables (Customer Control Head) [Gross Total]
  - Cr/Dr 4560 Fractional Round-Off Difference
```

### 1.9. Purchase Debit Note (Vendor Debit Memo)
```text
Business Document: DebitNote (DepotHead with subType='DebitNote' / 'PurchaseReturn')
      ↓
Existing Domain Model: DepotHead, DepotItem, DocumentTaxSnapshot, Supplier
      ↓
Existing Status Lifecycle: DRAFT ('0') → APPROVED ('1') → POSTED
      ↓
Existing Supplier Balance: erp_supplier.all_need_pay -= GrossTotal
      ↓
Accounting Event: Debit Note Approval / Posting
      ↓
Canonical GL Posting:
  - Dr 2320 Trade Payables (Vendor Control Head) [Gross Total]
  - Cr 4110 Purchases / Inventory Asset [Taxable Amount]
  - Cr 1251 Input CGST (ITC Reversal under Rule 42/43) [CGST Amount]
  - Cr 1252 Input SGST [SGST Amount]
  - Cr 1253 Input IGST [IGST Amount]
  - Cr/Dr 4560 Fractional Round-Off Difference
```

### 1.10. Document Cancellation & Reversal Workflow
```text
State Transition: POSTED ('1') → CANCELLED ('9' / '0')
      ↓
Immutability Guard: Existing erp_gl_entry records are NEVER deleted or overwritten.
      ↓
Reversal Mechanism:
  1. Existing active GL lines are flagged `is_cancelled = '1'`.
  2. New offsetting GL entry batch is inserted with:
     - `voucher_type = 'REVERSAL'`
     - `reversal_of_id = <original_gl_entry_id>`
     - Opposite amounts (original Debits become Credits, original Credits become Debits)
     - `narration = 'Reversal of <original_voucher_no>: <cancellation_reason>'`
```
