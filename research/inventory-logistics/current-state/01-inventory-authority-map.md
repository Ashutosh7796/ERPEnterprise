# 01 — Inventory Authority Map: Current-State Audit

## 1. Executive Summary
This document audits the authoritative ownership of inventory stock quantities, inventory mutations, and stock balance calculations in the current ERP.

---

## 2. Current Inventory Data Model

| Database Table | Entity Class | Primary Purpose | Authoritative For | Mutation Mechanism |
|---|---|---|---|---|
| `erp_depot_head` | [`DepotHead.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/DepotHead.java) | Transaction Header for Inbound/Outbound/Transfer/Special Bills | Document Status & Voucher Metadata | Inserted/Updated via [`DepotHeadService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotHeadService.java) |
| `erp_depot_item` | [`DepotItem.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/DepotItem.java) | Line items of every depot transaction (material, quantity, unit price, depot) | Operational Transaction Rows | Inserted/Updated via [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java) |
| `erp_material_current_stock` | [`MaterialCurrentStock.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/MaterialCurrentStock.java) | Secondary cache of current quantity and unit price per `(material_id, depot_id)` | Read-only Snapshot Cache (Non-Authoritative) | Overwritten by periodic calls to `updateCurrentStockFun()` |
| `erp_material_initial_stock` | [`MaterialInitialStock.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/MaterialInitialStock.java) | Opening inventory balances per `(material_id, depot_id)` | Opening Stock Baseline | Written during Item Master Creation |
| `erp_stock_reservation` | N/A (JdbcTemplate table) | Soft-reservations for Sales Orders | Reserved Stock Quantity | Managed by [`StockReservationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockReservationService.java) |

---

## 3. How Stock Quantity is Calculated (The "Sum-of-All-Time" Query)

In the current ERP, **there is NO immutable Stock Ledger Entry table**. Stock balance is calculated on demand by executing an aggregate SQL query across `erp_depot_item` and `erp_depot_head`:

* **Service Method:** [`DepotItemService.getStockByParam()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1070-L1089)
* **Underlying SQL (Mapper):** `DepotItemMapperEx.getStockByParamWithDepotList` in [`DepotItemMapperEx.xml`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/DepotItemMapperEx.xml#L794-L819)

```sql
SELECT
    sum(case when dh.type='入库' then di.basic_number else 0 end) as inTotal,
    sum(case when dh.type='出库' and dh.sub_type!='零售' then di.basic_number else 0 end) as outTotal,
    sum(case when dh.sub_type='调拨' then di.basic_number else 0 end) as transfInTotal,
    sum(case when dh.sub_type='调拨' then di.basic_number else 0 end) as transfOutTotal,
    sum(case when dh.sub_type='组装单' and di.material_type='组合件' then di.basic_number else 0 end) as assemInTotal,
    sum(case when dh.sub_type='组装单' and di.material_type='普通子件' then di.basic_number else 0 end) as assemOutTotal,
    sum(case when dh.sub_type='拆卸单' and di.material_type='普通子件' then di.basic_number else 0 end) as disAssemInTotal,
    sum(case when dh.sub_type='拆卸单' and di.material_type='组合件' then di.basic_number else 0 end) as disAssemOutTotal
FROM erp_depot_head dh
LEFT JOIN erp_depot_item di ON dh.id = di.header_id AND IFNULL(di.delete_flag,'0') != '1'
WHERE IFNULL(dh.delete_flag,'0') != '1'
  AND di.material_id = #{mId}
```

$$\text{Current Stock} = \text{Initial Stock} + \text{Stocktake Variance} + (\text{Inbound} - \text{Outbound})$$

---

## 4. Architectural Weaknesses of the Current Authority

1. **O(N) Calculation Degradation**: As transaction volume grows (e.g. 50,000+ dispatches and receipts), calculating stock balance for a product requires a table scan aggregating all historical lines.
2. **Fragile Chinese String Enums**: Query branching depends on hardcoded Chinese string literals:
   - `'入库'` (Inbound), `'出库'` (Outbound), `'调拨'` (Transfer), `'组装单'` (Assembly), `'拆卸单'` (Disassembly), `'组合件'` (Main assembly item), `'普通子件'` (Component child item).
   - Any new document type (e.g. Manufacturing Job Card, Subcontracting Challan, Return) requires editing complex `CASE WHEN` logic in XML.
3. **No Chronological Stock Ledger**: There is no table that stores:
   $$\text{Stock After Transaction} = \text{Previous Balance} \pm \Delta \text{Qty}$$
   Consequently, running a Point-in-Time Stock Valuation (e.g., "What was stock value on 31st March for year-end audit?") requires running the entire query filtered by `oper_time <= '2026-03-31'`, which is computationally expensive and susceptible to historical record edits.
4. **Cache Incoherency Risk**: `erp_material_current_stock` is updated asynchronously or in separate calls via `updateCurrentStockFun()`. If a direct SQL insert or batch import occurs without triggering `updateCurrentStockFun()`, the cache deviates from reality.

---

## 5. Summary of Authority Responsibility

| Authority Domain | Current Responsible Component | Evaluated Health |
|---|---|:---:|
| **Physical Stock Balance** | [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java) | **Fragile** (Scan-based) |
| **Stock Snapshot Cache** | `erp_material_current_stock` | **Partial** (Unsynced) |
| **Sales Order Stock Reservation** | [`StockReservationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockReservationService.java) | **Stable** |
| **Stock Movements & Transfers** | [`DepotHeadService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotHeadService.java) | **Legacy / Functional** |
| **Batch / Serial Tracking** | [`SerialNumberService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SerialNumberService.java) | **Partial** |
