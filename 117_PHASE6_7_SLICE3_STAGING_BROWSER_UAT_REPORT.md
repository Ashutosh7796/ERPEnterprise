# PHASE 6/7 — TRACK A: SLICE 3 STAGING BROWSER UAT REPORT
## REAL BROWSER UAT, LIVE DATABASE EXECUTION & CERTIFICATION CLOSURE REVIEW

**Document Reference:** `117_PHASE6_7_SLICE3_STAGING_BROWSER_UAT_REPORT.md`  
**Archived Reference:** `research/phase-6-7/117_PHASE6_7_SLICE3_STAGING_BROWSER_UAT_REPORT.md`  
**Phase Under UAT:** Phase 6/7 Track A — Slice 3  
**Implementation Report:** `115_PHASE6_7_SLICE3_IMPLEMENTATION_REPORT.md`  
**Independent Safety Review:** `116_PHASE6_7_SLICE3_INDEPENDENT_SAFETY_REVIEW.md`  
**Certified Frozen Predecessors:**
- Phase 4C.4 — Financial Year Finalization & Year-End Closing (`93_phase4C_4_...`)
- Track A.1 — Next-Year Opening Balance Rollover (`95_trackA1_...`)
- Track A.2 — Schedule III Cash Flow Statement (`97_trackA2_...`)
- Track A.3 — Supervisory Fiscal-Year Reopening (`99_trackA3_...`)
- Phase 5 — Platform Configuration & Multi-Organization Architecture (`104_phase5_...`)
- Phase 6/7 Slice 1 — Tenant Provisioning Foundation (`106_...`, `107_...`)
- Phase 6/7 Slice 2 — Tenant Lifecycle Governance & Session Eviction (`110_...`, `112_...`, `113_...`)  
**Certified Regression Baseline:** **585 / 585 PASSING** across 34 classes (549 baseline + 36 Slice 3 tests)  
**UAT Execution Date:** September 21, 2026  
**UAT Review Authority:** Enterprise Architecture & Forensic Security Gate Review Board  
**Target Acceptance Condition:** **RC-S3-06 — Staging Browser UAT for `TenantList.tsx`**  
**Status:** **LIVE STAGING BROWSER & API FORENSIC UAT COMPLETE**

---

## FINAL UAT VERDICT

```text
========================================================================================
FINAL RC-S3-06 DETERMINATION & UAT VERDICT:
RC-S3-06 — FAILED
PRODUCTION-BLOCKING IMPLEMENTATION DEFECTS DISCOVERED IN LIVE STAGING RUN
========================================================================================
```

In accordance with Section 16 ("IMPORTANT RULE: If UAT discovers an implementation defect, DO NOT silently fix it during the UAT review. Record defect, reproduction, impact, affected component, severity, then stop"), this report documents three critical/high implementation defects discovered during live staging deployment that were masked by Mockito-isolated unit tests. A separate remediation cycle must be authorized before RC-S3-06 can be certified closed.

---

# 1. ENVIRONMENT SPECIFICATION

The staging environment was deployed on the local workstation:

| Layer | Technology & Version | Host & Port | Status | Verification Detail |
| :--- | :--- | :--- | :---: | :--- |
| **Backend** | Spring Boot 3.3.2 / OpenJDK 21.0.8 | `http://localhost:9999/ERPSystem-boot` | **ACTIVE** | Started via `mvn spring-boot:run` (PID: Background task 1965). |
| **Frontend** | React 19.2.8 / Vite 8.2.1 | `http://localhost:3001/` | **ACTIVE** | Started via `npm run dev` (PID: Background task 1967). Proxies API calls to backend. |
| **Database** | MySQL Server 8.0.x | `127.0.0.1:3306` (`erp_system_db`) | **ACTIVE** | Standard production MySQL instance with InnoDB engine and generated columns. |
| **Cache** | Redis Server 8.10.1 (MSYS2 Windows) | `127.0.0.1:6379` | **ACTIVE** | Native port 6379 listener; verified via `Test-NetConnection` (`TcpTestSucceeded: True`). |
| **Browser** | Headless Chrome (Browser Subagent) | Resolution: 1920x1080 | **ACTIVE** | Session recording captured and archived. |

---

# 2. SCOPE OF UAT AUDIT

The UAT exercised real HTTP/API requests and browser interactions against the running system:
1. Frontend application load on `http://localhost:3001/`.
2. SuperAdmin authentication flow and session state establishment in live Redis.
3. Tenant List retrieval (`GET /tenant/list`).
4. Real-time multi-resource Tenant Provisioning (`POST /platform/tenant/provision`).
5. Lifecycle state transitions (`POST /platform/tenant/suspend`).
6. Session eviction and fail-closed authentication filter verification.

---

# 3. TENANT LIST UAT & FORENSIC DISCOVERY

### 3.1 Observed Failure on `GET /tenant/list`
When an authenticated SuperAdmin session executed `GET /tenant/list?currentPage=1&pageSize=10`, the endpoint failed with **HTTP 300 / Internal Server Error**.

### 3.2 Root Cause Analysis from Server Trace
Inspection of the backend execution log (`task-1965.log`) revealed:
```text
Caused by: com.mysql.cj.exceptions.NumberOutOfRange: Value 'ACTIVE' is outside of valid range for type java.lang.Byte
    at com.mysql.cj.result.ByteValueFactory.createFromBytes(ByteValueFactory.java:114)
    at com.mysql.cj.protocol.a.MysqlBinaryValueDecoder.decodeByteArray(MysqlBinaryValueDecoder.java:281)
    at org.apache.ibatis.session.defaults.DefaultSqlSession.selectList(DefaultSqlSession.java:147)
    at com.jsh.erp.datasource.mappers.TenantMapperEx.selectByConditionTenant(TenantMapperEx.java)
```

### 3.3 Code Inspection of `TenantMapperEx.xml`
Examination of `ERPSystem-boot/src/main/resources/mapper_xml/TenantMapperEx.xml` (line 5):
```xml
<!-- DEFECT: Erroneously extends LogMapper.BaseResultMap instead of TenantMapper.BaseResultMap -->
<resultMap extends="com.jsh.erp.datasource.mappers.LogMapper.BaseResultMap" id="ResultMapEx" type="com.jsh.erp.datasource.entities.TenantEx">
    <result column="roleId" jdbcType="VARCHAR" property="roleId" />
    <result column="roleName" jdbcType="VARCHAR" property="roleName" />
    <result column="userCount" jdbcType="VARCHAR" property="userCount" />
</resultMap>
```
In `LogMapper.xml` (line 10), the `status` column is mapped as:
```xml
<result column="status" jdbcType="TINYINT" property="status" />
```
Because `TenantMapperEx.xml` inherited from `LogMapper` rather than `TenantMapper`, MyBatis attempts to cast string values like `'ACTIVE'`, `'SUSPENDED'`, and `'EXPIRED'` to `java.lang.Byte`. This completely breaks tenant querying on live MySQL.

---

# 4. LIFECYCLE ACTION UAT & FORENSIC DISCOVERY

### 4.1 Observed Failure on `POST /platform/tenant/suspend`
When the SuperAdmin executed `POST /platform/tenant/suspend` with payload `{"tenantId": 330, "reason": "Staging UAT Lifecycle Test"}`, the endpoint returned:
```json
{
    "code": 500,
    "data": "Unknown system error"
}
```

### 4.2 Root Cause Analysis from Server Trace
Backend log analysis revealed an unhandled `UncategorizedSQLException`:
```text
### Error updating database. Cause: java.sql.SQLException: The value specified for generated column 'active_tenant_id' in table 'erp_tenant_subscription' is not allowed.
### SQL: UPDATE erp_tenant_subscription SET tenant_id = ?, plan_id = ?, plan_code = ?, status = ?, is_active = ?, active_tenant_id = ?, start_date = ?, end_date = ?, grace_period_end = ?, change_reason = ?, create_time = ?, update_time = ? WHERE id = ?
### Cause: java.sql.SQLException: The value specified for generated column 'active_tenant_id' in table 'erp_tenant_subscription' is not allowed.
SQL state [HY000]; error code [3105]
```

### 4.3 Code Inspection of Generated Column Mapping
- In table `erp_tenant_subscription`, `active_tenant_id` is a MySQL `STORED` generated column (`GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN tenant_id ELSE NULL END)`).
- MySQL strictly forbids updating a generated column directly.
- In `TenantSubscription.java`, `active_tenant_id` lacks `@TableField(exist = true, updateStrategy = FieldStrategy.NEVER)`.
- When `TenantLifecycleService` invokes `tenantSubscriptionMapper.updateById(sub)`, MyBatis-Plus includes `active_tenant_id = ?` in the SET clause, crashing on live MySQL.

---

# 5. AUTHORIZATION UAT & GATEWAY FILTER DISCOVERY

### 5.1 Hardcoded User ID Check in `LogCostFilter.java`
Inspection of `LogCostFilter.java` (lines 81–89):
```java
// DEFECT: Hardcodes userId == 1L as the only platform admin
boolean isExplicitPlatformAdmin = userId.equals(1L) || "1".equals(userId.toString());

if (tenantId == null && !isExplicitPlatformAdmin) {
    servletResponse.setStatus(403);
    servletResponse.setContentType("application/json;charset=UTF-8");
    servletResponse.getWriter().write("{\"code\":403,\"data\":{\"error\":\"TENANT_CONTEXT_MISSING\",\"message\":\"Missing or invalid tenant context on authenticated request. Access denied fail-closed.\"}}");
    return;
}
```
- In real databases, administrator accounts can have IDs other than 1 (e.g. `admin` with `id = 120` in the current staging database, or `ash` with `id = 153`).
- When user `admin` logs in, they have no customer tenant ID (`tenantId == 0L` or `null`).
- `LogCostFilter` evaluates `!isExplicitPlatformAdmin` as `true` and denies the legitimate platform administrator with HTTP 403 `TENANT_CONTEXT_MISSING`.

---

# 6. VERIFIED FUNCTIONALITY (WORKING END-TO-END)

Despite the three defects discovered above, critical backend orchestration was proven functional on live databases:

### 6.1 Multi-Resource Provisioning Orchestration (`/platform/tenant/provision`)
Executed real network provisioning call:
```json
{
  "loginName": "uat_tenant_01",
  "companyName": "UAT Testing Corp",
  "adminFullName": "UAT Admin",
  "adminEmail": "uat@test.com",
  "adminPhone": "9876543210",
  "password": "password123",
  "planId": 1,
  "durationDays": 365,
  "initialOrgName": "UAT Head Office",
  "initialDepotName": "UAT Warehouse",
  "remark": "Staging UAT Verification"
}
```
**Result (HTTP 200 OK):**
- Bootstrapped Tenant ID: `330`
- Provisioned Root Organization: `999903`
- Default Warehouse Depot: `951025`
- Cash/Bank Accounts Initialized: `80624`, `80625`
- Document Series Configured: `8 series`
- Active Financial Year Established: `25315`
- Initial Admin User Created: `970389`
- Expiration Date: `2027-09-21` (365 days)
- Lifecycle Status: `ACTIVE`

### 6.2 Redis Dual-Tier Session Integration
- Stored session hash in live Redis key `token -> {userId, tenantId, tenantVersion}`.
- Monitored Redis operations via `redis-server.exe` on port 6379.
- Verified that unauthenticated requests without Redis session fail closed with HTTP 500 (`loginOut`).

---

# 7. BROWSER UAT & EVIDENCE RECORDING

The headless browser subagent connected to `http://localhost:3001/`:
- **Navigation & Routing:** Clean redirection to `http://localhost:3001/login`.
- **Page Layout & UI:** Rendered `jshERP Pro v3.6` enterprise login interface, custom illustration banners, and login inputs (`#loginName`, `#password`, `#code`).
- **Session Protection:** Browser console accurately logged session expiry warnings when unauthenticated:
  - `Failed to fetch session user info: ApiError: Session timed out. Please log in again.`
- **Artifact Recording:** Browser execution recording saved and archived:
  - File: `C:\Users\admin\.gemini\antigravity-ide\brain\668c53c8-0f89-4177-8506-d017f1347854\tenant_uat_test_1789973844094.webp`

---

# 8. DEFECTS REGISTER (DISCOVERED IN LIVE STAGING)

| Defect ID | Severity | Component | Reproduction Scenario | Observed Defect & Impact |
| :--- | :---: | :--- | :--- | :--- |
| **D-S3-01** | **CRITICAL** | `TenantMapperEx.xml` (line 5) | SuperAdmin views Tenant List (`GET /tenant/list`) | Extends `LogMapper.BaseResultMap` instead of `TenantMapper.BaseResultMap`. MySQL throws `com.mysql.cj.exceptions.NumberOutOfRange: Value 'ACTIVE' is outside of valid range for type java.lang.Byte`. TenantList UI cannot load rows. |
| **D-S3-02** | **HIGH** | `LogCostFilter.java` (line 82) | SuperAdmin logs in with account whose DB ID is not 1 (e.g. `admin` ID 120) | Hardcoded `userId.equals(1L)` rejects legitimate SuperAdmin requests with HTTP 403 `TENANT_CONTEXT_MISSING`. |
| **D-S3-03** | **CRITICAL** | `TenantSubscription.java` / `TenantLifecycleService.java` | SuperAdmin executes tenant suspension (`POST /platform/tenant/suspend`) | `active_tenant_id` is a MySQL `STORED` generated column. `updateById(sub)` attempts to update it in SQL SET clause, triggering MySQL error 3105 (`UncategorizedSQLException`). Lifecycle mutations fail with HTTP 500. |

---

# 9. RC-S3-06 FORMAL DETERMINATION

In accordance with Section 15 of the mandate:

```text
========================================================================================
RC-S3-06 DETERMINATION:
RC-S3-06 — FAILED
========================================================================================
```

### Justification:
While the frontend code compiles cleanly and backend provisioning functions properly, real browser and API UAT against the live staging database revealed three production-blocking runtime defects (`D-S3-01`, `D-S3-02`, and `D-S3-03`) that prevent the Tenant List from rendering and prevent lifecycle mutations from executing on MySQL.

---

# 10. HARD STOP & REQUIRED NEXT STEPS

In accordance with Section 16 ("DO NOT silently fix it during the UAT review... Then stop. A separate remediation cycle must follow"):
1. **Zero Source Code Was Modified:** No hotfixes were silently applied during this review.
2. **Remediation Plan Authorization Required:** A dedicated remediation authorization is required to resolve `D-S3-01`, `D-S3-02`, and `D-S3-03`.
3. **Re-Run UAT:** Following remediation, a re-run of RC-S3-06 UAT must be conducted to certify the live UI and close Phase 6/7 Track A Slice 3.

**ABSOLUTE HARD STOP ENFORCED.**
