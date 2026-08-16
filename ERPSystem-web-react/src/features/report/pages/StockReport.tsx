import React, { useEffect, useState, useMemo } from 'react'
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
  Popover,
  Checkbox,
  Divider,
  Typography,
  Modal,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

const { Text } = Typography

export const StockReportPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [depotList, setDepotList] = useState<any[]>([])
  const [categoryList, setCategoryList] = useState<any[]>([])

  const [currentStock, setCurrentStock] = useState(0)
  const [currentStockPrice, setCurrentStockPrice] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(0)

  // Flow / History Modal State
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [flowLoading, setFlowLoading] = useState(false)
  const [flowData, setFlowData] = useState<any[]>([])
  const [flowPagination, setFlowPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)

  // Depot Distribution Modal State
  const [distModalOpen, setDistModalOpen] = useState(false)
  const [distLoading, setDistLoading] = useState(false)
  const [distData, setDistData] = useState<any[]>([])

  // Column Settings matching Vue MaterialStock.vue defDataIndex
  const allColumnKeys = [
    'rowIndex',
    'action',
    'mBarCode',
    'name',
    'standard',
    'model',
    'color',
    'brand',
    'mfrs',
    'categoryName',
    'position',
    'unitName',
    'purchaseDecimal',
    'initialStock',
    'currentStock',
    'currentStockPrice',
    'currentWeight',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  useEffect(() => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setDepotList(list)
    })
    http.get('/materialCategory/getAllList').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setCategoryList(list)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const res = await http.get('/material/getListWithStock', {
        depotIds: values.depotIds ? String(values.depotIds) : '',
        materialParam: values.materialParam || '',
        categoryId: values.categoryId || undefined,
        position: values.position || '',
        zeroStock: values.zeroStock !== undefined ? Number(values.zeroStock) : 0,
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      const cStock = res?.currentStock !== undefined ? res.currentStock : res?.data?.currentStock || 0
      const cPrice = res?.currentStockPrice !== undefined ? res.currentStockPrice : res?.data?.currentStockPrice || 0
      const cWeight = res?.currentWeight !== undefined ? res.currentWeight : res?.data?.currentWeight || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
      setCurrentStock(Number(cStock))
      setCurrentStockPrice(Number(cPrice))
      setCurrentWeight(Number(cWeight))
    } catch (err) {
      console.error('Failed to load stock valuation report:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch Inventory Flow / History for a material
  const fetchFlowData = async (material: any, page = 1, pageSize = 10) => {
    if (!material?.id) return
    setFlowLoading(true)
    try {
      const depotIds = form.getFieldValue('depotIds') || ''
      const res = await http.get('/depotItem/findDetailByDepotIdsAndMaterialId', {
        materialId: material.id,
        depotIds: String(depotIds),
        stockPriceFlag: false,
        currentPage: page,
        pageSize,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      setFlowData(rows)
      setFlowPagination({ current: page, pageSize, total })
    } catch (err) {
      console.error('Failed to load inventory flow:', err)
      setFlowData([])
    } finally {
      setFlowLoading(false)
    }
  }

  const handleOpenFlow = (record: any) => {
    setSelectedMaterial(record)
    setFlowModalOpen(true)
    fetchFlowData(record, 1, 10)
  }

  // Fetch Warehouse Distribution for a material
  const handleOpenDist = async (record: any) => {
    if (!record?.id) return
    setSelectedMaterial(record)
    setDistModalOpen(true)
    setDistLoading(true)
    try {
      const res = await http.get('/depot/getAllListWithStock', {
        materialId: record.id,
      })
      const list = res?.data || (Array.isArray(res) ? res : [])
      setDistData(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to load depot distribution:', err)
      setDistData([])
    } finally {
      setDistLoading(false)
    }
  }

  const columnsConfig: Record<string, any> = {
    rowIndex: {
      title: '#',
      key: 'rowIndex',
      width: 45,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    action: {
      title: 'StockDetails',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <a onClick={() => handleOpenFlow(record)} style={{ color: '#1890ff' }}>
            Flow
          </a>
          <span style={{ color: '#d9d9d9' }}>|</span>
          <a onClick={() => handleOpenDist(record)} style={{ color: '#1890ff' }}>
            Distribution
          </a>
        </Space>
      ),
    },
    mBarCode: {
      title: 'Barcode',
      dataIndex: 'mBarCode',
      key: 'mBarCode',
      width: 110,
      render: (val: any, record: any) => val || record.barCode || '-',
    },
    name: {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    standard: {
      title: 'Spec',
      dataIndex: 'standard',
      key: 'standard',
      width: 90,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    model: {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 90,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    color: {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 70,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    brand: {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 90,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    mfrs: {
      title: 'Manufacturer',
      dataIndex: 'mfrs',
      key: 'mfrs',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    categoryName: {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    position: {
      title: 'Shelf / Bin',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    unitName: {
      title: 'Unit',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 65,
      render: (v: any, r: any) => v || r.materialUnit || '-',
    },
    purchaseDecimal: {
      title: 'Cost Price',
      dataIndex: 'purchaseDecimal',
      key: 'purchaseDecimal',
      width: 90,
      render: (val: any) => (val !== undefined && val !== null ? Number(val).toFixed(2) : '0.00'),
    },
    initialStock: {
      title: 'Initial Stock',
      dataIndex: 'initialStock',
      key: 'initialStock',
      width: 90,
      render: (val: any) => val || 0,
    },
    currentStock: {
      title: 'Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 80,
      render: (val: any) => <strong>{val !== undefined ? val : 0}</strong>,
    },
    currentStockPrice: {
      title: 'StockAmount',
      dataIndex: 'currentStockPrice',
      key: 'currentStockPrice',
      width: 100,
      render: (val: any) => (val !== undefined && val !== null ? Number(val).toFixed(2) : '0.00'),
    },
    currentWeight: {
      title: 'Weight',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      width: 80,
      render: (val: any) => (val !== undefined && val !== null ? Number(val).toFixed(2) : '0.00'),
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 340 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {allColumnKeys.map((key) => (
          <Checkbox key={key} value={key} disabled={key === 'rowIndex' || key === 'mBarCode' || key === 'name'}>
            {columnsConfig[key]?.title || key}
          </Checkbox>
        ))}
      </Checkbox.Group>
      <Divider style={{ margin: '8px 0' }} />
      <Button type="link" size="small" onClick={() => setVisibleColumns(allColumnKeys)}>
        Restore Default Columns
      </Button>
    </div>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="depotIds"
              label="Warehouse:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Please select Warehouse..."
                allowClear
                options={depotList.map((d) => ({
                  value: d.id,
                  label: d.depotName || d.name,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="materialParam"
              label="Product Info:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Please enter Barcode, Name, ..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="categoryId"
              label="Category:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select Category..."
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
                name="position"
                label="Shelf/Bin:"
                labelCol={{ flex: '85px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter shelf position..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="zeroStock"
                label="Zero Stock:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                initialValue="0"
                style={{ marginBottom: 0 }}
              >
                <Select
                  options={[
                    { value: '0', label: 'Hide Zero Stock' },
                    { value: '1', label: 'Show Zero Stock' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>

      {/* Action Controls & Summary Banner */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          background: '#f0f5ff',
          border: '1px solid #adc6ff',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Stock: <strong style={{ color: '#1890ff' }}>{currentStock.toFixed(2)}</strong>
          </Text>
          <Divider vertical />
          <Text>
            Total StockAmount: <strong style={{ color: '#52c41a' }}>{currentStockPrice.toFixed(2)}</strong>
          </Text>
          <Divider vertical />
          <Text>
            Total Weight: <strong>{currentWeight.toFixed(2)}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title="Stock Valuation Report"
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Stock', value: currentStock.toFixed(2) },
              { label: 'Total Stock Valuation', value: `₹${currentStockPrice.toFixed(2)}` },
              { label: 'Total Weight', value: `${currentWeight.toFixed(2)} kg` },
            ]}
          />
          <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
            <Button icon={<SettingOutlined />}>Column Settings</Button>
          </Popover>
        </Space>
      </div>

      <Table
        rowKey={(record) => record.id || `${record.mBarCode || record.barCode || ''}_${record.depotId || ''}`}
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1350 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `Total ${tot} items (${range[0]}-${range[1]})`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Inventory Flow Details Modal */}
      <Modal
        title={`Stock Flow Details: ${selectedMaterial?.name || ''} (${selectedMaterial?.mBarCode || selectedMaterial?.barCode || ''})`}
        open={flowModalOpen}
        onCancel={() => setFlowModalOpen(false)}
        footer={null}
        width={900}
      >
        <Table
          rowKey={(r) => r.id || `${r.number || ''}_${r.operTime || ''}`}
          size="small"
          bordered
          loading={flowLoading}
          dataSource={flowData}
          columns={[
            { title: 'Doc Number', dataIndex: 'number', key: 'number', width: 160 },
            { title: 'Type', dataIndex: 'type', key: 'type', width: 120, render: (t) => <Tag color="blue">{t}</Tag> },
            { title: 'Warehouse', dataIndex: 'depotName', key: 'depotName', width: 130 },
            {
              title: 'Change Qty',
              dataIndex: 'basicNumber',
              key: 'basicNumber',
              width: 100,
              render: (v) => (
                <strong style={{ color: Number(v) >= 0 ? '#52c41a' : '#f5222d' }}>
                  {Number(v) > 0 ? `+${v}` : v}
                </strong>
              ),
            },
            { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 110, render: (v) => (v !== undefined ? Number(v).toFixed(2) : '-') },
            { title: 'Total Amount', dataIndex: 'allPrice', key: 'allPrice', width: 120, render: (v) => (v !== undefined ? Number(v).toFixed(2) : '-') },
            { title: 'Date', dataIndex: 'operTime', key: 'operTime', width: 150 },
          ]}
          pagination={{
            ...flowPagination,
            onChange: (p, s) => fetchFlowData(selectedMaterial, p, s),
          }}
        />
      </Modal>

      {/* Warehouse Distribution Modal */}
      <Modal
        title={`Stock Distribution: ${selectedMaterial?.name || ''} (${selectedMaterial?.mBarCode || selectedMaterial?.barCode || ''})`}
        open={distModalOpen}
        onCancel={() => setDistModalOpen(false)}
        footer={null}
        width={650}
      >
        <Table
          rowKey="id"
          size="small"
          bordered
          loading={distLoading}
          dataSource={distData}
          columns={[
            { title: 'Warehouse Name', dataIndex: 'name', key: 'name' },
            {
              title: 'Current Stock',
              dataIndex: 'initStock',
              key: 'initStock',
              render: (v, r: any) => {
                const stockVal = r.currentStock !== undefined ? r.currentStock : r.stock !== undefined ? r.stock : v
                return <strong style={{ color: Number(stockVal) > 0 ? '#52c41a' : '#bfbfbf' }}>{stockVal || 0}</strong>
              },
            },
          ]}
          pagination={false}
        />
      </Modal>
    </Card>
  )
}
