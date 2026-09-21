# Indian Statutory & Regulatory Inventory Requirements

## 1. Statutory vs Business Practice Classification

In Indian ERP systems, conflating statutory legal requirements with ERP conventions leads to compliance failures or unnecessary bloat. Below is the strict classification:

| Requirement Area | Nature | Governing Law / Standard | Specific Mandate |
|---|:---:|---|---|
| **Delivery Challan for Transportation** | **STATUTORY** | Rule 55 of CGST Rules 2017 | Mandatory document for transportation of goods without invoice (e.g. Job work, branch transfer without invoice, return of rejected goods, supply of liquid gas). Triplicate format (Original for Consignee, Duplicate for Transporter, Triplicate for Consignor). Consecutive financial-year numbering (max 16 characters). |
| **Job Work / Subcontracting Challan** | **STATUTORY** | Section 143 & Rule 45 of CGST Act | Outward material must move under Rule 45 delivery challan containing HSN, description, quantity, value, tax rate, and both GSTINs. Quarterly return in **Form GST ITC-04**. |
| **Job Work Statutory Time Limit** | **STATUTORY** | Section 143(1) of CGST Act | Inputs sent to job worker must be brought back or sold within **1 year** (extendable by Commissioner by 1 year). Capital goods within **3 years** (extendable by 2 years). If exceeded, it is deemed a **Taxable Supply** by principal on the original date with interest! |
| **ITC Reversal on Lost / Damaged / Scrap Goods** | **STATUTORY** | Section 17(5)(h) of CGST Act | Input Tax Credit (ITC) must be **reversed** in GSTR-3B (Table 4B) for goods lost, stolen, destroyed, written off, or disposed of as free samples. ERP stock write-off must flag ITC reversal. |
| **Interstate Branch Stock Transfers** | **STATUTORY** | Section 7(1)(c) read with Schedule I of CGST Act | Transfer between branches in different states (distinct persons) is a **Deemed Taxable Supply** even if without consideration. Must issue GST Tax Invoice (Rule 46) + E-Way Bill (Rule 138). |
| **Intrastate Depot Transfers** | **BUSINESS / STATUTORY** | Rule 55 & Rule 138 | Transfer within same state and GSTIN is not taxable, but requires Rule 55 Delivery Challan and E-Way Bill if consignment value > ₹50,000. |
| **Inventory Valuation Standards** | **ACCOUNTING STANDARD** | AS-2 (ICAI) / Ind AS 2 | Inventories must be valued at the **Lower of Cost and Net Realizable Value (NRV)**. Cost formulas permitted: **FIFO** or **Weighted Average**. **LIFO is strictly prohibited**. |
| **Landed Cost Capitalization** | **ACCOUNTING STANDARD** | Ind AS 2 paragraph 11 | Cost of purchase must include purchase price, import duties, non-recoverable taxes, freight, handling, and other costs directly attributable to the acquisition of finished goods, materials, and services. |
| **Multi-Bin Locators** | **ERP CONVENTION** | None (Internal Control) | Not required by law. Used purely for warehouse efficiency. |
| **Multi-Level BOM** | **ERP CONVENTION** | None (Manufacturing Standard) | Standard industrial engineering practice. |

---

## 2. Mandatory Data Fields for Indian Logistics & Job Work

### 2.1 Rule 45 / Rule 55 Delivery Challan
1. Date and number of the delivery challan (gapless, $\le 16$ characters, FY format).
2. Name, address, and GSTIN of the consignor (if registered).
3. Name, address, and GSTIN or Unique Identity Number of the consignee (job worker or receiving depot).
4. Harmonised System of Nomenclature (HSN) code and description of goods.
5. Quantity (provisional, where the exact quantity being supplied is not known).
6. Taxable value.
7. Tax rate and tax amount (CGST, SGST, IGST, Cess) — indicated for information purposes on job work challans.
8. Place of supply (in case of inter-State movement).
9. Signature or digital signature of the consignor.

---

## 3. Implications for Our Target Architecture
* **Rule 55 Delivery Challan Generator**: Already partially built in [`DeliveryChallanService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DeliveryChallanService.java). Must be extended to support Job Work dispatches and inter-depot transfers.
* **ITC Reversal Trigger on Stock Scrap**: When inventory is written off or scrapped (`sub_type='其它出库'` or `SCRAP`), the system must record the input tax to be reversed in `erp_gst_adjustment_allocation` for GSTR-3B Table 4B compliance.
* **1-Year Job Work Aging Ledger**: Subcontracting must track days elapsed since challan issue date and warn at 9 months (270 days) to prevent deemed supply tax penalties.
