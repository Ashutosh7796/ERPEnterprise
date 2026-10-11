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
  Divider,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  DollarOutlined,
  ReloadOutlined,
  PieChartOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  workOrderApi,
  ReceiptCostBreakdownDTO,
  WorkOrderCostAbsorptionDTO,
} from '../api/workOrderApi'

const { Text } = Typography

interface ReceiptCostBreakdownDrawerProps {
  open: boolean
  onClose: () => void
  receiptId: number | null
}

export const ReceiptCostBreakdownDrawer: React.FC<ReceiptCostBreakdownDrawerProps> = ({
  open,
  onClose,
  receiptId,
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReceiptCostBreakdownDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!receiptId) return
    setLoading(true)
    setError(null)
    try {
      const res: any = await workOrderApi.getReceiptBreakdown(receiptId)
      setData(res?.data || res)
    } catch (err: any) {
      setError(err?.response?.data?.data || err?.message || 'Failed to load receipt cost breakdown')
    } finally {
      setLoading(false)
    }
  }, [receiptId])

  useEffect(() => {
    if (open && receiptId) {
      fetchData()
    } else {
      setData(null)
      setError(null)
    }
  }, [open, receiptId, fetchData])

  const renderStatusTag = (status?: string) => {
    switch (status) {
      case 'POSTED':
        return <Tag color="green"><CheckCircleOutlined /> POSTED</Tag>
      case 'PENDING_FINANCIAL_POSTING':
        return <Tag color="orange"><WarningOutlined /> PENDING FINANCIAL POSTING</Tag>
      case 'PENDING_COSTING':
        return <Tag color="default">PENDING COSTING</Tag>
      case 'REVERSED':
        return <Tag color="red">REVERSED</Tag>
      default:
        return <Tag>{status || 'UNKNOWN'}</Tag>
    }
  }

  const allocationColumns: TableColumnsType<WorkOrderCostAbsorptionDTO> = [
    {
      title: 'Allocation ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (v) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: 'Cost Type',
      dataIndex: 'rateType',
      key: 'rateType',
      width: 110,
      render: (v) => (
        <Tag color={v === 'LABOR' ? 'geekblue' : 'purple'}>
          {v || 'LABOR'}
        </Tag>
      ),
    },
    {
      title: 'Source Time Log',
      dataIndex: 'timeLogId',
      key: 'timeLogId',
      width: 130,
      render: (v) => (v ? `Time Log #${v}` : '-'),
    },
    {
      title: 'Allocated Time',
      dataIndex: 'allocatedMinutes',
      key: 'allocatedMinutes',
      width: 120,
      render: (v) => `${Number(v || 0).toFixed(2)} mins`,
    },
    {
      title: 'Hourly Rate Snapshot (₹)',
      dataIndex: 'hourlyRateSnapshot',
      key: 'hourlyRateSnapshot',
      width: 150,
      render: (v) => `₹${Number(v || 0).toFixed(4)}/hr`,
    },
    {
      title: 'Absorbed Cost (₹)',
      dataIndex: 'absorbedCost',
      key: 'absorbedCost',
      width: 140,
      render: (v) => (
        <Text strong style={{ color: '#d48806' }}>
          ₹{Number(v || 0).toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'allocationStatus',
      key: 'allocationStatus',
      width: 110,
      render: (v) => <Tag color="green">{v || 'COMMITTED'}</Tag>,
    },
  ]

  return (
    <Drawer
      title={
        <Space>
          <PieChartOutlined style={{ color: '#1890ff' }} />
          <span>Manufacturing Actual Cost Breakdown</span>
          {data && <Tag color="blue">{data.receiptNumber}</Tag>}
          {data && renderStatusTag(data.financialStatus)}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={950}
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
            message="Error Loading Cost Breakdown"
            description={error}
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" danger onClick={fetchData}>
                Retry
              </Button>
            }
          />
        )}

        {data && (
          <>
            {/* Header Descriptions */}
            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Receipt Voucher #">{data.receiptNumber}</Descriptions.Item>
              <Descriptions.Item label="Work Order Ref">
                <Text strong>{data.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Received FG Quantity">
                <Tag color="green" style={{ fontSize: 13, fontWeight: 600 }}>
                  {data.receivedQty} units
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Scrapped Quantity">
                <Tag color={Number(data.scrappedQty || 0) > 0 ? 'red' : 'default'}>
                  {data.scrappedQty || 0} units
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Order Type">
                {data.isRework ? (
                  <Tag color="purple">REWORK ({data.reworkType || 'NORMAL'})</Tag>
                ) : (
                  <Tag color="blue">STANDARD PRODUCTION</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Statutory Financial Status">
                {renderStatusTag(data.financialStatus)}
              </Descriptions.Item>
            </Descriptions>

            {/* Cost Summary KPI Cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Actual Material Cost"
                    value={`₹${Number(data.materialCost || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#1890ff', fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Actual Labor Cost"
                    value={`₹${Number(data.laborCost || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#722ed1', fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Actual Overhead Cost"
                    value={`₹${Number(data.overheadCost || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#eb2f96', fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Incurred Cost"
                    value={`₹${Number(data.totalIncurredCost || 0).toFixed(4)}`}
                    prefix="₹"
                    valueStyle={{ color: '#d48806', fontWeight: 600, fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Ind AS 2 Scrap & Yield Analysis */}
            <Card
              size="small"
              title={
                <Space>
                  <AuditOutlined />
                  <span>Ind AS 2 Valuation, Scrap Segregation & FG Capitalization</span>
                </Space>
              }
              style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Normal Scrap Allowance"
                    value={`${Number(data.normalScrapAllowanceQty || 0).toFixed(2)} units (${Number(data.expectedScrapPct || 0).toFixed(2)}%)`}
                    valueStyle={{ fontSize: 14 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Absorbed into Finished Goods inventory valuation
                  </Text>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Abnormal Scrap Loss (P&L 5402)"
                    value={`₹${Number(data.abnormalScrapLoss || 0).toFixed(4)} (${Number(data.abnormalScrapQty || 0).toFixed(2)} units)`}
                    valueStyle={{ color: Number(data.abnormalScrapLoss || 0) > 0 ? '#cf1322' : '#3f8600', fontSize: 14 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Written off directly to Period Expense Account 5402
                  </Text>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Net FG Capitalization (GL 1212)"
                    value={`₹${Number(data.fgCapitalization || 0).toFixed(4)}`}
                    valueStyle={{ color: '#3f8600', fontWeight: 700, fontSize: 18 }}
                  />
                  <Text strong style={{ color: '#52c41a', fontSize: 12 }}>
                    Effective Unit Cost: ₹{Number(data.fgUnitCost || 0).toFixed(4)} / unit
                  </Text>
                </Col>
              </Row>
            </Card>

            <Divider style={{ margin: '12px 0', fontSize: 14 }}>
              Shift Time-Log Cost Allocation Register
            </Divider>

            <Table
              dataSource={data.allocations || []}
              columns={allocationColumns}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              locale={{
                emptyText: 'No time-log allocations staged for this receipt batch.',
              }}
            />
          </>
        )}
      </Spin>
    </Drawer>
  )
}
