# 15 - Procurement Phases P5, P6 & P7 Master Test Plan

**Document Ref**: `PROC-P5-P7-TEST-PLAN-15-REV3`  
**Evaluation Date**: August 2026  
**Status**: **AUTHORITATIVE TEST SPECIFICATION**  

---

## 1. Master Test Suite Matrix

| Phase | Test Suite Class / File | Layer | Target Assertions & Statutory Verification |
| :--- | :--- | :--- | :--- |
| **P5** | `ProcurementP5_GrniAndAccountingPostingSecurityTest.java` | Backend (Spring / JUnit) | **COMPLETED & PASSING (6/6 Pass)**<br>1. GRNI Accrual posting on GRN acceptance (`Dr 1401, Cr 2105`).<br>2. GRNI clearing on Purchase Invoice posting (`Dr 2105, Cr 2101`).<br>3. Landed Cost value, weight, and quantity apportionment.<br>4. Consumption split: Landed cost on sold stock routes to COGS (`5101`).<br>5. Tenant isolation on GL journal entries.<br>6. Zero parallel GL tables verified. |
| **P5** | `ProcurementP5FrontendAccountingWorkflow.test.ts` | Frontend (Node / React) | **COMPLETED & PASSING (5/5 Pass)**<br>1. Apportionment algorithm accuracy (Value/Weight/Qty).<br>2. Ind AS 2 consumption split calculator.<br>3. Zero-balance clearing validation. |
| **P6** | `ProcurementP6_ApPaymentTdsAndMsmeSecurityTest.java` | Backend (Spring / JUnit) | 1. **TDS Law Versioning**: Resolves `Income-tax Act, 1961 — Section 194Q` (Reporting Form: `Form 26Q`) for dates $< \text{01-Apr-2026}$.<br>2. **TDS Law Versioning**: Resolves `Income-tax Act, 2025 — Section 393(1), Table 8(ii)` (Reporting Form: `Form 140`) for dates $\ge \text{01-Apr-2026}$.<br>3. Stores both old and new law references in `erp_tds_register`.<br>4. **10-Point Backend TDS Engine**: Validates buyer turnover ($> ₹10\text{ Cr}$), resident seller, goods scope, FY cumulative threshold ($> ₹50\text{ Lakhs}$), PAN status (Valid @ 0.1% vs No-PAN u/s 206AA @ 5.0%), lower deduction certificates, and statutory exemptions.<br>5. **Advance Accounting Sequence**: Proves $\sum \text{Dr} = \sum \text{Cr}$ for `Dr 1105 Advances / Cr 1002 Bank, Cr 2205 TDS Payable` and subsequent invoice offset `Dr 2101 AP / Cr 1105 Advances`.<br>6. **Payment Accounting Balance**: Proves $\text{Gross AP} = \text{Bank Payment} + \text{TDS Withheld} + \text{Cash Discount}$ with $\sum \text{Dr} = \sum \text{Cr}$.<br>7. **Authoritative MSME Engine**: Validates Micro/Small classification, 15-day / 45-day statutory due dates, trader exclusion, Section 43B(h) year-end disallowance categorization, and Section 16 penal interest (3x RBI rate).<br>8. **Tenant Isolation & Security**: Cross-tenant AP access blocked. |
| **P6** | `ProcurementP6FrontendApAndTdsWorkflow.test.ts` | Frontend (Node / React) | 1. FIFO multi-invoice allocation engine.<br>2. Over-allocation guard validation.<br>3. Dual-track TDS Law Version and Reporting Form badge presentation (`Form 26Q` vs `Form 140`).<br>4. MSME 15/45-day aging and Section 43B(h) risk badges (`COMPLIANT_PAID`, `WITHIN_LIMIT`, `OVERDUE_AT_RISK`, `DISALLOWED_43BH`).<br>5. Double-entry payment equality validator ($\sum \text{Dr} = \sum \text{Cr}$). |
| **P7** | `ProcurementP7_PurchaseReturnAndItcReversalSecurityTest.java` | Backend (Spring / JUnit) | 1. **Scenario A (Physical Return)**: Outbound Delivery Challan (Rule 55) & Commercial Return Note creation.<br>2. **ITC Reversal**: GL entry (`Cr 1301/1302/1303 Input Tax`) with component breakdown for GSTR-3B Table 4(B)(2).<br>3. **Blocked ITC Return**: Adjusts `1401 Inventory Asset` cost without touching input tax accounts for Sec 17(5) items.<br>4. **Scenario B (Price Dispute)**: Financial AP Debit Note without goods movement.<br>5. **Scenario C (RCM)**: Buyer self-debit note u/s 31(3)(f)/(g).<br>6. DAG edge registration (`PURCHASE_INVOICE -> PURCHASE_RETURN`). |
| **P7** | `ProcurementP7FrontendReturnItc.test.ts` | Frontend (Node / React) | 1. Return quantity over-return blocker.<br>2. Component tax reversal calculation (CGST/SGST/IGST).<br>3. Delivery Challan preview formatting (Rule 55). |

---

## 2. Regression Gate & Success Criteria
Phase P6 will be certified only when:
1. `mvn test "-Dtest=ProcurementP6_ApPaymentTdsAndMsmeSecurityTest"` in `ERPSystem-boot`: **100% Pass**.
2. All Procurement backend suites (`ProcurementP*SecurityTest`): **100% Pass**.
3. All Sales regression suites (`SalesS*SecurityTest`): **100% Pass**.
4. `npm test` in `ERPSystem-web-react`: **100% Pass** across all suites.
5. `npx tsc --noEmit`: **0 TypeScript compilation errors**.
