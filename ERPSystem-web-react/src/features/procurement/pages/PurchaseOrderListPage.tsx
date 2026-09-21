import React, { useEffect, useState, useCallback } from 'react'
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
      message.success(`Purchase Order ${record.number} submitted for approval`)
      fetchPurchaseOrders()
    } catch (err: any) {
      message.error(err.message || 'Failed to submit for approval')
    }
  }

  const handleCancelPo = async (record: any) => {
    try {
      await cancelPurchaseOrder(record.id, 'Cancelled by user')
      message.success(`Purchase Order ${record.number} cancelled`)
      fetchPurchaseOrders()
    } catch (err: any) {
      message.error(err.message || 'Failed to cancel Purchase Order')
    }
  }

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
      title: 'Total Amount',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      render: (amt: number) => `₹${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
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
                  Submit
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
                  Decision
                </Button>
              </Tooltip>
            )}

            {/* Cancel PO */}
            {isApproved && (
              <Popconfirm
                title="Cancel Purchase Order"
                description="Are you sure you want to cancel this approved PO? Blocked if goods receipt exists."
                onConfirm={() => handleCancelPo(record)}
                okText="Yes, Cancel"
                cancelText="No"
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
    <div style={{ padding: 16 }}>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={8} md={6}>
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
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="dateRange" label="Date Range" style={{ width: '100%', margin: 0 }}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={6} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#1890ff' }}
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingRecord(null)
                    setBillModalOpen(true)
                  }}
                >
                  New PO
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
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
