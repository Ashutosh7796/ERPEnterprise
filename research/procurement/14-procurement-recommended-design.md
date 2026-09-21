# 14 - Procurement Recommended Target Architecture

**Architecture Standard**: Modular, Reference-Aligned, Mid-Market Indian ERP Procurement Engine  
**Implementation Methodology**: 7 Discrete, Lineage-Backed Implementation Tracks (P1 - P7)  

---

## 1. Overall System Architecture

```text
========================================================================================
                     RECOMMENDED PROCUREMENT ARCHITECTURE (P1 - P7)
========================================================================================

  [TRACK P1] — P2P Lineage & Purchase Order Foundation
      - erp_po_line_fulfillment (Authoritative ordered/received/invoiced/returned quantities)
      - Purchase Order state machine (DRAFT -> SUBMITTED -> APPROVED -> CLOSED)
      - Idempotent fulfillment updating with optimistic CAS concurrency protection

  [TRACK P2] — Purchase Order Approval & Segregation of Duties (SoD)
      - Multi-tier rule engine (Role authority thresholds, approval queues)
      - Strict self-approval prohibition (SoD enforcement)
      - Audit trail logging of all approval/rejection decisions

  [TRACK P3] — Goods Receipt Note (GRN) & Quality Inspection (QC)
      - Split physical receipt into accepted_qty and rejected_qty (quarantine staging)
      - Configurable over-receipt tolerance gates (0% strict default)
      - Moving average purchase valuation recalculation

  [TRACK P4] — Authoritative Vendor Invoice, Input Tax Credit & RCM Engine
      - Rule 46 Purchase Invoice validation and Section 10(1) Bill-To vs Ship-To POS
      - Intra/Inter-state tax splitting (CGST/SGST/IGST) & Section 170 rupee rounding
      - Section 16(2) ITC eligibility gates & Section 17(5) blocked ITC capitalization
      - Reverse Charge Mechanism (RCM) self-tax invoicing

  [TRACK P5] — Procurement Double-Entry General Ledger & GRNI Accrual
      - Single GL truth: erp_gl_journal_entry & erp_gl_journal_line
      - GRN Posting: Dr Inventory Asset (1401) / Cr GRNI Accrual (2102)
      - Invoice Posting: Dr GRNI (2102), Dr Input GST (1301-1303) / Cr Accounts Payable (2101)

  [TRACK P6] — Vendor Payment Allocation & Advance Settlement
      - 1 -> N and N -> 1 multi-bill payment voucher settlement (erp_account_head / item)
      - Pre-delivery advance allocation against posted purchase invoices
      - Transactional update of supplier balance accumulator (erp_supplier.all_need_pay)

  [TRACK P7] — Purchase Returns & Statutory GST Rule 53 Debit Notes
      - Physical restocking deduction and DAG linkage
      - Statutory Rule 53 Debit Note issuance (erp_gst_credit_debit_note note_type='DEBIT')
      - General Ledger tax reversals and AP credit adjustments
========================================================================================
```

---

## 2. Key Architecture Guarantees

1. **Zero Double-Counting**: Document lineage balances are strictly derived from posted ledger transactions.
2. **Immutable Transaction Snapshots**: Once a GRN or Invoice is posted, prices, quantities, and GST snapshots cannot be modified via ordinary CRUD.
3. **Strict Zero-Trust Tenant Isolation**: Every query and database mutation is validated against `TenantContext.getActiveTenantId()`.
