import React from 'react'
import { Button, Tag, Tooltip, Typography } from 'antd'
import { AlertOutlined, CheckCircleOutlined, InfoCircleOutlined, RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardActivity } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue } from './primitives/CurrencyValue'
import { QueryBoundary } from '../QueryBoundary'
import { formatCount } from '../utils/format'
import { SEVERITY_META } from '../utils/semantics'

const { Text } = Typography

interface ActionCenterProps {
  range: DashboardDateRange
}

export const ActionCenter: React.FC<ActionCenterProps> = ({ range }) => {
  const activityQuery = useDashboardActivity(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={activityQuery}
      skeletonLines={6}
    >
      {(activity) => {
        const actions = activity?.actions ?? []

        return (
          <WidgetCard
            title="Action Center"
            icon={<AlertOutlined style={{ color: '#d97706' }} />}
            bodyPadding={16}
            footer="Actions are derived from live ERP conditions (overdue balances, stock risks, open drafts)."
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
              {actions.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    background: '#f8fafc',
                    borderRadius: 6,
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: 'auto 0',
                  }}
                >
                  <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 20, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                      All workflows up to date
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                      No pending exceptions, stockouts, or overdue approvals.
                    </div>
                  </div>
                </div>
              ) : (
                actions.map((action, index) => {
                  const meta = SEVERITY_META[action.severity] ?? SEVERITY_META.info
                  return (
                    <div
                      key={`${action.category}-${action.title}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <Tag
                        color={meta.color}
                        style={{
                          margin: 0,
                          minWidth: 54,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: 10,
                          padding: '0 4px',
                          lineHeight: '18px',
                        }}
                      >
                        {meta.label}
                      </Tag>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {action.title}
                          </span>
                          {action.note && (
                            <Tooltip title={action.note}>
                              <InfoCircleOutlined style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }} aria-label={`About ${action.title}`} />
                            </Tooltip>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {action.count > 0 ? `${formatCount(action.count)} · ` : ''}
                          {action.description}
                        </div>
                      </div>
                      <CurrencyValue
                        value={action.amount}
                        masked={action.amountMasked}
                        compact
                        fontSize={12}
                        fontWeight={700}
                      />
                      {action.route && (
                        <Button
                          type="link"
                          size="small"
                          icon={<RightOutlined style={{ fontSize: 10 }} />}
                          iconPosition="end"
                          onClick={() => navigate(action.route ?? '/dashboard')}
                          aria-label={`Open ${action.title}`}
                          style={{
                            color: meta.color,
                            fontWeight: 600,
                            flexShrink: 0,
                            padding: '0 4px',
                            fontSize: 11.5,
                          }}
                        >
                          Open
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </WidgetCard>
        )
      }}
    </QueryBoundary>
  )
}