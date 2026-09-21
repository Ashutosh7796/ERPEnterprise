# 11 - Implementation Reference Comparison: metasfresh

**Document Ref**: `PROC-P5-P7-REF-METASFRESH-11`  
**Evaluation Date**: August 2026  
**Status**: **SOURCE-VERIFIED ARCHITECTURAL COMPARISON**  

---

## 1. Verified Source Repositories & Modules Inspected

- **Repository**: `https://github.com/metasfresh/metasfresh`
- **Inspected Modules & Packages**:
  1. `de.metas.procurement`: Procurement workflow and material receipts.
  2. `org.adempiere.warehouse`: Material movement, inventory valuation, cost price recalculation.
  3. `de.metas.acct`: Landed Cost Allocation (`C_LandedCostAllocation`), Unbilled Material Receipts (`Unbilled Material Receipts Clearing Account`), and Invoice Price Variance (`IPV`).

---

## 2. Technical Comparison & Architectural Findings

### 2.1 Landed Cost Allocation Architecture

In metasfresh, the Landed Cost Allocation engine (`de.metas.acct.landedcost`) distributes freight, handling, and duty to material receipts:
- **Allocation Rules**:
  - `AllocationStrategy = AMOUNT` (Value-based distribution)
  - `AllocationStrategy = WEIGHT` (Net weight distribution)
  - `AllocationStrategy = VOLUME / QTY` (Volume or piece count distribution)
- **Cost Allocation Posting**:
  - Updates the Cost Layer (`M_Cost`) for the specific inventory batch/material.
  - Generates journal entries debiting `Product Asset` and crediting `Landed Cost Clearing`.

* **Enterprise P5 Alignment**:
  - Our P5 design directly mirrors the metasfresh cost allocation strategy, dynamically adjusting the moving average cost price in `erp_material_current_stock` while keeping a transparent audit ledger in `erp_gl_journal_entry`.

### 2.2 Unbilled Receipts (GRNI) & 3-Way Match Reconciler

- **metasfresh Workflow**:
  - Material Receipt (`M_InOut`) posts to `Unbilled Material Receipts`.
  - Vendor Invoice (`C_Invoice`) matches against `M_InOutLine`.
  - If invoice price differs from receipt purchase price:
    - In standard costing: Posts delta to `Invoice Price Variance (IPV)`.
    - In moving average costing: Recalculates moving average on remaining on-hand quantity.
- **Enterprise P5 Alignment**:
  - Matches metasfresh's 3-way matching and moving average adjustment architecture.
