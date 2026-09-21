# 02 — Warehouse & Logistics Map: Current-State Audit

## 1. Current Warehouse / Depot Model

### 1.1 Database Structure (`erp_depot`)
The current warehouse data model in [`Depot.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Depot.java) is completely flat:

```sql
CREATE TABLE `erp_depot` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(20) DEFAULT NULL,
  `address` varchar(50) DEFAULT NULL,
  `warehousing` decimal(24,6) DEFAULT NULL,
  `truckage` decimal(24,6) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `sort` varchar(10) DEFAULT NULL,
  `remark` varchar(100) DEFAULT NULL,
  `principal` bigint(20) DEFAULT NULL,
  `enabled` bit(1) DEFAULT NULL,
  `tenant_id` bigint(20) DEFAULT NULL,
  `delete_Flag` varchar(1) DEFAULT '0',
  `is_default` bit(1) DEFAULT NULL
);
```

### 1.2 Hierarchy Evaluation
* **Depot / Warehouse Level**: Complete (`erp_depot`). Represents a physical site or factory depot.
* **Zone / Location Level**: **MISSING**. There is no zone or area table.
* **Aisle / Rack / Shelf / Bin Level**: **MISSING**. There are no bin locators.
* **Product Position**: In [`erp_material`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Material.java), there is an unindexed text column `position varchar(100)` where a user can type freeform text (e.g. "Rack-A-Row-2"), but this is purely descriptive and cannot enforce location-level stock balances or bin capacity.

---

## 2. Logistics & Outbound Fulfillment Flow

### 2.1 Current Fulfillment Pipeline
The document lineage from Sales to Shipping currently runs as follows:

```text
Quotation (erp_quotation)
    ↓
Sales Order (erp_depot_head, sub_type='SALES_ORDER')
    ↓ [Fulfillment & Line Allocation via StockReservationService]
Outbound Delivery / Dispatch (erp_depot_head, sub_type='SALES_DISPATCH' / '出库')
    ↓ [Commercial & Statutory Accounting]
GST Tax Invoice (erp_gst_sales_invoice)
```

### 2.2 Logistics Gaps & Capabilities

| Capability | Current State | Class / Location | Evaluated Need |
|---|:---:|---|---|
| **Pick List / Picking Slip** | **MISSING** | None. Operators dispatch directly against Sales Order without warehouse pick wave. | Medium (Useful for discrete items) |
| **Packing Slip** | **MISSING** | No dedicated package/carton tracking. | Low (Not critical for basic dispatch) |
| **Outward Delivery Challan** | **PARTIAL** | Implemented for Purchase Returns via [`DeliveryChallanService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DeliveryChallanService.java) and printable in [`DeliveryChallanPrint.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/DeliveryChallanPrint.tsx). | Complete for returns; needs unification with standard sales dispatches. |
| **Transporter & Vehicle Tracking** | **COMPLETE** | Stored in `erp_delivery_challan` and `erp_eway_bill_record`. Tracks Vehicle No, Transporter ID, Transporter Name, Distance in KM. | Stable |
| **E-Way Bill Integration (Rule 138)** | **COMPLETE** | Handled by [`GstEwayBillValidityService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstEwayBillValidityService.java). Computes auto-validity distance (1 day per 200 km). | Stable |
| **Inter-Depot Stock Transfer** | **COMPLETE** | In [`DepotHeadService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotHeadService.java) (`sub_type='调拨'`). Moves quantity from `depot_id` to `another_depot_id`. | Functional, but lacks In-Transit Goods tracking between distant depots. |

---

## 3. Findings on Overengineering vs Business Need
* **5-Tier WMS Coordinate System (Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin)**: **REJECTED AS OVERENGINEERED**.
  - For Indian discrete manufacturers and distributors in the ₹10 Cr – ₹500 Cr revenue band, forcing warehouse workers to record 5-level coordinates during every material movement slows down shop-floor throughput.
* **Sufficient Model**: A 2-tier model: **`Depot / Warehouse` $\rightarrow$ `Bin / Storage Location`** (e.g. `RM-STORE-01`, `FG-BAY-03`, `SHOP-FLOOR-WIP`) satisfies all traceability, inventory control, and audit requirements without adding bureaucratic friction.
