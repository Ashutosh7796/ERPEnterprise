# 12 - Procurement Phase P7: Security & Multi-Tenant Isolation Analysis

**Document Ref**: `PROC-P7-VERIF-12`  
**Evaluation Date**: August 2026  
**Status**: **SECURITY & ACCESS CONTROL SPECIFICATION**  

---

## 1. Security Architecture & 5-Layer Authorization Model

All Purchase Return and Supplier Adjustment endpoints must pass through our rigorous 5-layer enterprise security gateway:

```
┌─────────────────────────────────────────────────────────────┐
│                   5-LAYER SECURITY GATEWAY                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Tenant Authentication & Isolation Filter                 │
│    (Tenant ID extracted strictly from JWT / Session Token)  │
├─────────────────────────────────────────────────────────────┤
│ 2. Feature / Subscription Plan Gate                         │
│    ('PROCUREMENT_RETURNS', 'GST_COMPLIANCE')                │
├─────────────────────────────────────────────────────────────┤
│ 3. RBAC Role & Permission Gate                              │
│    ('PURCHASE_RETURN_CREATE', 'PURCHASE_RETURN_APPROVE')    │
├─────────────────────────────────────────────────────────────┤
│ 4. DataScope & Depot/Warehouse Authorization Gate           │
│    (User assigned Depot IDs and Supplier Group Scopes)      │
├─────────────────────────────────────────────────────────────┤
│ 5. Financial Posting & SoD Policy Gate                      │
│    (Creator cannot approve own return under strict SoD)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Server-Authoritative Input Validation (Never Trust Client Data)

The backend service MUST NEVER trust client-supplied IDs without verifying ownership against the authenticated tenant:

| Parameter | Client-Supplied Risk | Server Enforcement Rule |
| :--- | :--- | :--- |
| `tenantId` | Cross-tenant data breach | Overridden completely from `UserContext.getTenantId()`. |
| `supplierId` | Unauthorized vendor alteration | Verified to match `original_invoice.supplier_id` and owned by authenticated tenant. |
| `invoiceId` | Forging returns against other tenants' invoices | SQL query strictly binds `WHERE id = ? AND tenant_id = ?`. |
| `depotId` | Unauthorized warehouse stock deduction | Checked against `userContext.getAuthorizedDepotIds()`. |
| `returnQuantity` | Over-return / Negative quantity injection | Asserts `returnQty > 0` AND $\text{returnQty} \le \text{depotStock}$ AND $\le \text{openBalance}$. |
| `taxRate` / `taxAmount` | Client tax tampering | Recalculated server-side from original purchase invoice tax slab. |

---

## 3. Idempotency & Concurrency Security

### 3.1 Idempotency Key Lock
- Client must pass `X-Idempotency-Key` on return submission.
- Prevents duplicate physical delivery challans or duplicate AP credit postings caused by network timeouts or double-clicking.

### 3.2 Concurrency & Row-Level Locking
- When decrementing `erp_material_current_stock` and updating `erp_purchase_line_fulfillment`, updates use row-level pessimistic locking (`FOR UPDATE`) within the `@Transactional` boundary.
- Prevents race conditions where two warehouse operators attempt to return the same on-hand stock simultaneously.

---

## 4. Multi-Tenant Penetration & Regression Test Matrix

| Test ID | Threat Scenario | Expected System Defense |
| :--- | :--- | :--- |
| `P7-SEC-01` | Tenant B attempts to create Purchase Return against Tenant A's Invoice | **REJECTED (404/403: Invoice not found or unauthorized)** |
| `P7-SEC-02` | User lacks `PURCHASE_RETURN_APPROVE` permission | **REJECTED (403: Access Denied)** |
| `P7-SEC-03` | User scoped to Depot 1 attempts to return stock from Depot 2 | **REJECTED (403: Depot out of authorized DataScope)** |
| `P7-SEC-04` | Creator attempts to approve their own return under STRICT SoD policy | **BLOCKED (400: SoD violation: Approver cannot be Creator)** |
| `P7-SEC-05` | Attempt to submit negative return quantity (`qty < 0`) | **REJECTED (400: Invalid return quantity)** |
| `P7-SEC-06` | Attempt to return quantity exceeding available depot stock | **REJECTED (400: Insufficient physical stock in depot)** |
