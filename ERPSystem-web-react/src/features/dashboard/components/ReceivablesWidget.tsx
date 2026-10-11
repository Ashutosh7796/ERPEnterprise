import React from 'react'
import { TeamOutlined } from '@ant-design/icons'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardPosition } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { PartyPositionCard } from './PartyPositionCard'
import { QueryBoundary } from '../QueryBoundary'

interface ReceivablesWidgetProps {
  range: DashboardDateRange
}

export const ReceivablesWidget: React.FC<ReceivablesWidgetProps> = ({ range }) => {
  const positionQuery = useDashboardPosition(range)

  return (
    <QueryBoundary
      query={positionQuery}
      isEmpty={(data) => !data.receivables}
      emptyText="No receivables data available."
      skeletonLines={9}
    >
      {(position) => (
        <WidgetCard
          title="Receivables"
          icon={<TeamOutlined style={{ color: '#7c3aed' }} />}
          bodyPadding={16}
          footer={`${position.receivables.note}`}
        >
          <PartyPositionCard
            accent="#7c3aed"
            total={position.receivables.total}
            opening={position.receivables.opening}
            partyCount={position.receivables.partyCount}
            aging={position.receivables.aging}
            topParties={position.receivables.topParties}
            note={position.receivables.note}
            route="/report/customer"
            routeLabel="Customer statement"
          />
        </WidgetCard>
      )}
    </QueryBoundary>
  )
}