# Authority Comparison: Data Ownership & Source of Truth

## 1. Ground Truth Rules ("Who Owns What?")

A primary cause of architectural decay in ERPs is the creation of **competing authorities** (e.g. having two services that both claim to manage stock quantity, or two engines that calculate cost differently).

Below is the authoritative mapping across our ERP, MetaFresh, and ERPNext:

```text
┌───────────────────────────────┬──────────────────────┬───────────────────────┬──────────────────────────────┐
│ Domain Concept                │ Our Target Authority │ MetaFresh Authority   │ ERPNext Authority            │
├───────────────────────────────┼──────────────────────┼───────────────────────┼──────────────────────────────┤
│ Physical Stock Quantity       │ erp_stock_ledger_    │ M_StorageOnHand /     │ tabBin.actual_qty /          │
│                               │ entry & stock cache  │ M_Transaction         │ tabStock Ledger Entry        │
│ Reserved Stock Quantity       │ erp_stock_           │ M_StorageReservation  │ tabBin.reserved_qty          │
│                               │ reservation          │                       │                              │
│ Warehouse / Depot Site        │ erp_depot            │ M_Warehouse           │ tabWarehouse (is_group=0/1)  │
│ Storage Bin / Sub-location    │ erp_depot_bin        │ M_Locator             │ tabWarehouse (Leaf node)     │
│ Inventory Valuation Rate      │ erp_stock_ledger_    │ M_Cost                │ tabStock Ledger Entry.       │
│                               │ entry.valuation_rate │                       │ valuation_rate               │
│ General Ledger Posting        │ erp_gl_journal_      │ Fact_Acct             │ tabGL Entry                  │
│                               │ entry & _line        │                       │                              │
│ Document Lineage              │ erp_document_        │ C_Order_Line_Alloc /  │ Dynamic parent/child doc-    │
│                               │ relationship         │ M_InOut_Line          │ links and fulfillment doctype│
│ GST Statutory Authority       │ GSTTaxCalculation-  │ Custom Tax Rule Engine│ India Compliance /           │
│                               │ Engine.java          │                       │ Regional GST Rule Engine     │
└───────────────────────────────┴──────────────────────┴───────────────────────┴──────────────────────────────┘
```

---

## 2. Preventing Duplicate Authorities in Our Target Architecture

1. **Do NOT Create a Separate "Warehouse Inventory Engine"**:
   - `StockMutationService` must be the **sole gatekeeper** for physical inventory decrements and increments.
   - Whether an inventory transaction comes from a Sales Dispatch, a Goods Receipt Note, a Stock Transfer, or a Manufacturing Job Card, it MUST call the same atomic `StockMutationService.recordMovement()` method.
2. **Do NOT Create a Second Accounting Engine**:
   - Existing General Ledger authority ([`erp_gl_journal_entry`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/GlJournalEntry.java)) is already active and verified in Phase P5/P6.
   - Any COGS postings, WIP absorption, or inventory variance postings MUST write to `erp_gl_journal_entry` and `erp_gl_journal_line`.
3. **Deprecate the Scan-Based Query (`getStockByParam`) Safely**:
   - Keep `getStockByParam` during the transition phase, but redirect its internal implementation to read from the newly introduced, row-locked `erp_material_current_stock` balance backed by `erp_stock_ledger_entry`.
