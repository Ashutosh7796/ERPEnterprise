# Batch 2: Manufacturing Current-State Audit

## 1. Executive Summary
This document audits the legacy assembly and disassembly capabilities currently in the ERP, establishing what exists today and identifying the exact foundation required before manufacturing can be built.

---

## 2. Current Codebase Capabilities

### 2.1 The Assembly Bill (`组装单`)
* **UI Location:** [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx)
* **Backend Invariant:**
  - Header: `erp_depot_head` with `type='入库'` and `sub_type='组装单'`.
  - Details: `erp_depot_item`.
    - 1 line tagged `material_type='组合件'` (The parent assembled product).
    - $N$ lines tagged `material_type='普通子件'` (The child component parts).
* **Stock Effect in [`DepotItemMapperEx.xml`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-boot/src/main/resources/mapper_xml/DepotItemMapperEx.xml#L804-L805):**
  ```sql
  sum(case when dh.sub_type='组装单' and di.material_type='组合件' then di.basic_number else 0 end) as assemInTotal,
  sum(case when dh.sub_type='组装单' and di.material_type='普通子件' then di.basic_number else 0 end) as assemOutTotal
  ```
  - Increments parent stock immediately upon bill save.
  - Decrements child components immediately upon bill save.

### 2.2 The Disassembly Bill (`拆卸单`)
* **UI Location:** [`SpecialBillList.tsx`](file:///e:/Codes/ERP/jshERP-master/ERPSystem-web-react/src/features/inventory/pages/SpecialBillList.tsx)
* **Backend Invariant:**
  - Header: `erp_depot_head` with `type='出库'` and `sub_type='拆卸单'`.
  - Details: `erp_depot_item`.
    - Decrements parent item (`disAssemOutTotal`).
    - Increments child components (`disAssemInTotal`).

---

## 3. Structural Deficiencies of Legacy Assembly
1. **No Master BOM Template**: Ratios are manually entered per bill; if assembling 50 bicycles, the user must manually add frame, wheels, chain, and pedals every single time.
2. **Zero Work-in-Progress (WIP)**: Components are consumed instantaneously; production taking 7 days cannot be represented.
3. **No Operations or Routing**: Machines, labor hours, and work centers cannot be planned or recorded.
4. **No Overhead Absorption**: Assembled unit cost is simply the raw material sum; labor, electricity, and machine depreciation are never absorbed into finished goods value.
5. **No Subcontracting / Job Work**: No mechanism to send components to a vendor for coating or heat treatment under GST Rule 45.
