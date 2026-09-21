# Phase 4C.2: Pre-Close Subledger Reconciliation Gate — Second Independent Forensic Safety Review

**Document ID**: `66_phase4C_2_SECOND_INDEPENDENT_SAFETY_REVIEW.md`  
**Review Type**: Second Independent Forensic Safety & Accounting Audit (Post-Remediation)  
**Baseline Commit**: `5d546ab15cc0047442e33d0533131e38d65a7253`  
**Target Under Review**: Remediated Phase 4C.2 Implementation ([65_phase4C_2_REMEDIATION_REPORT.md](file:///e:/Codes/ERP/jshERP-master/research/finance-accounting/65_phase4C_2_REMEDIATION_REPORT.md))  
**Audited Components**: `SubledgerReconciliationService.java`, `ReconciliationController.java`, `SubledgerReconciliationServiceTest.java`, integration posting services, database schema, and test execution harness  
**Reported Result Claimed by Remediation**: 152/152 tests PASS  
**Final Forensic Audit Verdict**: **FAIL** (Presence of 2 New P1 Production-Blocking Accounting Correctness Defects and 2 P2 Control/Boundary Weaknesses)  
**Authoritative Hard Stop Status**: **STRICTLY ENFORCED** (Zero Phase 4C.3, Zero Phase 4C.4, Zero modifications to Phase 4B)

---

## 1. Executive Verdict

### 1.1 Summary Statement
A rigorous, second independent forensic safety review of the remediated Phase 4C.2 Pre-Close Subledger Reconciliation Gate was performed. While the remediation team successfully fixed the original six findings (F-4C2-01 through F-4C2-06) within their narrow test cases, an exhaustive mathematical and source-code trace across **all production accumulator writers and lifecycle paths** reveals that the new **Delta-Unwinding Historical Subledger Reconstruction** methodology is **incomplete and unsafe for production**.

Specifically, two new P1 production-blocking accounting defects exist:
1. **P1 — Complete Omission of Customer Advance Offsets in Trade Receivables (1220)**:
   When a customer advance is applied against a sales invoice (`FinancialAccountingPostingService.postCustomerAdvanceOffsetToGeneralLedger`), GL account `1220` is credited and `erp_supplier.all_need_get` is decremented. However, in `SubledgerReconciliationService.reconcileTradeReceivables`, **Customer Advance Offsets are completely omitted from both Granular AR reconstruction and post-cutoff delta unwinding**. Consequently, any sales invoice settled via advance offset triggers a persistent false `GRANULARITY_DISCREPANCY` (in-period) or false `DISCREPANT` status (cross-period), permanently blocking period close.
2. **P1 — Omission of Cross-Period Payment and Receipt Reversals in Delta-Unwinding**:
   When a customer receipt or supplier payment is reversed in a period subsequent to its original date (`FinancialAccountingPostingService.reverseCustomerReceipt` / `reverseSupplierPayment`), GL posts a reversal entry and the operational accumulator (`all_need_get` / `all_need_pay`) is restored in-place. However, the delta-unwinding queries in `reconcileTradeReceivables` and `reconcileTradePayables` only inspect document dates in `erp_account_head` (`bill_time > D`). They do not inspect `erp_gl_entry` for reversal vouchers. Thus, when reconciling an earlier period, the system fails to unwind the post-cutoff balance restoration, producing a false variance that falsely locks period close.

### 1.2 Verdict Scorecard
- **Final Verdict**: **FAIL**
- **P0 Findings**: 0
- **P1 Findings**: 2 (F-4C2-07: AR Advance Offset Omission; F-4C2-08: Cross-Period Payment/Receipt Reversal Omission)
- **P2 Findings**: 2 (F-4C2-09: Temporal Disparity between Approval Date `now` and Document Operational Date; F-4C2-10: In-Place Purchase Bill Cancellation Temporal Corruption)
- **P3 Findings**: 1 (F-4C2-11: Dead Legacy Helper `updateAdvanceIn` Asymmetry)
- **Phase 4B Immutability**: 100% PASS (Zero lines changed in Phase 4B)
- **Deferred Findings (F-01-R, F-05, F-06, F-07)**: 100% PASS (Preserved untouched)
- **Test Suite Verification**: 152 / 152 tests executed and passing (claims verified, but suites contain blind spots regarding advance settlement in AR)

---

## 2. Finding-by-Finding Verification of Report 65

An independent audit was conducted on the remediation of the original findings (F-4C2-01 to F-4C2-06):

| Original Finding | Remediation Action Claimed | Forensic Verification Result | Status |
|---|---|---|---|
| **F-4C2-01 (P1)**: Temporal Asymmetry | Delta-unwinding historical reconstruction | **Partially Verified / Flawed**: Unwinding works for standard post-cutoff sales, bills, and payments, but **omits advance offsets in AR and payment reversals**. | **FAIL (Superseded by F-4C2-07 & F-4C2-08)** |
| **F-4C2-02 (P1)**: AP TDS Granular Mismatch | `CASE WHEN IFNULL(net_payable_amount, 0) > 0 THEN net_payable_amount ELSE total_invoice_amount - tds_amount END` | **Verified**: Successfully accounts for MySQL column default `'0.0000'` and enforces Net AP parity with GL `2320`. | **PASS** |
| **F-4C2-03 (P2)**: Bank/Cash Static Opening Fallback | GL set as sole authoritative ledger ($SL = GL, Granular = GL$) | **Verified**: Replaced static `initial_amount` fallback with pure GL authority per Mandatory Clarification #2. | **PASS** |
| **F-4C2-04 (P2)**: Cancelled Sales Invoices in Granular AR | Filter `posting_status != 'CANCELLED'` added to queries | **Verified for in-period cancellation**: Excluded from both granular and post-cutoff unwinding. | **PASS** |
| **F-4C2-05 (P2)**: Silent Exception Swallowing | Replaced catch-blocks with `BusinessRunTimeException(500, ...)` | **Verified**: All empty catches in drilldowns and `countDrafts` throw fail-closed HTTP 500 exceptions. | **PASS** |
| **F-4C2-06 (P3)**: Tenant ID `0` Permissiveness | Fail-closed HTTP 400 validation + `resolveTenantId` direct return | **Verified**: Rejects `tenantId <= 0` in all controller endpoints and service methods. | **PASS** |

---

## 3. Delta-Unwinding Mathematical Proof & Limits

### 3.1 The Theoretical Equation
The remediation posits the identity:
$$\text{CurrentAccumulator} = \text{Balance}(D) + \sum_{t > D} \Delta_{\text{subledger}}$$
Therefore:
$$\text{Balance}(D) = \text{CurrentAccumulator} - \sum_{t > D} \Delta_{\text{subledger}}$$

### 3.2 The Completeness Condition
For this identity to hold, the set of events evaluated in $\sum_{t > D} \Delta_{\text{subledger}}$ must be **algebraically identical** to the set of all database operations that modified `CurrentAccumulator` after cutoff date $D$:
$$\mathcal{E}_{\text{unwound}}(> D) \equiv \mathcal{E}_{\text{written}}(> D)$$

### 3.3 The Failure Proof
In `SubledgerReconciliationService.reconcileTradeReceivables` (lines 393-408):
$$\mathcal{E}_{\text{unwound}}(> D) = \text{SalesInvoices}(> D) - \text{Receipts}(> D) - \text{CreditNotes}(> D)$$
However, the codebase contains two additional production writers that mutate `erp_supplier.all_need_get`:
1. `FinancialAccountingPostingService.postCustomerAdvanceOffsetToGeneralLedger` (line 520):
   $$\Delta_{\text{subledger}} = -\text{OffsetAmount}$$
2. `FinancialAccountingPostingService.reverseCustomerReceipt` (line 284):
   $$\Delta_{\text{subledger}} = +\text{ReceiptAmount}$$

Because these two event types are omitted from $\mathcal{E}_{\text{unwound}}(> D)$:
$$\sum_{t > D} \Delta_{\text{subledger}}^{\text{actual}} \neq \sum_{t > D} \Delta_{\text{subledger}}^{\text{query}}$$
Consequently:
$$\text{Balance}(D)_{\text{calculated}} \neq \text{Balance}(D)_{\text{actual}}$$
The mathematical identity is violated whenever customer advance offsets or receipt reversals occur post-cutoff.

---

## 4. Historical Trade Receivables (1220) Proof

### 4.1 Production Code Trace of Writers
All production writers of `erp_supplier.all_need_get` were traced:

| Writer Source | Method | SQL Executed | Event Sign | Delta-Unwinding Status in `reconcileTradeReceivables` |
|---|---|---|---|---|
| Sales Invoice Post | `SalesAccountingPostingService.postSalesInvoiceToGeneralLedger` (L230) | `all_need_get = all_need_get + ?` | $+GrossTotal$ | **Captured** (`postSales`) |
| Credit Note Post | `SalesAccountingPostingService.postSalesCreditNoteToGeneralLedger` (L484) | `all_need_get = all_need_get - ?` | $-GrossTotal$ | **Captured** (`postCreditNotes`) |
| Sales Return Post | `SalesReturnService.executeReturnWorkflow` (L297) | `all_need_get = all_need_get - ?` | $-GrossTotal$ | **Captured** (`postCreditNotes`) |
| Customer Receipt | `FinancialAccountingPostingService.postCustomerReceiptToGeneralLedger` (L246) | `all_need_get = all_need_get - ?` | $-ReceiptAmount$ | **Captured** (`postReceipts`) |
| Customer Receipt Reversal | `FinancialAccountingPostingService.reverseCustomerReceipt` (L284) | `all_need_get = all_need_get + ?` | $+ReceiptAmount$ | **OMITTED (P1 - F-4C2-08)** |
| Customer Advance Offset | `FinancialAccountingPostingService.postCustomerAdvanceOffsetToGeneralLedger` (L520) | `all_need_get = all_need_get - ?` | $-OffsetAmount$ | **OMITTED (P1 - F-4C2-07)** |

### 4.2 Granular AR Omission Proof
In `SubledgerReconciliationService.java` (line 444):
```java
granularBalance = beginAr.add(salesInv).subtract(receipts).subtract(creditNotes).setScale(4, RoundingMode.HALF_UP);
```
In contrast to Trade Payables (line 544), which subtracts `advOffsets`, Granular AR has no query or subtraction for `CUSTOMER_ADVANCE_OFFSET`!
- GL `1220` net balance subtracts the credit from advance offsets.
- Subledger `all_need_get` subtracts advance offsets.
- Granular AR **does not subtract advance offsets**.
- **Result**: Immediate, persistent `GRANULARITY_DISCREPANCY` equal to the offset amount for any invoice settled by advance!

---

## 5. Historical Trade Payables (2320) Proof

### 5.1 Production Code Trace of Writers
All production writers of `erp_supplier.all_need_pay` were traced:

| Writer Source | Method | SQL Executed | Event Sign | Delta-Unwinding Status in `reconcileTradePayables` |
|---|---|---|---|---|
| Purchase Bill Post | `PurchaseAccountingPostingService.postPurchaseInvoiceToGeneralLedger` (L458) | `all_need_pay = all_need_pay + ?` | $+NetAP$ | **Captured** (`postBills`) |
| Supplier Payment | `FinancialAccountingPostingService.postSupplierPaymentToGeneralLedger` (L350) | `all_need_pay = all_need_pay - ?` | $-PaymentAmount$ | **Captured** (`postPayments`) |
| Supplier Payment Reversal | `FinancialAccountingPostingService.reverseSupplierPayment` (L388) | `all_need_pay = all_need_pay + ?` | $+PaymentAmount$ | **OMITTED (P1 - F-4C2-08)** |
| Debit Note Post | `PurchaseAccountingPostingService.postPurchaseDebitNoteToGeneralLedger` (L710) | `all_need_pay = all_need_pay - ?` | $-DebitNote$ | **Captured** (`postDebitNotes`) |
| Debit Note Reversal | `PurchaseAccountingPostingService.reversePurchaseDebitNoteGeneralLedger` (L746) | `all_need_pay = all_need_pay + ?` | $+DebitNote$ | **OMITTED (P2)** |
| Supplier Advance Offset | `FinancialAccountingPostingService.postSupplierAdvanceOffsetToGeneralLedger` (L626) | `all_need_pay = all_need_pay - ?` | $-OffsetAmount$ | **Captured** (`postAdvOffsets`) |

Trade Payables correctly captures `postAdvOffsets` and Granular `advOffsets`, demonstrating that the author understood the necessity of advance offset unwinding for AP, but omitted it in AR.

---

## 6. Statutory TDS / AP Forensic Review

The remediation of F-4C2-02 in `reconcileTradePayables` was inspected:
```sql
CASE 
  WHEN IFNULL(net_payable_amount, 0) > 0 THEN net_payable_amount 
  ELSE (total_invoice_amount - IFNULL(tds_amount, 0)) 
END
```
1. **Mathematical Parity**:
   - Gross: ₹100,000, TDS (10% u/s 194C): ₹10,000, Net AP: ₹90,000.
   - GL `2320` Credit: ₹90,000.
   - Subledger `all_need_pay`: +₹90,000.
   - Granular AP: Evaluates `net_payable_amount` as ₹90,000.
   - Variance: ₹0.0000. Status: `BALANCED`.
2. **Schema Robustness**: Correctly handles legacy records where `net_payable_amount` defaulted to `0.0000` by falling back to `total_invoice_amount - tds_amount`.
3. **Verdict on F-4C2-02**: **VERIFIED RESOLVED**.

---

## 7. Advances Forensic Proof (2339 & 1260)

### 7.1 Customer Advances (2339)
- Lines 577-588 correctly unwind `postOffsets` using GL `2339` debits where `voucher_type = 'CUSTOMER_ADVANCE_OFFSET'`.
- Granular reconstruction correctly subtracts pre-cutoff offsets.
- **Defect Identified (F-4C2-11)**: In production, `postCustomerAdvanceOffsetToGeneralLedger` updates `all_need_get` but does NOT decrement `advance_in`. `advance_in` is only updated by legacy `SupplierService.updateAdvanceIn`. In Test 25, the test manually seeded `advance_in = 0`, masking this architectural mismatch.

### 7.2 Supplier Advances (1260)
- Lines 638-650 correctly restore `unallocated_balance` using post-cutoff GL `1260` credits where `voucher_type = 'SUPPLIER_ADVANCE_OFFSET'`.
- Granular reconstruction correctly computes gross disbursed minus pre-cutoff offsets.
- **Verdict**: Mathematically sound for standard advance lifecycles.

---

## 8. Bank (1232) and Cash (1231) Forensic Proof

- Verified lines 684-716 of `SubledgerReconciliationService.java`.
- Static `initial_amount` fallback query has been completely removed.
- Sets:
  $$\text{SubledgerBalance} = \text{GLBalance}$$
  $$\text{GranularBalance} = \text{GLBalance}$$
  $$\text{Variance} = 0.0000$$
  $$\text{Status} = \text{BALANCED}$$
- Complies 100% with Mandatory Clarification #2.
- **Verdict on F-4C2-03**: **VERIFIED RESOLVED**.

---

## 9. Cancellation & Reversal Forensic Analysis (Scenarios A–L)

Independent evaluation of the mandatory adversarial scenarios:

| Scenario | Description | GL(D) | SL(D) | Granular(D) | Parity Evaluation | Status |
|---|---|---|---|---|---|---|
| **A** | April invoice + May payment | 10k | 10k | 10k | $GL = SL = Granular$ | **PASS** |
| **B** | April invoice + May partial payment | 10k | 10k | 10k | $GL = SL = Granular$ | **PASS** |
| **C** | April invoice + May cancellation | 10k | 0 | 0 | State machine blocks cancellation of `POSTED` docs; requires Return/Reversal | **PASS (By Domain Guard)** |
| **D** | April invoice + May reversal (Return) | 10k | 10k | 10k | Return has `oper_time` in May; unwound by `postCreditNotes` | **PASS** |
| **E** | April invoice + May payment + June reversal | 0 | 10k | 0 | **F-4C2-08**: Receipt reversal in June restores `all_need_get`, but is omitted from May unwinding query | **FAIL (P1)** |
| **F** | April advance + May offset (2339) | 10k | 10k | 10k | Unwound via `postOffsets` in 2339 | **PASS** |
| **G** | April advance + May partial offset | 10k | 10k | 10k | Unwound via `postOffsets` in 2339 | **PASS** |
| **H** | April supp advance + May allocation | 50k | 50k | 50k | Unwound via `postOffsets` in 1260 | **PASS** |
| **I** | April supp advance + May partial allocation | 50k | 50k | 50k | Unwound via `postOffsets` in 1260 | **PASS** |
| **J** | April purchase bill + May payment | 30k | 30k | 30k | Unwound via `postPayments` | **PASS** |
| **K** | April purchase bill w/ TDS + May payment | 90k | 90k | 90k | Net AP parity maintained | **PASS** |
| **L** | April AR + May Customer Advance Offset | 50k | 30k | 50k | **F-4C2-07**: Offset reduces `all_need_get`, but is omitted from AR unwinding | **FAIL (P1)** |

---

## 10. Fail-Closed Proof

1. **Service Entry Points**:
   - `tenantId <= 0` throws `BusinessRunTimeException(400, ...)`.
   - `periodName == null || empty` throws `BusinessRunTimeException(400, ...)`.
   - `period == null` throws `BusinessRunTimeException(404, ...)`.
   - Invalid account code in drilldown throws `BusinessRunTimeException(400, ...)`.
2. **Exception Propagation in Drilldowns**:
   - Lines 807, 859, 906: Empty `catch (Exception ignored)` removed. Now rethrows `BusinessRunTimeException(500, ...)`.
   - Line 1100: `countDrafts` catch block now rethrows `BusinessRunTimeException(500, ...)`.
3. **Verdict on F-4C2-05 & F-4C2-06**: **VERIFIED RESOLVED**.

---

## 11. Read-Only Proof

1. **AST & Call Graph Inspection**:
   - `SubledgerReconciliationService`: Contains **0** `INSERT`, **0** `UPDATE`, **0** `DELETE`.
   - Dependency services called:
     - `financialPeriodService.getPeriodByName(tenantId, periodName)`: Executes pure `SELECT`.
     - `financialYearService.getFinancialYearById(fyId)`: Executes pure `SELECT`.
   - No bootstrap logic or state machines are invoked.
2. **Transactional Annotations**: All methods marked `@Transactional(readOnly = true)`.
3. **Database Invariance**: Verified across repeated test executions.

---

## 12. Snapshot & Concurrency Analysis

1. **Transaction Isolation**: Service runs under `@Transactional(readOnly = true)`. On MySQL InnoDB, default `REPEATABLE READ` establishes a single MVCC read view on the first query.
2. **Snapshot Invariant**: All queries executed within a single reconciliation request observe the identical database snapshot $S$.
3. **Operational Concurrency**:
   - If a new GL entry is committed while reconciliation is running, MVCC guarantees reconciliation does not see the new entry.
   - **Boundary Risk (P2 - F-4C2-09)**: If an invoice is created on April 30 (`oper_time = 2026-04-30`), but approved on May 2 (`posting_date = 2026-05-02`), the reconciliation gate for April will see `Granular = +Invoice` and `GL = 0`, triggering a discrepancy. In production, this requires an operational policy that month-end transactions must be approved prior to running the pre-close reconciliation gate.

---

## 13. Tenant Isolation Proof

- 100% of the 31 SQL queries in `SubledgerReconciliationService` parameterize `tenant_id = ?`.
- No cross-tenant joins or unparameterized subqueries exist.
- Verified in Test 10 and Test 30.

---

## 14. Three-Way Reconciliation Taxonomy Semantics

Lines 1042-1059 enforce the statutory taxonomy:
- $GL == SL == Granular \implies \mathbf{BALANCED}$ (Gate: PASS)
- $GL == SL \neq Granular \implies \mathbf{GRANULARITY\_DISCREPANCY}$ (Classification: `ALLOCATION_DIFFERENCE`, Gate: BLOCKED)
- $GL \neq SL == Granular \implies \mathbf{DISCREPANT}$ (Classification: `ACCOUNTING_INCONSISTENCY`, Gate: BLOCKED)
- $GL \neq SL \neq Granular \implies \mathbf{PARTIAL\_DISCREPANCY}$ (Classification: `DATA_INTEGRITY_ISSUE`, Gate: BLOCKED)

The classification comparator is mathematically sound; the failure arises solely from missing input terms in Tier B and Tier C.

---

## 15. Test Quality Assessment

### 15.1 Suite Execution Verification
Executed live during review:
- `SubledgerReconciliationServiceTest`: **35/35 PASS**
- Financial regression suites (8 test classes): **117/117 PASS**
- Total: **152/152 PASS**

### 15.2 Test Blind Spots Discovered
While all 35 tests pass, forensic inspection revealed critical omissions in test coverage:
1. **Zero Tests for Customer Advance Offset against Trade Receivables**: Tests 4 and 25 only asserted account `2339`. Neither test asserted account `1220` after a customer advance offset.
2. **Zero Tests for Payment / Receipt Reversals**: Test 32 tested a sales *return* (credit note), but did not test `FinancialAccountingPostingService.reverseCustomerReceipt` or `reverseSupplierPayment`.
3. **Artificial Seeding in Test 25**: Test 25 manually inserted `advance_in = 0` rather than testing the end-to-end service execution, masking the production `advance_in` update gap.

---

## 16. Monetary Precision & Arithmetic Analysis

- Arithmetic strictly uses `java.math.BigDecimal`.
- Normalization to 4 decimal places with `RoundingMode.HALF_UP`.
- Equality evaluated with `compareTo(BigDecimal.ZERO) == 0`.
- No floating-point rounding errors or precision leaks detected.

---

## 17. Performance & Query Scalability

1. **Post-Cutoff Delta Scan Overhead**:
   Delta-unwinding queries execute `oper_time > D` and `bill_time > D`. For historical reconciliations of old periods, this requires scanning all transactions from cutoff $D$ to the current date.
2. **Index Optimization Required**:
   - `erp_depot_head`: Needs composite index on `(tenant_id, type, sub_type, status, oper_time)`.
   - `erp_account_head`: Needs composite index on `(tenant_id, type, status, bill_time)`.
3. **Current Scale**: In the present database volume, queries execute in < 25ms.

---

## 18. API Security Verification

- Controller endpoints enforce authenticated session context via `LogCostFilter`.
- `ReconciliationController` now strictly validates `tenantId > 0`, throwing HTTP 400 if missing or invalid.
- Endpoints are strictly read-only (`GET` for summary/drilldowns, `POST /verify` for read-only validation).

---

## 19. Phase 4B Immutability Proof

Verification against production baseline `5d546ab15cc0047442e33d0533131e38d65a7253`:
```
git diff 5d546ab15cc0047442e33d0533131e38d65a7253 -- ERPSystem-boot/src/main/java/com/jsh/erp/service/FixedAsset*
git diff 5d546ab15cc0047442e33d0533131e38d65a7253 -- ERPSystem-boot/src/main/java/com/jsh/erp/service/Asset*
```
Result: **0 lines modified**. Phase 4B remains 100% frozen.

---

## 20. Deferred Findings Integrity

The deferred architectural findings remain untouched:
- **F-01-R**: Fiscal Year Non-Contiguous Validation (Phase 4C.4)
- **F-05**: Retained Earnings Equity Carryforward (Phase 4C.4)
- **F-06**: Closing Journal Audit Trail (Phase 4C.4)
- **F-07**: Period State Transition Guards (Phase 4C.3)

---

## 21. Knowledge Graph Verification (Graphify)

- Graphify AST update verified (`27,669 nodes`, `72,761 edges`, `1,094 communities`).
- Confirmed zero outbound mutation edges from `SubledgerReconciliationService`.
- No cyclic dependencies or duplicate financial authorities detected.

---

## 22. Final Severity Matrix

### P1 — Production-Blocking Accounting Correctness Defects
1. **F-4C2-07: Omission of Customer Advance Offsets in Trade Receivables (1220)**
   - **Files**: `SubledgerReconciliationService.java` (lines 407, 444)
   - **Description**: `reconcileTradeReceivables` fails to include `CUSTOMER_ADVANCE_OFFSET` in Granular AR reconstruction and post-cutoff delta unwinding. Offsetting an advance against an invoice breaks 3-way reconciliation and blocks period closing.
2. **F-4C2-08: Omission of Cross-Period Payment/Receipt Reversals in Delta-Unwinding**
   - **Files**: `SubledgerReconciliationService.java` (lines 407, 504)
   - **Description**: Reversing a customer receipt or supplier payment in period $M+1$ restores `all_need_get` / `all_need_pay`. The delta-unwinding query for period $M$ does not inspect GL reversal vouchers, causing the subledger for period $M$ to be falsely overstated.

### P2 — Operational & Boundary Weaknesses
3. **F-4C2-09: Temporal Disparity Between Approval Date (`posting_date = now`) and Document Date**
   - **Files**: `SalesAccountingPostingService.java` (L117), `PurchaseAccountingPostingService.java` (L408)
   - **Description**: GL entries use approval runtime `now`, while granular queries use document date (`oper_time`/`invoice_date`). Documents approved across a month boundary create false timing variances.
4. **F-4C2-10: In-Place Purchase Bill Cancellation Temporal Corruption**
   - **Files**: `GstPurchaseInvoiceService.java` (L590)
   - **Description**: Cancelling a purchase bill mutates `erp_purchase_invoice.status = 'CANCELLED'` in-place, retroactively removing it from historical granular reconstructions of prior periods.

### P3 — Maintenance & Architecture Observation
5. **F-4C2-11: Dead Legacy Helper `updateAdvanceIn` Asymmetry**
   - **Files**: `SupplierService.java` (L290), `FinancialAccountingPostingService.java` (L520)
   - **Description**: `postCustomerAdvanceOffsetToGeneralLedger` mutates `all_need_get` but does not decrement `advance_in`, creating an architectural disconnect between AR settlement and advance balance maintenance.

---

## 23. Final Forensic Verdict

### **VERDICT: FAIL**

Phase 4C.2 **CANNOT BE AUTHORIZED** for production or period closing gate usage in its current state.

While the remediation resolved the static bank opening issue, AP TDS gross mismatch, and fail-closed exception handling, the **Delta-Unwinding Engine contains two P1 omissions (Customer Advance Offsets in AR and Payment Reversals in both AR/AP)** that will cause false discrepancy locks during normal commercial operations.

---

## 24. Mandatory Hard Stop Enforcement

Execution has reached its mandatory hard stop.
- **ZERO production code changes have been made.**
- **ZERO tests have been modified.**
- **ZERO Phase 4C.3 or Phase 4C.4 work has been initiated.**
- **Phase 4B remains 100% frozen.**
- Awaiting user review and direction.
