# 06 - Procurement Phase P7: Accounts Payable & Canonical GL Accounting Verification

**Document Ref**: `PROC-P7-VERIF-06`  
**Evaluation Date**: August 2026  
**Status**: **CANONICAL GENERAL LEDGER & DOUBLE-ENTRY BALANCE PROOF**  

---

## 1. Accounting Authority & Canonical General Ledger

All financial entries for Purchase Returns and Supplier Adjustments are posted directly to the canonical General Ledger tables:
- `erp_gl_journal_entry` (Header: `source_document_type = 'PURCHASE_RETURN'`)
- `erp_gl_journal_line` (Line items: `entry_type IN ('DEBIT', 'CREDIT')`)

---

## 2. Universal Accounting Scenarios & Double-Entry Proofs

### Scenario 1: Physical Purchase Return *Before* Purchase Invoice Posting
- **State**: Goods received in GRN; accrual posted to GRNI; no AP invoice created yet.
- **Financial Flow**: Clear GRNI accrual at PO purchase rate and reduce Inventory Asset.

#### Double-Entry Journal:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2105** | Goods Received Not Invoiced (GRNI) Accrual | $V_{\text{po}}$ | — | Clears GRNI accrual |
| **1401** | Raw Material & Inventory Asset | — | $V_{\text{po}}$ | Reverses stock valuation |

$$\sum \text{Debits} = V_{\text{po}} = \sum \text{Credits} = V_{\text{po}} \quad \text{[BALANCED]}$$

---

### Scenario 2: Physical Purchase Return *After* Purchase Invoice Posting (Standard Case)
- **State**: Invoice posted with eligible ITC; AP outstanding; Supplier Credit Note issued.
- **Financial Flow**: Reduce AP liability by gross credit amount, reduce Inventory Asset by taxable return value, and reverse Input Tax Credit.

#### Double-Entry Journal:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2101** | Accounts Payable (Creditors) | $V_{\text{taxable}} + T_{\text{gst}}$ | — | Reduces supplier debt |
| **1401** | Raw Material & Inventory Asset | — | $V_{\text{taxable}}$ | Reverses inventory asset |
| **1301** | Input CGST Recoverable | — | $T_{\text{cgst}}$ | Reverses eligible CGST ITC |
| **1302** | Input SGST Recoverable | — | $T_{\text{sgst}}$ | Reverses eligible SGST ITC |
| **1303** | Input IGST Recoverable | — | $T_{\text{igst}}$ | Reverses eligible IGST ITC |

$$\sum \text{Debits} = V_{\text{taxable}} + T_{\text{gst}} = \sum \text{Credits} = V_{\text{taxable}} + T_{\text{cgst}} + T_{\text{sgst}} + T_{\text{igst}} \quad \text{[BALANCED]}$$

---

### Scenario 3: Physical Return *After* Invoice is Fully Paid
- **State**: Invoice has `paid_amount == total_amount`; $\text{AP} = 0$.
- **Financial Flow**: Debit Supplier Advances / Open Debit Balance asset (`1105`), reduce Inventory Asset, and reverse ITC.

#### Double-Entry Journal:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1105** | Supplier Advances / Open Debit Asset | $V_{\text{taxable}} + T_{\text{gst}}$ | — | Generates vendor credit on account |
| **1401** | Raw Material & Inventory Asset | — | $V_{\text{taxable}}$ | Reverses inventory asset |
| **1301/2/3** | Input GST Recoverable | — | $T_{\text{gst}}$ | Reverses eligible ITC |

**Settlement of the Open Debit Asset**:
- **Case 3A (Refund via Bank Receipt)**:
  $$\text{Dr 1002 Bank Account } [V+T] \quad \text{Cr 1105 Supplier Advances } [V+T]$$
- **Case 3B (Offset against Subsequent Purchase Invoice)**:
  $$\text{Dr 2101 Next Invoice AP } [V+T] \quad \text{Cr 1105 Supplier Advances } [V+T]$$

In both cases: $\sum \text{Debits} = \sum \text{Credits}$.

---

### Scenario 4: Commercial AP Adjustment / Rate Difference (No Goods Movement)
- **State**: Supplier gives a post-invoice price rebate of ₹10,000 + ₹1,800 GST on invoice 701.
- **Financial Flow**: Reduce AP liability, credit Purchase Price Variance / Rebate Income, and reverse Input GST.

#### Double-Entry Journal:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2101** | Accounts Payable (Creditors) | 11,800.00 | — | Reduces supplier debt |
| **5105** | Purchase Price Variance / Rebates | — | 10,000.00 | Income / cost reduction |
| **1301** | Input CGST Recoverable | — | 900.00 | Reverses CGST ITC |
| **1302** | Input SGST Recoverable | — | 900.00 | Reverses SGST ITC |

$$\sum \text{Debits} = 11,800.00 = \sum \text{Credits} = 11,800.00 \quad \text{[BALANCED]}$$

---

### Scenario 5: Return on Section 17(5) Blocked ITC Goods
- **State**: Returning blocked asset (e.g. company passenger car or catering supplies where ITC was capitalized into asset cost).
- **Financial Flow**: Reduce AP by gross invoice value, reduce Inventory Asset by full gross invoice value (zero touch to ITC accounts).

#### Double-Entry Journal:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2101** | Accounts Payable (Creditors) | $V_{\text{gross}}$ | — | Reduces supplier debt |
| **1401** | Inventory / Capital Asset | — | $V_{\text{gross}}$ | Reverses capitalized cost |

$$\sum \text{Debits} = V_{\text{gross}} = \sum \text{Credits} = V_{\text{gross}} \quad \text{[BALANCED]}$$

---

## 3. Account Master Code Reference

| Account Code | Canonical Account Name | Account Type | Natural Balance |
| :--- | :--- | :--- | :--- |
| **1002** | Bank Account | Asset | Debit |
| **1105** | Supplier Advances / Open Debit Balance | Asset | Debit |
| **1301** | Input CGST Recoverable | Current Asset | Debit |
| **1302** | Input SGST Recoverable | Current Asset | Debit |
| **1303** | Input IGST Recoverable | Current Asset | Debit |
| **1401** | Raw Material & Inventory Asset | Asset | Debit |
| **2101** | Accounts Payable (Creditors) | Current Liability | Credit |
| **2105** | Goods Received Not Invoiced (GRNI) Accrual | Current Liability | Credit |
| **4205** | Purchase Discount / Rebate Income | Direct Income | Credit |
| **5105** | Purchase Price Variance (PPV) | Expense / Cost of Sales | Debit |
