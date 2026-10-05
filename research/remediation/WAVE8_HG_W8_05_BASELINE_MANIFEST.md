# HG-W8-05 — AUTHORIZED WAVE 8 PHASE C BASELINE MANIFEST
## Option A — Authorized Baseline Procedure Snapshot & Traceability Record

- **Governance Authority**: `HG-W8-05` (Option A — Authorized Baseline Procedure)
- **Superceding Decision**: `HG-W8-04` (Option A — Strict Phase Separation)
- **Snapshot Classification**: **AUTHORIZED SNAPSHOT — NOT RE-CERTIFIED**
- **Phase A/B Certification Status**: **FROZEN & IMMUTABLE** (Phase A & B remain certified; no re-certification conducted or implied)
- **Timestamp**: 2026-10-06T00:30:00+05:30
- **Traceability Identifier**: `HG-W8-05-TRACE-20261006`

---

### 1. Repository Governance Precondition State

| Parameter | Authoritative Verified State |
| :--- | :--- |
| **Root Workspace Path** | `e:\Codes\ERP\jshERP-master` |
| **Root Active Branch** | `21-Sept-2026` |
| **Root HEAD SHA** | `17fd79b4251f8126f02e26a6a3fbb24f59cd1e11` |
| **ERPSystem-boot Path** | `e:\Codes\ERP\jshERP-master\ERPSystem-boot` |
| **ERPSystem-boot Active Branch** | `master` |
| **ERPSystem-boot HEAD SHA** | `2f9d7d955b1e102c8783e751db22616a99b2d411` |
| **Submodule Relationship** | Gitlink (mode `160000`) at path `ERPSystem-boot` pointing to commit `2f9d7d955b1e102c8783e751db22616a99b2d411` |
| **Root Working Tree File Counts** | 122 modified tracked files, 1,019 untracked items |
| **ERPSystem-boot Working Tree Counts** | 166 modified tracked files, 3 deleted tracked files, 712 untracked items |

---

### 2. Mandatory Filesystem Backup Verification (§2)

Both repositories were fully backed up into isolated external archives in `e:\Codes\ERP\HG_W8_05_BACKUPS` prior to any branch or commit operation. Both archives were bitwise validated via Zip format integrity testing (`testzip()` returned 0 errors).

| Backup Target | External Archive Path | File Size | SHA-256 Digest | Zip Integrity |
| :--- | :--- | :---: | :--- | :---: |
| **ERPSystem-boot** | `e:\Codes\ERP\HG_W8_05_BACKUPS\ERPSystem_boot_pre_HG_W8_05.zip` | 90,093,099 bytes (85.92 MB) | `75463fe562a8cf35f12023bff8a92697ce4a2508cea362c074fae6f86dc10363` | **PASSED (0 corrupted files)** |
| **Root Workspace** | `e:\Codes\ERP\HG_W8_05_BACKUPS\root_workspace_pre_HG_W8_05.zip` | 476,779,763 bytes (454.69 MB) | `10ea56af1495434330bd71d93cac444ac5d9e01045bbbad08a78f07e95bf9d83` | **PASSED (0 corrupted files)** |

*Governance Assertion*: "The backup exists and has been verified prior to any commit operation."

---

### 3. Baseline Exclusions Manifest (§3)

The following items are explicitly excluded from the baseline commits and remain physically on disk, preserved untouched:

> **Mandatory Governance Notice**:  
> *"Excluded from baseline commit and preserved untouched on disk."*

| Item / Relative Path | Type | File Count | Size on Disk | SHA-256 / Details | Exclusion Rationale |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `dump.rdb` | File | 1 | 7,616 bytes | `6db052d9c0002c5c0711300697986057924155ed8ce35a147d8a60807c324474` | Local Redis persistent database snapshot dump |
| `.vscode` | Dir | 1 | 288 bytes | N/A (Directory) | Local IDE editor configuration (`settings.json`) |
| `scratch` | Dir | 35 | 278,446 bytes | N/A (Directory) | Temporary scratch, audit scripts, and verification utilities |
| `graphify-out` | Dir | 2,534 | 2,328,703,051 bytes | N/A (Directory) | Root knowledge graph AST caches and visual reports |
| `ERPSystem-boot\graphify-out` | Dir | 555 | 31,482,434 bytes | N/A (Directory) | Submodule knowledge graph cache artifacts |
| `ERPSystem-boot\target` | Dir | 1,790 | 19,018,601 bytes | N/A (Directory) | Maven target compilation and Surefire build outputs |
| `ERPSystem-web\node_modules` | Dir | 55,407 | 409,375,483 bytes | N/A (Directory) | Node.js frontend runtime dependency modules (Vue) |
| `ERPSystem-web-react\node_modules` | Dir | 24,836 | 338,570,549 bytes | N/A (Directory) | Node.js frontend runtime dependency modules (React) |

---

### 4. Mandatory Secrets Scan Evidence (§4)

A comprehensive automated secrets scan was conducted across all non-excluded files in both working trees using custom forensic AST/regex rules covering RSA/DSA/EC private keys, AWS access keys, GitHub tokens, Slack tokens, Google API keys, JWT tokens, and generic credentials.

- **Scanning Engine**: Custom Forensic Secrets Scanner (v1.0.0, Python 3.14)
- **Scan Timestamp**: 2026-10-06T00:25:24+05:30
- **Scope Scanned**:
  - `ERPSystem-boot`: 1,335 files scanned
  - `Root Workspace`: 1,976 files scanned (excluding `ERPSystem-boot` and excluded directories)
  - Total Scanned: 3,311 files
- **Findings Summary**:
  - Genuine Secrets Found: **0**
  - False Positives Identified: **1**
    - File: `ERPSystem-boot\src\test\java\com\jsh\erp\security\Phase6_7_Slice3_CrossTenantIsolationSecurityTest.java` (Line 774)
    - Matched Rule: `JWT Token` (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
    - Justification: Synthetic mock JWT unit test fixture payload used exclusively in `testClusteredConcurrency_SplitBrain_ImmediateTokenInvalidationAcrossNodes`. Contains no private key or production credential.
- **Blocker Status**: **NONE — SECRETS SCAN PASSED CLEANLY**

---

### 5. Certified Phase A/B Hash Verification (§5)

All 7 certified production and test source artifacts from Wave 8 Phase A and Phase B, as well as the historical database boundary invariant `INV-14`, were verified bit-for-bit against their authoritative certified states:

| Certified Artifact | Phase | Nature | Certified State / Baseline SHA-256 | Current Workspace SHA-256 | Verification Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `src/main/java/com/jsh/erp/security/TenantContext.java` | Phase A | Production Java | `fbaa3dbaaf590297d2c11107250b2266c98674d34f9bf31f5c86b6c8799a7b25` | `fbaa3dbaaf590297d2c11107250b2266c98674d34f9bf31f5c86b6c8799a7b25` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/main/java/com/jsh/erp/filter/LogCostFilter.java` | Phase A | Production Java | `3ca8565dd5f065965158948bd17fca2a16d56357e1da7548b786c6fcab2e51bd` | `3ca8565dd5f065965158948bd17fca2a16d56357e1da7548b786c6fcab2e51bd` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/test/java/com/jsh/erp/security/TenantIsolationUnderConcurrencyTest.java` | Phase A | Test Suite | `c23af179c735c3f5a105262ca42eb625dcadb0bf4573deeb2fcce325bf52bd42` | `c23af179c735c3f5a105262ca42eb625dcadb0bf4573deeb2fcce325bf52bd42` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/main/java/com/jsh/erp/service/SubledgerReconciliationService.java` | Phase B | Production Java | `4613e0b865659704fb13489f8cf9999d0cc6249850764ace7d3c5c47b65ff9bb` | `4613e0b865659704fb13489f8cf9999d0cc6249850764ace7d3c5c47b65ff9bb` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/main/java/com/jsh/erp/datasource/dto/ControlAccountReconciliationDto.java` | Phase B | Supporting DTO | `401f9945d5e816fee8cc199c7f5b50e44a483d53f55f35990de008ba907a1e9f` | `401f9945d5e816fee8cc199c7f5b50e44a483d53f55f35990de008ba907a1e9f` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/main/java/com/jsh/erp/datasource/dto/InventorySubledgerReconciliationReportDto.java` | Phase B | Supporting DTO | `f347cc3917b78052b67190d6a70b67f845efdc9dbdb6521850c7091ea512863d` | `f347cc3917b78052b67190d6a70b67f845efdc9dbdb6521850c7091ea512863d` | **MATCH (100% BITWISE IDENTICAL)** |
| `src/test/java/com/jsh/erp/service/InventorySubledgerReconciliationTest.java` | Phase B | Test Suite | `ed2bc3d56d6c1695b0a4e0db56982f290b512afe76697e915d188616b47355bd` | `ed2bc3d56d6c1695b0a4e0db56982f290b512afe76697e915d188616b47355bd` | **MATCH (100% BITWISE IDENTICAL)** |
| **Historical Invariant `INV-14`** (`erp_stock_ledger_entry` $id \le 5465$) | Waves 1–8 | Database Boundary | `789fed0564a0920c21be544a474d0e050c8bbf7c5da51f76ab96b12dd4576838` (2,522 rows) | `789fed0564a0920c21be544a474d0e050c8bbf7c5da51f76ab96b12dd4576838` (2,522 rows) | **MATCH (100% BITWISE IDENTICAL)** |

*Forensic Conclusion*: Zero discrepancies detected. Certified Phase A and B evidence remains completely intact and uncorrupted.

---

### 6. Included Baseline Scope (§8)

The ERPSystem-boot baseline commit includes the accumulated, verified codebase from:
1. Wave 1 through Wave 7 certified implementation state.
2. Wave 8 Phase A certified multi-tenant isolation state (`TenantContext.java`, `LogCostFilter.java`, `TenantIsolationUnderConcurrencyTest.java`).
3. Wave 8 Phase B certified 4-part dimensional inventory reconciliation state (`SubledgerReconciliationService.java`, supporting DTOs, `InventorySubledgerReconciliationTest.java`).
4. Supporting database scripts, DDL definitions, and test fixtures necessary to establish a deterministic build.

*Explicitly Excluded*:
- No `target/` compilation directories.
- No `graphify-out/` or knowledge graph files.
- No `.vscode/` or editor caches.
- No temporary scratch scripts (`scratch/`).
- No personal or unvetted experimental files.
- **No Phase C implementation code**: `StockMutationService.java` remains in its certified Wave 7 state with lock windows untouched.

---

### 7. Governance Traceability Chain (§16)

```
Pre-baseline workspace (Verified: root @ 17fd79b, boot @ 2f9d7d9)
    │
    ▼
Filesystem Backups Created & Verified (§2)
(boot: 75463fe56..., root: 10ea56af1...)
    │
    ▼
Forensic Secrets Scan Completed (§4) (3,311 files, 0 genuine secrets)
    │
    ▼
Phase A/B Certified Hash Verification (§5) (7/7 source files + INV-14 MATCH)
    │
    ▼
Baseline Manifest Documented (HG-W8-05-TRACE-20261006)
    │
    ▼
ERPSystem-boot Dedicated Baseline Branch (§7) (`phase-c-baseline/HG-W8-05`)
    │
    ▼
Exactly One ERPSystem-boot Baseline Commit (§8)
    │
    ▼
Fresh-Worktree Build + Phase B Regression Verification (§10)
    │
    ▼
Root Dedicated Baseline Branch (§11) (`phase-c-baseline/HG-W8-05-root`)
    │
    ▼
Root Submodule Pointer Update Commit (§11)
    │
    ▼
Fresh Root Checkout + Submodule Verification (§12)
    │
    ▼
PHASE C BASELINE ESTABLISHED — READY FOR IMPLEMENTATION (§14)
```
