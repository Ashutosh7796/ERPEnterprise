# Sales Module Gap Analysis & Production-Readiness Plan

## 1. Executive Summary
This document provides the gap analysis and production-readiness roadmap for the **Sales Module** in our mid-market ERP, comparing our existing implementation against reference architectures from **metasfresh** and **ERPNext**.

---

## 2. Current Implementation State

### Existing Screens & APIs
* **Sales Orders**: Handled via `erp_depot_head` (`type='其它', sub_type='销售订单'`) and UI in [`SaleOrderList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/bill/pages/SaleOrderList.tsx).
* **Sales Dispatch (Outbound Delivery)**: Handled via `erp_depot_head` (`type='出库', sub_type='销售'`) and UI in [`SaleOutboundList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/bill/pages/SaleOutboundList.tsx).
* **Sales Returns**: Handled via `erp_depot_head` (`type='入库', sub_type='销售退货'`) and UI in [`SaleReturnList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/bill/pages/SaleReturnList.tsx).
* **GST Sales Invoices**: Handled via [`GstSalesInvoiceService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstSalesInvoiceService.java) and UI in [`GstSalesInvoiceForm.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/gst/pages/GstSalesInvoiceForm.tsx).
* **IRN / E-Way Bill**: Implemented in [`GstEInvoiceDashboard.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/gst/pages/GstEInvoiceDashboard.tsx).

---

## 3. Detailed Gap Matrix

| Feature Area | Current ERP Status | Gap Details | Recommended Solution | Priority |
|---|:---:|---|---|:---:|
| **Sales Quotations / Proforma** | **Missing** | No formal quote generation or quote revision mechanism prior to order commitment. | Create `erp_quotation` entity with "Convert to Sales Order" action. | **Medium** |
| **Order Line Fulfillment Tracking** | **Partial** | Orders and Dispatches exist, but order lines lack `delivered_qty` and `invoiced_qty` balance fields. | Add tracking columns to `erp_depot_item` and update automatically on dispatch/invoice. | **High** |
| **Credit Limit Validation Gate** | **Missing** | Customer master has `credit_limit`, but system does not block new orders when outstanding balance exceeds limit. | Add credit check in `DepotHeadService` during order submission/approval. | **High** |
| **Stock Soft-Reservation** | **Missing** | Stock is deducted only upon dispatch. Approved orders do not reserve stock. | Add `reserved_qty` calculation to prevent overselling between SO approval and dispatch. | **High** |
| **Automated GL Journal Integration** | **Partial** | Invoices generate tax records, but automated double-entry GL posting (AR vs Revenue vs GST) requires tighter voucher linking. | Hook `GstSalesInvoiceService.postInvoice` to automated GL journal creation. | **High** |
| **Invoice Payment Allocation Grid** | **Partial** | Collection notes exist, but cannot settle specific open invoices with partial allocations in the UI. | Add invoice selection grid to Collection Notes form. | **Medium** |

---

## 4. Architectural Comparison

```text
Feature                      Our ERP              metasfresh             ERPNext
------------------------------------------------------------------------------------------
Quote → Order Conversion     Missing              Native (C_Order)       Native (Quotation)
Order Approval Workflow      Simple Flag          BPMN Engine            Configurable Rules
Stock Soft Reservation       Missing              M_Storage Reserved     Reserved Qty
Physical / Financial Split   Partial              Strict (M_InOut/C_Inv) Strict (DN/SINV)
GST Rule 46 / IRN Compliance Built-in (Verified)  Plugin required        Native (India App)
Double-Entry Posting         Partial              Automated              Automated
```

---

## 5. Production Readiness Action Items

1. **Step 1 (Order Lineage)**: Add `delivered_qty` and `invoiced_qty` tracking to `erp_depot_item` so sales orders reflect exact remaining quantities.
2. **Step 2 (Credit Check)**: Enforce customer credit limit checks before allowing sales order confirmation.
3. **Step 3 (Quotation Management)**: Introduce lightweight Sales Quotation module for price proposals.
4. **Step 4 (Automated Financial Posting)**: Connect finalized GST Tax Invoices directly to Accounts Receivable ledger.
