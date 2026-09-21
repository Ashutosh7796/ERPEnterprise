# Batch 3: MRP & Planning Current-State Audit

## 1. Current Codebase State
* **Automated Demand Planning:** **ZERO**. There is no MRP engine in the codebase.
* **Replenishment Trigger:** Completely manual. Warehouse managers view stock reports (`InOutStockReport.tsx`), check numbers, and manually create Purchase Requisitions (`sub_type='PURCHASE_APPLY'`).
* **Lead Time Tracking:** In [`Material.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Material.java), there is an `expiry_num` (shelf-life), but **no procurement lead time (in days)** or **manufacturing lead time**.
* **Safety Stock / Minimum Reorder Level:** `erp_material_extend` has `low_decimal` (which is a minimum selling price, not a stock level). True safety stock and reorder point fields do not exist on the item master.

---

## 2. Structural Deficiencies of Current Planning
1. **Unconnected Sales Demand**: A sales order for 500 units does not automatically generate procurement requests for the raw materials.
2. **Double-Ordering Risk**: Buyers have no visibility into what is already on order (open POs) versus what is physically on hand.
3. **No Gross-to-Net Explosion**: Even if a BOM exists, there is no engine to calculate:
   $$\text{Gross Requirement} - (\text{Stock On-Hand} + \text{Open POs} + \text{Open Work Orders} - \text{Reservations}) = \text{Net Shortage}$$
