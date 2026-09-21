# 03 — Valuation Map: Current-State Audit

## 1. Current Costing & Valuation Authority

In the current codebase, inventory valuation and unit cost calculation are split across three components:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          VALUATION AUTHORITIES                         │
├────────────────────────────────┬───────────────────────────────────────┤
│ Operational Unit Price Cache   │ erp_material_current_stock.current_   │
│                                │ unit_price                            │
│ Calculated by                  │ DepotItemService.updateCurrentStock()  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Landed Cost Capitalization     │ erp_landed_cost_voucher               │
│ Managed by                     │ LandedCostVoucherService.java         │
├────────────────────────────────┼───────────────────────────────────────┤
│ Financial Inventory Accounting │ erp_gl_journal_entry & _line          │
│ Posted by                      │ ProcurementAccountingPostingService   │
│                                │ & SalesAccountingPostingService       │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Valuation Logic in `DepotItemService.java`

* **Source File:** [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1200-L1235)
* **Method:** `updateCurrentStock(DepotItem depotItem)`
* **Cost Formula:**
  - On Inbound (Purchase Receipt):
    $$\text{currentAllPrice} = \sum (\text{item.allPrice})$$
    $$\text{currentNumber} = \sum (\text{item.basicNumber})$$
    $$\text{currentUnitPrice} = \frac{\text{currentAllPrice}}{\text{currentNumber}}$$
  - On Outbound (Sales Dispatch):
    $$\text{currentAllPrice} = \text{currentAllPrice} + (\text{basicNumber} \times \text{currentUnitPrice})$$
  - Result is persisted in `erp_material_current_stock`:
    `materialCurrentStockMapperEx.updateUnitPriceByMId(currentUnitPrice, depotItem.getMaterialId());`

---

## 3. Landed Cost Capitalization

* **Source File:** [`LandedCostVoucherService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/LandedCostVoucherService.java)
* **Status:** Implemented in Phase P5.
* **Mechanism:**
  1. Takes Inbound Freight, Customs, Transportation, or Insurance expenses.
  2. Apportions them across Goods Receipt Note (GRN) lines by:
     - `VALUE` (pro-rata by taxable value)
     - `QUANTITY` (pro-rata by received quantity)
     - `WEIGHT` (pro-rata by weight in kg)
  3. Posts to General Ledger via [`ProcurementAccountingPostingService.postLandedCostAllocation()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L403):
     - `Dr Inventory Asset Account` (Capitalized Landed Cost)
     - `Cr Freight/Customs Expense Clearing Account`

---

## 4. Gaps in Current Valuation Model

1. **Disconnected COGS Posting**:
   - [`SalesAccountingPostingService.postDeliveryDispatchToCOGS()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java#L205) is implemented in Java, but is **NOT invoked** when a sales dispatch is finalized in `DepotHeadService`.
   - Consequently, physical inventory decreases without an automated `Dr COGS | Cr Inventory Asset` GL voucher!
2. **No Historical Layer Valuation (FIFO / Batch Cost)**:
   - jshERP only tracks a single moving average unit price per material in `erp_material_current_stock`.
   - If an item is purchased in batches at ₹100, ₹120, and ₹150, the system collapses them into one blended average rate.
   - For statutory Indian AS-2 / Ind AS 2, weighted average is legally acceptable, so FIFO layers are not strictly required, but the average cost must be calculated from an immutable ledger rather than volatile recalculations.
3. **No Stock Revaluation Journal**:
   - If market value drops below cost (lower of cost and net realizable value per Ind AS 2), or an inventory write-down occurs, there is no formal Stock Revaluation Voucher to write down inventory asset value against a P&L impairment account.
