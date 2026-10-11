import React from 'react'
import { Col, Row } from 'antd'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import { DashboardHeader } from '../components/DashboardHeader'
import { DashboardFilters } from '../components/DashboardFilters'
import { ExecutiveKpiGrid } from '../components/ExecutiveKpiGrid'
import { SalesProfitWidget } from '../components/SalesProfitWidget'
import { CashFlowWidget } from '../components/CashFlowWidget'
import { ReceivablesWidget } from '../components/ReceivablesWidget'
import { PayablesWidget } from '../components/PayablesWidget'
import { InventoryHealthWidget } from '../components/InventoryHealthWidget'
import { TaxComplianceWidget } from '../components/TaxComplianceWidget'
import { ExpenseWidget } from '../components/ExpenseWidget'
import { ActionCenter } from '../components/ActionCenter'
import { RecentTransactions } from '../components/RecentTransactions'
import { useDashboardFilters } from '../hooks/useDashboardFilters'

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const userAuth = useAppStore((state) => state.userAuth)
  const queryClient = useQueryClient()

  const { preset, range, customRange, periodLabel, setPreset, setCustomRange } =
    useDashboardFilters()

  const isRefreshing = useIsFetching({ queryKey: ['dashboard'] }) > 0

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const greetingName = user?.userName || user?.loginName || 'Administrator'
  // Executive presentation rule: Never display internal Tenant #ID
  const tenantLabel = userAuth.tenantName || 'Company Workspace'

  return (
    <div style={{ padding: '0 4px 24px' }}>
      {/* TIER 1 — EXECUTIVE PERFORMANCE */}
      <DashboardHeader
        greetingName={greetingName}
        tenantLabel={tenantLabel}
        periodLabel={periodLabel}
        refreshing={isRefreshing}
        onRefresh={refresh}
      />

      <div style={{ padding: '14px 0 4px' }}>
        <DashboardFilters
          preset={preset}
          periodLabel={periodLabel}
          customRange={customRange}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      {/* 2. Executive KPI Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ExecutiveKpiGrid range={range} />
        </Col>
      </Row>

      {/* 3. Sales & Profitability (16) + 4. Cash Flow (8) */}
      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} xl={16} style={{ display: 'flex', flexDirection: 'column' }}>
          <SalesProfitWidget range={range} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <CashFlowWidget range={range} />
        </Col>
      </Row>

      {/* TIER 2 — WORKING CAPITAL / OPERATIONS */}
      {/* 5. Receivables (8) + 6. Payables (8) + 7. Inventory Health (8) */}
      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <ReceivablesWidget range={range} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <PayablesWidget range={range} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <InventoryHealthWidget range={range} />
        </Col>
      </Row>

      {/* TIER 3 — EXCEPTIONS / COMPLIANCE */}
      {/* 8. Action Center (8) + 9. Tax & Compliance (8) + 10. Expenses (8) */}
      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <ActionCenter range={range} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <TaxComplianceWidget range={range} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <ExpenseWidget range={range} />
        </Col>
      </Row>

      {/* TIER 4 — OPERATIONAL DETAIL */}
      {/* 11. Recent Transactions (24) */}
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col span={24}>
          <RecentTransactions range={range} />
        </Col>
      </Row>
    </div>
  )
}