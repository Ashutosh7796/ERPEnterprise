# Procurement Frontend Retrofit: P4 Gap Analysis

**Module**: Authoritative Statutory Indian GST Purchase Invoice, ITC & RCM Engine  
**Analysis Date**: 2026-08-21  
**Scope**: React Frontend vs Certified P4 Backend Architecture  

---

## 1. Executive Summary

The backend P4 layer (`GstPurchaseInvoiceService.java`) provides complete statutory Indian GST compliance for inward procurement:
- Section 10(1) / 12(2) IGST Act: Intra-state (CGST + SGST) vs Inter-state (IGST) split based on Place of Supply.
- Section 16(2) CGST Act: 4-Pillar Input Tax Credit (ITC) eligibility.
- Section 17(5) CGST Act: Blocked ITC identification and capitalization into inventory/expense cost.
- Section 9(3)/9(4) CGST Act: Reverse Charge Mechanism (RCM) self-tax assessment.
- Rule 46 CGST Rules: 15-character Luhn Mod-36 GSTIN validation and duplicate vendor invoice prevention.
- First-Class Three-Way Match Gate before invoice posting.

Currently, the React frontend completely lacks a dedicated Statutory Purchase Invoicing screen (only Sales invoicing `GstSalesInvoiceForm.tsx` exists).

---

## 2. Detailed Gap Matrix

| Statutory Provision / Feature | Certified Backend Contract | Current Frontend State | Gap / Remediation Needed |
|:---|:---|:---|:---|
| **Purchase Invoice Entity & List** | `erp_purchase_invoice` (Vendor Invoice Num, System Num, Taxable, Tax, Status) | No purchase invoice list; only Sales billing exists | Create **`PurchaseInvoiceListPage.tsx`** displaying all vendor bills, GSTINs, PO/GRN links, match status, and statutory status. |
| **PO / Multi-GRN Consolidation** | Invoices created by referencing PO and one or more GRNs | Absent | Add **"Create Bill from GRN / PO"** modal enabling multi-GRN consolidation into a single vendor invoice. |
| **Supplier GSTIN & Luhn Mod-36 Check** | `GSTINValidator.isValidGSTIN` (15-char regex + state code + PAN + Mod-36 checksum) | Basic text input without checksum validation | Client-side **real-time GSTIN validation** with instant state code extraction and checksum verification. |
| **Place of Supply & Supply Type** | Intra-State (CGST+SGST) vs Inter-State (IGST) based on 2-digit state comparison | Not supported for purchase bills | Dynamic tax calculation card updating rates and CGST/SGST/IGST breakdown upon changing Place of Supply (POS). |
| **Section 17(5) Blocked ITC Input** | `is_itc_eligible`, `itc_block_reason` (Motor Vehicle, Food, Personal Consumption) | Absent | Add an **"ITC Eligibility"** toggle on each line with a **"Block Reason"** selector and badge displaying *"Capitalized into Asset Cost"*. |
| **Reverse Charge Mechanism (RCM)** | `is_rcm = true` (buyer self-assesses GST; supplier does not collect) | Absent | Add **"Reverse Charge (RCM)"** switch under Section 9(3)/9(4). |
| **Duplicate Invoice Prevention** | Unique constraint on `(tenant_id, supplier_id, invoice_number)` throwing 409 | No duplicate check on client | Real-time frontend check on Supplier ID + Bill Number with duplicate error banner. |
| **Three-Way Match Posting Gate** | Re-evaluates 3-way match before posting; blocks posting if verdict is `BLOCK` | Absent | Pre-posting validation dialog displaying Three-Way Match verdict and blocking the **"Post to Ledger"** button if `BLOCK` conditions exist. |

---

## 3. Component Architecture Retrofit

```
ERPSystem-web-react/src/features/procurement/
├── pages/
│   └── PurchaseInvoiceListPage.tsx         (List of purchase invoices with GST summary & match status)
├── components/
│   ├── GstPurchaseInvoiceFormModal.tsx     (Full statutory bill entry: GSTIN, POS, RCM, ITC, line items)
│   ├── ItcEligibilitySelector.tsx          (Section 17(5) blocked reason selector & capitalization tag)
│   ├── PurchaseInvoiceTaxSummaryCard.tsx   (Taxable value, CGST/SGST/IGST breakdown, Rounding)
│   └── ThreeWayMatchGateDialog.tsx         (Pre-posting Three-Way Match verification modal)
```
