# Manufacturing Prerequisites: 20-Point Technical Evaluation

## 1. The Manufacturing Flow Invariant

To manufacture a physical product in an ERP, the system must execute this chain of custody:

$$\text{Raw Material (Stores)} \xrightarrow{\text{Reservation}} \text{Job Issue} \xrightarrow{\text{Physical Move}} \text{WIP Location} \xrightarrow{\text{Processing}} \text{Finished Good (FG Stores)} + \text{Scrap}$$

Each link in this chain requires an underlying inventory and accounting capability.

---

## 2. 20-Point Technical Readiness Matrix

| # | Manufacturing Prerequisite | Required For | Current ERP Status | Assessment & Gap Details |
|---|---|---|:---:|---|
| **1** | **Immutable Stock Ledger** | Accurate inventory balance & point-in-time audit | **MISSING** | System calculates stock via live table scans; cannot provide historical WIP or RM snapshot. |
| **2** | **Row-Locked Stock Balance** | Preventing negative stock during high-speed job issues | **PARTIAL** | Cache exists in `erp_material_current_stock`, but lacks pessimistic `FOR UPDATE` locks. |
| **3** | **Inventory Mutation Authority** | Single service executing all stock writes | **PARTIAL** | Fragmented across `DepotItemService` and `DepotHeadService`. |
| **4** | **Inventory Valuation Authority** | Rolling up raw material costs into finished goods | **PARTIAL** | Landed cost exists for purchasing, but manufacturing cost absorption is missing. |
| **5** | **Warehouse / Depot Master** | Physical factory sites | **COMPLETE** | Supported via [`erp_depot`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Depot.java). |
| **6** | **Bin / Sub-Location Master** | Shop-floor storage bins and staging areas | **MISSING** | Flat depot model cannot isolate raw material racks from shop-floor stations. |
| **7** | **Unit of Measure (UOM) Engine** | Converting purchase UOM (e.g. Kg) to manufacturing UOM (e.g. Grams) | **COMPLETE** | Supported via [`erp_unit`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/Unit.java) with multi-tier ratios. |
| **8** | **Batch / Heat Number Tracking** | Traceability of raw materials into finished batches | **PARTIAL** | Supported on document lines (`batch_number`), but lacks forward/backward lineage tree. |
| **9** | **Serial Number Tracking** | Unique serialization of serialized equipment | **COMPLETE** | Implemented via [`SerialNumberService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SerialNumberService.java). |
| **10**| **Stock Reservation Engine** | Reserving raw materials for scheduled production | **PARTIAL** | Complete for Sales Orders; needs extension to Work Orders. |
| **11**| **Work-in-Progress (WIP) Location**| Holding inventory value while under production | **MISSING** | No virtual or physical WIP location; raw materials vanish upon assembly save. |
| **12**| **Material Issue Mechanism** | Moving raw materials from Stores to Shop Floor | **MISSING** | No dedicated pick list or shop-floor issue voucher. |
| **13**| **Finished Goods Receipt** | Increasing finished good stock upon job completion | **PARTIAL** | Present in legacy Chinese assembly bill, but lacks job order reference. |
| **14**| **Scrap / Yield Loss Logging** | Recording cut loss, swarf, and rejected output | **MISSING** | No scrap field or scrap accounting. |
| **15**| **By-Product / Co-Product Capture** | Secondary items produced during chemical/metal processing | **NOT REQUIRED YET** | Speculative for initial discrete manufacturing phase. |
| **16**| **Manufacturing Cost Roll-Up** | Combining RM cost + Labor + Electricity into FG | **MISSING** | No absorption costing mechanism. |
| **17**| **Inventory $\rightarrow$ GL Bridge** | Automatic double-entry posting of WIP & FG | **PARTIAL** | GL exists in `erp_gl_journal_entry`, but manufacturing voucher types are not wired. |
| **18**| **Concurrency Row Locks** | Safe simultaneous material issues by multiple foremen | **MISSING** | Prone to race conditions on shared components. |
| **19**| **Document Lineage Authority** | Tracing Sales Order $\rightarrow$ Work Order $\rightarrow$ Job Issue $\rightarrow$ FG Receipt | **COMPLETE** | Supported via [`erp_document_relationship`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentRelationshipService.java). |
| **20**| **Multi-Tenant Scoping** | Isolating bill of materials and job cards by tenant | **COMPLETE** | Clean tenant isolation standard enforced across all tables. |
