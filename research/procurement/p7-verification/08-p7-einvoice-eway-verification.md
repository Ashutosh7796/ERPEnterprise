# 08 - Procurement Phase P7: E-Invoice & E-Way Bill Integration Verification

**Document Ref**: `PROC-P7-VERIF-08`  
**Evaluation Date**: August 2026  
**Status**: **STATUTORY E-WAY BILL & E-INVOICE SPECIFICATION (NIC PORTAL COMPLIANT)**  

---

## 1. Statutory Framework for Physical Outward Returns

```
┌─────────────────────────────────────────────────────────────┐
│                 PHYSICAL OUTWARD TRANSPORT RULES            │
├──────────────────────────────┬──────────────────────────────┤
│ E-Way Bill Rule              │ Rule 138 of CGST Rules       │
│ E-Invoice Rule               │ Rule 48(4) of CGST Rules     │
│ Primary Transport Document   │ Rule 55 Delivery Challan     │
│ Consignment Value Threshold  │ ₹50,000 (Statutory Base)     │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. E-Way Bill Generation Rules for Purchase Returns

### 2.1 Applicability & Value Threshold
- Mandatory for inter-state movement of goods exceeding **₹50,000** consignment value (including taxes and cess).
- Mandatory for intra-state movement exceeding state-specific thresholds (e.g. ₹50,000 in Maharashtra, Karnataka; ₹1,00,000 in Delhi, West Bengal, Tamil Nadu).

### 2.2 E-Way Bill Payload Parameters for Outward Return:
- **Supply Type**: `Outward` (`O`)
- **Sub-Type**: `Others` (`8`) or `Return` / `Rejection`
- **Document Type**: `Delivery Challan` (`CHL`)
- **Document Number**: Outward Delivery Challan Number (e.g. `DC-RET-2627-0001`)
- **Document Date**: Dispatch Date (`YYYY-MM-DD`)
- **From GSTIN**: Buyer GSTIN & Depot Address
- **To GSTIN**: Supplier GSTIN & Factory/Warehouse Address
- **HSN Codes**: Primary 6-digit or 8-digit HSN codes of returned goods
- **Taxable Value & Taxes**: Breakup of return taxable amount and provisional CGST/SGST/IGST
- **Transporter ID & Vehicle Number**: Mandatory for Part-B generation if distance > 50 km.

---

## 3. E-Invoice (IRN) Applicability on Purchase Returns

### 3.1 Buyer Delivery Challan Exemption
- Under **Rule 48(4) of CGST Rules**, the mandate for generating Invoice Reference Number (IRN) via the Invoice Registration Portal (IRP) applies exclusively to:
  1. Tax Invoices issued by suppliers (B2B, SEZ, Exports).
  2. Credit Notes issued by suppliers under Section 34(1).
  3. Debit Notes issued by suppliers under Section 34(3).
- **Official Exemption**: Delivery Challans issued under Rule 55 are **NOT** eligible or required for IRN generation.
- Therefore, the buyer's outward physical return moves under a standard **Rule 55 Delivery Challan + E-Way Bill**.

### 3.2 Supplier Credit Note IRN
- When the **supplier** issues the statutory GST Credit Note under Section 34(1) (if supplier turnover > ₹5 Crore), the supplier generates an **IRN with signed QR code** referencing the original invoice IRN.
- ERP captures this supplier IRN during the GSTR-2B reconciliation step.
