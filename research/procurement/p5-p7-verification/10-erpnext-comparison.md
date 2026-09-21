# 10 - Implementation Reference Comparison: Frappe / ERPNext (India)

**Document Ref**: `PROC-P5-P7-REF-ERPNEXT-10`  
**Evaluation Date**: August 2026  
**Status**: **SOURCE-VERIFIED ARCHITECTURAL COMPARISON**  

---

## 1. Verified Source Repositories & Modules Inspected

- **Repository**: `https://github.com/frappe/erpnext` & `https://github.com/resilient-tech/india-compliance`
- **Inspected Modules & Files**:
  1. `erpnext/stock/doctype/landed_cost_voucher/landed_cost_voucher.py`: Multi-receipt Landed Cost Voucher calculation engine (`distribute_charges_based_on_qty_amount_and_weight`).
  2. `erpnext/accounts/doctype/purchase_invoice/purchase_invoice.py`: `Stock Received But Not Billed` GL posting, 3-Way Match validation, Purchase Price Variance (PPV) accounting.
  3. `erpnext/accounts/doctype/tax_withholding_category/tax_withholding_category.py`: Threshold tracking for Section 194Q / 206C(1H).
  4. `erpnext/regional/india/utils.py`: Indian regional tax engine, GSTR-2B reconciliation, MSME classification, and payment tracking.

---

## 2. Deep Technical Comparison

### 2.1 Landed Cost Engine Comparison

```python
# ERPNext Reference: landed_cost_voucher.py
# Charges distributed by Valuation Rate / Weight / Quantity:
if based_on == "Qty":
    item.applicable_charges = flt(item.qty) * cost_per_qty
elif based_on == "Amount":
    item.applicable_charges = flt(item.amount) * cost_per_amount
elif based_on == "Distribute Manually":
    item.applicable_charges = flt(item.applicable_charges)
```

* **Enterprise P5 Alignment**:
  - P5 implements identical exact distribution algorithms:
    - $\text{Amount (Taxable Value)}$
    - $\text{Net Weight (kg)}$
    - $\text{Quantity (Units)}$
  - Updates material moving average unit cost on `erp_material_current_stock` while posting balanced clearing entries to `2106 Landed Cost Clearing Account`.

### 2.2 GRNI Accrual & Invoice Clearing

* **ERPNext Model**:
  - Purchase Receipt posts: `Dr Stock in Hand`, `Cr Stock Received But Not Billed`.
  - Purchase Invoice posts: `Dr Stock Received But Not Billed`, `Dr Taxes and Charges`, `Cr Creditors`.
* **Enterprise P5 Alignment**:
  - Identical standard: `1401 Inventory Asset` $\leftrightarrow$ `2105 GRNI Accrual` $\leftrightarrow$ `2101 Accounts Payable`.

### 2.3 Tax Withholding (TDS 194Q) & Threshold Tracking

* **ERPNext Model**:
  - Maintains `Tax Withholding Category` with cumulative fiscal year threshold tracking (`cumulative_threshold = 5,000,000`). Deducts tax once cumulative total crosses ₹50 Lakhs.
* **Enterprise P6 Alignment**:
  - Tracks cumulative purchase value per supplier in current financial year.
  - Automatically calculates 0.1% TDS on incremental amount exceeding ₹50L.
  - Verifies PAN validity (206AA $\rightarrow$ 5% rate).

### 2.4 MSME Section 43B(h) Engine

* **ERPNext Model (India Compliance App)**:
  - Records Udyam Registration Number, MSME Type (`Micro`, `Small`, `Medium`).
  - Sets payment terms based on 15/45-day statutory rules.
  - Generates Section 43B(h) overdue report for year-end tax audits.
* **Enterprise P6 Alignment**:
  - Strictly follows MSMED Sec 15 rules; restricts 43B(h) benefits to Micro and Small manufacturing/service entities, excluding wholesale/retail traders in accordance with Ministry Office Memorandums.
