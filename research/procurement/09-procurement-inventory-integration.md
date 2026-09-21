# 09 - Procurement Inventory & Warehouse Integration

**Domain Focus**: Physical Material Restocking, Valuation Rates, and Depot Controls  

---

## 1. Inventory Movement Lifecycle

```text
[Purchase Order Approved]
           │ (Does NOT change on-hand inventory; updates expected incoming stock)
           ▼
[Goods Receipt Note (GRN) Posted]
           ├─► Increases Physical Inventory (erp_material_current_stock.current_number)
           ├─► Recalculates Moving Average Valuation Rate (Material.purchase_decimal)
           ├─► Records Stock Inflow Audit Entry (erp_depot_item)
           └─► Places Rejected Qty in Quarantine / Vendor Staging Area
           ▼
[Purchase Return / Debit Note Posted]
           ├─► Decreases Physical Inventory (erp_material_current_stock)
           └─► Restores Available Capacity
```

---

## 2. Moving Average Cost Valuation Formula

Upon posting of an accepted Goods Receipt:

$$\text{New Purchase Rate} = \frac{(\text{Current Qty} \times \text{Current Unit Cost}) + (\text{Accepted Receipt Qty} \times \text{Net Purchase Rate})}{\text{Current Qty} + \text{Accepted Receipt Qty}}$$

*Where Net Purchase Rate includes landed freight, insurance, and non-creditable/blocked taxes, but excludes creditable Input GST.*

---

## 3. Warehouse Controls & Tolerance Gates

1. **Warehouse Permission Scoping**:
   * Scoped via `DataScopeService`: Users can only receive goods into depots included in their active permission mask (`DataScope.allowedDepotIds`).
2. **Over-Receipt Tolerance**:
   * Default: Strict 0% over-receipt block.
   * Configurable per tenant/item: Up to 5% tolerance (e.g. for bulk chemicals or raw steel) before throwing `RECEIPT_EXCEEDS_ORDERED_QTY_CODE`.
3. **Quarantine / Rejected Stock Separation**:
   * Rejected goods do not enter sellable/reservable inventory; they remain tagged as `QC_REJECTED` awaiting vendor return dispatch.
