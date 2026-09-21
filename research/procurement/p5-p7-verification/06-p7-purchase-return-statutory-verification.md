# 06 - Procurement Phase P7: Purchase Returns & Statutory GST Document Flow Verification

**Document Ref**: `PROC-P7-VERIF-06`  
**Evaluation Date**: August 2026  
**Status**: **COMPREHENSIVE STATUTORY VERIFICATION**  

---

## 1. Statutory Context & Legal Distinction (Section 34 of CGST Act, 2017)

### 1.1 The Critical Legal Question: Who Issues the Statutory GST Document?
Under Indian GST Law (CGST Act, 2017 & CGST Rules, 2017):

1. **Section 34(1) of CGST Act (Credit Note by Supplier)**:
   > *"Where one or more tax invoices have been issued for supply of any goods or services or both and the goods supplied are returned by the recipient... the **registered person who has supplied such goods or services or both (THE SELLER / SUPPLIER)** may issue to the recipient one or more credit notes for supplies made in a financial year..."*

2. **Section 34(3) of CGST Act (Debit Note by Supplier)**:
   > *"Where one or more tax invoices have been issued for supply of any goods or services or both and the taxable value or tax charged in that tax invoice is found to be less than the taxable value or tax payable... the **registered person who has supplied such goods or services (THE SELLER / SUPPLIER)** shall issue to the recipient one or more debit notes..."*

3. **Rule 53 of CGST Rules (Format of Credit/Debit Note)**:
   > *Prescribes mandatory particulars for Credit Notes and Debit Notes issued by the **supplier** under Section 34.*

---

## 2. Definitive Classification of Return Documents

| Document Type | Issuing Party | Legal Nature & Purpose | Statutory Citation | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Physical Outbound Return Challan** | **Buyer (Us)** | Accompanies goods in physical transit back to supplier; generates E-Way bill if value $> \text{₹50k}$. | Rule 55 of CGST Rules (Delivery Challan) | **CONFIRMED** |
| **Commercial Purchase Return / Accounting Debit Note** | **Buyer (Us)** | Internal commercial instrument reducing Supplier Accounts Payable in ERP ledger. | Standard Commercial / Accounting Practice | **CONFIRMED** |
| **Statutory GST Credit Note** | **Supplier (Vendor)** | Tax document uploaded by supplier in GSTR-1, reducing supplier's output tax and auto-populating in buyer's GSTR-2B. | Section 34(1) of CGST Act | **CONFIRMED** |
| **"Rule 53 Buyer GST Debit Note"** | Buyer (Us) | *Terminology Correction*: Rule 53 strictly governs Supplier-issued notes. A Buyer cannot issue a statutory Rule 53 note on behalf of the supplier. The Buyer issues a **Commercial Purchase Return Note & Delivery Challan**, and reconciles with the Supplier's Section 34(1) Credit Note. | CGST Act Section 34 | **INCORRECT (Label corrected to Commercial Purchase Return Note)** |

---

## 3. End-to-End Physical & Financial Return Workflow

```mermaid
sequenceDiagram
    autonumber
    participant BuyerWh as Buyer Warehouse
    participant BuyerERP as Enterprise ERP (Procurement P7)
    participant Supplier as Supplier (Vendor)
    participant GSTPortal as GST Portal (GSTR-1 / GSTR-2B)

    BuyerWh->>BuyerERP: 1. Initiate Purchase Return against original Invoice
    BuyerERP->>BuyerERP: 2. Generate Outbound Delivery Challan (Rule 55)
    BuyerERP->>BuyerERP: 3. Decrement Inventory Asset (1401)
    BuyerERP->>BuyerERP: 4. Post Commercial Debit Note: Reduce Supplier AP (2101) & Reversal Input Tax
    BuyerWh->>Supplier: 5. Dispatches physical goods with Delivery Challan & E-Way Bill
    Supplier->>Supplier: 6. Inspects & accepts returned goods
    Supplier->>GSTPortal: 7. Issues Statutory GST Credit Note (Sec 34(1)) & files in GSTR-1
    GSTPortal->>BuyerERP: 8. Credit Note appears in GSTR-2B; ERP auto-matches with Return Document
```

---

## 4. Multi-Dimensional Return Scenarios

### 4.1 Partial Returns & Multiple Returns
- A single Purchase Invoice can have multiple partial returns across its lifecycle.
- Cumulative returned quantity is validated against the original invoiced quantity on each line to prevent over-returns.

### 4.2 Return After Payment (Refund vs Credit Ledger)
- If the original invoice was already fully paid (`pay_type = FULLY_PAID`):
  - The Commercial Debit Note reduces the overall vendor balance (creating an open debit balance / credit on account in `erp_supplier.all_need_pay`).
  - This credit balance can be applied to settle future purchase invoices OR refunded via bank receipt (`Dr Bank 1002, Cr Supplier AP 2101`).

### 4.3 Return After Tax Period Filing
- If the return occurs in a subsequent tax period:
  - Input Tax Credit (ITC) originally availed in GSTR-3B Table 4(A)(5) must be reversed in Table 4(B)(2) in the month the return/credit note occurs.

---

## 5. Summary of Architecture Corrections

1. **Document Naming**: The document generated in Procurement P7 is designated as **"Commercial Purchase Return Note"** (accompanied by a Rule 55 Delivery Challan), avoiding mislabeling as a "Rule 53 Buyer GST Debit Note".
2. **Reconciliation Engine**: Incorporates a 2-way reconciler between the internal Purchase Return Note and the vendor's GSTR-2B Credit Note.
