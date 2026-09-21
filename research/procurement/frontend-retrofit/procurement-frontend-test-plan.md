# Procurement Frontend Retrofit: Test Plan

**Scope**: Frontend Unit, Integration & Security Tests for Procurement Tracks P1–P4  
**Date**: 2026-08-21  
**Test Framework**: Vitest / React Testing Library / Jest  

---

## 1. Test Suite Breakdown

```
ERPSystem-web-react/src/__tests__/procurement/
├── ProcurementP1P2FrontendWorkflow.test.tsx
├── ProcurementP3FrontendWorkflow.test.tsx
└── ProcurementP4FrontendGSTSecurity.test.tsx
```

---

## 2. Test Cases Specification

### A. `ProcurementP1P2FrontendWorkflow.test.tsx`
1. **Menu Visibility**: Verifies "Purchase Orders" menu is visible for `PURCHASE_MANAGER` and `PURCHASE_AGENT`.
2. **PO Creation & Line Items**: Verifies PO item grid calculates totals and submits draft.
3. **SoD Self-Approval Guard**: Verifies that when logged-in user is the creator of the PO, the "Approve" button is disabled with an explanatory SoD tooltip.
4. **Approval Action Execution**: Verifies manager approval opens modal, submits comment, and updates table status badge to `Approved`.
5. **Line Fulfillment Drawer**: Verifies clicking "View Fulfillment" opens drawer rendering ordered, received, accepted, and invoiced quantity balances.

### B. `ProcurementP3FrontendWorkflow.test.tsx`
1. **PO Selection & Inward Auto-Populate**: Verifies selecting an approved PO populates open line items with remaining balances.
2. **Accepted vs Rejected Split**: Verifies entering 40 accepted and 10 rejected correctly splits inputs and prompts for rejection reason.
3. **Over-Receipt Tolerance Validation**: Verifies entering quantity exceeding PO open balance + tolerance displays real-time warning.
4. **Three-Way Match Presentation**:
   - `PASS`: Renders green badge and enables invoice generation.
   - `WARNING`: Renders amber badge with price variance detail.
   - `BLOCK`: Renders red badge with block reason alert and disables posting.

### C. `ProcurementP4FrontendGSTSecurity.test.tsx`
1. **GSTIN Mod-36 Validation**: Verifies client-side validation detects invalid checksums (e.g. `27AABCU9603R1ZX`) and highlights valid GSTINs (`27AABCU9603R1ZN`).
2. **Place of Supply Tax Calculation**:
   - Intra-State (MH -> MH): Renders CGST (9%) + SGST (9%).
   - Inter-State (KA -> MH): Renders IGST (18%).
3. **Section 17(5) Blocked ITC Capitalization**: Verifies selecting "Motor Vehicle" marks line as Ineligible ITC and tags it as *"Capitalized into Cost"*.
4. **Section 9(3) RCM Toggle**: Verifies turning on RCM marks tax as recipient self-liability.
5. **Duplicate Bill Error Banner**: Verifies submitting an existing invoice number displays 409 conflict banner.
6. **Cross-Tenant ID Protection**: Verifies URL param tampering with unauthorized tenant IDs triggers 403 Forbidden boundary.
