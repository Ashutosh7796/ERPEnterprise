# 14 - Procurement Phases P5, P6 & P7 Final Authoritative Design

**Document Ref**: `PROC-P5-P7-FINAL-DESIGN-14-REV3`  
**Evaluation Date**: August 2026  
**Status**: **AUTHORITATIVE DESIGN SPECIFICATION**  

---

## 1. Procurement Track P5: Canonical GL, GRNI & Landed Cost

### 1.1 Architecture & Core Design
- **Single Canonical General Ledger**: Reuses `erp_gl_journal_entry` and `erp_gl_journal_line`.
- **Single Valuation Engine**: Updates `erp_material_current_stock` (`current_unit_price`) and `erp_material_extend` (`purchase_decimal`).
- **GRN Physical Receipt**:
  $$\text{Debit: 1401 Raw Material \& Inventory Asset} \quad [Q_{\text{accepted}} \times P_{\text{PO}}]$$
  $$\text{Credit: 2105 Goods Received Not Invoiced (GRNI) Accrual} \quad [Q_{\text{accepted}} \times P_{\text{PO}}]$$
- **Purchase Invoice Clearing**:
  - `Dr 2105 GRNI Accrual` ($Q_{\text{inv}} \times P_{\text{PO}}$)
  - `Dr 1301/1302/1303 Input GST Recoverable` (Eligible ITC)
  - `Dr 1401 Inventory Asset` (Sec 17(5) Blocked ITC Capitalization)
  - `Dr/Cr 5105 Purchase Price Variance (PPV)` ($(P_{\text{inv}} - P_{\text{PO}}) \times Q_{\text{inv}}$)
  - `Dr/Cr 5901 Round Off Difference Account` (Sec 170 Rounding)
  - `Cr 2101 Supplier Accounts Payable` (Gross Total)
- **Landed Cost Apportionment & Ind AS 2 Consumption Split**:
  - Apportions freight, customs duty, transit insurance, clearing charges by `VALUE`, `WEIGHT`, or `QUANTITY`.
  - On-hand stock portion ($Q_{\text{curr}} \ge Q_{\text{rec}}$): 100% capitalized to `1401 Inventory Asset` and updates moving average unit price.
  - Consumed/sold stock portion: Proportional on-hand ratio to `1401 Inventory Asset`, remainder debited to `5101 Cost of Goods Sold (COGS)`.
  - `Cr 2106 Landed Cost Clearing Account`.

---

## 2. Procurement Track P6: AP Settlement, Advances, Date-Effective TDS & MSME 43B(h)

### 2.1 Date-Effective Income Tax TDS Law & Reporting Form Versioning

The ERP engine evaluates date-effective income tax provisions based on the earlier of invoice credit date or payment/advance disbursement date:

```mermaid
flowchart TD
    TX[Transaction Date / Credit Date / Advance Date] --> RESOLVE{Resolve Active Statutory Rule by Date}
    RESOLVE -->|Date < 01-Apr-2026| R1961[Law: Income-tax Act, 1961<br>Provision: Section 194Q<br>Reporting Form: Form 26Q<br>Threshold: ₹50 Lakhs<br>Base Rate: 0.1% | No-PAN Sec 206AA: 5.0%]
    RESOLVE -->|Date >= 01-Apr-2026| R2025[Law: Income-tax Act, 2025<br>Provision: Section 393-1, Table 8-ii<br>Reporting Form: Form 140<br>Threshold: ₹50 Lakhs<br>Base Rate: 0.1% | No-PAN Equivalent: 5.0%]
    
    R1961 --> CALC[Authoritative Backend TDS Determination Engine]
    R2025 --> CALC
```

#### Dual-Track Statutory Law Reference Matrix
| Attribute | Pre-01-Apr-2026 Regime | Post-01-Apr-2026 Regime | Stored Field in `erp_tds_register` |
| :--- | :--- | :--- | :--- |
| **Governing Law** | `Income-tax Act, 1961` | `Income-tax Act, 2025` | `law_version` |
| **Statutory Provision** | `Section 194Q` | `Section 393(1), Table 8(ii)` | `provision_ref` |
| **Higher Rate (No PAN)** | `Section 206AA` (5.0%) | `Section 397(2)` (5.0%) | `penalty_rate_ref` |
| **Higher Rate (Non-Filer)**| `Section 206AB` (5.0%) | `Section 397(2)` (5.0%) | `penalty_rate_ref` |
| **Lower/Nil Certificate** | `Section 197` | `Section 395` | `lower_cert_section_ref` |
| **Quarterly Statutory Return** | `Form 26Q` | `Form 140` | `reporting_form` |
| **Statutory Threshold in FY** | ₹50,00,000 (Resident Seller) | ₹50,00,000 (Resident Seller) | `threshold_amount` |
| **Normal Statutory Rate** | **0.1%** on excess | **0.1%** on excess | `tds_rate` |

### 2.2 10-Point Authoritative Backend TDS Determination
Frontend components only render previews; the backend `TdsDeterminationService` is the **sole authoritative source of truth**:
1. **Buyer Eligibility**: Checks buyer turnover in preceding FY $> ₹10\text{ Cr}$.
2. **Seller Residency**: Resident in India (Non-residents route to Section 195 / Section 395).
3. **Nature of Supply**: Purchase of Goods (Works/services route to Section 194C / 194J).
4. **FY Cumulative Threshold**: Aggregates all FY purchases from resident seller ($> ₹50\text{L}$).
5. **PAN Validation**: 10-digit PAN validation (Valid PAN $\rightarrow 0.1\%$; Invalid/No-PAN $\rightarrow 5.0\%$).
6. **Lower/Nil Deduction Certificate**: Section 197 / Section 397 certificate verification.
7. **Statutory Exemptions**: Exempt categories / public entities.
8. **TDS vs TCS Precedence**: Section 194Q / Section 393(1) overrides seller TCS (Section 206C(1H)).
9. **Earlier-of-Credit or Payment**: Trigger evaluation.
10. **TDS Register Output**: Creates record in `erp_tds_register` with law version, provision ref, reporting form (`Form 26Q` or `Form 140`), PAN, and withholding breakdown.

### 2.3 Advance Accounting Sequence & Double-Entry Proof
1. **Gross Advance Obligation**: Agreed advance amount $A_{\text{gross}}$.
2. **TDS Determination**: Deducted on gross advance if cumulative FY threshold crossed ($T_{\text{tds}} = A_{\text{gross}} \times R_{\text{tds}}$).
3. **Disbursement**: Net bank payment $P_{\text{bank}} = A_{\text{gross}} - T_{\text{tds}}$.
4. **Double-Entry Journal Entry**:
   $$\text{Debit: 1105 Supplier Advances \& Prepayments} \quad [A_{\text{gross}}]$$
   $$\text{Credit: 1002 Bank / Cash Account} \quad [P_{\text{bank}}]$$
   $$\text{Credit: 2205 TDS Payable} \quad [T_{\text{tds}}]$$
   $$\sum \text{DEBIT} = A_{\text{gross}} \quad=\quad \sum \text{CREDIT} = P_{\text{bank}} + T_{\text{tds}} = A_{\text{gross}} \quad (\Delta = ₹0.00)$$
5. **Subsequent Invoice Offset**:
   $$\text{Debit: 2101 Accounts Payable} \quad [A_{\text{gross}}]$$
   $$\text{Credit: 1105 Supplier Advances \& Prepayments} \quad [A_{\text{gross}}]$$
   $$\sum \text{DEBIT} = \sum \text{CREDIT} = A_{\text{gross}} \quad (\Delta = ₹0.00)$$

### 2.4 Payment Settlement Accounting & Double-Entry Proof
$$\text{Gross Settlement} = \text{Bank Payment} + \text{TDS Withheld} + \text{Cash Discount}$$

$$\text{Debit: 2101 Accounts Payable (Creditors)} \quad [\text{Gross Invoiced AP}]$$
$$\text{Credit: 1002 Bank / Cash Account} \quad [\text{Net Cash Paid}]$$
$$\text{Credit: 2205 TDS Payable} \quad [\text{TDS Withheld, if applicable}]$$
$$\text{Credit: 4205 Cash Discount Received} \quad [\text{Prompt Payment Rebate, if any}]$$
$$\sum \text{DEBIT} = \sum \text{CREDIT} \quad (\Delta = ₹0.00)$$

### 2.5 Authoritative MSME Compliance Engine (`MsmeComplianceService.java`)
`MsmeComplianceService` is the **authoritative backend source** for:
1. **Supplier Classification**: `MICRO`, `SMALL`, `MEDIUM`, `TRADER` (Traders excluded per OM 02/07/2021), `NON_MSME`.
2. **Day of Acceptance**: Delivery date or date objection resolved (Deemed Acceptance).
3. **Written Agreement Terms**: Evaluates agreed credit terms from master contract.
4. **Statutory Due Date**: $\min(\text{Agreed Days}, 45)$ with agreement; $15\text{ days}$ without agreement.
5. **Section 43B(h) Risk**: Categorizes risk (`COMPLIANT_PAID`, `WITHIN_LIMIT`, `OVERDUE_AT_RISK`, `DISALLOWED_43BH`).
6. **Section 16 Penal Interest**: Computes 3x RBI bank rate monthly compounded interest in `5802 Inadmissible Penal Interest` (`tax_deductible = FALSE`).

---

## 3. Procurement Track P7: Purchase Returns, Delivery Challans & ITC Reversal

### 3.1 Architecture
- **Scenario A (Physical Goods Return)**:
  - Outbound Delivery Challan under Rule 55 of CGST Rules in `erp_depot_head` (type `出库`, sub-type `采购退货`).
  - Restores open fulfillment balances on `erp_po_line_fulfillment`.
  - Reverses inventory moving average cost on `erp_material_current_stock`.
  - Reverses eligible input tax credit: `Dr 2101 AP, Cr 1401 Inventory Asset, Cr 1301/1302/1303 Input Tax Reversal`.
  - For Section 17(5) blocked ITC items: Reverses gross capitalized inventory cost `Dr 2101 AP, Cr 1401 Inventory Asset` without touching input tax accounts.
- **Scenario B (Commercial Price Dispute / No Goods Movement)**: Financial AP Debit Note `Dr 2101 AP, Cr 5105 Price Variance`.
- **Scenario C (Statutory Buyer RCM Debit Note u/s 31(3)(f)/(g))**: `Dr Expense, Cr 2201 Output Tax RCM Liability`.
- **DAG Lineage**: Registers `PURCHASE_INVOICE -> PURCHASE_RETURN` (`PURCHASE_RETURN_SETTLEMENT`).
