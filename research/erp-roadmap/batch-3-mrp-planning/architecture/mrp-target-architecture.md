# Batch 3: MRP & Planning Target Architecture

## 1. Deterministic Gross-to-Net Engine (The Karpathy Razor)

> [!IMPORTANT]
> **Core Principle:** MRP must be **100% DETERMINISTIC**.
> No AI/ML forecasting, no stochastic heuristics, no genetic algorithms. Given the identical demand, inventory, open orders, and BOMs, the MRP calculation must yield the exact same requirements every single execution.

---

## 2. Mathematical Formulation of Net Shortage

For each material $i$ at depot $d$:

$$\text{Gross Demand}(i) = \sum \text{Unfulfilled Sales Orders}(i) + \sum \text{Work Order BOM Component Requirements}(i) + \text{Safety Stock}(i)$$

$$\text{Available Supply}(i) = \text{Physical On-Hand}(i) + \sum \text{Open PO Received Pending}(i) + \sum \text{Open Work Order Output}(i) - \text{Active Reservations}(i)$$

$$\text{Net Shortage}(i) = \max(0, \text{Gross Demand}(i) - \text{Available Supply}(i))$$

$$\text{Recommended Order Qty}(i) = \text{RoundUpToMOQ}(\text{Net Shortage}(i), \text{Minimum Order Qty}(i))$$

$$\text{Required Delivery Date} = \text{Demand Required Date} - \text{Lead Time Days}(i)$$

---

## 3. Automated Output Generation

```text
MRPEngineService.runPlanningCycle(tenantId)
        │
        ├── Evaluates all active Items & Bins
        ├── Recursively explodes Multi-Level BOMs (Finished Goods -> Sub-assemblies -> Raw Materials)
        └── Net Shortage Calculation
                │
                ├── If Item is "BUY" (Raw Material / Packaging):
                │     Auto-creates DRAFT Purchase Requisition (erp_depot_head, sub_type='PURCHASE_APPLY')
                │     with suggested Vendor, Qty, and Target Required Date.
                │
                └── If Item is "MAKE" (Sub-Assembly / Finished Good):
                      Auto-creates DRAFT Work Order (erp_work_order, status='DRAFT')
                      with Planned Start Date = Required Date - Manufacturing Lead Time.
```

* **Auditability:** Every generated PR and WO links back to the originating Sales Order or Safety Stock rule via `erp_document_relationship`, providing complete lineage from forecast/order to shop floor.
