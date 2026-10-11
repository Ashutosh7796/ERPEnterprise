import React from 'react'
import { AuditOutlined } from '@ant-design/icons'
import type { DashboardDateRange } from '../api/dashboardApi'
import { useDashboardPosition } from '../api/dashboardApi'
import { WidgetCard } from './primitives/WidgetCard'
import { PartyPositionCard } from './PartyPositionCard'
import { QueryBoundary } from '../QueryBoundary'

interface PayablesWidgetProps {
  range: DashboardDateRange
}

export const PayablesWidget: React.FC<PayablesWidgetProps> = ({ range }) => {
  const positionQuery = useDashboardPosition(range)

  return (
    <QueryBoundary
      query={positionQuery}
      isEmpty={(data) => !data.payables}
      emptyText="No payables data available."
      skeletonLines={9}
    >
      {(position) => (
        <WidgetCard
          title="Payables"
          icon={<AuditOutlined style={{ color: '#d97706' }} />}
          bodyPadding={16}
          footer={position.payables.note}
        >
          <PartyPositionCard
            accent="#d97706"
            total={position.payables.total}
            opening={position.payables.opening}
            partyCount={position.payables.partyCount}
            aging={position.payables.aging}
            topParties={position.payables.topParties}
            note={position.payables.note}
            route="/report/vendor"
            routeLabel="Vendor statement"
          />
        </WidgetCard>
      )}
    </QueryBoundary>
  )
}