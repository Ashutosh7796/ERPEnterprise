import React, { useEffect, useState } from 'react'
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
} from 'antd'
import {
  SafetyCertificateOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { workOrderApi, WorkOrderDTO, WorkOrderExecutionVo, WorkOrderIssueDTO, WorkOrderReceiptDTO } from '../api/workOrderApi'

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

  useEffect(() => {
    if (!open || !workOrderId) return
    setLoading(true)
    workOrderApi.getExecutionHistory(workOrderId)
      .then((res: any) => {
        setData(res?.data || res)
      })
      .catch(err => {
        console.error('Failed to load execution history', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, workOrderId])

  const order: WorkOrderDTO | undefined = data?.order
  const snapshotItems = data?.snapshotItems || []
  const issues = data?.issues || []
  const receipts = data?.receipts || []

  const planned = Number(order?.plannedQty || 0)
  const completed = Number(order?.completedQty || 0)
  const scrapped = Number(order?.scrappedQty || 0)
  const remaining = Math.max(0, planned - completed - scrapped)
  const actualCost = Number(order?.actualUnitCost || 0).toFixed(4)

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
      title: 'Required (Frozen)',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 130,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Issued to WIP',
      dataIndex: 'issuedQty',
      key: 'issuedQty',
      width: 120,
      render: (v: number) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: 'Consumed from WIP',
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
      title: 'Issue Voucher #',
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
      title: 'Total Valuation Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 150,
      render: (v: number) => `$${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color="green">{v}</Tag>,
    },
  ]

  const receiptColumns = [
    {
      title: 'Receipt Voucher #',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (v: string) => <span style={{ fontWeight: 600, color: '#52c41a' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 110,
    },
    {
      title: 'Received FG',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 120,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Scrap',
      dataIndex: 'scrappedQty',
      key: 'scrappedQty',
      width: 90,
      render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Absorbed Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 140,
      render: (v: number) => <Tag color="gold" style={{ fontWeight: 600 }}>${Number(v || 0).toFixed(4)}</Tag>,
    },
    {
      title: 'Total Absorbed Value',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 150,
      render: (v: number) => `$${Number(v || 0).toFixed(4)}`,
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
                  <Statistic title="Completed FG" value={completed} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Remaining Qty" value={remaining} valueStyle={{ color: remaining > 0 ? '#cf1322' : '#888' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Actual Unit Cost" value={`$${actualCost}`} valueStyle={{ color: '#d48806' }} prefix={<DollarOutlined />} />
                </Card>
              </Col>
            </Row>

            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Finished Good">{order.materialName} ({order.materialModel || '-'})</Descriptions.Item>
              <Descriptions.Item label="Manufacturing Plant">{order.depotName || `Depot #${order.depotId}`}</Descriptions.Item>
              <Descriptions.Item label="Shop-Floor WIP Bin">
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
                          { title: 'Source Depot', dataIndex: 'sourceDepotName', key: 'depot' },
                          { title: 'Source Bin', dataIndex: 'sourceBinName', key: 'bin', render: (v: any) => v || '-' },
                          { title: 'Quantity', dataIndex: 'issueQty', key: 'qty', render: (v: number) => <Tag color="blue">{v}</Tag> },
                          { title: 'Unit Rate', dataIndex: 'unitCost', key: 'rate', render: (v: number) => `$${Number(v || 0).toFixed(4)}` },
                          { title: 'Line Cost', dataIndex: 'totalCost', key: 'cost', render: (v: number) => `$${Number(v || 0).toFixed(4)}` },
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
          ]}
        />
      </Spin>
    </Drawer>
  )
}
