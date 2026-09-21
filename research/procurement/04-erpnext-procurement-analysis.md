# 04 - ERPNext Procurement Reference Architecture Analysis

**Reference Repository**: [`frappe/erpnext`](https://github.com/frappe/erpnext) (`erpnext/buying`, `erpnext/stock`, `erpnext/accounts`)  
**Reference Documentation**: [`docs.frappe.io/erpnext`](https://docs.frappe.io/erpnext/)  
**Role in Research**: **SECONDARY FULL PROCUREMENT REFERENCE** for practical document lineage & quantity tracking  

---

## 1. ERPNext Procurement Document Lifecycle

```text
[Material Request (Purchase / Transfer / Material Issue)]
                   │
                   ▼
[Request for Quotation (RFQ)]
                   │
                   ▼
[Supplier Quotation] ──► [Quotation Comparison Report]
                   │
                   ▼
[Purchase Order (PO)] ──► [PO Approval / Workflow]
        │
   ┌────┴──────────────────────────┐
   ▼                               ▼
[Purchase Receipt (PR)]      [Purchase Invoice (PI)]
   │                               │
   └───────────────┬───────────────┘
                   ▼
[Three-Way Match Verification]
                   │
                   ▼
[Payment Entry (Accounts Payable Settlement)]
```

---

## 2. ERPNext Quantity Tracking & Lineage Mechanics

ERPNext enforces authoritative quantity tracking on the `Purchase Order Item` table (`tabPurchase Order Item`):

$$\begin{aligned}
\text{qty} &= \text{Authoritative Ordered Quantity} \\
\text{received\_qty} &= \sum (\text{accepted\_qty} + \text{rejected\_qty}) \quad [\text{From submitted Purchase Receipts}] \\
\text{billed\_amt} &= \sum (\text{net\_amount}) \quad [\text{From submitted Purchase Invoices}] \\
\text{pending\_qty} &= \max(0, \text{qty} - \text{received\_qty})
\end{aligned}$$

### Key Implementation Principles from ERPNext Source Code:
1. **No Direct Overwrite**: Ordinary CRUD updates cannot directly modify `received_qty` or `billed_amt` on a Purchase Order. These columns are updated exclusively via transaction hooks on `on_submit` and `on_cancel` of downstream Purchase Receipts and Purchase Invoices.
2. **Over-Receipt Tolerance**: Supported via configurable `buying_settings.over_delivery_receipt_allowance` (e.g. 5% tolerance allowance for bulk commodities).
3. **Partial Receipt / Billing Support**: An arbitrary number of partial Receipts and partial Invoices can reference a single Purchase Order item, dynamically updating fulfillment percentages.
4. **Advance Payments Linking**: Payment Entries can reference a Purchase Order before any invoice is created. When the Purchase Invoice is submitted, eligible advance payments are automatically allocated to clear Accounts Payable.

---

## 3. Stock & Valuation Behavior in ERPNext

* **Purchase Receipt**:
  * Posts Stock Ledger Entries (`tabStock Ledger Entry`).
  * Physical stock is increased at the target warehouse.
  * Moving average valuation rate is recomputed:
    $$\text{New Valuation Rate} = \frac{(\text{Current Stock} \times \text{Current Rate}) + (\text{Received Qty} \times \text{Purchase Rate})}{\text{Current Stock} + \text{Received Qty}}$$
* **Purchase Return**:
  * Generated with `is_return = 1` and `return_against = [Receipt Name]`.
  * Deducts physical inventory at original receipt valuation and reconciles remaining balances.
