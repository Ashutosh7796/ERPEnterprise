# 10 - Procurement Phase P7: ERPNext India Compliance Reference Comparison

**Document Ref**: `PROC-P7-VERIF-10`  
**Evaluation Date**: August 2026  
**Status**: **SOURCE-VERIFIED ARCHITECTURAL COMPARISON**  

---

## 1. Source Reference & Repositories
- **ERPNext Core**: `erpnext/stock/doctype/purchase_receipt/purchase_receipt.py` & `erpnext/accounts/doctype/purchase_invoice/purchase_invoice.py`
- **India Compliance App**: `india_compliance/gst_india/doctype/gstr_3b_report/gstr_3b_report.py`
- **Verification Status**: **SOURCE INSPECTED & CONFIRMED**

---

## 2. ERPNext Return Architecture Analysis

### 2.1 The `is_return = 1` Model
In ERPNext:
- Physical purchase returns are modeled as a `Purchase Receipt` with `is_return = 1`, where quantity is entered as a **negative number** (`qty < 0`), referencing `return_against = Original Purchase Receipt Name`.
- AP and tax adjustments are modeled as a `Purchase Invoice` with `is_return = 1`, referencing `return_against = Original Purchase Invoice Name`.
- Stock ledger entries (`Stock Ledger Entry`) are created with negative `actual_qty`, which reduces bin valuation based on moving average or FIFO valuation.

### 2.2 India Compliance App (`india_compliance`) Integration
- Tracks supplier credit notes in `GSTR-2B` reconciliation tool.
- Auto-populates `GSTR-3B Table 4(B)(2)` by querying all `Purchase Invoice` records where `is_return = 1` and `gst_category != 'Overseas'`.
- Handles Section 17(5) blocked credit by looking up item master `is_ineligible_for_itc = 1` and skipping GSTR-3B Table 4(B)(2) lines.

---

## 3. Comparative Architecture Matrix

| Dimension | ERPNext Implementation | Our Enterprise ERP (Phase P7) | Statutory Evaluation |
| :--- | :--- | :--- | :--- |
| **Data Model** | Negative quantities on same Doctype (`is_return=1`). | Dedicated explicit entities (`erp_procurement_return` & `erp_procurement_return_item`) with positive return quantities. | Our explicit model provides cleaner audit trail, avoiding SQL negative math errors. |
| **Physical Transport** | Generates E-Way Bill JSON from Purchase Receipt Return. | Generates Rule 55 Delivery Challan (`DC-RET-XXXX`) + E-Way Bill payload. | **CONFIRMED** |
| **Valuation Engine** | Perpetual inventory with Stock Ledger Entry recalculation. | Single canonical physical stock (`erp_material_current_stock`) + Ind AS 2 Moving Average Cost. | **CONFIRMED** |
| **GL Reversal** | Posts negative debits or inverted debit/credit lines in `GL Entry`. | Explicit standard double-entry journal lines (`Dr AP, Cr Inventory, Cr Input GST`). | **CONFIRMED (Standard Double-Entry)** |
| **GSTR-3B Mapping** | Table 4(B)(2) for eligible returns; zero for blocked items. | Table 4(B)(2) for eligible returns; zero for blocked items. | **CONFIRMED (100% Statutorily Aligned)** |
| **Lineage DAG** | Tracks parent `return_against` field. | DAG edges in `erp_document_relationship` (`PURCHASE_RETURN`, `STATUTORY_CREDIT_NOTE`). | **CONFIRMED** |

---

## 4. Key Lessons Adopted from ERPNext
1. **Explicit Lineage Validation**: Validates cumulative returned quantities against `original_line_item_id` to strictly prevent over-returns.
2. **Blocked ITC Segregation**: Prevents ineligible ITC from appearing in return reversals, preserving accurate GSTR-3B reporting.
