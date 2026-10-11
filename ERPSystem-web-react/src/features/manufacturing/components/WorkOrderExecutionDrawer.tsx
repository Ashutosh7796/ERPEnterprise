import React, { useEffect, useState, useCallback } from 'react'
import {
  Drawer,
  Tabs,
  Table,
  Tag,
  Space,
  Descriptions,
  Badge,
  Spin,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tooltip,
  Modal,
  Input,
  message,
  Alert,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SafetyCertificateOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PieChartOutlined,
  CalculatorOutlined,
  LockOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import { workOrderApi, WorkOrderDTO, WorkOrderExecutionVo, WorkOrderIssueDTO, WorkOrderReceiptDTO } from '../api/workOrderApi'
import { ReceiptCostBreakdownDrawer } from './ReceiptCostBreakdownDrawer'
import { ReceiptCostCalculationModal } from './ReceiptCostCalculationModal'
import { ReceiptFinancialPostingModal } from './ReceiptFinancialPostingModal'

const { Text } = Typography

interface WorkOrderExecutionDrawerProps {
  open: boolean
  onClose: () => void
  workOrderId: number | null
}

export const WorkOrderExecutionDrawer: React.FC<WorkOrderExecutionDrawerProps> = ({
  open,
  onClose,
  workOrderId,
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WorkOrderExecutionVo | null>(null)

  // Sub-modal states
  const [breakdownReceiptId, setBreakdownReceiptId] = useState<number | null>(null)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const [calcReceipt, setCalcReceipt] = useState<WorkOrderReceiptDTO | null>(null)
  const [calcOpen, setCalcOpen] = useState(false)

  const [postingReceipt, setPostingReceipt] = useState<WorkOrderReceiptDTO | null>(null)
  const [postingOpen, setPostingOpen] = useState(false)

  const [reverseReceiptId, setReverseReceiptId] = useState<number | null>(null)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [reverseReason, setReverseReason] = useState('')
  const [reverseSubmitting, setReverseSubmitting] = useState(false)

  const userAuth = useAppStore((state) => state.userAuth)
  const permissions = useAuthStore((state) => state.permissions)
  const canFinancialPost =
    Boolean(userAuth?.isSuperAdmin ||
    userAuth?.isTenantAdmin ||
    userAuth?.authorityDomain === 'PLATFORM' ||
    permissions?.includes('WORK_ORDER_FINANCIAL_POST') ||
    permissions?.includes('FINANCE_ACCOUNT_MANAGE'))

  const fetchHistory = useCallback(() => {
    if (!workOrderId) return
    setLoading(true)
    workOrderApi.getExecutionHistory(workOrderId)
      .then((res: any) => {
        setData(res?.data || res)
      })
      .catch((err) => {
        console.error('Failed to load execution history', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [workOrderId])

  useEffect(() => {
    if (!open || !workOrderId) return
    fetchHistory()
  }, [open, workOrderId, fetchHistory])

  const handleReverseGl = async () => {
    if (!reverseReceiptId) return
    if (!reverseReason.trim()) {
      message.error('Please enter a mandatory reversal reason')
      return
    }
    setReverseSubmitting(true)
    try {
      await workOrderApi.reverseReceiptGl(reverseReceiptId, reverseReason)
      message.success('General ledger posting reversed successfully!')
      setReverseOpen(false)
      setReverseReason('')
      fetchHistory()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'GL reversal failed')
    } finally {
      setReverseSubmitting(false)
    }
  }

  const order: WorkOrderDTO | undefined = data?.order
  const snapshotItems = data?.snapshotItems || []
  const issues = data?.issues || []
  const receipts = data?.receipts || []
  const operations = order?.operations || []

  const planned = Number(order?.plannedQty || 0)
  const completed = Number(order?.completedQty || 0)
  const scrapped = Number(order?.scrappedQty || 0)
  const remaining = Math.max(0, planned - completed - scrapped)
  const actualCost = Number(order?.actualUnitCost || 0).toFixed(4)

  const operationColumns = [
    {
      title: 'Seq',
      dataIndex: 'operationSeq',
      key: 'operationSeq',
      width: 60,
      render: (v: number) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: 'Operation Name',
      dataIndex: 'operationName',
      key: 'operationName',
      render: (v: string, r: any) => (
        <div>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {r.isOutsource === 1 ? (
            <div style={{ marginTop: 2 }}>
              <Tag color="purple">SUBCONTRACTED</Tag>
              {r.supplierName && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Vendor: {r.supplierName}
                </Text>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 2 }}>
              <Tag color="cyan">IN-HOUSE</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Work Center / Facility',
      dataIndex: 'workCenterType',
      key: 'workCenterType',
      render: (v: string, r: any) => {
        if (r.isOutsource === 1) {
          return (
            <Tooltip title={r.supplierName ? `Subcontract Partner: ${r.supplierName}` : 'Subcontracted External Process'}>
              <Tag color="magenta">EXTERNAL VENDOR</Tag>
            </Tooltip>
          )
        }
        return <Tag color="geekblue">{v || 'INTERNAL'}</Tag>
      },
    },
    {
      title: 'Execution Output',
      key: 'executionOutput',
      width: 130,
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12 }}>
          Good: <b>{r.completedQty || 0}</b><br />
          Rejected: <span style={{ color: r.rejectedQty ? '#cf1322' : 'inherit' }}>{r.rejectedQty || 0}</span>
        </span>
      ),
    },
    {
      title: 'Cycle Time (mins)',
      dataIndex: 'standardCycleTimeMins',
      key: 'standardCycleTimeMins',
      width: 130,
      render: (v: number) => `${v || 0} min/unit`,
    },
    {
      title: 'Setup Time',
      dataIndex: 'setupTimeMins',
      key: 'setupTimeMins',
      width: 100,
      render: (v: number) => `${v || 0} min`,
    },
    {
      title: 'Total Planned Time',
      dataIndex: 'totalPlannedTimeMins',
      key: 'totalPlannedTimeMins',
      width: 140,
      render: (v: number) => <Tag color="purple">{v || 0} mins</Tag>,
    },
    {
      title: 'Locations (Target / WIP)',
      key: 'locations',
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12 }}>
          Target: {r.targetDepotName || '-'}{r.targetBinName ? ` / ${r.targetBinName}` : ''}<br />
          WIP: {r.wipDepotName || '-'}{r.wipBinName ? ` / ${r.wipBinName}` : ''}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string, r: any) => {
        let color = 'default'
        if (v === 'COMPLETED') color = 'green'
        else if (v === 'IN_PROGRESS') color = 'processing'
        else if (v === 'READY') color = 'cyan'
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color}>{v || 'PENDING'}</Tag>
            {r.isOutsource === 1 && r.activeJobWorkOrderNumber && (
              <Tooltip title="Linked Active Job Work Order">
                <Tag color="geekblue" style={{ fontSize: 11 }}>{r.activeJobWorkOrderNumber}</Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  const componentColumns = [
    {
      title: 'Component Material',
      key: 'material',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.componentName || `Material #${r.componentMaterialId}`}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Model: {r.componentModel || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Required Quantity (Frozen)',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 130,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Issued Quantity',
      dataIndex: 'issuedQty',
      key: 'issuedQty',
      width: 120,
      render: (v: number) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: 'Consumed Quantity',
      dataIndex: 'consumedQty',
      key: 'consumedQty',
      width: 140,
      render: (v: number) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Current WIP Balance',
      key: 'wipBalance',
      width: 150,
      render: (_: any, r: any) => {
        const bal = Math.max(0, Number(r.issuedQty || 0) - Number(r.consumedQty || 0))
        return <Tag color={bal > 0 ? 'green' : 'default'} style={{ fontWeight: 600 }}>{bal}</Tag>
      },
    },
  ]

  const issueColumns = [
    {
      title: 'Issue Voucher Number',
      dataIndex: 'issueNumber',
      key: 'issueNumber',
      render: (v: string) => <span style={{ fontWeight: 600, color: '#722ed1' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
    },
    {
      title: 'Lines',
      dataIndex: 'totalLines',
      key: 'totalLines',
      width: 80,
    },
    {
      title: 'Total Valuation Cost (₹)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 150,
      render: (v: number) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color="green">{v}</Tag>,
    },
  ]

  const receiptColumns: TableColumnsType<WorkOrderReceiptDTO> = [
    {
      title: 'Receipt Voucher Number',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (v: string) => <span style={{ fontWeight: 600, color: '#52c41a' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 100,
    },
    {
      title: 'Received Quantity (FG)',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 105,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Scrap Quantity',
      dataIndex: 'scrappedQty',
      key: 'scrappedQty',
      width: 80,
      render: (v: number) => <Tag color={Number(v || 0) > 0 ? 'red' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Financial Status',
      dataIndex: 'financialStatus',
      key: 'financialStatus',
      width: 140,
      render: (st: string) => {
        if (st === 'POSTED') return <Tag color="green"><CheckCircleOutlined /> POSTED</Tag>
        if (st === 'PENDING_FINANCIAL_POSTING') return <Tag color="orange">PENDING POST</Tag>
        if (st === 'REVERSED') return <Tag color="red">REVERSED</Tag>
        return <Tag color="default">{st || 'PENDING COSTING'}</Tag>
      },
    },
    {
      title: 'Absorbed Unit Cost (₹)',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 130,
      render: (v: number) => <Tag color="gold" style={{ fontWeight: 600 }}>₹{Number(v || 0).toFixed(4)}</Tag>,
    },
    {
      title: 'Total Valuation (₹)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (v: number) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'GL Voucher',
      dataIndex: 'glVoucherNo',
      key: 'glVoucherNo',
      width: 140,
      render: (v?: string) => (v ? <Tag color="cyan">{v}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, r: WorkOrderReceiptDTO) => (
        <Space size={2}>
          <Tooltip title="View Cost Breakdown & Ledger">
            <Button
              size="small"
              type="text"
              icon={<PieChartOutlined style={{ color: '#1890ff' }} />}
              onClick={() => {
                setBreakdownReceiptId(r.id!)
                setBreakdownOpen(true)
              }}
            />
          </Tooltip>

          {r.financialStatus !== 'POSTED' && r.financialStatus !== 'REVERSED' && (
            <Tooltip title="Calculate & Stage Actual Cost">
              <Button
                size="small"
                type="text"
                icon={<CalculatorOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => {
                  setCalcReceipt(r)
                  setCalcOpen(true)
                }}
              />
            </Tooltip>
          )}

          {r.financialStatus === 'PENDING_FINANCIAL_POSTING' && (
            <Tooltip
              title={
                canFinancialPost
                  ? 'Post to General Ledger'
                  : 'Statutory GL posting requires WORK_ORDER_FINANCIAL_POST permission'
              }
            >
              <Button
                size="small"
                type="text"
                disabled={!canFinancialPost}
                icon={<LockOutlined style={{ color: canFinancialPost ? '#52c41a' : '#bfbfbf' }} />}
                onClick={() => {
                  setPostingReceipt(r)
                  setPostingOpen(true)
                }}
              />
            </Tooltip>
          )}

          {r.financialStatus === 'POSTED' && (
            <Tooltip
              title={
                canFinancialPost
                  ? 'Reverse Posted GL Voucher'
                  : 'GL reversal requires WORK_ORDER_FINANCIAL_POST permission'
              }
            >
              <Button
                size="small"
                type="text"
                danger
                disabled={!canFinancialPost}
                icon={<UndoOutlined />}
                onClick={() => {
                  setReverseReceiptId(r.id!)
                  setReverseReason('')
                  setReverseOpen(true)
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Drawer
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
          <span>Work Order Execution Audit & History</span>
          {order && <Tag color="blue">{order.orderNumber}</Tag>}
          {order && (
            <Tag color={order.status === 'COMPLETED' ? 'green' : order.status === 'IN_PROGRESS' ? 'processing' : 'default'}>
              {order.status}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={950}
    >
      <Spin spinning={loading}>
        {order && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Planned Quantity" value={planned} prefix={<SyncOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Completed Good Quantity" value={completed} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Remaining Quantity" value={remaining} valueStyle={{ color: remaining > 0 ? '#cf1322' : '#888' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Actual Unit Cost" value={`₹${actualCost}`} valueStyle={{ color: '#d48806' }} prefix={<DollarOutlined />} />
                </Card>
              </Col>
            </Row>

            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Item to Manufacture (FG)">{order.materialName} ({order.materialModel || '-'})</Descriptions.Item>
              <Descriptions.Item label="Manufacturing Plant">{order.depotName || `Plant #${order.depotId}`}</Descriptions.Item>
              <Descriptions.Item label="Shop-Floor WIP Storage Bin">
                <Tag color="cyan">{order.wipBinName || `Bin #${order.wipBinId}`}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Master BOM Ref">{order.bomCode} (Rev {order.bomRevision})</Descriptions.Item>
              <Descriptions.Item label="Start Date">{order.startDate}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{order.dueDate}</Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Tabs
          defaultActiveKey="components"
          items={[
            {
              key: 'components',
              label: (
                <span>
                  <Badge count={snapshotItems.length} offset={[10, 0]} size="small">
                    Component Snapshot & WIP Balances
                  </Badge>
                </span>
              ),
              children: (
                <Table
                  dataSource={snapshotItems}
                  columns={componentColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  bordered
                />
              ),
            },
            {
              key: 'issues',
              label: (
                <span>
                  <Badge count={issues.length} offset={[10, 0]} size="small">
                    Material Issue Vouchers
                  </Badge>
                </span>
              ),
              children: (
                <Table
                  dataSource={issues}
                  columns={issueColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  bordered
                  expandable={{
                    expandedRowRender: (record: WorkOrderIssueDTO) => (
                      <Table
                        dataSource={record.items || []}
                        columns={[
                          { title: 'Component', dataIndex: 'componentMaterialName', key: 'comp' },
                          { title: 'Source Warehouse', dataIndex: 'sourceDepotName', key: 'depot' },
                          { title: 'Source Storage Bin', dataIndex: 'sourceBinName', key: 'bin', render: (v: any) => v || '-' },
                          { title: 'Quantity', dataIndex: 'issueQty', key: 'qty', render: (v: number) => <Tag color="blue">{v}</Tag> },
                          { title: 'Unit Rate (₹)', dataIndex: 'unitCost', key: 'rate', render: (v: number) => `₹${Number(v || 0).toFixed(4)}` },
                          { title: 'Line Cost (₹)', dataIndex: 'totalCost', key: 'cost', render: (v: number) => `₹${Number(v || 0).toFixed(4)}` },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    ),
                  }}
                />
              ),
            },
            {
              key: 'receipts',
              label: (
                <span>
                  <Badge count={receipts.length} offset={[10, 0]} size="small">
                    Production Receipts & Costs
                  </Badge>
                </span>
              ),
              children: (
                <Table
                  dataSource={receipts}
                  columns={receiptColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  bordered
                />
              ),
            },
            {
              key: 'operations',
              label: (
                <span>
                  <Badge count={operations.length} offset={[10, 0]} size="small">
                    Frozen Routing Operations
                  </Badge>
                </span>
              ),
              children: (
                <Table
                  dataSource={operations}
                  columns={operationColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  bordered
                />
              ),
            },
          ]}
        />

        <ReceiptCostBreakdownDrawer
          open={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          receiptId={breakdownReceiptId}
        />

        <ReceiptCostCalculationModal
          open={calcOpen}
          onClose={() => setCalcOpen(false)}
          onSuccess={fetchHistory}
          receipt={calcReceipt}
          workOrderId={workOrderId}
        />

        <ReceiptFinancialPostingModal
          open={postingOpen}
          onClose={() => setPostingOpen(false)}
          onSuccess={fetchHistory}
          receipt={postingReceipt}
        />

        <Modal
          title="Reverse Statutory General Ledger Posting"
          open={reverseOpen}
          onCancel={() => setReverseOpen(false)}
          onOk={handleReverseGl}
          confirmLoading={reverseSubmitting}
          okText="Confirm Statutory Reversal"
          okButtonProps={{ danger: true }}
        >
          <Alert
            type="warning"
            showIcon
            message="Statutory Reversal Policy"
            description="Reversing this receipt will post offsetting GL entries (Cr 1212 / Dr 1213) and transition the receipt to REVERSED. An audit trail reason is mandatory."
            style={{ marginBottom: 16 }}
          />
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Mandatory Reversal Reason:
            </label>
            <Input.TextArea
              rows={3}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="State the commercial or technical reason for reversing this posted receipt..."
            />
          </div>
        </Modal>
      </Spin>
    </Drawer>
  )
}
