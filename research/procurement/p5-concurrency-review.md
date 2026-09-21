# Procurement P5: Concurrency, Idempotency & Multi-Tenant Security Review

**Audit Date**: 2026-08-21  
**Scope**: Verification of atomic transaction boundaries, race condition defenses, idempotency guards, tenant isolation, and DataScope security.

---

## 1. Idempotency & Concurrency Architecture

### A. Anti-Duplicate Posting Guards
In distributed enterprise ERP workflows, double-clicks or asynchronous network retries must never generate duplicate GL journal entries or corrupt inventory moving averages.

1. **GRN Inward Physical Receipt**:
   - Guarded by atomic query in [`ProcurementAccountingPostingService.postGrnToGrni`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L121):
     ```sql
     SELECT COUNT(*) FROM `erp_gl_journal_entry` 
     WHERE `tenant_id` = ? AND `source_document_type` = 'GRN' AND `source_document_id` = ?
     ```
   - If count $> 0$, posting returns `null` and aborts before executing insert statements.

2. **Purchase Invoice Clearing**:
   - Guarded by atomic query in [`ProcurementAccountingPostingService.postInvoiceClearingToGeneralLedger`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L206):
     ```sql
     SELECT COUNT(*) FROM `erp_gl_journal_entry` 
     WHERE `tenant_id` = ? AND `source_document_type` = 'PURCHASE_INVOICE' AND `source_document_id` = ?
     ```
   - Re-posting returns `null` and logs an idempotency notice.

3. **Landed Cost Voucher Allocation**:
   - Guarded by atomic validation in [`ProcurementAccountingPostingService.postLandedCostAllocation`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L382):
     ```sql
     SELECT COUNT(*) FROM `erp_gl_journal_entry` 
     WHERE `tenant_id` = ? AND `source_document_type` = 'LANDED_COST' AND `source_document_id` = ?
     ```
   - Throws `BusinessRunTimeException("Already posted")` if duplicate execution is attempted.

---

## 2. Simultaneous & Concurrent Execution Analysis

### A. Simultaneous Landed Cost Postings Against the Same Material
- **Scenario**: Two separate Landed Cost Vouchers (e.g. Inward Freight and Customs Duty) are posted concurrently for the same material batch.
- **Mechanism**:
  - Each posting runs in a separate `@Transactional(value = "transactionManager")` block.
  - InnoDB row-level locking on `erp_material_current_stock` serializes the moving average price calculation:
    - Transaction 1 locks `erp_material_current_stock` row $\rightarrow$ updates $P_1 = (Q \times P_0 + C_1) / Q$.
    - Transaction 2 reads updated $P_1$ upon acquiring row lock $\rightarrow$ updates $P_2 = (Q \times P_1 + C_2) / Q$.
  - Cumulative result equals the exact mathematical sum $P_2 = (Q \times P_0 + C_1 + C_2) / Q$.

### B. Simultaneous GRN & Invoice Posting
- **Scenario**: A warehouse operator posts a GRN while an accountant simultaneously posts the purchase invoice.
- **Mechanism**:
  - The 3-Way Match Evaluation service executes an authoritative check on `erp_po_line_fulfillment`.
  - If the invoice attempts to post before the GRN transaction has committed, `invoicedQuantity > acceptedQuantity` triggers an immediate `matchStatus = BLOCK`, rejecting the invoice transaction.
  - If the GRN commits first, the invoice smoothly posts, clears GRNI, and establishes AP.

---

## 3. Multi-Tenant Isolation & Security Audit

1. **Tenant ID Scoping in SQL Queries**:
   - Every single SQL statement in `ProcurementAccountingPostingService.java`, `LandedCostVoucherService.java`, and `GstPurchaseInvoiceService.java` explicitly includes `WHERE tenant_id = ?` and binds the tenant ID from the authenticated `UserContext`.
   - Table indices `idx_gl_doc (tenant_id, source_document_type, source_document_id)`, `idx_gl_line_hdr (tenant_id, journal_entry_id)`, and `idx_lcv_alloc (tenant_id, voucher_id)` enforce multi-tenant isolation at the database index layer.

2. **Cross-Tenant Access Verification**:
   - An authenticated user under Tenant 20 querying or attempting to post an invoice or LCV belonging to Tenant 10 receives a 404 / Access Denied exception (`BusinessRunTimeException`).
   - GL balances, GRNI liabilities, and inventory moving average costs are strictly segregated per tenant ID.
