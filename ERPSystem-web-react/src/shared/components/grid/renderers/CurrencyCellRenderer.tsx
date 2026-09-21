import React from 'react'
import type { CustomCellRendererProps } from '../types'

export interface CurrencyCellRendererParams extends CustomCellRendererProps {
  prefix?: string
  decimals?: number
  colorizeDebt?: boolean
}

export const CurrencyCellRenderer: React.FC<CurrencyCellRendererParams> = ({
  value,
  prefix = '₹',
  decimals = 2,
  colorizeDebt = false,
}) => {
  if (value === undefined || value === null || value === '') {
    return <span style={{ color: '#bfbfbf' }}>-</span>
  }

  const num = Number(value)
  if (isNaN(num)) {
    return <span>{String(value)}</span>
  }

  const formatted = `${prefix}${num.toFixed(decimals)}`

  if (colorizeDebt) {
    return (
      <span style={{ color: num > 0 ? '#fa8c16' : '#52c41a', fontWeight: 500 }}>
        {formatted}
      </span>
    )
  }

  return <span>{formatted}</span>
}
