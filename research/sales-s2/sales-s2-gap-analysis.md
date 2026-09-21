# Phase S2: Sales Quotation, Approval & Credit Gap Analysis

---

## 1. Existing Codebase vs Target S2 Specification

| S2 Capability Area | Current ERP Implementation | Benchmark Target | Gap Severity | Action Plan |
|---|---|---|:---:|---|
| **Sales Quotation Master** | Completely missing | Dedicated entity with versioning, validity, and print template | **High** | Implement `erp_quotation` + `QuotationService` + `QuotationController`. |
| **Quotation to SO Conversion** | Completely missing | 1-Click conversion with idempotency protection against duplicate orders | **High** | Add `/quotation/{id}/convert-to-so` action with atomic CAS lock. |
| **Approval Rule Engine** | Basic binary toggle on `DepotHead` | Multi-tier rules evaluating Order Value, Margin, Discounts, and Credit | **High** | Implement `SalesOrderApprovalService` with configurable rule table. |
| **Customer Credit Limit Gate** | Customer has `credit_limit`, but no enforcement exists during SO save/approval | Formula-driven credit exposure calculation with `STRICT_BLOCK` vs `WARNING_ONLY` | **High** | Implement `CustomerCreditExposureService` with zero overdue double-counting. |
| **Approval Audit History** | Handled in P2P (`erp_approval_history`), not yet connected to Sales Orders | Log every approval, auto-approval, rejection with user identity and timestamp | **Medium** | Connect Sales Order approvals to `erp_approval_history`. |
| **Multi-Level Data Scope on Approvals** | Basic tenant filter | Approval action must verify caller has `ORG` / `DEPOT` / `ALL` data scope for target order | **High** | Enforce `DataScopeService` checks inside approval endpoints. |
