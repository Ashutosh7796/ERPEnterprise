# Phase S2: Automated Verification & Test Plan

---

## 1. Test Matrix for Phase S2

| Test ID | Scenario | Input / Pre-Conditions | Expected Outcome |
|---|---|---|---|
| **S2-01** | Create Quotation & Revisions | Initial quote `QTN-001` (Rev 0) $\rightarrow$ Create Revision | Generates `QTN-001` (Rev 1); Rev 0 marked superseded. |
| **S2-02** | 1-Click Quotation to SO Conversion | Quote `QTN-001` in `ACCEPTED` status | Creates `erp_depot_head` Sales Order; Quote marked `CONVERTED`. |
| **S2-03** | Idempotent Conversion Protection | Double-click or replay conversion request on already converted quote | 2nd attempt rejected with `409 Conflict`; zero duplicate SOs. |
| **S2-04** | Credit Exposure (Zero Overdue Double-Count) | Invoices: ₹50k (Unpaid, ₹20k overdue), Unbilled SO: ₹30k, Current SO: ₹20k, Advances: ₹10k | Net Exposure = $50\text{k} + 30\text{k} + 20\text{k} - 10\text{k} = \mathbf{₹90,000}$; Overdue = ₹20k. |
| **S2-05** | Credit Limit Hard Block Policy | Customer Limit: ₹1,00,000; Net Exposure: ₹1,20,000; Policy: `STRICT_BLOCK` | Order submission rejected with `403 Forbidden: Credit limit breached`. |
| **S2-06** | Credit Limit Warning Route to Finance | Customer Limit: ₹1,00,000; Net Exposure: ₹1,20,000; Policy: `WARNING_ONLY` | Order routed to `PENDING_FINANCE_APPROVAL`. |
| **S2-07** | Auto-Approval on Clean Orders | Order value ₹50k $\le$ Auto threshold, Margin 20% $\ge$ 15%, Exposure $\le$ Limit | Order automatically transitions to `APPROVED`; audit entry logged. |
| **S2-08** | Data Scope Authorization Enforcement | User with `DEPOT` scope attempting approval on another branch's order | Rejected with `403 Forbidden: Order outside authorized data scope`. |
| **S2-09** | Order Cancellation State Invariant | Cancel order in `APPROVED` status | Transitions to `CANCELLED`; cannot be delivered or invoiced. |
| **S2-10** | Multi-Tenant Boundary Isolation | Tenant A attempting to convert or approve Tenant B quotation | Rejected with `403/404 Access Denied`. |
