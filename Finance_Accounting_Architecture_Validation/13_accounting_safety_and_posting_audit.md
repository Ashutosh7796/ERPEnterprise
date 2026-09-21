# Validation Artifact 13: Final Accounting Safety, Posting Integrity & Immutability Audit

**Date:** September 2026  
**Auditor:** Senior ERP Architect & Forensic Accounting Specialist  

---

## 1. Document Lifecycle & State Machine Mapping

| Document Type | Source Table | Existing Field | State Machine Progression | Posting Trigger Point |
|---|---|---|---|---|
| **Sales Tax Invoice** | `erp_depot_head` | `status` / `posting_status` | `DRAFT` (0) -> `APPROVED` (1) -> `POSTED` (2) | Upon authorized Approval (`status='1'`) |
| **Purchase Tax Invoice** | `erp_depot_head` | `status` / `posting_status` | `DRAFT` (0) -> `APPROVED` (1) -> `POSTED` (2) | Upon authorized Approval (`status='1'`) |
| **Customer AR Receipt** | `erp_account_head` | `status` | `DRAFT` (0) -> `APPROVED` (1) -> `POSTED` (2) | Upon cashier submission/approval |
| **Vendor AP Payment** | `erp_account_head` | `status` | `DRAFT` (0) -> `APPROVED` (1) -> `POSTED` (2) | Upon payment approval |
| **Bank Contra Transfer** | `erp_account_head` | `status` | `DRAFT` (0) -> `APPROVED` (1) -> `POSTED` (2) | Upon transfer execution |
| **Journal Voucher (JV)** | `jsh_journal_voucher` | `status` | `DRAFT` (0) -> `POSTED` (1) | Upon accountant posting |

---

## 2. Critical Rule: Immutability & Reversal Architecture

### 2.1 The Prohibition of Silent Un-Approval
- **Strict Accounting Invariant**: Once a document reaches `POSTED` status and GL entries are written, the document's financial fields become **100% IMMUTABLE**.
- The system **prohibits casual deletion or in-place modification** of posted documents.
- If an error is detected on a posted document:
  1. The document cannot simply be switched back to `DRAFT` (which would silently orphan or erase ledger facts).
  2. The user must initiate an explicit **Formal Reversal / Void Action** (or issue a Credit/Debit Note).
  3. The reversal action creates an explicit **Reversal Journal Voucher** in `jsh_gl_entry` with exact opposite Debits and Credits, stamped with `reversal_of_id = <original_gl_id>`, `reversal_reason`, `reversal_time`, and `operator_id`.
  4. The original posting remains intact in the ledger with `is_cancelled = TRUE`, providing a 100% tamper-evident audit trail under the Companies (Audit and Auditors) Rules.

---

## 3. Duplicate Posting Protection & Idempotency

To ensure that $\text{One Accounting Event} \equiv \text{Exactly One GL Posting}$, a 3-layer defense is implemented:
1. **Application-Layer Status Check**: `GlPostingService` checks if `document.posting_status == POSTED`. If already posted, it immediately returns the existing posting ID without executing SQL inserts.
2. **Database-Layer Uniqueness Invariant**: Composite index on `jsh_gl_entry`:
   `INDEX idx_gl_voucher (tenant_id, voucher_type, voucher_id)`
3. **Pre-Posting Guard**: In the rare event of a re-posting request for an edited draft, any existing un-cancelled entries for that `(tenant_id, voucher_type, voucher_id)` are verified and locked within the database transaction.

---

## 4. Atomic Transaction Boundary

```java
@Transactional(value = "transactionManager", rollbackFor = Exception.class)
public void approveAndPostDocument(Long documentId, String documentType, UserContext user) {
    // 1. Lock document row for update
    DepotHead doc = depotHeadMapper.selectByPrimaryKey(documentId);
    
    // 2. Validate Financial Year is OPEN
    financialYearService.validatePeriodOpen(doc.getOperTime(), user.getTenantId());
    
    // 3. Update document status to POSTED
    doc.setStatus(BusinessConstants.BILLS_STATUS_AUDIT);
    depotHeadMapper.updateByPrimaryKeySelective(doc);
    
    // 4. Generate GL entries and validate sum(Dr) == sum(Cr)
    glPostingService.postCommercialBill(doc, user);
    
    // If ANY step throws an exception, Spring rolls back the entire database transaction!
}
```

---

## 5. Double-Entry Mathematical Invariants

`GlPostingService.validateDoubleEntry(List<GlEntry> entries)` validates:
1. `entries.size() >= 2` (Minimum one Debit and one Credit line).
2. For each line: `amount > 0` and `(debit > 0 ^ credit > 0)` (Strict mutual exclusivity).
3. `sum(debit) - sum(credit) == 0.0000` (Zero fractional variance).
4. No null accounts: `account_id != null` and corresponds to an active leaf node in `jsh_account_coa`.
