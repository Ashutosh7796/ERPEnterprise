# Validation Artifact 08: Frontend & Sidebar Navigation Placement Validation

---

## 1. Navigation Placement Validation Table

| Proposed Navigation | Path | Existing Equivalent | Dedicated Page Required? | Final Recommendation |
|---|---|---|---|---|
| **Chart of Accounts** | `/financial/chart_of_accounts` | None (only `/financial/accounts` for bank registers) | **Yes** | **Add under `Finance & Accounting`**. Tree structure for managing formal COA. |
| **Journal Vouchers** | `/financial/journal_vouchers` | None | **Yes** | **Add under `Finance & Accounting`**. Dedicated multi-row Dr/Cr voucher editor. |
| **Trial Balance** | `/report/trial_balance` | None | **Yes** | **Add under `Analytics & Reports`**. Clean tree table with period Dr/Cr rollups. |
| **Profit & Loss** | `/report/profit_loss` | None | **Yes** | **Add under `Analytics & Reports`**. Schedule III Revenue vs Expenses statement. |
| **Balance Sheet** | `/report/balance_sheet` | None | **Yes** | **Add under `Analytics & Reports`**. Schedule III Assets vs Liabilities & Equity statement. |
| **General Ledger Drilldown** | `/report/general_ledger` | None | **Yes** | **Add under `Analytics & Reports`**. Filter by Account/Party with running balance & voucher drilldown. |

## 2. UI Component Reusability
- Ant Design `Tree` and `Table` components used across the app will be reused for Chart of Accounts and Financial Statements.
- Existing custom modal wrappers (`Modal`, `Form`, `InputNumber`, `Select`) will be used for Journal Voucher editing.
- Responsive design tokens and tab-routing (`useTabStore`) will be used uniformly.
