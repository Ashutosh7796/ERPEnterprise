import React from 'react'
import { Tooltip } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { formatCompactINR, formatINRFixed, isMoneyNull } from '../../utils/format'

export type AmountTone = 'default' | 'positive' | 'negative' | 'attention' | 'muted'

const TONE_COLORS: Record<AmountTone, string | undefined> = {
  default: undefined,
  positive: '#16a34a',
  negative: '#dc2626',
  attention: '#d97706',
  muted: undefined,
}

interface CurrencyValueProps {
  value?: number | null
  masked?: boolean
  compact?: boolean
  tone?: AmountTone
  maskLabel?: string
  fontSize?: number | string
  fontWeight?: number
  ariaLabel?: string
}

export const CurrencyValue: React.FC<CurrencyValueProps> = ({
  value,
  masked = false,
  compact = true,
  tone = 'default',
  maskLabel = 'Restricted',
  fontSize,
  fontWeight,
  ariaLabel,
}) => {
  const color = TONE_COLORS[tone]

  if (masked) {
    return (
      <Tooltip title={maskLabel}>
        <span
          style={{ color: '#9ca3af', letterSpacing: 1.5, fontSize, fontWeight }}
          aria-label="Restricted"
        >
          <LockOutlined style={{ marginRight: 4, fontSize: '0.75em' }} />
          ••••
        </span>
      </Tooltip>
    )
  }

  if (isMoneyNull(value)) {
    return (
      <span style={{ color: '#9ca3af', fontSize, fontWeight }} aria-label="No data">
        –
      </span>
    )
  }

  const text = compact ? formatCompactINR(value) ?? '' : formatINRFixed(value) ?? ''
  return (
    <span
      style={{ color, fontSize, fontWeight, fontVariantNumeric: 'tabular-nums' }}
      aria-label={ariaLabel ?? (typeof value === 'number' ? String(value) : undefined)}
    >
      {text}
    </span>
  )
}