import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { FileTextOutlined, LockOutlined, PieChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardFinancial } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue } from './primitives/CurrencyValue'
import { StatDelta } from './primitives/StatDelta'
import { QueryBoundary } from '../QueryBoundary'
import { formatCompactINR, isMoneyNull } from '../utils/format'

const { Text } = Typography

interface ExpenseWidgetProps {
  range: DashboardDateRange
}

export const ExpenseWidget: React.FC<ExpenseWidgetProps> = ({ range }) => {
  const financialQuery = useDashboardFinancial(range)
  const navigate = useNavigate()

  const categories = useMemo(() => {
    const source = financialQuery.data?.expenseCategories ?? []
    return [...source].sort((a, b) => b.amount - a.amount).slice(0, 8)
  }, [financialQuery.data])

  const maxAmount = categories.reduce((max, c) => Math.max(max, c.amount), 0)

  const deltaTone: 'positive' | 'negative' | 'attention' | 'neutral' = (() => {
    const cur = financialQuery.data?.expensesTotal ?? 0
    const prev = financialQuery.data?.expensesPrevTotal
    if (prev === null || prev === undefined) return 'neutral'
    return Number(cur) > Number(prev) ? 'negative' : Number(cur) < Number(prev) ? 'positive' : 'neutral'
  })()

  return (
    <QueryBoundary
      query={financialQuery}
      skeletonLines={7}
    >
      {(financial) => {
        if (!financial.financeVisible) {
          return (
            <WidgetCard title="Expenses" icon={<PieChartOutlined style={{ color: '#ea580c' }} />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0' }}>
                <LockOutlined style={{ color: '#94a3b8', fontSize: 16 }} />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Expense figures are restricted for the current role.
                </Text>
              </div>
            </WidgetCard>
          )
        }

        return (
          <WidgetCard
            title="Expenses"
            icon={<PieChartOutlined style={{ color: '#ea580c' }} />}
            extra={
              <div style={{ textAlign: 'right' }}>
                <CurrencyValue value={financial.expensesTotal} compact fontSize={15} fontWeight={800} />
                {!isMoneyNull(financial.expensesPrevTotal) && (
                  <div style={{ marginTop: 2 }}>
                    <StatDelta
                      delta={
                        financial.expensesTotal === null || financial.expensesTotal === undefined || financial.expensesPrevTotal === null || financial.expensesPrevTotal === undefined
                          ? null
                          : Number(financial.expensesTotal) - Number(financial.expensesPrevTotal)
                      }
                      tone={deltaTone}
                      label="vs prior"
                    />
                  </div>
                )}
              </div>
            }
            footer="Source: general ledger expense accounts (4xxx, excluding COGS)."
            bodyPadding={16}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              {categories.length === 0 ? (
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
                  <FileTextOutlined style={{ color: '#0891b2', fontSize: 20, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                      No operational expenses
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                      No non-COGS overhead expenses recorded for this period.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categories.map((category) => {
                    const pct = maxAmount > 0 ? (category.amount / maxAmount) * 100 : 0
                    return (
                      <div key={category.accountCode}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                          <span style={{ color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                            {category.accountName || category.accountCode}
                          </span>
                          <span style={{ color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {formatCompactINR(category.amount)}
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(2, Math.min(100, pct)).toFixed(1)}%`,
                              background: '#ea580c',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Action Link pinned to bottom */}
              <div
                role="link"
                tabIndex={0}
                aria-label="Open Profit & Loss"
                onClick={() => navigate('/financial/reports/profit_loss')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate('/financial/reports/profit_loss')
                  }
                }}
                style={{
                  marginTop: 'auto',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#ea580c',
                  cursor: 'pointer',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingTop: 8,
                }}
              >
                Profit & Loss report →
              </div>
            </div>
          </WidgetCard>
        )
      }}
    </QueryBoundary>
  )
}