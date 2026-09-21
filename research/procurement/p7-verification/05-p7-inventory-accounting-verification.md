# 05 - Procurement Phase P7: Inventory Valuation & Restocking Accounting Verification

**Document Ref**: `PROC-P7-VERIF-05`  
**Evaluation Date**: August 2026  
**Status**: **INVENTORY ACCOUNTING & VALUATION VERIFICATION (IND AS 2 COMPLIANT)**  

---

## 1. Inventory Mutation & Single Physical Stock Engine

In accordance with our architecture, all physical stock movements must route through the single canonical inventory engine (`erp_material_current_stock`, `erp_material_extend`, `erp_depot_item`).

```
┌─────────────────────────────────────────────────────────────┐
│               PHYSICAL STOCK MUTATION PATHWAY               │
├──────────────────────────────┬──────────────────────────────┤
│ Transaction Type             │ Head Type: '出库'            │
│ Sub-Type                     │ Sub-Type: '采购退货'         │
│ Table Updated                │ `erp_material_current_stock` │
│ Stock Direction              │ Decrement Current Depot Qty  │
│ Valuation Basis              │ Moving Average Unit Cost     │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Moving Average Cost (MAC) Valuation Mechanics upon Return

Under Ind AS 2 (Inventories) and AS 2:
- When goods are returned to a supplier, inventory is reduced at the **current moving average unit cost** of that SKU in the depot, or at the **original invoice cost**, with any variance routed to Inventory Revaluation / Purchase Price Variance.

### Scenario 2.1: On-Hand Stock Available at Unchanged Cost
- Received 100 units @ ₹100 = ₹10,000.
- Return 20 units. Current MAC = ₹100.
- **Inventory Reduction**: $20 \times 100 = \text{₹2,000}$.
- **New Depot Qty**: $100 - 20 = 80$ units.
- **New Total Value**: ₹8,000. **New MAC**: ₹100.0000.

---

### Scenario 2.2: On-Hand Stock Available, but MAC Shifted (Landed Cost / Subsequent Receipts)
- Received 100 units @ ₹100.
- Landed freight of ₹1,000 added $\to$ MAC shifted to ₹110.00.
- Return 20 units @ original invoice credit of ₹100.
- **Physical Inventory Decrement**: $20 \times \text{₹110 (Current MAC)} = \text{₹2,200}$.
- **Supplier Credit Received**: $20 \times \text{₹100 (Invoice Price)} = \text{₹2,000}$.
- **Variance Handling**: The ₹200 difference is debited to `5105 Inventory Revaluation / PPV Loss on Return` to ensure GL balance matches physical stock valuation.

---

### Scenario 2.3: Goods Already Partially or Fully Consumed / Dispatched
- Received 100 units @ ₹100. 90 units were sold/dispatched to customers.
- Depot on-hand stock is only 10 units.
- User attempts to return 20 units physically.
- **Strict Guard**: System **BLOCKS** the physical return because depot on-hand stock ($10$) is less than requested return quantity ($20$).
- **Commercial Alternative**: If physical goods cannot be returned, the transaction must be processed as a **Commercial Price / Quality Adjustment (Scenario B)**, leaving physical stock at 10 and crediting COGS (`5101`) or PPV (`5105`).

---

## 3. Negative Stock Prevention & Concurrency Controls

### 3.1 Strict Pre-Condition Check
Before issuing any Outward Delivery Challan or decrementing stock:
$$\text{Current On-Hand Qty in Target Depot} \ge \text{Requested Return Qty}$$
If $\text{Current Qty} < \text{Return Qty}$, the transaction throws `BusinessRunTimeException("Insufficient physical stock in depot to execute return")`.

### 3.2 Row-Level Locking (Pessimistic Lock)
To prevent race conditions during concurrent returns, sales dispatches, or transfers:
```sql
SELECT current_number 
FROM erp_material_current_stock 
WHERE material_id = ? AND depot_id = ? AND tenant_id = ? 
FOR UPDATE;
```
Ensures atomic deduction and eliminates the possibility of negative depot stock balances.

---

## 4. Batch & Serial Number Lineage
For batch-controlled or serial-tracked items:
1. Return document captures the exact `batch_number` or serial identifiers originally received in the GRN.
2. Decrements the specific batch ledger in `erp_depot_item` (`batch_number`, `sn_list`).
3. Prevents returning serial numbers that belong to different GRNs or suppliers.
