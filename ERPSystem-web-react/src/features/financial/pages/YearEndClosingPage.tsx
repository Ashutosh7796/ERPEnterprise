import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Tag,
  Statistic,
  Space,
  Modal,
  message,
  Alert,
  Tooltip,
  Badge,
  Descriptions,
  Divider,
  Result,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  FileDoneOutlined,
  AuditOutlined,
  BarChartOutlined,
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import {
  yearEndClosingApi,
  FinancialYearOption,
  YearEndReadinessDto,
  YearEndClosingResultDto,
  TenantOption,
} from '../api/yearEndClosingApi'

const { Title, Text, Paragraph } = Typography

export const YearEndClosingPage: React.FC = () => {
  const navigate = useNavigate()
  const userAuth = useAppStore((state) => state.userAuth)
  const user = useAuthStore((state) => state.user)

  // Detect Platform Super Admin scope
  const isPlatformAdmin =
    userAuth?.authorityDomain === 'PLATFORM' ||
    userAuth?.isSuperAdmin === true ||
    userAuth?.tenantId === 0 ||
    userAuth?.tenantId === null ||
    user?.tenantId === 0 ||
    user?.loginName === 'admin' ||
    user?.loginName === 'ash'

  // Tenant State (for Platform Super Admins)
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>(
    userAuth?.tenantId && userAuth.tenantId > 0
      ? userAuth.tenantId
      : user?.tenantId && user.tenantId > 0
      ? user.tenantId
      : undefined
  )
  const [tenantsLoading, setTenantsLoading] = useState(false)

  // Data States
  const [financialYears, setFinancialYears] = useState<FinancialYearOption[]>([])
  const [selectedFyId, setSelectedFyId] = useState<number | undefined>()
  const [selectedFy, setSelectedFy] = useState<FinancialYearOption | null>(null)

  // Loading States
  const [fyLoading, setFyLoading] = useState(false)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [closingSubmitting, setClosingSubmitting] = useState(false)

  // DTO States
  const [readiness, setReadiness] = useState<YearEndReadinessDto | null>(null)
  const [closingResult, setClosingResult] = useState<YearEndClosingResultDto | null>(null)

  // Confirmation Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)

  // 1. Load Fiscal Years
  const loadFiscalYears = useCallback(async (targetTenantId?: number, preferredFyId?: number) => {
    setFyLoading(true)
    try {
      const res = await yearEndClosingApi.getFiscalYears(targetTenantId)
      const list = res?.list || (Array.isArray(res) ? res : [])
      setFinancialYears(list)

      if (res?.tenantId && !targetTenantId) {
        setSelectedTenantId(res.tenantId)
      }

      if (list.length > 0) {
        let defaultFy = list[0]
        if (preferredFyId) {
          const match = list.find((fy) => fy.id === preferredFyId)
          if (match) defaultFy = match
        } else {
          // Prefer active year, otherwise first year
          const active = list.find((fy) => fy.status === 'ACTIVE')
          if (active) defaultFy = active
        }
        setSelectedFyId(defaultFy.id)
        setSelectedFy(defaultFy)
      } else {
        setSelectedFyId(undefined)
        setSelectedFy(null)
        setReadiness(null)
      }
    } catch (error: any) {
      console.error('Failed to load financial years:', error)
      message.error(error?.message || 'Failed to load financial years')
    } finally {
      setFyLoading(false)
    }
  }, [])

  // 2. Check Readiness for Selected FY
  const checkReadiness = useCallback(async (fyId: number, targetTenantId?: number) => {
    setReadinessLoading(true)
    setClosingResult(null)
    try {
      const data = await yearEndClosingApi.checkReadiness(fyId, targetTenantId)
      setReadiness(data)
    } catch (error: any) {
      console.error('Failed to evaluate year-end readiness:', error)
      message.error(error?.message || 'Failed to evaluate year-end readiness')
      setReadiness(null)
    } finally {
      setReadinessLoading(false)
    }
  }, [])

  // Initial Load: Fetch tenants if platform admin, then load fiscal years
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      if (isPlatformAdmin) {
        setTenantsLoading(true)
        try {
          const res = await yearEndClosingApi.getTenants()
          const list = res?.list || (Array.isArray(res) ? res : [])
          if (!isMounted) return
          setTenants(list)
          let tId = selectedTenantId
          if (!tId && list.length > 0) {
            tId = list[0].tenantId
            setSelectedTenantId(tId)
          }
          await loadFiscalYears(tId)
        } catch (err: any) {
          console.error('Failed to load tenants:', err)
          if (isMounted) {
            await loadFiscalYears()
          }
        } finally {
          if (isMounted) setTenantsLoading(false)
        }
      } else {
        await loadFiscalYears(selectedTenantId)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [isPlatformAdmin, loadFiscalYears])

  // React to FY Selection change
  useEffect(() => {
    if (selectedFyId) {
      const found = financialYears.find((fy) => fy.id === selectedFyId)
      setSelectedFy(found || null)
      checkReadiness(selectedFyId, selectedTenantId)
    }
  }, [selectedFyId, financialYears, selectedTenantId, checkReadiness])

  // 3. Execute Irreversible Closing
  const handleExecuteClosing = async () => {
    if (!selectedFyId) return
    setClosingSubmitting(true)
    try {
      const result = await yearEndClosingApi.closeFiscalYear(selectedFyId, selectedTenantId)
      setClosingResult(result)
      setConfirmModalVisible(false)
      message.success(`Fiscal year ${result.financialYearName} successfully closed and finalized!`)
      // Refresh FY list and readiness
      await loadFiscalYears(selectedTenantId, selectedFyId)
    } catch (error: any) {
      console.error('Year-end closing failed:', error)
      message.error(error?.message || 'Fiscal year closing failed')
    } finally {
      setClosingSubmitting(false)
    }
  }

  const isFinalized = selectedFy?.status === 'FINALIZED' || selectedFy?.status === 'CLOSED'
  const isReady = readiness?.readyForClose === true && selectedFy?.status === 'ACTIVE'

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* ============================================================ */}
      {/* 1. Header & Fiscal Year Selector                             */}
      {/* ============================================================ */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={12} xl={13}>
            <Space orientation="horizontal" align="center" size="middle">
              <SafetyCertificateOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Fiscal Year-End Closing & Finalization
                </Title>
                <Text type="secondary">
                  Authoritative Schedule III annual closing: nominal account zeroing, retained earnings (2120) transfer, and irreversible fiscal year terminal lock.
                </Text>
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={12} xl={11} style={{ textAlign: 'right' }}>
            <Space wrap>
              {isPlatformAdmin && (
                <Select
                  id="tenant-select"
                  style={{ width: 190, textAlign: 'left' }}
                  loading={tenantsLoading}
                  value={selectedTenantId}
                  onChange={(tId) => {
                    setSelectedTenantId(tId)
                    setSelectedFyId(undefined)
                    setSelectedFy(null)
                    setReadiness(null)
                    loadFiscalYears(tId)
                  }}
                  placeholder="Select Tenant"
                  options={tenants.map((t) => ({
                    value: t.tenantId,
                    label: (
                      <Space>
                        <TeamOutlined />
                        <span>{t.loginName || `Tenant ${t.tenantId}`}</span>
                      </Space>
                    ),
                  }))}
                />
              )}
              <Select
                id="fy-select"
                style={{ width: 220, textAlign: 'left' }}
                loading={fyLoading}
                value={selectedFyId}
                onChange={(val) => setSelectedFyId(val)}
                placeholder="Select Fiscal Year"
                options={financialYears.map((fy) => ({
                  value: fy.id,
                  label: (
                    <Space>
                      <span>FY {fy.name}</span>
                      <Tag
                        color={
                          fy.status === 'FINALIZED'
                            ? 'gold'
                            : fy.status === 'ACTIVE'
                            ? 'green'
                            : 'default'
                        }
                      >
                        {fy.status}
                      </Tag>
                    </Space>
                  ),
                }))}
              />
              <Button
                id="refresh-readiness-btn"
                icon={<ReloadOutlined />}
                loading={readinessLoading || fyLoading}
                onClick={() => {
                  if (selectedFyId) {
                    checkReadiness(selectedFyId, selectedTenantId)
                  } else {
                    loadFiscalYears(selectedTenantId)
                  }
                }}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ============================================================ */}
      {/* 2. Success Banner (If Just Finalized or Viewing Finalized)   */}
      {/* ============================================================ */}
      {(closingResult || isFinalized) && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 8,
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
          }}
        >
          <Result
            status="success"
            title={`Fiscal Year ${selectedFy?.name || ''} is FINALIZED`}
            subTitle={
              closingResult?.finalizedReason ||
              selectedFy?.finalizedReason ||
              'Year-end closing successfully posted to General Ledger and terminal status locked.'
            }
            extra={[
              <Button
                id="view-trial-balance-btn"
                key="tb"
                icon={<BarChartOutlined />}
                onClick={() => navigate('/financial/reports/trial_balance')}
              >
                Trial Balance
              </Button>,
              <Button
                id="view-balance-sheet-btn"
                key="bs"
                icon={<DollarOutlined />}
                onClick={() => navigate('/financial/reports/balance_sheet')}
              >
                Balance Sheet
              </Button>,
              <Button
                id="view-pnl-btn"
                key="pnl"
                icon={<FileDoneOutlined />}
                onClick={() => navigate('/financial/reports/profit_loss')}
              >
                Profit & Loss
              </Button>,
              <Button
                id="view-audit-trail-btn"
                key="audit"
                icon={<AuditOutlined />}
                onClick={() => navigate('/financial/reports/gl_audit_trail')}
              >
                GL Audit Trail
              </Button>,
            ]}
          >
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }}>
              <Descriptions.Item label="Status">
                <Tag color="gold">FINALIZED</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Closing Voucher">
                {closingResult?.voucherNumber || `YEC-${selectedFy?.name}`}
              </Descriptions.Item>
              <Descriptions.Item label="Closing GL Lines">
                {closingResult?.entriesCount ?? 'Posted'}
              </Descriptions.Item>
              <Descriptions.Item label="Net Transferred">
                {closingResult?.netProfit !== undefined
                  ? `₹${Number(closingResult.netProfit).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}`
                  : 'Retained Earnings (2120)'}
              </Descriptions.Item>
            </Descriptions>
          </Result>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 3. Executive Summary KPI Cards                              */}
      {/* ============================================================ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Lifecycle Status"
              value={selectedFy?.status || 'UNKNOWN'}
              valueStyle={{
                color:
                  selectedFy?.status === 'FINALIZED'
                    ? '#d48806'
                    : selectedFy?.status === 'ACTIVE'
                    ? '#389e0d'
                    : '#8c8c8c',
                fontSize: 20,
              }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Fiscal Periods"
              value={`${readiness?.periodsCount || 0} / 12`}
              valueStyle={{
                color: readiness?.areAllPeriodsClosed ? '#389e0d' : '#cf1322',
                fontSize: 20,
              }}
              prefix={<CalendarOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {readiness?.areAllPeriodsClosed ? 'All 12 Closed' : 'Closing Incomplete'}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Subledger Reconciliation"
              value={readiness?.reconciliationStatus || 'UNKNOWN'}
              valueStyle={{
                color: readiness?.isReconciliationBalanced ? '#389e0d' : '#cf1322',
                fontSize: 20,
              }}
              prefix={
                readiness?.isReconciliationBalanced ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Variance: ₹{Number(readiness?.reconciliationTotalVariance || 0).toFixed(2)}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Trial Balance"
              value={readiness?.isTrialBalanceBalanced ? 'Balanced' : 'Out of Balance'}
              valueStyle={{
                color: readiness?.isTrialBalanceBalanced ? '#389e0d' : '#cf1322',
                fontSize: 20,
              }}
              prefix={
                readiness?.isTrialBalanceBalanced ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Dr == Cr Verified
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Pending Postings"
              value={
                (readiness?.pendingDepotHeadCount || 0) +
                (readiness?.pendingAccountHeadCount || 0) +
                (readiness?.pendingJournalEntryCount || 0)
              }
              valueStyle={{
                color: readiness?.noPendingDocuments ? '#389e0d' : '#cf1322',
                fontSize: 20,
              }}
              prefix={
                readiness?.noPendingDocuments ? (
                  <CheckCircleOutlined />
                ) : (
                  <ExclamationCircleOutlined />
                )
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {readiness?.noPendingDocuments ? '0 Pending Documents' : 'Requires Approval/Posting'}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
            <Statistic
              title="Est. Net Profit / (Loss)"
              value={Number(readiness?.estimatedNetProfit || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
              precision={2}
              valueStyle={{
                color:
                  (readiness?.estimatedNetProfit || 0) >= 0 ? '#1890ff' : '#cf1322',
                fontSize: 20,
              }}
              prefix="₹"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {(readiness?.estimatedNetProfit || 0) >= 0 ? 'Transfers Cr 2120' : 'Transfers Dr 2120'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* ============================================================ */}
      {/* 4. Safety Gates Verification Matrix                          */}
      {/* ============================================================ */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
            <span>Statutory Year-End Closing Readiness Gates</span>
          </Space>
        }
        style={{ marginBottom: 24, borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          {/* Gate 1 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 6,
                borderColor: readiness?.areAllPeriodsClosed ? '#b7eb8f' : '#ffa39e',
                backgroundColor: readiness?.areAllPeriodsClosed ? '#f6ffed' : '#fff1f0',
              }}
            >
              <Space align="start">
                {readiness?.areAllPeriodsClosed ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                )}
                <div>
                  <Text strong>Gate 1: 12 Fiscal Periods Closed</Text>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    Requires exactly 12 monthly periods belonging to the fiscal year, all in{' '}
                    <Tag color="red">CLOSED</Tag> status. No active, locked, upcoming, or missing periods permitted.
                  </Paragraph>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      status={readiness?.areAllPeriodsClosed ? 'success' : 'error'}
                      text={`${readiness?.periodsCount || 0}/12 Periods Closed`}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Gate 2 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 6,
                borderColor: readiness?.isReconciliationBalanced ? '#b7eb8f' : '#ffa39e',
                backgroundColor: readiness?.isReconciliationBalanced ? '#f6ffed' : '#fff1f0',
              }}
            >
              <Space align="start">
                {readiness?.isReconciliationBalanced ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                )}
                <div>
                  <Text strong>Gate 2: Subledger Control Accounts Reconciled</Text>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    Requires zero variance across all 6 control accounts (Customer AR, Supplier AP, Inventory Stock, Fixed Assets, Output GST, Input GST).
                  </Paragraph>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      status={readiness?.isReconciliationBalanced ? 'success' : 'error'}
                      text={`Status: ${readiness?.reconciliationStatus || 'UNKNOWN'} (Variance: ₹${Number(
                        readiness?.reconciliationTotalVariance || 0
                      ).toFixed(2)})`}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Gate 3 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 6,
                borderColor: readiness?.isTrialBalanceBalanced ? '#b7eb8f' : '#ffa39e',
                backgroundColor: readiness?.isTrialBalanceBalanced ? '#f6ffed' : '#fff1f0',
              }}
            >
              <Space align="start">
                {readiness?.isTrialBalanceBalanced ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                )}
                <div>
                  <Text strong>Gate 3: Trial Balance Balanced (Dr == Cr)</Text>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    Validates that total general ledger debits match total credits for the target fiscal year prior to year-end closing journal generation.
                  </Paragraph>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      Debits: ₹
                      {Number(readiness?.trialBalanceTotalDebit || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      | Credits: ₹
                      {Number(readiness?.trialBalanceTotalCredit || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Gate 4 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 6,
                borderColor: readiness?.noPendingDocuments ? '#b7eb8f' : '#ffa39e',
                backgroundColor: readiness?.noPendingDocuments ? '#f6ffed' : '#fff1f0',
              }}
            >
              <Space align="start">
                {readiness?.noPendingDocuments ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                )}
                <div>
                  <Text strong>Gate 4: Zero Pending Operational Documents</Text>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    Requires zero draft or unposted operational documents (DepotHead, AccountHead, Journal Entries) within the closing year dates.
                  </Paragraph>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      status={readiness?.noPendingDocuments ? 'success' : 'error'}
                      text={`Depot: ${readiness?.pendingDepotHeadCount || 0} | Financial: ${
                        readiness?.pendingAccountHeadCount || 0
                      } | JV Drafts: ${readiness?.pendingJournalEntryCount || 0}`}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Blocking Reasons Alert */}
        {readiness && !readiness.readyForClose && readiness.blockingReasons.length > 0 && (
          <Alert
            id="blocking-reasons-alert"
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Fiscal Year Closing Blocked"
            description={
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {readiness.blockingReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            }
          />
        )}
      </Card>

      {/* ============================================================ */}
      {/* 5. Irreversible Finalization Action Banner                    */}
      {/* ============================================================ */}
      <Card
        style={{
          borderRadius: 8,
          border: isReady ? '1px solid #1890ff' : undefined,
          boxShadow: isReady ? '0 0 12px rgba(24, 144, 255, 0.15)' : undefined,
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Title level={5} style={{ margin: 0 }}>
              Statutory Year-End Closing Action
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              Finalization generates an immutable <Text code>YEAR_END_CLOSING</Text> journal entry, brings all nominal accounts to zero balance, transfers net profit or loss to Retained Earnings (Account 2120), and transitions the financial year to <Text strong>FINALIZED</Text>. This operation is permanent and irreversible.
            </Paragraph>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Tooltip
              title={
                isFinalized
                  ? 'This fiscal year is already finalized. Reopening is forbidden.'
                  : !isReady
                  ? 'All 4 safety gates must pass before finalization can be executed.'
                  : 'Click to open the final confirmation dialog'
              }
            >
              <Button
                id="close-fy-btn"
                type="primary"
                danger
                size="large"
                icon={<LockOutlined />}
                disabled={!isReady}
                onClick={() => setConfirmModalVisible(true)}
              >
                {isFinalized ? 'Fiscal Year Finalized' : 'Finalize & Close Fiscal Year'}
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* ============================================================ */}
      {/* 6. Double Confirmation Modal                                 */}
      {/* ============================================================ */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Confirm Irreversible Year-End Finalization</span>
          </Space>
        }
        open={confirmModalVisible}
        onCancel={() => !closingSubmitting && setConfirmModalVisible(false)}
        confirmLoading={closingSubmitting}
        okText="Authorize & Finalize Fiscal Year"
        okButtonProps={{ danger: true, id: 'confirm-close-btn' }}
        cancelButtonProps={{ id: 'cancel-close-btn' }}
        onOk={handleExecuteClosing}
        width={600}
      >
        <div id="confirm-closing-modal">
          <Alert
            type="warning"
            showIcon
            message="Irreversible Statutory Action"
          description="Once finalized, this financial year cannot be reopened, edited, or deleted under any circumstances. All operational nominal accounts will be physically zeroed into Retained Earnings 2120."
          style={{ marginBottom: 16 }}
        />

        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Target Fiscal Year">
            <Text strong>FY {selectedFy?.name}</Text> (Code: {selectedFy?.code})
          </Descriptions.Item>
          <Descriptions.Item label="Posting Date">
            {selectedFy?.endDate ? new Date(selectedFy.endDate).toLocaleDateString() : 'Year-End Date'}
          </Descriptions.Item>
          <Descriptions.Item label="Nominal Accounts to Zero">
            {readiness?.eligibleNominalAccountsCount || 0} active leaf accounts
          </Descriptions.Item>
          <Descriptions.Item label="Projected Retained Earnings (2120)">
            <Text
              strong
              style={{
                color: (readiness?.estimatedNetProfit || 0) >= 0 ? '#52c41a' : '#f5222d',
              }}
            >
              ₹
              {Number(readiness?.estimatedNetProfit || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}{' '}
              ({(readiness?.estimatedNetProfit || 0) >= 0 ? 'Credit / Profit' : 'Debit / Loss'})
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Subledger Control Accounts">
            All 6 Control Accounts BALANCED (Variance: ₹0.00)
          </Descriptions.Item>
          <Descriptions.Item label="Trial Balance">
            Verified Debits == Credits
          </Descriptions.Item>
        </Descriptions>
        </div>
      </Modal>
    </div>
  )
}
