# MetaFresh Reference Architecture Analysis

## 1. Executive Summary
MetaFresh (`metasfresh/metasfresh`) is a mature European enterprise Java open-source ERP derived from the Compiere/ADempiere lineage. It represents the global benchmark for enterprise material management (`M_InOut`), multi-dimensional inventory valuation, and strict double-entry accounting (`Fact_Acct`).

---

## 2. Core MetaFresh Inventory & Warehouse Concepts

### 2.1 Warehouse & Locator Hierarchy
* **Repository Path:** `de.metas.adempiere.adempiere.base/src/main/java/org/compiere/model/`
* **Data Model:**
  - `M_Warehouse`: The physical building / depot.
  - `M_Locator`: The addressable storage bin within the warehouse. Every stock record is bound to `M_Locator_ID` (with X, Y, Z coordinates and warehouse priority).
* **Storage Invariant:**
  - `M_StorageOnHand`: Current physical quantity at `(M_Product_ID, M_Locator_ID, M_AttributeSetInstance_ID)`.
  - `M_StorageReservation`: Reserved quantity by sales order lines.
* **Relevant Concept for Our ERP:**
  - MetaFresh's separation of Warehouse (site) and Locator (bin) is clean. However, its X/Y/Z coordinate locator model is too heavy for mid-market manufacturing. A simpler named Bin Location (e.g. `RM-01`, `WIP-SHOPFLOOR`) is much more practical.

### 2.2 Material Transactions & Stock Ledger
* **Core Table:** `M_Transaction`
* **Mechanism:**
  - Every physical movement (Customer Shipment, Vendor Receipt, Internal Movement, Physical Inventory Adjustment) creates an immutable `M_Transaction` row:
    - `M_Transaction_ID`
    - `MovementType` (V+, V-, C+, C-, M+, M-, I+, I-, W+, W-)
    - `M_Locator_ID`
    - `M_Product_ID`
    - `MovementDate`
    - `MovementQty` (Positive for inbound, negative for outbound)
* **Transaction Invariant:**
  - `M_Transaction` is written inside the same ACID database transaction as the document posting (`M_InOut` or `M_Movement`).
  - Stock is never calculated by summing all invoice lines; it is calculated from `M_StorageOnHand` and audited by `M_Transaction`.
* **Adoption Decision for Our ERP:**
  - **ADOPT**. An immutable transaction ledger (named `erp_stock_ledger_entry`) is essential to eliminate our O(N) aggregate table scan.

### 2.3 Valuation & Costing Engine
* **Core Table:** `M_Cost`
* **Mechanism:**
  - MetaFresh supports multiple Cost Types (`AveragePO`, `AverageInvoice`, `StandardCosting`, `Lifo`, `Fifo`).
  - It maintains cost elements: `Material`, `Labor`, `Overhead`, `Subcontracting`.
  - Every outbound shipment reads `M_Cost.CurrentCostPrice` and posts:
    $$\text{Dr Cost of Goods Sold (COGS)} \quad | \quad \text{Cr Inventory Asset}$$
* **Adoption Decision for Our ERP:**
  - **PARTIAL ADOPTION**. We should adopt the automated posting of COGS upon dispatch using Moving Average Cost. We should **REJECT** multi-costing schema bloat (LIFO/Standard/Multi-Element), as Moving Average with Landed Cost fully satisfies Indian AS-2 and Ind AS 2.

### 2.4 Manufacturing in MetaFresh
* **Core Tables:** `PP_Product_BOM`, `PP_Order`, `PP_Order_Node`, `PP_Order_Cost`.
* **Model:**
  - Follows ISA-88 / ISA-95 standards with complex bill of materials, work centers, routing operations, and WIP accounts.
* **Adoption Decision for Our ERP:**
  - **REJECT THE FULL COMPLEXITY**. MetaFresh's manufacturing framework requires dozens of tables for finite scheduling, plant calendars, and operation dispatchers. We should adopt only the core business workflow: **BOM $\rightarrow$ Work Order $\rightarrow$ Material Issue to WIP $\rightarrow$ Finished Goods Receipt**.
