# Phase S2: Customer Credit Exposure & Overdue Risk Engine

---

## 1. Executive Summary & Core Principles
Customer credit management protects the enterprise against bad debts and working capital lockup. 

### Critical Design Rule: Zero Double-Counting of Overdue Invoices
Overdue invoices are already part of **Open Receivables** (Total Unpaid Invoices). Adding overdue invoices as an additive term in the credit exposure formula would mathematically double-count debt. 

Therefore, in our approved architecture:
1. **Credit Exposure** is the strict sum of open financial exposure minus unallocated credits/advances.
2. **Overdue Invoices** is treated as a **separate risk/policy evaluation dimension** (e.g. grace period trigger, strict block flag).

---

## 2. Definitive Credit Exposure Formula

$$\mathbf{\text{Credit Exposure}} = \mathbf{\text{Open Receivables}} + \mathbf{\text{Approved Unbilled Exposure}} + \mathbf{\text{Current Order Exposure}} - \mathbf{\text{Eligible Unallocated Advances}} - \mathbf{\text{Eligible Unadjusted Credit Notes}}$$

```mermaid
flowchart TD
    subgraph Additive Components
        A[Open Receivables - Total Unpaid Invoices]
        B[Approved Unbilled Orders - Open SOs not yet billed]
        C[Current Order Value - New Order under evaluation]
    end
    
    subgraph Deductive Credits
        D[Eligible Unallocated Customer Advances]
        E[Eligible Unadjusted Credit Notes]
    end
    
    A & B & C --> F((+ Total Exposure Gross))
    D & E --> G((- Total Credits))
    F & G --> H[Net Credit Exposure]
    
    H --> I{Compare against Customer Credit Limit}
    
    subgraph Policy Dimension: Overdue Invoices
        J[Check Invoices Overdue > Grace Days]
    end
    
    I & J --> K{Credit Policy Decision Engine}
    K -- STRICT_BLOCK & (Exposure > Limit OR Overdue > 0) --> L[HARD BLOCK: Error 403 / Reject]
    K -- WARNING_ONLY & Breach Detected --> M[Route to Finance Approval]
    K -- Within Limit & Zero Overdue --> N[Proceed with Order Approval]
```

---

## 3. Detailed Component Definitions

### 3.1 Open Receivables
* **Definition**: Total outstanding balance across all posted, unpaid, or partially paid Sales Invoices (`erp_gst_sales_invoice` where `status = 'POSTED'` and `paid_status != 'FULLY_PAID'`).
* **Disputed Invoices Treatment**: Invoices marked as `UNDER_DISPUTE` are included in exposure by default (configurable per tenant: `include_disputed_in_credit_exposure = true`).

### 3.2 Approved Unbilled Orders
* **Definition**: Financial commitment for Sales Orders in `APPROVED` or `PARTIALLY_DELIVERED` status where goods have not yet been fully invoiced:
  $$\text{Unbilled Exposure} = \sum_{\text{Approved SO Lines}} (\text{Ordered Qty} - \text{Invoiced Qty}) \times \text{Gross Unit Rate}$$

### 3.3 Current Order Exposure
* **Definition**: The gross total value (inclusive of taxes and discounts) of the current Sales Order being created or approved.

### 3.4 Eligible Unallocated Customer Advances
* **Definition**: Customer advance vouchers (`erp_account_head` with `type = '收预付款'`) that have not yet been consumed or knocked off against specific sales invoices.

### 3.5 Eligible Unadjusted Credit Notes
* **Definition**: GST Credit Notes (`erp_gst_credit_debit_note` with `note_type = 'CREDIT'`) that have not been refunded or settled against receivables.

---

## 4. Policy Configuration & Overdue Risk Matrix

| Configuration Field | Data Type | Default Value | Description |
|---|---|---|---|
| `credit_check_policy` | `VARCHAR(20)` | `STRICT_BLOCK` | `STRICT_BLOCK` (hard error), `WARNING_ONLY` (requires Finance Director override), or `DISABLED`. |
| `overdue_grace_days` | `INT` | `7` | Number of days past invoice due date before invoice is flagged as an active credit violation. |
| `block_on_overdue_invoices` | `BOOLEAN` | `true` | If `true`, any invoice overdue $> \text{grace\_days}$ blocks new orders regardless of available credit limit. |
| `credit_limit_currency` | `VARCHAR(10)` | `'INR'` | Customer credit limit currency base. |
