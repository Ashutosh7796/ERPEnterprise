import React from 'react'
import { Card, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined, RightOutlined } from '@ant-design/icons'
import type { DashboardKpi } from '../../api/dashboardTypes'
import { KPI_ACCENTS, kpiDeltaTone } from '../../utils/semantics'
import { formatCompactINR, isMoneyNull } from '../../utils/format'
import { Sparkline } from './Sparkline'
import { StatDelta } from './StatDelta'
import { deltaTooltip } from '../../utils/format'

const { Text } = Typography

interface KpiCardProps {
  kpi: DashboardKpi
  onNavigate?: (link: string) => void
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, onNavigate }) => {
  const accent = KPI_ACCENTS[kpi.key] ?? '#2563eb'
  const tone = kpiDeltaTone(kpi.key, kpi.delta)

  const canShowDelta = !kpi.masked && kpi.value !== null && kpi.hasComparison && kpi.delta !== null
  const canShowSparkline = !kpi.masked && kpi.sparkline && kpi.sparkline.length >= 2

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 142 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#94a3b8',
            }}
          >
            {kpi.label}
          </Text>
          {kpi.note && (
            <Tooltip title={kpi.note}>
              <InfoCircleOutlined style={{ fontSize: 11, color: '#cbd5e1' }} aria-label={`About ${kpi.label}`} />
            </Tooltip>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            {kpi.masked ? (
              <CurrencyValueMasked title={kpi.note} />
            ) : isMoneyNull(kpi.value) ? (
              <span style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8' }}>
                No data
              </span>
            ) : (
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactINR(kpi.value) ?? ''}
              </span>
            )}
            <div style={{ marginTop: 4 }}>
              <Tooltip title={canShowDelta ? deltaTooltip(kpi.delta, kpi.prevValue) : undefined}>
                {canShowDelta && <StatDelta delta={kpi.delta} deltaPct={kpi.deltaPct} tone={tone} label="vs prior" />}
              </Tooltip>
            </div>
          </div>
          {canShowSparkline && (
            <Sparkline
              data={kpi.sparkline}
              labels={kpi.sparklineLabels}
              color={accent}
              ariaLabel={`${kpi.label} trend`}
            />
          )}
        </div>

        <Text style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{kpi.sublabel}</Text>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
        {kpi.link ? (
          <div
            role="link"
            tabIndex={0}
            aria-label={`Open ${kpi.label}`}
            onClick={() => onNavigate?.(kpi.link)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigate?.(kpi.link)
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: accent,
              cursor: 'pointer',
              width: 'fit-content',
            }}
          >
            Open <RightOutlined style={{ fontSize: 9 }} />
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Detailed view not available</span>
        )}
      </div>
    </div>
  )

  return (
    <Card size="small" styles={{ body: { padding: '14px 16px', height: '100%', minHeight: 172 } }} style={{ height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: kpi.masked ? '#e2e8f0' : accent,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
      {body}
    </Card>
  )
}

const CurrencyValueMasked: React.FC<{ title?: string }> = ({ title }) => (
  <Tooltip title={title ?? 'Restricted for the current role'}>
    <span style={{ fontSize: 20, fontWeight: 700, color: '#9ca3af', letterSpacing: 1.5 }} aria-label="Restricted">
      ••••••
    </span>
  </Tooltip>
)