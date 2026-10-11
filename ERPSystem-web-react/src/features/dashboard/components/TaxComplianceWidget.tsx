import React from 'react'
import { Tag, Tooltip, Typography } from 'antd'
import { SafetyCertificateOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardPosition } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { CurrencyValue } from './primitives/CurrencyValue'
import { QueryBoundary } from '../QueryBoundary'
import { gstPeriodLabel } from '../utils/format'

const { Text } = Typography

interface TaxComplianceWidgetProps {
  range: DashboardDateRange
}

interface TaxStatRowProps {
  label: string
  value?: number | null
  emphasized?: boolean
  isZeroCash?: boolean
  tone?: 'default' | 'positive' | 'negative' | 'attention'
  tooltip?: string
}

const TaxStatRow: React.FC<TaxStatRowProps> = ({
  label,
  value,
  emphasized = false,
  isZeroCash = false,
  tone = 'default',
  tooltip,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: emphasized ? '9px 10px' : '7px 4px',
      borderRadius: emphasized ? 6 : 0,
      background: emphasized ? (isZeroCash ? '#f0fdf4' : '#eff6ff') : 'transparent',
      border: emphasized ? (isZeroCash ? '1px solid #bbf7d0' : '1px solid #dbeafe') : 'none',
      borderBottom: emphasized ? undefined : '1px solid #f1f5f9',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Text
        style={{
          fontSize: 12.5,
          color: emphasized ? (isZeroCash ? '#15803d' : '#1d4ed8') : '#475569',
          fontWeight: emphasized ? 600 : 400,
        }}
      >
        {label}
      </Text>
      {tooltip && (
        <Tooltip title={tooltip}>
          <InfoCircleOutlined style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }} aria-label={label} />
        </Tooltip>
      )}
    </div>
    <CurrencyValue
      value={value}
      compact
      fontSize={emphasized ? 14 : 13}
      fontWeight={emphasized ? 800 : 600}
      tone={tone}
    />
  </div>
)

export const TaxComplianceWidget: React.FC<TaxComplianceWidgetProps> = ({ range }) => {
  const positionQuery = useDashboardPosition(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={positionQuery}
      isEmpty={(data) => !data.gst}
      emptyText="No tax compliance data available for this period."
      skeletonLines={7}
    >
      {(position) => {
        const gst = position.gst
        const isZeroCash =
          gst.cashPayable !== null && gst.cashPayable !== undefined && Number(gst.cashPayable) === 0
        const hasPayable =
          gst.cashPayable !== null && gst.cashPayable !== undefined && Number(gst.cashPayable) > 0

        return (
          <WidgetCard
            title="Tax & Compliance"
            icon={<SafetyCertificateOutlined style={{ color: '#2563eb' }} />}
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag color="geekblue" style={{ margin: 0, fontSize: 10.5, fontWeight: 600 }}>
                  {gstPeriodLabel(gst.returnPeriod)}
                </Tag>
                <Tag
                  color={gst.computed ? 'green' : 'default'}
                  style={{ margin: 0, fontSize: 10.5 }}
                >
                  {gst.computed ? 'Computed' : 'Unavailable'}
                </Tag>
              </div>
            }
            bodyPadding={16}
            footer="Source: GSTR-3B computation engine (Section 49 statutory tax payment & credit offsetting)."
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              {gst.computed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TaxStatRow
                    label="Output GST Liability"
                    value={gst.outputTax}
                    tooltip="Table 3.1 outward taxable supplies gross tax liability"
                  />
                  <TaxStatRow
                    label="Eligible Input Tax Credit"
                    value={gst.itcAvailable}
                    tooltip="Table 4(C) net eligible ITC available from purchase transactions"
                  />
                  <TaxStatRow
                    label="Net GST Payable"
                    value={gst.cashPayable}
                    emphasized
                    isZeroCash={isZeroCash}
                    tone={isZeroCash ? 'positive' : hasPayable ? 'attention' : 'default'}
                    tooltip="Electronic Cash Ledger payment required after Section 49 credit offsetting"
                  />
                  <TaxStatRow
                    label="Closing ITC Balance"
                    value={gst.closingItc}
                    tooltip="Credit balance available at the end of the selected period in Electronic Credit Ledger"
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: '20px 14px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 6,
                    border: '1px dashed #e2e8f0',
                    margin: '6px 0',
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                    Tax computation pending for {gstPeriodLabel(gst.returnPeriod)}
                  </Text>
                </div>
              )}

              {/* Action Link pinned to bottom */}
              <div
                role="link"
                tabIndex={0}
                aria-label="Open GSTR-3B Return"
                onClick={() => navigate('/gst/gstr3b')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate('/gst/gstr3b')
                  }
                }}
                style={{
                  marginTop: 'auto',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingTop: 8,
                }}
              >
                Open GSTR-3B Return →
              </div>
            </div>
          </WidgetCard>
        )
      }}
    </QueryBoundary>
  )
}
