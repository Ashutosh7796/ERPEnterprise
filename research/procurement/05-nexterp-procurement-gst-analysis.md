# 05 - Nexterp / Indian ERP Reference & Statutory Verification

**Reference Subject**: Indian Mid-Market Procurement + GST Implementation Patterns  
**Verification Status**: **NEXTERP SOURCE NOT VERIFIED** (Proprietary SaaS / Closed-Source Implementation)  
**Methodology**: Where proprietary source code is closed, Indian statutory standards and ERPNext India Regional module patterns are utilized to verify Indian GST Procurement behaviors.  

---

## 1. Indian Procurement GST Architecture

In the Indian GST regime (CGST/SGST/IGST Acts 2017), procurement transactions require rigorous tax determination, Input Tax Credit (ITC) classification, and statutory reporting under GSTR-2B / GSTR-3B:

```text
[Vendor Tax Identification (GSTIN / PAN / Composition / Unregistered)]
                           │
                           ▼
[Place of Supply (POS) Determination (Section 10(1) / Section 12 IGST Act)]
                           │
   ┌───────────────────────┴───────────────────────┐
   ▼                                               ▼
[Intra-State Purchase (POS = Recipient State)]   [Inter-State Purchase (POS ≠ Recipient State)]
   ├─► CGST (e.g. 9%)                               └─► IGST (e.g. 18%)
   └─► SGST (e.g. 9%)
                           │
                           ▼
[Reverse Charge Mechanism (RCM) Evaluation (Section 9(3) / 9(4) CGST Act)]
                           │
   ┌───────────────────────┴───────────────────────┐
   ▼                                               ▼
[Normal Forward Charge (Vendor Collects Tax)]   [RCM (Recipient Self-Accrues Tax)]
                           │
                           ▼
[Input Tax Credit (ITC) Classification (Section 16 & Section 17(5) CGST Act)]
   ├─► Eligible ITC (Normal Business Inputs / Input Services / Capital Goods)
   └─► Ineligible / Blocked ITC (Section 17(5) e.g., Motor Vehicles, Food/Beverage, Club Memberships)
```

---

## 2. Indian ERP Comparison Matrix

| Statutory Dimension | Official GST Rule | ERPNext India Implementation | Our Target Architecture |
|---|---|---|---|
| **Supplier GSTIN Validation** | 15-character alphanumeric format (State Code + PAN + Entity + Z + Check Digit) | Validates regex + checksum; maps State Code to Place of Supply | Enforced via `GSTINValidator` & `PartyTaxProfileService` |
| **Intra vs Inter-State Tax** | Based on Supplier State vs Recipient Place of Supply (POS) | Checks `company_gstin` state vs `supplier_gstin` state | Automated splitting via `GSTTaxCalculationEngine` |
| **Reverse Charge (RCM)** | Tax paid by recipient under Section 9(3) / 9(4); self-invoicing required | Posts Tax Liability + Input Credit simultaneously | `is_rcm = 1`, generates RCM self-invoice record |
| **Section 17(5) Blocked ITC** | Ineligible tax cannot be credited; must be added to inventory/expense cost | Sets `eligibility_for_itc = 'Ineligible'` | Configurable per item/category; capitalizes tax into purchase cost |
| **Purchase Debit Notes** | Rule 53: Issued by recipient for returns or price reduction | Generates Debit Note with original Tax Invoice reference | Dedicated `erp_gst_credit_debit_note (note_type='DEBIT')` |
| **Section 170 Rounding** | Commercial invoice rounding to nearest whole rupee | Rounds net payable to nearest rupee; posts variance to Round Off GL | Automated round-off ledger posting (`5901`) |
