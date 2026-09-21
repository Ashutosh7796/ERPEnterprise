# 13 - Procurement Phase P7: Frontend UI/UX Architecture & Component Design

**Document Ref**: `PROC-P7-VERIF-13`  
**Evaluation Date**: August 2026  
**Status**: **FRONTEND UI/UX DESIGN SPECIFICATION**  

---

## 1. Frontend Principles & Authoritative Backend Contract

In strict compliance with our system architecture:
1. **Frontend is Preview-Only**: The React frontend provides interactive calculation previews (e.g. estimated pro-rata ITC reversal, estimated AP balance deduction), but **NEVER determines final financial truth**.
2. **Backend is the Sole Source of Truth**: All final quantities, moving average cost valuations, GST calculations, GSTR-3B table assignments, and GL journal lines are computed and persisted by the backend Spring Boot services.
3. **Design Aesthetics**: Built with rich, responsive Ant Design / Tailwind-styled components, interactive modals, lineage visualizers, and state badges.

---

## 2. Frontend Component & Page Architecture

```
ERPSystem-web-react/src/features/procurement/
├── api/
│   └── procurementApi.ts (P7 TypeScript interfaces & API endpoints)
├── components/
│   ├── PurchaseReturnCreateModal.tsx (Multi-line return wizard with live stock validation)
│   ├── DeliveryChallanViewerModal.tsx (Rule 55 Challan print & preview viewer)
│   ├── SupplierCreditNoteMatchModal.tsx (2-way GSTR-2B credit note reconciler)
│   └── CommercialAdjustmentModal.tsx (Scenario B price/rate discrepancy editor)
└── pages/
    ├── PurchaseReturnListPage.tsx (Management cockpit for all return documents)
    └── SupplierDebitCreditRegisterPage.tsx (Statutory register with ITC reversal tracking)
```

---

## 3. UI Component Details

### 3.1 Purchase Return Management Page (`PurchaseReturnListPage.tsx`)
- **Filters**: Date range, Supplier select, Return Status (`DRAFT`, `APPROVED`, `DISPATCHED`, `RECONCILED`, `CANCELLED`), ITC Status (`PENDING`, `RECONCILED`, `EXEMPT`).
- **Summary Cards**:
  - Total Returns in Current Month (₹).
  - Total Physical Returns vs Commercial Adjustments.
  - Pending GSTR-2B Credit Note Matches (Count & Value).
  - Completed ITC Reversals in GSTR-3B Table 4(B)(2).
- **Actions**:
  - `New Purchase Return` button $\to$ opens `PurchaseReturnCreateModal`.
  - `Print Delivery Challan` $\to$ opens `DeliveryChallanViewerModal`.
  - `Match Supplier Credit Note` $\to$ opens `SupplierCreditNoteMatchModal`.

---

### 3.2 Purchase Return Creation Wizard (`PurchaseReturnCreateModal.tsx`)
- **Step 1: Select Reference Document**:
  - User selects original Purchase Invoice or Goods Receipt Note.
  - System auto-populates supplier name, GSTIN, depot, original invoice date, and item lines.
- **Step 2: Enter Return Quantities & Reason**:
  - Displays original billed quantity, previously returned quantity, and **Live Available Depot Stock**.
  - Enforces client-side boundary validation ($\text{Return Qty} \le \text{Depot Stock}$ and $\le \text{Open Invoiced Qty}$).
  - Reason dropdown: `Defective / Damaged in Transit`, `Quality Failure`, `Wrong Specification`, `Pricing Discrepancy`, `Excess Delivery`.
- **Step 3: Financial & Statutory Preview**:
  - Displays Taxable Value, CGST/SGST/IGST breakdown, Total AP reduction, and GSTR-3B Table 4(B)(2) allocation.
  - Shows warning badge if item has Blocked ITC (Section 17(5)) or RCM applicability.

---

### 3.3 Statutory Delivery Challan Viewer (`DeliveryChallanViewerModal.tsx`)
- Compliant Rule 55 layout with header, Consignor GSTIN, Consignee GSTIN, HSN summary, transport details, and signature blocks in Triplicate format (Original for Consignee, Duplicate for Transporter, Triplicate for Consignor).
