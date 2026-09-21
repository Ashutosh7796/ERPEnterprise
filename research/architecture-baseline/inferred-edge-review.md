# Inferred Edge & Community Linkage Review

**Audit Date**: 2026-08-21  
**Scope**: Classification of Inferred vs Extracted Relationships in Knowledge Graph  

---

## 1. Overview of Inferred Relationships

Graphify distinguishes between **EXTRACTED** (deterministic AST syntax tree relationships such as direct method calls, imports, and inheritance) and **INFERRED** (semantic / structural linkages deduced via cross-referencing, heuristic name matches, or conceptual coupling).

```text
========================================================================================
                          EDGE EXTRACTION CLASSIFICATION
========================================================================================
  Direct AST Extracted Edges (EXTRACTED) : 47,161
  Inferred Cross-Module Edges (INFERRED) : 10,106
  Ambiguous Relationships (AMBIGUOUS)    : 0
========================================================================================
```

---

## 2. High-Impact Edge Classification Audit

| Source Node | Target Node | Edge Type | Graphify Relation | Audit Classification | Source Verification Note |
|---|---|:---:|:---:|:---:|---|
| `GstSalesInvoiceService` | `SalesAccountingPostingService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct invocation in `transitionInvoiceState` |
| `GstSalesInvoiceService` | `SalesLineageService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct invocation in `transitionInvoiceState` |
| `SalesOrderApprovalService` | `StockReservationService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct invocation upon `APPROVED` order state |
| `SalesLineageService` | `StockReservationService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct invocation in `recordDeliveryDispatch` |
| `SalesPaymentAllocationService`| `DocumentRelationshipService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct DAG registration in `allocatePaymentToInvoices` |
| `SalesReturnService` | `DocumentRelationshipService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Direct DAG registration in `processSalesReturn` |
| `TenantConfig` | `TenantContext` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Invoked inside `TenantLineHandler.getTenantId()` |
| `DataScopeService` | `UserTenantMembership` | EXTRACTED | `references` | **CONFIRMED BY SOURCE** | Evaluates membership record in `resolveDataScope` |
| `SupportAccessService` | `SupportNotificationService` | EXTRACTED | `calls` | **CONFIRMED BY SOURCE** | Real-time SSE dispatch on session approval |

---

## 3. High-Centrality Bridge Nodes (Betweenness Centrality)

1. **`Criteria` / `GeneratedCriteria` (Centrality: 0.004)**:
   * **Role**: The foundational query builder used across all MyBatis Example objects (`DepotHeadExample`, `SupplierExample`, `AccountHeadExample`).
   * **Verification**: Confirmed structural bridge.
2. **`UserBusiness` (Centrality: 0.002)**:
   * **Role**: Entity connecting user identities to roles, organizations, and permissions.
   * **Verification**: Confirmed structural bridge.
3. **`DepotHead` / `DepotItem` (Centrality: 0.003)**:
   * **Role**: Core transaction header and line item entities connecting Sales Orders, Deliveries, Invoices, and Returns.
   * **Verification**: Confirmed structural bridge.

---

## 4. Ambiguity Assessment

* **Zero Unverified Edge Promotions**: No inferred edges have been silently promoted to structural facts.
* All critical architectural paths (Security, Sales, Finance, GST, Support) rely exclusively on **CONFIRMED BY SOURCE (EXTRACTED)** AST edges.
