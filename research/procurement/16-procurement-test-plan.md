# 16 - Procurement Verification & Test Plan

**Test Strategy**: Comprehensive Automated Backend JUnit/Spring Security Test Suites + Adversarial Red-Team Gates  

---

## 1. Automated Test Matrix by Phase

| Phase | Dedicated Security & Unit Test Suite | Key Validation Scenarios |
|---|---|---|
| **P1** | `ProcurementP1LineageSecurityTest` | * PO creation, idempotent fulfillment balance updates, over-receipt blocks, cross-tenant isolation. |
| **P2** | `ProcurementP2ApprovalAndSoDSecurityTest` | * Role threshold limits, self-approval prohibition, approval queues, rejection flows. |
| **P3** | `ProcurementP3GoodsReceiptSecurityTest` | * Physical stock movement, QC rejected staging, moving average valuation rate update. |
| **P4** | `ProcurementP4InvoiceAndGSTSecurityTest` | * Bill-To vs Ship-To POS, Intra/Inter-state tax splitting, Section 17(5) blocked ITC, RCM self-invoicing. |
| **P5** | `ProcurementP5AccountingAndGRNISecurityTest` | * GRNI accrual balance (2102), GL trial balance balancing (Total Debit = Total Credit). |
| **P6** | `ProcurementP6PaymentAllocationSecurityTest` | * $1 \rightarrow N$ bill allocation, advance offset, AP balance decrement (`erp_supplier.all_need_pay`). |
| **P7** | `ProcurementP7ReturnsAndDebitNotesSecurityTest` | * Rule 53 Debit Note issuance, physical restocking reversal, GL tax reversals. |

---

## 2. Red-Team Security & Isolation Assertions

Every test suite must assert:
1. **Cross-Tenant Boundary**: A tenant cannot approve, receive, invoice, or settle another tenant's purchase orders.
2. **Immutable Post-Locking**: Once a PO, GRN, or Invoice is `POSTED` / `APPROVED`, direct CRUD updates must be rejected.
3. **Double-Entry Balance Guarantee**: Every posted procurement transaction must result in $\sum \text{Debits} == \sum \text{Credits}$ in `erp_gl_journal_line`.
