# ERPNext India Compliance Comparison

---

## 1. ERPNext India Compliance Architecture Overview
In ERPNext, Indian statutory localization is governed primarily by the official `india_compliance` app:
* **Item Tax Templates**: Maps items to specific GST accounts (`CGST 9%`, `SGST 9%`, `IGST 18%`).
* **Address Model**: Every address record stores `gstin`, `gst_state`, and `gst_state_number`.
* **Sales Invoice Processing**:
  * Evaluates `taxes_and_charges` template based on customer state vs company state.
  * Injects e-Invoice action buttons (`Generate e-Invoice`, `Cancel e-Invoice`, `Generate E-Way Bill`).
  * Stores statutory outputs (`irn`, `signed_qr_code`, `signed_invoice`, `ewaybill`).

---

## 2. Granular Comparative Matrix: ERPNext vs Our Implementation

| Feature Area | ERPNext India Compliance | Our Implementation | Synthesis & Recommendation |
|---|---|---|---|
| **E-Invoice (IRN) Flow** | 1-Click action triggers GSP API, updates document fields, and embeds QR code on print template | `GstEinvoiceIntegrationService` communicates via REST gateway and stores signed QR | **Aligned**: Both generate signed QR codes and embed them on Rule 46 print layouts. |
| **E-Way Bill Generation** | Can be generated alongside e-Invoice in a single IRP payload, or standalone | Supported via `GstEwayBillValidityService` and dedicated E-Way Bill dashboard | **Enhance**: Add 1-click combined IRN + EWB payload generation option. |
| **GSTR-1 Data Generation** | Aggregates B2B (table 4), B2CL (table 5), B2CS (table 7), CDNR (table 9B), HSN (table 12) | Aggregated via `TrendReport` queries | **Adopt ERPNext structure**: Provide dedicated GSTR-1 Table-wise export views. |
| **Advance Adjustment on Invoice** | Links `Payment Entry` advance allocation and calculates reverse GST liability | Separate advance receipt voucher | **Adopt ERPNext pattern**: Allow selecting unallocated Advance Receipts during Sales Invoicing. |
| **Export with / without LUT** | Dedicated checkboxes: `Is Export With / Without Payment of GST`, stores `LUT Number` | Supported in `GstSalesInvoiceService` | **Enhance**: Add tenant-level LUT master with auto-fill on export invoices. |
