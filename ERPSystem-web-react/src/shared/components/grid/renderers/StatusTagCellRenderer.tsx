import React from 'react'
import { Tag } from 'antd'
import type { CustomCellRendererProps } from '../types'

export interface StatusTagCellRendererParams extends CustomCellRendererProps {
  statusMap?: Record<string, { label: string; color: string }>
}

const defaultStatusMap: Record<string, { label: string; color: string }> = {
  '0': { label: 'Pending Approval', color: 'gold' },
  '1': { label: 'Approved', color: 'green' },
  '2': { label: 'Rejected', color: 'red' },
  '3': { label: 'Partial', color: 'blue' },
  '9': { label: 'Under Review', color: 'orange' },
}

export const StatusTagCellRenderer: React.FC<StatusTagCellRendererParams> = ({
  value,
  statusMap = defaultStatusMap,
}) => {
  const strVal = String(value ?? '')
  const config = statusMap[strVal]

  if (config) {
    return <Tag color={config.color}>{config.label}</Tag>
  }

  if (strVal === 'true' || strVal === '1') {
    return <Tag color="green">Active</Tag>
  }
  if (strVal === 'false' || strVal === '0') {
    return <Tag color="red">Disabled</Tag>
  }

  return <Tag>{strVal || '-'}</Tag>
}
