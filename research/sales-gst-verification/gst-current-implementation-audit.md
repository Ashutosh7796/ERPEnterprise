# Audit of Current ERP GST Implementation

---

## 1. Executive Summary & Inventory of Existing GST Classes
Our ERP currently contains an established suite of GST domain classes and compliance services in `ERPSystem-boot/src/main/java/com/jsh/erp/service/`:
* [`GstSalesInvoiceService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstSalesInvoiceService.java): Governs invoice lifecycle, Rule 46 calculation binding, and document snapshots.
* [`GSTTaxCalculationEngine.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GSTTaxCalculationEngine.java): Place of Supply validation, line item tax rate splitting, and cess calculations.
* [`GstCreditDebitNoteService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstCreditDebitNoteService.java): Rule 53 credit and debit note generation and original invoice linking.
* [`GstEinvoiceIntegrationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstEinvoiceIntegrationService.java): Schema v1.03 payload generation, IRN hash generation, and mock/live IRP gateway integration.
* [`GstEwayBillValidityService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstEwayBillValidityService.java): E-Way bill distance-to-validity calculation engine.
* [`CompanyGstinService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/CompanyGstinService.java): Multi-GSTIN tenant registration.

---

## 2. Granular Compliance Audit Against Statutory Standards

| Component / Workflow | Statutory Requirement (Standard) | Our Current Code Implementation | Assessment | Audit Finding & Action Required |
|---|---|---|:---:|---|
| **Invoice Numbering** | $\le 16$ alphanumeric characters, unique per FY (Rule 46(b)) | Governed by [`FinancialYearSequenceService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/FinancialYearSequenceService.java) | **Correct** | Generates compliant format `INV/2425/0001` ($\le 16$ chars). |
| **Tax Rate Split Engine** | Intra-state splits into equal CGST (50%) + SGST (50%); Inter-state into IGST (100%) | Verified in [`GSTTaxCalculationEngine.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GSTTaxCalculationEngine.java) | **Correct** | Accurate split logic and Place of Supply state matching. |
| **Place of Supply (POS)** | Goods POS = Shipping/Delivery state (Sec 10(1)(a)); Bill-to/Ship-to (Sec 10(1)(b)) | Uses customer `state_code` directly from party profile | **Partial** | Must explicitly differentiate **Shipping State** from **Billing State** in Bill-to/Ship-to sales orders. |
| **E-Invoice (IRN) Schema** | NIC Schema v1.03 JSON structure with mandatory HSN, POS, Seller/Buyer GSTINs | Implemented in [`GstEinvoiceIntegrationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstEinvoiceIntegrationService.java) | **Correct** | Standard schema structure with signed QR code string parsing. |
| **E-Way Bill Threshold** | Mandatory for consignment value $> ₹50,000$ (Rule 138) | Threshold enforced in [`GstThresholdService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstThresholdService.java) | **Correct** | Correct threshold evaluation. |
| **LUT / SEZ Declaration** | Mandatory endorsement on zero-rated export & SEZ invoices | Handled in `GstSalesInvoiceService` | **Partial** | Needs explicit field to store Letter of Undertaking (LUT) Number and Expiry Date on tenant profile. |
| **TDS / TCS Withholding** | Sec 194Q / 206C(1H) withholding on invoices $> ₹50\text{ Lakhs}$ | Currently not present in tax calculation engine | **Missing** | Add TDS/TCS deduction hook in financial billing engine. |
| **Dual Invoice Records** | Unified commercial and statutory invoice entity | Separate `erp_depot_head` (Dispatch) vs `erp_gst_sales_invoice` | **Refinement Needed** | Explicitly designate `erp_gst_sales_invoice` as the single authoritative commercial/AR invoice. |

---

## 3. Detailed Technical Deficiencies & Refinements

### 3.1 Separate Commercial Invoice vs GST Snapshot Entity Clarification
Currently, `erp_depot_head` stores physical dispatches (`sub_type='销售'`), while `erp_gst_sales_invoice` stores statutory GST details.
* **Risk**: If developers treat both as separate financial invoices, it could lead to double-counting Accounts Receivable.
* **Resolution**: Formally designate `erp_gst_sales_invoice` as the **sole Authoritative Commercial & Tax Invoice**. The `erp_depot_head` entry for dispatch is strictly an **Outbound Delivery / Packing Slip** representing inventory movement.

### 3.2 Bill-To vs Ship-To Separation
In tripartite wholesale transactions, Buyer $A$ in Maharashtra orders goods to be delivered directly to their customer $B$ in Gujarat from Seller $S$ in Maharashtra:
* First Leg ($S \rightarrow A$): Intra-State (CGST + SGST) because POS is Maharashtra (buyer location under Sec 10(1)(b)).
* Delivery Challan / E-Way Bill: Displays Ship-to address (Gujarat).
* *Action*: Ensure Sales Order and Invoice headers store both `billing_address_id` (for POS and GSTIN tax type determination) and `shipping_address_id` (for E-Way bill consignment and transport destination).
