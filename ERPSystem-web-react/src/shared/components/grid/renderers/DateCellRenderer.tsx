import React from 'react'
import dayjs from 'dayjs'
import type { CustomCellRendererProps } from '../types'

export interface DateCellRendererParams extends CustomCellRendererProps {
  format?: string
}

export const DateCellRenderer: React.FC<DateCellRendererParams> = ({
  value,
  format = 'YYYY-MM-DD HH:mm:ss',
}) => {
  if (!value) {
    return <span style={{ color: '#bfbfbf' }}>-</span>
  }

  try {
    const d = dayjs(value)
    if (d.isValid()) {
      return <span>{d.format(format)}</span>
    }
  } catch {
    // fallback to string
  }

  return <span>{String(value)}</span>
}
