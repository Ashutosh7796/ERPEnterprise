# Validation Artifact 02: GraphiPhy Knowledge Graph & Structural Coupling Analysis

**Graph Source:** `graphify-out/graph.json`  
**Purpose:** Evaluate dependency graph, coupling, and where new accounting nodes fit.

---

## 1. Graph Structure & Clusters
- **Commercial Invoicing Cluster**: `DepotHeadService` <-> `DepotItemService` <-> `SupplierService` <-> `MaterialService`.
- **Financial Sub-Ledger Cluster**: `AccountHeadService` <-> `AccountItemService` <-> `AccountService` <-> `InOutItemService`.
- **Statutory Tax Cluster**: `DocumentTaxSnapshot` <-> `TaxRuleService` <-> `TaxRateService` <-> `HsnSacService`.
- **Multi-Tenant Bootstrap Cluster**: `TenantProvisioningOrchestrator` -> `TenantBootstrapService`.

## 2. Structural Coupling Assessment
- Introducing `GlPostingService` creates a clean one-way dependency from `DepotHeadService` (Invoices) and `AccountHeadService` (Payments) down into the accounting engine.
- The accounting engine depends only on `jsh_account_coa` and `jsh_gl_entry`.
- No circular dependencies or coupling back into commercial services.
