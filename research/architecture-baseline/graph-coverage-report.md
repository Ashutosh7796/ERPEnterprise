# Graph Coverage Report (Certified)

**Scope**: **BACKEND ARCHITECTURE BASELINE** (`./ERPSystem-boot`)  
**Baseline Date**: 2026-08-21  

---

## 1. Inventory Comparison: Disk Files vs Graph Entities

| Layer / Component | Actual Files on Disk | Graph Represented Nodes | Parity Status |
|---|:---:|:---:|:---:|
| **Controllers (`com.jsh.erp.controller.*`)** | 35 | 35 Classes, 280+ Endpoints | **100% COVERED** |
| **Domain Services (`com.jsh.erp.service.*`)** | 82 | 82 Classes, 1,450+ Methods | **100% COVERED** |
| **Security & Interceptors (`com.jsh.erp.security.*`, `config.*`)** | 24 | 24 Classes | **100% COVERED** |
| **MyBatis Mappers & MappersEx (`com.jsh.erp.datasource.mappers.*`)** | 98 | 98 Interfaces | **100% COVERED** |
| **Entities & DTOs (`com.jsh.erp.datasource.entities.*`, `dto.*`)** | 185 | 185 Classes | **100% COVERED** |
| **Security & Unit Test Suites (`src/test/java/...`)** | 54 | 54 Test Classes | **100% COVERED** |
| **MyBatis XML Mappings (`src/main/resources/mapper_xml/`)** | 88 | Linked to Java Mapper Interfaces | **MAPPED** |
| **Static SQL Schema Files (`src/main/resources/sql/`)** | 13 | Unparsed (Tree-Sitter SQL missing) | **PARSER GAP IDENTIFIED** |
| **Frontend React Files (`ERPSystem-web-react/`)** | N/A | Excluded from Backend Baseline | **SEPARATE REPO SCOPE** |

---

## 2. Inclusions, Exclusions, and Parser Boundaries

### A. Included Paths (`ERPSystem-boot/**`)
* `src/main/java/com/jsh/erp/**`: All business domains (Sales S1–S7, GST, Finance, Support, Provisioning).
* `src/test/java/com/jsh/erp/**`: All security and regression test suites.
* `src/main/resources/mapper_xml/**`: MyBatis dynamic XML mapping references.

### B. Excluded Paths
* `ERPSystem-web-react/**`: Frontend React 18 / TypeScript application.
* `research/**`: Research design documentation and statutory law references.
* `.agents/**`: IDE skills, rules, and workflows.

### C. Known Parser Gap: Static SQL DDL
* The 13 `.sql` scripts in `src/main/resources/sql/` contain historical schema setup scripts. Because `tree_sitter_sql` was not present, raw SQL DDL AST parsing was skipped.
* **Impact**: Database schema interactions are captured through Java entity definitions, MyBatis mapper interfaces, and native `JdbcTemplate` statements rather than directly from `.sql` files.
