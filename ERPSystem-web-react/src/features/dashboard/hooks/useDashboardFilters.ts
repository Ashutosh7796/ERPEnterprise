import { useMemo, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import type { DashboardDateRange } from '../api/dashboardApi'

export type DashboardPreset = 'fytd' | 'month' | 'last30' | 'last90' | 'custom'

export interface DashboardFilterSelection {
  preset: DashboardPreset
  range: DashboardDateRange
  periodLabel: string
}

const toISO = (d: Dayjs): string => d.format('YYYY-MM-DD')

export function currentFiscalYearStart(): Dayjs {
  const today = dayjs()
  const fy = today.month() + 1 >= 4 ? today.year() : today.year() - 1
  return dayjs(`${fy}-04-01`, 'YYYY-MM-DD')
}

export function computePresetRange(preset: DashboardPreset, customRange?: DashboardDateRange): DashboardDateRange {
  const today = dayjs()
  switch (preset) {
    case 'fytd':
      return { startDate: toISO(currentFiscalYearStart()), endDate: toISO(today) }
    case 'month':
      return { startDate: toISO(today.startOf('month')), endDate: toISO(today) }
    case 'last30':
      return { startDate: toISO(today.subtract(29, 'day')), endDate: toISO(today) }
    case 'last90':
      return { startDate: toISO(today.subtract(89, 'day')), endDate: toISO(today) }
    case 'custom':
      return customRange ?? { startDate: toISO(currentFiscalYearStart()), endDate: toISO(today) }
  }
}

function formatPeriodLabel(range: DashboardDateRange): string {
  const start = dayjs(range.startDate)
  const end = dayjs(range.endDate)
  if (!start.isValid() || !end.isValid()) {
    return `${range.startDate} / ${range.endDate}`
  }
  return `${start.format('DD MMM YYYY')} – ${end.format('DD MMM YYYY')}`
}

export function useDashboardFilters(): DashboardFilterSelection & {
  customRange?: DashboardDateRange
  setPreset: (preset: DashboardPreset) => void
  setCustomRange: (range: DashboardDateRange) => void
} {
  const [preset, setPreset] = useState<DashboardPreset>('fytd')
  const [customRange, setCustomRange] = useState<DashboardDateRange | undefined>(undefined)

  const range = useMemo(() => computePresetRange(preset, customRange), [preset, customRange])
  const periodLabel = useMemo(() => formatPeriodLabel(range), [range])

  return {
    preset,
    range,
    periodLabel,
    customRange,
    setPreset: (next) => {
      setPreset(next)
      if (next !== 'custom') {
        setCustomRange(undefined)
      }
    },
    setCustomRange: (next) => {
      setCustomRange(next)
      setPreset('custom')
    },
  }
}