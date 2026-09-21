# Historical & Current GST Rule Changes and ERP Impact Matrix

---

## 1. Statutory Notifications & Amendments Tracker

| Notification / Rule Reference | Effective Date | Statutory Requirement & Scope | Affected ERP Module & Transaction | Expected ERP Behavior | Current ERP Status | Gap / Change Needed |
|---|:---:|---|---|---|:---:|---|
| **Notification No. 13/2020 – Central Tax** | 01-Oct-2020 | E-Invoicing mandatory for taxpayers with AATO $> ₹500\text{ Cr}$ | Sales Invoicing (B2B) | Generate IRN via IRP gateway | Implemented | Baseline integration working |
| **Notification No. 17/2022 – Central Tax** | 01-Oct-2022 | E-Invoicing threshold lowered to AATO $> ₹10\text{ Cr}$ | Sales Invoicing (B2B/SEZ/Export) | Auto-trigger IRN generation | Implemented | Baseline integration working |
| **Notification No. 10/2023 – Central Tax** | 01-Aug-2023 | E-Invoicing threshold lowered to AATO $> ₹5\text{ Cr}$ | Sales Invoicing (B2B/SEZ/Export) | Evaluates tenant AATO and enforces IRN | Implemented | Configured via `GstThresholdService` |
| **Notification No. 78/2020 – Central Tax** | 01-Apr-2021 | Mandatory 4-digit HSN for AATO $\le ₹5\text{ Cr}$; 6-digit for AATO $> ₹5\text{ Cr}$ | Item Master & Invoice Line Items | Block invoice generation if HSN length is below threshold | Implemented | HSN validator checks length based on turnover |
| **Notification No. 38/2023 – Central Tax** | 04-Aug-2023 | 30-day time limit on reporting e-invoices for taxpayers $\ge ₹100\text{ Cr}$ | Sales Invoicing / IRP Dispatch | Block IRN generation for invoices older than 30 days | Missing | **Add 30-day date check in `GstEinvoiceIntegrationService`** |
| **Circular No. 199/11/2023-GST** | 17-Jul-2023 | Clarification on ISD vs Cross Charge for internally generated services | Multi-branch / Multi-GSTIN Billing | Inter-branch invoices must use cost + 10% or OMV | Partial | Multi-GSTIN cross billing supported |
| **Section 194Q (Finance Act 2021)** | 01-Jul-2021 | 0.1% TDS on purchase of goods $> ₹50\text{ Lakhs}$ | Vendor Invoicing / Accounts Payable | Auto-deduct 0.1% TDS from payable amount | Missing | **Add Section 194Q TDS calculation hook** |
| **Section 206C(1H) (Finance Act 2020)** | 01-Oct-2020 | 0.1% TCS collection on sales receipt $> ₹50\text{ Lakhs}$ | Customer Receipts / Invoicing | Auto-compute TCS on receipt threshold | Missing | **Add Section 206C(1H) TCS calculation hook** |
| **E-Way Bill 200 km Rule** | 01-Jan-2021 | 1 day validity per 200 km (increased from 100 km) for normal cargo | Outbound Logistics / E-Way Bill | `validity_days = ceil(distance_km / 200.0)` | Implemented | Verified in `GstEwayBillValidityService` |

---

## 2. Dynamic Rule Versioning & Effective Dating Architecture
To ensure our tax engine does not require hardcoded code rewrites whenever the GST Council announces new rate brackets or threshold changes, the ERP employs an **Effective-Dated Rule Architecture**:
```text
Table: erp_statutory_rule_version
├── id (BIGINT PK)
├── rule_code (e.g., 'E_INVOICE_AATO_THRESHOLD', 'EWAY_KM_PER_DAY', 'HSN_MIN_DIGITS')
├── effective_from (DATE)
├── effective_to (DATE, NULLABLE)
├── parameter_value (JSON / VARCHAR, e.g. '50000000', '200')
├── notification_reference (e.g., 'Notif 10/2023-CT')
└── tenant_id (BIGINT, 0 = Global Platform Statutory Default)
```
* **Resolution Rule**: Query `WHERE rule_code = ? AND effective_from <= :doc_date AND (effective_to IS NULL OR effective_to >= :doc_date) ORDER BY effective_from DESC LIMIT 1`.
