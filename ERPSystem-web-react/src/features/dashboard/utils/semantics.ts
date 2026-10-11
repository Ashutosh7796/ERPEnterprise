import type { ActionSeverity, RecentKind } from '../api/dashboardTypes'

export type DeltaTone = 'positive' | 'negative' | 'attention' | 'neutral'

export function kpiDeltaTone(kpiKey: string, delta: number | null | undefined): DeltaTone {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return 'neutral'
  const d = Number(delta)
  switch (kpiKey) {
    case 'sales':
      return d >= 0 ? 'positive' : 'attention'
    case 'grossProfit':
    case 'netProfit':
    case 'cashBank':
      return d >= 0 ? 'positive' : 'negative'
    case 'receivables':
      return d > 0 ? 'attention' : d < 0 ? 'positive' : 'neutral'
    case 'payables':
      return d > 0 ? 'attention' : d < 0 ? 'positive' : 'neutral'
    case 'inventoryValue':
    case 'purchases':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function isNonZeroValue(value: number | null | undefined): boolean {
  if (value === null || value === undefined || Number.isNaN(value)) return false
  return Number(value) !== 0
}

export interface SeverityMeta {
  label: string
  tone: 'danger' | 'warning' | 'info'
  color: string
}

export const SEVERITY_META: Record<ActionSeverity, SeverityMeta> = {
  high: { label: 'High', tone: 'danger', color: '#dc2626' },
  medium: { label: 'Medium', tone: 'warning', color: '#d97706' },
  info: { label: 'Info', tone: 'info', color: '#2563eb' },
}

export interface RecentKindMeta {
  label: string
  color: string
  bg: string
}

export const RECENT_KIND_META: Record<RecentKind, RecentKindMeta> = {
  INVOICE: { label: 'Invoice', color: '#2563eb', bg: '#eff6ff' },
  RECEIPT: { label: 'Receipt', color: '#16a34a', bg: '#f0fdf4' },
  PAYMENT: { label: 'Payment', color: '#d97706', bg: '#fffbeb' },
  RETURN: { label: 'Return', color: '#7c3aed', bg: '#f5f3ff' },
  ORDER: { label: 'PO', color: '#0891b2', bg: '#ecfeff' },
  GRN: { label: 'GRN', color: '#ea580c', bg: '#fff7ed' },
}

export const KPI_ACCENTS: Record<string, string> = {
  sales: '#2563eb',
  purchases: '#ea580c',
  grossProfit: '#16a34a',
  netProfit: '#16a34a',
  receivables: '#7c3aed',
  payables: '#d97706',
  cashBank: '#0891b2',
  inventoryValue: '#166534',
}

export const GST_RATE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#ea580c',
  '#16a34a',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#be185d',
]

export function getGstRateColor(index: number): string {
  return GST_RATE_COLORS[index % GST_RATE_COLORS.length]
}