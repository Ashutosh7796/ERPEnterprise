import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Popover,
  Checkbox,
  Divider,
  Tag,
  Popconfirm,
  message,
  Switch,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
  EditOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { MaterialModal } from '../components/MaterialModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface MaterialRecord {
  id: number
  name: string
  mBarCode?: string
  barCode?: string
  standard?: string
  model?: string
  color?: string
  brand?: string
  mnemonic?: string
  categoryName?: string
  categoryId?: number
  otherField1?: string
  otherField2?: string
  otherField3?: string
  unit?: string
  unitName?: string
  weight?: number
  expiryNum?: number
  mfrs?: string
  initialStock?: number
  stock?: number
  purchaseDecimal?: number
  commodityDecimal?: number
  wholesaleDecimal?: number
  lowDecimal?: number
  position?: string
  remark?: string
  enabled?: boolean | number
  enableSerialNumber?: number | string
  enableBatchNumber?: number | string
}

export const MaterialListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<MaterialRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [categoryList, setCategoryList] = useState<any[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)

  // Column definitions matching Vue MaterialList.vue
  const allColumnKeys = [
    'action',
    'mBarCode',
    'name',
    'standard',
    'model',
    'color',
    'brand',
    'mnemonic',
    'categoryName',
    'otherField1',
    'otherField2',
    'otherField3',
    'unit',
    'weight',
    'expiryNum',
    'mfrs',
    'initialStock',
    'stock',
    'purchaseDecimal',
    'commodityDecimal',
    'wholesaleDecimal',
    'lowDecimal',
    'position',
    'remark',
    'enabled',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'action',
    'mBarCode',
    'name',
    'standard',
    'model',
    'color',
    'brand',
    'categoryName',
    'unit',
    'stock',
    'purchaseDecimal',
    'commodityDecimal',
    'wholesaleDecimal',
    'lowDecimal',
    'enabled',
  ])

  useEffect(() => {
    http.get('/materialCategory/getAllList').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setCategoryList(list)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        categoryId: searchValues.categoryId || '',
        materialParam: searchValues.materialParam || '',
        standard: searchValues.standard || '',
        model: searchValues.model || '',
        color: searchValues.color || '',
        brand: searchValues.brand || '',
        mfrs: searchValues.mfrs || '',
        otherField1: searchValues.otherField1 || '',
        otherField2: searchValues.otherField2 || '',
        otherField3: searchValues.otherField3 || '',
        weight: searchValues.weight || '',
        expiryNum: searchValues.expiryNum || '',
        position: searchValues.position || '',
        remark: searchValues.remark || '',
        enabled: searchValues.enabled !== undefined ? searchValues.enabled : '',
        enableSerialNumber: searchValues.enableSerialNumber !== undefined ? searchValues.enableSerialNumber : '',
        enableBatchNumber: searchValues.enableBatchNumber !== undefined ? searchValues.enableBatchNumber : '',
      }

      const res = await http.get('/material/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load products:', err)
      message.error(err?.message || 'Failed to load product list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Delete single product
  const handleDelete = async (id: number) => {
    try {
      await http.delete(`/material/delete?id=${id}`)
      message.success('Product deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete product')
    }
  }

  // Batch delete products
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select products first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/material/deleteBatch?ids=${ids}`)
      message.success('Selected products deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected products')
    }
  }

  // Batch enable / disable status
  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select products first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/material/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Products enabled' : 'Products disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update product status')
    }
  }

  // Handle Copy / Clone Product
  const handleCopyAdd = (record: MaterialRecord) => {
    const clone = { ...record, id: undefined, name: `${record.name} (Copy)` }
    setEditingRecord(clone)
    setModalOpen(true)
  }

  const columnsConfig: Record<string, any> = {
    action: {
      title: 'Action',
      key: 'action',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: MaterialRecord) => (
        <Space separator={<Divider vertical style={{ margin: '0 4px' }} />} size={0}>
          <a
            onClick={() => {
              setEditingRecord(record)
              setModalOpen(true)
            }}
          >
            Edit
          </a>
          <a onClick={() => handleCopyAdd(record)}>Copy</a>
          <Popconfirm
            title="Delete this product?"
            onConfirm={() => handleDelete(record.id)}
          >
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    mBarCode: {
      title: 'Barcode',
      dataIndex: 'mBarCode',
      key: 'mBarCode',
      width: 130,
      render: (val: any, r: MaterialRecord) => val || r.barCode || '-',
    },
    name: {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
      render: (val: string, r: MaterialRecord) => (
        <Space size="small">
          <span>{val}</span>
          {Number(r.enableSerialNumber) === 1 && <Tag color="orange">SN</Tag>}
          {Number(r.enableBatchNumber) === 1 && <Tag color="purple">Batch</Tag>}
        </Space>
      ),
    },
    standard: {
      title: 'Spec',
      dataIndex: 'standard',
      key: 'standard',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    model: {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    color: {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    brand: {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    mnemonic: {
      title: 'Mnemonic',
      dataIndex: 'mnemonic',
      key: 'mnemonic',
      width: 90,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    categoryName: {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 110,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    otherField1: {
      title: 'Field 1',
      dataIndex: 'otherField1',
      key: 'otherField1',
      width: 90,
      ellipsis: true,
    },
    otherField2: {
      title: 'Field 2',
      dataIndex: 'otherField2',
      key: 'otherField2',
      width: 90,
      ellipsis: true,
    },
    otherField3: {
      title: 'Field 3',
      dataIndex: 'otherField3',
      key: 'otherField3',
      width: 90,
      ellipsis: true,
    },
    unit: {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (v: any, r: MaterialRecord) => v || r.unitName || '-',
    },
    weight: {
      title: 'Weight (kg)',
      dataIndex: 'weight',
      key: 'weight',
      width: 95,
      render: (v: any) => (v !== undefined && v !== null ? Number(v).toFixed(2) : '-'),
    },
    expiryNum: {
      title: 'Expiry (Days)',
      dataIndex: 'expiryNum',
      key: 'expiryNum',
      width: 105,
      render: (v: any) => (v ? `${v}d` : '-'),
    },
    mfrs: {
      title: 'Manufacturer',
      dataIndex: 'mfrs',
      key: 'mfrs',
      width: 120,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    initialStock: {
      title: 'Initial Stock',
      dataIndex: 'initialStock',
      key: 'initialStock',
      width: 95,
      render: (v: any) => v || 0,
    },
    stock: {
      title: 'Current Stock',
      dataIndex: 'stock',
      key: 'stock',
      width: 105,
      render: (v: any) => <strong>{v !== undefined ? v : 0}</strong>,
    },
    purchaseDecimal: {
      title: 'Cost Price (₹)',
      dataIndex: 'purchaseDecimal',
      key: 'purchaseDecimal',
      width: 115,
      render: (v: any) => (v ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    commodityDecimal: {
      title: 'Retail Price (₹)',
      dataIndex: 'commodityDecimal',
      key: 'commodityDecimal',
      width: 115,
      render: (v: any) => (v ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    wholesaleDecimal: {
      title: 'Sales Price (₹)',
      dataIndex: 'wholesaleDecimal',
      key: 'wholesaleDecimal',
      width: 115,
      render: (v: any) => (v ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    lowDecimal: {
      title: 'Min Price (₹)',
      dataIndex: 'lowDecimal',
      key: 'lowDecimal',
      width: 110,
      render: (v: any) => (v ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    position: {
      title: 'Shelf / Bin',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 130,
      ellipsis: true,
    },
    enabled: {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 85,
      align: 'center' as const,
      render: (val: any) => {
        const isEnabled = val === true || val === 1 || val === '1'
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 480 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Product Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={8} key={key}>
              <Checkbox value={key} disabled={key === 'action' || key === 'name'}>
                {columnsConfig[key]?.title || key}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
      <Divider style={{ margin: '10px 0 6px 0' }} />
      <Button
        type="link"
        size="small"
        onClick={() =>
          setVisibleColumns([
            'action',
            'mBarCode',
            'name',
            'standard',
            'model',
            'color',
            'brand',
            'categoryName',
            'unit',
            'stock',
            'purchaseDecimal',
            'commodityDecimal',
            'wholesaleDecimal',
            'lowDecimal',
            'enabled',
          ])
        }
      >
        Restore Default Columns
      </Button>
    </div>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="categoryId"
              label="Category:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select category..."
                allowClear
                options={categoryList.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="materialParam"
              label="Keywords:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter barcode, name, mnemonic..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="standard"
              label="Spec:"
              labelCol={{ flex: '60px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter specification..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space wrap style={{ paddingLeft: 4 }}>
              <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                Search
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields()
                  fetchData(1, pagination.pageSize)
                }}
              >
                Reset
              </Button>
              <Button
                type="link"
                onClick={() => setExpandedSearch(!expandedSearch)}
                style={{ padding: 0 }}
              >
                {expandedSearch ? 'Collapse' : 'Expand'}{' '}
                {expandedSearch ? <UpOutlined /> : <DownOutlined />}
              </Button>
            </Space>
          </Col>
        </Row>

        {expandedSearch && (
          <Row gutter={[16, 12]} align="middle" style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="model"
                label="Model:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter model..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="color"
                label="Color:"
                labelCol={{ flex: '85px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter color..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="brand"
                label="Brand:"
                labelCol={{ flex: '60px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter brand..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="mfrs"
                label="Manufacturer:"
                labelCol={{ flex: '95px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter manufacturer..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="position"
                label="Shelf / Bin:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter shelf / rack..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="enabled"
                label="Status:"
                labelCol={{ flex: '85px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select status..."
                  allowClear
                  options={[
                    { value: '1', label: 'Active' },
                    { value: '0', label: 'Disabled' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="enableSerialNumber"
                label="Serial No:"
                labelCol={{ flex: '70px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Has Serial No?"
                  allowClear
                  options={[
                    { value: '1', label: 'Yes' },
                    { value: '0', label: 'No' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="enableBatchNumber"
                label="Batch No:"
                labelCol={{ flex: '95px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Has Batch No?"
                  allowClear
                  options={[
                    { value: '1', label: 'Yes' },
                    { value: '0', label: 'No' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>

      {/* Action Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size="small" wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null)
              setModalOpen(true)
            }}
          >
            Add New
          </Button>
          <Popconfirm
            title="Delete selected products?"
            onConfirm={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              Batch Delete
            </Button>
          </Popconfirm>
          <Button
            icon={<CheckOutlined />}
            onClick={() => handleBatchStatus(true)}
            disabled={selectedRowKeys.length === 0}
          >
            Enable
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={() => handleBatchStatus(false)}
            disabled={selectedRowKeys.length === 0}
          >
            Disable
          </Button>
          <ExportPrintButtons
            title="Product Information List"
            columns={columns as any}
            dataSource={dataSource}
          />
        </Space>

        <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
          <Button icon={<SettingOutlined />}>Column Settings</Button>
        </Popover>
      </div>

      {/* Table */}
      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1600 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100', '200'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Product Add/Edit Modal */}
      <MaterialModal
        open={modalOpen}
        record={editingRecord}
        onClose={() => {
          setModalOpen(false)
          setEditingRecord(null)
        }}
        onSuccess={() => {
          fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
        }}
      />
    </Card>
  )
}
