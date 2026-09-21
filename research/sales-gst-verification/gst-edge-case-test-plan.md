# Statutory GST Edge-Case & Adversarial Validation Plan

---

## 1. Statutory Validation Matrix & Test Scenarios

| Test ID | Test Scenario Description | Input Parameters | Expected Statutory Outcome |
|---|---|---|---|
| **GST-01** | B2B Intra-State Supply | Supplier: MH (27), Customer: MH (27), Taxable: ₹1,00,000, HSN Rate: 18% | Tax splits into **CGST 9% (₹9,000)** + **SGST 9% (₹9,000)**; IGST = ₹0; Total = ₹1,18,000 |
| **GST-02** | B2B Inter-State Supply | Supplier: MH (27), Customer: KA (29), Taxable: ₹1,00,000, HSN Rate: 18% | Tax charged as **IGST 18% (₹18,000)**; CGST = ₹0, SGST = ₹0; Total = ₹1,18,000 |
| **GST-03** | B2B Bill-to / Ship-to (Tripartite) | Supplier: MH (27), Buyer: DL (07), Delivery Site: MH (27) | POS = DL (07) per Sec 10(1)(b) $\rightarrow$ **IGST 18% (₹18,000)** charged on invoice to Buyer |
| **GST-04** | SEZ Supply with Payment | Supplier: GJ (24), Customer: GJ SEZ Unit (24), HSN Rate: 18% | Treated as Inter-State $\rightarrow$ **IGST 18% (₹18,000)** charged; declaration included |
| **GST-05** | SEZ Supply under LUT | Supplier: TN (33), Customer: TN SEZ Unit (33), LUT Active | Zero-Rated $\rightarrow$ **0% Tax (₹0)**; LUT No & Date printed on invoice |
| **GST-06** | Export under LUT | Customer: US Company (96), LUT Active, Port: INNSA1 | Zero-Rated $\rightarrow$ **0% Tax (₹0)**; Currency: USD; Exchange Rate recorded |
| **GST-07** | Reverse Charge Supply (RCM) | Supplier: GTA (Transport), Customer: Registered Pvt Ltd, Rate: 5% | Invoice shows **5% Tax (₹500)**, but Total Due from Customer excludes tax (`is_rcm=true`) |
| **GST-08** | Composition Dealer Supply | Supplier: Composition Taxpayer, Taxable: ₹10,000 | **0% Tax**; Document issued as "Bill of Supply" |
| **GST-09** | Exempt / Nil-Rated Supply | Supplier: Regular, Product: Fresh Milk / Agricultural Seed | **0% Tax**; Document issued as "Bill of Supply" |
| **GST-10** | Multiple Tax Rates on Single Invoice | Line 1: HSN 18% (₹10,000), Line 2: HSN 12% (₹20,000), Line 3: HSN 5% (₹5,000) | Itemized tax calculated per line; accurate HSN summary generated |
| **GST-11** | Statutory Round-Off (Section 170) | Line 1 Taxable: ₹100.33, Tax 18%: ₹18.06, Gross: ₹118.39 | Net Payable: **₹118.00**; Round Off Adjustment: **-₹0.39** posted to Round Off GL account |
| **GST-12** | Credit Note Original Linkage | Credit Note issued against Invoice `INV/2425/0001` | System validates original invoice exists, is posted, and remaining balance $\ge$ CN amount |
| **GST-13** | E-Way Bill Validity Calculation | Consignment Distance: 450 km (Normal Cargo) | `validity = ceil(450 / 200) = 3 days` from generation timestamp |
