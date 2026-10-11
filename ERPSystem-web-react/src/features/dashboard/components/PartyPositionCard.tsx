import React from 'react'
import { Tag, Tooltip, Typography } from 'antd'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { AgingBucket, PartyOutstanding } from '../api/dashboardTypes'
import { CurrencyValue } from './primitives/CurrencyValue'
import { formatCompactINR, formatCount } from '../utils/format'
import { isNonZeroValue } from '../utils/semantics'

const { Text } = Typography

interface PartyPositionCardProps {
  accent: string
  total?: number | null
  opening?: number | null
  partyCount: number
  aging: AgingBucket[]
  topParties: PartyOutstanding[]
  note: string
  route: string
  routeLabel: string
}

export const PartyPositionCard: React.FC<PartyPositionCardProps> = ({
  accent,
  total,
  opening,
  partyCount,
  aging,
  topParties,
  note,
  route,
  routeLabel,
}) => {
  const navigate = useNavigate()
  const maxBucket = aging.reduce((max, b) => Math.max(max, b.amount), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
      {/* 1. Metric Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 2 }}>
            Outstanding
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {formatCompactINR(total) ?? '₹0.00'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
            Opening balance: {formatCompactINR(opening) ?? '₹0.00'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: 11.5,
              fontWeight: 500,
              color: '#475569',
            }}
          >
            {partyCount} {partyCount === 1 ? 'party' : 'parties'}
          </div>
        </div>
      </div>

      {/* 2. Ageing Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Ageing</span>
            <Tag color="cyan" style={{ margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '18px' }}>
              Estimate
            </Tag>
            <Tooltip title={note}>
              <InfoCircleOutlined style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }} aria-label="About ageing estimate" />
            </Tooltip>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aging.length === 0 || !isNonZeroValue(maxBucket) ? (
            <div
              style={{
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 6,
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 15 }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                All accounts current — no overdue ageing balances.
              </span>
            </div>
          ) : (
            aging.map((bucket) => {
              const pct = maxBucket > 0 ? (bucket.amount / maxBucket) * 100 : 0
              const isLongOverdue = bucket.bucket === '90+'
              return (
                <div key={bucket.bucket}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>
                      {bucket.bucket === '0-30' ? '0–30 days' : bucket.bucket === '31-60' ? '31–60 days' : bucket.bucket === '61-90' ? '61–90 days' : '90+ days'}
                    </span>
                    <span style={{ color: isLongOverdue ? '#dc2626' : '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCompactINR(bucket.amount)}
                      <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6, fontSize: 10.5 }}>
                        {formatCount(bucket.partyCount)} parties
                      </span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(2, Math.min(100, pct)).toFixed(1)}%`,
                        background: isLongOverdue ? '#dc2626' : accent,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 3. Top Parties (if any) */}
      {topParties.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 6 }}>
            Top parties
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topParties.map((party) => (
              <div
                key={party.partyId ?? party.partyName ?? 'row'}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: '#f8fafc',
                }}
              >
                <Text style={{ fontSize: 12, color: '#334155', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {party.partyName ?? `Party #${party.partyId ?? ''}`}
                </Text>
                <CurrencyValue value={party.outstanding} compact fontSize={12} fontWeight={600} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Action Link pinned to bottom */}
      <div
        role="link"
        tabIndex={0}
        aria-label={routeLabel}
        onClick={() => navigate(route)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(route)
          }
        }}
        style={{
          marginTop: 'auto',
          fontSize: 11.5,
          fontWeight: 600,
          color: accent,
          cursor: 'pointer',
          width: 'fit-content',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          paddingTop: 8,
        }}
      >
        {routeLabel} →
      </div>
    </div>
  )
}