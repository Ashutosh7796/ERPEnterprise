import React from 'react'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'
import type { DeltaTone } from '../../utils/semantics'
import { formatCurrencyDelta, formatPercent, isMoneyNull } from '../../utils/format'

const TONE_COLORS: Record<DeltaTone, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  attention: '#d97706',
  neutral: '#64748b',
}

interface StatDeltaProps {
  delta?: number | null
  deltaPct?: number | null
  tone?: DeltaTone
  label?: string
}

export const StatDelta: React.FC<StatDeltaProps> = ({ delta, deltaPct, tone = 'neutral', label }) => {
  if (isMoneyNull(delta)) {
    return (
      <span style={{ fontSize: 11, color: '#9ca3af' }}>
        No prior-period data
      </span>
    )
  }

  const value = Number(delta)
  const deltaText = formatCurrencyDelta(value) ?? ''
  const pctText = formatPercent(deltaPct)

  const ArrowIcon = value > 0 ? ArrowUpOutlined : value < 0 ? ArrowDownOutlined : MinusOutlined
  const color = TONE_COLORS[tone]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11.5,
        fontWeight: 600,
        color,
      }}
    >
      <ArrowIcon style={{ fontSize: 10 }} />
      {deltaText}
      {pctText && <span style={{ color: '#94a3b8', fontWeight: 500 }}>{pctText}</span>}
      {label && <span style={{ color: '#94a3b8', fontWeight: 400 }}>{label}</span>}
    </span>
  )
}