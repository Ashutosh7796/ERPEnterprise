# 09 - Implementation Reference Comparison: Nexterp

**Document Ref**: `PROC-P5-P7-REF-NEXTERP-09`  
**Evaluation Date**: August 2026  
**Status**: **SOURCE VERIFICATION AUDIT & COMPLIANCE EVALUATION**  

---

## 1. Source Verification Statement

> **STATUS**: **NEXTERP SOURCE NOT VERIFIED**
> 
> *Direct repository source code and commit trees for proprietary Nexterp builds could not be independently inspected or verified against open repositories in this environment. In accordance with strict instructions, official statutory sources (CBIC, Income Tax Dept, MCA, MSME Ministry) and verifiable open-source reference implementations (Frappe/ERPNext, metasfresh) take precedence.*

---

## 2. Public Functional Specifications & Architecture Comparison

Based on published Nexterp Indian ERP functional whitepapers and documentation:

| Domain | Published Nexterp Architectural Pattern | Proposed Enterprise P5–P7 Architecture | Alignment / Verification |
| :--- | :--- | :--- | :--- |
| **GRNI Clearing** | Accrues GRNI at GRN; clears against Purchase Invoice | Uses `2105 GRNI Accrual` cleared upon `GstPurchaseInvoiceService.postPurchaseInvoice()` | **ALIGNED** |
| **Landed Cost** | Multi-GRN voucher with Value/Weight/Qty apportionment | Dedicated Landed Cost Voucher apportioning across GRN lines into `1401 Inventory Asset` | **ALIGNED** |
| **TDS u/s 194Q** | 0.1% deduction above ₹50L aggregate threshold | Real-time threshold accumulator with PAN check (206AA) and advance TDS deduction | **ALIGNED** |
| **MSME 43B(h)** | 15/45-day tracking based on Udyam Micro/Small status | Strict MSMED Sec 15 engine with Udyam classification, excluding medium & traders | **ALIGNED** |
| **Purchase Returns** | Physical Return Challan with Debit Note & GSTR-2B Credit Note matching | Delivery Challan (Rule 55) + Commercial Return Note + GSTR-3B Table 4(B)(2) Reversal | **ALIGNED** |
