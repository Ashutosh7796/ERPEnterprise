# Test Strategy: Multi-Tier Verification Matrix

## 1. Test Philosophy: Real Invariant Verification
Following Karpathy guidelines, tests must prove actual business invariants, not merely assert non-null objects:
* **No Speculative Mocking**: Concurrency and transactional rollbacks MUST be tested against a real running database (MySQL 8.0).
* **Multi-Tenant Leakage Verification**: Every test must verify that Tenant A cannot read, mutate, or reserve inventory belonging to Tenant B.
* **Double-Entry Balance Check**: For every stock movement that impacts financials, verify:
  $$\sum \text{Debits} = \sum \text{Credits}$$

---

## 2. Test Suite Architecture

| Test Suite | Class Name | Target Invariant Verified | Method |
|---|---|---|---|
| **Stock Ledger Immutability** | `StockLedgerEnterpriseTest.java` | Verify that each movement appends an immutable row and updates `qty_after_transaction` monotonically. | Integration Test |
| **Pessimistic Row Lock & Concurrency** | `StockConcurrencyStressTest.java` | 10 concurrent threads attempt to deduct 2 units from an item with stock = 10. Exactly 5 must succeed; 5 must fail with insufficient stock error. Zero negative stock. | Multi-threaded DB Test |
| **COGS GL Posting** | `SalesCogsPostingIntegrationTest.java` | Outbound sales dispatch creates `Dr COGS | Cr Finished Goods Asset` matching `Delivered Qty * Moving Avg Rate`. | Spring Boot Integration Test |
| **BOM Explosion & Work Order** | `ManufacturingWorkflowTest.java` | Work order creation $\rightarrow$ Material Issue to WIP $\rightarrow$ Finished Goods Receipt. Verifies RM deducted from stores, WIP cleared, FG increased, scrap recorded. | Integration Test |
| **Job Work Rule 45 Aging** | `JobWorkChallanStatutoryTest.java` | Rule 45 challan generation $\rightarrow$ 365-day statutory time limit calculation $\rightarrow$ Warning alert at 270 days. | Unit & Integration Test |
| **Multi-Tenant Isolation** | `InventoryTenantIsolationTest.java` | Cross-tenant reservation attempt throws 403 Forbidden; cross-tenant stock query returns 0. | Security & Tenant Test |
