# 11 - Procurement Menu & UI Experience Analysis

**Target Standard**: Clean, Modern, Role-Based Mid-Market Purchasing Interface  
**Comparison**: metasfresh Menus vs ERPNext Menus vs Our Current ERP  

---

## 1. Purchasing Navigation Menu Comparison

| Functional Area | metasfresh Navigation | ERPNext Navigation | Our Current ERP | Recommended Design |
|---|---|---|---|---|
| **Requisitions** | Procurement $\rightarrow$ Requisitions | Buying $\rightarrow$ Material Request | Missing | **Purchasing $\rightarrow$ Material Requisitions** |
| **Vendor Quotes**| Procurement $\rightarrow$ RFQ / Vendor Quotes | Buying $\rightarrow$ Supplier Quotation | Missing | **Purchasing $\rightarrow$ Requests for Quotation (RFQ)** |
| **Purchase Orders** | Procurement $\rightarrow$ Purchase Orders | Buying $\rightarrow$ Purchase Orders | Purchasing $\rightarrow$ Purchase Orders | **Purchasing $\rightarrow$ Purchase Orders** (with Approval Queue) |
| **Goods Receipts** | Warehouse $\rightarrow$ Material Receipts | Stock $\rightarrow$ Purchase Receipts | Inventory $\rightarrow$ Inward Bills | **Purchasing $\rightarrow$ Goods Receipts (GRN)** |
| **Vendor Invoices**| Invoicing $\rightarrow$ Vendor Invoices | Accounts $\rightarrow$ Purchase Invoices | Purchasing $\rightarrow$ Purchase Invoices | **Purchasing $\rightarrow$ Vendor Invoices (Bills)** |
| **Debit Notes** | Invoicing $\rightarrow$ Credit / Debit Notes | Accounts $\rightarrow$ Purchase Invoice (Return)| Missing (Only Sales CN) | **Purchasing $\rightarrow$ Purchase Debit Notes** |
| **Vendor Payments**| Financials $\rightarrow$ Payment Allocations | Accounts $\rightarrow$ Payment Entry | Financial $\rightarrow$ Outward Bills | **Financials $\rightarrow$ Vendor Payments** |
| **Vendor Master** | Master Data $\rightarrow$ Business Partners | Buying $\rightarrow$ Supplier | System $\rightarrow$ Vendor List | **Purchasing $\rightarrow$ Vendor Directory & Profiles** |
| **Procurement Reports**| Reports $\rightarrow$ Purchasing Analytics | Buying $\rightarrow$ Purchasing Analytics | Basic financial summaries | **Purchasing $\rightarrow$ Purchase Register & Reports** |

---

## 2. Screen & Workflow Polish Recommendations

1. **Integrated Purchase Order Form**:
   * Unified Header: Supplier, Warehouse, Payment Terms, Expected Delivery Date, Currency.
   * Line Item Grid: Item, HSN/SAC, Quantity, Unit Rate, Discount %, Taxable Value, CGST/SGST/IGST %, Line Total.
   * Statutory Card: Supplier GSTIN, Place of Supply, RCM Toggle, Section 17(5) Blocked ITC indicator.
   * Live Lineage & Tracking Tab: Fulfillment status badges (`0% Received`, `100% Invoiced`).
2. **Dedicated Three-Way Matching Modal**:
   * Visual comparison of PO Unit Price vs Invoice Unit Price (highlighting price variances $\gt$ configured threshold).
   * Visual comparison of GRN Accepted Quantity vs Invoice Billed Quantity (blocking billing beyond accepted receipt).
