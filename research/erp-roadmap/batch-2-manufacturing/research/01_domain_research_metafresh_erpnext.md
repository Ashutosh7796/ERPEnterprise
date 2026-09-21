# Domain Research: MetaFresh & ERPNext Manufacturing Reference Architectures
**Topic:** Manufacturing, Production Orders, Work in Progress, BOM, and Subcontracting  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Context:** Indian Enterprise ERP Modernization — Phase 2 (Batch 2)  

---

## 1. Executive Summary

This research document compares the manufacturing architectures of two mature open-source ERP systems: **MetaFresh** (Java/OSGi/ADempiere-derived enterprise ERP) and **ERPNext** (Python/Frappe-based modern ERP). 

The goal of this research is **not** to clone either platform's implementation, but rather to extract:
1. Validated industry domain concepts and data models.
2. Production workflows, shop-floor state machines, and lifecycles.
3. Essential invariants governing material issues, WIP valuation, scrap, and subcontracting.
4. Architectural pitfalls to avoid (e.g. overengineered scheduling engines, monolithic God-services).

---

## 2. MetaFresh Manufacturing Deep-Dive

### 2.1 Domain Overview & Data Model
MetaFresh implements discrete and process manufacturing derived from the ADempiere/Compiere standard with specialized German manufacturing extensions:

| Concept | MetaFresh Entity / Table | Core Purpose | Important Invariants |
| :--- | :--- | :--- | :--- |
| **Product BOM** | `PP_Product_BOM` | Master specification of components needed to manufacture 1 unit of a parent product. | Valid from/to dates, BOM Type (Make, Phantom, Subcontract). |
| **BOM Line** | `PP_Product_BOMLine` | Quantities, component items, scrap percentage, and line numbers. | `QtyBOM > 0`, `ScrapPct >= 0`, circular reference forbidden. |
| **Work Center / Station** | `AD_Workflow` / `AD_WF_Node` | Physical work center, machine resource, or assembly bench. | Standard capacity, hourly labor rate, hourly machine rate. |
| **Routing / Operations** | `PP_Order_Node` | Ordered sequence of manufacturing operations required to complete a work order. | Setup time, run time, preceding/succeeding node linkages. |
| **Manufacturing Order** | `PP_Order` | Authorized production order for a specific product, quantity, warehouse, and due date. | State transitions: Drafted $\rightarrow$ In Progress $\rightarrow$ Completed $\rightarrow$ Closed. |
| **Order Component (BOMLine Snapshot)** | `PP_Order_BOMLine` | Frozen component list for the specific production order. | Prevents in-flight BOM master changes from altering active production runs. |
| **Material Issue** | `M_InOut` (Movement Type `P-`) | Physical transfer of raw materials from stores to shop-floor/WIP. | Decrements stores stock, increments WIP asset value. |
| **Finished Goods Receipt** | `M_InOut` (Movement Type `P+`) | Physical receipt of completed products from WIP into finished goods warehouse. | Decrements WIP value, increments FG stock at accumulated manufacturing cost. |
| **Subcontracting** | `PP_Order_Node` (Subcontracted) | Operation executed by an external contractor. | Generates Subcontract Purchase Order linked to the production order node. |

### 2.2 Workflows & Invariants in MetaFresh
1. **Frozen Order BOM Snapshot:** When a `PP_Order` is released, MetaFresh copies the master `PP_Product_BOMLine` records into `PP_Order_BOMLine`. This ensures that subsequent modifications to the master BOM do not alter historical or in-flight production runs.
2. **Backflush vs Manual Issue:** MetaFresh supports both *Pick-List / Manual Issue* (stores issues components to shop-floor prior to production) and *Backflush* (components are automatically issued and consumed upon finished goods completion). For discrete manufacturing, explicit material issue provides superior traceability.
3. **WIP Accounting Invariant:**
   - On Material Issue:
     $$\text{Debit: Work in Progress (Asset)} \quad | \quad \text{Credit: Raw Material Stores (Asset)}$$
   - On Work Center Execution (Activity Absorption):
     $$\text{Debit: Work in Progress (Asset)} \quad | \quad \text{Credit: Labor / Overhead Absorption (P\&L Clearing)}$$
   - On Finished Goods Receipt:
     $$\text{Debit: Finished Goods Inventory (Asset)} \quad | \quad \text{Credit: Work in Progress (Asset)}$$

---

## 3. ERPNext Manufacturing Deep-Dive

### 3.1 Domain Overview & Data Model
ERPNext organizes manufacturing around a lean, document-driven architecture centered on the `Work Order` and `Stock Entry`:

| Concept | ERPNext DocType | Core Purpose | Important Invariants |
| :--- | :--- | :--- | :--- |
| **Bill of Materials** | `BOM` | Authoritative recipe and costing template for finished goods. | Must be submitted (`docstatus=1`). Can be default for item. |
| **BOM Item** | `BOM Item` | Child items, raw materials, sub-assemblies, scrap items. | Multi-level explosion flag (`is_exploded`), scrap %. |
| **Work Order** | `Work Order` | Production authorization against Sales Order or stock replenishment. | Tracks `qty`, `produced_qty`, `wip_warehouse`, `fg_warehouse`. |
| **Operations & Workstation** | `Workstation`, `Routing`, `Job Card` | Time and activity logging per operation on the shop floor. | Hour rate, electricity cost, consumable cost. |
| **Stock Entry (Manufacturing)** | `Stock Entry` (Type: `Material Transfer for Manufacture`) | Physical transfer of raw materials from stores to WIP warehouse. | Validates raw material stock availability in source warehouse. |
| **Stock Entry (Manufacture)** | `Stock Entry` (Type: `Manufacture`) | Consumes raw materials from WIP, receives finished goods into FG warehouse. | Automatically calculates finished good unit cost based on consumed materials + operating cost. |
| **Subcontracting** | `Subcontracting Order`, `Subcontracting Receipt` | Sends materials to vendor and receives processed parts. | Tracks supplied raw materials lying with subcontractor. |

### 3.2 Workflows & Invariants in ERPNext
1. **Unified Stock Entry Gateway:** In ERPNext, all physical inventory movements (whether purchase, delivery, transfer, or manufacturing) execute through a single document type: `Stock Entry`. This mirrors the architectural principle of Batch 1's `StockMutationService`.
2. **Multi-Level Exploded BOMs:** ERPNext allows a BOM to contain sub-assemblies that also possess BOMs. When exploding a BOM, the system can either treat sub-assemblies as items to be picked from stock or recursively explode down to leaf raw materials.
3. **Dedicated WIP Warehouse:** Instead of treating WIP purely as a financial balancing figure, ERPNext represents WIP physically as a warehouse location (e.g. `Work In Progress - Plant 1`). This provides exact physical quantity and valuation visibility of items currently on the shop floor.
4. **Scrap Allocation:** Raw material scrap items can be defined directly on the BOM or recorded during production completion. Scrap items are received into a designated scrap warehouse at salvage value, which offsets the finished good manufacturing cost:
   $$\text{FG Cost} = \text{Raw Material Cost} + \text{Operating Cost} - \text{Scrap Realizable Value}$$

---

## 4. Cross-System Synthesis & Comparative Evaluation

| Architectural Dimension | MetaFresh Approach | ERPNext Approach | Target Indian ERP Recommendation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **BOM Structure** | Relational `PP_Product_BOM` with separate workflow routing | Unified `BOM` with embedded operations and exploded items | **Dedicated `erp_bom_head` & `erp_bom_item`** with optional routing link | Clean normalization, avoids monolithic bloat, separates bill of materials from operations. |
| **BOM Freezing** | Copies to `PP_Order_BOMLine` on order release | References BOM version with revision hash | **Frozen Work Order Items (`erp_work_order_item`)** | Crucial for auditability; in-flight production runs must not change when an engineer edits a master BOM. |
| **WIP Representation** | Financial locator & account | Physical `wip_warehouse` | **Dedicated WIP Bin (`zone='WIP'`) in plant depot** | Consumes Batch 1 `erp_depot_bin` topology; gives exact physical stock and financial balance without extra warehouse entities. |
| **Inventory Mutation** | Specialized `M_InOut` movement types | Single `Stock Entry` controller | **Batch 1 `StockMutationService.recordMovement()`** | Strictly enforced single mutation authority. Manufacturing creates zero bypasses. |
| **Costing Basis** | Standard costing with variance settlement | Moving average + added operation rate | **Weighted Moving Average + Direct Labor/Overhead Absorption** | Matches Batch 1 valuation authority and Indian AS-2 / Ind AS-2 valuation standards. |
| **Subcontracting** | External workflow node in standard routing | Standalone Subcontracting Order & Receipt | **Indian Job Work Rule 45 / Rule 55 Delivery Challan** | Indian GST statutory requirements dictate formal delivery challans with 1-year input and 3-year capital goods return limits. |

---

## 5. What MUST NOT Be Copied

1. **Finite Capacity APS Scheduling:** MetaFresh and high-end ERPs contain complex finite capacity scheduling engines, constraint programming, and Gantt re-allocators. These add immense operational friction, require dedicated industrial engineers to maintain, and consistently fail in real-world Indian SME manufacturing setups. **Do not build.**
2. **Generic BPMN Workflow Engines:** MetaFresh relies heavily on an internal workflow engine (`AD_Workflow`). For our ERP, an explicit Java finite state machine (`DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED`) is far simpler, 100% testable, and has zero runtime overhead.
3. **Monolithic Stock Controllers:** ERPNext's `Stock Entry` Python class spans thousands of lines of ad-hoc branching. We must maintain strict separation: `WorkOrderService` manages production state, while `StockMutationService` manages physical inventory mutations.
