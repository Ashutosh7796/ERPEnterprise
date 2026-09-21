# Procurement P5: GRNI & Clearing Integrity Audit

**Audit Date**: 2026-08-21  
**Scope**: In-depth audit of Goods Received Not Invoiced (GRNI) lifecycle, clearing accuracy, anomaly prevention, and Purchase Price Variance (PPV) segregation.

---

## 1. GRNI Lifecycle & Clearing Formula

In the implemented architecture:
1. **Accrual Basis**:
   $$\text{GRNI Accrual} = \sum_{i=1}^{N} \left( Q_{\text{accepted}, i} \times P_{\text{PO}, i} \right)$$
   Posted upon GRN creation via [`ProcurementAccountingPostingService.postGrnToGrni`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L116-L186).

2. **Clearing Basis**:
   $$\text{GRNI Cleared} = \sum_{j=1}^{M} \left( Q_{\text{invoiced}, j} \times P_{\text{PO}, j} \right)$$
   Cleared upon Purchase Invoice posting via [`ProcurementAccountingPostingService.postInvoiceClearingToGeneralLedger`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L201-L366).

3. **Rate Variance Segregation (PPV)**:
   $$\text{PPV} = \sum_{j=1}^{M} \left( Q_{\text{invoiced}, j} \times (P_{\text{inv}, j} - P_{\text{PO}, j}) \right)$$
   - When $P_{\text{inv}} > P_{\text{PO}}$: PPV is debited to `5105 PPV` (Unfavorable).
   - When $P_{\text{inv}} < P_{\text{PO}}$: PPV is credited to `5105 PPV` (Favorable).

---

## 2. Integrity Analysis & Anomaly Evaluation

### A. Possibility of Over-Clearing
- **Risk**: An invoice clears more GRNI value than was accrued, creating a debit balance in GRNI (Account 2105).
- **Source Verification**:
  - In `GstPurchaseInvoiceService.java`, line items require a `po_item_id`.
  - In `ThreeWayMatchEvaluationService.java`, every invoice line is evaluated against cumulative fulfillment (`erp_po_line_fulfillment`).
  - If $Q_{\text{inv}} > Q_{\text{accepted}}$, the 3-Way Match returns `matchStatus = BLOCK` and throws `BusinessRunTimeException("Invoice exceeds accepted physical receipt")`.
  - In `ProcurementAccountingPostingService.java` (lines 244-260), the GRNI clearing value is strictly evaluated as $Q_{\text{inv}} \times P_{\text{PO}}$.
- **Audit Conclusion**: **OVER-CLEARING IS IMPOSSIBLE**. Invoiced quantity is gated by accepted GRN quantity, and clearing rate is locked to PO purchase rate.

### B. Possibility of Under-Clearing
- **Risk**: A valid full invoice leaves an un-cleared ghost balance in GRNI.
- **Source Verification**:
  - When $Q_{\text{inv}} = Q_{\text{accepted}}$ and invoiced rate varies from PO rate, the full PO base ($Q_{\text{inv}} \times P_{\text{PO}}$) is cleared to `2105 GRNI`, while the rate differential is diverted to `5105 PPV`.
  - When a partial invoice is posted for $Q_{\text{inv}, 1} < Q_{\text{accepted}}$, `erp_po_line_fulfillment.invoiced_quantity` tracks the fulfilled portion ($Q_{\text{inv}, 1}$), and the remaining balance in `2105 GRNI` corresponds to $(Q_{\text{accepted}} - Q_{\text{inv}, 1}) \times P_{\text{PO}}$.
- **Audit Conclusion**: **UNDER-CLEARING IS PREVENTED**. Rate differences do not affect the base GRNI clearing debit.

### C. Possibility of Negative GRNI
- **Risk**: GRNI balance flips to a net debit position.
- **Source Verification**:
  - GRNI credit is created exclusively upon physical acceptance in GRN.
  - GRNI debit is created exclusively upon invoice posting against previously accepted quantities.
  - Invoicing prior to physical receipt is blocked by the 3-Way Match evaluation gate (`invoicedQuantity <= acceptedQuantity`).
- **Audit Conclusion**: **NEGATIVE GRNI IS MATHEMATICALLY IMPOSSIBLE**.

### D. Possibility of Duplicate Clearing
- **Risk**: Posting an invoice or GRN twice generates duplicate double-entry lines.
- **Source Verification**:
  - Both `postGrnToGrni` (lines 121-127) and `postInvoiceClearingToGeneralLedger` (lines 206-212) execute an atomic anti-duplicate check:
    ```sql
    SELECT COUNT(*) FROM `erp_gl_journal_entry` 
    WHERE `tenant_id` = ? AND `source_document_type` = ? AND `source_document_id` = ?
    ```
  - If count $> 0$, the method aborts cleanly and logs an idempotency notice without creating redundant GL journal entries.
- **Audit Conclusion**: **DUPLICATE CLEARING IS IMPOSSIBLE**.

---

## 3. Purchase Price Variance (PPV) Verification

- **Accounting Principle**: Under Standard Costing / PO Baseline Accrual, inventory valuation is established at the time of goods receipt based on PO price $P_{\text{PO}}$. Any subsequent variance between the vendor's billed price $P_{\text{inv}}$ and $P_{\text{PO}}$ is an operational purchase variance, NOT an adjustment to historical goods receipt.
- **Audit of Line Item Calculation**:
  ```java
  BigDecimal lineGrni = qty.multiply(expectedPoPrice);
  BigDecimal linePpv = itemTaxable.subtract(lineGrni);
  ```
- **Non-Double-Counting Proof**:
  - Inventory Asset (1401) is debited once at GRN ($Q_{\text{rec}} \times P_{\text{PO}}$).
  - GRNI (2105) is credited once at GRN ($Q_{\text{rec}} \times P_{\text{PO}}$) and debited once at Invoice ($Q_{\text{inv}} \times P_{\text{PO}}$).
  - PPV (5105) absorbs only $(P_{\text{inv}} - P_{\text{PO}}) \times Q_{\text{inv}}$.
  - Accounts Payable (2101) is credited for full gross invoice amount ($Q_{\text{inv}} \times P_{\text{inv}} + \text{GST}$).
  - *No element of cost or variance is counted twice*.
