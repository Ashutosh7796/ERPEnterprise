import React from 'react'
import { Col, Row } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardSummary } from '../api/dashboardApi'
import { KpiCard } from './primitives/KpiCard'
import { QueryBoundary } from '../QueryBoundary'

interface ExecutiveKpiGridProps {
  range: DashboardDateRange
}

export const ExecutiveKpiGrid: React.FC<ExecutiveKpiGridProps> = ({ range }) => {
  const summaryQuery = useDashboardSummary(range)
  const navigate = useNavigate()

  return (
    <QueryBoundary
      query={summaryQuery}
      isEmpty={(data) => !data.kpis || data.kpis.length === 0}
      emptyText="No key metrics available for this period."
      skeletonLines={6}
    >
      {(summary) => (
        <Row gutter={[16, 16]}>
          {summary.kpis.map((kpi) => (
            <Col key={kpi.key} xs={24} sm={12} lg={6} xl={6}>
              <KpiCard kpi={kpi} onNavigate={(link) => navigate(link)} />
            </Col>
          ))}
        </Row>
      )}
    </QueryBoundary>
  )
}