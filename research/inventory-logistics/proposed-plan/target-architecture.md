# Target Architecture: Minimal Sufficient Design

## 1. Design Philosophy: The Karpathy Razor
* **Simplicity First**: Build the minimal sufficient architecture that satisfies physical invariants and statutory compliance.
* **No Speculative Abstractions**: No generic "workflow execution engines", no reactive event brokers (Kafka/RabbitMQ), no microservices. Everything is built natively in Spring Boot 3 + MyBatis + MySQL 8.0 with ACID transaction safety.
* **Single Source of Truth**: One authoritative service for inventory mutations (`StockMutationService`), one authoritative ledger for physical moves (`erp_stock_ledger_entry`), and one authoritative General Ledger (`erp_gl_journal_entry`).

---

## 2. Target Component Diagram

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REACT 19 FRONTEND                                    │
│  - Warehouse & Storage Bins (/inventory/bins)   - Stock Ledger View (/inventory/ledger)│
│  - Multi-Level BOM Editor (/mfg/boms)           - Work Order Manager (/mfg/work-orders)│
│  - Material Issue & FG Receipt (/mfg/execute)   - Job Work Register (/mfg/subcontract) │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST / JSON HTTPS
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SPRING BOOT 3 SERVICES                                  │
│                                                                                        │
│  ┌─────────────────────────────────┐        ┌───────────────────────────────────────┐  │
│  │     Manufacturing Service       │        │        Stock Mutation Service         │  │
│  │  - BomService.java              │───────>│  - StockMutationService.java          │  │
│  │  - WorkOrderService.java        │        │    (Central atomic inventory gate)    │  │
│  │  - JobWorkService.java (Rule 45)│        └───────────────────┬───────────────────┘  │
│  └─────────────────────────────────┘                            │                      │
│                                                                 ▼                      │
│  ┌─────────────────────────────────┐        ┌───────────────────────────────────────┐  │
│  │    Valuation & Cost Engine      │        │       General Ledger Posting Bridge   │  │
│  │  - PerpetualMovingAvgEngine.java│───────>│  - InventoryAccountingPostingService  │  │
│  │  - ManufacturingCostRollup.java │        │    (Dr Inventory/WIP | Cr COGS/AP)    │  │
│  └─────────────────────────────────┘        └───────────────────┬───────────────────┘  │
└─────────────────────────────────────────────────────────────────┼──────────────────────┘
                                                                  │
                                            MyBatis ORM / HikariCP
                                                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MYSQL 8.0 TABLES                                     │
│  - erp_stock_ledger_entry (NEW: Immutable transactional ground truth)                  │
│  - erp_material_current_stock (ENHANCED: Row-locked balance cache)                     │
│  - erp_depot_bin (NEW: 2-Tier warehouse storage bin & WIP location)                   │
│  - erp_bom_head & erp_bom_item (NEW: Multi-level Bill of Materials)                   │
│  - erp_work_order & erp_work_order_item (NEW: Shop-floor production orders)           │
│  - erp_subcontract_challan & _item (NEW: GST Rule 45 job work tracking)               │
│  - erp_gl_journal_entry & _line (EXISTING: Universal double-entry GL)                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Central Invariant: The Universal Mutation Flow

Every physical stock movement in the system MUST pass through the unified `StockMutationService`:

```java
@Transactional(value = "transactionManager", rollbackFor = Exception.class)
public StockLedgerEntry recordMovement(StockMovementRequest req) {
    // 1. Lock current balance row pessimistically
    MaterialCurrentStock balance = materialCurrentStockMapper.selectForUpdate(
        req.getMaterialId(), req.getDepotId(), req.getTenantId());
    
    // 2. Validate negative stock policy
    BigDecimal newQty = balance.getCurrentNumber().add(req.getDeltaQty());
    if (newQty.compareTo(BigDecimal.ZERO) < 0 && !systemConfigService.allowNegativeStock()) {
        throw new BusinessRunTimeException(400, "Insufficient stock for " + req.getMaterialName());
    }

    // 3. Compute new moving average unit price
    BigDecimal newUnitPrice = valuationEngine.calculateNewRate(balance, req);

    // 4. Update balance cache
    balance.setCurrentNumber(newQty);
    balance.setCurrentUnitPrice(newUnitPrice);
    materialCurrentStockMapper.updateByPrimaryKey(balance);

    // 5. Append immutable Stock Ledger Entry
    StockLedgerEntry sle = new StockLedgerEntry();
    sle.setVoucherType(req.getVoucherType());
    sle.setVoucherNo(req.getVoucherNo());
    sle.setActualQty(req.getDeltaQty());
    sle.setQtyAfterTransaction(newQty);
    sle.setValuationRate(newUnitPrice);
    sle.setStockValueDifference(req.getDeltaQty().multiply(newUnitPrice));
    stockLedgerEntryMapper.insert(sle);

    // 6. Trigger GL Posting (if financial movement)
    inventoryAccountingPostingService.postStockMovementToGL(sle);

    return sle;
}
```

This single method guarantees that:
1. Stock can NEVER drift from the ledger.
2. Race conditions are blocked at the database row level.
3. Every movement has a corresponding Point-in-Time valuation and optional GL voucher.
