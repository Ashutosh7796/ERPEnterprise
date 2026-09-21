# Procurement Frontend Retrofit: Implementation Plan

**Scope**: React Frontend Architecture for Procurement Tracks P1, P2, P3, and P4  
**Date**: 2026-08-21  
**Status**: **PROPOSED — PENDING USER APPROVAL**  

---

## 1. Directory Structure

```
ERPSystem-web-react/src/features/procurement/
├── api/
│   ├── purchaseOrderApi.ts             (PO list, create, submit, approve, reject, cancel, lineage)
│   ├── goodsReceiptApi.ts              (GRN list, create from PO, QC inspection details)
│   ├── purchaseInvoiceApi.ts           (Invoice list, preview tax, create, post, 3-way match)
│   └── procurementTypes.ts             (TypeScript definitions matching backend DTOs)
├── components/
│   ├── PoLineFulfillmentDrawer.tsx     (P1: Ordered vs Received vs Invoiced visualization)
│   ├── PurchaseOrderApprovalModal.tsx  (P2: Approval/Rejection action with SoD check)
│   ├── PurchaseOrderHistoryModal.tsx   (P2: Chronological approval timeline)
│   ├── GoodsReceiptCreateModal.tsx     (P3: Inward receipt with Accepted/Rejected split)
│   ├── ThreeWayMatchViewerModal.tsx    (P3: PO vs GRN vs Invoice match status card)
│   ├── GstPurchaseInvoiceFormModal.tsx (P4: Full statutory GST bill creation form)
│   └── ItcEligibilitySelector.tsx      (P4: Section 17(5) blocked ITC selector)
├── hooks/
│   ├── useProcurementPermissions.ts    (RBAC & SoD capability resolution)
│   └── useGstPurchaseCalculator.ts     (Live statutory tax preview & POS determination)
└── pages/
    ├── PurchaseOrderListPage.tsx       (P1/P2 PO management)
    ├── GoodsReceiptListPage.tsx        (P3 GRN & QC inspection list)
    └── PurchaseInvoiceListPage.tsx     (P4 Statutory Purchase Invoice & ITC list)
```

---

## 2. Phased Implementation Steps

### Phase 1: API Clients & TypeScript Models (`procurementTypes.ts` & API services)
- Map backend DTOs: `GrnLineItemDto`, `GrnResultDto`, `ThreeWayMatchResultDto`, `GstPurchaseInvoiceRequestDto`, `GstPurchaseInvoiceResponseDto`.
- Create Axios API services connecting to existing Spring Boot backend endpoints.

### Phase 2: Track P1/P2 PO Management, Lineage & Approval UI
- Retrofit `PurchaseOrderListPage.tsx` with status filters, lineage drawer trigger, and approval action buttons.
- Implement `PurchaseOrderApprovalModal.tsx` and `PoLineFulfillmentDrawer.tsx`.
- Enforce Segregation of Duties (SoD) UI guard on creator approval.

### Phase 3: Track P3 Goods Receipt Note & Three-Way Match UI
- Implement `GoodsReceiptListPage.tsx` and `GoodsReceiptCreateModal.tsx`.
- Support Accepted vs Rejected quantity inputs with rejection reason remarks.
- Implement `ThreeWayMatchViewerModal.tsx` showing `PASS` / `WARNING` / `BLOCK` indicators.

### Phase 4: Track P4 Statutory GST Purchase Invoice & ITC UI
- Implement `PurchaseInvoiceListPage.tsx` and `GstPurchaseInvoiceFormModal.tsx`.
- Include client-side GSTIN Mod-36 validation and Place of Supply (POS) rate computation.
- Integrate Section 17(5) Blocked ITC selector and Section 9(3) RCM toggle.
- Integrate Three-Way Match pre-posting gate.

### Phase 5: Menu & Router Registration
- Register new procurement routes in `App.tsx` / `router/index.tsx`.
- Add menu entries in sidebar navigation under "Procurement Management" / "采购管理".
