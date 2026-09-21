# Current-State Architecture Audit: Manufacturing & Assembly
**Component:** Existing jshERP Assembly/Disassembly Capabilities vs Modern Manufacturing  
**Author:** Antigravity AI Engine  
**Date:** September 1, 2026  
**Context:** Indian Enterprise ERP Modernization — Phase 2 (Batch 2)  

---

## 1. Executive Summary

A deep audit of the repository (`ERPSystem-boot`, `ERPSystem-web-react`, and `ERPSystem-web`) confirms that the codebase currently possesses **no formal manufacturing module**. 

Instead, it contains a primitive, ad-hoc **Kit Assembly and Disassembly** feature implemented as a subtype of generic inventory bills (`type='其它'`, `sub_type='组装单'` / `'拆卸单'`).

Concurrently, earlier procurement and GST phases implemented foundational Indian compliance artifacts—including `DeliveryChallanService` with `JOB_WORK` challan types and `DocumentNumberService` with `JWC/` sequence generation—which provide critical building blocks for Phase 2.

---

## 2. Inventory Assembly & Disassembly Audit

### 2.1 Backend Implementation Details
1. **Document Header (`erp_depot_head`):**
   - Stored with `type = '其它'` (Other) and `sub_type = '组装单'` (Assembly Bill) or `'拆卸单'` (Disassembly Bill).
   - Prefix: `ZZD` (组装单) or `CXD` (拆卸单).
2. **Document Items (`erp_depot_item`):**
   - Utilizes the `material_type` varchar column to differentiate parent product from components:
     - `material_type = '组合件'` (Combined Assembly — the parent finished good).
     - `material_type = '普通子件'` (Normal Component — the consumed raw materials).
3. **Inventory Mutation Logic in [DepotItemService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DepotItemService.java#L1195-L1210):**
   ```java
   // Normal Inbound / Outbound / Assembly / Disassembly
   BigDecimal deltaQty;
   if ("入库".equals(dh.getType())) {
       deltaQty = basicNumber;
   } else if ("出库".equals(dh.getType())) {
       deltaQty = basicNumber.negate();
   } else if ("组装单".equals(dh.getSubType())) {
       deltaQty = "组合件".equals(depotItem.getMaterialType()) ? basicNumber : basicNumber.negate();
   } else if ("拆卸单".equals(dh.getSubType())) {
       deltaQty = "组合件".equals(depotItem.getMaterialType()) ? basicNumber.negate() : basicNumber;
   } else {
       deltaQty = basicNumber;
   }
   ```
4. **Aggregation Queries in [DepotItemMapperEx.xml](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/DepotItemMapperEx.xml#L772-L775):**
   ```xml
   sum(case when dh.sub_type='组装单' and di.material_type='组合件' then di.basic_number else 0 end) as assemInTotal,
   sum(case when dh.sub_type='组装单' and di.material_type='普通子件' then di.basic_number else 0 end) as assemOutTotal,
   sum(case when dh.sub_type='拆卸单' and di.material_type='普通子件' then di.basic_number else 0 end) as disAssemInTotal,
   sum(case when dh.sub_type='拆卸单' and di.material_type='组合件' then di.basic_number else 0 end) as disAssemOutTotal
   ```

### 2.2 Frontend Implementation Details
1. **React Application ([`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx)):**
   - Routes `/inventory/assembly` to `SpecialBillListPage` with `type="入库" subType="组装单" title="Assembly Bills"`.
   - Delegates to generic `BillManager.tsx` and `BillModal.tsx`.
   - **Defect in React UI:** `BillModal.tsx` currently does not expose the `material_type` column, making it impossible to designate which row is the parent assembly and which rows are the child components in the React interface.
2. **Legacy Vue Application ([`AssembleModal.vue`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web/src/views/bill/modules/AssembleModal.vue)):**
   - Exposes an editable table where row 0 is forced to `mType = '组合件'` and row $\ge 1$ are set to `mType = '普通子件'`.
   - Lacks any reference to a Bill of Materials; every single part and quantity must be manually selected on each bill.

---

## 3. Existing Indian Compliance Artifacts (P7 & S7 Reuse)

The following components from earlier procurement and sales phases provide direct foundation for Indian manufacturing:

1. **Rule 55 Delivery Challan Engine ([DeliveryChallanService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DeliveryChallanService.java)):**
   - Tables: `erp_delivery_challan` and `erp_delivery_challan_item`.
   - Supports consecutive, tenant-isolated 16-character financial-year document numbering.
   - Handles consignor/consignee GSTINs, transport modes, vehicle numbers, and E-Way Bill payloads.
   - [DeliveryChallanDto.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/dto/DeliveryChallanDto.java) already defines `challanType: OUTWARD_RETURN, JOB_WORK, BRANCH_TRANSFER`.
2. **Document Numbering Sequence ([DocumentNumberService.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/service/DocumentNumberService.java)):**
   - Already implements sequence generation for `case "JOB_WORK_CHALLAN": return "JWC/" + shortFy + "/";`.
   - Governed by [FySequence.java](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/java/com/jsh/erp/datasource/entities/FySequence.java).

---

## 4. Comprehensive Manufacturing Gap Analysis

```
+----------------------------------------------------------------------------------------------------+
|                                    MANUFACTURING GAP MATRIX                                        |
+--------------------------+-----------------------+---------------------+---------------------------+
| Manufacturing Dimension  | Current ERP Status    | Target Requirement  | Architectural Resolution  |
+--------------------------+-----------------------+---------------------+---------------------------+
| Bill of Materials (BOM)  | MISSING (Ad-hoc)      | Master BOM Formula  | `erp_bom_head`,           |
|                          |                       | per finished good   | `erp_bom_item`            |
| Multi-Level Explosion    | MISSING               | Indented tree       | Recursive traversal       |
|                          |                       | sub-assemblies      | with circular detection   |
| BOM Revision Control     | MISSING               | Version & status    | `revision_code`,          |
|                          |                       | tracking            | `is_active`, `valid_to`   |
| Production Work Order    | MISSING               | Formal order with   | `erp_work_order`,         |
|                          |                       | full lifecycle      | `erp_work_order_item`     |
| Material Issue to WIP    | MISSING (Instant)     | 2-step physical     | Stores -> WIP Bin via     |
|                          |                       | issue prior to prod | `StockMutationService`    |
| Work in Progress (WIP)   | MISSING               | Dedicated physical  | Batch 1 `erp_depot_bin`   |
|                          |                       | & financial balance | with `zone='WIP'`         |
| Finished Goods Receipt   | PARTIAL (Assembly)    | Inward receipt from | WIP -> FG Stores via      |
|                          |                       | completed order     | `StockMutationService`    |
| Scrap / Waste Logging    | MISSING               | Scrap factor on BOM | Scrap tracking in         |
|                          |                       | & actual yield loss | `erp_work_order`          |
| Manufacturing Costing    | MISSING (Zero labor)  | Component moving    | Direct Labor + Overhead   |
|                          |                       | avg + labor/overhead| Absorption Clearing       |
| Indian Job Work (Sec 143)| MISSING               | Rule 45 Challan     | Track explicit statutory  |
|                          |                       | with due dates      | due date (1 yr / 3 yrs)   |
| GST Form ITC-04          | MISSING               | Statutory biannual  | JSON statement matching   |
|                          |                       | job-work return     | government schema         |
+--------------------------+-----------------------+---------------------+---------------------------+
```
