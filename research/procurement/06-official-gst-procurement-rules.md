# 06 - Official Indian Statutory GST Procurement Rules

**Authority**: Central Board of Indirect Taxes and Customs (CBIC), Ministry of Finance, Government of India  
**Relevant Legislation**: Central Goods and Services Tax (CGST) Act 2017, Integrated Goods and Services Tax (IGST) Act 2017  

---

## 1. Statutory Rule Inventory for Procurement

```text
========================================================================================
                      STATUTORY GST RULES GOVERNING PROCUREMENT
========================================================================================
  1. Section 16 CGST Act    : Eligibility and Conditions for Taking Input Tax Credit (ITC)
  2. Section 17(5) CGST Act : Blocked / Ineligible Input Tax Credit Categories
  3. Section 9(3)/9(4) CGST : Reverse Charge Mechanism (RCM) Liability & Self-Invoicing
  4. Section 31(3)(f)/(g)   : RCM Payment Voucher & Self-Tax Invoice Requirements
  5. Section 34 CGST Act    : Credit and Debit Notes on Inward Supplies
  6. Rule 36 CGST Rules     : Documentary Requirements and Conditions for Claiming ITC
  7. Rule 53 CGST Rules     : Revised Invoices and Credit/Debit Notes Requirements
  8. Section 170 CGST Act   : Rounding off of Tax to the Nearest Whole Rupee
========================================================================================
```

---

## 2. Detailed Statutory Requirement & Implementation Mapping

### A. Section 16(2): Four Pillars of Input Tax Credit (ITC)
To claim ITC on inward supplies, the recipient must satisfy 4 statutory conditions:
1. **Tax Invoice Possession**: Possession of a valid Tax Invoice / Debit Note issued by a registered supplier (Rule 36).
2. **Receipt of Goods / Services**: Actual physical receipt of goods or receipt of services.
3. **Tax Paid to Government**: The tax charged by the supplier has been actually paid to the Government (reflected in GSTR-2B matching).
4. **Return Furnishing**: The recipient has furnished the return under Section 39 (GSTR-3B).

*Implementation Rule in ERP*: A Purchase Invoice cannot claim immediate ITC deduction unless the document is in `POSTED` status and physical receipt or service acceptance is confirmed.

---

### B. Section 17(5): Mandatory Blocked ITC Handling
Input tax credit is strictly disallowed on specific goods and services, regardless of business use:
* Motor vehicles with seating capacity $\le 13$ persons (except when used for transportation of goods or commercial driving instruction).
* Food and beverages, outdoor catering, beauty treatment, health services, and club memberships.
* Goods lost, stolen, destroyed, written off, or disposed of by way of gift or free samples.
* Goods or services used for personal consumption.

*Implementation Rule in ERP*: When an item or expense line is flagged as `blocked_itc = true`, the calculated GST amount is **not** debited to `Input Tax Asset (1301)`, but is instead capitalized into the **Item Inventory Valuation (1401)** or **Expense Ledger (5xxx)**.

---

### C. Section 9(3) & 9(4): Reverse Charge Mechanism (RCM)
Under RCM (e.g. GTA freight, legal services, unregistered vendor purchases where notified):
* The recipient is liable to pay tax directly to the government.
* Under Section 31(3)(f), the recipient must issue an **RCM Self-Tax Invoice**.
* Under Section 31(3)(g), the recipient must issue a **Payment Voucher** upon payment to the supplier.
* *Accounting Effect*:
  * $\text{Dr. Input GST Asset (1301)} \quad \text{Rs. } X$ (if eligible for ITC)
  * $\text{Cr. RCM Tax Output Liability (2205)} \quad \text{Rs. } X$
