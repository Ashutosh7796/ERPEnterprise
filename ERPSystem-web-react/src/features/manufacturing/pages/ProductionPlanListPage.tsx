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
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  NodeIndexOutlined,
  SendOutlined,
  PlayCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import { productionPlanApi, ProductionPlanDTO } from '../api/productionPlanApi'
import { ProductionPlanModal } from '../components/ProductionPlanModal'
import { MrpExplosionModal } from '../components/MrpExplosionModal'

const { Text } = Typography

export const ProductionPlanListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ProductionPlanDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ProductionPlanDTO | null>(null)
  const [mrpModalOpen, setMrpModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlanDTO | null>(null)

  const fetchData = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setLoading(true)
    try {
      const res: any = await productionPlanApi.getPlanList({
        currentPage: page,
        pageSize: size,
        planNumber: filters.planNumber,
        status: filters.status,
        demandSource: filters.demandSource,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDataSource(rows)
      setPagination({ current: page, pageSize: size, total })
    } catch (err) {
      console.error('Failed to load Production Plans:', err)
      message.error('Failed to load Production Plans')
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

  const handleCalculateMrp = async (id: number) => {
    try {
      setLoading(true)
      const res: any = await productionPlanApi.calculateMrp(id)
      message.success(`Material Requirements Planning (MRP) completed successfully. Found ${res?.data?.totalShortageCount || res?.totalShortageCount || 0} material shortages.`)
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      console.error('Failed to calculate MRP:', err)
      message.error(err?.message || 'Failed to calculate MRP.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForReview = async (id: number) => {
    try {
      setLoading(true)
      await productionPlanApi.submitPlan(id)
      message.success('Production Plan submitted for review successfully.')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      console.error('Failed to submit plan:', err)
      message.error(err?.message || 'Failed to submit plan.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      setLoading(true)
      await productionPlanApi.approvePlan(id)
      message.success('Production Plan approved successfully.')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      console.error('Failed to approve plan:', err)
      message.error(err?.message || 'Failed to approve plan.')
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (id: number) => {
    try {
      setLoading(true)
      const res: any = await productionPlanApi.releasePlan(id)
      const count = Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 1)
      message.success(`Production Plan released successfully. Generated ${count} Work Orders.`)
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      console.error('Failed to release plan:', err)
      message.error(err?.message || 'Failed to release plan.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    try {
      setLoading(true)
      await productionPlanApi.cancelPlan(id, 'Cancelled from management dashboard')
      message.success('Production Plan cancelled successfully.')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      console.error('Failed to cancel plan:', err)
      message.error(err?.message || 'Failed to cancel plan.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenMrpModal = async (record: ProductionPlanDTO) => {
    try {
      setLoading(true)
      const res: any = await productionPlanApi.getPlanById(record.id!)
      const fullPlan = res?.data || res || record
      setSelectedPlan(fullPlan)
      setMrpModalOpen(true)
    } catch (err) {
      console.error('Failed to load plan details:', err)
      message.error('Failed to load plan details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">DRAFT</Tag>
      case 'CALCULATED':
        return <Tag color="processing">CALCULATED</Tag>
      case 'REVIEW':
        return <Tag color="warning">IN REVIEW</Tag>
      case 'APPROVED':
        return <Tag color="green">APPROVED</Tag>
      case 'RELEASED':
        return <Tag color="blue">RELEASED</Tag>
      case 'COMPLETED':
        return <Tag color="purple">COMPLETED</Tag>
      case 'CANCELLED':
        return <Tag color="error">CANCELLED</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns: TableColumnsType<ProductionPlanDTO> = [
    {
      title: 'Plan Number',
      dataIndex: 'planNumber',
      key: 'planNumber',
      render: (text: string, record: ProductionPlanDTO) => (
        <a onClick={() => handleOpenMrpModal(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Plan Title / Target Batch',
      dataIndex: 'planTitle',
      key: 'planTitle',
      render: (text: string, record: ProductionPlanDTO) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.remark && <Text style={{ fontSize: 12, color: '#888' }}>{record.remark}</Text>}
        </Space>
      ),
    },
    {
      title: 'Demand Source',
      dataIndex: 'demandSource',
      key: 'demandSource',
      width: 130,
      render: (src: string) => {
        const color = src === 'SALES_ORDER' ? 'blue' : src === 'FORECAST' ? 'purple' : 'green'
        return <Tag color={color}>{src || 'MANUAL'}</Tag>
      },
    },
    {
      title: 'Planned Horizon',
      key: 'horizon',
      width: 200,
      render: (_: any, r: ProductionPlanDTO) => (
        <Text style={{ fontSize: 12 }}>
          {r.plannedStartDate ? r.plannedStartDate.substring(0, 10) : ''} ~{' '}
          {r.plannedEndDate ? r.plannedEndDate.substring(0, 10) : ''}
        </Text>
      ),
    },
    {
      title: 'Total Items',
      dataIndex: 'totalItems',
      key: 'totalItems',
      width: 100,
      align: 'center',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val: string) => getStatusTag(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 290,
      render: (_: any, record: ProductionPlanDTO) => (
        <Space size="small">
          {record.status === 'DRAFT' && (
            <Button
              type="primary"
              size="small"
              icon={<NodeIndexOutlined />}
              onClick={() => handleCalculateMrp(record.id!)}
            >
              Execute MRP
            </Button>
          )}

          {record.status === 'CALCULATED' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleSubmitForReview(record.id!)}
              >
                Submit for Review
              </Button>
              <Button size="small" onClick={() => handleOpenMrpModal(record)}>
                Review MRP
              </Button>
            </>
          )}

          {record.status === 'REVIEW' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<AuditOutlined />}
                onClick={() => handleApprove(record.id!)}
              >
                Approve Plan
              </Button>
              <Button size="small" onClick={() => handleOpenMrpModal(record)}>
                Review MRP
              </Button>
            </>
          )}

          {record.status === 'APPROVED' && (
            <>
              <Popconfirm
                title="Release plan and generate Work Orders?"
                description="This will generate topological Work Orders and lock the production plan."
                onConfirm={() => handleRelease(record.id!)}
              >
                <Button type="primary" size="small" icon={<PlayCircleOutlined />}>
                  Release Work Orders
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => handleOpenMrpModal(record)}>
                Review MRP
              </Button>
            </>
          )}

          {record.status === 'RELEASED' && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleOpenMrpModal(record)}>
              View Work Orders
            </Button>
          )}

          {record.status !== 'COMPLETED' && record.status !== 'CANCELLED' && (
            <Popconfirm
              title="Cancel this Production Plan?"
              onConfirm={() => handleCancel(record.id!)}
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
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="planNumber" label="Plan Number">
            <Input placeholder="Search plan number or title" allowClear style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="demandSource" label="Demand Source">
            <Select
              placeholder="All Sources"
              allowClear
              style={{ width: 170 }}
              options={[
                { value: 'SALES_ORDER', label: 'Sales Order Demand' },
                { value: 'FORECAST', label: 'Forecast Demand' },
                { value: 'MANUAL', label: 'Manual Demand' },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              placeholder="All Statuses"
              allowClear
              style={{ width: 150 }}
              options={[
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'CALCULATED', label: 'CALCULATED' },
                { value: 'REVIEW', label: 'IN REVIEW' },
                { value: 'APPROVED', label: 'APPROVED' },
                { value: 'RELEASED', label: 'RELEASED' },
                { value: 'COMPLETED', label: 'COMPLETED' },
                { value: 'CANCELLED', label: 'CANCELLED' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Filter
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Production Plans & Multi-Level MRP Horizons"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null)
              setModalOpen(true)
            }}
          >
            Create Production Plan
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, s) => fetchData(p, s, form.getFieldsValue()),
          }}
        />
      </Card>

      <ProductionPlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
        editingRecord={editingRecord}
      />

      <MrpExplosionModal
        open={mrpModalOpen}
        onClose={() => setMrpModalOpen(false)}
        plan={selectedPlan}
        onRefresh={() => {
          if (selectedPlan) handleOpenMrpModal(selectedPlan)
        }}
      />
    </div>
  )
}
