# 06 — Manufacturing Readiness: Current-State Audit

## 1. Executive Summary
This document audits the existing assembly and disassembly capabilities in the codebase to evaluate whether the current ERP can support discrete or process manufacturing workflows without foundational upgrades.

---

## 2. Current "Assembly" and "Disassembly" Capabilities

The ERP currently provides two legacy inventory bills:
1. **Assembly Bill (`组装单`)**:
   - **Frontend UI:** [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx) (`subType="组装单"`, `title="Assembly Bills"`).
   - **Backend Type:** `type='入库'`, `sub_type='组装单'`.
   - **Line Items (`erp_depot_item`):**
     - One line tagged `material_type='组合件'` (The assembled finished good).
     - One or more lines tagged `material_type='普通子件'` (The components consumed).
   - **Stock Calculation (`DepotItemMapperEx.xml`):**
     - Finished good: increases stock (`assemInTotal`).
     - Sub-components: decreases stock (`assemOutTotal`).

2. **Disassembly Bill (`拆卸单`)**:
   - **Frontend UI:** [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx) (`subType="拆卸单"`, `title="Disassembly Bills"`).
   - **Backend Type:** `type='出库'`, `sub_type='拆卸单'`.
   - **Stock Calculation (`DepotItemMapperEx.xml`):**
     - Main good: decreases stock (`disAssemOutTotal`).
     - Child parts: increases stock (`disAssemInTotal`).

---

## 3. The 10 Critical Gaps Blocking Real Manufacturing

| # | Missing Manufacturing Capability | Current Codebase Status | Impact on Production Operations |
|---|---|:---:|---|
| **1** | **Bill of Materials (BOM) Master** | **MISSING** | No master template. Operator must manually pick each raw material line item from scratch every time they assemble! |
| **2** | **Multi-Level BOM Explosion** | **MISSING** | Cannot define Sub-Assemblies $\rightarrow$ Finished Goods hierarchy. |
| **3** | **BOM Versioning & Revisions** | **MISSING** | Cannot track engineering change orders (`Rev 1.0` vs `Rev 1.1`). |
| **4** | **Component Scrap & Yield %** | **MISSING** | Does not account for machining scrap, cut losses, or chemical yield loss. |
| **5** | **Work Centers & Routing** | **MISSING** | No concept of Machines, Labor Hours, Hourly Rates, or Sequential Operations. |
| **6** | **Work-in-Progress (WIP) Location** | **MISSING** | Components are consumed immediately upon bill save; cannot track inventory sitting on the shop-floor during a 5-day manufacturing cycle. |
| **7** | **Work Orders / Production Orders** | **MISSING** | No formal production order authorizing factory production against a Sales Order or stock policy. |
| **8** | **Job Cards / Operator Stations** | **MISSING** | Cannot dispatch work to individual operators or log progress. |
| **9** | **Manufacturing Cost Roll-Up (Absorption)**| **MISSING** | Finished good cost is simply the sum of raw material purchase prices; zero labor, electricity, or machine overhead is absorbed into FG asset value. |
| **10**| **Subcontracting / Job Work (Rule 45)** | **MISSING** | Cannot track raw materials sent to 3rd party vendors for heat treatment, plating, or machining under Indian GST challans. |

---

## 4. Current-State Verdict: NOT READY FOR MANUFACTURING

> [!CAUTION]
> **Definitive Conclusion:** The current ERP is **NOT ready** for immediate manufacturing implementation.
> Attempting to implement Multi-Level BOMs and Work Orders without first establishing an **Immutable Stock Ledger** and a **Bin/WIP Location model** would build complex production logic on an unstable, scan-based inventory foundation.
