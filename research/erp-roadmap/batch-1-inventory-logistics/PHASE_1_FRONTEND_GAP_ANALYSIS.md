# Phase 1 Frontend Audit & Gap Analysis
## Inventory Foundation, Warehouse Bins, Stock Ledger & Logistics UI
**Project:** Indian Enterprise ERP Modernization  
**Repository:** `jshERP-master` / `Ashutosh7796/ERPEnterprise`  
**Focus:** Full-Stack Alignment: Phase 1 Backend Authorities vs Existing React Frontend (`ERPSystem-web-react`)  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Status:** **AUDITED — PENDING HUMAN REVIEW & APPROVAL**  

---

## 1. Executive Summary

Phase 1 established an enterprise-grade backend foundation: an authoritative physical inventory mutation service ([`StockMutationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockMutationService.java)), an immutable running stock ledger (`erp_stock_ledger_entry`), storage location bin topology (`erp_depot_bin`), deterministic multi-key locking, moving-average valuation, perpetual COGS double-entry GL posting, and fail-closed opening balance reconciliation.

However, a comprehensive audit of the React frontend ([`ERPSystem-web-react`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react)) reveals a **critical full-stack disconnection**:
1. **Key Backend Capabilities Are Invisible to Users:** The immutable running stock ledger (`erp_stock_ledger_entry`) and storage location bins (`erp_depot_bin`) have **zero corresponding UI pages, routes, or navigation items**.
2. **Frontend Queries Legacy Unversioned Endpoints:** The Stock Valuation report ([`StockReport.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/report/pages/StockReport.tsx)) continues to query the legacy `/depotItem/findDetailByDepotIdsAndMaterialId` endpoint instead of the authoritative `erp_stock_ledger_entry`, hiding running balances, incoming rates, and valuation deltas from users.
3. **Broken Assembly UI in React:** [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx) routes to generic `BillModal.tsx`, which omits the `material_type` column entirely, rendering kit assembly unusable in the React UI.
4. **Physical Stocktake & Cycle Counting Missing:** No cycle counting interface exists; users are forced to create arbitrary "Other Inbound" or "Other Outbound" bills without variance controls.

---

## 2. Comprehensive Capability-by-Capability Audit

The following matrix audits every Phase 1 backend capability against the React frontend:

| # | Backend Capability | Existing Frontend UI | Existing Route | API Client / Endpoint | Permission Enforced | Gap Description | Severity | Required Architectural Fix |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :-: | :--- |
| **1** | **Authoritative Stock Ledger** (`erp_stock_ledger_entry`) | **NONE** | **NONE** | **NONE** (No controller exists) | None | Zero visibility of running balances, incoming rates, valuation rates, and stock value deltas. | **P0** | 1. Implement `StockLedgerController.java` (`GET /stockLedger/list`).<br>2. Create `StockLedgerListPage.tsx`.<br>3. Add route `/inventory/stock_ledger` and sidebar menu item. |
| **2** | **Warehouse Bin Topology** (`erp_depot_bin`) | **NONE** | **NONE** | **NONE** (No controller exists) | None | `DepotList.tsx` only edits `erp_depot`. Bins (aisle, rack, shelf, bin) and zones (`WIP`, `FG`, `RAW_MATERIAL`) cannot be created or viewed. | **P1** | 1. Implement `DepotBinController.java` (`/depotBin/list`, `/depotBin/add`).<br>2. Add "Manage Bins" drawer in `DepotList.tsx`. |
| **3** | **Stock Flow & Movement History** | Partial modal in `StockReport.tsx` | `/report/stock` | `/depotItem/findDetailByDepotIdsAndMaterialId` | Read-only | Modal queries legacy unindexed `depot_item` list; does not display running balance or valuation change. | **P1** | Switch Stock Flow modal in `StockReport.tsx` to consume `/stockLedger/list?materialId={id}`. |
| **4** | **Available-to-Promise (ATP) & Reservations** | None | None | None | None | Users only see aggregate `currentStock`. Reserved stock in pending sales orders is invisible. | **P1** | Expose `Reserved Qty` and `Available Qty (ATP)` columns in `StockReport.tsx`. |
| **5** | **Physical Stocktake / Cycle Counting** | **NONE** | **NONE** | None | None | No cycle counting UI. Discrepancies cannot be audited against book stock. | **P1** | Create `StocktakeListPage.tsx` with Book Qty vs Physical Count variance calculation. |
| **6** | **Kit Assembly Bills (`组装单`)** | `SpecialBillList.tsx` | `/inventory/assemble` | `/depotHead/addDepotHeadAndDetail` | Generic Bill | `BillModal.tsx` omits `material_type`, making it impossible to distinguish parent from components. | **P1** | Expose `material_type` in `BillModal.tsx` as an interim fix, superseded by Phase 2 Work Orders. |
| **7** | **Stock Transfers (Inter-Depot)** | `StockTransferList.tsx` | `/inventory/transfers` | `/depotHead/addDepotHeadAndDetail` | Generic Bill | Lacks source/target bin selection and real-time stock sufficiency pre-check in source depot. | **P2** | Add source/target bin selector to `BillModal.tsx` when `isTransfer=true`. |
| **8** | **COGS General Ledger Linkage** | Partial | `/sales/outbound` | `/depotHead/list` | Generic Bill | Outbound delivery dispatches post COGS to GL, but the linked Journal Entry # is not displayed. | **P2** | Display linked `COGS Journal Entry #` badge on delivery dispatch list/detail. |
| **9** | **Opening Balance Reconciliation Diagnostic** | None | None | `checkHistoricalReconciliation` (internal service only) | Admin | Administrators cannot view or trigger opening balance reconciliation from the UI. | **P2** | Add "Inventory Integrity Diagnostic" card in `SystemConfigList.tsx` calling diagnostic API. |

---

## 3. Sidebar & Navigation Architecture

### Current Inventory Navigation in [`Sidebar.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/layouts/MainLayout/Sidebar.tsx#L256-L267):
```typescript
{
  key: '/inventory_domain',
  icon: <DatabaseOutlined />,
  label: 'Inventory & Logistics',
  children: [
    { key: '/inventory/depots', label: 'Warehouses & Depots' },
    { key: '/inventory/transfers', label: 'Stock Transfers (Challan)' },
    { key: '/inventory/other_in', label: 'Goods Inbound (Other)' },
    { key: '/inventory/other_out', label: 'Goods Outbound (Other)' },
    { key: '/inventory/assemble', label: 'Assembly Orders' },
    { key: '/inventory/disassemble', label: 'Disassembly Orders' },
  ],
}
```

### Deficiencies in Current Navigation:
1. **Missing Ledger:** The core accounting and inventory artifact (`erp_stock_ledger_entry`) is nowhere to be found in the sidebar.
2. **Missing Stocktake:** Cycle counting and stock audits have no place in the menu.
3. **Overcrowded with Ad-Hoc Assembly:** Legacy `Assembly Orders` and `Disassembly Orders` clutter the inventory menu instead of belonging to a dedicated Manufacturing domain.

### Recommended Target Inventory Navigation:
```
INVENTORY & LOGISTICS (/inventory_domain)
├── Warehouses & Depots (/inventory/depots) [Includes Bin Drawer]
├── Stock Balances & Valuation (/report/stock)
├── Authoritative Stock Ledger (/inventory/stock_ledger)  <-- [NEW P0]
├── Stock Transfers (Rule 55 Challan) (/inventory/transfers)
├── Physical Stocktake & Audit (/inventory/stocktake)     <-- [NEW P1]
├── Miscellaneous Receipts (Other In) (/inventory/other_in)
└── Miscellaneous Issues (Other Out) (/inventory/other_out)
```
*(Note: Assembly and Disassembly will move to the dedicated Phase 2 Manufacturing module upon approval).*

---

## 4. Frontend State & Authoritative Calculation Rules

> [!CAUTION]
> **CRITICAL ARCHITECTURAL BOUNDARY:**
> The React frontend must **NEVER** calculate authoritative inventory balances, unit valuations, COGS, tax amounts, or tenant context on the client side.
> - **Stock Balances:** Must be returned directly from `erp_material_current_stock` or `erp_stock_ledger_entry`.
> - **Valuation & Moving Average:** Must be returned by backend valuation authorities.
> - **Available-to-Promise (ATP):** Must be computed by backend reservation logic.
> - **Tenant Context:** Injected strictly server-side from JWT session via `UserContext.getTenantId()`.

---

## 5. Summary of Recommended Phase 1 Frontend Changes

| Change ID | Area | Classification | Priority | Description |
| :--- | :--- | :--- | :---: | :--- |
| **F1-01** | Stock Ledger | New Page & API | **P0** | Implement `StockLedgerController.java` (`GET /stockLedger/list`) and `StockLedgerListPage.tsx`. Expose running balances, incoming rate, valuation rate, and deltas. |
| **F1-02** | Warehouse Bins | UI Extension & API | **P1** | Implement `DepotBinController.java` (`/depotBin/list`, `/depotBin/add`, `/depotBin/delete`) and add a Bins management drawer/modal in `DepotList.tsx`. |
| **F1-03** | Stock Flow Modal | Refactor | **P1** | Update the Stock Flow modal in `StockReport.tsx` to consume the authoritative `/stockLedger/list` endpoint instead of legacy `depotItem`. |
| **F1-04** | Stocktake Audit | New Page & API | **P1** | Implement `StocktakeListPage.tsx` allowing warehouse managers to perform cycle counts with book vs physical count variance display. |
| **F1-05** | ATP Visibility | Table Extension | **P1** | Add `Reserved Qty` and `Available (ATP)` columns to `StockReport.tsx`. |
| **F1-06** | Transfer Bins | Modal Extension | **P2** | Add source and target bin selection to `BillModal.tsx` when `isTransfer=true`. |
| **F1-07** | COGS Voucher Badge | UI Badge | **P2** | Display linked General Ledger COGS Journal Entry voucher number on outbound delivery lists. |
| **F1-08** | Integrity Diagnostic | Admin Card | **P2** | Expose opening balance reconciliation status in `SystemConfigList.tsx` for platform administrators. |
