# Migration Strategy: Non-Destructive Data Evolution

## 1. Migration Principles
1. **Zero Disruption to Existing Operational Documents**: All existing Purchase Orders, Sales Orders, Goods Receipts, Dispatches, and Tax Invoices must remain completely readable and valid.
2. **Non-Destructive Schema Additions**: All new tables (`erp_stock_ledger_entry`, `erp_depot_bin`, `erp_bom_head`, `erp_work_order`) are additive. No existing columns are dropped.
3. **Graceful Backward Compatibility for Legacy Assembly Bills**: The legacy `SpecialBillList.tsx` (Chinese assembly/disassembly bills) will remain active in read-only mode so historical records are never lost.

---

## 2. Step-by-Step Backfill Strategy

### Step 1: Default Storage Bin Seeding
For every existing record in `erp_depot`:
```sql
INSERT INTO `erp_depot_bin` (`tenant_id`, `depot_id`, `bin_code`, `bin_name`, `bin_type`, `is_default`)
SELECT `tenant_id`, `id`, 'DEFAULT-BIN', 'General Storage Area', 'STORAGE', 1
FROM `erp_depot`
WHERE IFNULL(`delete_Flag`, '0') != '1'
ON DUPLICATE KEY UPDATE `is_default` = 1;
```

### Step 2: Stock Ledger Baseline Seeding
Rather than attempting to re-play years of historical `erp_depot_item` rows (which could cause rounding anomalies due to legacy edits), we initialize the new `erp_stock_ledger_entry` with an authoritative **Opening Balance snapshot** derived from current physical stock in `erp_material_current_stock`:
```sql
INSERT INTO `erp_stock_ledger_entry` 
(`tenant_id`, `material_id`, `depot_id`, `bin_id`, `voucher_type`, `voucher_no`, `posting_time`, `actual_qty`, `qty_after_transaction`, `incoming_rate`, `valuation_rate`, `stock_value`, `stock_value_difference`, `remark`)
SELECT 
    mcs.tenant_id,
    mcs.material_id,
    mcs.depot_id,
    b.id,
    'OPENING_SNAPSHOT',
    CONCAT('INIT-DEPOT-', mcs.depot_id),
    NOW(),
    mcs.current_number,
    mcs.current_number,
    mcs.current_unit_price,
    mcs.current_unit_price,
    (mcs.current_number * mcs.current_unit_price),
    (mcs.current_number * mcs.current_unit_price),
    'Automated Stock Ledger Initialization Baseline'
FROM erp_material_current_stock mcs
JOIN erp_depot_bin b ON b.depot_id = mcs.depot_id AND b.is_default = 1
WHERE mcs.current_number > 0 AND IFNULL(mcs.delete_flag, '0') != '1';
```

From this timestamp onward, every new transaction increments or decrements from this baseline.

---

## 3. Rollback & Fail-Safe Strategy
* If `StockMutationService` encounters an error, the outer `@Transactional(rollbackFor = Exception.class)` aborts the transaction, reverting both the ledger entry and the balance update.
* If a tenant wishes to audit stock, a reconciliation utility can compare:
  $$\Delta = \text{Current Stock Cache} - \text{Cumulative Ledger Sum}$$
  Any variance is reported in a diagnostic log for administrative review.
