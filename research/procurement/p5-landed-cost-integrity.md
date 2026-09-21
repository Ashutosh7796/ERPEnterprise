# Procurement P5: Landed Cost Integrity & Valuation Audit

**Audit Date**: 2026-08-21  
**Scope**: In-depth audit of Landed Cost Vouchers, Apportionment Algorithms, Ind AS 2 Consumption Split, Canonical Valuation Engine Integration, and Edge Case Handling.

---

## 1. Apportionment Algorithms Verification

The system supports three statutory and GAAP apportionment strategies in [`LandedCostVoucherService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/LandedCostVoucherService.java#L40-L130):

1. **By Taxable Value (`VALUE`)**:
   $$\text{Allocated Cost}_i = C_{\text{total}} \times \frac{V_i}{\sum_{k=1}^N V_k}$$
   - Appropriate for Customs Duty, Transit Insurance, and Ad-valorem Port Clearing Charges.

2. **By Net Weight (`WEIGHT`)**:
   $$\text{Allocated Cost}_i = C_{\text{total}} \times \frac{W_i}{\sum_{k=1}^N W_k}$$
   - Appropriate for Air/Ocean Freight, Heavy Haulage, and Containerized Carriage.

3. **By Quantity (`QUANTITY`)**:
   $$\text{Allocated Cost}_i = C_{\text{total}} \times \frac{Q_i}{\sum_{k=1}^N Q_k}$$
   - Appropriate for Per-Unit Handling Fees, Palletization, and Unloading Levies.

### Rounding & Zero-Loss Guarantee
- In line 125 of `LandedCostVoucherService.java`, the final allocation line is calculated as:
  $$\text{Allocated Cost}_N = C_{\text{total}} - \sum_{i=1}^{N-1} \text{Allocated Cost}_i$$
- **Audit Finding**: Guarantees that $\sum_{i=1}^N \text{Allocated Cost}_i = C_{\text{total}}$ with **zero cent/paisa rounding leakage**.

---

## 2. Ind AS 2 Consumption Split & Valuation Update

Under Ind AS 2 (Inventories) Paragraph 10–12:
- Acquisition costs (freight, non-recoverable taxes, customs duties, transit insurance) must be capitalized into inventory cost.
- **Critical Accounting Gate**: If inventory has already been sold or issued to production before the landed cost voucher is booked, capitalizing the full landed cost into remaining on-hand stock would distort future unit valuation. The cost attributable to already-dispatched stock must be expensed directly to `5101 COGS`.

### Audit of Consumption Split Algorithm
In [`ProcurementAccountingPostingService.java`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/ProcurementAccountingPostingService.java#L435-L470):

```java
if (currentStock.compareTo(BigDecimal.ZERO) <= 0) {
    // 100% already sold/dispatched
    capitalizedPortion = BigDecimal.ZERO;
    expensedPortion = allocatedCost;
} else if (currentStock.compareTo(receivedQty) < 0) {
    // Proportional consumption split
    BigDecimal onHandRatio = currentStock.divide(receivedQty, 4, RoundingMode.HALF_UP);
    capitalizedPortion = allocatedCost.multiply(onHandRatio).setScale(4, RoundingMode.HALF_UP);
    expensedPortion = allocatedCost.subtract(capitalizedPortion);
}
```

### Valuation Update on Canonical Stock Engine
For the capitalized portion ($C_{\text{asset}}$), the new moving average unit price is computed as:
$$P_{\text{new}} = \frac{(Q_{\text{curr}} \times P_{\text{curr}}) + C_{\text{asset}}}{Q_{\text{curr}}}$$
The update is applied directly to:
1. `erp_material_current_stock.current_unit_price` (Depot-specific stock record)
2. `erp_material_extend.purchase_decimal` (Global master moving average cost)

**Audit Finding**: Reuses existing stock tables. **Zero secondary stock or valuation tables are created**.

---

## 3. Edge Case Matrix & Handling

| Edge Case | Scenario | Implemented Behavior | Audit Verdict |
| :--- | :--- | :--- | :--- |
| **Zero Weight in Weight Apportionment** | Item has weight = 0 kg | System defaults item basis to 1.0 kg to prevent division by zero. | **SAFE** |
| **Zero Quantity in Qty Apportionment** | Line item qty = 0 | System defaults basis to 1.0 unit. | **SAFE** |
| **Stock Dispatched (Partial)** | Received 100, Remaining 60 | 60% capitalized to 1401, 40% expensed to 5101 COGS. | **Ind AS 2 COMPLIANT** |
| **Stock Fully Sold (Zero on Hand)** | Received 100, Remaining 0 | 100% expensed to 5101 COGS. Zero distortion of remaining stock. | **Ind AS 2 COMPLIANT** |
| **Negative Physical Stock** | Current stock < 0 (backorder) | Treated as zero stock: 100% expensed to 5101 COGS. | **SAFE** |
| **Multiple Landed Cost Vouchers** | Freight bill from Vendor A, Customs bill from Agent B | Multiple LCVs can target the same GRN; each adjusts moving average incrementally. | **SUPPORTED** |
| **Duplicate Posting Attempt** | User clicks Post twice on same LCV | Checked via CAS query; throws `BusinessRunTimeException("Already posted")`. | **PREVENTED** |
| **Recoverable GST on Landed Cost** | Transporter bills ₹5,000 + 18% GST (RCM or Forward) | Only the net cost (₹5,000) is allocated to LCV; GST is recovered via AP invoice. | **STATUTORILY COMPLIANT** |
