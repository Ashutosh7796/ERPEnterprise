# ERPNext Reference Architecture Analysis

## 1. Executive Summary
ERPNext (`frappe/erpnext`) is the industry benchmark for mid-market pragmatic ERP architecture. It manages inventory, manufacturing, and Indian statutory requirements with high developer ergonomics and straightforward data structures.

---

## 2. Core ERPNext Inventory Architecture

### 2.1 The Stock Ledger Entry (`tabStock Ledger Entry`)
* **Repository Path:** `erpnext/stock/doctype/stock_ledger_entry/`
* **Data Model:**
  - `item_code`: Product ID
  - `warehouse`: Target warehouse/location
  - `posting_date` & `posting_time`: Chronological timestamp
  - `voucher_type`: Source document (e.g. `Delivery Note`, `Purchase Receipt`, `Stock Entry`)
  - `voucher_no`: Document number
  - `actual_qty`: Quantity increment (+) or decrement (-)
  - `qty_after_transaction`: Balance immediately following this transaction
  - `incoming_rate`: Valuation rate of incoming stock
  - `valuation_rate`: Resulting moving average / FIFO valuation rate
  - `stock_value`: `qty_after_transaction * valuation_rate`
  - `stock_value_difference`: $\Delta \text{Value}$ posted to General Ledger
* **Why it Works:**
  - Every single movement of physical inventory funnels through ONE authoritative engine: `make_sl_entries()`.
  - There is zero ambiguity about who owns the stock truth. If a discrepancy exists, the stock ledger is the sole ground truth.
* **Adoption Decision for Our ERP:**
  - **STRONG ADOPT**. Building an equivalent `erp_stock_ledger_entry` table in Java/MyBatis is the single most valuable architectural upgrade we can introduce.

### 2.2 The Bin Balance Cache (`tabBin`)
* **Repository Path:** `erpnext/stock/doctype/bin/`
* **Data Model:**
  - Composite Key: `(item_code, warehouse)`
  - `actual_qty`: On-hand physical stock
  - `reserved_qty`: Stock reserved for confirmed Sales Orders
  - `ordered_qty`: Stock ordered on open Purchase Orders
  - `planned_qty`: Stock planned for Work Orders
  - `indented_qty`: Stock requested on Material Requests
  - `projected_qty = actual_qty + ordered_qty + planned_qty - reserved_qty`
  - `valuation_rate`: Current moving average cost
* **Concurrency Pattern:**
  - Updated atomically via `tabBin` row-level lock (`SELECT ... FOR UPDATE`) inside the `make_sl_entries()` transaction.
* **Adoption Decision for Our ERP:**
  - **ADOPT**. Our `erp_material_current_stock` can be upgraded with row-locking to act as our high-performance `Bin` balance cache.

### 2.3 Manufacturing & Production in ERPNext
* **Repository Path:** `erpnext/manufacturing/doctype/`
* **Key DocTypes:**
  - `BOM`: Multi-level BOM with scrap %, operations, and explosion item list.
  - `Work Order`: Manufacturing order with Planned Start/End date, Qty, WIP Warehouse, and FG Warehouse.
  - `Stock Entry`: Universal stock document parameterized by `purpose`:
    - `Material Transfer for Manufacture`: Moves RM from Stores Depot to WIP Location.
    - `Manufacture`: Consumes RM from WIP, increases Finished Good in FG Depot, logs Scrap Qty.
  - `Subcontracting Order` & `Subcontracting Receipt`: Dedicated Indian GST Rule 45 workflow tracking raw materials at vendor site and receipt of processed items.
* **Adoption Decision for Our ERP:**
  - **HIGH RELEVANCE**. ERPNext's manufacturing flow is clean, battle-tested in thousands of Indian factories, and avoids the extreme overengineering of SAP or MetaFresh.
