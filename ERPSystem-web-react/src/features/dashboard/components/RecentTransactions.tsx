import React from 'react'
import { Button, Tag, Typography } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardActivity } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue } from './primitives/CurrencyValue'
import { QueryBoundary } from '../QueryBoundary'
import { formatDateOnly, formatDocumentSubType } from '../utils/format'
import { RECENT_KIND_META } from '../utils/semantics'

const { Text } = Typography

interface RecentTransactionsProps {
  range: DashboardDateRange
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ range }) => {
  const activityQuery = useDashboardActivity(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={activityQuery}
      isEmpty={(data) => (data.recent ?? []).length === 0}
      emptyText="No recent transactions in this period."
      skeletonLines={8}
    >
      {(activity) => (
        <WidgetCard
          title="Recent Transactions"
          icon={<FileTextOutlined style={{ color: '#2563eb' }} />}
          bodyPadding={10}
          footer="Closing amount for receipts/payments is masked for roles without finance visibility."
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activity.recent.map((tx, index) => {
              const meta = RECENT_KIND_META[tx.kind] ?? RECENT_KIND_META.INVOICE
              const isPosted = tx.status && tx.status !== '0' && tx.status !== '3' && tx.status !== '4'
              const statusLabel = isPosted ? 'Posted' : 'Draft'
              return (
                <div
                  key={`${tx.kind}-${tx.refNo}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 2px',
                    borderBottom: index < activity.recent.length - 1 ? '1px solid rgba(148, 163, 184, 0.14)' : 'none',
                  }}
                >
                  <Tag
                    style={{
                      margin: 0,
                      minWidth: 64,
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: 9.5,
                      color: meta.color,
                      background: meta.bg,
                      border: 'none',
                    }}
                  >
                    {meta.label}
                  </Tag>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {tx.route ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => navigate(tx.route ?? '/dashboard')}
                          style={{
                            padding: 0,
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                            fontSize: 11.5,
                            color: '#2563eb',
                          }}
                        >
                          {tx.refNo ?? '–'}
                        </Button>
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {tx.refNo ?? '–'}
                        </Text>
                      )}
                      {tx.subType && <Text style={{ fontSize: 10.5, color: '#94a3b8' }}>{formatDocumentSubType(tx.subType)}</Text>}
                    </div>
                    <Text style={{ fontSize: 11.5, color: '#475569', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.partyName ?? '—'}
                    </Text>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <Text style={{ fontSize: 11, color: '#94a3b8', width: 92, textAlign: 'right' }}>
                      {formatDateOnly(tx.date)}
                    </Text>
                    <span style={{ width: 56, textAlign: 'center' }}>
                      <Tag
                        style={{ margin: 0, fontSize: 9.5, fontWeight: 600, border: 'none' }}
                        color={isPosted ? 'green' : 'orange'}
                      >
                        {statusLabel}
                      </Tag>
                    </span>
                    <span style={{ width: 116, textAlign: 'right' }}>
                      <CurrencyValue value={tx.amount} compact={false} fontSize={12} fontWeight={700} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </WidgetCard>
      )}
    </QueryBoundary>
  )
}