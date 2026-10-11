import React, { useState, useEffect } from 'react'
import {
  Drawer,
  Descriptions,
  Table,
  Tag,
  Divider,
  Card,
  Row,
  Col,
  Statistic,
  Collapse,
  Space,
  Spin,
} from 'antd'
import {
  FileTextOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { jobWorkApi, JobWorkDetailVo } from '../api/jobWorkApi'

interface JobWorkDetailDrawerProps {
  open: boolean
  onClose: () => void
  jobWorkOrderId: number | null
}

export const JobWorkDetailDrawer: React.FC<JobWorkDetailDrawerProps> = ({
  open,
  onClose,
  jobWorkOrderId,
}) => {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<JobWorkDetailVo | null>(null)

  useEffect(() => {
    if (!open || !jobWorkOrderId) return
    setLoading(true)
    jobWorkApi.getOrderDetail(jobWorkOrderId).then((res: any) => {
      setDetail(res?.data || null)
    }).finally(() => setLoading(false))
  }, [open, jobWorkOrderId])

  if (!detail && !loading) return null

  const order = detail?.order
  const items = detail?.items || []
  const challans = detail?.challans || []
  const receipts = detail?.receipts || []

  const itemColumns = [
    {
      title: 'Material Component',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (text: string, record: any) => (
        <div>
          <b>{text || `Material #${record.materialId}`}</b>
          {record.materialStandard && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.materialStandard}</div>}
        </div>
      ),
    },
    {
      title: 'Dispatched',
      dataIndex: 'dispatchedQty',
      key: 'dispatchedQty',
      render: (v: number) => <span>{v}</span>,
    },
    {
      title: 'Received Back',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v || 0}</span>,
    },
    {
      title: 'Consumed RM',
      dataIndex: 'consumedQty',
      key: 'consumedQty',
      render: (v: number) => <span>{v || 0}</span>,
    },
    {
      title: 'Scrap',
      dataIndex: 'scrappedQty',
      key: 'scrappedQty',
      render: (v: number) => <span>{v || 0}</span>,
    },
    {
      title: 'Pending with JW',
      dataIndex: 'pendingQty',
      key: 'pendingQty',
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: v > 0 ? '#cf1322' : '#52c41a' }}>
          {v}
        </span>
      ),
    },
    {
      title: 'Unit Valuation',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (v: number) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (v: number) => `₹${(v || 0).toFixed(2)}`,
    },
  ]

  const receiptColumns = [
    {
      title: 'Inward Receipt #',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (v: string) => <b>{v}</b>,
    },
    {
      title: 'Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Processed Product',
      dataIndex: 'processedMaterialName',
      key: 'processedMaterialName',
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      render: (v: number) => <Tag color="green">+{v}</Tag>,
    },
    {
      title: 'Consumed RM',
      dataIndex: 'consumedQty',
      key: 'consumedQty',
      render: (v: number) => `-${v}`,
    },
    {
      title: 'Job Work Charges',
      dataIndex: 'jobWorkCharges',
      key: 'jobWorkCharges',
      render: (v: number) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Absorbed Unit Cost',
      dataIndex: 'absorbedUnitCost',
      key: 'absorbedUnitCost',
      render: (v: number) => (
        <Tag color="gold" style={{ fontWeight: 600 }}>
          ₹{(v || 0).toFixed(4)}
        </Tag>
      ),
    },
  ]

  return (
    <Drawer
      title={
        <Space>
          <FileTextOutlined />
          <span>Job Work Execution Audit & Challan History</span>
          {order && <Tag color="blue">{order.orderNumber}</Tag>}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={900}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {order && (
          <div>
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Dispatched Quantity"
                    value={order.totalDispatchedQty || 0}
                    prefix={<HistoryOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Received Back"
                    value={order.totalReceivedQty || 0}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Pending with Job Worker"
                    value={order.totalPendingQty || 0}
                    valueStyle={{ color: order.totalPendingQty > 0 ? '#cf1322' : '#3f8600' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Dispatched Value"
                    value={order.totalCost || 0}
                    precision={2}
                    prefix="₹"
                  />
                </Col>
              </Row>
            </Card>

            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Subcontractor / Job Worker">
                <b>{order.supplierName}</b>
              </Descriptions.Item>
              <Descriptions.Item label="Job Worker GSTIN">
                <code>{order.supplierGstin || 'Unregistered'}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Classification">
                <Tag color="cyan">{order.goodsType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Execution Status">
                <Tag color={order.status === 'COMPLETED' ? 'green' : 'blue'}>{order.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Originating Work Order">
                {order.workOrderNumber || 'Independent Subcontracting'}
              </Descriptions.Item>
              <Descriptions.Item label="Plant Warehouse">
                {order.depotName || `Warehouse #${order.depotId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Statutory Due Date" span={2}>
                <span style={{ fontWeight: 600, color: '#d46b08' }}>
                  {order.statutoryDueDate ? dayjs(order.statutoryDueDate).format('DD/MM/YYYY') : '-'}
                </span>
                <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
                  (Section 143 return deadline: {order.goodsType === 'CAPITAL_GOODS' ? '3 Years' : '1 Year'})
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }}>Dispatched Materials & Pending Reconciliation</Divider>
            <Table
              dataSource={items}
              columns={itemColumns}
              pagination={false}
              size="small"
              rowKey="id"
              bordered
              style={{ marginBottom: 16 }}
            />

            <Divider style={{ margin: '16px 0' }}>Rule 55 Statutory Delivery Challans ({challans.length})</Divider>
            {challans.length === 0 ? (
              <div style={{ color: '#8c8c8c', padding: '8px 0' }}>No Delivery Challans generated yet.</div>
            ) : (
              challans.map((ch) => (
                <Card
                  key={ch.id}
                  size="small"
                  title={
                    <Space>
                      <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                      <span>Delivery Challan: <b>{ch.challanNumber}</b></span>
                      <Tag color="green">Rule 55 Compliant</Tag>
                    </Space>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <Descriptions size="small" column={3} bordered>
                    <Descriptions.Item label="Challan Date">
                      {ch.challanDate ? dayjs(ch.challanDate).format('DD/MM/YYYY') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Vehicle No">
                      {ch.vehicleNumber || 'Not provided'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Transport Mode">
                      {ch.transportMode}
                    </Descriptions.Item>
                    <Descriptions.Item label="Taxable Value">
                      ₹{ch.totalTaxableAmount?.toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Challan Amount">
                      ₹{ch.totalChallanAmount?.toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="E-Way Bill Status">
                      {ch.ewayBillNumber ? (
                        <Tag color="green">{ch.ewayBillNumber}</Tag>
                      ) : ch.ewayBillPayload?.includes('"ewayBillRequired":true') ? (
                        <Tag color="gold">EWB Required — Payload Ready (NIC Live Gateway Not Integrated)</Tag>
                      ) : (
                        <Tag color="default">Exempt / Intra-threshold</Tag>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  {ch.ewayBillPayload && (
                    <Collapse
                      size="small"
                      ghost
                      items={[
                        {
                          key: '1',
                          label: 'View NIC E-Way Bill Dispatch Details (Rule 138)',
                          children: (
                            <pre style={{ background: '#f5f5f5', padding: 8, fontSize: 11, maxHeight: 150, overflow: 'auto' }}>
                              {ch.ewayBillPayload}
                            </pre>
                          ),
                        },
                      ]}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>
              ))
            )}

            <Divider style={{ margin: '16px 0' }}>Inward Returns & Reconciliation History ({receipts.length})</Divider>
            <Table
              dataSource={receipts}
              columns={receiptColumns}
              pagination={false}
              size="small"
              rowKey="id"
              bordered
            />
          </div>
        )}
      </Spin>
    </Drawer>
  )
}
