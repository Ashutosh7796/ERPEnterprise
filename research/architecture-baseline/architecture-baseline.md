# Long-Term Backend Architecture Baseline (Certified)

**Target System**: Backend Application Container (`./ERPSystem-boot`)  
**Scope Classification**: **BACKEND ARCHITECTURE BASELINE** (Excludes Frontend React Web App)  
**Certification Date**: 2026-08-21  
**Baseline Status**: **FROZEN & CERTIFIED**  

---

## 1. Canonical Baseline Metadata

```yaml
# ==============================================================================
# CANONICAL GRAPHIFY BACKEND BASELINE METADATA
# ==============================================================================
Repository Commit SHA: 5d546ab15cc0047442e33d0533131e38d65a7253
Build Timestamp: 2026-08-21T12:20:00+05:30
Execution Mode: Deep AST Directed Graph (--mode deep --directed)
Graphify Package (graphifyy) Version: 0.9.48
Graphify CLI Version: 0.9.48
Graphify Schema Version: NetworkX JSON node-link format v1.0
Graphify MCP Protocol Version: 0.9.48

Target Scope Path: ./ERPSystem-boot
Graph JSON Location: graphify-out/graph.json
Interactive HTML Visualization: graphify-out/graph.html
Full Audit Report: graphify-out/GRAPH_REPORT.md

Graph Structural Metrics:
  total_nodes: 15287
  total_edges: 47161
  extracted_edges: 37055 (79% - deterministic AST structural syntax)
  inferred_edges: 10106 (21% - cross-file AST identifier resolutions, avg confidence 0.81)
  ambiguous_edges: 0 (0% - unresolvable candidate edges dropped)
  communities_count: 297 (119 dominant, 178 fine-grained)

Source Code Coverage:
  java_source_files_parsed: 546 (100% of ERPSystem-boot Java compilation units)
  java_classes_interfaces: 546
  method_declarations: 13208
  method_invocations: 18320
  type_field_references: 10934
  import_dependencies: 3166

Known Parser Gaps:
  - tree_sitter_sql optional package not installed: 13 static DDL files unparsed
  - DDL schema captured via Java entities/mappers rather than raw SQL AST
```

---

## 2. Baseline Trust & Confidence Model

To ensure architectural integrity when evaluating future pull requests and version upgrades, all relationships in this graph must be interpreted according to the following 3-tier trust model:

| Confidence Tier | Graphify Designation | Edge Percentage | Definition & Architectural Trust Policy |
|---|:---:|:---:|---|
| **Tier 1: High (Ground Truth)** | `EXTRACTED` | **79%** (37,055 edges) | **Source-Confirmed Structural Relationship**.<br>Direct deterministic AST facts: class methods (`method`), package containment (`contains`), import statements (`imports`), class inheritance (`inherits`), interface implementation (`implements`), and explicit intra-class method invocations (`calls`). Safe for automated refactoring and compiler assumptions. |
| **Tier 2: Medium (Plausible)** | `INFERRED` | **21%** (10,106 edges) | **Architectural Identifier Inference**.<br>Cross-file method and type references deduced by AST identifier resolution without a global compiler classpath symbol table (average confidence: 0.81). *Requires manual source confirmation for critical security or transactional refactoring decisions.* |
| **Tier 3: Low (Untrusted)** | `AMBIGUOUS` | **0%** (0 edges) | **Unverified Candidate Relationship**.<br>Cannot be confirmed by syntax or semantic context. *Strictly excluded from architectural baseline facts.* |

---

## 3. Explicit Baseline Scope & Path Boundaries

```text
========================================================================================
                                 BASELINE SCOPE BOUNDARIES
========================================================================================
  [+] INCLUDED PATHS:
      - ERPSystem-boot/src/main/java/**       (Controllers, Services, Security, Entities, Mappers)
      - ERPSystem-boot/src/test/java/**       (Security, Regression, and Red-Team Test Suites)
      - ERPSystem-boot/src/main/resources/**  (MyBatis XML Mapper configurations)

  [-] EXCLUDED SUBPROJECTS (Separate Lifecycle / Toolchain):
      - ERPSystem-web-react/**                (React 18 / TypeScript Frontend UI)
      - research/**                           (Architectural design notes & statutory references)
      - .agents/**                            (Local IDE workflows, skills, and rule configs)
      - logs.home_IS_UNDEFINED/**             (Runtime server execution logs)

  [!] INTENTIONALLY UNINDEXED ARTIFACTS:
      - External JDK Runtime Classes          (java.lang.*, java.util.*, java.math.*)
      - Spring Framework Binary Libraries     (org.springframework.*, jakarta.servlet.*)
      - Tree-Sitter Raw SQL AST (13 files)    (Raw DDL scripts in src/main/resources/sql/)
========================================================================================
```

---

## 4. Reconciled Architectural Core Modules

### A. Security & Multi-Tenancy Engine
1. **`TenantContext`**: ThreadLocal active tenant boundary isolation ([`TenantContext.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/security/TenantContext.java)).
2. **`AuthorizationService`**: Unified token validation, RBAC evaluation, and support token ingress ([`AuthorizationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/security/AuthorizationService.java)).
3. **`TenantLineHandler` (`TenantConfig`)**: MyBatis-Plus automatic SQL AST tenant isolation filter ([`TenantConfig.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/config/TenantConfig.java)).
4. **`DataScopeService`**: Depot / Organization / Branch granular data-masking engine ([`DataScopeService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DataScopeService.java)).

### B. Enterprise Sales Lifecycle (Phases S1 - S7)
1. **Phase S1 Lineage**: `erp_so_line_fulfillment` tracking ordered, delivered, and invoiced quantity balances ([`SalesLineageService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesLineageService.java)).
2. **Phase S2 Quotation & Credit**: `QuotationService` revisioning, CAS SO conversion, `SalesOrderApprovalService`, and `CustomerCreditExposureService`.
3. **Phase S3 Stock Reservation**: `StockReservationService` managing line-level depot reservations with atomic CAS consumption and cancellation release ([`StockReservationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/StockReservationService.java)).
4. **Phase S4 Authoritative Invoicing**: `GstSalesInvoiceService` Rule 46 commercial invoice, Section 10(1)(b) Bill-to vs Ship-to POS, intra/inter-state tax splitting, SEZ/Export LUT, and Section 170 rupee rounding ([`GstSalesInvoiceService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/GstSalesInvoiceService.java)).
5. **Phase S5 General Ledger Accounting**: `SalesAccountingPostingService` managing double-entry journal vouchers (`erp_gl_journal_entry` & `erp_gl_journal_line`) for Delivery COGS and Sales Invoices ([`SalesAccountingPostingService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesAccountingPostingService.java)).
6. **Phase S6 Payment Allocation**: `SalesPaymentAllocationService` multi-invoice settlement vouchers, paid balance transitions (`PARTIALLY_PAID` / `FULLY_PAID`), and DAG linkage ([`SalesPaymentAllocationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesPaymentAllocationService.java)).
7. **Phase S7 Sales Returns**: `SalesReturnService` physical restocking, Rule 53 Credit Notes (`erp_gst_credit_debit_note`), GL reversals, and lineage reconciliation ([`SalesReturnService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SalesReturnService.java)).

### C. Ephemeral Support & Real-Time SSE
1. **`SupportAccessService`**: Time-bound, tenant-consented ephemeral access tokens (`SUPPORT_...`) with full audit logging ([`SupportAccessService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SupportAccessService.java)).
2. **`SupportNotificationService`**: Real-time W3C SSE event streaming with 25s keepalive heartbeat ping ([`SupportNotificationService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/SupportNotificationService.java)).

---

## 5. Audit Documents Reference Inventory

* [`graph-integrity-audit.md`](file:///e:/Codes/ERP/jshERP-master/research/architecture-baseline/graph-integrity-audit.md) — Comprehensive metric reconciliation and structural validation.
* [`graph-coverage-report.md`](file:///e:/Codes/ERP/jshERP-master/research/architecture-baseline/graph-coverage-report.md) — Complete inventory comparison of disk files vs graph nodes.
* [`critical-path-validation.md`](file:///e:/Codes/ERP/jshERP-master/research/architecture-baseline/critical-path-validation.md) — Trace and validation of Security, Sales, and Support runtime paths.
* [`inferred-edge-review.md`](file:///e:/Codes/ERP/jshERP-master/research/architecture-baseline/inferred-edge-review.md) — Detailed classification of inferred call edges and bridge nodes.
* [`database-graph-review.md`](file:///e:/Codes/ERP/jshERP-master/research/architecture-baseline/database-graph-review.md) — Analysis of Java ORM, native SQL, and SQL migration coverage limitations.
