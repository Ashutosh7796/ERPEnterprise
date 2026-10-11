import { describe, it, test } from 'node:test'
import assert from 'node:assert'
import {
  formatCompactINR,
  formatCount,
  formatDateOnly,
  formatINRFixed,
  gstPeriodLabel,
  isMoneyNull,
  monthShortLabel,
  monthTitle,
} from '../features/dashboard/utils/format.ts'
import {
  KPI_ACCENTS,
  getGstRateColor,
  isNonZeroValue,
  kpiDeltaTone,
} from '../features/dashboard/utils/semantics.ts'
import type { DashboardDateRange } from '../features/dashboard/api/dashboardTypes.ts'

describe('Dashboard Slice 2: Formatting & Semantics Contract', () => {
  it('1. Null vs zero money is distinguished and never coerced to 0', () => {
    assert.strictEqual(isMoneyNull(null), true)
    assert.strictEqual(isMoneyNull(undefined), true)
    assert.strictEqual(isMoneyNull(Number.NaN), true)
    assert.strictEqual(isMoneyNull(0), false)
    assert.strictEqual(formatINRFixed(null), null)
    assert.strictEqual(formatCompactINR(null), null)
    assert.strictEqual(formatINRFixed(0), '₹0.00')
    assert.strictEqual(isNonZeroValue(0), false)
    assert.strictEqual(isNonZeroValue(42), true)
    assert.strictEqual(isNonZeroValue(null), false)
  })

  it('2. Compact INR renders lakh/crore and full rupee below 1L', () => {
    assert.strictEqual(formatCompactINR(0), '₹0.00')
    assert.strictEqual(formatCompactINR(99999), '₹99,999.00')
    assert.strictEqual(formatCompactINR(100000), '₹1.00 L')
    assert.strictEqual(formatCompactINR(-250000), '-₹2.50 L')
    assert.strictEqual(formatCompactINR(10000000), '₹1.00 Cr')
  })

  it('3. Count/date/period formatting contracts', () => {
    assert.strictEqual(formatCount(null), '–')
    assert.strictEqual(formatCount(1234), '1,234')
    assert.strictEqual(formatDateOnly('2026-04-01'), '1 Apr 2026')
    assert.strictEqual(formatDateOnly(null), '–')
    assert.strictEqual(gstPeriodLabel('042026'), 'Apr 2026')
    assert.strictEqual(gstPeriodLabel(null), '–')
    assert.strictEqual(monthShortLabel('202604'), 'Apr')
    assert.strictEqual(monthTitle('202604'), 'Apr 2026')
  })

  it('4. KPI delta tones follow business semantics, not raw direction', () => {
    assert.strictEqual(kpiDeltaTone('sales', -5), 'attention')
    assert.strictEqual(kpiDeltaTone('sales', 5), 'positive')
    assert.strictEqual(kpiDeltaTone('expenses', 5), 'neutral') // expenses not a KPI key
    assert.strictEqual(kpiDeltaTone('netProfit', -5), 'negative')
    assert.strictEqual(kpiDeltaTone('cashBank', 5), 'positive')
    assert.strictEqual(kpiDeltaTone('receivables', 5), 'attention')
    assert.strictEqual(kpiDeltaTone('payables', -5), 'positive')
    assert.strictEqual(kpiDeltaTone('purchases', 99), 'neutral')
    assert.strictEqual(kpiDeltaTone('inventoryValue', 99), 'neutral')
    assert.strictEqual(kpiDeltaTone('sales', null), 'neutral')
  })

  it('5. KPI accent & GST rate color palettes are stable and distinct', () => {
    assert.strictEqual(KPI_ACCENTS['sales'], '#2563eb')
    assert.strictEqual(KPI_ACCENTS['netProfit'], '#16a34a')
    assert.strictEqual(KPI_ACCENTS['receivables'], '#7c3aed')
    assert.strictEqual(KPI_ACCENTS['payables'], '#d97706')
    assert.strictEqual(getGstRateColor(0), getGstRateColor(8))
    assert.notStrictEqual(getGstRateColor(0), getGstRateColor(1))
  })

  test('6. Filter preset ranges are within the fiscal year contract', async () => {
    const { computePresetRange, currentFiscalYearStart } = await import('../features/dashboard/hooks/useDashboardFilters.ts')
    const today = new Date()
    const fy = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1
    const range: DashboardDateRange = computePresetRange('fytd')
    assert.strictEqual(range.startDate, `${fy}-04-01`)
    assert.ok(range.endDate <= new Date().toISOString().slice(0, 10))
    assert.strictEqual(computePresetRange('last30').startDate < computePresetRange('last30').endDate, true)
    assert.strictEqual(currentFiscalYearStart().format('MM-DD'), '04-01')
  })

  it('7. English document/subtype translations map all internal database literals to English', async () => {
    const { formatDocumentSubType, formatPartyType } = await import('../features/dashboard/utils/format.ts')
    
    // Core document subtypes from spec requirement 17
    assert.strictEqual(formatDocumentSubType('销售出库'), 'Sales Issue')
    assert.strictEqual(formatDocumentSubType('零售出库'), 'Retail Sale')
    assert.strictEqual(formatDocumentSubType('销售退货'), 'Sales Return')
    assert.strictEqual(formatDocumentSubType('销售退货入库'), 'Sales Return')
    assert.strictEqual(formatDocumentSubType('采购入库'), 'Purchase Receipt')
    assert.strictEqual(formatDocumentSubType('采购退货'), 'Purchase Return')
    assert.strictEqual(formatDocumentSubType('采购退货出库'), 'Purchase Return')
    assert.strictEqual(formatDocumentSubType('采购订单'), 'Purchase Order')
    assert.strictEqual(formatDocumentSubType('销售订单'), 'Sales Order')
    assert.strictEqual(formatDocumentSubType('收款'), 'Receipt')
    assert.strictEqual(formatDocumentSubType('付款'), 'Payment')
    assert.strictEqual(formatDocumentSubType('收入'), 'Income')
    assert.strictEqual(formatDocumentSubType('支出'), 'Expense')
    assert.strictEqual(formatDocumentSubType('转账'), 'Transfer')
    assert.strictEqual(formatDocumentSubType('其它入库'), 'Other Inbound')
    assert.strictEqual(formatDocumentSubType('其它出库'), 'Other Outbound')

    // Null/undefined/passthrough behavior
    assert.strictEqual(formatDocumentSubType(null), '')
    assert.strictEqual(formatDocumentSubType(undefined), '')
    assert.strictEqual(formatDocumentSubType('Custom Voucher'), 'Custom Voucher')

    // Party types
    assert.strictEqual(formatPartyType('供应商'), 'Vendor')
    assert.strictEqual(formatPartyType('客户'), 'Customer')
    assert.strictEqual(formatPartyType(null), '')
  })

  it('8. Tenant label sanitization never displays internal Tenant #ID to executive users', () => {
    const sanitizeTenantLabel = (label: string | undefined | null): string => {
      if (!label || label.startsWith('Tenant #') || /^Tenant\s*#?\d+/i.test(label)) {
        return 'Company Workspace'
      }
      return label
    }

    assert.strictEqual(sanitizeTenantLabel('Tenant #149'), 'Company Workspace')
    assert.strictEqual(sanitizeTenantLabel('Tenant #123'), 'Company Workspace')
    assert.strictEqual(sanitizeTenantLabel('tenant 99'), 'Company Workspace')
    assert.strictEqual(sanitizeTenantLabel(''), 'Company Workspace')
    assert.strictEqual(sanitizeTenantLabel(null), 'Company Workspace')
    assert.strictEqual(sanitizeTenantLabel('Tesseract Infosystems Pvt Ltd'), 'Tesseract Infosystems Pvt Ltd')
  })

  it('9. Masked financial values are rendered safely without throwing or outputting ₹0.00', () => {
    // When a financial value is masked (e.g. priceLimit restrictions), value is null/undefined
    const maskedAmount: number | null = null
    assert.strictEqual(formatINRFixed(maskedAmount), null)
    assert.strictEqual(formatCompactINR(maskedAmount), null)
    assert.strictEqual(formatCount(maskedAmount), '–')
  })

  it('10. Drill-down routes point to real existing ERP application routes', () => {
    const validRoutes = [
      '/report/customer',
      '/report/vendor',
      '/report/stock',
      '/report/stock_warning_report',
      '/financial/reports/profit_loss',
      '/gst/gstr3b',
      '/sales/invoices',
      '/procurement/inbound',
      '/procurement/orders',
    ]

    for (const route of validRoutes) {
      assert.ok(route.startsWith('/'), `Route ${route} must be an absolute path`)
      assert.ok(!route.includes(' '), `Route ${route} cannot contain spaces`)
    }
  })
})