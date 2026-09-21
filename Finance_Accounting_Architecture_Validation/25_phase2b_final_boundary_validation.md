# Phase 2B — Final Accounting Boundary & Safety Validation Dossier

> **Document Reference:** `Finance_Accounting_Architecture_Validation/25_phase2b_final_boundary_validation.md`  
> **Status / Decision:** `READY FOR PHASE 2B IMPLEMENTATION`  
> **Date:** September 3, 2026  
> **Subsystem:** Finance & Accounting Core — Purchase Transactions, Debit Notes & Accounts Payable Engine  
> **Governing Standards:** Indian Companies Act 2013 (Schedule III), CGST Act 2017 (Sections 16, 17(5), 34, 170)  

---

## 1. Repository Evidence & Workflow Analysis

A forensic investigation of the procurement and accounting workflows across the repository established the following findings:

1. **Purchase Invoices:** Handled by `GstPurchaseInvoiceService.java` managing `erp_purchase_invoice` and `erp_purchase_invoice_item`, with statutory GST calculation via `GSTTaxCalculationEngine` and Rule 46 compliance.
2. **Purchase Debit Notes & Returns:** Handled by `GstCreditDebitNoteService.java` (using `noteType="DEBIT_NOTE"` on `erp_depot_head` and `erp_gst_adjustment_allocation`) and `PurchaseReturnService.java` (`erp_procurement_return`).
3. **Goods Receipt (GRN):** Handled by `GoodsReceiptService.java` managing physical warehouse intake and stock mutations.
4. **General Ledger Destination:** Standardized in Phase 1 / 2A as `erp_gl_entry` and managed via `GlEntryService.java`.

---

## 2. Final Phase 2B vs Phase 2F Boundary Separation

To guarantee that no economic event is double-counted and that inventory/GRNI valuation remains strictly bounded, the architectural responsibilities are partitioned as follows:

```
+-----------------------------------------------------------------------------------------+
|                                    PHASE 2B SCOPE                                       |
|                                                                                         |
|  [Purchase Invoices]                   [Purchase Debit Notes]        [Accounts Payable] |
|   - Purchase Classification             - Independent Accounting      - Cr 2320 AP      |
|   - Dr 4110 Purchases / 4510 Expense   - Dr 2320 AP / Cr 4110 /      - Supplier AP     |
|   - Dr 1251/1252/1253 Input GST           Cr Input GST Reversal         Balance Sync    |
|   - Blocked ITC Capitalization         - Append-Only Reversal         - Append-Only GL  |
+-----------------------------------------------------------------------------------------+
                                             |
                                 CLEAN BOUNDARY (DECOUPLED)
                                             |
+-----------------------------------------------------------------------------------------+
|                                    PHASE 2F SCOPE                                       |
|                                                                                         |
|  [Goods Receipt Note (GRN)]            [Perpetual Inventory Valuation]                  |
|   - Inward Physical Stock: Dr 1211      - Moving Average Valuation Recalculation        |
|   - Accrued Liability: Cr 2105 GRNI     - Landed Cost Capitalization Split              |
|   - GRNI Sub-Ledger Clearing            - Outbound Dispatch COGS Integration            |
+-----------------------------------------------------------------------------------------+
```

### Strict Boundary Rules:
- **No GRN GL Posting in Phase 2B:** `GoodsReceiptService` is **not** modified in Phase 2B. All `postGrnToGrni` / `1211` / `2105` GRN postings belong exclusively to Phase 2F.
- **No Inventory Asset Double-Debit:** Phase 2B Purchase Invoices recognize commercial procurement expenditure (`4110 Purchases`, `4510 Operating Expenses`, `1111 Fixed Assets`, `4130 Job Work`) and statutory tax credits (`1251/1252/1253`), completely decoupled from physical warehouse receipt accounting.

---

## 3. Deterministic Purchase Accounting Decision Matrix

Based on actual repository entities and Schedule III standards, the following deterministic posting rules are established:

| Business Scenario | Existing Workflow | Primary Accounting Event | Debit Leg(s) | Credit Leg(s) |
| :--- | :---: | :---: | :--- | :--- |
| **Direct Inventory Purchase (2-Way)** | `Yes` (`GstPurchaseInvoiceService`) | Purchase Invoice Approval | **Dr 4110** Purchases<br/>**Dr 1251/1252/1253** Input GST<br/>**Dr/Cr 4560** Round-Off | **Cr 2320** Trade Payables (Supplier) |
| **Operating Expense Purchase** (Rent, Utilities, Legal) | `Yes` (`GstPurchaseInvoiceService`) | Purchase Invoice Approval | **Dr 4510** Operating Expenses<br/>**Dr 1251/1252/1253** Input GST<br/>**Dr/Cr 4560** Round-Off | **Cr 2320** Trade Payables (Supplier) |
| **Fixed Capital Asset Purchase** (Plant, Machinery, IT) | `Yes` (`GstPurchaseInvoiceService`) | Purchase Invoice Approval | **Dr 1111 / 1112** Fixed Asset Head<br/>**Dr 1251/1252/1253** Input GST (if eligible)<br/>**Dr/Cr 4560** Round-Off | **Cr 2320** Trade Payables (Supplier) |
| **Job Work / Subcontracting Processing** | `Yes` (`GstPurchaseInvoiceService`) | Purchase Invoice Approval | **Dr 4130** Job Work Charges<br/>**Dr 1251/1252/1253** Input GST<br/>**Dr/Cr 4560** Round-Off | **Cr 2320** Trade Payables (Supplier) |
| **Section 17(5) Blocked / Ineligible ITC** | `Yes` (`GstPurchaseInvoiceService`) | Purchase Invoice Approval | **Dr 4110 / 4510 / 1111** (Taxable + Blocked Tax capitalized)<br/>**Dr/Cr 4560** Round-Off | **Cr 2320** Trade Payables (Supplier) |
| **Purchase Debit Note / Commercial Adjustment** | `Yes` (`GstCreditDebitNoteService`) | Debit Note Approval | **Dr 2320** Trade Payables (Supplier)<br/>**Dr/Cr 4560** Round-Off | **Cr 4110 / 4510 / 1111 / 4130** (Adjusted Base)<br/>**Cr 1251/1252/1253** Input GST Reversal |
| **Purchase Invoice Cancellation** | `Yes` (`GstPurchaseInvoiceService`) | Invoice Void / Cancellation | **Dr 2320** Trade Payables (Supplier)<br/>**Dr/Cr 4560** Round-Off | **Cr 4110 / 4510 / 1111 / 4130** (Base)<br/>**Cr 1251/1252/1253** Input GST Reversal |
| *Physical Inventory Receipt (GRN)* | *Phase 2F* | *GRN Acceptance* | *Dr 1211 Inventory Asset* | *Cr 2105 GRNI Accrual* |
| *GRNI Sub-Ledger Clearing* | *Phase 2F* | *3-Way Invoice Match* | *Dr 2105 GRNI Accrual* | *Cr 2105 Matching Offset* |

---

## 4. Purchase Debit Note Domain Semantics

1. **Independent Accounting Voucher:**
   - Evaluated under Section 34 of the CGST Act as an independent accounting event.
   - Generates voucher `PURCHASE_DEBIT_NOTE` in `erp_gl_entry`.
   - Original Purchase Invoice journal lines remain **100% untouched and immutable**.
2. **Reversal of Input Tax Credit:**
   - Reverses previously claimed Input Tax Credit by crediting `1251 / 1252 / 1253`.
3. **Accounts Payable Relief:**
   - Debits `2320 Trade Payables` and decrements `erp_supplier.all_need_pay`.

---

## 5. Safe Concurrency & Idempotency Transaction Model

To avoid relying on exception suppression (`noRollbackFor`), the concurrency architecture utilizes a **3-tier deterministic sequence**:

```
Client POST Request
       |
       v
+-----------------------------------------------------------------------------------+
| 1. Pessimistic Header Lock (FOR UPDATE)                                           |
|    SELECT id, status FROM erp_purchase_invoice WHERE id = ? FOR UPDATE            |
+-----------------------------------------------------------------------------------+
       |
       v
+-----------------------------------------------------------------------------------+
| 2. Idempotent Existence Check                                                     |
|    int count = glEntryMapper.countByVoucher(tenantId, "PURCHASE_INVOICE", id);    |
|    if (count > 0) return count;  // Safe Fast-Exit (No SQL exception)             |
+-----------------------------------------------------------------------------------+
       |
       v
+-----------------------------------------------------------------------------------+
| 3. Double-Entry Voucher Generation & Batch Insert                                 |
|    glEntryService.postEntries(lines, tenantId, userId);                           |
|    UPDATE erp_purchase_invoice SET status = 'POSTED' WHERE id = ?;                |
|    UPDATE erp_supplier SET all_need_pay = all_need_pay + grossTotal WHERE id = ?; |
+-----------------------------------------------------------------------------------+
       |
       v
+-----------------------------------------------------------------------------------+
| 4. Database Unique Constraint Barrier (Final Safety Net)                          |
|    uk_gl_voucher_line on (tenant_id, voucher_type, voucher_id, line_no)           |
+-----------------------------------------------------------------------------------+
```

### Concurrency Guarantees:
- **Thread 1:** Acquires `FOR UPDATE` lock, checks `countByVoucher == 0`, inserts 4 GL lines, updates status and AP balance, commits.
- **Thread 2 (Concurrent Double-Click):** Waits on `FOR UPDATE` lock. Once Thread 1 commits, Thread 2 acquires lock, finds `countByVoucher == 4`, and returns 4 immediately without attempting duplicate inserts.
- **Zero Rollback-Only Interceptions:** No `DataIntegrityViolationException` is raised during normal concurrent races, keeping the Spring transaction clean.

---

## 6. `all_need_pay` Complete Mutation Audit

A search across the repository identified all existing writes to `erp_supplier.all_need_pay`:

| Event / Operation | Existing Service / Location | Existing Mutation SQL | Phase 2B Accounting Decision | Single Source of Truth? |
| :--- | :--- | :--- | :--- | :---: |
| **Purchase Invoice Posting** | `ProcurementAccountingPostingService:383` | `UPDATE erp_supplier SET all_need_pay = all_need_pay + ?` | Handled centrally in `PurchaseAccountingPostingService` | **YES (Single Mutation)** |
| **Purchase Invoice Reversal** | *None (Was missing)* | *None* | `PurchaseAccountingPostingService` decrements `all_need_pay` | **YES (Single Mutation)** |
| **Purchase Debit Note Posting** | `PurchaseReturnService:475` / *Missing in CDN* | `UPDATE erp_supplier SET all_need_pay = all_need_pay - ?` | Handled centrally in `PurchaseAccountingPostingService` | **YES (Single Mutation)** |
| **Purchase Debit Note Reversal** | *None (Was missing)* | *None* | `PurchaseAccountingPostingService` increments `all_need_pay` | **YES (Single Mutation)** |
| **Supplier Payment Allocation** | `ApPaymentAllocationService:271, 541` | `UPDATE erp_supplier SET all_need_pay = all_need_pay - ?` | Maintained in AP Payment Service (Phase 2C) | **YES (No conflict)** |
| **Supplier Master CRUD** | `SupplierMapper.xml` | Manual edit in master settings | Master profile maintenance only | **YES (No conflict)** |

### Invariant:
`PurchaseAccountingPostingService` is the **exclusive authoritative service** mutating `all_need_pay` for commercial purchase invoices, debit notes, and their reversals.

---

## 7. Exact Files That Will Change

1. **`PurchaseAccountingPostingService.java` [NEW]:**
   - Authoritative Schedule III GL posting for Purchase Invoices, Debit Notes, Reversals, and AP balance sync.
2. **`GstPurchaseInvoiceService.java` [MODIFY]:**
   - Injects `PurchaseAccountingPostingService` and invokes `postPurchaseInvoiceToGeneralLedger` on invoice posting and `reversePurchaseInvoiceGeneralLedger` on cancellation.
3. **`GstCreditDebitNoteService.java` [MODIFY]:**
   - Injects `PurchaseAccountingPostingService` and invokes `postPurchaseDebitNoteToGeneralLedger` when a Debit Note (`DEBIT_NOTE`) transitions to `POSTED` and `reversePurchaseDebitNoteGeneralLedger` on cancellation.
4. **`ProcurementAccountingPostingService.java` [MODIFY]:**
   - Delegates invoice clearing GL logic to `PurchaseAccountingPostingService`.
5. **`PurchaseAccountingPostingServiceTest.java` [NEW]:**
   - Comprehensive test suite covering all 14+ purchase accounting test cases.

---

## 8. Exact Files That Must NOT Change

- **`GoodsReceiptService.java`:** **NO CHANGES** in Phase 2B (strictly Phase 2F).
- **`StockMutationService.java`:** **NO CHANGES** in Phase 2B.
- **`DeliveryChallanService.java`:** **NO CHANGES** in Phase 2B.
- **`SalesAccountingPostingService.java`:** **NO CHANGES** (Phase 2A certified).
- **Database Schema / Migration files:** **NO CHANGES** (`erp_gl_entry` and `uk_gl_voucher_line` already exist and are certified).
- **Frontend / UI components:** **NO CHANGES** in Phase 2B.

---

## 9. Final Test Scope Matrix

The Phase 2B test suite (`PurchaseAccountingPostingServiceTest.java`) will verify:
1. **Inventory Stock Purchase (Intrastate):** Dr 4110, Dr 1251, Dr 1252, Cr 2320.
2. **Inventory Stock Purchase (Interstate):** Dr 4110, Dr 1253, Cr 2320.
3. **Operating Expense Purchase:** Dr 4510, Dr 1251, Dr 1252, Cr 2320.
4. **Fixed Capital Asset Purchase:** Dr 1111 / 1112, Dr 1251, Dr 1252, Cr 2320.
5. **Job Work Processing Charges:** Dr 4130, Dr 1251, Dr 1252, Cr 2320.
6. **Section 17(5) Ineligible / Blocked ITC:** Blocked tax capitalized into 4110 / 4510 / 1111 with zero Input Tax lines.
7. **Section 170 Round-Off Difference:** Dr/Cr 4560 balancing fractional paise differences.
8. **Purchase Debit Note Accounting:** Dr 2320, Cr 4110, Cr 1251, Cr 1252.
9. **Purchase Invoice Cancellation:** Append-only reversal (`PURCHASE_INVOICE_REVERSAL`) with `reversal_of_id`.
10. **Purchase Debit Note Cancellation:** Append-only reversal (`PURCHASE_DEBIT_NOTE_REVERSAL`).
11. **Idempotency & Retry Safety:** Consecutive post calls return identical counts without duplicate DB rows.
12. **16-Thread Concurrency Race:** Exactly 1 insert, 15 idempotent resolutions, total DB rows = 4.
13. **Database Uniqueness Constraint:** `uk_gl_voucher_line` throws `DuplicateKeyException` on duplicate line attempt.
14. **Double-Entry Balance Invariant:** $\sum \text{Debit} == \sum \text{Credit}$ (exact 0.0000 difference) for all posted vouchers.
15. **Supplier Accounts Payable Balance:** `erp_supplier.all_need_pay` reflects exact net liability.
16. **Transaction Atomicity:** Spring transaction rollback on simulated failures leaving 0 orphan entries.

---

## 10. Remaining Limitations & Phase 2F Forward Compatibility

- **GRNI Accrual Sub-Ledger:** Physical goods receipt accruals (`Dr 1211`, `Cr 2105`) and subsequent 3-way GRNI invoice clearing are tracked in Phase 2F.
- **Landed Cost Inventory Capitalization:** Landed cost voucher allocation to perpetual moving-average stock belongs to Phase 2F.

---

## 11. Final Decision

```
================================================================================
FINAL DECISION: READY FOR PHASE 2B IMPLEMENTATION
================================================================================
```
