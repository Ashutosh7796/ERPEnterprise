# Phase 4B: Fixed Asset Accounting System
# Production Cutover Runbook

**Document ID**: `research/finance-accounting/56_phase4B_PRODUCTION_CUTOVER_RUNBOOK.md`  
**Target Release**: Phase 4B Fixed Asset Accounting Module (Schedule II / Companies Act, 2013 & Schedule III PPE Disclosures)  
**Approved Git Commit**: `5d546ab15cc0047442e33d0533131e38d65a7253`  
**Execution Lead**: DevOps Lead, Senior Database Administrator (DBA), Release Engineer  
**Audit & Accounting Authority**: Senior Forensic Accounting Auditor / Lead Financial Systems Controller  
**Operating Environment**: Production Linux (RHEL 9 / Ubuntu 22.04 LTS), MySQL 8.0 InnoDB, Spring Boot 3.3.2, Nginx 1.24+  
**Operational Status**: **FROZEN (STRICT RUNBOOK EXECUTION — ZERO CODE MUTATION)**  

---

## 1. Executive Summary & Release Identification

### 1.1 Purpose
This runbook provides the sequential, verifiable production cutover procedure for deploying the **Phase 4B Fixed Asset Accounting System**. All software artifacts, database schemas, and accounting algorithms have achieved full forensic acceptance, passed the comprehensive **18/18 business UAT scenarios**, and passed the **Final Production Readiness Gate** with status:

$$\mathbf{STATUS:}\quad \mathbf{READY\ FOR\ PRODUCTION\ WITH\ EXPLICIT\ PREREQUISITES}$$

This runbook translates those explicit prerequisites into discrete, auditable deployment steps.

### 1.2 Release Artifact Baseline

| Component | Specification / Version | Verification Reference |
|---|---|---|
| **Git Commit** | `5d546ab15cc0047442e33d0533131e38d65a7253` | `git rev-parse HEAD` |
| **Release Scope** | Phase 4B: Slices 4B.1 – 4B.10 | Fixed Asset Register, SLM Engine, Batch Posting, Snapshot Reversal, Disposal Derecognition, Schedule III Reporting, React 19 Frontend Workspaces |
| **Backend Artifact** | `ERPSystem-boot-3.3.2.jar` | SHA-256 build artifact hash |
| **Frontend Artifact** | `ERPSystem-web-react/dist/` | Vite 6.2 production build directory |
| **Database Migration 1** | `V3_6__fixed_asset_core_and_depreciation.sql` | 12,128 bytes in `ERPSystem-boot/src/main/resources/db/migration/` |
| **Database Migration 2** | `V3_7__fixed_asset_reversal_state_and_deprec_coa.sql` | 2,330 bytes in `ERPSystem-boot/src/main/resources/db/migration/` |
| **Java Runtime** | Eclipse Temurin OpenJDK 21 LTS (64-Bit) | `java -version` |
| **Database Engine** | MySQL 8.0.36+ InnoDB | `SELECT VERSION();` |
| **Reverse Proxy** | Nginx 1.24+ | `nginx -v` |

### 1.3 Reproducibility Verification
Before executing cutover, the release engineer must verify that the build environment reproduces the exact commit:

```bash
# 1. Verify commit hash
git rev-parse HEAD
# Expected output: 5d546ab15cc0047442e33d0533131e38d65a7253

# 2. Verify working tree cleanliness
git status --short
# Confirm no uncommitted modifications in ERPSystem-boot or ERPSystem-web-react

# 3. Verify migration script integrity
sha256sum ERPSystem-boot/src/main/resources/db/migration/V3_6__fixed_asset_core_and_depreciation.sql
sha256sum ERPSystem-boot/src/main/resources/db/migration/V3_7__fixed_asset_reversal_state_and_deprec_coa.sql
```

---

## 2. Pre-Deployment Prerequisites Checklist

Prior to initiating the maintenance window, the deployment team must confirm the following prerequisites:

- [ ] **PRQ-01: Approved Maintenance Window**: Scheduled off-peak maintenance window (recommended duration: 60 minutes).
- [ ] **PRQ-02: Stakeholder Notification**: Business users and finance personnel notified that the system is in maintenance mode.
- [ ] **PRQ-03: Production Database Connectivity**: DBA has verified administrative access to the production MySQL instance via CLI.
- [ ] **PRQ-04: Disk Space Verification**: Minimum 20 GB free disk space available on the database backup volume (`/opt/backups/`) and 5 GB on the application host.
- [ ] **PRQ-05: Artifact Availability**: Compiled `ERPSystem-boot-3.3.2.jar` and `dist/` directory staged on production jump host.
- [ ] **PRQ-06: Production Credentials**: DBA and DevOps have valid credentials in their secure credential store (zero passwords exposed in scripts).
- [ ] **PRQ-07: Rollback Artifacts Ready**: Previous production backend JAR and frontend distribution directory archived and immediately restorable.

---

## 3. Section 1: Pre-Deployment Database Backup

Financial and subledger data must be backed up consistently to the identical point in time.

### 3.1 Critical Financial & Asset Table Group (Atomic Unit)
The backup must include both the General Ledger and the Fixed Asset tables as a single transactional snapshot:
- `erp_gl_entry` (Authoritative General Ledger transactions)
- `erp_account_coa` (Chart of Accounts definitions)
- `erp_financial_year` (Fiscal year periods and lock flags)
- `erp_asset_class` (Asset class master)
- `erp_fixed_asset` (Fixed Asset Register master)
- `erp_asset_depreciation_run` (Depreciation batch headers)
- `erp_asset_depreciation_item` (Depreciation line items)
- `erp_asset_disposal` (Disposal derecognition records)

### 3.2 Backup Execution Procedure (DBA)
Execute a consistent, transactional physical mysqldump prior to executing any DDL:

```bash
# Set secure environment variables (do not write credentials in shell history)
export BACKUP_DIR="/opt/backups/jshERP"
export BACKUP_TS=$(date +%Y%m%d_%H%M%S)
export BACKUP_FILE="${BACKUP_DIR}/erp_system_db_pre_phase4b_${BACKUP_TS}.sql.gz"

mkdir -p ${BACKUP_DIR}

# Execute consistent InnoDB single-transaction backup with routines and triggers
mysqldump --defaults-file=/etc/mysql/debian.cnf \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --databases erp_system_db \
  | gzip > ${BACKUP_FILE}

# Verify exit status
if [ $? -eq 0 ]; then
  echo "[SUCCESS] Backup completed successfully: ${BACKUP_FILE}"
else
  echo "[FATAL] Database backup failed! Aborting cutover."
  exit 1
fi
```

### 3.3 Backup Verification & Integrity Validation
```bash
# 1. Verify file size is non-zero
ls -lh ${BACKUP_FILE}

# 2. Verify gzip integrity
gzip -t ${BACKUP_FILE}

# 3. Verify presence of critical financial tables in archive
zcat ${BACKUP_FILE} | grep -E "CREATE TABLE \`(erp_gl_entry|erp_account_coa|erp_financial_year)\`"

# 4. Record archive SHA-256 in deployment log
sha256sum ${BACKUP_FILE} > "${BACKUP_FILE}.sha256"
```

### 3.4 Point-in-Time Recovery (PITR) Baseline
Record the current MySQL binary log file and position:
```sql
SHOW MASTER STATUS;
-- Note the File (e.g., binlog.000142) and Position (e.g., 4829104) for recovery reference.
```

---

## 4. Section 2: Database Migration Execution

### 4.1 Pre-Migration Schema State Check
Verify that the Phase 4B tables do not already exist in the target database:

```sql
SELECT TABLE_NAME, CREATE_TIME 
FROM information_schema.tables 
WHERE table_schema = 'erp_system_db' 
  AND table_name IN ('erp_asset_class', 'erp_fixed_asset', 'erp_asset_depreciation_run', 'erp_asset_depreciation_item', 'erp_asset_disposal');
-- Expected: 0 rows returned (or verified clean if staging upgrade)
```

### 4.2 Migration Script Execution (DBA)
Migrations must be executed in exact numerical sequence. Do **NOT** execute `V3_7` before `V3_6`.

```bash
export DB_MIG_DIR="/opt/jshERP/deploy/migrations"

# 1. Apply Migration V3.6: Fixed Asset Core Tables & Initial COA Seeds
echo "[INFO] Applying Migration V3_6..."
mysql --defaults-file=/etc/mysql/debian.cnf erp_system_db < \
  ${DB_MIG_DIR}/V3_6__fixed_asset_core_and_depreciation.sql

if [ $? -ne 0 ]; then
  echo "[FATAL] Migration V3_6 failed! Halt deployment immediately."
  exit 1
fi

# 2. Apply Migration V3.7: Snapshot Reversal Columns & Contra/Expense COA Seeds
echo "[INFO] Applying Migration V3_7..."
mysql --defaults-file=/etc/mysql/debian.cnf erp_system_db < \
  ${DB_MIG_DIR}/V3_7__fixed_asset_reversal_state_and_deprec_coa.sql

if [ $? -ne 0 ]; then
  echo "[FATAL] Migration V3_7 failed! Halt deployment immediately."
  exit 1
fi
echo "[SUCCESS] Migrations V3_6 and V3_7 applied successfully."
```

### 4.3 Post-Migration Schema Verification (Audit Validation)
Execute the verification script to validate tables, columns, indexes, and constraints:

```sql
-- 1. Verify 5 Phase 4B Tables Exist with InnoDB Engine
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS 
FROM information_schema.tables 
WHERE table_schema = 'erp_system_db' 
  AND table_name IN ('erp_asset_class', 'erp_fixed_asset', 'erp_asset_depreciation_run', 'erp_asset_depreciation_item', 'erp_asset_disposal');
-- Requirement: Exactly 5 rows returned, Engine = 'InnoDB'

-- 2. Verify Snapshot Reversal Columns in erp_asset_depreciation_item
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA 
FROM information_schema.columns 
WHERE table_schema = 'erp_system_db' 
  AND table_name = 'erp_asset_depreciation_item' 
  AND column_name IN ('opening_accumulated_dep', 'prev_remaining_life_months', 'prev_status', 'prev_last_depreciation_date');
-- Requirement: Exactly 4 rows returned, IS_NULLABLE = 'NO' for opening_accumulated_dep, prev_remaining_life_months, prev_status

-- 3. Verify Unique Constraints Enforce delete_flag
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE 
FROM information_schema.table_constraints 
WHERE table_schema = 'erp_system_db' 
  AND constraint_name IN ('uk_asset_class_code', 'uk_asset_code', 'uk_deprec_run_period', 'uk_asset_deprec_item', 'uk_asset_disposal');
-- Requirement: Exactly 5 unique constraints verified

-- 4. Verify Column Composition of Unique Keys
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX 
FROM information_schema.statistics 
WHERE table_schema = 'erp_system_db' 
  AND index_name IN ('uk_asset_class_code', 'uk_asset_code', 'uk_deprec_run_period', 'uk_asset_deprec_item', 'uk_asset_disposal')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
-- Requirement: Every unique index includes 'delete_flag' as its final composite column
```

---

## 5. Section 3: Master Data & Chart of Accounts (COA) Verification

### 5.1 Authoritative COA Verification Query
Verify that accounts `1111`, `1119`, `4400`, `3230`, and `4570` exist, are active, and are postable leaf accounts for all active tenants:

```sql
SELECT 
  tenant_id, 
  account_code, 
  account_name, 
  root_type, 
  account_type, 
  normal_balance, 
  is_group, 
  status, 
  delete_flag 
FROM erp_account_coa 
WHERE account_code IN ('1111', '1119', '4400', '3230', '4570') 
  AND delete_flag = '0' 
ORDER BY tenant_id, account_code;
```

### 5.2 Mandatory Acceptance Criteria per Account

| Code | Expected Name | Expected Root | Expected Account Type | Expected Normal Balance | Expected `is_group` | Expected Status |
|---|---|---|---|---|---|---|
| **1111** | Plant & Machinery | `ASSET` | `ASSET` | `DEBIT` | `0` (Leaf) | `ACTIVE` |
| **1119** | Less: Accumulated Depreciation | `ASSET` | `ACCUMULATED_DEPRECIATION` | `CREDIT` | `0` (Leaf) | `ACTIVE` |
| **4400** | Depreciation & Amortization | `EXPENSE` | `EXPENSE` | `DEBIT` | `0` (Leaf) | `ACTIVE` |
| **3230** | Gain on Sale of Fixed Assets | `INCOME` | `INCOME` | `CREDIT` | `0` (Leaf) | `ACTIVE` |
| **4570** | Loss on Sale / Scrap of Fixed Assets | `EXPENSE` | `EXPENSE` | `DEBIT` | `0` (Leaf) | `ACTIVE` |

> [!IMPORTANT]
> **GOVERNANCE RULE**: Do **NOT** execute manual SQL INSERT statements to seed missing accounts if a tenant was onboarded incorrectly. Finding **F-03** is resolved in application code via `TenantBootstrapService.java`. Any missing tenant accounts should be investigated under the supervision of the Senior Forensic Accounting Auditor.

---

## 6. Section 4: F-01 Nginx Reverse Proxy Configuration & Authentication

### 6.1 Architecture & Authentication Verification
Forensic inspection of `AuthorizationService.java` and `RedisService.java` determined:
1. The backend application authenticates requests via `request.getHeader("X-Access-Token")` with fallback to `request.getParameter("token")`.
2. Session state is looked up in Redis using the token key: `redisTemplate.opsForHash().get(token, "userId")`.
3. Standard API requests executed via the frontend `client.ts` wrapper automatically attach the `X-Access-Token` header.
4. Browser CSV downloads invoked via `window.open('/api/fixedAsset/report/export-...', '_blank')` execute native browser GET navigations. Browsers do **not** attach custom HTTP headers during direct window navigation.
5. In order for `/api/fixedAsset/` requests to reach the Spring Boot backend service, Nginx must rewrite and forward `/api/fixedAsset/` to the backend servlet context `/ERPSystem-boot/fixedAsset/`.

### 6.2 Required Production Nginx Virtual Host Configuration
Add the following location block to the authoritative production Nginx site configuration (e.g. `/etc/nginx/sites-available/erp-production.conf`):

```nginx
# ==============================================================================
# Phase 4B Fixed Asset Module - API Routing & Streaming CSV Export Configuration
# ==============================================================================

# 1. Reverse proxy routing for Fixed Asset REST APIs and Reports
location /api/fixedAsset/ {
    # Forward to Spring Boot backend context path
    proxy_pass http://127.0.0.1:9999/ERPSystem-boot/fixedAsset/;
    
    # Standard reverse proxy header propagation
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Pass through client authentication headers (including X-Access-Token)
    proxy_pass_request_headers on;
    
    # Streaming Optimization for Large CSV Exports:
    # Disable proxy buffering so that chunked CSV facts stream directly to browser
    proxy_buffering off;
    proxy_request_buffering off;
    
    # Extended timeouts for large year-end Schedule III calculations & CSV generation
    proxy_connect_timeout 60s;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    
    # Pass through Content-Disposition attachment headers unaltered
    proxy_pass_header Content-Disposition;
    proxy_pass_header Content-Type;
}

# 2. Direct backend context proxy (existing rule verification)
location /ERPSystem-boot/ {
    proxy_pass http://127.0.0.1:9999/ERPSystem-boot/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 180s;
}
```

### 6.3 Nginx Validation & Reload Procedure
```bash
# 1. Test Nginx syntax
sudo nginx -t
# Output must indicate: syntax is ok and test is successful

# 2. Graceful reload (zero dropped connections)
sudo systemctl reload nginx

# 3. Verify Nginx status
sudo systemctl status nginx
```

---

## 7. Section 5: Application Deployment & Startup

### 7.1 Backend Deployment Procedure (DevOps)
```bash
# 1. Stop current backend service
sudo systemctl stop jshERP-boot

# 2. Archive current binary for rollback
export DEPLOY_DIR="/opt/jshERP"
cp ${DEPLOY_DIR}/ERPSystem-boot.jar ${DEPLOY_DIR}/backup/ERPSystem-boot.jar.prev

# 3. Deploy new Phase 4B binary from approved commit
cp /tmp/deploy/ERPSystem-boot-3.3.2.jar ${DEPLOY_DIR}/ERPSystem-boot.jar
chmod 750 ${DEPLOY_DIR}/ERPSystem-boot.jar
chown erp:erp ${DEPLOY_DIR}/ERPSystem-boot.jar

# 4. Start backend service
sudo systemctl start jshERP-boot

# 5. Monitor startup logs
journalctl -u jshERP-boot -f --lines=100
```

### 7.2 Backend Health Verification
Verify that the Spring Boot application starts cleanly and binds to port `9999`:
```bash
# 1. Verify TCP port binding
netstat -tlpn | grep 9999
# Expected: LISTEN on 127.0.0.1:9999 or 0.0.0.0:9999

# 2. Check application log for initialization confirmation
grep -E "(Started Application in|Tomcat started on port 9999)" /opt/jshERP/logs/jshERP.log

# 3. Verify ZERO runtime DDL statements in startup logs
grep -iE "(CREATE TABLE|ALTER TABLE|DROP TABLE)" /opt/jshERP/logs/jshERP.log
# Expected: 0 occurrences (confirms zero runtime DDL)
```

### 7.3 Frontend SPA Deployment Procedure (DevOps)
```bash
export WEB_DIR="/var/www/erp-web"

# 1. Archive previous frontend bundle
tar -czf /opt/jshERP/backup/frontend_dist_prev.tar.gz -C ${WEB_DIR} .

# 2. Clean webroot and deploy compiled Phase 4B bundle
rm -rf ${WEB_DIR}/*
cp -r /tmp/deploy/dist/* ${WEB_DIR}/
chown -R www-data:www-data ${WEB_DIR}
chmod -R 755 ${WEB_DIR}

# 3. Verify index.html exists
ls -l ${WEB_DIR}/index.html
```

---

## 8. Section 6: Read-Only Production Smoke-Test Checklist

> [!CAUTION]
> **MANDATORY AUDIT RULE**: All production smoke tests must be strictly **READ-ONLY**.  
> **DO NOT** create test assets in production.  
> **DO NOT** post depreciation runs.  
> **DO NOT** reverse historical depreciation runs.  
> **DO NOT** dispose of production assets.  
> All testing must verify data presentation, report calculations, and statutory reconciliation without mutating production ledgers.

The testing team must complete and sign off on each step:

```
[ ] STEP 01: Authentication Verification
    - Action: Navigate to production URL (https://erp.enterprise.com/).
    - Log in using an authorized financial auditor or controller account.
    - Expected Result: Successful login; valid JWT session established; redirected to Dashboard.

[ ] STEP 02: Asset Class Hierarchy Verification
    - Action: Navigate to 'Finance & Accounting' -> 'Fixed Asset Classes' (/financial/fixed-assets/classes).
    - Expected Result: Table loads cleanly; displays configured Schedule II categories, useful lives, and valid leaf COA accounts.

[ ] STEP 03: Fixed Asset Register (FAR) Cockpit Verification
    - Action: Navigate to 'Finance & Accounting' -> 'Fixed Assets' (/financial/fixed-assets).
    - Expected Result: FAR grid renders existing capitalized assets; status pills (ACTIVE, FULLY_DEPRECIATED) display correctly; search and class filters operate without JavaScript errors.

[ ] STEP 04: Depreciation Cockpit & Historical Batch Runs
    - Action: Navigate to 'Finance & Accounting' -> 'Depreciation' (/financial/fixed-assets/depreciation).
    - Expected Result: History table displays historical runs; period columns, voucher IDs, and total depreciation charges render accurately.

[ ] STEP 05: Read-Only Depreciation Simulation Preview
    - Action: In Depreciation Cockpit, select the current unposted period and click 'Preview Depreciation'.
    - Expected Result: Modal displays read-only simulation rows showing pro-rata calendar days and calculated charges; ZERO database rows written to erp_asset_depreciation_run.

[ ] STEP 06: Statutory Schedule III PPE Statement & Balance Sheet Reconciliation
    - Action: Navigate to 'Finance & Accounting' -> 'Schedule III PPE Report' (/financial/fixed-assets/schedule-iii).
    - Select current Financial Year (e.g. 2026-04-01 to 2027-03-31) and click 'Generate Statement'.
    - Expected Result:
      1. Movement columns render: Opening Gross + Additions - Deductions = Closing Gross.
      2. Depreciation movement renders: Opening Accum + Period Dep - Disposal Derecognition = Closing Accum.
      3. Net Book Value = Closing Gross - Closing Accum.
      4. Reconciliation Banner displays green status: "RECONCILED".
      5. Gross Block Variance = ₹0.0000 vs Balance Sheet SCH-08.
      6. Accumulated Depreciation Variance = ₹0.0000 vs Balance Sheet SCH-08A.
      7. Net PPE Variance = ₹0.0000 vs Balance Sheet Net PPE.

[ ] STEP 07: Fixed Asset Register CSV Download
    - Action: In Fixed Asset Register, click 'Export CSV'.
    - Expected Result: Browser prompts/downloads 'fixed_asset_register.csv'; file contains RFC 4180 formatted lines with valid UTF-8 encoding.

[ ] STEP 08: Schedule III PPE Movement CSV Download
    - Action: In Schedule III PPE Statement, click 'Export CSV'.
    - Expected Result: Browser prompts/downloads 'schedule_iii_ppe_movement.csv'; opens cleanly in Microsoft Excel / LibreOffice with verified numbers.
```

---

## 9. Section 7: Post-Deployment Validation & Observability

### 9.1 Application Log Inspection
Verify the absence of runtime exceptions or database errors:
```bash
# Check for any fatal errors, SQL syntax errors, or GL exceptions
grep -iE "(Exception|ERROR|Deadlock|SQLException)" /opt/jshERP/logs/jshERP.log | tail -n 50
```

### 9.2 Database Invariant Audit
Run a verification query to confirm that the deployment caused zero unintended database mutations:
```sql
-- Confirm zero stock ledger movements
SELECT COUNT(*) FROM erp_stock_ledger_entry 
WHERE create_time >= NOW() - INTERVAL 1 HOUR;
-- Expected: 0 mutations from deployment

-- Confirm zero unverified GL entries
SELECT COUNT(*) FROM erp_gl_entry 
WHERE voucher_type IN ('ASSET_DEPRECIATION', 'ASSET_DISPOSAL', 'ASSET_FINAL_DEP') 
  AND create_time >= NOW() - INTERVAL 1 HOUR;
-- Expected: 0 entries (confirming smoke test performed zero financial transactions)
```

### 9.3 Production Schedule III Variance Sign-Off
Confirm the live Schedule III statement reports exact reconciliation:
$$\mathbf{Gross\ Block\ Variance} = \mathbf{₹0.0000}$$
$$\mathbf{Accumulated\ Depreciation\ Variance} = \mathbf{₹0.0000}$$
$$\mathbf{Net\ Book\ Value\ Variance} = \mathbf{₹0.0000}$$
$$\mathbf{Status:} \quad \mathbf{RECONCILED}$$

---

## 10. Section 8: Comprehensive Rollback Plan

If an unrecoverable failure occurs during cutover, the team must execute this structured rollback plan.

> [!CAUTION]
> **CRITICAL ACCOUNTING SAFETY RULE**:  
> **NEVER** execute manual SQL `DELETE` or `TRUNCATE` against `erp_gl_entry`.  
> The General Ledger is strictly append-only by statutory mandate. All financial recovery must be performed via full database restoration (PITR) or authorized accounting reversal entries.

### 10.1 Component Rollback Procedures

#### A. Backend Binary Rollback
```bash
# 1. Stop backend service
sudo systemctl stop jshERP-boot

# 2. Restore previous binary
cp /opt/jshERP/backup/ERPSystem-boot.jar.prev /opt/jshERP/ERPSystem-boot.jar

# 3. Restart service
sudo systemctl start jshERP-boot

# 4. Verify previous service startup
journalctl -u jshERP-boot -f --lines=50
```

#### B. Frontend SPA Rollback
```bash
# 1. Restore previous web distribution
rm -rf /var/www/erp-web/*
tar -xzf /opt/jshERP/backup/frontend_dist_prev.tar.gz -C /var/www/erp-web/

# 2. Verify previous index.html
ls -l /var/www/erp-web/index.html
```

#### C. Nginx Configuration Rollback
```bash
# 1. Revert Nginx configuration changes
sudo cp /etc/nginx/sites-available/erp-production.conf.prev /etc/nginx/sites-available/erp-production.conf

# 2. Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

#### D. Database Schema Rollback (Pre-Transaction State)
If migrations `V3_6` or `V3_7` fail **before** any business transactions have occurred:
```bash
# Restore pre-migration physical database backup
zcat /opt/backups/jshERP/erp_system_db_pre_phase4b_${BACKUP_TS}.sql.gz | \
  mysql --defaults-file=/etc/mysql/debian.cnf erp_system_db

# Verify schema restored cleanly
mysql --defaults-file=/etc/mysql/debian.cnf erp_system_db -e \
  "SHOW TABLES LIKE 'erp_fixed_asset';"
# Expected: Empty set (table does not exist in pre-Phase 4B schema)
```

---

## 11. Section 9: Final Deployment Gate & Sign-Off

### 11.1 War-Room Sign-Off Matrix

| Role | Name | Responsibilities | Status / Signature |
|---|---|---|---|
| **Release Manager** | | Maintenance window oversight, overall cutover command | `[ ] APPROVED` |
| **Lead DBA** | | Database backup, execution of V3_6 & V3_7, schema validation | `[ ] APPROVED` |
| **DevOps Lead** | | JAR deployment, SPA webroot deployment, Nginx reload | `[ ] APPROVED` |
| **Forensic Auditor** | | COA verification, double-entry audit, zero stock mutation check | `[ ] APPROVED` |
| **Head of Finance** | | Schedule III reconciliation review, final production sign-off | `[ ] APPROVED` |

---

## 12. Absolute Hard Stop Declaration

```
================================================================================
                              ABSOLUTE HARD STOP
================================================================================
The Phase 4B Production Cutover Runbook is COMPLETE.
Phase 4C MUST NOT BE STARTED.
Zero production deployments may be executed without formal sign-off.
Zero source code or schema modifications have been performed.
Awaiting explicit stakeholder authorization before initiating production cutover.
================================================================================
```
