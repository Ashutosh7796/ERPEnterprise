# 04 — Document Lineage Map: Current-State Audit

## 1. Document Lineage Authority

The authoritative table for cross-document traceability across the ERP is:
* **Table:** `erp_document_relationship`
* **Managed by:** [`DocumentRelationshipService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentRelationshipService.java)
* **Status:** Complete and actively used across Sales (S1–S7) and Procurement (P1–P7).

```sql
CREATE TABLE `erp_document_relationship` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` bigint(20) NOT NULL,
  `source_document_type` varchar(50) NOT NULL, -- e.g. SALES_ORDER, PURCHASE_ORDER, GRN
  `source_document_id` bigint(20) NOT NULL,
  `target_document_type` varchar(50) NOT NULL, -- e.g. SALES_DISPATCH, SALES_INVOICE, PURCHASE_INVOICE
  `target_document_id` bigint(20) NOT NULL,
  `relationship_type` varchar(30) NOT NULL DEFAULT 'FULFILLMENT',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_doc_rel_src` (`tenant_id`, `source_document_type`, `source_document_id`),
  KEY `idx_doc_rel_tgt` (`tenant_id`, `target_document_type`, `target_document_id`)
);
```

---

## 2. Traced Document Lifecycles

### 2.1 Sales Lifecycle (Order-to-Cash)
```text
Quotation (erp_quotation)
    ↓ [1:1 or 1:N]
Sales Order (erp_depot_head, sub_type='SALES_ORDER')
    ↓ [Stock Reservation in erp_stock_reservation]
Outbound Delivery / Dispatch (erp_depot_head, sub_type='SALES_DISPATCH')
    ↓ [Consumption of reservation & stock decrement]
Statutory Tax Invoice (erp_gst_sales_invoice)
    ↓ [Rule 46, IRN, QR Code, GL Posting]
Payment Receipt / AR Allocation (erp_account_head / erp_account_item)
```

### 2.2 Procurement Lifecycle (Procure-to-Pay)
```text
Purchase Requisition (erp_depot_head, sub_type='PURCHASE_APPLY')
    ↓
Purchase Order (erp_depot_head, sub_type='PURCHASE_ORDER')
    ↓ [Approval & Line Fulfillment in erp_po_line_fulfillment]
Goods Receipt Note (erp_depot_head, sub_type='PURCHASE_INBOUND')
    ↓ [Dr Inventory | Cr GRNI Accrual]
Three-Way Match Verification (erp_three_way_match_header / _item)
    ↓
Statutory GST Purchase Invoice (erp_purchase_invoice)
    ↓ [Dr GRNI + Dr ITC | Cr AP]
Payment Allocation & TDS (erp_tds_register / Section 194Q)
```

### 2.3 Existing Transfer Flow (Inter-Depot)
```text
Depot A (erp_depot_item.depot_id)
    ↓ [Single Atomic Row: sub_type='调拨']
Depot B (erp_depot_item.another_depot_id)
```
* **Limitation:** In the current ERP, stock transfer is recorded as a single instantaneous document. If Depot A and Depot B are in different cities (or under different GSTINs in different states), there is no **In-Transit / In-Transit Goods** state between shipping and receiving.

### 2.4 Missing Manufacturing Lineage
```text
[MISSING] Production Order / Work Order
    ↓
[MISSING] Material Issue Note (Pick List from Stores to Shop Floor)
    ↓
[MISSING] Work-in-Progress (WIP) Tracking
    ↓
[MISSING] Finished Goods Receipt & Scrap Logging
```
Currently, assembly is executed as a single flat bill (`组装单`) without order lineage or job cards.
