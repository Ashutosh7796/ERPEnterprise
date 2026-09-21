# Validation Artifact 01: Existing Codebase & Data Flow Audit

**Repository:** `ERPSystem-boot` (Spring Boot 3 / MyBatis) + `ERPSystem-web-react` (React 19 / Ant Design)  
**Date:** September 2026  

---

## 1. Full Data Flow Trace

```
[ FRONTEND ]
  - Features: src/features/financial (MoneyInList, MoneyOutList, AdvanceInList, GiroList, AccountList)
  - API Client: src/core/api/client.ts -> axios with interceptors, token header, response unwrapping

[ API LAYER ]
  - Controllers: AccountController (/account/*), AccountHeadController (/accountHead/*), AccountItemController (/accountItem/*)
  - Interceptors: TenantSecurityInterceptor (sets UserContext.tenantId)

[ SERVICE LAYER ]
  - AccountHeadService: Creates/Updates/Deletes voucher envelopes, batchSetStatus() approval
  - AccountItemService: Manages line items, updates DepotHead.debt for invoice settlements
  - AccountService: Dynamic aggregation of bank balances across DepotHead, AccountHead, AccountItem

[ PERSISTENCE LAYER ]
  - MyBatis XML: AccountHeadMapperEx.xml, AccountMapperEx.xml, AccountItemMapperEx.xml
  - Tables: erp_account (Cash/Bank), erp_account_head (Voucher Head), erp_account_item (Voucher Lines), erp_in_out_item (Category Heads), erp_depot_head (Invoices)
```

## 2. Key Forensic Findings
1. **Cash/Bank Account vs General Ledger Account**: `erp_account` is strictly a bank/cash account register (`serial_no`, `initial_amount`, `current_amount`). It is not a General Ledger COA.
2. **Receivable/Payable Tracking**: `erp_depot_head` stores `debt` directly on invoices. `AccountItemService` deducts debt when an invoice is settled by a payment.
3. **Tax Snapshots**: `erp_document_tax_snapshot` stores deterministic `totalTaxableValue`, `totalCgstAmount`, `totalSgstAmount`, `totalIgstAmount`, `roundOffAmount`, `finalInvoiceTotal`.
4. **Conclusion**: The operational workflow is mature and clean. What is missing is the downstream double-entry GL ledger that records balanced debits and credits upon document approval.
