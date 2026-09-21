# 02 - Current Procurement State in ERP

**Repository**: `./ERPSystem-boot`  
**Assessment Date**: 2026-08-21  

---

## 1. 27-Point Procurement Capability Matrix

| # | Procurement Function | Status | Existing Entity / Service | Evaluation & Identified Gaps |
|---|---|:---:|---|---|
| 1 | **Purchase Request (PR)** | **MISSING** | None | No formal requisition entity or requester approval flow. |
| 2 | **Material Request / MR** | **MISSING** | None | No replenishment trigger from inventory stock warnings. |
| 3 | **Request for Quotation (RFQ)**| **MISSING** | None | No multi-vendor tender/bidding distribution. |
| 4 | **Supplier Quotation** | **MISSING** | None | No vendor quote logging or price validity tracking. |
| 5 | **Quotation Comparison** | **MISSING** | None | No side-by-side vendor quotation ranking or L1 scoring. |
| 6 | **Purchase Order (PO)** | **CURRENT** | `DepotHead (sub_type='采购订单')` | Basic PO exists but lacks multi-tier approval states. |
| 7 | **Purchase Approval** | **PARTIAL** | Basic `status = '0'/'1'` | Needs configurable threshold & SoD approval engine (like S2 Sales). |
| 8 | **Goods Receipt (GRN)** | **CURRENT** | `DepotHead (sub_type='采购入库')` | Stock moves on receipt; lacks inspection & tolerance gates. |
| 9 | **Quality Inspection (QC)** | **MISSING** | None | Accepted vs Rejected quantities not formally partitioned. |
| 10| **Purchase Invoice / Bill** | **PARTIAL** | `DepotHead (sub_type='采购发票')` | Exists as document type; lacks Section 16 ITC eligibility gates. |
| 11| **Purchase Return** | **PARTIAL** | `DepotHead (sub_type='采购退货')` | Physical stock deduction exists; lacks Rule 53 Debit Note linkage. |
| 12| **Debit Note (Statutory)** | **MISSING** | `erp_gst_credit_debit_note` | Currently used for Sales Credit Notes; purchase Debit Notes missing. |
| 13| **Supplier Payment** | **CURRENT** | `AccountHead (type='支出')` | Basic payment voucher exists. |
| 14| **Advance Payment** | **PARTIAL** | `AccountHead (sub_type='预付账款')` | Unallocated advances tracked; auto-settlement against bill missing. |
| 15| **Supplier Settlement** | **PARTIAL** | `SalesPaymentAllocationService` | $1 \rightarrow N$ bill allocation implemented; AP aging reports need polish. |
| 16| **Supplier Master** | **CURRENT** | `Supplier (type='厂商')` | Supports PAN, GSTIN, credit terms, and contact info. |
| 17| **Item / UOM** | **CURRENT** | `Material`, `Unit` | Multi-unit conversion and purchase pricing established. |
| 18| **Warehouse / Depot** | **CURRENT** | `Depot` | Warehouse locations filtered by user data scope permissions. |
| 19| **Organization Hierarchy** | **CURRENT** | `Organization`, `OrgaUserRel` | Department and branch isolation established. |
| 20| **Tax Calculation Engine** | **CURRENT** | `GSTTaxCalculationEngine` | Multi-slab CGST/SGST/IGST calculation established. |
| 21| **GST Input Tax Credit** | **PARTIAL** | `PartyTaxProfileService` | Basic GST split exists; Section 16(2) & 17(5) blocked ITC missing. |
| 22| **Inventory Restocking** | **CURRENT** | `DepotItemService` | Moving average valuation and current stock increments working. |
| 23| **Accounts Payable & GL** | **CURRENT** | `SalesAccountingPostingService` | Double-entry journal voucher architecture established. |
| 24| **Reporting** | **PARTIAL** | Basic financial statements | Purchase register, vendor ledger, and GRNI accrual report missing. |
| 25| **Audit Logging** | **CURRENT** | `LogService`, `PlatformAuditService` | Mutating actions recorded with operator and timestamp. |
| 26| **Data Scope Masking** | **CURRENT** | `DataScopeService` | Depot, Organization, and Branch permission boundaries enforced. |
| 27| **Multi-Tenant Isolation** | **CURRENT** | `TenantContext`, `TenantConfig` | Strict per-tenant isolation enforced on all procurement tables. |
