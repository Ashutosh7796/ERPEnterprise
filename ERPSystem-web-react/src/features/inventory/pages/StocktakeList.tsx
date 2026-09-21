import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  DatePicker,
  Tag,
  Modal,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { stocktakeApi, StocktakeSession } from '../api/stocktakeApi'
import { StocktakeModal } from '../components/StocktakeModal'

const { RangePicker } = DatePicker
const { Text } = Typography

export const StocktakeListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<StocktakeSession[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [depotList, setDepotList] = useState<any[]>([])

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedStocktakeId, setSelectedStocktakeId] = useState<number | null>(null)

  useEffect(() => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setDepotList(list)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      let startDate = ''
      let endDate = ''
      if (values.dateRange && values.dateRange.length === 2) {
        startDate = values.dateRange[0].format('YYYY-MM-DD')
        endDate = values.dateRange[1].format('YYYY-MM-DD')
      }

      const res: any = await stocktakeApi.getStocktakeList({
        currentPage: page,
        pageSize,
        depotId: values.depotId,
        status: values.status,
        sessionNumber: values.sessionNumber,
        startDate,
        endDate,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load stocktake sessions:', err)
      message.error(err.message || 'Failed to load stocktake sessions')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateSubmit = async (values: any) => {
    setCreating(true)
    try {
      const res: any = await stocktakeApi.createStocktake({
        depotId: values.depotId,
        remark: values.remark,
      })
      message.success('Stocktake session initiated successfully')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchData()

      const createdId = res?.data?.id || res?.id
      if (createdId) {
        setSelectedStocktakeId(createdId)
        setDetailModalOpen(true)
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to initiate stocktake')
    } finally {
      setCreating(false)
    }
  }

  const columns: TableColumnsType<StocktakeSession> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Session Number',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      width: 170,
      render: (text, record) => (
        <a
          onClick={() => {
            setSelectedStocktakeId(record.id)
            setDetailModalOpen(true)
          }}
          style={{ fontWeight: 600, color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      width: 150,
    },
    {
      title: 'Session Date',
      dataIndex: 'sessionDate',
      key: 'sessionDate',
      width: 120,
      render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      title: 'Total SKUs',
      dataIndex: 'totalItems',
      key: 'totalItems',
      width: 90,
      align: 'right',
      render: (v) => v || 0,
    },
    {
      title: 'Variance Qty',
      dataIndex: 'totalVarianceQty',
      key: 'totalVarianceQty',
      width: 110,
      align: 'right',
      render: (v) => {
        const val = Number(v || 0)
        return (
          <strong style={{ color: val > 0 ? '#52c41a' : val < 0 ? '#f5222d' : '#8c8c8c' }}>
            {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
          </strong>
        )
      },
    },
    {
      title: 'Variance Valuation',
      dataIndex: 'totalVarianceValue',
      key: 'totalVarianceValue',
      width: 130,
      align: 'right',
      render: (v) => {
        const val = Number(v || 0)
        return (
          <span style={{ color: val > 0 ? '#52c41a' : val < 0 ? '#f5222d' : '#8c8c8c', fontWeight: 600 }}>
            {val > 0 ? `+₹${val.toFixed(2)}` : `₹${val.toFixed(2)}`}
          </span>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        switch (status) {
          case 'APPROVED':
            return (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                APPROVED
              </Tag>
            )
          case 'COUNTING':
            return (
              <Tag color="processing" icon={<ClockCircleOutlined />}>
                COUNTING
              </Tag>
            )
          case 'DRAFT':
            return <Tag color="default">DRAFT</Tag>
          case 'CANCELLED':
            return <Tag color="error">CANCELLED</Tag>
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
    {
      title: 'Auditor',
      dataIndex: 'creatorName',
      key: 'creatorName',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: 'Approver',
      dataIndex: 'approverName',
      key: 'approverName',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'APPROVED' && record.status !== 'CANCELLED' ? (
            <Button
              type="primary"
              size="small"
              icon={<AuditOutlined />}
              onClick={() => {
                setSelectedStocktakeId(record.id)
                setDetailModalOpen(true)
              }}
            >
              Count & Audit
            </Button>
          ) : (
            <Button
              size="small"
              onClick={() => {
                setSelectedStocktakeId(record.id)
                setDetailModalOpen(true)
              }}
            >
              View Details
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Header */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="depotId" label="Warehouse:" style={{ marginBottom: 0 }}>
              <Select
                placeholder="All Warehouses"
                allowClear
                options={depotList.map((d) => ({
                  value: d.id,
                  label: d.depotName || d.name,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="status" label="Status:" style={{ marginBottom: 0 }}>
              <Select
                placeholder="All Statuses"
                allowClear
                options={[
                  { value: 'DRAFT', label: 'DRAFT' },
                  { value: 'COUNTING', label: 'COUNTING' },
                  { value: 'APPROVED', label: 'APPROVED' },
                  { value: 'CANCELLED', label: 'CANCELLED' },
                ]}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="sessionNumber" label="Session#:" style={{ marginBottom: 0 }}>
              <Input placeholder="Search session no." allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="dateRange" label="Date:" style={{ marginBottom: 0 }}>
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{ background: '#1890ff' }}
          >
            New Stocktake Session
          </Button>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                form.resetFields()
                fetchData(1, pagination.pageSize, {})
              }}
            >
              Reset
            </Button>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              Query
            </Button>
          </Space>
        </div>
      </Form>

      {/* Main Table */}
      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1200 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `Total ${tot} sessions (${range[0]}-${range[1]})`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Initialize Stocktake Modal */}
      <Modal
        title="Initiate Physical Stocktake & Audit Session"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        okText="Initialize Baseline"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="depotId"
            label="Target Warehouse"
            rules={[{ required: true, message: 'Please select a warehouse to audit' }]}
          >
            <Select
              placeholder="Select warehouse..."
              options={depotList.map((d) => ({
                value: d.id,
                label: d.depotName || d.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="remark" label="Session Notes / Audit Objective">
            <Input.TextArea rows={3} placeholder="e.g. Q3 Cycle Count, Annual Statutory Physical Inventory Audit" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Count & Audit Detail Drawer / Modal */}
      <StocktakeModal
        open={detailModalOpen}
        stocktakeId={selectedStocktakeId}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedStocktakeId(null)
        }}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())}
      />
    </Card>
  )
}
