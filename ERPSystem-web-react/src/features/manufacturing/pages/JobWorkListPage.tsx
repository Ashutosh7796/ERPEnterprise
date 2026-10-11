import React, { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Popconfirm,
  Tooltip,
  Badge,
  App,
} from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  InboxOutlined,
  EyeOutlined,
  StopOutlined,
  SearchOutlined,
  ReloadOutlined,
  BuildOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@/core/api/client'
import { jobWorkApi, JobWorkOrder } from '../api/jobWorkApi'
import { JobWorkOrderModal } from '../components/JobWorkOrderModal'
import { JobWorkDispatchModal } from '../components/JobWorkDispatchModal'
import { JobWorkReceiptModal } from '../components/JobWorkReceiptModal'
import { JobWorkDetailDrawer } from '../components/JobWorkDetailDrawer'

const { Title, Text } = Typography

export const JobWorkListPage: React.FC = () => {
  const { message } = App.useApp()
  const [orders, setOrders] = useState<JobWorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [goodsTypeFilter, setGoodsTypeFilter] = useState<string>('')
  const [supplierFilter, setSupplierFilter] = useState<number | undefined>(undefined)
  const [suppliers, setSuppliers] = useState<any[]>([])

  // Modals & Drawer state
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<JobWorkOrder | null>(null)

  useEffect(() => {
    // Load suppliers for filter
    http.get('/supplier/findBySelect_sup', { params: { type: '供应商' } }).then((res: any) => {
      const data = res?.data || res || []
      setSuppliers(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res: any = await jobWorkApi.getOrderList({
        supplierId: supplierFilter,
        status: statusFilter || undefined,
        goodsType: goodsTypeFilter || undefined,
        currentPage,
        pageSize,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      const totalCount = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setOrders(rows)
      setTotal(totalCount)
    } catch (e: any) {
      message.error(e.message || 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, pageSize, statusFilter, goodsTypeFilter, supplierFilter])

  const handleCancelOrder = async (id: number) => {
    try {
      const res: any = await jobWorkApi.cancelOrder(id)
      if (res?.code === 200) {
        message.success('Order cancelled successfully')
        fetchOrders()
      } else {
        message.error(res?.data || 'Failed to cancel order')
      }
    } catch (e: any) {
      message.error(e.message || 'Cancellation failed')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge status="default" text="Draft" />
      case 'APPROVED':
        return <Badge status="processing" text="Approved" />
      case 'DISPATCHED':
        return <Badge status="warning" text="Dispatched" />
      case 'PARTIALLY_RECEIVED':
        return <Badge color="orange" text="Partially Received" />
      case 'COMPLETED':
        return <Badge status="success" text="Completed" />
      case 'CANCELLED':
        return <Badge status="error" text="Cancelled" />
      default:
        return <Badge status="default" text={status} />
    }
  }

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 160,
      render: (text: string, record: JobWorkOrder) => (
        <a
          onClick={() => {
            setSelectedOrder(record)
            setDrawerOpen(true)
          }}
          style={{ fontWeight: 600 }}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Subcontractor / Job Worker',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 220,
      render: (text: string, record: JobWorkOrder) => (
        <div>
          <div><b>{text}</b></div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            GSTIN: {record.supplierGstin || 'Unregistered'}
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'goodsType',
      key: 'goodsType',
      width: 130,
      render: (type: string) => (
        <Tag color={type === 'CAPITAL_GOODS' ? 'purple' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: 'Work Order Reference',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 150,
      render: (v: string) => v || <Text type="secondary">-</Text>,
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Due Date',
      dataIndex: 'statutoryDueDate',
      key: 'statutoryDueDate',
      width: 150,
      render: (date: string, record: JobWorkOrder) => {
        if (!date) return '-'
        const due = dayjs(date)
        const isOverdue = due.isBefore(dayjs()) && record.totalPendingQty > 0
        return (
          <span style={{ color: isOverdue ? '#cf1322' : '#d46b08', fontWeight: isOverdue ? 700 : 500 }}>
            {due.format('DD/MM/YYYY')}
            {isOverdue && <Tag color="error" style={{ marginLeft: 4 }}>OVERDUE</Tag>}
          </span>
        )
      },
    },
    {
      title: 'Dispatched Quantity',
      dataIndex: 'totalDispatchedQty',
      key: 'totalDispatchedQty',
      width: 130,
      align: 'right' as const,
      render: (v: number) => v || 0,
    },
    {
      title: 'Received Quantity',
      dataIndex: 'totalReceivedQty',
      key: 'totalReceivedQty',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v || 0}</span>,
    },
    {
      title: 'Pending Quantity',
      dataIndex: 'totalPendingQty',
      key: 'totalPendingQty',
      width: 130,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: v > 0 ? '#cf1322' : '#52c41a' }}>
          {v || 0}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: JobWorkOrder) => (
        <Space size="small">
          {(record.status === 'DRAFT' || record.status === 'APPROVED') && (
            <Tooltip title="Dispatch Materials & Delivery Challan">
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => {
                  setSelectedOrder(record)
                  setDispatchModalOpen(true)
                }}
              >
                Dispatch
              </Button>
            </Tooltip>
          )}

          {(record.status === 'DISPATCHED' || record.status === 'PARTIALLY_RECEIVED') && (
            <Tooltip title="Receive Processed Goods">
              <Button
                type="default"
                size="small"
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                icon={<InboxOutlined />}
                onClick={() => {
                  setSelectedOrder(record)
                  setReceiptModalOpen(true)
                }}
              >
                Receive
              </Button>
            </Tooltip>
          )}

          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedOrder(record)
                setDrawerOpen(true)
              }}
            />
          </Tooltip>

          {(record.status === 'DRAFT' || record.status === 'APPROVED') && (
            <Popconfirm
              title="Cancel Job Work Order"
              description="Are you sure you want to cancel this order?"
              onConfirm={() => handleCancelOrder(record.id)}
            >
              <Button type="text" danger size="small" icon={<StopOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <BuildOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              Job Work & Subcontracting Orders
            </Title>
            <Text type="secondary">
              Manage job work orders, material dispatches, delivery challans, and processed goods receipts.
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOrderModalOpen(true)}
            >
              Create Job Work Order
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              showSearch
              allowClear
              placeholder="Filter by Job Worker"
              optionFilterProp="label"
              value={supplierFilter}
              onChange={(val) => setSupplierFilter(val)}
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.supplier || s.name}`,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              allowClear
              placeholder="Filter by Status"
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'DISPATCHED', label: 'Dispatched' },
                { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              allowClear
              placeholder="Filter by Goods Type"
              value={goodsTypeFilter || undefined}
              onChange={(val) => setGoodsTypeFilter(val || '')}
              options={[
                { value: 'INPUT', label: 'Inputs & RM' },
                { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
                { value: 'CAPITAL_GOODS', label: 'Capital Goods' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless">
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1450 }}
          bordered
          size="middle"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setCurrentPage(p)
              setPageSize(s)
            },
          }}
        />
      </Card>

      <JobWorkOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSuccess={fetchOrders}
      />

      <JobWorkDispatchModal
        open={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onSuccess={fetchOrders}
        order={selectedOrder}
      />

      <JobWorkReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        onSuccess={fetchOrders}
        order={selectedOrder}
      />

      <JobWorkDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        jobWorkOrderId={selectedOrder?.id || null}
      />
    </div>
  )
}
