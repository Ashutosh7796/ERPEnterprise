# 02 - Procurement Phase P5: Landed Cost Capitalization & Valuation Verification

**Document Ref**: `PROC-P5-VERIF-02`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE STATUTORY & ACCOUNTING VERIFICATION**  

---

## 1. Statutory & Accounting Standards Baseline

### 1.1 Ind AS 2 / AS 2 (Inventories, Para 11)
> *"The cost of purchase of inventories comprise the purchase price, import duties and other taxes (other than those subsequently recoverable by the entity from the taxing authorities), and transport, handling and other costs directly attributable to the acquisition of finished goods, materials and services. Trade discounts, rebates and other similar items are deducted in determining the costs of purchase."*

### 1.2 Acquisition Cost Breakdown Matrix

| Cost Component | Accounting Treatment | Rationale & Statutory Citation | Classification |
| :--- | :--- | :--- | :--- |
| **Basic Purchase Price** | Capitalized to Inventory Asset | Direct cost of materials (Ind AS 2.11) | **CONFIRMED** |
| **Inward Freight & Carriage** | Capitalized to Inventory Asset | Direct acquisition transportation (Ind AS 2.11) | **CONFIRMED** |
| **Transit Insurance** | Capitalized to Inventory Asset | Necessary risk coverage in transit to depot | **CONFIRMED** |
| **Basic Customs Duty (BCD)** | Capitalized to Inventory Asset | Non-recoverable import duty (Customs Act, 1962) | **CONFIRMED** |
| **Social Welfare Surcharge (SWS)** | Capitalized to Inventory Asset | Non-recoverable customs surcharge | **CONFIRMED** |
| **Agriculture Infra Cess (AIDC)** | Capitalized to Inventory Asset | Non-recoverable import cess | **CONFIRMED** |
| **Port / Clearing & Forwarding (C&F)** | Capitalized to Inventory Asset | Direct terminal and handling costs | **CONFIRMED** |
| **Eligible Input GST (CGST/SGST/IGST)** | **Excluded** from Inventory (Input Tax) | Recoverable tax under CGST Act Section 16(2) | **CONFIRMED** |
| **Blocked GST (Section 17(5))** | Capitalized to Inventory Asset | Non-recoverable tax under CGST Act Sec 17(5) | **CONFIRMED** |
| **Demurrage / Detention Charges** | **Expensed** (Administrative/Penalty) | Abnormal storage costs (Ind AS 2.15(b)) | **CONFIRMED** |
| **Post-Receipt Storage Costs** | **Expensed** (Holding Cost) | Storage after arrival at warehouse (Ind AS 2.15) | **CONFIRMED** |
| **Financing / Supplier Credit Interest** | **Expensed** (Finance Costs) | Financing element excluded by Ind AS 2.18 | **CONFIRMED** |

---

## 2. Apportionment Methodologies

When a single Landed Cost Voucher (LCV) covers multiple line items or multiple Goods Receipts, the total acquisition cost must be apportioned using statutory and commercially sound metrics:

### 2.1 Apportionment Algorithms

1. **Apportionment by Value (Gross Taxable Amount)**:
   $$\text{Allocated Cost}_i = \text{Total Landed Charge} \times \left( \frac{\text{Taxable Value}_i}{\sum_{k=1}^n \text{Taxable Value}_k} \right)$$
   * *Applicable For*: Transit Insurance, Customs Clearing Fees, Stamp Duties, Inward Surcharges.
   * *Status*: **CONFIRMED**

2. **Apportionment by Net Weight**:
   $$\text{Allocated Cost}_i = \text{Total Landed Charge} \times \left( \frac{\text{Net Weight}_i}{\sum_{k=1}^n \text{Net Weight}_k} \right)$$
   * *Applicable For*: Inward Freight, Road Transport, Sea/Air Cargo weight tariffs.
   * *Status*: **CONFIRMED**

3. **Apportionment by Quantity (Units)**:
   $$\text{Allocated Cost}_i = \text{Total Landed Charge} \times \left( \frac{\text{Quantity}_i}{\sum_{k=1}^n \text{Quantity}_k} \right)$$
   * *Applicable For*: Unit-based handling, standard pallet tariffs, packaging fees.
   * *Status*: **CONFIRMED**

---

## 3. General Ledger Journal Posting Lifecycle

### 3.1 Landed Cost Voucher (LCV) Posting
When the Landed Cost Voucher is finalized and posted against one or more GRNs:

$$\text{Debit: Inventory Asset Account (1401)} \quad [\text{Total Apportioned Landed Cost}]$$
$$\text{Credit: Landed Cost Clearing / Accrual Account (2106)} \quad [\text{Total Landed Cost Amount}]$$

### 3.2 3rd Party Service Vendor Invoice Posting
When the freight carrier or customs broker submits their service invoice:

$$\text{Debit: Landed Cost Clearing Account (2106)} \quad [\text{Landed Cost Base Expense}]$$
$$\text{Debit: Input GST on Services (1301/1302/1303)} \quad [\text{GST on Freight/Customs Service}]$$
$$\text{Credit: Transporter / Customs Agent Accounts Payable (2101)} \quad [\text{Gross Vendor Bill}]$$

*Result*: The `2106 Landed Cost Clearing Account` nets out to zero, leaving the accurate capitalized cost in Inventory Asset (`1401`) and the exact payable liability in `2101`.

---

## 4. Complex Stock Scenarios & Edge Cases

### 4.1 Stock Already Dispatched / Sold (Consumption Delta)
* **Problem**: If 100 units were received under GRN-01, but 40 units were already sold and dispatched before the freight invoice arrived.
* **Accounting Requirement (Ind AS 2)**: Capitalizing 100% of the freight to the remaining 60 units would artificially inflate the unit cost beyond net realizable value (NRV).
* **Canonical Solution**:
  - $60\%$ of the freight is capitalized to `1401 Inventory Asset` (adjusting moving average for remaining 60 units).
  - $40\%$ of the freight is posted directly to `5101 Cost of Goods Sold (COGS)` to reflect the true cost of goods already dispatched.
* **Classification**: **CONFIRMED**

### 4.2 Partial Receipts & Multiple GRNs
* A single Landed Cost Voucher can link multiple GRNs (e.g. one container bill of lading covering 3 partial shipments).
* Costs are apportioned across all accepted lines in the selected GRNs based on the chosen apportionment formula.

### 4.3 Landed Cost Reversals & Cancellations
* If an LCV is cancelled before GL posting, it simply reverts to Draft.
* If cancelled after posting:
  - Generates a reversing GL voucher (`Dr Landed Cost Clearing 2106, Cr Inventory Asset 1401 / Cr COGS 5101`).
  - Recalculates the moving average unit cost on `erp_material_current_stock`.
