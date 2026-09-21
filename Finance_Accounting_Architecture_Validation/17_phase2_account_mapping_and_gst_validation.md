# Phase 2 Validation: Account Mapping Matrix, GST Engine & Bank Resolution

**Auditor:** Senior ERP Architect & Accounting Systems Auditor  
**Scope:** Definitive source-to-account mapping table, GST integration validation, and settlement account resolution.

---

## 1. Authoritative Account Mapping Matrix

| Posting Line | Account Source / Purpose | Existing Codebase Mechanism | New Mechanism Required? |
| :--- | :--- | :--- | :--- |
| **Trade Receivable (Debtor)** | Customer Control Account (`1220`) | `Supplier.all_need_get` tracks party AR; mapped to default COA code `1220`. | **No** (Directly lookup `1220` in `erp_account_coa` with `party_type='CUSTOMER'`). |
| **Trade Payable (Creditor)** | Vendor Control Account (`2320`) | `Supplier.all_need_pay` tracks party AP; mapped to default COA code `2320`. | **No** (Directly lookup `2320` in `erp_account_coa` with `party_type='SUPPLIER'`). |
| **Domestic Sales Revenue** | Taxable outward sales (`3110`) | `GstSalesInvoiceService` calculates taxable line value; defaults to `3110`. Category-level override via `MaterialCategory.coa_account_id` if present. | **No** (Simple explicit resolution from COA code `3110`). |
| **Export Sales Revenue** | Export / Zero-Rated (`3120`) | `GstSalesInvoiceService` detects export transaction flag (`EXPORT_LUT` / `EXPORT_TAX`). | **No** (Map to COA code `3120` when export flag is true). |
| **Purchase / Inventory** | Inward Goods Acquisition (`4110` / `1211`) | `DepotItem.unit_price * quantity`; defaults to `4110` (COGS) or `1211` (Raw Material Stock). | **No** (Map to COA code `4110` or `1211`). |
| **Operating Expense** | Administrative & Direct Expenses (`4510`-`4550`) | `InOutItem` table defines expense categories (Rent, Power, Audit, Repairs). Linked to `in_out_item_id`. | **Minor Enhancement** (Optional `coa_account_id` column on `erp_in_out_item` for custom expense mapping). |
| **Input CGST (ITC)** | Central Tax Credit Asset (`1251`) | `GSTTaxCalculationResultDto.cgstAmount` (Electronic Credit Ledger). | **No** (Directly lookup `1251` in `erp_account_coa`). |
| **Input SGST (ITC)** | State Tax Credit Asset (`1252`) | `GSTTaxCalculationResultDto.sgstAmount` (Electronic Credit Ledger). | **No** (Directly lookup `1252` in `erp_account_coa`). |
| **Input IGST (ITC)** | Integrated Tax Credit Asset (`1253`) | `GSTTaxCalculationResultDto.igstAmount` (Electronic Credit Ledger). | **No** (Directly lookup `1253` in `erp_account_coa`). |
| **Output CGST** | Central Tax Liability (`2331`) | `GSTTaxCalculationResultDto.cgstAmount` (Electronic Liability Ledger). | **No** (Directly lookup `2331` in `erp_account_coa`). |
| **Output SGST** | State Tax Liability (`2332`) | `GSTTaxCalculationResultDto.sgstAmount` (Electronic Liability Ledger). | **No** (Directly lookup `2332` in `erp_account_coa`). |
| **Output IGST** | Integrated Tax Liability (`2333`) | `GSTTaxCalculationResultDto.igstAmount` (Electronic Liability Ledger). | **No** (Directly lookup `2333` in `erp_account_coa`). |
| **Operating Bank** | Specific Bank GL Head (`1232` or custom) | `erp_account` (Bank Account master) linked to `AccountHead.account_id`. | **Minor Enhancement** (Add optional `coa_account_id` on `erp_account` or fallback to `1232`). |
| **Cash Drawer** | Cash on Hand (`1231`) | `erp_account` (Cash Account master) linked to `AccountHead.account_id`. | **Minor Enhancement** (Add optional `coa_account_id` on `erp_account` or fallback to `1231`). |
| **Customer Advance** | Advance Liability Head (`2339`) | `AccountHead.type = 'Receive Advance Payment'` updates `Supplier.advance_in`. | **No** (Directly lookup `2339` in `erp_account_coa`). |
| **Fractional Round-off** | Rupee Rounding (`4560`) | Calculated as $\text{Gross (rounded)} - \sum(\text{Taxable} + \text{Taxes})$. | **No** (Directly lookup `4560` in `erp_account_coa`). |

---

## 2. GST Tax Calculation Integration Validation

### 2.1. Direct Ingestion from `GSTTaxCalculationEngine`
The General Ledger Posting Service must **never recompute taxes**. It strictly consumes the authoritative tax breakdown produced by `GSTTaxCalculationEngine` and serialized in `DocumentTaxSnapshot`:

1. **Intrastate Commercial Sale (e.g. Maharashtra to Maharashtra, 18% GST on ₹100,000):**
   * $\text{Dr 1220 Trade Receivables (Customer)}$: ₹118,000.00
   * $\text{Cr 3110 Domestic Sales Revenue}$: ₹100,000.00
   * $\text{Cr 2331 Output CGST (9\%)}$: ₹9,000.00
   * $\text{Cr 2332 Output SGST (9\%)}$: ₹9,000.00
   * *Balance Validation:* $\text{Total Dr (118,000)} = \text{Total Cr (118,000)}$.

2. **Interstate Commercial Sale (e.g. Maharashtra to Gujarat, 18% GST on ₹100,000):**
   * $\text{Dr 1220 Trade Receivables (Customer)}$: ₹118,000.00
   * $\text{Cr 3110 Domestic Sales Revenue}$: ₹100,000.00
   * $\text{Cr 2333 Output IGST (18\%)}$: ₹18,000.00
   * *Balance Validation:* $\text{Total Dr (118,000)} = \text{Total Cr (118,000)}$.

3. **Exempt / Nil-Rated Sale (e.g. Agricultural Produce or Export under LUT):**
   * $\text{Dr 1220 Trade Receivables (Customer)}$: ₹100,000.00
   * $\text{Cr 3120 Export / Exempt Sales}$: ₹100,000.00
   * *Zero Tax Lines:* No CGST, SGST, or IGST lines are generated, preventing any phantom liability.

4. **Eligible Purchase with Input Tax Credit (ITC):**
   * $\text{Dr 4110 Purchases / 1211 Raw Materials}$: ₹50,000.00
   * $\text{Dr 1251 Input CGST (9\%)}$: ₹4,500.00
   * $\text{Dr 1252 Input SGST (9\%)}$: ₹4,500.00
   * $\text{Cr 2320 Trade Payables (Supplier)}$: ₹59,000.00
   * *Balance Validation:* $\text{Total Dr (59,000)} = \text{Total Cr (59,000)}$.

5. **Ineligible / Blocked ITC Purchase under Section 17(5) (e.g. Food, Motor Vehicles):**
   * When `ProductTaxProfile.itc_eligibility = 'INELIGIBLE'`, tax amount is capitalized directly into the purchase cost:
   * $\text{Dr 4520 Operating Expense (Total including non-creditable GST)}$: ₹59,000.00
   * $\text{Cr 2320 Trade Payables (Supplier)}$: ₹59,000.00
   * *Result:* No Input Tax Credit asset is booked, protecting the business from statutory GST disallowance.

---

## 3. Bank and Cash Settlement Account Resolution

In the existing ERP, physical bank and cash accounts are managed in the `erp_account` table:
* `erp_account.id`
* `erp_account.name` (e.g., "HDFC Bank Current A/c - 0021", "Main Cash Register")
* `erp_account.current_amount` (Operational balance cache)

To bridge operational settlement accounts (`erp_account`) to the Chart of Accounts (`erp_account_coa`):
1. Add an optional column `coa_id` (bigint) to `erp_account`.
2. Resolution Order:
   * **Rule 1 (Explicit Mapping):** If `erp_account.coa_id` is populated and points to an active leaf node in `erp_account_coa`, use that specific GL account.
   * **Rule 2 (Fallback Convention):** If `erp_account.coa_id` is null:
     * If account name contains "Cash" or "Petty" $\implies$ fallback to `1231 Cash in Hand`.
     * Otherwise $\implies$ fallback to `1232 Primary Operating Bank Account`.
3. This eliminates hardcoded bank account assumptions while ensuring zero disruption for existing operational bank records.
