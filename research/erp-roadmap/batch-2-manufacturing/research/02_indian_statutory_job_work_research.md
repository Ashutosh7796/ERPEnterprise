# Indian Statutory Research: Job Work, Subcontracting & Challan Compliance
**Statutory Basis:** Central Goods and Services Tax (CGST) Act, 2017 (Sections 19 & 143) and CGST Rules, 2017 (Rules 45, 55, & 138)  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Context:** Indian Enterprise ERP Modernization — Phase 2 (Batch 2)  

---

## 1. Statutory Classification Framework

To avoid confusion between mandatory law and software conventions, all job-work and subcontracting requirements are strictly classified into four tiers:

```
+----------------------------------------------------------------------------------------------------+
|                                    REQUIREMENT CLASSIFICATION                                      |
+--------------------------+-------------------------------------------------------------------------+
| Category                 | Definition & Scope                                                      |
+--------------------------+-------------------------------------------------------------------------+
| [STATUTORY]              | Explicit legal requirement under the CGST Act / CGST Rules. Non-         |
|                          | compliance results in tax penalties, interest, and loss of ITC.         |
| [BUSINESS REQUIREMENT]   | Necessary operational control for manufacturing efficiency (e.g. scrap  |
|                          | reconciliation, job worker inventory tracking, process costing).        |
| [ERP CONVENTION]         | Architectural design choices to model physical and accounting flows     |
|                          | cleanly (e.g. virtual bins, document numbering patterns).               |
| [OPTIONAL]               | Advanced capabilities deferred to prevent overengineering.              |
+--------------------------+-------------------------------------------------------------------------+
```

---

## 2. Statutory Legal Analysis (CGST Act & Rules)

### 2.1 Section 143 of the CGST Act, 2017 — Job Work Procedure
Section 143 permits a registered person ("the principal") to send inputs or capital goods to a job worker without payment of tax under cover of a delivery challan.

#### Statutory Return Deadlines:
1. **Inputs and Semi-Finished Goods:**
   - Must be brought back to the principal's place of business or supplied from the job worker's premises within **one year** from the date of sending out.
   - Extendable by the Commissioner for a further period not exceeding **one year** upon sufficient cause being shown.
2. **Capital Goods (Moulds, Dies, Jigs, Fixtures, Tools, Machinery):**
   - Must be brought back within **three years** from the date of sending out.
   - Extendable by the Commissioner for a further period not exceeding **two years**.
   - *Statutory Exemption:* Under Section 143(1) proviso, moulds, dies, jigs, and fixtures sent for job work are **exempt** from the 3-year return requirement if worn out or consumed in production.

#### Legal Consequence of Non-Return (Deemed Supply):
> [!WARNING]
> **Section 143(3) & 143(4) Statutory Trap:**
> If inputs are not returned within **1 year** (or capital goods within **3 years**), it is deemed by law that such inputs or capital goods were **supplied by the principal to the job worker on the very day they were originally sent out**.
> - The principal must pay GST on the original value, along with **applicable interest under Section 50 from the date of the original delivery challan**.
> - The software must record the **exact statutory due date** on each challan line and provide proactive advance warning before expiry. Hardcoding a generic "365 days" is legally incorrect because capital goods have a 3-year limit and Commissioner extensions may alter the statutory date.

### 2.2 Rule 55 of the CGST Rules, 2017 — Mandatory Delivery Challan Particulars
Transportation of goods for job work must execute under a Delivery Challan containing mandatory statutory particulars:
- Consecutive serial number not exceeding 16 characters in one or multiple series containing only letters, numerals, and special characters (`-` and `/`).
- Date of issue of the delivery challan.
- Name, address, and GSTIN of the consignor (principal).
- Name, address, and GSTIN / Unique ID of the consignee (job worker).
- Harmonised System of Nomenclature (HSN) code and description of goods.
- Quantity (provisional where exact quantity is not known).
- Taxable value of goods.
- Tax rate and tax amount (CGST, SGST, IGST) calculated for statutory reporting purposes (even though tax is not collected on the movement).
- Place of supply (in case of inter-state movement).
- Reason for transportation: Must explicitly state **"Job Work"**.
- Signature or digital signature of the consignor.

### 2.3 Rule 45 of the CGST Rules, 2017 & Form GST ITC-04
- Rule 45 mandates that delivery challan details of goods sent to and received from job workers must be reported periodically in **Form GST ITC-04**:
  - For taxpayers with aggregate turnover $> \text{₹}5 \text{ Cr}$: Half-yearly (April–September, October–March).
  - For taxpayers with aggregate turnover $\le \text{₹}5 \text{ Cr}$: Annually.
- Form GST ITC-04 requires cross-referencing:
  - Table 1: Goods sent to job worker (Challan No, Date, Description, UOM, Quantity, Taxable Value).
  - Table 2: Goods received back from job worker (Original Challan No, Return Challan No, Qty received back, Qty lost/destroyed/scrap).

### 2.4 Section 143(5) — Waste and Scrap Generated at Job Worker
- Any waste and scrap generated during job work may be:
  1. Returned to the principal along with finished goods.
  2. Supplied directly from the job worker's premises on payment of applicable GST (by the job worker if registered, or by the principal if the job worker is unregistered).

### 2.5 Rule 138 — E-Way Bill Readiness
- An E-Way Bill must be generated on the government portal prior to movement:
  - Intra-State: Mandatory if consignment value exceeds threshold (typically $\text{₹}50,000$, or state-specific threshold like $\text{₹}1,00,000$ in Maharashtra).
  - Inter-State: **Mandatory irrespective of value** when goods are sent by a principal in one State to a job worker in another State (Rule 138(1) third proviso).

---

## 3. Statutory vs Business vs ERP Breakdown

| Feature / Requirement | Classification | Legal / Operational Basis | System Design Implication |
| :--- | :--- | :--- | :--- |
| **Rule 55 Challan Generation** | `[STATUTORY]` | CGST Rule 55 | Generated via existing `DeliveryChallanService` with `challan_type='JOB_WORK'`. |
| **16-Char Serialized FY Numbering** | `[STATUTORY]` | CGST Rule 55 | Managed by Batch 1 `DocumentNumberService` (`JWC/2627/0001`). |
| **Statutory Due Date Tracking** | `[STATUTORY]` | CGST Section 143(1) | Store explicit `statutory_due_date` (`challan_date + 1 year` for inputs, `+ 3 years` for capital goods, or extended date). |
| **Deemed Supply Expiry Alert** | `[STATUTORY]` | CGST Section 143(3),(4) | Proactive dashboard alert at 60 days, 30 days, and 0 days prior to statutory due date. |
| **Form GST ITC-04 Export** | `[STATUTORY]` | CGST Rule 45 | JSON/Excel export matching government schema linking Outward Challan $\leftrightarrow$ Inward Receipt. |
| **Job Worker Inventory Tracking** | `[BUSINESS REQUIREMENT]` | Stock control & custody | Dedicated virtual storage location per job worker (`JW-LOC-<SupplierID>`) in `erp_depot_bin`. |
| **Job Worker Service Invoice (SAC 9988)** | `[BUSINESS REQUIREMENT]` | Subcontracting Cost Absorption | Job worker bills processing charges (e.g. SAC 998811 for metal manufacturing) via GST Purchase Invoice; cost added to FG value. |
| **Scrap / Wastage Reconciliation** | `[BUSINESS REQUIREMENT]` | Mass balance control | Compares raw material sent vs (processed parts returned + declared scrap returned). |
| **Virtual Depot-Bin Transit Model** | `[ERP CONVENTION]` | Inventory integrity | Raw material moved from Stores to Job Worker Bin using `StockMutationService.recordMovement()`. |
| **Commissioner Extension Filing** | `[OPTIONAL]` | CGST Section 143(1) | Manual field to update `statutory_due_date` with Commissioner order reference. Automated portal filing out of scope. |
| **Multi-Tier Forwarding** | `[OPTIONAL]` | CGST Section 143(1)(a) | Job worker 1 sending to Job worker 2 deferred to Phase 3. |

---

## 4. End-to-End Indian Job Work Workflow

```
[1. WORK ORDER / SUBCONTRACTING ORDER]
      │
      ▼
[2. OUTWARD CHALLAN GENERATION]
      ├── Calls: DeliveryChallanService.createDeliveryChallan()
      │     - Type: JOB_WORK
      │     - Number: JWC/2627/0001
      │     - Reason: "Job Work"
      ├── Determines Statutory Due Date:
      │     - Input / Semi-finished: Issue Date + 1 Year
      │     - Capital Goods: Issue Date + 3 Years
      ├── Generates E-Way Bill Payload (Inter-state mandatory irrespective of value)
      └── Mutates Stock via Batch 1 Authority:
            StockMutationService.recordMovement(RM, Stores, -Qty)
            StockMutationService.recordMovement(RM, JW_Virtual_Bin, +Qty)
      │
      ▼
[3. STATUTORY AGING & MONITORING (Section 143)]
      ├── Real-time ledger of raw materials lying at job worker premises
      ├── Days remaining countdown towards statutory due date
      └── If overdue: Deemed supply warning (flags need for tax invoice & GST payment)
      │
      ▼
[4. INWARD RETURN RECEIPT]
      ├── Records processed goods returned
      ├── Reconciles raw material consumed vs returned scrap vs process loss
      ├── Mutates Stock via Batch 1 Authority:
      │     StockMutationService.recordMovement(RM, JW_Virtual_Bin, -ConsumedQty)
      │     StockMutationService.recordMovement(Processed_Part, Plant_WIP/Stores, +ReceivedQty)
      └── Records job work processing charge invoice (SAC 9988) into finished goods valuation
```
