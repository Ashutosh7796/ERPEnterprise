# Phase S2: Recommended Architectural Design

---

## 1. Architectural Overview & Component Structure

```mermaid
flowchart TD
    subgraph Client Layer
        A[React UI: QuotationListPage]
        B[React UI: SaleOrderListPage]
    end
    
    subgraph Security & Scope Filter
        C[SecurityFilter: Tenant & User Context]
        D[DataScopeService: ORG / DEPOT / ALL Scope Gate]
    end
    
    subgraph S2 Services Engine
        E[QuotationService: CRUD & Revisions]
        F[CustomerCreditExposureService: Multi-Component Calculation]
        G[SalesOrderApprovalService: Rule Engine & Audit]
    end
    
    subgraph Persistence Layer
        H[(erp_quotation & erp_quotation_item)]
        I[(erp_depot_head: Sales Order)]
        J[(erp_approval_history)]
    end
    
    A --> C --> E --> H
    E -- 1-Click Convert --> I
    B --> C --> D --> G
    G --> F
    G --> I
    G --> J
```

---

## 2. Platform Security & Authorization Enforcement
1. **Zero Client Trust**: All tenant IDs, user IDs, and organization boundaries are derived exclusively from the authenticated server `SecurityContext`.
2. **Data Scope Gate**: Approval operations verify that the target Sales Order's `organization_id` falls within the manager's authorized `DataScopeType` (`ALL`, `ORG`, `DEPOT`, `SELF`).
3. **Role Authorization**: Approving orders with credit limit breaches requires Role ID 3 (Tenant Admin) or specific `SALES_CREDIT_OVERRIDE` permission.
