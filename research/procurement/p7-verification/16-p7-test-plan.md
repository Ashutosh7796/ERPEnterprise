# 16 - Procurement Phase P7: Comprehensive Test & Quality Assurance Plan

**Document Ref**: `PROC-P7-VERIF-16`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE TEST SUITE SPECIFICATION**  

---

## 1. Quality Assurance Objective
Ensure 100% test coverage across physical returns, commercial adjustments, Rule 55 delivery challan generation, moving average inventory valuation adjustments, Section 17(5) blocked credit segregation, double-entry canonical GL balance proofs, multi-tenant isolation, and GSTR-2B credit note matching.

---

## 2. Backend Integration Test Suite: `ProcurementP7_PurchaseReturnAndCreditNoteSecurityTest.java`

| Test Method / ID | Category | Test Assertion & Scenario | Expected Result |
| :--- | :--- | :--- | :--- |
| `testPhysicalPurchaseReturnLifecycle` (`P7-TEST-01`) | Functional / Lineage | Validates full Physical Return (Scenario A) against posted invoice; verifies Rule 55 Delivery Challan generation, inventory decrement, and DAG lineage edge creation. | **PASS (Doc created, stock reduced, DAG linked)** |
| `testQuantityInvariantEnforcement` (`P7-TEST-02`) | Mathematical Guard | Attempts to return quantity exceeding available depot stock OR exceeding original invoice quantity. | **PASS (Throws BusinessRunTimeException)** |
| `testDoubleEntryGlBalanceOnEligibleReturn` (`P7-TEST-03`) | GL Double-Entry | Verifies exact balance: $\text{Dr 2101 AP } [11800] = \text{Cr 1401 Inventory } [10000] + \text{Cr 1301 CGST } [900] + \text{Cr 1302 SGST } [900]$. | **PASS ($\sum \text{Debit} = \sum \text{Credit} = 11800.00$)** |
| `testSection17_5_BlockedItcReturn` (`P7-TEST-04`) | Statutory GST | Returns blocked asset (motor vehicle); asserts full gross amount credited to inventory asset with zero balance touching ITC accounts. | **PASS (Zero touch to 1301/1302/1303)** |
| `testReturnAfterFullPayment` (`P7-TEST-05`) | AP / Cash Flow | Returns goods on fully paid invoice; asserts debit routed to `1105 Supplier Advances / Debit Balance` instead of AP. | **PASS (Dr 1105 Advances Asset)** |
| `testCommercialRateAdjustmentNoGoodsMovement` (`P7-TEST-06`) | Commercial (Scenario B) | Posts commercial price rebate; asserts zero stock decrement and credit routed to `5105 PPV / Rebates`. | **PASS (Stock unchanged, Dr 2101, Cr 5105)** |
| `testGstr2bCreditNoteReconciliation` (`P7-TEST-07`) | Statutory Matching | Ingests vendor GSTR-2B Credit Note; matches against return document and updates `itc_reversal_status = RECONCILED_MATCHED`. | **PASS (Status transitioned to RECONCILED)** |
| `testMultiTenantIsolation` (`P7-TEST-08`) | Security Gate | Tenant B attempts to issue purchase return or match credit note against Tenant A's invoice. | **PASS (Access Denied / 404 Not Found)** |

---

## 3. Frontend Test Suite: `ProcurementP7FrontendReturnWorkflow.test.ts`

| Test Case | Functional Scope | Assertion |
| :--- | :--- | :--- |
| `1. Stock & Billed Quantity Boundary Gate` | React Modal Validation | Blocks user from entering return quantity exceeding available depot stock or remaining open billed balance. |
| `2. Live Pro-Rata Tax Reversal Calculator` | GST Preview Engine | Accurately calculates CGST/SGST/IGST breakdown and GSTR-3B Table 4(B)(2) allocation on partial returns. |
| `3. Section 17(5) Blocked ITC Presentation` | Statutory UX | Displays warning banner and skips ITC reversal preview when returning blocked items. |
| `4. Rule 55 Delivery Challan Formatter` | Document Formatting | Formats 16-character alphanumeric sequential document number and triplicate copy labels. |
| `5. GSTR-2B Matching Tolerance Proof` | Reconciliation UI | Flags matching status as `MATCHED` within ₹1.00 rounding tolerance and `VARIANCE` when tax differs. |

---

## 4. Full Platform Regression Execution Gate
Prior to declaring Phase P7 complete in future implementation:
1. Run all Procurement backend tests: `mvn test "-Dtest=ProcurementP*SecurityTest"` (P1 through P7).
2. Run all Sales backend tests: `mvn test "-Dtest=SalesS*SecurityTest"` (S1 through S7).
3. Run all Frontend tests: `npm test` across all feature suites.
4. Run full TypeScript typecheck: `npx tsc --noEmit`.
