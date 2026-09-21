# Procurement P5: Assessment & Future Phase Integration Notes

**Audit Date**: 2026-08-21  
**Scope**: Read-only assessment of Phase P5 implementation, confirmation of zero blocking issues, and integration roadmap for Phase P6 (AP Settlement, TDS Law Versioning & MSME Section 43B(h)) and Phase P7 (Purchase Returns & Supplier Credit Notes).

---

## 1. P5 Implementation Assessment

| Audit Dimension | Requirement | Implementation Status | Verdict |
| :--- | :--- | :--- | :--- |
| **Canonical GL Reuse** | Reuse `erp_gl_journal_entry` and `erp_gl_journal_line` | Fully Integrated in `ProcurementAccountingPostingService` | **PASS** |
| **Single Stock Valuation Truth** | Zero secondary stock/valuation engine; update moving average on `erp_material_current_stock` & `erp_material_extend` | Directly updates canonical stock & moving average fields | **PASS** |
| **GRNI Accrual & Clearing** | Explicit transaction boundaries: GRN $\rightarrow$ Inventory/GRNI, Invoice $\rightarrow$ GRNI Clearing/GST/AP | Fully verified with PPV and Sec 17(5) blocked ITC capitalization | **PASS** |
| **Landed Cost Apportionment** | Value, Weight, Quantity algorithms with zero-loss penny balancing | Fully implemented and verified | **PASS** |
| **Ind AS 2 Consumption Split** | Split landed cost between on-hand asset capitalization and expensed COGS for sold stock | Implemented and verified | **PASS** |
| **Anti-Duplicate Protection** | Cannot create duplicate financial postings | Guarded by database CAS check | **PASS** |
| **Multi-Tenancy & DataScope** | Tenant isolation and RBAC preserved | Validated via dedicated security tests | **PASS** |
| **Test Verification** | 100% test pass rate across backend and frontend | Backend: 26/26 Pass, Frontend: 30/30 Pass | **PASS** |

**Conclusion**: Phase P5 satisfies 100% of accounting, statutory, and architectural constraints with **zero blocking bugs or functional discrepancies**.

---

## 2. Integration Notes for Phase P6 (AP Settlement, Advance & TDS)

When transitioning to Phase P6:
1. **TDS Law Versioning Integration**:
   - In P6, the invoice clearing posting service will hook into the TDS calculation engine:
     - For transactions prior to 1-Apr-2026: Income-tax Act, 1961 (Section 194Q).
     - For transactions on or after 1-Apr-2026: Income-tax Act, 2025 provisions.
   - When TDS is applicable, the invoice journal entry will split the credit:
     - `Cr 2205 TDS Payable` ($T_{\text{tds}}$)
     - `Cr 2101 Accounts Payable` ($\text{Gross} - T_{\text{tds}}$)
2. **Supplier Advance Clearing (Dr 2101 AP, Cr 1105 Supplier Advance)**:
   - AP settlement module in P6 will clear open purchase invoices against recorded advance payment vouchers.
3. **MSME Section 43B(h) Days-Payable Aging**:
   - P6 AP aging reports will calculate 15-day / 45-day statutory payment horizons based on supplier MSME classification.

---

## 3. Integration Notes for Phase P7 (Purchase Returns & ITC Reversals)

When transitioning to Phase P7:
1. **Pre-Invoice Return (Return of Accepted Goods before Invoicing)**:
   - Physical return documentation / delivery challan generates reversing GRNI accrual:
     - `Dr 2105 GRNI Accrual`
     - `Cr 1401 Inventory Asset`
2. **Post-Invoice Return (Return of Invoiced Goods)**:
   - Enforces the verified statutory model: Physical return $\rightarrow$ Commercial return / Delivery challan $\rightarrow$ Supplier GST Credit Note $\rightarrow$ Buyer ITC Reversal:
     - `Dr 2101 Accounts Payable (Creditors)`
     - `Cr 1401 Inventory Asset`
     - `Cr 1301 / 1302 / 1303 Input GST (ITC Reversal)`
