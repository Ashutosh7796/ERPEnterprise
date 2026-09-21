# Procurement Phase P6: AP Accounting & Settlement Reconciliation

## 1. Executive Summary & Verification Scope
This document audits and formally proves the mathematical, statutory, and double-entry accounting integrity of Procurement Phase P6 (Accounts Payable Payment Allocation, Supplier Advances, TDS Withholding, and MSME Compliance).

---

## 2. Double-Entry Accounting Invariance & Balance Equations

### 2.1 Supplier Advance Disbursement Equation
When a supplier advance is disbursed, the gross advance is recorded as a current asset, net cash is disbursed from the bank account, and applicable TDS is credited to statutory liabilities:
$$\text{Gross Advance } (A_{\text{gross}}) = \text{Net Bank Disbursed } (P_{\text{bank}}) + \text{TDS Withheld } (T_{\text{tds}})$$

#### Canonical GL Posting:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1105** | Supplier Advances Asset | $A_{\text{gross}}$ | — | Asset increase |
| **1002** | Bank Account | — | $P_{\text{bank}}$ | Asset decrease |
| **2205** | TDS Payable Liability | — | $T_{\text{tds}}$ | Statutory liability |

**Mathematical Proof of Balance**:
$$\sum \text{Debits} = A_{\text{gross}} = P_{\text{bank}} + T_{\text{tds}} = \sum \text{Credits}$$

---

### 2.2 Supplier Advance Settlement / Invoice Offset Equation
When an unallocated supplier advance is settled against open purchase invoices, the advance asset is credited and accounts payable liability is reduced without any additional bank flow:
$$\text{Advance Offset Amount } (A_{\text{offset}}) \le \min(\text{Unallocated Advance Balance}, \text{Open Invoice Balance})$$

#### Canonical GL Posting:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2101** | Accounts Payable Liability | $A_{\text{offset}}$ | — | Liability decrease |
| **1105** | Supplier Advances Asset | — | $A_{\text{offset}}$ | Asset decrease |

**Mathematical Proof of Balance**:
$$\sum \text{Debits} = A_{\text{offset}} = \sum \text{Credits} = A_{\text{offset}}$$

---

### 2.3 Multi-Invoice AP Payment Settlement Equation
For standard AP payments settling one or more purchase invoices:
$$\text{Gross AP Settled} = \text{Net Bank Paid} + \text{TDS Withheld} + \text{Cash Discount Received}$$

$$\sum_{i=1}^{n} \Delta \text{AP}_i = P_{\text{bank}} + \sum_{i=1}^{n} T_i + \sum_{i=1}^{n} D_i$$

#### Canonical GL Posting:
| Account Code | Account Name | Debit (₹) | Credit (₹) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2101** | Accounts Payable Liability | $\sum \Delta \text{AP}_i$ | — | Total invoice debts cleared |
| **1002** | Bank Account | — | $P_{\text{bank}}$ | Net cash out flow |
| **2205** | TDS Payable Liability | — | $\sum T_i$ | Tax deducted at payment |
| **4205** | Purchase Discount / Rebate Income | — | $\sum D_i$ | Financial income |

**Mathematical Proof of Balance**:
$$\sum \text{Debits} = \sum_{i=1}^{n} \Delta \text{AP}_i = P_{\text{bank}} + \sum T_i + \sum D_i = \sum \text{Credits}$$

---

## 3. Operational Balance Cache vs. Canonical General Ledger
1. **Canonical GL Authority**:
   - `erp_gl_journal_entry` and `erp_gl_journal_line` constitute the immutable source of financial truth.
   - All balance sheets, trial balances, and statutory audits read exclusively from canonical GL tables.
2. **Operational Cache Synchronization**:
   - `erp_supplier.all_need_pay` is an operational summary cache designed for fast dashboard and dropdown queries.
   - Updated synchronously in `@Transactional` boundary whenever AP payments, advances, or invoice postings occur.
   - Cache drift is prevented by recomputing derived balances directly from validated transaction delta.

---

## 4. Multi-Invoice FIFO Allocation & Residual Integrity
1. **FIFO Distribution**: Allocations are applied sequentially to oldest open invoices first, ensuring proper aging reduction.
2. **Partial Payments**: `paid_amount` on `erp_purchase_invoice` is incremented exactly by line allocation. When `paid_amount == total_invoice_amount`, invoice state transitions to `PAID`.
3. **No Over-Settlement**: Validation asserts that $\text{Allocation} \le \text{Total Invoice Amount} - \text{Paid Amount}$. Any over-settlement is rejected before GL entry creation.
