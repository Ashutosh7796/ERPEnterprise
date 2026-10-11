import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Popconfirm,
  message,
  Tooltip,
  Typography,
  Progress,
  Drawer,
  Alert,
  Descriptions,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  InboxOutlined,
  SendOutlined,
  HistoryOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import { workOrderApi, WorkOrderDTO, WorkOrderItemDTO } from '../api/workOrderApi'
import { WorkOrderModal } from '../components/WorkOrderModal'
import { MaterialIssueModal } from '../components/MaterialIssueModal'
import { ProductionReceiptModal } from '../components/ProductionReceiptModal'
import { WorkOrderExecutionDrawer } from '../components/WorkOrderExecutionDrawer'
import { ReworkSettlementModal } from '../components/ReworkSettlementModal'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'

const { Text } = Typography

export const WorkOrderListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<WorkOrderDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modal & Drawer State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WorkOrderDTO | null>(null)

  const [snapshotDrawerOpen, setSnapshotDrawerOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDTO | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)

  // Execution modals state
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [executionDrawerOpen, setExecutionDrawerOpen] = useState(false)
  const [actionRecord, setActionRecord] = useState<WorkOrderDTO | null>(null)

  // Rework settlement state
  const [reworkSettlementModalOpen, setReworkSettlementModalOpen] = useState(false)
  const [selectedRwo, setSelectedRwo] = useState<WorkOrderDTO | null>(null)

  // SoD authorization check
  const userAuth = useAppStore((state) => state.userAuth)
  const permissions = useAuthStore((state) => state.permissions)
  const canSettleRework =
    Boolean(userAuth?.isSuperAdmin ||
    userAuth?.isTenantAdmin ||
    userAuth?.authorityDomain === 'PLATFORM' ||
    permissions?.includes('WORK_ORDER_FINANCIAL_POST') ||
    permissions?.includes('FINANCE_ACCOUNT_MANAGE'))

  const fetchData = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setLoading(true)
    try {
      const res: any = await workOrderApi.getWorkOrderList({
        currentPage: page,
        pageSize: size,
        orderNumber: filters.orderNumber,
        status: filters.status,
      })
      let rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      if (filters.orderType === 'REWORK') {
        rows = rows.filter((r: WorkOrderDTO) => Boolean(r.isRework))
      } else if (filters.orderType === 'STANDARD') {
        rows = rows.filter((r: WorkOrderDTO) => !r.isRework)
      }
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDataSource(rows)
      setPagination({ current: page, pageSize: size, total })
    } catch (err) {
      console.error('Failed to load Work Orders:', err)
      message.error('Failed to load Work Orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(1, 10)
  }, [fetchData])

  const handleSearch = () => {
    fetchData(1, pagination.pageSize, form.getFieldsValue())
  }

  const handleReset = () => {
    form.resetFields()
    fetchData(1, pagination.pageSize)
  }

  const handleConfirm = async (id: number) => {
    try {
      setLoading(true)
      const res: any = await workOrderApi.confirmWorkOrder(id)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Work Order confirmed and BOM component snapshot frozen!')
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error(res?.data || res?.message || 'Confirmation failed')
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.data || err?.message || 'Confirmation error'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    try {
      setLoading(true)
      const res: any = await workOrderApi.cancelWorkOrder(id)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Work Order cancelled')
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error(res?.data || res?.message || 'Cancellation failed')
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.data || err?.message || 'Cancellation error'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res: any = await workOrderApi.deleteWorkOrder(id)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Work Order deleted')
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error(res?.data || res?.message || 'Delete failed')
      }
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Delete error')
    }
  }

  const viewSnapshot = async (record: WorkOrderDTO) => {
    setSnapshotDrawerOpen(true)
    setSnapshotLoading(true)
    setSelectedWorkOrder(record)
    try {
      const res: any = await workOrderApi.getWorkOrderById(record.id!)
      if (res && res.code === 200 && res.data) {
        setSelectedWorkOrder(res.data)
      }
    } catch (err) {
      console.error('Failed to load snapshot details:', err)
    } finally {
      setSnapshotLoading(false)
    }
  }

  const columns: TableColumnsType<WorkOrderDTO> = [
    {
      title: 'Action',
      key: 'action',
      width: 220,
      align: 'center',
      render: (_: any, record: WorkOrderDTO) => (
        <Space size={2}>
          <Tooltip title="View Component Requirements Snapshot">
            <Button
              type="text"
              size="small"
              icon={<FileProtectOutlined style={{ color: '#1890ff', fontSize: 14 }} />}
              onClick={() => viewSnapshot(record)}
            />
          </Tooltip>

          <Tooltip title="View Execution Audit & Timeline">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined style={{ color: '#722ed1', fontSize: 14 }} />}
              onClick={() => {
                setActionRecord(record)
                setExecutionDrawerOpen(true)
              }}
            />
          </Tooltip>

          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Confirm Work Order?"
              description="This will lock the recipe and freeze the component requirement snapshot for shop floor execution."
              onConfirm={() => record.id && handleConfirm(record.id)}
            >
              <Tooltip title="Confirm Order & Freeze Snapshot">
                <Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />} />
              </Tooltip>
            </Popconfirm>
          )}

          {(record.status === 'CONFIRMED' || record.status === 'IN_PROGRESS') && (
            <Tooltip title="Issue Raw Materials to WIP">
              <Button
                type="text"
                size="small"
                icon={<SendOutlined style={{ color: '#eb2f96', fontSize: 14 }} />}
                onClick={() => {
                  setActionRecord(record)
                  setIssueModalOpen(true)
                }}
              />
            </Tooltip>
          )}

          {record.status === 'IN_PROGRESS' && (
            <Tooltip title="Receive Finished Goods & Absorb Cost">
              <Button
                type="text"
                size="small"
                icon={<InboxOutlined style={{ color: '#fa8c16', fontSize: 14 }} />}
                onClick={() => {
                  setActionRecord(record)
                  setReceiptModalOpen(true)
                }}
              />
            </Tooltip>
          )}

          {record.isRework && record.status !== 'CLOSED' && (
            <Tooltip
              title={
                canSettleRework
                  ? 'Settle Rework Order (Ind AS 2)'
                  : 'Requires WORK_ORDER_FINANCIAL_POST or FINANCE_ACCOUNT_MANAGE permission'
              }
            >
              <Button
                type="text"
                size="small"
                disabled={!canSettleRework}
                icon={<BranchesOutlined style={{ color: canSettleRework ? '#722ed1' : '#bfbfbf', fontSize: 14 }} />}
                onClick={() => {
                  setSelectedRwo(record)
                  setReworkSettlementModalOpen(true)
                }}
              />
            </Tooltip>
          )}

          {(record.status === 'DRAFT' || record.status === 'CONFIRMED') && (
            <Popconfirm
              title="Cancel Work Order?"
              onConfirm={() => record.id && handleCancel(record.id)}
            >
              <Tooltip title="Cancel Order">
                <Button type="text" danger size="small" icon={<StopOutlined style={{ fontSize: 14 }} />} />
              </Tooltip>
            </Popconfirm>
          )}

          {(record.status === 'DRAFT' || record.status === 'CANCELLED') && (
            <Popconfirm
              title="Delete draft order?"
              onConfirm={() => record.id && handleDelete(record.id)}
            >
              <Tooltip title="Delete Work Order">
                <Button type="text" danger size="small" icon={<DeleteOutlined style={{ fontSize: 14 }} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 170,
      render: (val: string, record: WorkOrderDTO) => (
        <div>
          <a onClick={() => viewSnapshot(record)} style={{ fontWeight: 600 }}>
            {val}
          </a>
          {record.isRework && (
            <div style={{ marginTop: 2 }}>
              <Tag color="purple" icon={<BranchesOutlined />} style={{ fontSize: 11 }}>
                REWORK
              </Tag>
              {record.parentOrderNumber && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Parent: #{record.parentOrderNumber}
                </Text>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Item to Manufacture (FG)',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 200,
      render: (val: string, record: WorkOrderDTO) => (
        <div>
          <Text strong>{val || `Item #${record.materialId}`}</Text>
          {record.barCode && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Barcode: {record.barCode}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Bill of Materials (BOM)',
      dataIndex: 'bomCode',
      key: 'bomCode',
      width: 150,
      render: (val: string, record: WorkOrderDTO) => (
        <div>
          <Text>{val || `BOM #${record.bomId}`}</Text>
          {record.bomRevision && (
            <div>
              <Tag color="blue" style={{ fontSize: 11 }}>v{record.bomRevision}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Planned Quantity',
      dataIndex: 'plannedQty',
      key: 'plannedQty',
      width: 120,
      align: 'right',
      render: (val: number, record: WorkOrderDTO) => (
        <span>
          <strong>{Number(val || 0).toFixed(2)}</strong> {record.materialUnit || 'units'}
        </span>
      ),
    },
    {
      title: 'Production Progress',
      key: 'progress',
      width: 160,
      render: (_: any, record: WorkOrderDTO) => {
        const planned = Number(record.plannedQty || 1)
        const completed = Number(record.completedQty || 0)
        const percent = Math.min(100, Math.round((completed / planned) * 100))
        return (
          <div>
            <Progress percent={percent} size="small" status={percent >= 100 ? 'success' : 'active'} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {completed} / {planned} {record.materialUnit || 'units'}
            </Text>
          </div>
        )
      },
    },
    {
      title: 'Plant / Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      width: 140,
      render: (val: string) => val || '-',
    },
    {
      title: 'WIP Storage Bin',
      dataIndex: 'wipBinName',
      key: 'wipBinName',
      width: 150,
      render: (val: string, record: WorkOrderDTO) => (
        <Space>
          <Tag color="purple">{val || record.wipBinCode || `Bin #${record.wipBinId}`}</Tag>
        </Space>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (val: string) => val ? val.slice(0, 10) : '-',
    },
    {
      title: 'Actual Unit Cost',
      dataIndex: 'actualUnitCost',
      key: 'actualUnitCost',
      width: 140,
      align: 'right',
      render: (val: number) => (
        <Tag color={Number(val || 0) > 0 ? 'gold' : 'default'} style={{ fontWeight: 600 }}>
          ₹{Number(val || 0).toFixed(4)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => {
        if (status === 'CONFIRMED') return <Tag color="blue">CONFIRMED</Tag>
        if (status === 'DRAFT') return <Tag color="gold">DRAFT</Tag>
        if (status === 'IN_PROGRESS') return <Tag color="purple">IN_PROGRESS</Tag>
        if (status === 'COMPLETED') return <Tag color="green">COMPLETED</Tag>
        if (status === 'CLOSED') return <Tag color="cyan">CLOSED</Tag>
        if (status === 'CANCELLED') return <Tag color="default">CANCELLED</Tag>
        return <Tag>{status}</Tag>
      },
    },
    {
      title: 'Financial Status',
      dataIndex: 'financialStatus',
      key: 'financialStatus',
      width: 150,
      align: 'center',
      render: (status: string) => {
        if (!status || status === 'PENDING_COSTING') return <Tag color="gold">PENDING COSTING</Tag>
        if (status === 'PENDING_FINANCIAL_POSTING') return <Tag color="orange">PENDING POSTING</Tag>
        if (status === 'POSTED') return <Tag color="green">POSTED</Tag>
        if (status === 'SETTLED') return <Tag color="purple">SETTLED</Tag>
        if (status === 'REVERSED') return <Tag color="red">REVERSED</Tag>
        return <Tag>{status}</Tag>
      },
    },
  ]

  const snapshotColumns = [
    {
      title: 'Component Raw Material',
      dataIndex: 'componentName',
      key: 'componentName',
      render: (val: string, record: WorkOrderItemDTO) => (
        <div>
          <Text strong>{val || `Material #${record.componentMaterialId}`}</Text>
          {record.barCode && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Barcode: {record.barCode}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Specification',
      dataIndex: 'componentStandard',
      key: 'componentStandard',
      width: 140,
      render: (val: string, record: WorkOrderItemDTO) => `${val || ''} ${record.componentModel || ''}`.trim() || '-',
    },
    {
      title: 'Required Quantity',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 160,
      align: 'right' as const,
      render: (val: number, record: WorkOrderItemDTO) => (
        <Text strong style={{ color: '#1890ff', fontSize: 14 }}>
          {Number(val || 0).toFixed(4)} {record.componentUnit || ''}
        </Text>
      ),
    },
    {
      title: 'Issued Quantity',
      dataIndex: 'issuedQty',
      key: 'issuedQty',
      width: 120,
      align: 'right' as const,
      render: (val: number) => `${Number(val || 0).toFixed(2)}`,
    },
    {
      title: 'Consumed Quantity',
      dataIndex: 'consumedQty',
      key: 'consumedQty',
      width: 110,
      align: 'right' as const,
      render: (val: number) => `${Number(val || 0).toFixed(2)}`,
    },
    {
      title: 'Scrap Quantity',
      dataIndex: 'scrappedQty',
      key: 'scrappedQty',
      width: 100,
      align: 'right' as const,
      render: (val: number) => `${Number(val || 0).toFixed(2)}`,
    },
  ]

  return (
    <Card
      title={
        <Space>
          <InboxOutlined style={{ color: '#1890ff', fontSize: 18 }} />
          <span>Production Work Orders & Execution Lifecycle</span>
        </Space>
      }
      variant="borderless"
      style={{ margin: 16 }}
    >
      {/* Search Header */}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} style={{ width: '100%' }}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="orderNumber" style={{ width: '100%' }}>
              <Input placeholder="Search order #, finished good..." allowClear prefix={<SearchOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="orderType" style={{ width: '100%' }}>
              <Select placeholder="All Order Types" allowClear>
                <Select.Option value="STANDARD">Standard Orders</Select.Option>
                <Select.Option value="REWORK">Rework Orders</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="status" style={{ width: '100%' }}>
              <Select placeholder="Filter status..." allowClear>
                <Select.Option value="DRAFT">DRAFT</Select.Option>
                <Select.Option value="CONFIRMED">CONFIRMED</Select.Option>
                <Select.Option value="IN_PROGRESS">IN_PROGRESS</Select.Option>
                <Select.Option value="COMPLETED">COMPLETED</Select.Option>
                <Select.Option value="CLOSED">CLOSED</Select.Option>
                <Select.Option value="CANCELLED">CANCELLED</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={10}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Search
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
              <Button
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRecord(null)
                  setModalOpen(true)
                }}
              >
                Create Work Order
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* Main Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        bordered
        size="middle"
        scroll={{ x: 1350 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} Orders`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Create / Edit Modal */}
      <WorkOrderModal
        open={modalOpen}
        editingRecord={editingRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())}
      />

      {/* Frozen Component Snapshot Drawer */}
      <Drawer
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <span>Frozen Component Snapshot — {selectedWorkOrder?.orderNumber}</span>
          </Space>
        }
        open={snapshotDrawerOpen}
        onClose={() => setSnapshotDrawerOpen(false)}
        width={880}
      >
        {selectedWorkOrder && (
          <div>
            <Alert
              type="success"
              showIcon
              message="Immutable Component Requirements Snapshot"
              description="These component requirements were frozen upon order confirmation and are permanently independent of subsequent Master BOM changes."
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order Number">{selectedWorkOrder.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedWorkOrder.status === 'CONFIRMED' ? 'blue' : 'gold'}>
                  {selectedWorkOrder.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Item to Manufacture (FG)">{selectedWorkOrder.materialName}</Descriptions.Item>
              <Descriptions.Item label="Planned Quantity">
                <strong>{selectedWorkOrder.plannedQty}</strong> {selectedWorkOrder.materialUnit}
              </Descriptions.Item>
              <Descriptions.Item label="Manufacturing Plant">{selectedWorkOrder.depotName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Shop-Floor WIP Bin">
                <Tag color="purple">{selectedWorkOrder.wipBinName || selectedWorkOrder.wipBinCode || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="BOM Reference">
                {selectedWorkOrder.bomCode} (v{selectedWorkOrder.bomRevision || '1.0'})
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">{selectedWorkOrder.dueDate ? selectedWorkOrder.dueDate.slice(0, 10) : '-'}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14 }}>
                Component Requirements Lines
              </Text>
            </div>

            <Table
              rowKey="id"
              columns={snapshotColumns as any}
              dataSource={selectedWorkOrder.items || []}
              loading={snapshotLoading}
              pagination={false}
              size="middle"
              bordered
            />
          </div>
        )}
      </Drawer>

      {/* Material Issue to WIP Modal */}
      <MaterialIssueModal
        open={issueModalOpen}
        order={actionRecord}
        onClose={() => setIssueModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())}
      />

      {/* Production Receipt & Cost Absorption Modal */}
      <ProductionReceiptModal
        open={receiptModalOpen}
        order={actionRecord}
        onClose={() => setReceiptModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())}
      />

      {/* Work Order Execution & Audit Drawer */}
      <WorkOrderExecutionDrawer
        open={executionDrawerOpen}
        workOrderId={actionRecord?.id || null}
        onClose={() => setExecutionDrawerOpen(false)}
      />

      {/* Rework Order Settlement Modal */}
      <ReworkSettlementModal
        open={reworkSettlementModalOpen}
        rwo={selectedRwo}
        onClose={() => {
          setReworkSettlementModalOpen(false)
          setSelectedRwo(null)
        }}
        onSuccess={() => {
          setReworkSettlementModalOpen(false)
          setSelectedRwo(null)
          fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
        }}
      />
    </Card>
  )
}
