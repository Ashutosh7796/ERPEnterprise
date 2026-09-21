# Dimension 1: Tenant-Isolation Adversarial Test Results

## 1. Test Overview & Objectives
Adversarially tested cross-tenant boundary security across all CRUD operations, batch jobs, export endpoints, file attachments, and background processes to ensure that Tenant A (ID=149) cannot read, write, update, delete, or export data belonging to Tenant B (ID=150).

## 2. Attack Vectors & Verification Matrix

| Test Scenario | Attack Technique | Expected Behavior | Observed Result | Verdict |
|---|---|---|---|:---:|
| **Query Parameter Injection** | Inject `tenantId=150` in `GET /bill/list?tenantId=150` by Tenant A user | Server ignores parameter; queries strictly for Tenant A | Server queried Tenant 149 data only | **PASS** |
| **JSON Payload Injection** | Inject `"tenantId": 150` in `POST /material/add` by Tenant A user | Server overrides with Tenant A ID (149) before insert | Tenant 149 inserted | **PASS** |
| **URL Path ID Enumeration** | Request `/depot/150` belonging to Tenant B by Tenant A | SQL Interceptor appends `AND tenant_id = 149` | Returns 404 / Empty | **PASS** |
| **Batch Delete Poisoning** | Send `POST /material/batchDelete` with mixed IDs (Tenant A & B) | MyBatis-Plus intercepts batch delete with tenant filter | Only Tenant A rows affected | **PASS** |
| **Export Data Exfiltration** | Send `GET /report/exportExcel` attempting cross-tenant export | Server-side report query restricted by tenant context | Zero Tenant B rows exported | **PASS** |
| **File Attachment Cross-Read** | Request attachment ID belonging to Tenant B | Authorization filter checks resource owner tenant | 403 Forbidden | **PASS** |

## 3. Core Architectural Guarantees
- **Server-Authoritative Tenant Line Handler**: MyBatis-Plus `TenantLineInnerInterceptor` automatically injects `tenant_id = #{currentTenantId}` into all executed SQL queries (SELECT, INSERT, UPDATE, DELETE).
- **Zero Client Trust**: All client-supplied `tenantId` query params, headers, or JSON body fields are completely discarded and overridden by `SecurityContext.getCurrentTenantId()`.
- **Fail-Closed Default**: If no valid tenant context is established, queries fail immediately with 401/403.
