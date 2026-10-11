import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Alert,
  Descriptions,
  Result,
  Divider,
  Typography,
  Spin,
  Badge,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SafetyCertificateOutlined,
  ReloadOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  AuditOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useAppStore } from '@store/useAppStore'
import {
  workOrderApi,
  WipReconciliationResultDTO,
  WorkOrderWipSummaryDTO,
  WipReconciliationExceptionDTO,
} from '../api/workOrderApi'
import { WipDrilldownDrawer } from '../components/WipDrilldownDrawer'

const { Title, Text } = Typography

export const WipReconciliationPage: React.FC = () => {
  const userAuth = useAppStore((state) => state.userAuth)
  const isAuthorized =
    userAuth?.isSuperAdmin ||
    userAuth?.isTenantAdmin ||
    userAuth?.authorityDomain === 'PLATFORM' ||
    userAuth?.permissions?.includes('WORK_ORDER_RECONCILE_VIEW') ||
    userAuth?.permissions?.includes('WORK_ORDER_FINANCIAL_POST') ||
    userAuth?.permissions?.includes('FINANCE_ACCOUNT_VIEW') ||
    userAuth?.permissions?.includes('FINANCE_ACCOUNT_MANAGE')

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WipReconciliationResultDTO | null>(null)
  const [asOfDate, setAsOfDate] = useState<Dayjs | null>(dayjs())
  const [periodName, setPeriodName] = useState<string | undefined>(undefined)

  // Drilldown Drawer State
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const fetchReconciliation = useCallback(async () => {
    if (!isAuthorized) return
    setLoading(true)
    try {
      let res: any
      if (periodName) {
        res = await workOrderApi.reconcileWipPeriod(periodName)
      } else {
        const dateStr = asOfDate ? asOfDate.format('YYYY-MM-DD') : undefined
        res = await workOrderApi.reconcileWip(dateStr)
      }
      setData(res?.data || res)
    } catch (err: any) {
      console.error('Failed to load WIP reconciliation', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthorized, periodName, asOfDate])

  useEffect(() => {
    if (isAuthorized) {
      fetchReconciliation()
    }
  }, [isAuthorized, fetchReconciliation])

  if (!isAuthorized) {
    return (
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="Access Denied: WIP reconciliation view requires WORK_ORDER_RECONCILE_VIEW or Finance authorization."
      />
    )
  }

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'BALANCED':
        return (
          <Tag color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
            <CheckCircleOutlined /> 3-WAY BALANCED
          </Tag>
        )
      case 'WARNING_PENDING_POSTING':
        return (
          <Tag color="orange" style={{ fontSize: 13, padding: '4px 10px' }}>
            <WarningOutlined /> PENDING FINANCIAL POSTING
          </Tag>
        )
      case 'GRANULARITY_DISCREPANCY':
        return (
          <Tag color="red" style={{ fontSize: 13, padding: '4px 10px' }}>
            <CloseCircleOutlined /> GRANULARITY DISCREPANCY
          </Tag>
        )
      case 'GL_SUBLEDGER_DISCREPANCY':
        return (
          <Tag color="red" style={{ fontSize: 13, padding: '4px 10px' }}>
            <CloseCircleOutlined /> GL SUBLEDGER DISCREPANCY
          </Tag>
        )
      default:
        return <Tag>{status || 'CHECKING'}</Tag>
    }
  }

  const orderColumns: TableColumnsType<WorkOrderWipSummaryDTO> = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 170,
      render: (v, r) => (
        <span>
          <Text strong>{v}</Text>
          {r.isRework && (
            <div>
              <Tag color="purple" style={{ fontSize: 10 }}>
                <BranchesOutlined /> REWORK
              </Tag>
            </div>
          )}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 110,
      render: (st) => <Tag color={st === 'COMPLETED' ? 'green' : 'blue'}>{st}</Tag>,
    },
    {
      title: 'Financial Status',
      dataIndex: 'financialStatus',
      key: 'financialStatus',
      width: 140,
      render: (st) => {
        if (st === 'POSTED') return <Tag color="green">POSTED</Tag>
        if (st === 'PARTIALLY_POSTED') return <Tag color="cyan">PARTIAL</Tag>
        if (st === 'PENDING_FINANCIAL_POSTING') return <Tag color="orange">PENDING POST</Tag>
        return <Tag color="default">{st || 'UNPOSTED'}</Tag>
      },
    },
    {
      title: 'Material Issued (₹)',
      dataIndex: 'materialIssued',
      key: 'materialIssued',
      width: 150,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Material Relieved (₹)',
      dataIndex: 'materialRelieved',
      key: 'materialRelieved',
      width: 150,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Net WIP Balance (₹)',
      dataIndex: 'netWipBalance',
      key: 'netWipBalance',
      width: 150,
      render: (v) => (
        <Text strong style={{ color: Number(v || 0) > 0 ? '#d48806' : '#888' }}>
          ₹{Number(v || 0).toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Pending Receipts',
      dataIndex: 'pendingReceiptCount',
      key: 'pendingReceiptCount',
      width: 130,
      render: (cnt, r) =>
        cnt > 0 ? (
          <TooltipTag count={cnt} amount={r.pendingReceiptAmount} />
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center',
      render: (_, r) => (
        <Button
          size="small"
          type="link"
          icon={<AuditOutlined />}
          onClick={() => {
            setSelectedOrderId(r.workOrderId)
            setDrilldownOpen(true)
          }}
        >
          Drilldown
        </Button>
      ),
    },
  ]

  const TooltipTag: React.FC<{ count: number; amount: number }> = ({ count, amount }) => (
    <Tag color="orange">
      {count} unposted (₹{Number(amount || 0).toFixed(2)})
    </Tag>
  )

  const exceptionColumns: TableColumnsType<WipReconciliationExceptionDTO> = [
    {
      title: 'Exception Type',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      width: 180,
      render: (v) => <Tag color="red">{v}</Tag>,
    },
    {
      title: 'Work Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
      render: (v) => v || '-',
    },
    {
      title: 'Document Ref',
      dataIndex: 'sourceDocumentNumber',
      key: 'sourceDocumentNumber',
      width: 150,
      render: (v, r) => (v ? `${r.sourceDocumentType}: ${v}` : '-'),
    },
    {
      title: 'Expected (₹)',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      width: 130,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Actual (₹)',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      width: 130,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Variance (₹)',
      dataIndex: 'varianceAmount',
      key: 'varianceAmount',
      width: 130,
      render: (v) => (
        <Text strong style={{ color: '#cf1322' }}>
          ₹{Number(v || 0).toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
            Manufacturing WIP Three-Way Reconciliation
          </Title>
          <Text type="secondary">
            General Ledger Control Account 1213 vs Maintained Subledger vs Bottom-Up Transaction Trace
          </Text>
        </div>
        <Space>
          <Select
            placeholder="Reconciliation Mode"
            value={periodName ? 'PERIOD' : 'AS_OF_DATE'}
            style={{ width: 170 }}
            onChange={(mode) => {
              if (mode === 'AS_OF_DATE') {
                setPeriodName(undefined)
                setAsOfDate(dayjs())
              } else {
                setPeriodName(dayjs().format('YYYY-MM'))
              }
            }}
            options={[
              { label: 'Point-in-Time (Date)', value: 'AS_OF_DATE' },
              { label: 'Fiscal Period Rollforward', value: 'PERIOD' },
            ]}
          />

          {!periodName ? (
            <DatePicker
              value={asOfDate}
              onChange={(d) => setAsOfDate(d)}
              allowClear={false}
              style={{ width: 150 }}
            />
          ) : (
            <Select
              value={periodName}
              onChange={(p) => setPeriodName(p)}
              style={{ width: 150 }}
              options={[
                { label: 'March 2026 (2026-03)', value: '2026-03' },
                { label: 'February 2026 (2026-02)', value: '2026-02' },
                { label: 'January 2026 (2026-01)', value: '2026-01' },
              ]}
            />
          )}

          <Button icon={<ReloadOutlined />} onClick={fetchReconciliation} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* Top KPI Cards Row */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="GL Account 1213 Balance"
                value={`₹${Number(data?.glBalance || 0).toFixed(4)}`}
                prefix="₹"
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Authoritative General Ledger balance
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Maintained Subledger Balance"
                value={`₹${Number(data?.maintainedSubledgerBalance || 0).toFixed(4)}`}
                prefix="₹"
                valueStyle={{ color: '#722ed1', fontSize: 20 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sum of active Work Order WIP balances
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Granular Reconstructed Trace"
                value={`₹${Number(data?.granularReconstructedBalance || 0).toFixed(4)}`}
                prefix="₹"
                valueStyle={{ color: '#eb2f96', fontSize: 20 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bottom-up issue & receipt reconstruction
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Three-Way Status</Text>
              </div>
              <div>{renderStatusBadge(data?.reconciliationStatus)}</div>
              {Number(data?.pendingPostingCount || 0) > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="warning" style={{ fontSize: 12 }}>
                    {data?.pendingPostingCount} receipts pending GL post (₹{Number(data?.pendingPostingAmount || 0).toFixed(2)})
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Dynamic Status Alert Banner */}
        {data && (
          <div style={{ marginTop: 16 }}>
            {data.reconciliationStatus === 'BALANCED' && (
              <Alert
                type="success"
                showIcon
                message="WIP General Ledger Perfectly Reconciled"
                description={`GL Control Account 1213 (₹${Number(data.glBalance).toFixed(4)}) is identical to the Maintained Subledger and Bottom-Up Trace. Zero statutory discrepancy detected.`}
              />
            )}
            {data.reconciliationStatus === 'WARNING_PENDING_POSTING' && (
              <Alert
                type="warning"
                showIcon
                message="Pending Financial Postings Detected"
                description={`Physical WIP subledger matches GL, but ${data.pendingPostingCount} production receipts (₹${Number(data.pendingPostingAmount).toFixed(4)}) have been staged but not yet posted to the General Ledger.`}
              />
            )}
            {(data.reconciliationStatus === 'GRANULARITY_DISCREPANCY' ||
              data.reconciliationStatus === 'GL_SUBLEDGER_DISCREPANCY') && (
              <Alert
                type="error"
                showIcon
                message="Statutory Reconciliation Discrepancy Detected"
                description={`GL vs Subledger variance: ₹${Number(data.glVsSubledgerDifference || 0).toFixed(4)} | Granular vs Subledger variance: ₹${Number(data.granularVsSubledgerDifference || 0).toFixed(4)}. Inspect exception items below.`}
              />
            )}
          </div>
        )}

        {/* Period Rollforward Panel */}
        {periodName && data && (
          <Card
            size="small"
            title={`Fiscal Period Rollforward — ${periodName}`}
            style={{ marginTop: 16, backgroundColor: '#fafafa' }}
          >
            <Descriptions size="small" bordered column={5}>
              <Descriptions.Item label="Opening WIP Balance (₹)">
                <Text strong>₹{Number(data.openingWipBalance || 0).toFixed(4)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="(+) Period Issues (₹)">
                <Text strong style={{ color: '#1890ff' }}>
                  +₹{Number(data.periodMaterialIssues || 0).toFixed(4)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="(-) Material Relieved (₹)">
                <Text strong style={{ color: '#3f8600' }}>
                  -₹{Number(data.periodMaterialRelieved || 0).toFixed(4)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="(-) Rework Relief (₹)">
                <Text strong style={{ color: '#722ed1' }}>
                  -₹{Number(data.periodReworkRelief || 0).toFixed(4)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="(=) Closing WIP Balance (₹)">
                <Text strong style={{ color: '#d48806', fontSize: 14 }}>
                  ₹{Number(data.closingWipBalance || 0).toFixed(4)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Diagnostic Exceptions Table */}
        {data && data.exceptionDetails && data.exceptionDetails.length > 0 && (
          <Card
            size="small"
            title={
              <Space>
                <CloseCircleOutlined style={{ color: '#cf1322' }} />
                <span>Reconciliation Diagnostic Exceptions ({data.exceptionDetails.length})</span>
              </Space>
            }
            style={{ marginTop: 16, borderColor: '#ffa39e' }}
          >
            <Table
              dataSource={data.exceptionDetails}
              columns={exceptionColumns}
              rowKey={(r) => `${r.exceptionType}-${r.workOrderId}-${r.sourceDocumentId}`}
              pagination={false}
              size="small"
              bordered
            />
          </Card>
        )}

        {/* Work Orders Contributing to WIP Table */}
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Work Orders Contributing to WIP Subledger</span>
              {data && <Badge count={data.orderSummaries?.length || 0} overflowCount={999} style={{ backgroundColor: '#1890ff' }} />}
            </div>
          }
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={data?.orderSummaries || []}
            columns={orderColumns}
            rowKey="workOrderId"
            pagination={{ pageSize: 15 }}
            size="small"
            bordered
            locale={{
              emptyText: 'No active or unreconciled Work Orders found for this date/period.',
            }}
          />
        </Card>
      </Spin>

      {/* Audit Drilldown Drawer */}
      <WipDrilldownDrawer
        open={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
        workOrderId={selectedOrderId}
        asOfDate={asOfDate ? asOfDate.format('YYYY-MM-DD') : undefined}
      />
    </div>
  )
}
