# Validation Artifact 07: Accounting Posting Lifecycle & Invariants

---

## 1. Document Lifecycle & Posting Triggers

```
[ DRAFT / SAVED (status='0') ]
  - No General Ledger Entries.
  - Document can be edited freely.
       |
       v  (User clicks 'Review' / 'Approve' -> status='1')
[ APPROVED / AUDITED (status='1') ]
  - Synchronous call to GlPostingService.postVoucher(voucherType, voucherId).
  - Enforces: sum(debit) == sum(credit) > 0.
  - Commits GL entries atomically within the same Spring @Transactional block.
       |
       v  (User clicks 'Un-review' / 'Cancel' -> status='0')
[ UN-APPROVED / REVERSED ]
  - Synchronous call to GlPostingService.unpostVoucher(voucherType, voucherId).
  - Deletes or reverses GL entries atomically within transaction.
```

## 2. Idempotency & Concurrency Protection
1. **Idempotent Posting**: `GlPostingService` deletes any pre-existing active GL entries for `(tenant_id, voucher_type, voucher_id)` before inserting fresh entries.
2. **Double-Entry Invariant Guard**:
   ```java
   BigDecimal totalDr = entries.stream().map(GlEntry::getDebit).reduce(BigDecimal.ZERO, BigDecimal::add);
   BigDecimal totalCr = entries.stream().map(GlEntry::getCredit).reduce(BigDecimal.ZERO, BigDecimal::add);
   if (totalDr.compareTo(totalCr) != 0) {
       throw new BusinessRunTimeException("GL_UNBALANCED", "Accounting entries are unbalanced: Debit=" + totalDr + ", Credit=" + totalCr);
   }
   ```
3. **Period Lock Guard**: Checks if the transaction date falls within a closed/locked `FinancialYear`. If locked, posting is blocked with an error.
