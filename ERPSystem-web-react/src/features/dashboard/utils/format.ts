const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const COUNT = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

export const isMoneyNull = (value: number | null | undefined): boolean =>
  value === null || value === undefined || Number.isNaN(value)

export function formatINRFixed(value: number | null | undefined): string | null {
  if (isMoneyNull(value)) return null
  return INR.format(Number(value))
}

export function formatCompactINR(value: number | null | undefined): string | null {
  if (isMoneyNull(value)) return null
  const v = Number(value)
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 10000000) {
    return `${sign}₹${INR_COMPACT.format(abs / 10000000)} Cr`
  }
  if (abs >= 100000) {
    return `${sign}₹${INR_COMPACT.format(abs / 100000)} L`
  }
  return INR.format(v)
}

export function formatCount(value: number | null | undefined): string {
  if (isMoneyNull(value)) return '–'
  return COUNT.format(Number(value))
}

export function formatQuantity(value: number | null | undefined): string {
  if (isMoneyNull(value)) return '–'
  const v = Number(value)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
  }).format(v)
  return formatted
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthShortLabel(period: string | null | undefined): string {
  if (!period) return '–'
  const m = period.slice(-2)
  const idx = Number(m)
  if (!Number.isInteger(idx) || idx < 1 || idx > 12) return period
  return MONTH_ABBR[idx - 1]
}

export function monthTitle(period: string | null | undefined): string {
  if (!period || period.length < 6) return period ?? '–'
  const year = period.slice(0, 4)
  const m = Number(period.slice(4, 6))
  if (!Number.isInteger(m) || m < 1 || m > 12) return period
  return `${MONTH_ABBR[m - 1]} ${year}`
}

export function gstPeriodLabel(period: string | null | undefined): string {
  if (!period || period.length < 6) return period ?? '–'
  const mm = period.slice(0, 2)
  const yyyy = period.slice(2, 6)
  const m = Number(mm)
  return `${m >= 1 && m <= 12 ? MONTH_ABBR[m - 1] : mm} ${yyyy}`
}

export function formatDateOnly(date: string | null | undefined): string {
  if (!date) return '–'
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!parts) return date
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return date
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`
}

export function formatCurrencyDelta(value: number | null | undefined): string | null {
  if (isMoneyNull(value)) return null
  const v = Number(value)
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  const compact = formatCompactINR(Math.abs(v)) ?? ''
  return v === 0 ? '0' : `${sign}${compact}`
}

export function formatPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const v = Number(value)
  const sign = v >= 0 ? '+' : '-'
  return `${sign}${Math.abs(v).toFixed(1)}%`
}

export function deltaTooltip(delta: number | null | undefined, prevValue: number | null | undefined): string {
  if (isMoneyNull(delta)) return ''
  const deltaText = formatCompactINR(Number(delta)) ?? ''
  const prevText = isMoneyNull(prevValue) ? '–' : formatCompactINR(Number(prevValue)) ?? '–'
  return `Change vs previous period: ${deltaText} (previous ${prevText})`
}

export function compactTickLabel(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(Math.round(value))
}

/**
 * Master English translation dictionary for internal ERP database literals.
 * Maps legacy/internal Chinese document types, sub-types, statuses, and party types
 * to professional English presentation labels.
 */
const SUB_TYPE_EN_MAP: Record<string, string> = {
  '销售出库': 'Sales Issue',
  '零售出库': 'Retail Sale',
  '销售退货': 'Sales Return',
  '销售退货入库': 'Sales Return',
  '采购入库': 'Purchase Receipt',
  '采购退货': 'Purchase Return',
  '采购退货出库': 'Purchase Return',
  '采购订单': 'Purchase Order',
  '销售订单': 'Sales Order',
  '收款': 'Receipt',
  '付款': 'Payment',
  '收入': 'Income',
  '支出': 'Expense',
  '转账': 'Transfer',
  '收预付款': 'Advance Receipt',
  '其它入库': 'Other Inbound',
  '其它出库': 'Other Outbound',
  '调拨入库': 'Transfer Inbound',
  '调拨出库': 'Transfer Outbound',
  '组装单': 'Assembly Order',
  '拆卸单': 'Disassembly Order',
  '盘点录入': 'Stocktake Entry',
  '盘点复核': 'Stocktake Review',
}

export function formatDocumentSubType(subType?: string | null): string {
  if (!subType) return ''
  return SUB_TYPE_EN_MAP[subType] ?? subType
}

const PARTY_TYPE_EN_MAP: Record<string, string> = {
  '供应商': 'Vendor',
  '客户': 'Customer',
  '会员': 'Member',
}

export function formatPartyType(partyType?: string | null): string {
  if (!partyType) return ''
  return PARTY_TYPE_EN_MAP[partyType] ?? partyType
}