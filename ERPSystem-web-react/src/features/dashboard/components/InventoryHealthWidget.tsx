import React from 'react'
import { Badge, Typography } from 'antd'
import { BoxPlotOutlined, WarningOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardPosition } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue } from './primitives/CurrencyValue'
import { QueryBoundary } from '../QueryBoundary'
import { formatQuantity } from '../utils/format'

const { Text } = Typography

interface InventoryHealthWidgetProps {
  range: DashboardDateRange
}

export const InventoryHealthWidget: React.FC<InventoryHealthWidgetProps> = ({ range }) => {
  const positionQuery = useDashboardPosition(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={positionQuery}
      isEmpty={(data) => !data.inventory}
      emptyText="No inventory data available."
      skeletonLines={9}
    >
      {(position) => {
        const inv = position.inventory
        return (
          <WidgetCard
            title="Inventory"
            icon={<BoxPlotOutlined style={{ color: '#166534' }} />}
            bodyPadding={16}
            footer={inv.note}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
              {/* 1. Header & Metrics Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 2 }}>
                    Stock value
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                    <CurrencyValue value={inv.value} masked={inv.valueMasked} maskLabel="Stock value restricted for current role." compact />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                    Total stock: {formatQuantity(inv.totalStock)} units
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/report/stock_warning_report')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate('/report/stock_warning_report')
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: inv.lowStockCount > 0 ? '#fffbeb' : '#f8fafc',
                      border: '1px solid ' + (inv.lowStockCount > 0 ? '#fde68a' : '#e2e8f0'),
                      cursor: 'pointer',
                    }}
                    aria-label="Stock warnings"
                  >
                    <WarningOutlined style={{ fontSize: 12, color: inv.lowStockCount > 0 ? '#d97706' : '#94a3b8' }} />
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: inv.lowStockCount > 0 ? '#b45309' : '#64748b' }}>
                      Low stock
                    </span>
                    <span
                      style={{
                        background: inv.lowStockCount > 0 ? '#d97706' : '#cbd5e1',
                        color: '#ffffff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        borderRadius: 10,
                        padding: '0 5px',
                        lineHeight: '16px',
                        minWidth: 16,
                        textAlign: 'center',
                      }}
                    >
                      {inv.lowStockCount}
                    </span>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/report/stock_warning_report')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate('/report/stock_warning_report')
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: inv.outOfStockCount > 0 ? '#fef2f2' : '#f8fafc',
                      border: '1px solid ' + (inv.outOfStockCount > 0 ? '#fecaca' : '#e2e8f0'),
                      cursor: 'pointer',
                    }}
                    aria-label="Out of stock"
                  >
                    <WarningOutlined style={{ fontSize: 12, color: inv.outOfStockCount > 0 ? '#dc2626' : '#94a3b8' }} />
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: inv.outOfStockCount > 0 ? '#b91c1c' : '#64748b' }}>
                      Out of stock
                    </span>
                    <span
                      style={{
                        background: inv.outOfStockCount > 0 ? '#dc2626' : '#cbd5e1',
                        color: '#ffffff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        borderRadius: 10,
                        padding: '0 5px',
                        lineHeight: '16px',
                        minWidth: 16,
                        textAlign: 'center',
                      }}
                    >
                      {inv.outOfStockCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Top Movers Table List */}
              {inv.topMovers && inv.topMovers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 6 }}>
                    Top movers (sales)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {inv.topMovers.map((mover) => (
                      <div
                        key={mover.materialId ?? mover.materialName ?? 'mover'}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 75px 85px',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 6px',
                          borderRadius: 4,
                          background: '#f8fafc',
                        }}
                      >
                        <span
                          title={mover.materialName ?? ''}
                          style={{
                            fontSize: 12,
                            color: '#334155',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {mover.materialName ?? `Material #${mover.materialId ?? ''}`}
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatQuantity(mover.quantity)} sold
                        </span>
                        <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          <CurrencyValue
                            value={mover.amount}
                            masked={inv.valueMasked}
                            compact
                            fontSize={12}
                            fontWeight={700}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Action Link pinned to bottom */}
              <div
                role="link"
                tabIndex={0}
                aria-label="Open stock report"
                onClick={() => navigate('/report/stock')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate('/report/stock')
                  }
                }}
                style={{
                  marginTop: 'auto',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#166534',
                  cursor: 'pointer',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingTop: 8,
                }}
              >
                Stock report →
              </div>
            </div>
          </WidgetCard>
        )
      }}
    </QueryBoundary>
  )
}