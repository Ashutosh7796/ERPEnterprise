# GST Statutory Rule Versioning & Future-Proofing Strategy

---

## 1. Objective & Problem Statement
Tax laws, threshold limits, HSN codes, and e-invoicing mandates evolve periodically with GST Council decisions. Hardcoding thresholds (e.g. `50000000` for ₹5 Cr e-invoicing threshold or `200` for km/day) directly into Java source code creates technical debt and risks non-compliance when amendments take effect on specific dates.

---

## 2. Effective-Dated Rule Engine Architecture

```text
Table: erp_gst_statutory_rule_version
├── id (BIGINT PK)
├── rule_code (VARCHAR 64, e.g. 'EINVOICE_AATO_THRESHOLD', 'EWAY_KM_PER_DAY', 'TDS_GOODS_THRESHOLD')
├── parameter_value (VARCHAR 255 / NUMERIC)
├── effective_from (DATE, NOT NULL)
├── effective_to (DATE, NULLABLE)
├── notification_reference (VARCHAR 128, e.g. 'Notification No. 10/2023-CT')
├── description (VARCHAR 255)
└── tenant_id (BIGINT, 0 = Global Platform Default)
```

### 2.1 Resolution Algorithm
When computing statutory compliance for any document with `document_date`:
```sql
SELECT parameter_value 
FROM erp_gst_statutory_rule_version 
WHERE rule_code = :ruleCode 
  AND effective_from <= :documentDate 
  AND (effective_to IS NULL OR effective_to >= :documentDate)
  AND (tenant_id = :tenantId OR tenant_id = 0)
ORDER BY tenant_id DESC, effective_from DESC 
LIMIT 1;
```

### 2.2 Seed Data for Statutory Rules

| Rule Code | Effective From | Effective To | Parameter Value | Notification Ref | Description |
|---|---|---|---|---|---|
| `EINVOICE_AATO_THRESHOLD` | 2020-10-01 | 2022-09-30 | `5000000000` (₹500 Cr) | Notif 13/2020-CT | E-Invoice Phase 1 |
| `EINVOICE_AATO_THRESHOLD` | 2022-10-01 | 2023-07-31 | `100000000` (₹10 Cr) | Notif 17/2022-CT | E-Invoice Phase 4 |
| `EINVOICE_AATO_THRESHOLD` | 2023-08-01 | `NULL` | `50000000` (₹5 Cr) | Notif 10/2023-CT | E-Invoice Phase 6 (Current) |
| `EWAY_KM_PER_DAY` | 2017-07-01 | 2020-12-31 | `100` | Rule 138(10) | E-Way Bill 100 km/day |
| `EWAY_KM_PER_DAY` | 2021-01-01 | `NULL` | `200` | Notif 94/2020-CT | E-Way Bill 200 km/day (Current) |
| `TDS_194Q_RATE` | 2021-07-01 | `NULL` | `0.001` (0.1%) | Finance Act 2021 | TDS on Goods Purchases |
