# 05 — Concurrency Map: Current-State Audit

## 1. Concurrency Risks in Inventory Operations

Inventory mutations are highly sensitive to race conditions. When multiple users or threads transact against the same item concurrently, the following risks exist:

1. **Lost Updates**: Two transactions read stock = 10; both deduct 4; both write back stock = 6 (instead of 2).
2. **Overselling / Negative Stock Race**: Two sales orders check stock = 5; both approve 4; available stock plunges to -3.
3. **Valuation Race**: Two purchase receipts insert lines at different unit prices at the same millisecond; moving average unit price calculations overwrite each other with stale sums.
4. **Double Consumption**: Two dispatches claim the same reserved batch or serial number.

---

## 2. Audit of Existing Concurrency Controls

| Component / Operation | Concurrency Pattern Used | Source Code Location | Effectiveness |
|---|---|---|:---:|
| **Stock Reservation** | Optimistic Locking with CAS (`version`) | [`StockReservationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockReservationService.java#L145) | **High** |
| **Sales Order Approval** | `@Transactional` + Pre-flight balance check | [`SalesOrderApprovalService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesOrderApprovalService.java) | **Medium** (No pessimistic DB row lock) |
| **General Depot Item Save** | `@Transactional` without row locks | [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L78) | **Low / Vulnerable** |
| **Serial Number Allocation** | `is_sell` status check in single transaction | [`SerialNumberService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SerialNumberService.java) | **Medium** |
| **Current Stock Cache Update** | `updateCurrentStockFun` using simple UPDATE | [`DepotItemService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1256) | **Vulnerable to stale overwrite** |

---

## 3. Detailed Trace of `DepotItemService` Mutation

When a user saves a depot bill (e.g. Inbound Receipt or Outbound Dispatch):
```text
Client Request
    ↓
DepotHeadController.addDepotHeadAndDetail()
    ↓
DepotHeadService.saveDepotHeadAndDetail() [@Transactional]
    ↓
For each line item:
    Insert into erp_depot_item (NO LOCK on material or depot)
    ↓
Call DepotItemService.updateCurrentStock(depotItem)
    ↓
Read all historical records: getStockByParam(dId, mId)
    ↓
Write erp_material_current_stock.current_number = calculatedSum
```

### The Inherent Race Condition:
Because `getStockByParam` runs an uncommitted aggregate query without `SELECT ... FOR UPDATE` on a single material row, two concurrent transactions mutating the same material simultaneously will both read overlapping sums and write back conflicting `current_number` values.

---

## 4. Minimum Correct Concurrency Control
To prevent overselling and race conditions without introducing distributed lock complexity:
* **Adopt Atomic Database Row-Level Locking**:
  Whenever mutating inventory for `material_id` at `depot_id`, execute:
  ```sql
  SELECT current_number FROM erp_material_current_stock 
  WHERE material_id = ? AND depot_id = ? FOR UPDATE;
  ```
  This serializes concurrent transactions for that specific item at the database row level, completely preventing lost updates and negative stock spikes under high load.
