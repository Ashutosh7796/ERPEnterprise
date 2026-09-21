# Official Statutory Source Verification & Legal Baseline

---

## 1. Statutory Authorities & Documentation Registry

| Statutory Domain | Governing Authority / Source | Relevant Acts & Rules | Primary Official Document / Reference |
|---|---|---|---|
| **Tax Invoicing** | Central Board of Indirect Taxes & Customs (CBIC) | CGST Rules, 2017 (Rule 46) | [CBIC Notification No. 14/2020-CT](https://www.cbic.gov.in/) & Rule 46 Specification |
| **E-Invoicing (IRN)** | GST Council / National Informatics Centre (NIC) | CGST Rules, 2017 (Rule 48(4)) | [NIC e-Invoice System Technical Master Schema v1.03](https://einvoice1.gst.gov.in/) |
| **E-Way Bill (EWB)** | National Informatics Centre (NIC) / GSTN | CGST Rules, 2017 (Rule 138) | [NIC E-Way Bill System User Guide & API Specs](https://ewaybillgst.gov.in/) |
| **Place of Supply** | Parliament of India / Ministry of Finance | Integrated Goods and Services Tax Act, 2017 | Sections 10, 11, 12, 13 of IGST Act |
| **Credit & Debit Notes**| CBIC / GST Council | CGST Act, 2017 (Section 34) & Rule 53 | Section 34 of CGST Act as amended by Finance Act 2022 |
| **HSN Classification** | World Customs Organization / CBIC | Customs Tariff Act, 1975 & HSN Master | [CBIC HSN / SAC Directory](https://cbic-gst.gov.in/gst-goods-services-rates.html) |
| **TDS on Goods** | Central Board of Direct Taxes (CBDT) | Income Tax Act, 1961 (Section 194Q) | Circular No. 13 of 2021 (CBDT Guidelines) |

---

## 2. Definitive Legal Rules Summary for Mid-Market ERP

### 2.1 E-Invoicing Threshold Verification
* **Current Statutory Threshold**: Every registered taxpayer whose **Aggregate Annual Turnover (AATO) in any preceding financial year from 2017-18 onwards exceeds ₹5 Crores** is legally mandated to issue e-invoices with an IRN and QR Code for B2B supplies, supplies to SEZ units/developers, and exports (*Notification No. 10/2023 – Central Tax, effective 1st August 2023*).
* **Exempted Sectors**: Banking companies, NBFCs, Insurance, Goods Transport Agencies (GTA), Passenger transport services, Multiplex cinema admissions, and SEZ units (*SEZ Developers are NOT exempt*).

### 2.2 E-Way Bill Validity Verification
* **General Cargo**: 1 day for distance up to 200 km, and 1 additional day for every 200 km (or part thereof) thereafter (*Rule 138(10) of CGST Rules, as amended by Notification No. 94/2020-CT*).
* **Over-Dimensional Cargo (ODC) / Multimodal with Ship**: 1 day for distance up to 20 km, and 1 additional day for every 20 km thereafter.

### 2.3 Tax Rounding Rules (Section 170 of CGST Act)
* Under **Section 170 of the CGST Act, 2017**, the amount of tax, interest, penalty, fine or any other sum payable, and the amount of refund or any other sum due, under the provisions of this Act shall be **rounded off to the nearest rupee** (amounts $\ge 50$ paise rounded up to ₹1, amounts $< 50$ paise ignored).
* Line-level tax amounts must maintain **2 decimal places** (paise precision); rounding to the nearest rupee occurs strictly at the document grand total level.
