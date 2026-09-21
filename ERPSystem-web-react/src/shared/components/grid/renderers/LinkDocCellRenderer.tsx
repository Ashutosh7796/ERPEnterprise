import React from 'react'
import { Tag } from 'antd'
import type { CustomCellRendererProps } from '../types'

export interface LinkDocCellRendererParams extends CustomCellRendererProps {
  onClick?: (data: any) => void
  color?: string
}

export const LinkDocCellRenderer: React.FC<LinkDocCellRendererParams> = ({
  value,
  data,
  onClick,
  color = 'cyan',
}) => {
  if (!value) {
    return <span style={{ color: '#bfbfbf' }}>-</span>
  }

  return (
    <Tag
      color={color}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={() => onClick?.(data)}
    >
      {String(value)}
    </Tag>
  )
}
