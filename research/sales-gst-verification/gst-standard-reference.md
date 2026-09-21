# Standard Indian GST Statutory Reference Model

---

## 1. Legal & Regulatory Framework
This document defines the **independent standard expected behavior** for Indian Goods and Services Tax (GST) across commercial operations, based strictly on:
* **Central Goods and Services Tax Act, 2017 (CGST Act)**
* **Integrated Goods and Services Tax Act, 2017 (IGST Act)**
* **CGST Rules, 2017** (Specifically Rule 46 for Tax Invoices, Rule 48(4) for e-Invoicing, Rule 53 for Revised/Credit/Debit Notes, Rule 138 for E-Way Bills)
* **Official Circulars & Notifications** issued by the Central Board of Indirect Taxes and Customs (CBIC) and the GST Council.

---

## 2. Standard Quote-to-Cash GST Determination Pipeline

```text
[ Sales Document Line Item ]
            │
            ▼
1. Supply Classification ───► Is it Goods (HSN) or Services (SAC)?
            │
            ▼
2. Party GST Category ─────► Registered Regular / Composition / SEZ / Export / Unregistered (B2C)
            │
            ▼
3. Place of Supply (POS) ───► Derived per Section 10(1) for Goods & Section 12 for Services
            │
            ▼
4. Tax Type Determination ──► If Supplier State == Place of Supply ──► Intra-State: CGST + SGST
            │                 If Supplier State != Place of Supply ──► Inter-State: IGST
            ▼
5. Tax Exemption / Rate ───► Active HSN/SAC Tax Rate Version (0%, 5%, 12%, 18%, 28%) + Cess
            │
            ▼
6. Taxable Value Engine ───► Gross Price - Pre-tax Trade Discounts + Non-GST Levies
            │
            ▼
7. Reverse Charge (RCM) ───► Section 9(3) / 9(4) Applicability Check
            │
            ▼
8. Statutory Line Compute ──► Exact 2-decimal per-line computation with standard half-up rounding
            │
            ▼
9. E-Invoice (IRN) Gate ───► Turnover >= Statutory Threshold & B2B/SEZ/Export ──► Invoke IRP
            │
            ▼
10. E-Way Bill (EWB) Gate ──► Consignment Value > Threshold (₹50k general / state rules) ──► E-Way Bill
```

---

## 3. Place of Supply (POS) Determination Rules (IGST Act)

### 3.1 Goods (Section 10 of IGST Act)
* **Section 10(1)(a) — Movement of Goods involved**: Place of Supply is the **location of the goods at the time at which the movement of goods terminates for delivery to the recipient** (i.e. Customer Shipping / Delivery State).
* **Section 10(1)(b) — Bill-to / Ship-to (Tripartite / Third-party movement)**: Where goods are delivered to a recipient on the direction of a third party (Buyer), it is deemed that the third party received the goods. POS is the **principal place of business of such third person** (Billing State for the first leg).
* **Section 10(1)(c) — No movement of goods**: Location of goods at the time of delivery to recipient.

### 3.2 Services (Section 12 of IGST Act)
* **General B2B Rule (Section 12(2)(a))**: Location of the registered recipient.
* **General B2C Rule (Section 12(2)(b))**: Location of recipient where address on record exists; otherwise location of supplier.
* **Immovable Property (Section 12(3))**: Location at which the immovable property is located.

---

## 4. Statutory Rule 46 Mandatory Invoice Fields
Under Rule 46 of the CGST Rules, a tax invoice issued by a registered person must contain:
1. **Supplier Details**: Name, Address, and GSTIN.
2. **Consecutive Serial Number**: Not exceeding 16 characters, in one or multiple series, containing letters, numerals, or special characters (hyphen/slash), **unique for a Financial Year**.
3. **Date of Issue**.
4. **Recipient Details**: Name, Address, and GSTIN or UIN (if registered).
5. **B2C Threshold Recipient Details**: If recipient is unregistered and taxable value $\ge ₹50,000$, recipient Name, Address, Delivery State & PIN code are mandatory.
6. **HSN / SAC Code**:
   * AATO $\le ₹5\text{ Cr}$ in preceding FY: Minimum 4 digits for B2B supplies (optional for B2C).
   * AATO $> ₹5\text{ Cr}$ in preceding FY: Minimum 6 digits for all supplies.
   * Chemical / Specialized notified items: Mandatory 8 digits.
7. **Description of Goods / Services**, Quantity, Unit of Measure.
8. **Total Value & Taxable Value** taking into account trade discounts.
9. **Tax Rate & Tax Amounts**: Itemized CGST, SGST, IGST, and Compensation Cess.
10. **Place of Supply** along with the Name of State (particularly if Inter-state).
11. **Delivery Address** if different from recipient address.
12. **Reverse Charge Applicability**: Explicit "Yes / No" flag.
13. **Digital Signature / Physical Signature** of supplier or authorized representative.
14. **Quick Response (QR) Code** containing embedded IRN hash where e-Invoicing applies.

---

## 5. Special Tax Categories & Schemes

| Category | Statutory Provision | Tax Calculation Behavior | Invoicing / Document Requirement |
|---|---|---|---|
| **B2B Regular** | Sec 9(1) CGST / Sec 5(1) IGST | Standard CGST+SGST or IGST | Standard Tax Invoice (Rule 46) |
| **B2C Small / Large** | Sec 9(1) CGST / Sec 5(1) IGST | Standard CGST+SGST or IGST | POS mandatory if $\ge ₹50\text{k}$; B2C Dynamic QR if AATO $> ₹500\text{ Cr}$ |
| **SEZ with Payment** | Sec 16(3)(b) IGST | Charged as IGST (Inter-State) | Invoice with declaration: *"Supply to SEZ unit/developer for authorized operations on payment of integrated tax"* |
| **SEZ without Payment (LUT)** | Sec 16(3)(a) IGST | Zero-rated (0% Tax) | Invoice with declaration: *"Supply to SEZ under Letter of Undertaking without payment of integrated tax"*; Mandatory LUT No & Date |
| **Export with Payment** | Sec 16(3)(b) IGST | Charged as IGST (Inter-State) | Shipping Bill details, Port Code, Foreign Currency & Exchange Rate |
| **Export under LUT** | Sec 16(3)(a) IGST | Zero-rated (0% Tax) | Declaration with LUT No & Date |
| **Reverse Charge (RCM)** | Sec 9(3) / 9(4) CGST | Recipient pays tax; Supplier invoice displays tax without adding to receivable | Explicit flag: `is_rcm = true`; Supplier does NOT debit customer for tax |
| **Composition Scheme** | Sec 10 CGST | No tax charged to customer | "Bill of Supply" with endorsement: *"Composition taxable person, not eligible to collect tax on supplies"* |
| **Nil Rated / Exempt** | Sec 11 CGST | 0% Tax / Exempt | "Bill of Supply" (Rule 49) |

---

## 6. Credit & Debit Notes (Rule 53 & Section 34)
* **Credit Note (Sec 34(1))**: Issued for sales returns, post-sale volume discounts, or excess taxable value billed.
  * Must reference original invoice number and date.
  * Reverses Output GST liability and customer AR.
  * Time limit for adjustment: 30th November following the end of the FY in which supply was made, or date of filing annual return (whichever is earlier).
* **Debit Note (Sec 34(3))**: Issued for supplementary billing or upward price revision.
  * Increases Output GST liability.
