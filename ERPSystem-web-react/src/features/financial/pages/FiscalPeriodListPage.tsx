import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Statistic,
  Space,
  Modal,
  Input,
  message,
  Alert,
  Tooltip,
  Badge,
  Descriptions,
  Divider,
} from 'antd'
import {
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  fiscalPeriodApi,
  FiscalPeriodDTO,
  PeriodCloseReadinessDto,
  FinancialYearOption,
} from '../api/fiscalPeriodApi'

const { TextArea } = Input

export const FiscalPeriodListPage: React.FC = () => {
  const [financialYears, setFinancialYears] = useState<FinancialYearOption[]>([])
  const [selectedFyId, setSelectedFyId] = useState<number | undefined>()
  const [periods, setPeriods] = useState<FiscalPeriodDTO[]>([])
  const [loading, setLoading] = useState(false)

  // Action Modals State
  const [lockModalVisible, setLockModalVisible] = useState(false)
  const [unlockModalVisible, setUnlockModalVisible] = useState(false)
  const [closeModalVisible, setCloseModalVisible] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalPeriodDTO | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Close Readiness State
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [readinessDto, setReadinessDto] = useState<PeriodCloseReadinessDto | null>(null)

  // Load Financial Years
  const loadFinancialYears = useCallback(async () => {
    try {
      const res = await fiscalPeriodApi.getFinancialYears()
      const list = res?.list || (Array.isArray(res) ? res : [])
      setFinancialYears(list)
      if (list.length > 0) {
        const activeFy = list.find((fy) => fy.status === 'ACTIVE') || list[0]
        setSelectedFyId(activeFy.id)
      }
    } catch (error: any) {
      console.error('Failed to load financial years:', error)
      message.error(error?.message || 'Failed to load financial years')
    }
  }, [])

  // Load Periods for selected FY
  const loadPeriods = useCallback(async (fyId?: number) => {
    setLoading(true)
    try {
      const data = await fiscalPeriodApi.getPeriods(fyId)
      const list = Array.isArray(data) ? data : (data as any)?.list || []
      setPeriods(list)
    } catch (error: any) {
      console.error('Failed to load fiscal periods:', error)
      message.error(error?.message || 'Failed to load fiscal periods')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFinancialYears()
  }, [loadFinancialYears])

  useEffect(() => {
    if (selectedFyId) {
      loadPeriods(selectedFyId)
    }
  }, [selectedFyId, loadPeriods])

  // Statistics
  const totalCount = periods.length
  const activeCount = periods.filter((p) => p.status === 'ACTIVE').length
  const lockedCount = periods.filter((p) => p.status === 'LOCKED').length
  const closedCount = periods.filter((p) => p.status === 'CLOSED').length

  // Handlers
  const handleOpenLock = (period: FiscalPeriodDTO) => {
    setSelectedPeriod(period)
    setActionReason('')
    setLockModalVisible(true)
  }

  const handleOpenUnlock = (period: FiscalPeriodDTO) => {
    setSelectedPeriod(period)
    setActionReason('')
    setUnlockModalVisible(true)
  }

  const handleOpenClose = async (period: FiscalPeriodDTO) => {
    setSelectedPeriod(period)
    setActionReason('')
    setReadinessDto(null)
    setCloseModalVisible(true)
    setReadinessLoading(true)
    try {
      const dto = await fiscalPeriodApi.checkCloseReadiness(period.periodName)
      setReadinessDto(dto)
    } catch (error: any) {
      message.error(error?.message || 'Failed to check close readiness')
    } finally {
      setReadinessLoading(false)
    }
  }

  const handleConfirmLock = async () => {
    if (!selectedPeriod) return
    if (!actionReason.trim()) {
      message.warning('Please enter a valid reason for locking the period')
      return
    }
    setActionSubmitting(true)
    try {
      await fiscalPeriodApi.lockPeriod(selectedPeriod.periodName, actionReason.trim())
      message.success(`Period ${selectedPeriod.periodName} locked successfully`)
      setLockModalVisible(false)
      loadPeriods(selectedFyId)
    } catch (error: any) {
      message.error(error?.message || 'Lock failed')
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleConfirmUnlock = async () => {
    if (!selectedPeriod) return
    if (!actionReason.trim()) {
      message.warning('Please enter a valid reason for unlocking the period')
      return
    }
    setActionSubmitting(true)
    try {
      await fiscalPeriodApi.unlockPeriod(selectedPeriod.periodName, actionReason.trim())
      message.success(`Period ${selectedPeriod.periodName} unlocked successfully`)
      setUnlockModalVisible(false)
      loadPeriods(selectedFyId)
    } catch (error: any) {
      message.error(error?.message || 'Unlock failed')
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleConfirmClose = async () => {
    if (!selectedPeriod) return
    if (!actionReason.trim()) {
      message.warning('Please enter a closing reason or audit note')
      return
    }
    setActionSubmitting(true)
    try {
      await fiscalPeriodApi.closePeriod(selectedPeriod.periodName, actionReason.trim())
      message.success(`Period ${selectedPeriod.periodName} CLOSED successfully`)
      setCloseModalVisible(false)
      loadPeriods(selectedFyId)
    } catch (error: any) {
      message.error(error?.message || 'Period close failed')
    } finally {
      setActionSubmitting(false)
    }
  }

  const columns: ColumnsType<FiscalPeriodDTO> = [
    {
      title: 'Period #',
      dataIndex: 'periodNumber',
      key: 'periodNumber',
      width: 90,
      render: (num) => <strong>Month {num}</strong>,
    },
    {
      title: 'Period Name',
      dataIndex: 'periodName',
      key: 'periodName',
      width: 130,
      render: (name) => <Tag color="geekblue">{name}</Tag>,
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      width: 220,
      render: (_, r) => {
        const start = r.startDate ? r.startDate.substring(0, 10) : ''
        const end = r.endDate ? r.endDate.substring(0, 10) : ''
        return `${start} ~ ${end}`
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        switch (status) {
          case 'UPCOMING':
            return <Tag color="default">UPCOMING</Tag>
          case 'ACTIVE':
            return <Tag color="success">ACTIVE</Tag>
          case 'LOCKED':
            return (
              <Tag color="warning" icon={<LockOutlined />}>
                LOCKED
              </Tag>
            )
          case 'CLOSED':
            return (
              <Tag color="red" icon={<CheckCircleOutlined />}>
                CLOSED
              </Tag>
            )
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
    {
      title: 'Lifecycle Metadata',
      key: 'metadata',
      render: (_, r) => {
        if (r.status === 'LOCKED' || r.status === 'CLOSED') {
          return (
            <div style={{ fontSize: 12 }}>
              {r.lockedTime && <div><strong>Time:</strong> {r.lockedTime.substring(0, 19)}</div>}
              {r.lockReason && <div><strong>Reason:</strong> {r.lockReason}</div>}
              {r.lockedBy && <div><strong>Actor ID:</strong> {r.lockedBy}</div>}
            </div>
          )
        }
        return <span style={{ color: '#aaa' }}>Operational Postings Allowed</span>
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => {
        return (
          <Space direction="horizontal" size={4}>
            {record.status === 'ACTIVE' && (
              <Button
                type="primary"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleOpenLock(record)}
              >
                Lock Period
              </Button>
            )}

            {record.status === 'LOCKED' && (
              <>
                <Button
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={() => handleOpenUnlock(record)}
                >
                  Unlock
                </Button>
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => handleOpenClose(record)}
                >
                  Close Period
                </Button>
              </>
            )}

            {record.status === 'CLOSED' && (
              <Tooltip title="CLOSED periods are strictly immutable per AD-06 / 4C.3. Reopening is forbidden.">
                <Tag color="magenta" icon={<LockOutlined />}>
                  Immutable (Closed)
                </Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <h2 style={{ margin: 0 }}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              Fiscal Period Closing Administration (Phase 4C.3)
            </h2>
            <div style={{ color: '#888', marginTop: 4 }}>
              Operational period locking, sequential close invariant (AD-06), dual-tier role authorization (AD-07),
              and subledger reconciliation gate (AD-08).
            </div>
          </Col>
          <Col>
            <Space>
              <span>Fiscal Year:</span>
              <Select
                style={{ width: 160 }}
                value={selectedFyId}
                onChange={(val) => setSelectedFyId(val)}
                options={financialYears.map((fy) => ({
                  label: `${fy.name} (${fy.status})`,
                  value: fy.id,
                }))}
              />
              <Button icon={<ReloadOutlined />} onClick={() => loadPeriods(selectedFyId)}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistical Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total Fiscal Periods" value={totalCount} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Active (Open Postings)"
                value={activeCount}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Locked (Operational Freeze)"
                value={lockedCount}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Closed (Finalized Ledger)"
                value={closedCount}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Alert
          message="Accounting Governance Rules"
          description="A period can only be CLOSED after it has been LOCKED (operational freeze). Closing requires: 1) Preceding chronological period is already CLOSED (AD-06), 2) Subledger-to-GL reconciliation has zero variance across AR, AP, Advances, and Giro (AD-08), 3) Financial Controller or Tenant Admin authorization (AD-07)."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={periods}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Lock Period Modal */}
      <Modal
        title={`Lock Period ${selectedPeriod?.periodName}`}
        open={lockModalVisible}
        onOk={handleConfirmLock}
        confirmLoading={actionSubmitting}
        onCancel={() => setLockModalVisible(false)}
        okText="Confirm Lock"
      >
        <p>
          Locking period <strong>{selectedPeriod?.periodName}</strong> freezes all new operational General
          Ledger postings and voucher reversals for this period.
        </p>
        <div style={{ marginBottom: 8 }}>
          <strong>Lock Reason / Audit Note (Required):</strong>
        </div>
        <TextArea
          rows={3}
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
          placeholder="e.g. Month-end closing freeze initiated by operational accountant"
        />
      </Modal>

      {/* Unlock Period Modal */}
      <Modal
        title={`Unlock Period ${selectedPeriod?.periodName}`}
        open={unlockModalVisible}
        onOk={handleConfirmUnlock}
        confirmLoading={actionSubmitting}
        onCancel={() => setUnlockModalVisible(false)}
        okText="Confirm Unlock"
      >
        <p>
          Unlocking period <strong>{selectedPeriod?.periodName}</strong> restores ACTIVE status and permits
          subsequent GL entries.
        </p>
        <Alert
          message="Supervisory Authorization"
          description="Unlocking requires Financial Controller or Tenant Admin credentials (AD-07)."
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 8 }}>
          <strong>Unlock Reason / Justification (Required):</strong>
        </div>
        <TextArea
          rows={3}
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
          placeholder="e.g. Authorized reopening for audit adjustments approved by Financial Controller"
        />
      </Modal>

      {/* Close Period Verification Modal */}
      <Modal
        title={`Pre-Close Verification: Period ${selectedPeriod?.periodName}`}
        open={closeModalVisible}
        onOk={handleConfirmClose}
        confirmLoading={actionSubmitting}
        onCancel={() => setCloseModalVisible(false)}
        okText="Finalize & Close Period"
        okButtonProps={{
          disabled: !readinessDto?.periodCloseReady,
          danger: true,
        }}
        width={650}
      >
        {readinessLoading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <span>Running AD-08 pre-close verification & 3-way reconciliation...</span>
          </div>
        ) : readinessDto ? (
          <div>
            <Descriptions title="Closing Gate Verification" bordered size="small" column={1}>
              <Descriptions.Item label="Gate 1: Operational Freeze (LOCKED)">
                {readinessDto.isLocked ? (
                  <Badge status="success" text="PASSED: Period is currently LOCKED" />
                ) : (
                  <Badge status="error" text={`FAILED: Status is ${readinessDto.currentStatus} (Must be LOCKED)`} />
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Gate 2: Sequential Close (AD-06)">
                {readinessDto.isPrecedingPeriodClosed ? (
                  <Badge
                    status="success"
                    text={
                      readinessDto.precedingPeriodName
                        ? `PASSED: Preceding period ${readinessDto.precedingPeriodName} is CLOSED`
                        : 'PASSED: Inception period (No preceding period required)'
                    }
                  />
                ) : (
                  <Badge
                    status="error"
                    text={`FAILED: Preceding period ${readinessDto.precedingPeriodName || 'unknown'} is in status [${readinessDto.precedingPeriodStatus || 'UNKNOWN'}]. Preceding period must be CLOSED first.`}
                  />
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Gate 3: Subledger Reconciliation (AD-08)">
                {readinessDto.isBalanced ? (
                  <Badge
                    status="success"
                    text={`PASSED: Reconciled (${readinessDto.reconciliationStatus || 'BALANCED'}, Total Variance = 0.00)`}
                  />
                ) : (
                  <Badge
                    status="error"
                    text={`FAILED: Variance detected (${readinessDto.totalVariance ?? 'Non-Zero'}). Reconciliation status: ${readinessDto.reconciliationStatus || 'DISCREPANCY'}`}
                  />
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            {readinessDto.periodCloseReady ? (
              <Alert
                message="Period Ready to Close"
                description="All 3 closing gates have been verified. Closing this period will permanently lock the General Ledger for this month. Once CLOSED, reopening is forbidden per accounting rules."
                type="success"
                showIcon
              />
            ) : (
              <Alert
                message="Period Close Blocked"
                description={
                  <div>
                    The following conditions must be resolved before closing can proceed:
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                      {readinessDto.unreadyReasons.map((reason, idx) => (
                        <li key={idx}><strong>{reason}</strong></li>
                      ))}
                    </ul>
                  </div>
                }
                type="error"
                showIcon
              />
            )}

            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Closing Audit Reason / Reference (Required):</strong>
              </div>
              <TextArea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Month-end books closed and certified by Financial Controller"
                disabled={!readinessDto.periodCloseReady}
              />
            </div>
          </div>
        ) : (
          <Alert message="Unable to load pre-close verification data" type="error" />
        )}
      </Modal>
    </div>
  )
}

export default FiscalPeriodListPage
