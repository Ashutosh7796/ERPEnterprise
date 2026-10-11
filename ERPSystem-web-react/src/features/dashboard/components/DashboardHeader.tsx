import React from 'react'
import { Button, Card, Skeleton, Space, Tag, Typography } from 'antd'
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useDashboardContext } from '../api/dashboardApi'
import { formatDateOnly } from '../utils/format'

const { Title, Text } = Typography

interface DashboardHeaderProps {
  greetingName: string
  tenantLabel: string
  periodLabel: string
  refreshing: boolean
  onRefresh: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  greetingName,
  tenantLabel,
  periodLabel,
  refreshing,
  onRefresh,
}) => {
  const contextQuery = useDashboardContext()
  const displayTenantLabel =
    !tenantLabel || tenantLabel.startsWith('Tenant #') ? 'Company Workspace' : tenantLabel

  return (
    <Card styles={{ body: { padding: '18px 22px' } }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#94a3b8',
            }}
          >
            Operations Dashboard
          </Text>
          <Title level={4} style={{ margin: '2px 0 4px 0', fontWeight: 700 }}>
            Welcome back, {greetingName}
          </Title>
          <Space size={8} wrap>
            <Text style={{ fontSize: 12, color: '#64748b' }}>{displayTenantLabel}</Text>
            {contextQuery.data?.fiscalYearLabel && (
              <Tag style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>{contextQuery.data.fiscalYearLabel}</Tag>
            )}
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>{periodLabel}</Text>
            {contextQuery.data?.today && (
              <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatDateOnly(contextQuery.data.today)}
              </Text>
            )}
          </Space>
        </div>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh} size="middle">
          Refresh
        </Button>
      </div>
      {contextQuery.isPending && (
        <Skeleton active title={false} paragraph={{ rows: 1 }} style={{ marginTop: 8 }} />
      )}
    </Card>
  )
}