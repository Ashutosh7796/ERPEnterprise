import React, { useEffect, useState } from 'react'
import { Drawer, Table, Tag, Progress, Spin, message, Typography, Space, Descriptions } from 'antd'
import { getPoFulfillmentDetails, PoFulfillmentLine } from '../api/procurementApi'

const { Title, Text } = Typography

interface Props {
  visible: boolean
  poId: number | null
  poNumber: string
  onClose: () => void
}

export const PoLineFulfillmentDrawer: React.FC<Props> = ({ visible, poId, poNumber, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<PoFulfillmentLine[]>([])

  useEffect(() => {
    if (visible && poId) {
      fetchFulfillment()
    }
  }, [visible, poId])

  const fetchFulfillment = async () => {
    if (!poId) return
    setLoading(true)
    try {
      const res = await getPoFulfillmentDetails(poId)
      if (res.data?.data) {
        setLines(res.data.data)
      } else {
        setLines([])
      }
    } catch (err: any) {
      message.error('Failed to load fulfillment balances: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Item ID',
      dataIndex: 'materialId',
      key: 'materialId',
      width: 100,
    },
    {
      title: 'Ordered Quantity',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      render: (v: number) => <Text strong>{Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Received Quantity (Gross)',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      render: (v: number) => Number(v).toFixed(2),
    },
    {
      title: 'Accepted Quantity',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      render: (v: number) => <Text type="success">{Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Rejected Quantity',
      dataIndex: 'rejectedQuantity',
      key: 'rejectedQuantity',
      render: (v: number) => (
        <Text type={Number(v) > 0 ? 'danger' : 'secondary'}>
          {Number(v).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Invoiced Quantity',
      dataIndex: 'invoicedQuantity',
      key: 'invoicedQuantity',
      render: (v: number) => Number(v).toFixed(2),
    },
    {
      title: 'Remaining Balance',
      dataIndex: 'remainingReceiptQuantity',
      key: 'remainingReceiptQuantity',
      render: (v: number, record: PoFulfillmentLine) => {
        const pct = record.orderedQuantity > 0 ? Math.min(100, Math.round(((record.orderedQuantity - v) / record.orderedQuantity) * 100)) : 0
        return (
          <Space orientation="vertical" size={2} style={{ width: '100%' }}>
            <Text>{Number(v).toFixed(2)}</Text>
            <Progress percent={pct} size="small" status={Number(v) <= 0 ? 'success' : 'active'} />
          </Space>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default'
        if (status === 'RECEIVED' || status === 'FULLY_BILLED') color = 'success'
        if (status === 'PARTIALLY_RECEIVED' || status === 'PARTIALLY_INVOICED') color = 'processing'
        if (status === 'CANCELLED') color = 'error'
        return <Tag color={color}>{status || 'OPEN'}</Tag>
      },
    },
  ]

  const totalOrdered = lines.reduce((sum, l) => sum + Number(l.orderedQuantity || 0), 0)
  const totalAccepted = lines.reduce((sum, l) => sum + Number(l.acceptedQuantity || 0), 0)
  const totalInvoiced = lines.reduce((sum, l) => sum + Number(l.invoicedQuantity || 0), 0)

  return (
    <Drawer
      title={`PO Fulfillment Lineage: ${poNumber || ''}`}
      placement="right"
      size={850}
      onClose={onClose}
      open={visible}
    >
      <Spin spinning={loading}>
        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Total Ordered Quantity">{totalOrdered.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total Accepted Quantity">{totalAccepted.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total Invoiced Quantity">{totalInvoiced.toFixed(2)}</Descriptions.Item>
        </Descriptions>

        <Table
          dataSource={lines}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Spin>
    </Drawer>
  )
}
