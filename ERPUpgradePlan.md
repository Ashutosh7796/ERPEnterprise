# jshERP → Product-Grade Indian Manufacturing ERP: Reference-Driven Architecture Hardening & Implementation Plan

## Executive Summary

This implementation plan details the transformation of the existing **jshERP** foundation into a commercial, product-grade **Indian Manufacturing ERP**.

By synthesizing domain patterns from leading enterprise open-source reference architectures—**metasfresh** (Enterprise Java ERP/Costing), **ERPNext** (Financial/MRP/BOM workflows), **India Compliance** (Statutory GST, e-Invoice, e-Way Bill, GSTR-1/3B/2B), and **OpenMES** (Shop-Floor, Work Orders, Quality, Traceability, OEE)—we design a native, high-performance, auditable, and modular system tailored for Indian discrete and process manufacturing enterprises.

The entire architecture is implemented natively on our core technology stack:
- **Frontend:** React 19 + TypeScript + Ant Design 5 + Vite
- **Backend:** Java 17 + Spring Boot 3 + MyBatis + MySQL 8.0 + Redis

---

## 1. Reference Architecture & License Compliance Analysis

| Reference Repository | Primary Domain Studied | License | License Compliance & Usage Strategy |
|---|---|---|---|
| **metasfresh** (`metasfresh/metasfresh`) | Enterprise Accounting, Multi-Level Costing, Document Lifecycle, Material Allocations | GPL-2.0 | **Functional/Architectural Reference only.** Abstracted enterprise Java domain models, state machine flows, and double-entry posting rules. Zero code copying. |
| **ERPNext** (`frappe/erpnext`) | General Ledger, Multi-Level BOM, MRP Engine, Subcontracting/Job Work, Stock Valuation | GPL-3.0 | **Workflow & Business Logic Reference only.** Studied state machines, MRP explosion math, and validation rules. Implemented natively in Java/Spring Boot. |
| **India Compliance** (`resilient-tech/india-compliance`) | GST Calculation, GSTIN Validation, e-Invoice (INV-01), e-Way Bill (EWB-01), GSTR-1/3B/2B | GPL-3.0 | **Statutory Domain Reference.** Studied JSON payload mappings, checksum algorithms, tolerance thresholds, and reconciliation matrix. Benchmarked against official CBIC/GSTN/NIC schemas. |
| **OpenMES** (`Mes-Open/OpenMes`) | Shop-Floor Control, Work Orders, Job Cards, Machine Downtime, Quality Inspection, Traceability | AGPL-3.0 | **MES Domain Reference.** Studied ISA-95 hierarchical data models (Enterprise ➔ Site ➔ Area ➔ Work Center ➔ Machine), forward/backward batch genealogy, and production event lifecycles. |
| **Apache OFBiz** (`apache/ofbiz-framework`) | Supply Chain Workflows, Quotation Comparisons, Procurement RFQ Matrix | Apache-2.0 | Studied enterprise purchasing and 3-way matching mechanics. |

---

## 2. Target System Architecture & Core Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          REACT 19 FRONTEND LAYER                                            │
├────────────────────────┬─────────────────────────────┬──────────────────────────────┬───────────────────────┤
│  Finance & Compliance  │  Manufacturing & MES        │  Supply Chain & Inventory    │  Quality & Assets     │
│  - Multi-GSTIN Masters │  - Visual BOM & Routings    │  - Procurement RFQ & POs     │  - Inspection Plans   │
│  - Tax Invoicing & POS │  - Work Orders & Job Cards  │  - Sales Orders & Dispatch   │  - NCR & CAPA Manager │
│  - e-Invoice & e-Way   │  - MRP Recommendation Board │  - Multi-Bin Warehouse Grid  │  - Machine Master     │
│  - GSTR-1/3B/2B Center │  - Operator Station / MES   │  - Subcontracting / Job Work │  - Preventive Maint.  │
└────────────────────────┴─────────────────────────────┴──────────────────────────────┴───────────────────────┘
                                                       │
                                              RESTful HTTPS APIs
                                                       │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       SPRING BOOT 3 SERVICE LAYER                                           │
├──────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┤
│  Statutory & Financial Engine:                       │  Industrial Manufacturing Engine:                    │
│  ├── GSTTaxEngine (Intra/Inter-State, Cess, RCM)     │  ├── BOMExplosionService (Multi-level, scrap/by-prod)│
│  ├── EInvoiceService (INV-01 IRP / Signed QR Engine) │  ├── MRPEngineService (Gross-to-Net Demand Matrix)   │
│  ├── EWayBillService (NIC Part-A/Part-B Generator)   │  ├── ProductionOrderService (Job Card Dispatcher)    │
│  ├── GSTR2BReconciler (5-Point Matching Matrix)      │  ├── QualityInspectionService (Sampling & NCR/CAPA)  │
│  ├── AccountingPostingBridge (GL Double-Entry Split) │  ├── BatchGenealogyService (Forward/Backward Trace)  │
│  └── IndianFinancialYearService (Sequential Series)  │  └── ProductCostingEngine (Std vs Actual Variance)   │
└──────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
                                                       │
                                           MyBatis ORM / HikariCP
                                                       │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            MYSQL 8.0 DATABASE                                               │
├────────────────────────┬─────────────────────────────┬──────────────────────────────┬───────────────────────┤
│  Core Financial & GST  │  Manufacturing & Routings   │  Supply Chain & Subcontract  │  Quality & Assets     │
│  - jsh_company_gstin   │  - jsh_bom_head & item      │  - jsh_rfq_head & quote      │  - jsh_qc_plan & spec │
│  - jsh_hsn_sac         │  - jsh_work_center          │  - jsh_job_work_order        │  - jsh_qc_inspection  │
│  - jsh_gl_ledger       │  - jsh_routing_operation    │  - jsh_subcontract_challan   │  - jsh_ncr_capa       │
│  - jsh_einvoice_log    │  - jsh_production_order     │  - jsh_warehouse_bin         │  - jsh_asset_machine  │
│  - jsh_ewaybill_log    │  - jsh_job_card             │  - jsh_stock_reservation     │  - jsh_maintenance_wo │
└────────────────────────┴─────────────────────────────┴──────────────────────────────┴───────────────────────┘
```

---

## 3. Module-by-Module Technical Upgrade Blueprint (Phases 1 to 20)

---

### PHASE 1 — Core Financial & Indian GST Foundation
* **Domain Problem:** Standard jshERP has single company profile and flat tax rate without state Place of Supply (POS) or PAN/TAN.
* **Reference Model (India Compliance & metasfresh):** Multi-GSTIN entity architecture where a Tenant/Company has multiple state registrations mapped to branches/depots.
* **Database Entities:**
  - `jsh_state_code`: 37 Indian States/UTs with 2-digit codes.
  - `jsh_company_gstin`: Legal name, Trade name, PAN, 15-char GSTIN, State code, Taxpayer type (Regular, Composition, SEZ, EOU), IRP/NIC credentials.
  - `jsh_hsn_sac`: 4/6/8-digit HSN/SAC code catalog, Goods/Services classification, Tax slabs (0%, 0.1%, 0.25%, 3%, 5%, 12%, 18%, 28%), Cess %, effective dates.
* **Engine:** `GSTTaxCalculationEngine` evaluating:
  - Intra-State (`Supplier State == POS State`): `CGST = Taxable * Rate/2`, `SGST = Taxable * Rate/2`.
  - Inter-State (`Supplier State != POS State`): `IGST = Taxable * Rate`.
  - Cess calculation and line-item rounding.
* **Financial Year Engine:** Indian fiscal cycle (`1st April to 31st March`) with gapless, sequential numbering formats (e.g. `INV/26-27/0001`).

---

### PHASE 2 & 3 — Financial Documents, Tax Invoicing & Credit/Debit Notes
* **Domain Problem:** Financial documents are simple receipts without statutory GST Rule 46 fields or Section 34 Credit/Debit Note adjustments.
* **Reference Model (metasfresh & ERPNext):** Strict immutable document state machine:
  $$\text{Draft} \longrightarrow \text{Validated} \longrightarrow \text{Approved} \longrightarrow \text{Posted to GL} \longrightarrow \text{Tax Validated} \longrightarrow \text{Finalized}$$
* **Sales & Purchase Invoicing:**
  - Mandatory GST Rule 46 fields: Supplier & Buyer GSTIN, State Name & Code, Place of Supply, HSN summary, CGST/SGST/IGST breakdown, Amount in Words (INR).
* **Credit Notes & Debit Notes (Section 34 CGST Act):**
  - Mandatorily linked to Original Invoice Number and Date.
  - Statutory Reason Codes (01-Sales Return, 02-Post Sale Discount, 03-Deficiency in Services, 04-Correction in Invoice, 05-Change in POS, 06-Others).
  - Reverses output tax liability and adjusts party balance in general ledger.

---

### PHASE 4 & 5 — e-Invoice (IRN) & e-Way Bill Integration
* **Domain Problem:** No e-Invoicing or e-Way Bill generation; manual portal entry is prone to error and non-compliant.
* **Reference Model (India Compliance):**
  - **e-Invoice (Rule 48(4)):** Automated JSON payload builder compliant with official **INV-01 Schema**. Supports direct API/GSP transmission, receiving 64-character SHA-256 `irn`, `ack_no`, `ack_date`, and `signed_qrcode` (JWT string).
  - **Signed QR Code Rendering:** Generates printable high-density QR code containing standard e-Invoice parameters on the PDF/print invoice.
  - **e-Way Bill (Rule 138):** Part-A (Consignment/Invoice details) and Part-B (Transporter ID, Vehicle Number, Transport Mode: Road/Rail/Air/Ship, Distance in KM). Automated validity tracking (1 day per 200 km).

---

### PHASE 6 & 7 — GST Returns Engine & GSTR-2B Reconciliation
* **Domain Problem:** Accountants must manually compile return figures; ITC mismatch leads to tax penalties and notices.
* **Reference Model (India Compliance & ERPNext):**
  - **GSTR-1 Engine:** Real-time extraction and JSON export for B2B (4A), B2C Large (5A), Exports (6A), B2C Small (7), Nil/Exempt (8), Credit Notes (9B), and HSN Summary (12).
  - **GSTR-3B Engine:** Aggregation of Table 3.1 (Outward Taxable & Inward RCM Liability), Table 3.2 (Inter-state unregistered), Table 4 (Eligible ITC, Ineligible ITC, Reversals under Rule 38/42/43).
  - **GSTR-2B Auto-Reconciler:** Automated 5-point matching algorithm (GSTIN, Document Number, Date, Taxable Value, Tax Amount).
    - Status Classification: `Exact Match`, `Value Variance (±₹2)`, `Missing in Books (Unbooked)`, `Missing in 2B (Vendor Default)`.

---

### PHASE 8 — Industrial Manufacturing & Production Structure
* **Domain Problem:** jshERP currently only has flat "Assemble/Disassemble" bills; lacks multi-level BOMs, scrap, routings, and work centers.
* **Reference Model (metasfresh & OpenMES):**
  - **Multi-Level Bill of Materials (BOM):**
    - Parent Finished Good ➔ Sub-Assemblies ➔ Raw Materials / Packaging.
    - BOM Versions & Revisions (`Rev 1.0`, `Rev 1.1`), Default/Alternate BOMs.
    - Component Scrap % factor, Expected By-Products and Co-Products.
  - **Work Centers & Routing Operations:**
    - Work Center Master (Machines, Labor Capacity, Hourly Machine Rate, Electricity/Overhead Rate).
    - Routing Master (Sequential operations: Cutting ➔ Machining ➔ Welding ➔ Painting ➔ Assembly ➔ Packaging).
    - Standard Setup Time, Run Time per Unit, and Labor hours.
  - **Production Orders & Work Orders:**
    - Work Order generation from Sales Demand or Minimum Stock Policy.
    - Job Cards dispatched to specific work centers.
    - Material Issue Note (Pick List) ➔ Work-in-Progress (WIP) Tracking ➔ Finished Goods Receipt & Scrap Logging.

---

### PHASE 9 — Material Requirements Planning (MRP) Engine
* **Domain Problem:** Lack of material planning leads to stockouts or excessive working capital lockup.
* **Reference Model (ERPNext & metasfresh):**
  - **Deterministic MRP Explosion:**
    $$\text{Gross Requirement} = \text{Confirmed Sales Orders} + \text{Production Orders} + \text{Safety Stock Deficit}$$
    $$\text{Net Requirement} = \text{Gross Requirement} - (\text{On-Hand Stock} + \text{Open POs} + \text{In-Transit Stock} - \text{Reserved Stock})$$
  - **Actionable & Explainable Recommendations:**
    - Auto-generates **Purchase Requisitions** for Raw Materials based on lead time.
    - Auto-generates **Production Orders** for Sub-Assemblies.
    - Explainability Audit View: Displays parent demand origin, BOM level, current stock, and shortage breakdown for every suggested purchase.

---

### PHASE 10 — Quality Management (QM) & NCR/CAPA
* **Domain Problem:** No quality checks; defective items are directly booked into inventory.
* **Reference Model (OpenMES & metasfresh):**
  - **Quality Inspection Points:**
    1. **Incoming (IQC):** Triggered at Goods Receipt Note (GRN) before inventory acceptance.
    2. **In-Process (IPQC):** Triggered at milestone routing operations.
    3. **Final Inspection (PQC):** Triggered prior to Finished Goods storage.
  - **Inspection Plans & Characteristics:** Defined parameters (Length, Hardness, Voltage, Finish) with Nominal Values, Upper/Lower Tolerances, and AQL Sampling Rules.
  - **NCR (Non-Conformance Report) & CAPA:** Root cause analysis, Corrective Action, Preventive Action, and Supplier Quality Rating penalty adjustments.

---

### PHASE 11 — Complete Batch, Lot & Serial Traceability
* **Domain Problem:** Inability to trace defective raw materials forward to finished goods or vice-versa.
* **Reference Model (OpenMES & metasfresh):**
  - **Forward Traceability:** Vendor Raw Material Heat/Batch Number ➔ GRN ➔ Issued to Work Order #WO-101 ➔ Finished Batch #FG-501 ➔ Delivery Challan ➔ Customer Invoice.
  - **Backward Traceability:** Customer Complaint on Batch #FG-501 ➔ Work Order ➔ Operator/Machine ➔ QC Log ➔ Supplier Raw Material Batch & Mill Test Certificate.

---

### PHASE 12 & 13 — Advanced Inventory & Procurement Lifecycle
* **Domain Problem:** Flat warehouse storage and direct purchase orders without vendor quote comparisons.
* **Reference Model (metasfresh, ERPNext & OFBiz):**
  - **Multi-Bin Warehouse Locations:** Depot ➔ Aisle ➔ Rack ➔ Shelf ➔ Bin.
  - **Stock Allocations:** Real-time stock reservation for approved Sales Orders.
  - **Valuation Methods:** Support for Moving Average Cost and First-In-First-Out (FIFO).
  - **End-to-End Procurement Flow:**
    $$\text{Purchase Requisition} \longrightarrow \text{RFQ} \longrightarrow \text{Vendor Quotations} \longrightarrow \text{Comparative Statement} \longrightarrow \text{PO} \longrightarrow \text{GRN} \longrightarrow \text{QC} \longrightarrow \text{3-Way Match Bill}$$

---

### PHASE 14 & 15 — Sales Order Fulfillment & Subcontracting (Job Work)
* **Domain Problem:** No dedicated job work/subcontracting tracking; Indian GST Rule 45 challans missing.
* **Reference Model (ERPNext & India Compliance):**
  - **Sales Order Fulfillment:** Customer Quotation ➔ Sales Order ➔ Production Reservation ➔ Pick/Pack List ➔ Dispatch Challan ➔ Tax Invoice ➔ Payment.
  - **Subcontracting (Job Work):**
    - Issue of raw materials to Job Worker under **GST Delivery Challan (Rule 45)**.
    - Tracking pending materials at vendor site (1-year limit for inputs, 3-year limit for capital goods under Section 143).
    - Inward receipt of processed components, scrap reconciliation, and Job Work Service Invoicing.

---

### PHASE 16 & 17 — Asset Maintenance & Shop-Floor MES Operator Station
* **Domain Problem:** No machine maintenance tracking; shop-floor data entry is delayed.
* **Reference Model (OpenMES):**
  - **Machine / Asset Master:** Machine Code, Model, Serial No, Installation Date, Work Center linkage, Meter Reading.
  - **Maintenance Work Orders:** Preventive Maintenance Schedules (Daily/Weekly/Monthly), Breakdown Logging, Spare Parts Issue, Downtime Tracking, MTBF & MTTR calculation.
  - **MES Operator Station (Tablet UI):** Fast touch-friendly screen for operators to scan Job Card QR, log Start/Pause/Complete, enter Good Qty & Scrap Qty, and report machine downtime reasons in real time.

---

### PHASE 18, 19 & 20 — Product Costing, Workflows & Audit Immutability
* **Domain Problem:** Inaccurate product cost estimations and lack of multi-level configurable approvals.
* **Reference Model (metasfresh & ERPNext):**
  - **Standard vs Actual Product Costing Engine:**
    $$\text{Unit Cost} = \text{Direct Material} + \text{Direct Labor} + \text{Machine Cost} + \text{Subcontracting} + \text{Allocated Overhead} - \text{Scrap Credit}$$
  - **Configurable Multi-Tier Approval Rules:** Dynamic approval hierarchy based on Document Type, Amount Thresholds, Branch, and Cost Center.
  - **Tamper-Evident Audit Trail:** System captures `User ID`, `Timestamp`, `Action`, `Entity`, `Old Value`, and `New Value` for all financial and production operations.

---

## 4. Phased Implementation Roadmap

```
├── Milestone 1: Core Financial & Indian GST Infrastructure (Phases 1 - 7)
│   ├── Phase 1: State Codes, Multi-GSTIN Company Registration & HSN/SAC Masters
│   ├── Phase 2: Place of Supply & Centralized GST Tax Calculation Engine
│   ├── Phase 3: Statutory Invoicing, Credit & Debit Notes (Sec 34)
│   ├── Phase 4: e-Invoice (INV-01) IRP Gateway & Signed QR Code Generator
│   ├── Phase 5: e-Way Bill (NIC Part-A/Part-B) Gateway Integration
│   ├── Phase 6: GSTR-1, GSTR-3B Return Engines & JSON Exporters
│   └── Phase 7: GSTR-2B Purchase Auto-Reconciler & ITC Ledger
│
├── Milestone 2: Industrial Manufacturing, MRP & Quality Control (Phases 8 - 11)
│   ├── Phase 8: Multi-Level BOM, Routings, Work Centers & Production Work Orders
│   ├── Phase 9: Material Requirements Planning (MRP) Engine & Demand Explosion
│   ├── Phase 10: Quality Control (IQC, IPQC, PQC), Inspection Specs, NCR & CAPA
│   └── Phase 11: Complete Forward & Backward Batch / Lot / Serial Traceability
│
├── Milestone 3: Supply Chain, Job Work & Operations (Phases 12 - 17)
│   ├── Phase 12: Multi-Bin Warehouse Management & FIFO/Moving Avg Valuation
│   ├── Phase 13: Procurement Lifecycle (Requisition ➔ RFQ ➔ Comparison ➔ PO ➔ GRN)
│   ├── Phase 14: Sales Order Management & Fulfillment Pipeline
│   ├── Phase 15: Subcontracting & Job Work (Rule 45 Challans & Reconciliation)
│   ├── Phase 16: Asset Master & Preventive/Corrective Maintenance Engine
│   └── Phase 17: Shop-Floor MES Operator Station & Real-Time Event Logging
│
└── Milestone 4: Enterprise Costing, Governance & Verification (Phases 18 - 20)
    ├── Phase 18: Product Costing Engine (Standard vs Actual Variance Analysis)
    ├── Phase 19: Multi-Tier Dynamic Approval Workflow Engine
    ├── Phase 20: Tamper-Evident Audit Logging, Financial Immutability & Test Suite
```

---

## 5. Verification & Test Strategy Matrix

| Test Suite | Scope | Target Verification Criteria |
|---|---|---|
| **GST Tax Engine Suite** | Intra vs Inter-State, Cess, RCM | Verified against 100+ tax combinations (5%, 12%, 18%, 28%, Cess, Exempt, RCM) with zero cent/paisa rounding errors. |
| **e-Invoice & e-Way Suite**| IRP Sandbox & Signed QR | Validated against official NIC/IRP test schemas; verified QR decoding and signature authenticity. |
| **GSTR-1/3B Returns Suite**| Return aggregation | Verified against GSTN offline tool JSON schemas with 100% field mapping accuracy. |
| **GSTR-2B Reconciler Suite**| Purchase matching | Verified across 500+ mock invoice variations (Exact match, tolerance mismatch, missing records). |
| **MRP & BOM Explosion** | 5-level deep BOM structure | Verified recursive BOM explosion, lead time offset calculations, and shortage purchase recommendations. |
| **Genealogy Traceability** | Raw material to FG batch | Verified bidirectional instant tree generation from Raw Material Heat No. to Dispatch Invoices. |
| **Non-Regression Suite** | Existing jshERP workflows | Verified all existing retail, inventory transfer, billing, and system admin flows continue operating seamlessly. |

---

## 6. Next Steps & Approval Request

This plan establishes a clear, reference-driven roadmap to transform jshERP into a commercial, industrial-grade Indian Manufacturing ERP. 

Upon your approval, we will proceed immediately with **Milestone 1 (Phases 1 to 7: Core Financial & Indian GST Infrastructure)**.
