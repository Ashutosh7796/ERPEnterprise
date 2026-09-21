# Implementation Phases: Dependency-Ordered Roadmap

## Phase 1: Core Inventory & Immutable Stock Ledger (P0 Foundation)
* **Objective:** Eliminate the O(N) scan-based stock calculation and introduce deterministic, row-locked inventory mutations with automated COGS posting.
* **Backend Deliverables:**
  - `erp_stock_ledger_entry` schema & mapper (`item_id`, `depot_id`, `bin_id`, `voucher_type`, `voucher_no`, `actual_qty`, `qty_after_transaction`, `valuation_rate`, `stock_value_diff`).
  - `StockMutationService.java` as the sole gatekeeper for physical inventory writes.
  - Refactor `DepotItemService.updateCurrentStock()` to call `StockMutationService`.
  - Wire [`SalesAccountingPostingService.postDeliveryDispatchToCOGS()`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java#L205) into sales dispatch completion (`sub_type='出库'`).
* **Frontend Deliverables:**
  - Stock Ledger View (`/inventory/ledger`): Chronological statement of stock movements with running balances.

---

## Phase 2: 2-Tier Warehouse & Storage Bins (P1 Logistics)
* **Objective:** Allow depots to define physical storage bins (racks, shelves) and virtual WIP/Quarantine locations without overengineering.
* **Backend Deliverables:**
  - `erp_depot_bin` schema (`id`, `tenant_id`, `depot_id`, `bin_code`, `bin_name`, `bin_type` ['STORAGE', 'WIP', 'QUARANTINE', 'TRANSIT'], `is_default`).
  - Auto-bootstrap default bins for existing depots (`MAIN-STORAGE`, `SHOP-FLOOR-WIP`).
  - Extend `erp_depot_item` with optional `bin_id`.
* **Frontend Deliverables:**
  - Storage Bin Management Modal inside [`DepotList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/DepotList.tsx).

---

## Phase 3: Multi-Level BOM & Discrete Manufacturing (P1 Plan-to-Produce)
* **Objective:** Replace legacy Chinese assembly bills with industrial-grade Multi-Level Bill of Materials and Work Orders.
* **Backend Deliverables:**
  - `erp_bom_head` & `erp_bom_item` schemas (`bom_number`, `material_id`, `revision`, `yield_pct`, `is_active`, component items with scrap %).
  - `erp_work_order` schema (`wo_number`, `sales_order_id`, `material_id`, `planned_qty`, `wip_bin_id`, `status` ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).
  - Material Issue Action: Moves raw materials from Stores Bin to WIP Bin (`Dr WIP Inventory | Cr Stores Inventory`).
  - Finished Goods Receipt Action: Consumes raw materials from WIP Bin, increases Finished Good in FG Bin, logs Scrap, and rolls up manufacturing cost.
* **Frontend Deliverables:**
  - Multi-Level BOM Editor (`/manufacturing/boms`).
  - Work Order Execution Workspace (`/manufacturing/work-orders`).

---

## Phase 4: Indian Job Work (Rule 45) & Lightweight MRP (P2 Compliance & Planning)
* **Objective:** Comply with Indian GST Section 143 job work delivery challans, 1-year input aging, and gross-to-net demand explosion.
* **Backend Deliverables:**
  - `erp_subcontract_challan` & `_item` schemas (Rule 45 format, HSN, tax rate, job worker GSTIN, outward dispatch date, due date [1 year]).
  - 1-Year Job Work Aging Ledger with Form GST ITC-04 JSON export.
  - Deterministic Gross-to-Net Demand Explosion Service (`MRPEngineService.java`):
    $$\text{Shortage} = (\text{Open Sales Orders} + \text{Safety Stock}) - (\text{On-Hand} + \text{Open POs} + \text{Open Work Orders})$$
    Auto-generates Purchase Requisitions for raw materials and Work Orders for sub-assemblies.
* **Frontend Deliverables:**
  - Job Work & Subcontracting Workspace (`/manufacturing/subcontracting`).
  - MRP Recommendation Board (`/manufacturing/mrp`).
