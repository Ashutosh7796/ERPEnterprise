# Phase S2: Technical Implementation Plan

---

## 1. Work Breakdown Structure for Phase S2

### Task 1: Quotation Schema & Service Engine
* Create `erp_quotation` and `erp_quotation_item` tables via `@PostConstruct` schema migration.
* Implement `QuotationService.java`:
  * `createQuotation(QuotationDto dto, UserContext uc)`
  * `updateQuotation(QuotationDto dto, UserContext uc)`
  * `createRevision(Long qtnId, UserContext uc)`
  * `convertQuotationToSalesOrder(Long qtnId, UserContext uc)` (idempotent with atomic CAS lock).
* Implement `QuotationController.java` (`/quotation/*`).

### Task 2: Customer Credit Exposure Calculation Engine
* Implement `CustomerCreditExposureService.java`:
  * `calculateCreditExposure(Long customerId, Long tenantId, BigDecimal currentOrderValue)`
  * Computes: `Open Receivables + Approved Unbilled Orders + Current Order - Advances - Credit Notes`.
  * Computes: `Overdue Invoices Count & Overdue Amount (> grace days)`.
  * Returns structured `CustomerCreditExposureDto` (`creditLimit`, `totalExposure`, `availableCredit`, `overdueAmount`, `policyRecommendation`).

### Task 3: Sales Order Approval Service & Audit Engine
* Implement `SalesOrderApprovalService.java`:
  * `evaluateAndSubmitOrder(Long soHeaderId, Long tenantId, UserContext uc)`
  * Evaluates order value, discount percentage, margin rate, and customer credit exposure.
  * Transitions state to `APPROVED`, `PENDING_APPROVAL`, `PENDING_FINANCE_APPROVAL`, or `REJECTED`.
  * Records immutable audit entry in `erp_approval_history`.
  * `approveSalesOrder(Long soHeaderId, String remarks, UserContext uc)`: Manual manager approval.
  * `rejectSalesOrder(Long soHeaderId, String reason, UserContext uc)`: Rejection with reason.

---

## 2. API Endpoints Specification

| Method | Endpoint | Description | Security / Role Required |
|---|---|---|---|
| `POST` | `/quotation/create` | Create new sales quotation | `SALES_QUOTE_CREATE` |
| `POST` | `/quotation/{id}/submit` | Submit quotation for review | `SALES_QUOTE_EDIT` |
| `POST` | `/quotation/{id}/revision` | Generate new quotation revision | `SALES_QUOTE_EDIT` |
| `POST` | `/quotation/{id}/convert-to-so` | 1-Click convert to Sales Order | `SALES_QUOTE_CONVERT` |
| `GET` | `/customer/{id}/credit-exposure` | Retrieve live credit exposure calculation | `SALES_CREDIT_VIEW` |
| `POST` | `/sales-order/{id}/submit-approval` | Submit Sales Order for approval evaluation | `SALES_ORDER_SUBMIT` |
| `POST` | `/sales-order/{id}/approve` | Manager / Finance manual approval | `SALES_ORDER_APPROVE` (Role 3+) |
| `POST` | `/sales-order/{id}/reject` | Reject Sales Order with reason | `SALES_ORDER_APPROVE` (Role 3+) |
