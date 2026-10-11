import React, { useMemo } from 'react'
import { Space, Typography } from 'antd'
import { BarChartOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardFinancial, useDashboardSummary } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { StatDelta } from './primitives/StatDelta'
import { QueryBoundary } from '../QueryBoundary'
import {
  compactTickLabel,
  formatCompactINR,
  isMoneyNull,
  monthShortLabel,
  monthTitle,
} from '../utils/format'
import { KPI_ACCENTS, isNonZeroValue, kpiDeltaTone } from '../utils/semantics'

const { Text } = Typography

interface SalesProfitWidgetProps {
  range: DashboardDateRange
}

const toNumOrNull = (v?: number | null): number | null =>
  v === null || v === undefined || Number.isNaN(v) ? null : Number(v)

const hasAnySeries = (arr: (number | null)[]) => arr.some((v) => v !== null)

export const SalesProfitWidget: React.FC<SalesProfitWidgetProps> = ({ range }) => {
  const financialQuery = useDashboardFinancial(range)
  const summaryQuery = useDashboardSummary(range)

  const kpis = summaryQuery.data?.kpis ?? []
  const byKey = new Map(kpis.map((k) => [k.key, k]))
  const salesKpi = byKey.get('sales')
  const grossProfitKpi = byKey.get('grossProfit')
  const netProfitKpi = byKey.get('netProfit')

  const chartOption = useMemo(() => {
    const financial = financialQuery.data
    if (!financial) return null

    const financeVisible = financial.financeVisible
    const trend = financial.profitTrend ?? []
    const periods = trend.map((p) => p.period)
    const sales = (financial.salesTrend ?? []).map((p) => toNumOrNull(p.sales))
    const grossProfit = trend.map((p) => toNumOrNull(p.grossProfit))
    const netProfit = trend.map((p) => toNumOrNull(p.profit))

    const series: any[] = [
      {
        name: 'Revenue',
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { color: '#2563eb', borderRadius: [2, 2, 0, 0] },
        data: sales,
      },
    ]

    if (financeVisible && hasAnySeries(grossProfit)) {
      series.push({
        name: 'Gross Profit',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        itemStyle: { color: '#0891b2' },
        connectNulls: false,
        data: grossProfit,
      })
    }

    if (financeVisible && hasAnySeries(netProfit)) {
      series.push({
        name: 'Net Profit',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        itemStyle: { color: '#16a34a' },
        connectNulls: false,
        data: netProfit,
      })
    }

    return {
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#0f172a', fontSize: 12 },
        formatter: (params: any[]) => {
          const axisIndex: number = params.length > 0 ? params[0].dataIndex : 0
          const period: string = periods[axisIndex] ?? ''
          let html = `<div style="font-weight:700;margin-bottom:6px;">${monthTitle(period)}</div>`
          params.forEach((item: any) => {
            const value = item.value as number | null
            html += `<div style="display:flex;justify-content:space-between;gap:20px;margin:3px 0;">
              <span>${item.marker} ${item.seriesName}</span>
              <span style="font-weight:600;">${value === null ? 'No data' : (formatCompactINR(value) ?? '')}</span>
            </div>`
          })
          return html
        },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 20,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: 8, right: 8, top: 16, bottom: 42, containLabel: true },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: {
          formatter: (value: string) => monthShortLabel(value),
          color: '#94a3b8',
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => compactTickLabel(v), color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
      },
      series,
    }
  }, [financialQuery.data])

  const showGrossProfitChip =
    financialQuery.data?.financeVisible &&
    grossProfitKpi &&
    !grossProfitKpi.masked &&
    isNonZeroValue(grossProfitKpi.value)

  const showNetProfitChip =
    financialQuery.data?.financeVisible &&
    netProfitKpi &&
    !netProfitKpi.masked &&
    isNonZeroValue(netProfitKpi.value)

  const empty =
    financialQuery.data &&
    !hasAnySeries((financialQuery.data.salesTrend ?? []).map((p) => toNumOrNull(p.sales))) &&
    !hasAnySeries((financialQuery.data.profitTrend ?? []).map((p) => toNumOrNull(p.profit)))

  return (
    <QueryBoundary
      query={financialQuery}
      isEmpty={(data) =>
        !hasAnySeries((data.salesTrend ?? []).map((p) => toNumOrNull(p.sales))) &&
        !hasAnySeries((data.profitTrend ?? []).map((p) => toNumOrNull(p.profit)))
      }
      emptyText="No sales or profitability activity in this period."
      skeletonLines={8}
    >
      {(financial) => (
        <WidgetCard
          title="Sales & Profitability"
          icon={<BarChartOutlined style={{ color: '#2563eb' }} />}
          extra={
            <Space size={16} wrap>
              {salesKpi && !salesKpi.masked && (
                <MetricChip
                  label="Sales"
                  value={salesKpi.value}
                  delta={salesKpi.delta}
                  deltaPct={salesKpi.deltaPct}
                  tone={kpiDeltaTone(salesKpi.key, salesKpi.delta)}
                />
              )}
              {showGrossProfitChip && (
                <MetricChip
                  label="Gross Profit"
                  value={grossProfitKpi!.value}
                  delta={grossProfitKpi!.delta}
                  deltaPct={grossProfitKpi!.deltaPct}
                  tone={kpiDeltaTone('grossProfit', grossProfitKpi!.delta)}
                />
              )}
              {showNetProfitChip && (
                <MetricChip
                  label="Net Profit"
                  value={netProfitKpi!.value}
                  delta={netProfitKpi!.delta}
                  deltaPct={netProfitKpi!.deltaPct}
                  tone={kpiDeltaTone('netProfit', netProfitKpi!.delta)}
                />
              )}
            </Space>
          }
          footer={
            financial.financeVisible
              ? 'Revenue is net sales from invoices. Gross profit (Revenue - COGS) and Net profit are from the general ledger (Profit & Loss).'
              : 'Revenue is net sales from invoices. Profit metrics are restricted for the current role.'
          }
        >
          {empty ? (
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              No sales or profitability activity in this period.
            </Text>
          ) : chartOption ? (
            <ReactECharts
              option={chartOption}
              style={{ height: 300, width: '100%' }}
              aria-label="Sales and profitability trend chart"
            />
          ) : null}
        </WidgetCard>
      )}
    </QueryBoundary>
  )
}

interface MetricChipProps {
  label: string
  value?: number | null
  delta?: number | null
  deltaPct?: number | null
  tone?: 'positive' | 'negative' | 'attention' | 'neutral'
}

const MetricChip: React.FC<MetricChipProps> = ({
  label,
  value,
  delta,
  deltaPct,
  tone = 'neutral',
}) => {
  if (isMoneyNull(value)) return null
  const accentKey =
    label === 'Net Profit' ? 'netProfit' : label === 'Gross Profit' ? 'grossProfit' : 'sales'
  return (
    <div style={{ textAlign: 'right' }}>
      <Text
        style={{
          display: 'block',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          color: '#94a3b8',
        }}
      >
        {label}
      </Text>
      <span
        style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 700,
          color: KPI_ACCENTS[accentKey] ?? '#2563eb',
        }}
      >
        {formatCompactINR(value) ?? ''}
      </span>
      {delta !== null && delta !== undefined && (
        <StatDelta delta={delta} deltaPct={deltaPct} tone={tone} />
      )}
    </div>
  )
}