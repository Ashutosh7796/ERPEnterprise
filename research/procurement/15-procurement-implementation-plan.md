# 15 - Final Certified Procurement Implementation Plan

**Scope**: Enterprise Procure-to-Pay (P2P) Architecture & Indian Statutory Compliance  
**Certification Date**: 2026-08-21  
**Execution Posture**: Strict One-Track-at-a-Time (`P1/P2` [COMPLETED] $\rightarrow$ `P3` $\rightarrow$ `P4` $\rightarrow$ `P5` $\rightarrow$ `P6` $\rightarrow$ `P7`)  

---

## 1. Mandatory Architectural Constraints

```
==================================================================================================
                               MANDATORY ARCHITECTURAL CONSTRAINTS
==================================================================================================
  1. COMBINED P1/P2 TRACK (COMPLETED & VERIFIED)
     - Purchase Order Foundation + P2P Document Lineage + Multi-Tier Approval + SoD.
     - erp_po_line_fulfillment is the authoritative line-level quantity source of truth.

  2. P3: REUSE EXISTING INVENTORY ARCHITECTURE
     - GRN, QC inspection, and stock valuation MUST reuse the existing inventory engine
       (erp_material_current_stock, DepotItemService, Material.purchase_decimal).
     - ZERO duplicate procurement-specific inventory or valuation engines.

  3. THREE-WAY MATCHING AS A FIRST-CLASS ENFORCEMENT GATE
     - PO + GRN + Invoice ──► THREE-WAY MATCH ──► [PASS / WARNING / BLOCK]
     - Evaluates: Ordered vs Received Qty, Received vs Invoiced Qty, PO Price vs Invoice Price,
       Accepted vs Invoiced Qty, and Tax Discrepancies within configurable tolerances.
     - Invoice posting CANNOT bypass this control without an authorized exception policy.

  4. P4 GST: EXISTING CODE IS UNTRUSTED (STATUTORY-FIRST RECONSTRUCTION)
     - Existing Procurement GST code is NOT considered authoritative.
     - GST behavior reconstructed independently from:
       1. Official CBIC / CGST / IGST Acts & Notifications
       2. Nexterp Indian ERP implementation (where verified)
       3. ERPNext India regional implementation
     - For every statutory rule: record Rule/Notification, Effective Date, Required ERP Behavior,
       Authoritative Source, and Dedicated Regression Test.

  5. P5: SINGLE CANONICAL GENERAL LEDGER (GL)
     - Reuse erp_gl_journal_entry & erp_gl_journal_line and existing posting architecture.
     - GRN: Dr. Inventory Asset (1401) / Cr. GRNI Accrual (2102)
     - Invoice: Dr. GRNI (2102), Dr. Input GST (1301-1303) / Cr. Accounts Payable (2101)
     - Reconciles 100% with the existing single canonical double-entry GL.

  6. P6: MIRROR VALIDATED SALES PAYMENT ARCHITECTURE
     - erp_account_head and erp_account_item operate strictly as operational sub-ledgers.
     - Canonical GL remains the single accounting source of truth.

  7. P7: STATUTORY VERIFICATION FIRST FOR PURCHASE RETURNS & DEBIT NOTES
     - Independently verify Rule 53 Debit Note document type, lineage linkage, and ITC reversal
       before writing implementation code.
==================================================================================================
```

---

## 2. Phased Track Breakdown & Status

```
==================================================================================================
                              PHASED EXECUTION TRACK STATUS
==================================================================================================

  [TRACK P1/P2] — Purchase Order Foundation, Lineage & Approval/SoD Engine
      • Status: COMPLETED & FULLY VERIFIED (40/40 Tests Passing)
      • erp_po_line_fulfillment authoritative tracking table
      • PurchaseOrderApprovalService with Segregation of Duties (SoD)
      • Dedicated Security Test Suite: ProcurementP1_P2_PurchaseOrderAndApprovalSecurityTest

  [TRACK P3] — Goods Receipt Note (GRN), QC Inspection & Three-Way Match Foundations
      • Status: PENDING EXPLICIT GO
      • Inward physical stock movement reusing existing DepotItemService
      • Accepted vs Rejected (Quarantine) quantity splits
      • Configurable over-receipt tolerance gates (0% strict default)
      • Three-Way Match tolerance verification gate (PO vs GRN vs Invoice)
      • Moving average valuation recalculation on existing Material entity

  [TRACK P4] — Authoritative Purchase Invoice, Statutory GST, ITC & RCM Engine
      • Status: PENDING P3 COMPLETION
      • Independent statutory reconstruction from CBIC / CGST Act 2017
      • Section 10(1) Bill-To vs Ship-To POS determination & CGST/SGST/IGST splitting
      • Section 16(2) 4-pillar ITC eligibility gates
      • Section 17(5) blocked ITC capitalization into inventory/expense cost
      • Section 9(3)/9(4) Reverse Charge Mechanism (RCM) self-tax invoicing

  [TRACK P5] — Double-Entry General Ledger & GRNI Accrual Posting
      • Status: PENDING P4 COMPLETION
      • Single GL truth: erp_gl_journal_entry & erp_gl_journal_line
      • GRN Posting: Dr. Inventory (1401) / Cr. GRNI Accrual (2102)
      • Invoice Posting: Dr. GRNI (2102), Dr. Input GST (1301-1303) / Cr. Accounts Payable (2101)

  [TRACK P6] — Vendor Payment Allocation & Advance Settlement
      • Status: PENDING P5 COMPLETION
      • 1 -> N and N -> 1 multi-bill payment voucher settlement (erp_account_head / item)
      • Pre-delivery advance allocation against posted purchase invoices
      • Transactional update of supplier balance accumulator (erp_supplier.all_need_pay)

  [TRACK P7] — Purchase Returns & Statutory GST Rule 53 Debit Notes
      • Status: PENDING P6 COMPLETION
      • Statutory Rule 53 Debit Note generation (erp_gst_credit_debit_note note_type='DEBIT')
      • Physical inventory return deduction reusing existing stock engine
      • General Ledger tax reversals and AP credit adjustments
==================================================================================================
```

---

## 3. Strict Execution Protocol

For each individual phase:
1. **Research & Design**: Inspect official rules and existing system architecture.
2. **Implementation**: Build phase code adhering strictly to zero-trust tenant isolation.
3. **Dedicated Test Suite**: Write and run comprehensive JUnit/Spring Security test suite.
4. **Full Regression**: Execute complete test suite (Sales S1–S7 + Procurement P1–P7).
5. **Read-Only Verification**: Audit accounting, data scope, and tenant boundaries.
6. **Phase Sign-Off**: Present walkthrough and STOP to wait for user approval before next track.
