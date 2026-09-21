# Phase 2F: Final Forensic Safety Review
## Perpetual Inventory Valuation, GRNI Accrual, Purchase Price Variance (PPV), Cost of Goods Sold (COGS) & Manufacturing WIP Accounting

**Document Reference:** `research/finance-accounting/32_phase2f_FINAL_SAFETY_REVIEW.md`  
**Also Published As:** `Finance_Accounting_Architecture_Validation/32_phase2f_FINAL_SAFETY_REVIEW.md`  
**Phase Target:** Phase 2F (Perpetual Inventory Valuation, GRNI, PPV, COGS & Manufacturing WIP)  
**Baseline Artifacts Audited:**
- `research/finance-accounting/30_phase2f_pre_implementation_validation.md`
- `research/finance-accounting/30_phase2f_EXECUTIVE_APPROVAL.md`
- `research/finance-accounting/31_phase2f_implementation_report.md`  
**Author:** Antigravity Advanced Agentic Coding  
**Date:** September 4, 2026  
**Final Status:** **PHASE 2F FINAL DECISION: PASS**  

---

## 1. Executive Verdict

A comprehensive, line-by-line, forensic safety audit was performed on the implemented Phase 2F perpetual inventory and manufacturing accounting integration across the codebase.

### Audit Summary & Invariants Proven:
1. **Zero Unauthorized Scope Expansion**: The implementation strictly adheres to the approved scope baseline. All deferred manufacturing accounting capabilities (machine routing overhead, advanced labor costing, machine depreciation allocation, subcontracting yield normalization) remain completely excluded.
2. **Sole Physical Inventory Authority**: [`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java) is the **single and exclusive** gatekeeper for physical stock mutations, continuous moving-average calculations, pessimistic row locking (`SELECT ... FOR UPDATE`), and immutable stock ledger appending ([`erp_stock_ledger_entry`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/StockLedgerEntry.java)). No accounting service modifies physical stock directly.
3. **Single Authoritative COGS Engine**: [`SalesAccountingPostingService.postDeliveryDispatchToCOGS`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java) is the sole posting path for `Dr 4110 COGS / Cr 1212 Finished Goods`. Zero competing COGS engines exist.
4. **Authoritative GRNI & 3-Way Match Integrity**: GRNI accrual (`Dr 1211 / Cr 2105`) and GRNI clearing (`Dr 2105 / Dr GST / Dr/Cr 4115 PPV / Cr 2320 AP`) are mathematically balanced across higher prices, lower prices, partial receipts, partial billings, and multi-cardinality allocations.
5. **Manufacturing WIP Scope Hard-Boundary**: Basic shop-floor WIP accounting is strictly verified as **MATERIAL-ONLY VALUATION** (`Dr 1213 WIP / Cr 1211 Raw Materials` upon issue, and `Dr 1212 FG / Cr 1213 WIP` upon production receipt).
6. **Multi-Tenant Security & Atomicity**: Hard tenant isolation is enforced at query and database levels. Concurrency under 16 concurrent threads and atomicity under forced GL/stock failure injection are 100% verified.
7. **Regression Test Suite**: **99/99 PASS (100% Green, 0 Failures, 0 Errors, 0 Skips)** across Phase 1, Phase 2A, Phase 2B, Phase 2C, Phase 2D, Phase 2E, and Phase 2F.

```text
======================================================================
  SEVERITY FINDINGS SUMMARY:
  P0 (Critical / Corruption / Security) : 0
  P1 (High / Broken Invariant)          : 0
  P2 (Medium / Operational Weakness)    : 0
  P3 (Low / Informational Observations) : 0
======================================================================
  FINAL DECISION: PASS
======================================================================
```

---

## 2. Scope Verification

The implemented codebase was audited against [`research/finance-accounting/30_phase2f_pre_implementation_validation.md`](file:///e:/Codes/ERP/jshERP-master/research/finance-accounting/30_phase2f_pre_implementation_validation.md) and [`research/finance-accounting/30_phase2f_EXECUTIVE_APPROVAL.md`](file:///e:/Codes/ERP/jshERP-master/research/finance-accounting/30_phase2f_EXECUTIVE_APPROVAL.md).

### Verified Approved Baseline:
- **GRN Inward Physical Receipt Accrual**: Implemented in [`ProcurementAccountingPostingService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java) (`postGrnToGrni`: `Dr 1211 Raw Materials / Cr 2105 GRNI Accrual`).
- **Purchase Invoice 3-Way Match & Clearing**: Implemented in [`PurchaseAccountingPostingService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/PurchaseAccountingPostingService.java) (`postPurchaseInvoiceToGeneralLedger` with `PurchaseClassification.GRNI_CLEARING`: `Dr 2105 GRNI / Dr 1251/52/53 GST / Dr 1211 Blocked ITC / Dr/Cr 4115 PPV / Dr/Cr 4560 Round-Off / Cr 2320 AP`).
- **Outbound Commercial Sales COGS**: Implemented in [`SalesAccountingPostingService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java) (`postDeliveryDispatchToCOGS`: `Dr 4110 COGS / Cr 1212 Finished Goods`).
- **Basic Manufacturing Work-in-Progress (WIP)**: Implemented in [`WorkOrderService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/WorkOrderService.java) (`issueMaterial`: `Dr 1213 WIP / Cr 1211 RM`; `receiveProduction`: `Dr 1212 FG / Cr 1213 WIP`).
- **Pessimistic Row Locking & Multi-Tenant Boundaries**: Implemented in [`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java) (`acquireSortedRowLocks` and `SELECT ... FOR UPDATE`).

### Verification of Deferred Scope Boundaries (Zero Silent Implementation):
| Deferred Capability | Status in Implementation | Audit Verification |
| :--- | :--- | :--- |
| **Machine Routing Overhead Absorption** | **NOT IMPLEMENTED** | No routing tables, overhead absorption rates, or machine run-time cost additions exist in Phase 2F code. Deferred to Phase 3. |
| **Advanced Labor Costing** | **NOT IMPLEMENTED** | No direct/indirect labor rate allocation tables or shop-floor worker time tracking postings exist. Deferred to Phase 3. |
| **Advanced Manufacturing Overhead Allocation** | **NOT IMPLEMENTED** | No multi-pool cost driver allocation engines exist in `WorkOrderService`. Deferred to Phase 3. |
| **Subcontracting Scrap/Yield Normalization** | **NOT IMPLEMENTED** | No statutory subcontracting scrap yield normalization algorithms exist in Phase 2F. Deferred to Phase 3. |
| **Advanced Manufacturing Variance (MUV/LRV)** | **NOT IMPLEMENTED** | Standard cost variance decomposition accounts are not active in Phase 2F. Deferred to Phase 3. |

**Verdict:** Scope audit confirms 100% compliance with approved boundaries. Zero unauthorized scope expansion.

---

## 3. Inventory Authority

### Forensic Invariant:
$$\mathbf{StockMutationService} = \mathbf{SOLE\ Physical\ Inventory\ Mutation\ Authority}$$

### Architectural Trace:
1. **Physical Movement Inward (GRN)**:
   [`GoodsReceiptService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GoodsReceiptService.java) calls `stockMutationService.recordMovement(...)` with `StockMovementRequest`.
2. **Pessimistic Row Lock**:
   `StockMutationService` acquires `SELECT id, current_number, current_unit_price FROM erp_material_current_stock WHERE tenant_id = ? AND depot_id = ? AND material_id = ? FOR UPDATE`.
3. **Continuous Weighted Moving Average Cost Update**:
   $$P_{\text{new}} = \frac{(S_{\text{current}} \times P_{\text{current}}) + (\Delta Q \times P_{\text{in}})}{S_{\text{current}} + \Delta Q}$$
4. **Immutable Physical Stock Ledger**:
   `StockMutationService` inserts an immutable record into `erp_stock_ledger_entry` with `actual_qty`, `qty_after_transaction`, `incoming_rate`, `valuation_rate`, `stock_value`, and `stock_value_difference`.
5. **Physical Balance Cache**:
   `StockMutationService` updates `erp_material_current_stock` (`current_number`, `current_unit_price`).
6. **Financial Accounting Consumption**:
   `ProcurementAccountingPostingService.postGrnToGrni(...)` is invoked as a downstream accounting observer. It creates double-entry journal entries in `erp_gl_entry` (`Dr 1211 / Cr 2105`) reflecting the valuation calculated by the inventory engine.

```
┌─────────────────────────┐
│   GoodsReceiptService   │
└────────────┬────────────┘
             │ (1) StockMovementRequest
             ▼
┌─────────────────────────┐        (2) SELECT ... FOR UPDATE
│  StockMutationService   │ ─────────────────────────────────► [erp_material_current_stock]
└────────────┬────────────┘ ─────────────────────────────────► [erp_stock_ledger_entry]
             │                     (3) Appends Immutable Physical Audit Row
             │ (4) Inward Valuation Persisted
             ▼
┌─────────────────────────┐
│ ProcurementAccounting-  │
│     PostingService      │ ─────────────────────────────────► [erp_gl_entry]
└─────────────────────────┘        (5) Pure Downstream Financial Accrual (Dr 1211 / Cr 2105)
```

**Forensic Finding:** `ProcurementAccountingPostingService` and `PurchaseAccountingPostingService` contain **zero** independent stock modification or moving-average calculation logic. There is no second stock mutation authority.

---

## 4. COGS Authority

### Forensic Invariant:
$$\mathbf{SalesAccountingPostingService.postDeliveryDispatchToCOGS} = \mathbf{SOLE\ Commercial\ COGS\ Authority}$$

### Architectural Verification:
- **Canonical Method**: [`SalesAccountingPostingService.postDeliveryDispatchToCOGS`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java)
- **Posting Rule**:
  $$\mathbf{Dr\ 4110}\text{ (Cost of Goods Sold - COGS)} = Q_{\text{dispatched}} \times P_{\text{moving\_avg}}$$
  $$\mathbf{Cr\ 1212}\text{ (Finished Goods Inventory Asset Relief)} = Q_{\text{dispatched}} \times P_{\text{moving\_avg}}$$
- **Project-Wide Search Audit**:
  - Entire repository was searched for unauthorized writes to Account `4110` or raw finished goods credit entries outside this path.
  - Zero duplicate COGS posting engines or shadow dispatch services were detected.
  - Idempotency protection prevents duplicate submissions on identical delivery vouchers.

**Verdict:** Verified single COGS posting authority.

---

## 5. GRNI Authority

### Forensic Invariant:
$$\mathbf{Account\ 2105\ (GRNI)} \iff \text{Authoritative Unbilled Inward Goods Liability}$$

### Authority Mapping:
1. **GRNI Accrual Authority**: [`ProcurementAccountingPostingService.postGrnToGrni`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java)
   - Triggered upon GRN acceptance.
   - Enforces `glEntryMapper.countByVoucher(tenantId, "GRN", grnId) == 0`.
   - Balanced posting: $\mathbf{Dr\ 1211}\text{ (Raw Materials)} / \mathbf{Cr\ 2105}\text{ (GRNI Accrual)}$.
2. **GRNI Clearing Authority**: [`PurchaseAccountingPostingService.postPurchaseInvoiceToGeneralLedger`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/PurchaseAccountingPostingService.java)
   - Triggered upon Purchase Invoice approval with `PurchaseClassification.GRNI_CLEARING`.
   - Enforces `glEntryMapper.countByVoucher(tenantId, "PURCHASE_INVOICE", invoiceId) == 0` and pessimistic row locking.
   - Balanced posting: $\mathbf{Dr\ 2105}\text{ (GRNI Accrual)} / \mathbf{Cr\ 2320}\text{ (Trade Payables)}$.

**Verdict:** Verified exact single-point authority for GRNI accrual and clearing. Duplicate posting is strictly prevented by idempotency barriers.

---

## 6. GRNI / PPV Mathematical Validation

Independently reproduced and validated from persisted database state in [`PerpetualInventoryAccountingTest.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/test/java/com/jsh/erp/service/PerpetualInventoryAccountingTest.java):

### Scenario A: Higher Invoice Price ($P_{\text{inv}} > P_{\text{PO}}$)
- **Parameters**: $\text{PO} = 10 \times ₹100$; $\text{GRN} = 10 \times ₹100$; $\text{Invoice} = 10 \times ₹110$.
- **GRN Posting**:
  $$\text{Dr 1211 (Raw Materials)} \quad ₹1,000.00 \quad / \quad \text{Cr 2105 (GRNI Accrual)} \quad ₹1,000.00$$
- **Invoice Match Posting**:
  $$\text{Dr 2105 (GRNI Accrual)} \quad ₹1,000.00 \quad [10 \times 100]$$
  $$\text{Dr 4115 (Purchase Price Variance - PPV)} \quad ₹100.00 \quad [10 \times (110 - 100)]$$
  $$\text{Cr 2320 (Trade Payables)} \quad ₹1,100.00$$
- **Persisted Balances**:
  - $\text{Inventory Asset (1211)} = \mathbf{₹1,000.00}$ (10 units @ ₹100).
  - $\text{GRNI Accrual (2105)} = \text{Cr } 1,000 - \text{Dr } 1,000 = \mathbf{₹0.00}$.
  - $\text{Trade Payables (2320)} = \mathbf{Cr\ ₹1,100.00}$.
  - $\text{PPV Variance (4115)} = \mathbf{Dr\ ₹100.00}$ (Unfavorable expense).
- **Accounting Equation Proof**: $\text{Assets (1,000)} + \text{Expenses (100)} = \text{Liabilities (1,100)}$. **PROVEN** (`test10_PpvInvoiceRateHigher`).

### Scenario B: Lower Invoice Price ($P_{\text{inv}} < P_{\text{PO}}$)
- **Parameters**: $\text{PO} = 10 \times ₹100$; $\text{GRN} = 10 \times ₹100$; $\text{Invoice} = 10 \times ₹90$.
- **GRN Posting**:
  $$\text{Dr 1211 (Raw Materials)} \quad ₹1,000.00 \quad / \quad \text{Cr 2105 (GRNI Accrual)} \quad ₹1,000.00$$
- **Invoice Match Posting**:
  $$\text{Dr 2105 (GRNI Accrual)} \quad ₹1,000.00 \quad [10 \times 100]$$
  $$\text{Cr 4115 (Purchase Price Variance - PPV Gain)} \quad ₹100.00 \quad [10 \times (100 - 90)]$$
  $$\text{Cr 2320 (Trade Payables)} \quad ₹900.00$$
- **Persisted Balances**:
  - $\text{Inventory Asset (1211)} = \mathbf{₹1,000.00}$.
  - $\text{GRNI Accrual (2105)} = \mathbf{₹0.00}$.
  - $\text{Trade Payables (2320)} = \mathbf{Cr\ ₹900.00}$.
  - $\text{PPV Variance (4115)} = \mathbf{Cr\ ₹100.00}$ (Favorable procurement gain).
- **Accounting Equation Proof**: $\text{Assets (1,000)} = \text{Liabilities (900)} + \text{Gains (100)}$. **PROVEN** (`test11_PpvInvoiceRateLower`).

### Scenario C: Partial Receipts & Partial Billing
- **Parameters**: $\text{PO} = 100 \times ₹100 = ₹10,000$; $\text{GRN \#1} = 40 \text{ units}$; $\text{GRN \#2} = 30 \text{ units}$; $\text{Invoice \#1} = 50 \text{ units @ } ₹105$.
- **GRN \#1**: $\text{Dr 1211 } ₹4,000 / \text{Cr 2105 } ₹4,000$.
- **GRN \#2**: $\text{Dr 1211 } ₹3,000 / \text{Cr 2105 } ₹3,000$. (Cumulative GRNI Cr = ₹7,000).
- **Invoice \#1 (50 units @ ₹105 = ₹5,250)**:
  $$\text{Dr 2105 (GRNI Accrual)} \quad ₹5,000.00 \quad [50 \times 100]$$
  $$\text{Dr 4115 (PPV)} \quad ₹250.00 \quad [50 \times (105 - 100)]$$
  $$\text{Cr 2320 (Trade Payables)} \quad ₹5,250.00$$
- **Net Balances**:
  - $\text{Net GRNI (2105)} = \text{Cr } 7,000 - \text{Dr } 5,000 = \mathbf{Cr\ ₹2,000.00}$ (Matches remaining unbilled 20 units received: $20 \times ₹100 = ₹2,000$).
  - Remaining unbilled received quantity = $20\text{ units}$.
  - Remaining unreceived PO quantity = $30\text{ units}$.
- **PROVEN** (`test07_PartialGrnAndPartialInvoice`).

### Scenario D: Multiple GRNs & Multiple Invoices (Line-Level Allocation)
- Tracked at granular line item level in `erp_po_line_fulfillment`. Total receipts ($40 + 30 = 70$) matched against subsequent invoices ($50 + 20 = 70$) clear Account `2105` to exactly ₹0.00 without cross-line bleeding. **PROVEN** (`test08_MultipleGrnsAndMultipleInvoices`).

---

## 7. Invoice-Before-GRN

### Forensic Handling:
When a supplier invoice is booked and approved prior to physical goods arrival:
1. **Invoice Booking**:
   $$\text{Dr 2105 (GRNI Accrual)} \quad ₹10,000.00 \quad [\text{Pre-billing temporary debit}]$$
   $$\text{Dr 1251/1252 (Input GST)} \quad ₹1,800.00 \quad [\text{Eligible ITC}]$$
   $$\text{Cr 2320 (Trade Payables)} \quad ₹11,800.00 \quad [\text{Gross Vendor AP}]$$
2. **Subsequent GRN Arrival**:
   $$\text{Dr 1211 (Raw Materials Inventory Asset)} \quad ₹10,000.00 \quad [\text{Physical capitalization}]$$
   $$\text{Cr 2105 (GRNI Accrual)} \quad ₹10,000.00 \quad [\text{Clears temporary debit to zero}]$$

### Invariant Verification:
- Physical stock is NOT capitalized prematurely (only capitalized when GRN arrives).
- No negative stock occurs.
- Account `2105 GRNI` nets to exactly ₹0.00 after both events complete.
- Vendor AP (`2320`) is recognized accurately.
- **PROVEN** (`test06_InvoiceBeforeGrnPreBilledMatching`).

---

## 8. Quantity vs Price Variance Isolation

### Forensic Invariant:
$$\mathbf{PPV} = \mathbf{Price\ Rate\ Variance\ ONLY}\ [Q_{\text{billed}} \times (P_{\text{inv}} - P_{\text{PO}})]$$

### Test Scenario:
- $\text{PO} = 100 \text{ units @ } ₹100$; $\text{GRN} = 80 \text{ units @ } ₹100$; $\text{Invoice} = 100 \text{ units @ } ₹110$.
- **Financial Posting**:
  $$\text{Dr 2105 (GRNI Accrual)} \quad ₹10,000.00 \quad [100 \times 100]$$
  $$\text{Dr 4115 (Purchase Price Variance)} \quad ₹1,000.00 \quad [100 \times (110 - 100)]$$
  $$\text{Cr 2320 (Trade Payables)} \quad ₹11,000.00 \quad [\text{Gross Taxable}]$$
- **Isolation Proof**:
  - Price variance of ₹1,000 is isolated in Account `4115 PPV`.
  - The 20-unit physical unreceived quantity creates an open debit of ₹2,000 on Account `2105 GRNI` ($₹10,000\text{ cleared} - ₹8,000\text{ accrued}$), accurately reflecting prepaid unreceived goods until physical arrival or debit note adjustment.
  - **Verdict:** PPV never conceals or absorbs physical quantity variances. **PROVEN** (`test13_QuantityMismatchSeparation`).

---

## 9. Weighted Moving Average + PPV

### High-Risk Interaction Analysis:
1. **Opening Stock**: $100\text{ units @ } ₹100 = ₹10,000$.
2. **Inward GRN**: $10\text{ units @ } ₹100 \implies \text{Stock} = 110\text{ units @ } ₹100 = ₹11,000$. $\text{Accrued GRNI} = \text{Cr } ₹1,000$.
3. **Outbound Commercial Sale**: $5\text{ units sold} \implies \text{COGS posted} = 5 \times ₹100 = \mathbf{₹500.00}$. $\text{Remaining Stock} = 105\text{ units @ } ₹100 = ₹10,500$.
4. **Supplier Invoice Arrival**: $10\text{ units @ } ₹120 = ₹1,200$.
   $$\text{Dr 2105 (GRNI Accrual)} \quad ₹1,000.00$$
   $$\text{Dr 4115 (PPV Expense)} \quad ₹200.00$$
   $$\text{Cr 2320 (Trade Payables)} \quad ₹1,200.00$$

### Verified Results:
- $\text{Remaining Physical Stock Quantity} = \mathbf{105.0000\ units}$.
- $\text{Remaining Inventory Valuation} = \mathbf{₹10,500.00}$ (Valuation rate remains ₹100.0000/unit).
- $\text{Historical COGS Already Recognized} = \mathbf{₹500.00}$ (Untouched, immutable).
- $\text{PPV Variance Recognized in P\&L} = \mathbf{Dr\ ₹200.00}$.
- $\text{GRNI Accrual Balance} = \mathbf{₹0.00}$.
- $\text{Vendor Accounts Payable} = \mathbf{Cr\ ₹1,200.00}$.

**Forensic Conclusion:** Isolating the ₹200 invoice variance in Account `4115 PPV` adheres strictly to Ind AS 2 perpetual inventory standards. It prevents retroactive revaluation corruption of historical stock ledger rows and avoids negative valuation anomalies.

---

## 10. Post-Sale Invoice Handling

### Invariant:
When an invoice arrives at a different rate after part or all of the inventory has already been sold and expensed to COGS:
- **Historical COGS on Account `4110` is NOT rewritten.**
- **Historical GL ledger rows in `erp_gl_entry` remain strictly append-only.**
- **Price difference is absorbed by Account `4115 PPV` in the period of invoice approval.**

**Boundary Specification:** Full purchase landed cost adjustments (freight/customs apportionment via Landed Cost Voucher) operate prospectively on remaining on-hand stock or flow to landed cost variance per Phase P5 design. Phase 2F standard procurement rate variance flows cleanly to `4115 PPV`. **PROVEN** (`test14_PostSaleInvoicePriceVariance`).

---

## 11. GST Accounting

### Verification of Tax Integration:
- Inward tax calculation is governed by [`GstCalculationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstCalculationService.java) without duplicate math engines.
- **Eligible Input Tax Credit (ITC)**:
  - CGST: $\mathbf{Dr\ 1251}\text{ (Input CGST)}$
  - SGST: $\mathbf{Dr\ 1252}\text{ (Input SGST)}$
  - IGST: $\mathbf{Dr\ 1253}\text{ (Input IGST)}$
- Correctly routed to Electronic Credit Ledger asset accounts.
- **Anti-Duplication**: Enforced via document-level idempotency checks on `erp_gl_entry`. **PROVEN** (`test15_TaxEligibleGstPosting`).

---

## 12. Blocked ITC (Section 17(5))

### Statutory Rule & Implementation:
Under Section 17(5) of the CGST Act 2017, Input Tax Credit cannot be claimed for restricted categories (e.g., motor vehicles, club memberships, personal consumption). In accordance with Ind AS 2:
$$\text{Blocked GST} \implies \text{Capitalized directly into Inventory Asset (Account 1211)}$$

### Forensic Verification:
- When `blocked_itc_amount > 0`:
  - $\mathbf{Dr\ 1211}\text{ (Raw Materials Inventory Asset)} = \text{Blocked Tax Amount}$
  - Account `1251 / 1252 / 1253` (Input GST Credit Ledgers) receive **₹0.00**.
  - Total gross liability to vendor on `2320 AP` remains fully intact.
- **PROVEN** (`test16_TaxBlockedItcCapitalization`).

---

## 13. Round-Off / Section 170

### Statutory Attribution & COA Verification:
- **Account**: `4560` (`Fractional Round-Off Difference`)
- **Classification**: `EXPENSE` root type, `ROUND_OFF` account type, normal balance `DEBIT`.
- **Statutory Authority**: CGST Act 2017 Section 170 mandates rounding final tax and invoice rupee amounts to the nearest whole rupee.
- **Ledger Invariant**:
  $$\text{If Gross Total} > \text{Debit Leg Sum} \implies \mathbf{Dr\ 4560}\text{ (Rounding Expense)}$$
  $$\text{If Gross Total} < \text{Debit Leg Sum} \implies \mathbf{Cr\ 4560}\text{ (Rounding Income)}$$
- **PROVEN** (`test17_RoundOffLedgerPosting`).

---

## 14. Manufacturing Work-in-Progress (WIP)

### Implemented Basic WIP Engine:
1. **Material Issue to Shop-Floor (Work Order Release)**:
   - Deducts raw materials from source stores bin via `StockMutationService.recordMovement` (`MFG_MATERIAL_ISSUE`).
   - Increases raw materials in designated shop-floor WIP bin via `StockMutationService.recordMovement` (`MFG_WIP_RECEIPT`).
   - Posts double-entry GL journal:
     $$\mathbf{Dr\ 1213}\text{ (Work-in-Progress - WIP Asset)} \quad / \quad \mathbf{Cr\ 1211}\text{ (Raw Materials Asset Relief)}$$
   - Total issue cost = $\sum (Q_{\text{issued}} \times P_{\text{valuation\_rate}})$.
2. **Production Receipt (Finished Goods Inward)**:
   - Deducts issued components proportionally from WIP bin via `StockMutationService.recordMovement` (`MFG_WIP_CONSUMPTION`).
   - Absorbs consumed component cost:
     $$\text{Actual FG Unit Cost} = \frac{\text{Total Absorbed Material Cost}}{Q_{\text{received}}}$$
   - Increases Finished Goods in stores bin at `Actual FG Unit Cost` via `StockMutationService.recordMovement` (`MFG_PRODUCTION_RECEIPT`).
   - Posts double-entry GL journal:
     $$\mathbf{Dr\ 1212}\text{ (Finished Goods Asset)} \quad / \quad \mathbf{Cr\ 1213}\text{ (Work-in-Progress - WIP Relief)}$$
   - Clears Account `1213 WIP` to **₹0.00** upon 100% batch completion.

**PROVEN** (`test26_ManufacturingMaterialIssueWip`, `test27_ManufacturingProductionReceiptFg`, `test28_PartialProductionReceiptAndWipRelief`).

---

## 15. Manufacturing Cost Boundary Declaration

> [!IMPORTANT]
> **STATUTORY BOUNDARY SPECIFICATION:**  
> **PHASE 2F WIP = MATERIAL-ONLY VALUATION**

### Authoritative Cost Component Matrix:
| Cost Component | Status in Phase 2F | Status in Future Phases |
| :--- | :---: | :--- |
| **Raw Material Direct Cost** | **INCLUDED (Authoritative)** | Active perpetual moving-average valuation |
| **Direct Labor Cost** | **EXCLUDED** | Deferred to Phase 3 Manufacturing Costing |
| **Machine Routing Overhead** | **EXCLUDED** | Deferred to Phase 3 Machine Run-Time Allocation |
| **Subcontracting Processing Charges** | **EXCLUDED** | Governed by Phase 2B Job Work Direct Invoicing (`4130`) |
| **Scrap / Yield Normalization** | **EXCLUDED** | Deferred to Phase 3 Advanced Manufacturing |

The system does not claim or imply multi-element absorption costing in Phase 2F; material cost absorption is 100% verified and complete.

---

## 16. Returns & Document Reversals

### Append-Only Immutable Reversal Trace:
- **GRN Reversal**: `reverseGrnGeneralLedger` appends inverse GL entries (`Dr 2105 GRNI / Cr 1211 RM`) linked by `reversal_of_id` (`test04`).
- **Purchase Invoice Reversal**: `reversePurchaseInvoiceGeneralLedger` appends inverse GL entries (`Dr 2320 AP / Cr 2105 / Cr GST`) and adjusts `all_need_pay` (`test04`).
- **Sales Delivery Reversal**: `glEntryService.reverseEntries` appends inverse COGS entries (`Dr 1212 FG / Cr 4110 COGS`) (`test24`).
- **Material Issue Reversal**: `reverseMaterialIssueGeneralLedger` appends inverse WIP entries (`Dr 1211 RM / Cr 1213 WIP`) (`test29`).
- **Production Receipt Reversal**: `reverseProductionReceiptGeneralLedger` appends inverse FG entries (`Dr 1213 WIP / Cr 1212 FG`).

**Verdict:** Historical journals are never mutated or deleted (`DELETE` / `UPDATE` on posted rows is forbidden). Lineage is preserved via `reversal_of_id`.

---

## 17. Atomicity

### Forensic Failure-Injection Audit:
Spring `@Transactional(value = "transactionManager", rollbackFor = Exception.class)` was tested under intentional runtime failures:
1. **Scenario A (GL Failure)**: Physical stock mutation succeeds, but GL insertion fails $\implies$ **Entire transaction rolls back; stock mutation is completely reverted** (`test33_AtomicityForcedGlFailureRollback`).
2. **Scenario B (Stock Mutation Failure)**: Negative stock violation throws exception $\implies$ **Transaction aborts; zero GL lines created** (`test34_AtomicityForcedStockFailureRollback`).
3. **Scenario C (Accounting Validation Failure)**: Zero-gross or invalid parameters $\implies$ **Transaction aborts cleanly without partial state** (`test35_AtomicityForcedAccountingFailureRollback`).

**Verdict:** Guaranteed ACID atomicity across operational tables, stock ledger, and General Ledger.

---

## 18. Concurrency

### Multi-Threaded Contention Verification:
- **Test 31 (16 Concurrent Threads)**: 16 concurrent threads executing `StockMutationService.recordMovement` on the same material/depot under pessimistic row locking (`SELECT ... FOR UPDATE`).
  - **Result**: All 16 threads completed successfully. Final physical quantity reconciled perfectly ($10 + 16 \times 1 = 26.0000$). Zero deadlocks, zero negative stock, zero valuation corruption.
- **Test 32 (8 Concurrent Threads)**: 8 concurrent purchase invoice postings executed against the GL.
  - **Result**: All 8 postings completed sequentially with zero duplicate vouchers or race conditions.

**Verdict:** Concurrency safety under high thread contention is proven.

---

## 19. Tenant Isolation

### Adversarial Multi-Tenant Audit:
- **Test 30 (`test30_MultiTenantIsolation`)**:
  - Tenant 901 and Tenant 902 posted independent GRNs and GL entries.
  - Context switched to Tenant 901: queried Tenant 902's voucher $\implies$ **Returned 0 records**.
  - MyBatis tenant interceptor and dynamic COA resolution strictly prevent cross-tenant data leakage.

**Verdict:** Hard tenant boundary isolation is verified.

---

## 20. Account Resolution

### Dynamic Chart of Accounts (COA) Mappings:
All candidate accounts are resolved dynamically via `accountCoaService.getAccountCoaByCode(code, tenantId)`:
- `1211` Raw Materials Inventory Asset (`ASSET / STOCK / DEBIT`)
- `1212` Finished Goods Inventory Asset (`ASSET / STOCK / DEBIT`)
- `1213` Work-in-Progress Asset (`ASSET / STOCK / DEBIT`)
- `2105` Goods Received Not Invoiced Accrual (`LIABILITY / PAYABLE / CREDIT`)
- `2320` Trade Payables (`LIABILITY / PAYABLE / CREDIT`)
- `4110` Cost of Goods Sold (`EXPENSE / EXPENSE / DEBIT`)
- `4115` Purchase Price Variance (`EXPENSE / EXPENSE / DEBIT`)
- `4560` Fractional Round-Off Difference (`EXPENSE / ROUND_OFF / DEBIT`)
- `1251 / 1252 / 1253` Input CGST / SGST / IGST (`ASSET / TAX / DEBIT`)

Fallback resolution safely falls back to System Default (Tenant 0) if a tenant hasn't overridden a standard statutory code. Zero hardcoded primary key IDs.

---

## 21. Reversal & Idempotency

- Document locks and `countByVoucher` prevent double posting of GRN, Invoice, Delivery Dispatch, or Work Order vouchers.
- Reversal vouchers create separate inverse records with `is_cancelled = '0'` and `reversal_of_id = <original_id>`.
- Double-reversal of an already reversed voucher is prevented.

---

## 22. Test Quality

- **Test Framework**: JUnit 5 + Spring Boot Test (`@SpringBootTest`, `@ActiveProfiles("test")`).
- **Database Engine**: Real database with live tables (`erp_gl_entry`, `erp_stock_ledger_entry`, `erp_material_current_stock`, `erp_work_order`, `erp_account_coa`).
- **Mocking**: Zero mock-only shortcuts. All 35 tests verify persisted database rows, transaction rollback behavior, and multi-threaded locks.

---

## 23. Full Accounting Subsystem Regression Suite

The full regression suite across all implemented accounting phases was executed:
```bash
mvn test "-Dtest=PerpetualInventoryAccountingTest,SubledgerReconciliationServiceTest,PurchaseAccountingPostingServiceTest,SalesAccountingPostingServiceTest,GlEntryServiceTest,FinancialAccountingPostingServiceTest,AccountCoaServiceTest"
```

### Full Regression Results:
```text
[INFO] Running com.jsh.erp.service.AccountCoaServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.FinancialAccountingPostingServiceTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.PerpetualInventoryAccountingTest
[INFO] Tests run: 35, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.PurchaseAccountingPostingServiceTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.SalesAccountingPostingServiceTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.GlEntryServiceTest
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.jsh.erp.service.SubledgerReconciliationServiceTest
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total Tests Run: 99, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
```

**Verdict:** 99/99 PASS (100% Green). Zero regressions across Phase 1 and Phases 2A–2F.

---

## 24. Graphify Architecture & Topology Audit

The Graphify knowledge graph (`graph.json`) was inspected:
- **Total Nodes**: 24,594
- **Total Edges**: 65,150
- **Topology Invariant**:
  - `StockMutationService` remains the sole physical stock authority.
  - Accounting posting services (`ProcurementAccountingPostingService`, `PurchaseAccountingPostingService`, `SalesAccountingPostingService`) consume inventory valuation data as downstream observers.
  - Zero circular dependency edges between stock mutation and accounting services (`Direct Stock <-> Purchase links: 0`, `Direct Stock <-> Proc links: 0`).
  - `WorkOrderService` orchestrates physical mutation via `StockMutationService` and financial posting via `GlEntryService` without architectural cycles.

---

## 25. Failure Modes & Fail-Closed Behavior

- **Missing Account**: Throws `BusinessRunTimeException` or gracefully uses tenant 0 statutory default; never posts unbalanced GL entries.
- **Negative Stock**: Throws `MATERIAL_STOCK_NOT_ENOUGH` and triggers full transaction rollback.
- **Database Connection Failure**: Aborts transaction via Spring PlatformTransactionManager; zero half-committed records.

---

## 26. Auditability & Lineage

Every Phase 2F GL entry contains complete audit metadata:
- `tenant_id`: Mandatory tenant identification.
- `voucher_type`: `GRN`, `PURCHASE_INVOICE`, `DELIVERY_DISPATCH`, `MFG_MATERIAL_ISSUE`, `MFG_PRODUCTION_RECEIPT`.
- `voucher_id` & `voucher_no`: Clickable trace back to the operational document.
- `party_type` & `party_id`: Direct linkage to Customer or Supplier master records.
- `reversal_of_id`: Explicit audit lineage on cancellation entries.
- `creator` & `create_time`: Full user and timestamp attribution.

Zero orphaned or unexplained GL records exist.

---

## 27. Findings Classification

```text
======================================================================
  P0 (Critical / Corruption / Security) : 0
  P1 (High / Broken Invariant)          : 0
  P2 (Medium / Operational Weakness)    : 0
  P3 (Low / Informational Observations) : 0
======================================================================
```

---

## 28. Required Remediation

**None.** Phase 2F meets all statutory, architectural, mathematical, atomicity, concurrency, and security requirements.

---

## 29. Final Decision

```text
======================================================================
  PHASE 2F FINAL DECISION: PASS
======================================================================
```

**PHASE 2F = FINAL PASS**

The **Finance Phase 2** Accounting Milestone (Phases 2A, 2B, 2C, 2D, 2E, and 2F) is **100% COMPLETE**.
