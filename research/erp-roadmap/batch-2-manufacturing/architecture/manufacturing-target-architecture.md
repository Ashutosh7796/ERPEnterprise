# Batch 2: Manufacturing Target Architecture

## 1. Core Manufacturing Invariant: Consuming Batch 1 Authority

> [!IMPORTANT]
> **Fundamental Architectural Rule:** Manufacturing must NEVER directly modify stock tables (`erp_material_current_stock` or `erp_stock_ledger_entry`).
> ALL physical movements (Material Issue to WIP, Scrap, Finished Goods Receipt) MUST execute through Batch 1's `StockMutationService.recordMovement()`.

---

## 2. The 2-Step Shop-Floor Production Flow

```text
1. SALES DEMAND OR MINIMUM REORDER
   └─► Creates Work Order (erp_work_order, status='RELEASED')
       Soft-reserves raw materials in erp_stock_reservation

2. STEP 1: MATERIAL ISSUE NOTE (Stores -> WIP)
   └─► Foreman dispatches raw materials from Raw Material Stores to Shop-Floor WIP Bin
       Calls: StockMutationService.recordMovement(RM, Stores, -Qty)
       Calls: StockMutationService.recordMovement(RM, WIP_Bin, +Qty)
       Financial Voucher: Dr Work-in-Progress (Asset) | Cr Raw Material Stores (Asset)

3. SHOP-FLOOR PROCESSING
   └─► Machining / Assembly occurs at Workstation
       Optional: Subcontracting step (Sent to Job Worker under Rule 45 Delivery Challan)

4. STEP 2: FINISHED GOODS RECEIPT & SCRAP LOGGING
   └─► Production completes:
       Calls: StockMutationService.recordMovement(RM, WIP_Bin, -ConsumedQty)
       Calls: StockMutationService.recordMovement(FG, FG_Depot, +ReceivedQty)
       Records: Actual Scrap Qty in erp_work_order_scrap
       Calculates Finished Good Cost:
           FG Unit Cost = (Raw Material Consumed Cost + Labor Overhead) / Completed Qty
       Financial Voucher:
           Dr Finished Goods Inventory Asset Account
           Cr Work-in-Progress (Asset Account)
           Cr Labor / Factory Overhead Absorption Clearing Account
```

---

## 3. Subcontracting / Job Work Architecture (Indian GST Section 143 & Rule 45)

```text
Work Order / Subcontracting Order
        │
        ▼
Rule 45 Delivery Challan Generator (Triplicate format, consecutive FY sequence)
        │
        ├── Moves RM from Stores to "JOB-WORKER-TRANSIT" virtual bin
        └── Records statutory tracking: Outward Date, HSN, Tax Rate, Job Worker GSTIN
                │
                ▼
1-Year Statutory Aging Ledger (Section 143(1) monitoring)
        ├── Automated warning dashboard at 270 days (9 months)
        └── At 365 days: Deemed supply warning (triggers tax invoice requirement if not returned)
                │
                ▼
Subcontracting Inward Receipt
        ├── Inward receipt of processed part into WIP / FG Stores
        ├── Scrap reconciliation
        └── Form GST ITC-04 JSON statement generation
```
