# 04 - Procurement Phase P7: Return Quantity & Immutable Lineage Verification

**Document Ref**: `PROC-P7-VERIF-04`  
**Evaluation Date**: August 2026  
**Status**: **MATHEMATICAL LINEAGE & INVARIANT PROOF**  

---

## 1. Core Mathematical Quantity Invariants

To maintain airtight procurement integrity, every purchase return must strictly satisfy the universal quantity invariant hierarchy at both line-item level and aggregate document level:

$$\text{Returned Qty} \le \text{Accepted Qty} \le \text{Received Qty} \le \text{Ordered Qty}$$

$$\sum_{k=1}^{m} \text{Returned Qty}_k \le \text{Accepted Qty}_{\text{GRN}} - \text{Previously Returned Qty}$$

$$\sum_{k=1}^{m} \text{Invoiced Qty}_k - \sum_{k=1}^{m} \text{Credited Qty}_k \ge 0$$

---

## 2. Universal Return Lineage Graph (DAG)

The Directed Acyclic Graph (DAG) tracks the forward and backward relationships across all procurement stages. A purchase return must never overwrite or mutate original historical records:

```mermaid
graph TD
    PO[Purchase Order: Qty = 100] --> GRN1[GRN 1: Received = 60, Accepted = 55, Rejected = 5]
    PO --> GRN2[GRN 2: Received = 40, Accepted = 40, Rejected = 0]
    
    GRN1 --> INV1[Purchase Invoice 1: Invoiced = 55 @ ₹100]
    GRN2 --> INV2[Purchase Invoice 2: Invoiced = 40 @ ₹100]
    
    INV1 --> RET1[Purchase Return 1: Qty = 10 (Defective in use)]
    INV1 --> RET2[Purchase Return 2: Qty = 5 (Wrong specs)]
    INV2 --> RET3[Purchase Return 3: Qty = 10 (Excess delivery)]
    
    RET1 --> DC1[Rule 55 Delivery Challan 1]
    RET2 --> DC2[Rule 55 Delivery Challan 2]
    RET3 --> DC3[Rule 55 Delivery Challan 3]
    
    RET1 --> SCN1[Supplier Credit Note 1]
    RET2 --> SCN2[Supplier Credit Note 2]
    RET3 --> SCN3[Supplier Credit Note 3]
```

---

## 3. Supported Multi-Document Return Scenarios

### 3.1 Partial Return against Single GRN
- **Scenario**: 100 units accepted in GRN 601. Return 20 units in Return Doc 701.
- **Lineage Computation**:
  - $\text{Original Accepted Qty} = 100$ (Immutable).
  - $\text{Cumulative Returned Qty} = 20$.
  - $\text{Net Active Accepted Qty} = 100 - 20 = 80$.
  - Subsequent return can return at most 80 units.

### 3.2 Multiple Partial Returns against Single Purchase Invoice
- **Scenario**: Purchase Invoice 801 billed for 100 units.
  - Return 1: 15 units returned on Day 5.
  - Return 2: 10 units returned on Day 12.
  - Return 3: 5 units returned on Day 20.
- **Lineage Computation**:
  - $\text{Total Billed Qty} = 100$.
  - $\sum \text{Return Qty} = 15 + 10 + 5 = 30$.
  - $\text{Remaining Creditable Qty} = 100 - 30 = 70$.
  - $\text{Remaining Billed AP Balance} = (100 - 30) \times \text{Unit Price}$.

### 3.3 Multiple GRNs Consolidated into One Invoice $\to$ Multiple Returns
- **Scenario**: GRN 1 (50 units) and GRN 2 (50 units) billed under Consolidated Invoice 901 (100 units).
- **Lineage Computation**:
  - Return line items reference both the parent Invoice ID and the originating GRN line ID.
  - Validates line-level limits against both the specific GRN depot stock and the consolidated invoice open balance.

### 3.4 Return After Partial / Full Payment
- **Scenario**: Invoice ₹1,18,000 was fully paid. Return 20% of goods (value ₹23,600).
- **Lineage Computation**:
  - The return note records $\text{Credit Amount} = \text{₹23,600}$.
  - Because $\text{AP Outstanding} = 0$, the return generates an **Open Debit Balance** against the supplier (`erp_supplier.all_need_pay` decreases or turns into advance credit).
  - Preserves full audit trail linking the return to original payment voucher.

---

## 4. Immutable Historical Audit Principles
1. **Never Overwrite**:
   - `erp_purchase_order.total_amount` is NEVER reduced by returns.
   - `erp_depot_item.oper_number` on original GRN is NEVER decremented by returns.
   - `erp_purchase_invoice.total_invoice_amount` is NEVER reduced in-place.
2. **Explicit Lineage Records**:
   - Every return creates dedicated rows in `erp_procurement_return` and `erp_procurement_return_item`.
   - Every DAG edge is recorded in `erp_document_relationship` with edge type `PURCHASE_RETURN` and `STATUTORY_CREDIT_NOTE`.
3. **Derived Net Balances**:
   - Derived queries compute net positions:
     $$\text{Net Invoiced Balance} = \text{Invoice Total} - \text{Paid Total} - \sum \text{Return Credit Amounts}$$
