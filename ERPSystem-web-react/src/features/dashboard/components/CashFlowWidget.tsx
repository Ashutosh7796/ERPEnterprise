import React from 'react'
import { Tag, Tooltip, Typography } from 'antd'
import { BankOutlined, InfoCircleOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardFinancial } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue, type AmountTone } from './primitives/CurrencyValue'
import { QueryBoundary } from '../QueryBoundary'
import { isMoneyNull } from '../utils/format'

const { Text } = Typography

interface CashFlowWidgetProps {
  range: DashboardDateRange
}

interface CashRow {
  label: string
  field: 'opening' | 'operating' | 'investing' | 'financing' | 'net'
}

const ROWS: CashRow[] = [
  { label: 'Opening balance', field: 'opening' },
  { label: 'Operating cash flow', field: 'operating' },
  { label: 'Investing cash flow', field: 'investing' },
  { label: 'Financing cash flow', field: 'financing' },
  { label: 'Net change', field: 'net' },
]

function toneFor(field: CashRow['field'], value: number | null | undefined): AmountTone {
  if (isMoneyNull(value)) return 'default'
  if (field === 'net') return Number(value) >= 0 ? 'positive' : 'negative'
  if (field === 'operating') return Number(value) > 0 ? 'positive' : Number(value) < 0 ? 'negative' : 'default'
  return 'default'
}

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({ range }) => {
  const financialQuery = useDashboardFinancial(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={financialQuery}
      isEmpty={(data) => data.financeVisible && (!data.cash || isMoneyNull(data.cash.closing))}
      emptyText="No cash flow data for this period."
      skeletonLines={7}
    >
      {(financial) => {
        if (!financial.financeVisible) {
          return (
            <WidgetCard title="Cash Flow" icon={<BankOutlined style={{ color: '#0891b2' }} />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0' }}>
                <LockOutlined style={{ color: '#94a3b8', fontSize: 16 }} />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Cash flow figures are restricted for the current role.
                </Text>
              </div>
            </WidgetCard>
          )
        }

        const cash = financial.cash
        return (
          <WidgetCard
            title="Cash Flow"
            icon={<BankOutlined style={{ color: '#0891b2' }} />}
            bodyPadding={16}
            extra={
              cash.reconciled ? (
                <Tag color="green" style={{ margin: 0, fontSize: 10.5 }}>
                  Reconciled
                </Tag>
              ) : (
                <Tag color="orange" style={{ margin: 0, fontSize: 10.5 }}>
                  Discrepancy
                </Tag>
              )
            }
            footer={
              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5 }}>
                {cash.note && (
                  <Tooltip title={cash.note}>
                    <InfoCircleOutlined style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }} />
                  </Tooltip>
                )}
                Closing = opening + operating + investing + financing (Cash Flow Statement, direct method).
              </span>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ROWS.map((row) => (
                  <div
                    key={row.field}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 4px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, color: '#475569' }}>{row.label}</Text>
                    <CurrencyValue
                      value={cash[row.field]}
                      compact
                      tone={toneFor(row.field, cash[row.field])}
                      fontSize={13}
                      fontWeight={row.field === 'net' ? 700 : 500}
                    />
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 10px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Closing cash & bank</Text>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    <CurrencyValue value={cash.closing} compact tone="default" fontWeight={800} />
                  </span>
                </div>
              </div>

              {/* Action link pinned to bottom */}
              <div
                role="link"
                tabIndex={0}
                aria-label="Open accounts"
                onClick={() => navigate('/financial/accounts')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate('/financial/accounts')
                  }
                }}
                style={{
                  marginTop: 'auto',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#0891b2',
                  cursor: 'pointer',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingTop: 8,
                }}
              >
                View accounts →
              </div>
            </div>
          </WidgetCard>
        )
      }}
    </QueryBoundary>
  )
}