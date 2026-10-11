import React, { useEffect, useState, useCallback } from 'react'
import {
  Drawer,
  Spin,
  Alert,
  Descriptions,
  Tag,
  Space,
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Button,
  Tabs,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  DollarOutlined,
  ReloadOutlined,
  AuditOutlined,
  SendOutlined,
  InboxOutlined,
  FieldTimeOutlined,
  BookOutlined,
} from '@ant-design/icons'
import {
  workOrderApi,
  WipReconciliationDrilldownDTO,
  IssueDetailDTO,
  ReceiptDetailDTO,
  AbsorptionDetailDTO,
  GlEntryDetailDTO,
} from '../api/workOrderApi'

const { Text } = Typography

interface WipDrilldownDrawerProps {
  open: boolean
  onClose: () => void
  workOrderId: number | null
  asOfDate?: string
}

export const WipDrilldownDrawer: React.FC<WipDrilldownDrawerProps> = ({
  open,
  onClose,
  workOrderId,
  asOfDate,
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WipReconciliationDrilldownDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!workOrderId) return
    setLoading(true)
    setError(null)
    try {
      const res: any = await workOrderApi.getWipDrilldown(workOrderId, asOfDate)
      setData(res?.data || res)
    } catch (err: any) {
      setError(err?.response?.data?.data || err?.message || 'Failed to load WIP drilldown')
    } finally {
      setLoading(false)
    }
  }, [workOrderId, asOfDate])

  useEffect(() => {
    if (open && workOrderId) {
      fetchData()
    } else {
      setData(null)
      setError(null)
    }
  }, [open, workOrderId, fetchData])

  const issueColumns: TableColumnsType<IssueDetailDTO> = [
    {
      title: 'Issue Voucher Number',
      dataIndex: 'issueNumber',
      key: 'issueNumber',
      render: (v) => <span style={{ fontWeight: 600, color: '#722ed1' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
    },
    {
      title: 'Material Cost (₹)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 140,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => <Tag color="green">{v || 'COMPLETED'}</Tag>,
    },
  ]

  const receiptColumns: TableColumnsType<ReceiptDetailDTO> = [
    {
      title: 'Receipt Voucher Number',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (v) => <span style={{ fontWeight: 600, color: '#52c41a' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 110,
    },
    {
      title: 'Received Quantity (FG)',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 130,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Scrap Quantity',
      dataIndex: 'scrappedQty',
      key: 'scrappedQty',
      width: 110,
      render: (v) => <Tag color={Number(v || 0) > 0 ? 'red' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Material Relieved (₹)',
      dataIndex: 'materialCost',
      key: 'materialCost',
      width: 140,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Total Cost (₹)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 140,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Status',
      dataIndex: 'financialStatus',
      key: 'financialStatus',
      width: 140,
      render: (st) => {
        if (st === 'POSTED') return <Tag color="green">POSTED</Tag>
        if (st === 'PENDING_FINANCIAL_POSTING') return <Tag color="orange">PENDING POST</Tag>
        return <Tag>{st || 'PENDING'}</Tag>
      },
    },
    {
      title: 'GL Voucher',
      dataIndex: 'glVoucherNo',
      key: 'glVoucherNo',
      width: 160,
      render: (v) => (v ? <Tag color="cyan">{v}</Tag> : '-'),
    },
  ]

  const absorptionColumns: TableColumnsType<AbsorptionDetailDTO> = [
    {
      title: 'Absorption ID',
      dataIndex: 'absorptionId',
      key: 'absorptionId',
      width: 110,
      render: (v) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: 'Receipt #',
      dataIndex: 'receiptId',
      key: 'receiptId',
      width: 110,
      render: (v) => `Receipt #${v}`,
    },
    {
      title: 'Cost Type',
      dataIndex: 'costType',
      key: 'costType',
      width: 110,
      render: (v) => <Tag color={v === 'LABOR' ? 'geekblue' : 'purple'}>{v}</Tag>,
    },
    {
      title: 'Allocated Time',
      dataIndex: 'allocatedMinutes',
      key: 'allocatedMinutes',
      width: 120,
      render: (v) => `${Number(v || 0).toFixed(2)} mins`,
    },
    {
      title: 'Hourly Rate (₹)',
      dataIndex: 'rateSnapshot',
      key: 'rateSnapshot',
      width: 130,
      render: (v) => `₹${Number(v || 0).toFixed(4)}`,
    },
    {
      title: 'Absorbed Cost (₹)',
      dataIndex: 'absorbedCost',
      key: 'absorbedCost',
      width: 140,
      render: (v) => <Text strong style={{ color: '#d48806' }}>₹{Number(v || 0).toFixed(4)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'allocationStatus',
      key: 'allocationStatus',
      width: 110,
      render: (v) => <Tag color="green">{v || 'COMMITTED'}</Tag>,
    },
  ]

  const glColumns: TableColumnsType<GlEntryDetailDTO> = [
    {
      title: 'GL Entry ID',
      dataIndex: 'glEntryId',
      key: 'glEntryId',
      width: 100,
      render: (v) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: 'Voucher Number',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 170,
      render: (v) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: 'Posting Date',
      dataIndex: 'postingDate',
      key: 'postingDate',
      width: 110,
      render: (d) => String(d || '').slice(0, 10),
    },
    {
      title: 'Account',
      key: 'account',
      width: 200,
      render: (_, r) => (
        <span>
          <Tag color="purple">{r.accountCode}</Tag>
          <Text strong>{r.accountName}</Text>
        </span>
      ),
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      render: (v) => (Number(v || 0) > 0 ? <Text strong style={{ color: '#3f8600' }}>₹{Number(v).toFixed(4)}</Text> : '-'),
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      render: (v) => (Number(v || 0) > 0 ? <Text strong style={{ color: '#cf1322' }}>₹{Number(v).toFixed(4)}</Text> : '-'),
    },
    {
      title: 'Narration',
      dataIndex: 'narration',
      key: 'narration',
      render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
    },
  ]

  return (
    <Drawer
      title={
        <Space>
          <AuditOutlined style={{ color: '#1890ff' }} />
          <span>Work Order WIP Document Drilldown</span>
          {data && <Tag color="blue">{data.orderNumber}</Tag>}
          {data?.isRework && <Tag color="purple">REWORK ORDER</Tag>}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={1000}
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          Refresh
        </Button>
      }
    >
      <Spin spinning={loading}>
        {error && (
          <Alert
            type="error"
            message="Error Loading Drilldown"
            description={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {data && (
          <>
            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order Number">
                <Text strong>{data.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Order Status">
                <Tag color="geekblue">{data.orderStatus}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Financial Status">
                <Tag color={data.financialStatus === 'POSTED' ? 'green' : 'orange'}>
                  {data.financialStatus}
                </Tag>
              </Descriptions.Item>
              {data.isRework && (
                <Descriptions.Item label="Parent Work Order ID" span={3}>
                  <Tag color="purple">Parent WO #{data.parentWorkOrderId}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total Material Issued to WIP"
                    value={`₹${Number(data.materialIssuedTotal || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#1890ff', fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total Material Relieved from WIP"
                    value={`₹${Number(data.materialRelievedTotal || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#3f8600', fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Net Remaining WIP Balance"
                    value={`₹${Number(data.netWipBalance || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: Number(data.netWipBalance || 0) > 0 ? '#d48806' : '#888', fontWeight: 700, fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs
              defaultActiveKey="issues"
              items={[
                {
                  key: 'issues',
                  label: (
                    <span>
                      <SendOutlined /> Material Issues ({data.issues?.length || 0})
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.issues || []}
                      columns={issueColumns}
                      rowKey="issueId"
                      pagination={false}
                      size="small"
                      bordered
                    />
                  ),
                },
                {
                  key: 'receipts',
                  label: (
                    <span>
                      <InboxOutlined /> Production Receipts ({data.receipts?.length || 0})
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.receipts || []}
                      columns={receiptColumns}
                      rowKey="receiptId"
                      pagination={false}
                      size="small"
                      bordered
                    />
                  ),
                },
                {
                  key: 'absorptions',
                  label: (
                    <span>
                      <FieldTimeOutlined /> Cost Absorptions ({data.absorptions?.length || 0})
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.absorptions || []}
                      columns={absorptionColumns}
                      rowKey="absorptionId"
                      pagination={false}
                      size="small"
                      bordered
                    />
                  ),
                },
                {
                  key: 'gl',
                  label: (
                    <span>
                      <BookOutlined /> Statutory GL Entries ({data.glEntries?.length || 0})
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.glEntries || []}
                      columns={glColumns}
                      rowKey="glEntryId"
                      pagination={false}
                      size="small"
                      bordered
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Spin>
    </Drawer>
  )
}
