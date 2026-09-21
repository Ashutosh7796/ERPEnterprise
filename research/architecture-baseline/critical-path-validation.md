# Critical Path Validation

This document manually traces and validates the core architectural execution paths through the Graphify knowledge graph.

---

## 1. Request Authentication, Tenant Isolation & Database Execution Path

```text
[HTTP Request]
       │ (Header: "X-Access-Token")
       ▼
[AuthorizationService.resolveSecurityContext(request)]
       │
       ├─► Validates Token Claims & resolves activeTenantId
       ├─► Binds: TenantContext.setCurrentContext(tenantCtx)
       │
       ▼
[Spring Web MVC Controller (e.g. GstSalesInvoiceController)]
       │
       ▼
[Domain Service (e.g. GstSalesInvoiceService)]
       │
       ├─► Evaluates Business Logic & Data Scopes (DataScopeService)
       │
       ▼
[MyBatis-Plus ORM / MyBatis Mapper / Native JdbcTemplate]
       │
       ├─► TenantLineHandler intercepts AST: appends "AND tenant_id = ?"
       ├─► OR Native SQL explicitly binds: "WHERE tenant_id = ?"
       │
       ▼
[Database (MySQL InnoDB Engine)]
```

### Graph Validation Check:
* Node `com.jsh.erp.security.AuthorizationService` has directed `calls` edge to `com.jsh.erp.security.TenantContext.setCurrentContext`.
* Node `com.jsh.erp.config.TenantConfig` has directed `calls` edge to `com.jsh.erp.security.TenantContext.getActiveTenantId`.
* All service nodes connect to their respective mapper/database caller targets.

---

## 2. Complete Enterprise Sales Execution Path (Phases S1 - S7)

```text
[QuotationService] (Phase S2)
       │ (createQuotation, createRevision, convertToSalesOrder)
       ▼
[SalesOrderApprovalService] (Phase S2)
       │ (submitAndEvaluateSalesOrder, approveSalesOrder)
       ├─► Evaluates Customer Credit Exposure (CustomerCreditExposureService)
       │
       ▼ (On Status: APPROVED)
[StockReservationService] (Phase S3)
       │ (createReservationForSalesOrder: inserts erp_stock_reservation)
       │
       ▼
[SalesLineageService] (Phase S1 & S3)
       │ (recordDeliveryDispatch: consumes reservation + updates delivered_qty)
       │
       ▼
[SalesAccountingPostingService] (Phase S5)
       │ (postDeliveryDispatchToCOGS: Dr COGS 5101 / Cr Inventory 1401)
       │
       ▼
[GstSalesInvoiceService] (Phase S4)
       │ (createOrUpdateDraftInvoice, transitionInvoiceState -> POSTED)
       ├─► Evaluates Rule 46, POS (Bill-To vs Ship-To), Tax Splitting, E-Way Bill
       ├─► Updates Invoiced Qty in S1 Lineage
       ├─► Calls SalesAccountingPostingService: Dr AR 1101, Cr Revenue 4101, Cr GST 2201-2203
       │
       ▼
[SalesPaymentAllocationService] (Phase S6)
       │ (allocatePaymentToInvoices: multi-invoice settlement, updates paid_status)
       ├─► GL: Dr Bank 1002 / Cr Customer AR 1101
       ├─► Decrements erp_supplier.all_need_get
       │
       ▼
[SalesReturnService] (Phase S7)
       │ (processSalesReturn: restocks depot, issues Rule 53 Credit Note)
       ├─► GL: Dr Sales Return 4102, Dr Output GST 2201 / Cr Customer AR 1101
       └─► Reconciles S1 Lineage & S3 Stock balances
```

### Graph Validation Check:
* All 7 domain service nodes exist in the graph, with valid directed call chains, parameter bindings, and relationship edges.

---

## 3. Ephemeral Support Session & Real-Time SSE Notification Path

```text
[SupportAccessService.requestSupportSession]
       │ (Status: PENDING_APPROVAL)
       ▼
[SupportNotificationService.notifyTenantAdmin]
       │ (Pushes SSE event to Tenant Header: SUPPORT_REQUEST)
       ▼
[Tenant Admin Action: Approve Session]
       │ (Status: ACTIVE, generates ephemeral token)
       ▼
[SupportNotificationService.notifySpecialist]
       │ (Pushes SSE event to Support Specialist: SESSION_APPROVED)
       ▼
[Specialist Ingress: AuthorizationService]
       │ (Resolves token -> sets TenantContext to target tenant)
       ▼
[Session Revocation / Expiry]
       │ (Status: REVOKED, immediately invalidates token)
       └─► SSE broadcast: SESSION_REVOKED
```

### Graph Validation Check:
* `SupportAccessService` $\xrightarrow{\text{calls}}$ `SupportNotificationService.sendEventToTenant` $\xrightarrow{\text{calls}}$ `SseEmitter.send`.
* Heartbeat loop: `SupportNotificationService.sendHeartbeat` annotated with `@Scheduled(fixedRate = 25000)`.
