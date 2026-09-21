# Validation Artifact 12: Original Proposal vs Validated Architecture

---

## 1. Comparison Matrix

| Original Proposal Item | Validation Result | Architectural Rationale | Final Recommendation |
|---|---|---|---|
| **`jsh_account_coa` (COA Entity)** | **VALIDATED** | `jsh_account` represents physical bank drawers; formal COA requires its own entity. | **Keep** as core foundation. |
| **`jsh_gl_entry` (Double-entry Ledger)** | **VALIDATED** | No ledger exists in database. Essential for $\sum \text{Dr} == \sum \text{Cr}$ and financial statements. | **Keep** as single source of financial truth. |
| **`jsh_journal_voucher` (Journal Voucher)** | **VALIDATED** | `AccountHead` is hardcoded for single-bank cashiers. JV needs multi-line Dr/Cr without bank header constraints. | **Keep** as dedicated voucher model. |
| **Synchronous Document Posting** | **VALIDATED** | Hooking `GlPostingService` directly to document approval within `@Transactional` guarantees ACID consistency without queue overhead. | **Keep** synchronous posting. |
| **Multi-currency Schema Engine** | **REJECTED** | Unnecessary complexity for Indian SMEs. Single functional currency INR is standard. | **Reject / Do Not Build**. |
| **Automated Complex TDS Rules Engine** | **MODIFIED / DEFERRED** | Hardcoded rule engines add fragility in early phases. Standard TDS COA accounts + manual/semi-automated deductions are safer. | **Defer automated threshold rules to Phase 4**. Provide TDS COA ledgers immediately. |
| **Financial Statements UI Navigation** | **MODIFIED** | Moving reports from `/financial/*` to `/report/*` keeps operational and analytical menus clean. | **Modify routes to `/report/*`**. |
