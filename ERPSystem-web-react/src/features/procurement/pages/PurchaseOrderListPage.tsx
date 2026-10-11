import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Popconfirm,
  message,
  Tooltip,
  Modal,
  Statistic,
  Empty,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  SendOutlined,
  BranchesOutlined,
  EyeOutlined,
  StopOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { useAuthStore } from '@core/auth/authStore'
import { submitPurchaseOrder, cancelPurchaseOrder } from '../api/procurementApi'
import { PoLineFulfillmentDrawer } from '../components/PoLineFulfillmentDrawer'
import { PurchaseOrderApprovalModal } from '../components/PurchaseOrderApprovalModal'
import { PurchaseOrderHistoryModal } from '../components/PurchaseOrderHistoryModal'
import { BillModal } from '@/features/bill/components/BillModal'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

export const PurchaseOrderListPage: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const currentUserId = user?.id || 0

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modals state
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const [fulfillmentDrawerOpen, setFulfillmentDrawerOpen] = useState(false)
  const [selectedPoForFulfillment, setSelectedPoForFulfillment] = useState<{ id: number; number: string } | null>(null)

  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedPoForApproval, setSelectedPoForApproval] = useState<{ id: number; number: string; total: number; creator: number } | null>(null)

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedPoForHistory, setSelectedPoForHistory] = useState<{ id: number; number: string } | null>(null)

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: any = {
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
        type: '其它',
        subType: '采购订单',
      }

      if (values.number) params.number = values.number
      if (values.status !== undefined && values.status !== '') params.status = values.status
      if (values.dateRange && values.dateRange.length === 2) {
        params.beginTime = dayjs(values.dateRange[0]).format('YYYY-MM-DD 00:00:00')
        params.endTime = dayjs(values.dateRange[1]).format('YYYY-MM-DD 23:59:59')
      }

      const res: any = await http.get('/depotHead/list', { params })
      if (res && res.code === 200) {
        setDataSource(res.data?.rows || [])
        setPagination((prev) => ({ ...prev, total: res.data?.total || 0 }))
      } else {
        setDataSource([])
      }
    } catch (err: any) {
      message.error('Failed to load purchase orders: ' + (err.message || 'Server error'))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, form])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [fetchPurchaseOrders])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchPurchaseOrders()
  }

  const handleReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchPurchaseOrders()
  }

  const handleSubmitForApproval = async (record: any) => {
    try {
      await submitPurchaseOrder(record.id)
      message.success(`Purchase Order '${record.number}' submitted for approval successfully.`)
      fetchPurchaseOrders()
    } catch (err: any) {
      message.error(err.message || 'Failed to submit for approval')
    }
  }

  const handleCancelPo = async (record: any) => {
    try {
      await cancelPurchaseOrder(record.id, 'Cancelled by user')
      message.success(`Purchase Order '${record.number}' cancelled successfully.`)
      fetchPurchaseOrders()
    } catch (err: any) {
      message.error(err.message || 'Failed to cancel Purchase Order')
    }
  }

  const kpis = useMemo(() => {
    const totalCount = pagination.total || dataSource.length
    const draftCount = dataSource.filter((po) => po.status === '0').length
    const pendingCount = dataSource.filter((po) => po.status === '2').length
    const approvedCount = dataSource.filter((po) => po.status === '1').length
    const totalVal = dataSource.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0)
    return { totalCount, draftCount, pendingCount, approvedCount, totalVal }
  }, [pagination.total, dataSource])

  const getStatusTag = (status: string) => {
    switch (status) {
      case '0':
        return <Tag color="default">DRAFT</Tag>
      case '1':
        return <Tag color="success">APPROVED</Tag>
      case '2':
        return <Tag color="processing">PENDING APPROVAL</Tag>
      case '3':
        return <Tag color="error">REJECTED</Tag>
      case '4':
        return <Tag color="purple">CANCELLED</Tag>
      default:
        return <Tag color="default">UNKNOWN ({status})</Tag>
    }
  }

  const columns: TableColumnsType<any> = [
    {
      title: 'PO Number',
      dataIndex: 'number',
      key: 'number',
      render: (num: string, record: any) => (
        <a
          style={{ fontWeight: 600 }}
          onClick={() => {
            setSelectedPoForFulfillment({ id: record.id, number: num })
            setFulfillmentDrawerOpen(true)
          }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'organName',
      key: 'organName',
    },
    {
      title: 'Order Date',
      dataIndex: 'operTime',
      key: 'operTime',
      render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Total Amount (₹)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      render: (amt: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          ₹{Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Approval Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 280,
      render: (_, record: any) => {
        const isCreator = record.creator && Number(record.creator) === Number(currentUserId)
        const isDraft = record.status === '0'
        const isPending = record.status === '2'
        const isApproved = record.status === '1'
        const isRejected = record.status === '3'

        return (
          <Space size="small">
            {/* View Fulfillment Lineage */}
            <Tooltip title="View Line-Level Fulfillment Balances">
              <Button
                size="small"
                icon={<BranchesOutlined />}
                onClick={() => {
                  setSelectedPoForFulfillment({ id: record.id, number: record.number })
                  setFulfillmentDrawerOpen(true)
                }}
              />
            </Tooltip>

            {/* Approval History */}
            <Tooltip title="View Approval Audit History">
              <Button
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => {
                  setSelectedPoForHistory({ id: record.id, number: record.number })
                  setHistoryModalOpen(true)
                }}
              />
            </Tooltip>

            {/* Submit for Approval */}
            {(isDraft || isRejected) && (
              <Tooltip title="Submit for Manager Approval">
                <Button
                  size="small"
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleSubmitForApproval(record)}
                >
                  Submit for Approval
                </Button>
              </Tooltip>
            )}

            {/* Approve / Reject Decision */}
            {isPending && (
              <Tooltip
                title={
                  isCreator
                    ? 'SoD Policy Violation: Creator cannot approve own Purchase Order'
                    : 'Review & Approve / Reject Purchase Order'
                }
              >
                <Button
                  size="small"
                  type="primary"
                  style={{ backgroundColor: isCreator ? undefined : '#52c41a', borderColor: isCreator ? undefined : '#52c41a' }}
                  disabled={isCreator}
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setSelectedPoForApproval({
                      id: record.id,
                      number: record.number,
                      total: record.totalPrice,
                      creator: record.creator,
                    })
                    setApprovalModalOpen(true)
                  }}
                >
                  Review & Approve
                </Button>
              </Tooltip>
            )}

            {/* Cancel PO */}
            {isApproved && (
              <Popconfirm
                title="Cancel Purchase Order"
                description="Cancel this Purchase Order? Cancellation is prevented if goods receipts exist."
                onConfirm={() => handleCancelPo(record)}
                okText="Cancel Purchase Order"
                cancelText="Dismiss"
              >
                <Button size="small" danger icon={<StopOutlined />}>
                  Cancel
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 20 }}>
      {/* Executive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ color: '#1677ff', marginRight: 10 }} />
            Purchase Orders
          </Title>
          <Text type="secondary">
            Manage procurement commitments, line-level fulfillment tracking, multi-tier approvals, and SoD audit history.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPurchaseOrders}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null)
              setBillModalOpen(true)
            }}
          >
            Create Purchase Order
          </Button>
        </Space>
      </div>

      {/* KPI Statistic Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Total Purchase Orders"
              value={kpis.totalCount}
              prefix={<ShoppingCartOutlined style={{ color: '#1677ff' }} />}
              styles={{ content: { fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Pending Approval"
              value={kpis.pendingCount}
              prefix={<ClockCircleOutlined style={{ color: kpis.pendingCount > 0 ? '#fa8c16' : '#8c8c8c' }} />}
              styles={{ content: { color: kpis.pendingCount > 0 ? '#fa8c16' : undefined, fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Approved Orders"
              value={kpis.approvedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a', fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Committed Value (Page)"
              value={kpis.totalVal}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#1677ff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Form form={form} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={8} md={7}>
              <Form.Item name="number" label="PO Number" style={{ width: '100%', margin: 0 }}>
                <Input placeholder="Enter PO Number..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="status" label="Status" style={{ width: '100%', margin: 0 }}>
                <Select placeholder="Filter by status" allowClear>
                  <Select.Option value="0">Draft</Select.Option>
                  <Select.Option value="2">Pending Approval</Select.Option>
                  <Select.Option value="1">Approved</Select.Option>
                  <Select.Option value="3">Rejected</Select.Option>
                  <Select.Option value="4">Cancelled</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={7}>
              <Form.Item name="dateRange" label="Date Range" style={{ width: '100%', margin: 0 }}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={4} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Main Table */}
      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No purchase orders found matching the filter criteria."
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingRecord(null)
                    setBillModalOpen(true)
                  }}
                >
                  Create Purchase Order
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Total ${total} Purchase Orders`,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total })
            },
          }}
        />
      </Card>

      {/* Bill Creation/Edit Modal */}
      {billModalOpen && (
        <BillModal
          open={billModalOpen}
          type="其它"
          subType="采购订单"
          title={editingRecord ? 'Edit Purchase Order' : 'New Purchase Order'}
          prefixNo="CGDD"
          editingRecord={editingRecord}
          onClose={() => {
            setBillModalOpen(false)
            setEditingRecord(null)
          }}
          onSuccess={() => {
            setBillModalOpen(false)
            setEditingRecord(null)
            fetchPurchaseOrders()
          }}
        />
      )}

      {/* Line Fulfillment Drawer */}
      <PoLineFulfillmentDrawer
        visible={fulfillmentDrawerOpen}
        poId={selectedPoForFulfillment?.id || null}
        poNumber={selectedPoForFulfillment?.number || ''}
        onClose={() => {
          setFulfillmentDrawerOpen(false)
          setSelectedPoForFulfillment(null)
        }}
      />

      {/* Approval Modal */}
      <PurchaseOrderApprovalModal
        visible={approvalModalOpen}
        poId={selectedPoForApproval?.id || null}
        poNumber={selectedPoForApproval?.number || ''}
        orderTotal={selectedPoForApproval?.total || 0}
        creatorId={selectedPoForApproval?.creator || 0}
        currentUserId={currentUserId}
        onClose={() => {
          setApprovalModalOpen(false)
          setSelectedPoForApproval(null)
        }}
        onSuccess={() => {
          setApprovalModalOpen(false)
          setSelectedPoForApproval(null)
          fetchPurchaseOrders()
        }}
      />

      {/* Approval Audit History Modal */}
      <PurchaseOrderHistoryModal
        visible={historyModalOpen}
        poId={selectedPoForHistory?.id || null}
        poNumber={selectedPoForHistory?.number || ''}
        onClose={() => {
          setHistoryModalOpen(false)
          setSelectedPoForHistory(null)
        }}
      />
    </div>
  )
}
