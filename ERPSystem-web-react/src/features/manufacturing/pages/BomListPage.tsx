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
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CalculatorOutlined,
} from '@ant-design/icons'
import { bomApi, BomHeadDTO } from '../api/bomApi'
import { BomModal } from '../components/BomModal'
import { BomExplosionTreeModal } from '../components/BomExplosionTreeModal'

const { Text } = Typography

export const BomListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<BomHeadDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<BomHeadDTO | null>(null)

  const [explosionOpen, setExplosionOpen] = useState(false)
  const [explosionRecord, setExplosionRecord] = useState<BomHeadDTO | null>(null)

  const fetchData = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setLoading(true)
    try {
      const res: any = await bomApi.getBomList({
        currentPage: page,
        pageSize: size,
        bomCode: filters.bomCode,
        status: filters.status,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDataSource(rows)
      setPagination({ current: page, pageSize: size, total })
    } catch (err) {
      console.error('Failed to load BOM list:', err)
      message.error('Failed to load BOM list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(1, 10)
  }, [fetchData])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    fetchData(1, pagination.pageSize, values)
  }

  const handleReset = () => {
    form.resetFields()
    fetchData(1, pagination.pageSize)
  }

  const handleDelete = async (id: number) => {
    try {
      const res: any = await bomApi.deleteBom(id)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Bill of Materials deleted successfully.')
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error(res?.data || res?.message || 'Cannot delete Bill of Materials.')
      }
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Cannot delete Bill of Materials.')
    }
  }

  const columns: TableColumnsType<BomHeadDTO> = [
    {
      title: 'Action',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_: any, record: BomHeadDTO) => (
        <Space size={2}>
          <Tooltip title="View Multi-Level Explosion Tree">
            <Button
              type="text"
              size="small"
              icon={<ApartmentOutlined style={{ color: '#722ed1', fontSize: 14 }} />}
              onClick={() => {
                setExplosionRecord(record)
                setExplosionOpen(true)
              }}
            />
          </Tooltip>

          <Tooltip title="Edit Bill of Materials">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#1677ff', fontSize: 14 }} />}
              onClick={() => {
                setEditingRecord(record)
                setModalOpen(true)
              }}
            />
          </Tooltip>

          <Tooltip title="Calculate Pre-Production Standard Cost Roll-Up">
            <Button
              type="text"
              size="small"
              icon={<CalculatorOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
              onClick={async () => {
                if (!record.id) return
                try {
                  const res: any = await bomApi.calculateCost(record.id)
                  if (res && (res.code === 200 || res.status === 200)) {
                    if (res.data?.costCompleteness === 'INCOMPLETE_COST_BASIS') {
                      message.warning(`Standard cost roll-up for BOM '${record.bomCode}' completed with INCOMPLETE COST BASIS. See details in BOM modal.`)
                    } else {
                      message.success(`Standard cost roll-up for BOM '${record.bomCode}' completed successfully.`)
                    }
                    fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
                  } else {
                    message.error(res?.data || res?.message || 'Cost roll-up calculation failed.')
                  }
                } catch (e: any) {
                  message.error(e?.message || 'Error executing cost roll-up calculation.')
                }
              }}
            />
          </Tooltip>

          <Popconfirm title="Delete this Bill of Materials? Active work orders using this BOM may prevent deletion." onConfirm={() => record.id && handleDelete(record.id)}>
            <Tooltip title="Delete BOM">
              <Button type="text" danger size="small" icon={<DeleteOutlined style={{ fontSize: 14 }} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: 'BOM Code',
      dataIndex: 'bomCode',
      key: 'bomCode',
      width: 160,
      render: (val: string, record: BomHeadDTO) => (
        <a
          onClick={() => {
            setEditingRecord(record)
            setModalOpen(true)
          }}
        >
          {val}
        </a>
      ),
    },
    {
      title: 'Finished Good',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 220,
      render: (val: string, record: BomHeadDTO) => (
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
      title: 'Revision',
      dataIndex: 'revisionCode',
      key: 'revisionCode',
      width: 90,
      align: 'center',
      render: (val: string) => <Tag color="blue">v{val || '1.0'}</Tag>,
    },
    {
      title: 'Batch Output Qty',
      dataIndex: 'outputQuantity',
      key: 'outputQuantity',
      width: 140,
      align: 'right',
      render: (val: number, record: BomHeadDTO) => (
        <span>
          <strong>{Number(val || 1).toFixed(2)}</strong> {record.materialUnit || 'units'}
        </span>
      ),
    },
    {
      title: 'Default BOM',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 110,
      align: 'center',
      render: (val: string) => (
        val === '1' ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Default</Tag>
        ) : (
          <Tag color="default">Alternate</Tag>
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status: string) => {
        if (status === 'ACTIVE') return <Tag color="green">ACTIVE</Tag>
        if (status === 'DRAFT') return <Tag color="gold">DRAFT</Tag>
        if (status === 'OBSOLETE') return <Tag color="default">OBSOLETE</Tag>
        return <Tag>{status}</Tag>
      },
    },
    {
      title: 'Component Count',
      dataIndex: 'componentCount',
      key: 'componentCount',
      width: 140,
      align: 'center',
      render: (val: number) => <Tag color="cyan">{val || 0} components</Tag>,
    },
    {
      title: 'Standard Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 170,
      align: 'right',
      render: (val: number, record: BomHeadDTO) => {
        const isIncomplete = record.costCompleteness === 'INCOMPLETE_COST_BASIS'
        const tooltipContent = `Material: ₹${Number(record.materialCost || 0).toFixed(4)} | Labour: ₹${Number(record.laborCost || 0).toFixed(4)} | Overhead: ₹${Number(record.overheadCost || 0).toFixed(4)}`
        return (
          <Tooltip title={tooltipContent}>
            <div>
              <Text strong style={{ color: isIncomplete ? '#fa8c16' : (val && val > 0 ? '#52c41a' : '#8c8c8c') }}>
                {val && val > 0 ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '₹0.00'}
              </Text>
              {isIncomplete && (
                <div>
                  <Tag color="warning" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
                    Incomplete Basis
                  </Tag>
                </div>
              )}
            </div>
          </Tooltip>
        )
      },
    },
    {
      title: 'Costing Method',
      dataIndex: 'costingMethod',
      key: 'costingMethod',
      width: 170,
      align: 'center',
      render: (val: string) => (
        <Tag color="cyan">{val || 'ESTIMATED_MATERIAL_ONLY'}</Tag>
      ),
    },
    {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ]

  return (
    <Card
      title={
        <Space>
          <BuildOutlined style={{ color: '#1890ff', fontSize: 18 }} />
          <span>Bill of Materials (BOM) Master Register</span>
        </Space>
      }
      variant="borderless"
      style={{ margin: 16 }}
    >
      {/* Search Header */}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} style={{ width: '100%' }}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="bomCode" style={{ width: '100%' }}>
              <Input placeholder="Search BOM code, finished good..." allowClear prefix={<SearchOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="status" style={{ width: '100%' }}>
              <Select placeholder="Filter status..." allowClear>
                <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                <Select.Option value="DRAFT">DRAFT</Select.Option>
                <Select.Option value="OBSOLETE">OBSOLETE</Select.Option>
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
                Create Bill of Materials
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* Main BOM Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        bordered
        size="middle"
        scroll={{ x: 1250 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} BOMs`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Create / Edit BOM Modal */}
      <BomModal
        open={modalOpen}
        editingRecord={editingRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())}
      />

      {/* Explosion Tree Modal */}
      <BomExplosionTreeModal
        open={explosionOpen}
        bomId={explosionRecord?.id}
        bomCode={explosionRecord?.bomCode}
        defaultOutputQty={Number(explosionRecord?.outputQuantity || 1)}
        onClose={() => setExplosionOpen(false)}
      />
    </Card>
  )
}
