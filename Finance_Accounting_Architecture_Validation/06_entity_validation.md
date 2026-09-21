# Validation Artifact 06: Entity Validation & Reuse Analysis

---

## 1. Entity Validation Matrix

| Proposed Entity | Existing Candidate | Reuse Possible? | Why Not? | New Entity Justified? | Confidence | Final Decision |
|---|---|---|---|---|---|---|
| **`jsh_account_coa`** | `jsh_account` / `jsh_in_out_item` | **No** | `jsh_account` represents physical bank/cash drawers (`serial_no`, `current_amount`). `jsh_in_out_item` represents flat auxiliary expense names. Neither has Schedule III hierarchy, account types (A/L/O/R/E), or debit/credit rules. Reusing `jsh_account` would break bank balance queries and cashier drawer dropdowns. | **YES** | 100% | **Create `jsh_account_coa`** and link `jsh_account` / `jsh_in_out_item` via FK. |
| **`jsh_gl_entry`** | None (No ledger table exists) | **No** | No general ledger or debit/credit transaction table exists in the entire database. | **YES** | 100% | **Create `jsh_gl_entry`** as immutable double-entry truth. |
| **`jsh_journal_voucher`** | `jsh_account_head` | **No** | `AccountHead` has a mandatory single `account_id` on the header (bank account) and `organ_id` (customer/vendor). Journal Vouchers have arbitrary multi-line Debits and Credits with no single bank account. Cramming JV into `AccountHead` creates serious schema distortion. | **YES** | 100% | **Create `jsh_journal_voucher` + `jsh_journal_voucher_item`**. |

## 2. Minimal Schema Extension Summary
- **New Tables Required**:
  1. `jsh_account_coa` (Hierarchical COA)
  2. `jsh_gl_entry` (Double-entry transaction ledger)
  3. `jsh_journal_voucher` (Journal voucher header)
  4. `jsh_journal_voucher_item` (Journal voucher multi-line items)
- **Existing Tables Extended**:
  1. `jsh_account`: Add nullable `coa_account_id` (BIGINT).
  2. `jsh_in_out_item`: Add nullable `coa_account_id` (BIGINT).
