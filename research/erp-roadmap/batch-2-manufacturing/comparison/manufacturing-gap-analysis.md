# Batch 2: Manufacturing & Production Gap Analysis

| Capability / Area | Our Current ERP Status | MetaFresh Reference | ERPNext Reference | Required? | Priority | Architectural Solution |
|---|:---:|---|---|:---:|:---:|---|
| **BOM Master** | **MISSING** (Ad-hoc manual bills) | `PP_Product_BOM` | `BOM` (Multi-level) | **YES** | **P1** | `erp_bom_head` & `erp_bom_item` with revision code and standard batch qty. |
| **Multi-Level BOM Explosion** | **MISSING** | `PP_Product_BOMLine` (Recursive) | `BOM Item` (Exploded items) | **YES** | **P1** | Indented tree explosion for sub-assemblies. |
| **BOM Revision Control** | **MISSING** | Change Management | BOM Versioning | **YES** | **P2** | Engineering change tracking (`Rev 1.0`, `Rev 1.1`). |
| **Work Centers & Routing** | **MISSING** | `PP_Order_Node` / Routing | `Workstation` & `Operation` | **YES** | **P2** | Minimal workstation definition with standard hourly rate for overhead absorption. |
| **Production Work Orders** | **MISSING** | `PP_Order` | `Work Order` | **YES** | **P1** | Formal work orders authorizing production against Sales Orders or stock. |
| **Material Issue to WIP** | **MISSING** | Internal InOut Issue | Stock Entry (Transfer to WIP) | **YES** | **P1** | Calls Batch 1 `StockMutationService` to move RM to WIP bin (`Dr WIP | Cr Stores`). |
| **WIP Inventory Tracking** | **MISSING** | WIP Account & Locator | WIP Warehouse | **YES** | **P1** | Shop-floor WIP bin holding value until completion. |
| **Finished Goods Receipt** | **PARTIAL** (Assembly bill flat sum) | FG Receipt + PP Cost | Stock Entry (Manufacture) | **YES** | **P1** | Receives FG, clears WIP, absorbs overhead (`Dr FG | Cr WIP | Cr Absorption`). |
| **Scrap / Yield Loss** | **MISSING** | Scrap logging | Scrap item in BOM & WO | **YES** | **P1** | Component scrap % factor and actual scrap quantity logging. |
| **Job Work (Rule 45 Challan)** | **MISSING** | Subcontract PO | Subcontracting Order | **YES** | **P1** | Mandatory Indian GST Rule 45 delivery challan with 365-day statutory return limit. |
| **By-Product / Co-Product** | **MISSING** | By-product allocation | Co-product lines | **NO** | **P4** | Deferred as speculative for initial discrete manufacturing. |
| **Finite Capacity Scheduling** | **MISSING** | Advanced Planning (APS) | Gantt chart / Capacity planning | **NO** | **P4** | Explicitly rejected to prevent overengineering. |
