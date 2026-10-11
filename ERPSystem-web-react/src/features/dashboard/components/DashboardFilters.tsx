import React from 'react'
import { DatePicker, Segmented, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { DashboardDateRange } from '../api/dashboardApi'
import type { DashboardPreset } from '../hooks/useDashboardFilters'

const { RangePicker } = DatePicker
const { Text } = Typography

const PRESET_OPTIONS: { label: string; value: DashboardPreset }[] = [
  { label: 'FY to date', value: 'fytd' },
  { label: 'This month', value: 'month' },
  { label: 'Last 30 days', value: 'last30' },
  { label: 'Last 90 days', value: 'last90' },
  { label: 'Custom', value: 'custom' },
]

interface DashboardFiltersProps {
  preset: DashboardPreset
  periodLabel: string
  customRange?: DashboardDateRange
  onPresetChange: (preset: DashboardPreset) => void
  onCustomRange: (range: DashboardDateRange) => void
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  preset,
  periodLabel,
  customRange,
  onPresetChange,
  onCustomRange,
}) => {
  const pickerValue: [Dayjs, Dayjs] | null =
    preset === 'custom' && customRange ? [dayjs(customRange.startDate), dayjs(customRange.endDate)] : null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <Segmented
        options={PRESET_OPTIONS}
        value={preset}
        onChange={(value) => onPresetChange(value as DashboardPreset)}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {preset === 'custom' && (
          <RangePicker
            value={pickerValue}
            maxDate={dayjs()}
            allowClear={false}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                onCustomRange({
                  startDate: dates[0].format('YYYY-MM-DD'),
                  endDate: dates[1].format('YYYY-MM-DD'),
                })
              }
            }}
          />
        )}
        <Text style={{ fontSize: 12, color: '#64748b' }}>{preset === 'custom' ? periodLabel : periodLabel}</Text>
      </div>
    </div>
  )
}