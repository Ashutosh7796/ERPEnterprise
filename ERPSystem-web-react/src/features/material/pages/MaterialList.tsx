import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Popconfirm,
  message,
  Tooltip,
  Drawer,
  Timeline,
  Spin,
  Empty,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  EditOutlined,
  CopyOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { MaterialModal } from '../components/MaterialModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import {
  ErpAgGrid,
  CurrencyCellRenderer,
  StatusTagCellRenderer,
  type ErpColDef,
} from '@shared/components/grid'

const { Text } = Typography

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
  revisionNo?: string
  drawingNo?: string
  materialGrade?: string
  noOfCavity?: number
  weightPerUnit?: number
  weightUomId?: number
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [categoryList, setCategoryList] = useState<any[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)

  // Revision History State
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)

  const handleOpenHistory = async (record: any) => {
    setSelectedMaterial(record)
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const res: any = await http.get('/material/getHistory', { materialId: record.id })
      const list = res?.data || (Array.isArray(res) ? res : [])
      setHistoryList(list)
    } catch (e) {
      console.error('Failed to load history:', e)
      message.error('Failed to load material revision history')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    http.get('/materialCategory/getAllList').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setCategoryList(list)
    })
  }, [])

  const fetchData = useCallback(async (page = 1, pageSize = 10, searchValues: any = {}) => {
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
        enableSerialNumber: searchValues.enableSerialNumber,
        enableBatchNumber: searchValues.enableBatchNumber,
        remark: searchValues.remark || '',
      }

      const res = await http.get<any>('/material/list', {
        params: {
          search: JSON.stringify(searchObj),
          currentPage: page,
          pageSize: pageSize,
        },
      })

      if (res && res.data && res.data.rows) {
        setDataSource(res.data.rows)
        setPagination({ current: page, pageSize, total: res.data.total || 0 })
      } else if (res && res.rows) {
        setDataSource(res.rows)
        setPagination({ current: page, pageSize, total: res.total || 0 })
      } else {
        setDataSource([])
      }
    } catch (err: any) {
      console.error('Failed to fetch material list:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle Single Delete
  const handleDelete = async (id: number) => {
    try {
      const res = await http.delete(`/material/delete?id=${id}`)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Item deleted successfully.')
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error('Cannot delete item. It may be referenced by active transactions or bills of materials.')
      }
    } catch (err: any) {
      message.error(err?.message || 'Cannot delete item.')
    }
  }

  // Handle Batch Delete
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one item to delete.')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      const res = await http.delete(`/material/deleteBatch?ids=${ids}`)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Selected items deleted successfully.')
        setSelectedRowKeys([])
        fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
      } else {
        message.error('Failed to delete selected items.')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected items.')
    }
  }

  // Handle Batch Enable/Disable
  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one item.')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/material/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Selected items enabled successfully.' : 'Selected items disabled successfully.')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update item status.')
    }
  }

  // Handle Copy / Clone Item
  const handleCopyAdd = (record: MaterialRecord) => {
    const clone = { ...record, id: undefined, name: `${record.name} (Copy)` }
    setEditingRecord(clone)
    setModalOpen(true)
  }

  // AG Grid Column Definitions
  const columnDefs = useMemo<ErpColDef<MaterialRecord>[]>(() => {
    return [
      {
        headerName: 'Action',
        colId: 'action',
        pinned: 'left',
        width: 170,
        minWidth: 160,
        lockPinned: true,
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const record = params.data
          if (!record) return null
          return (
            <div className="erp-grid-actions">
              <Tooltip title="Edit Item">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#1677ff', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => {
                    setEditingRecord(record)
                    setModalOpen(true)
                  }}
                />
              </Tooltip>
              <Tooltip title="Copy Item">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => handleCopyAdd(record)}
                />
              </Tooltip>
              <Tooltip title="Revision Audit History">
                <Button
                  type="text"
                  size="small"
                  icon={<HistoryOutlined style={{ color: '#722ed1', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => handleOpenHistory(record)}
                />
              </Tooltip>
              <Popconfirm title="Delete this item? This action will archive the item." onConfirm={() => handleDelete(record.id)}>
                <Tooltip title="Delete Item">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                  />
                </Tooltip>
              </Popconfirm>
            </div>
          )
        },
      },
      {
        headerName: 'Item Code / Barcode',
        field: 'mBarCode',
        width: 140,
        minWidth: 120,
        filter: true,
        valueGetter: (p) => p.data?.mBarCode || p.data?.barCode || '-',
      },
      {
        headerName: 'Item Name',
        field: 'name',
        width: 220,
        minWidth: 180,
        flex: 1.5,
        wrapText: true,
        filter: true,
        cellRenderer: (params: any) => {
          const r = params.data
          if (!r) return null
          return (
            <Space size={4} wrap={false} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: 500 }}>{r.name}</span>
              {Number(r.enableSerialNumber) === 1 && <Tag color="orange" style={{ margin: 0 }}>SN</Tag>}
              {Number(r.enableBatchNumber) === 1 && <Tag color="purple" style={{ margin: 0 }}>Batch</Tag>}
            </Space>
          )
        },
      },
      {
        headerName: 'Specification',
        field: 'standard',
        width: 110,
        minWidth: 90,
        filter: true,
        valueGetter: (p) => p.data?.standard || '-',
      },
      {
        headerName: 'Model',
        field: 'model',
        width: 110,
        minWidth: 90,
        filter: true,
        valueGetter: (p) => p.data?.model || '-',
      },
      {
        headerName: 'Revision',
        field: 'revisionNo',
        width: 85,
        minWidth: 75,
        filter: true,
        cellRenderer: (p: any) => <Tag color="blue">v{p.data?.revisionNo || '1.0'}</Tag>,
      },
      {
        headerName: 'Drawing No',
        field: 'drawingNo',
        width: 130,
        minWidth: 100,
        filter: true,
        valueGetter: (p: any) => p.data?.drawingNo || '-',
      },
      {
        headerName: 'Material Grade',
        field: 'materialGrade',
        width: 110,
        minWidth: 90,
        filter: true,
        valueGetter: (p: any) => p.data?.materialGrade || '-',
      },
      {
        headerName: 'Color',
        field: 'color',
        width: 90,
        minWidth: 80,
        filter: true,
        valueGetter: (p) => p.data?.color || '-',
      },
      {
        headerName: 'Brand',
        field: 'brand',
        width: 110,
        minWidth: 90,
        filter: true,
        valueGetter: (p) => p.data?.brand || '-',
      },
      {
        headerName: 'Item Category',
        field: 'categoryName',
        width: 120,
        minWidth: 100,
        filter: true,
        valueGetter: (p) => p.data?.categoryName || '-',
      },
      {
        headerName: 'Unit of Measure (UOM)',
        field: 'unit',
        width: 110,
        minWidth: 90,
        filter: true,
        valueGetter: (p) => p.data?.unit || p.data?.unitName || '-',
      },
      {
        headerName: 'Current Stock',
        field: 'stock',
        width: 120,
        minWidth: 100,
        type: 'numericColumn',
        cellRenderer: (p: any) => (
          <strong style={{ color: Number(p.value || 0) <= 0 ? '#ff4d4f' : '#262626' }}>
            {p.value !== undefined ? p.value : 0}
          </strong>
        ),
      },
      {
        headerName: 'Valuation Rate (₹)',
        field: 'purchaseDecimal',
        width: 135,
        minWidth: 110,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      },
      {
        headerName: 'Retail Price (₹)',
        field: 'commodityDecimal',
        width: 125,
        minWidth: 110,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      },
      {
        headerName: 'Sales Price (₹)',
        field: 'wholesaleDecimal',
        width: 125,
        minWidth: 110,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      },
      {
        headerName: 'Min Price (₹)',
        field: 'lowDecimal',
        width: 115,
        minWidth: 100,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      },
      {
        headerName: 'Initial Stock',
        field: 'initialStock',
        width: 110,
        minWidth: 90,
        type: 'numericColumn',
        valueGetter: (p) => p.data?.initialStock || 0,
      },
      {
        headerName: 'Shelf / Bin',
        field: 'position',
        width: 105,
        minWidth: 90,
        filter: true,
        valueGetter: (p) => p.data?.position || '-',
      },
      {
        headerName: 'Status',
        field: 'enabled',
        width: 95,
        minWidth: 85,
        filter: true,
        cellRenderer: StatusTagCellRenderer,
      },
      {
        headerName: 'Remarks',
        field: 'remark',
        width: 180,
        minWidth: 150,
        flex: 1.5,
        wrapText: true,
        filter: true,
        tooltipField: 'remark',
        valueGetter: (p) => p.data?.remark || '-',
      },
    ]
  }, [])

  // Left action bar
  const leftToolbarButtons = (
    <Space size="small" wrap>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingRecord(null)
          setModalOpen(true)
        }}
      >
        Create Item
      </Button>
      <Popconfirm
        title="Delete selected items? This action will archive the selected items."
        onConfirm={handleBatchDelete}
        disabled={selectedRowKeys.length === 0}
      >
        <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
          Delete Selected Items
        </Button>
      </Popconfirm>
      <Button
        icon={<CheckOutlined />}
        onClick={() => handleBatchStatus(true)}
        disabled={selectedRowKeys.length === 0}
      >
        Enable Items
      </Button>
      <Button
        icon={<StopOutlined />}
        onClick={() => handleBatchStatus(false)}
        disabled={selectedRowKeys.length === 0}
      >
        Disable Items
      </Button>
      <ExportPrintButtons
        title="Item Master List"
        columns={columnDefs as any}
        dataSource={dataSource}
      />
    </Space>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Filter Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="materialParam"
              label="Item Code / Name:"
              labelCol={{ flex: '135px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Item code or name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="categoryId"
              label="Item Category:"
              labelCol={{ flex: '105px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select category..."
                allowClear
                showSearch
                optionFilterProp="children"
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
              name="standard"
              label="Specification:"
              labelCol={{ flex: '95px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Specification..." allowClear style={{ width: '100%' }} />
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

        {/* Row 2 (Expandable) */}
        {expandedSearch && (
          <Row gutter={[16, 12]} align="middle" style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="model"
                label="Model:"
                labelCol={{ flex: '110px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Model..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="color"
                label="Color:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Color..." allowClear style={{ width: '100%' }} />
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
                <Input placeholder="Brand..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="remark"
                label="Remarks:"
                labelCol={{ flex: '70px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Remarks..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>

      {/* AG Grid Modern Product Table */}
      <ErpAgGrid
        rowData={dataSource}
        columnDefs={columnDefs}
        loading={loading}
        rowSelection="multiple"
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={(_, keys) => setSelectedRowKeys(keys)}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
          pageSizeOptions: [10, 20, 30, 50, 100, 200],
        }}
        leftToolbar={leftToolbarButtons}
        exportFileName="material_list"
        persistenceKey="material_product_grid"
        height="560px"
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

      {/* Item Master Revision History Drawer */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: '#722ed1', fontSize: 18 }} />
            <span>
              Item Revision History — {selectedMaterial?.name} ({selectedMaterial?.mBarCode || selectedMaterial?.barCode || `#${selectedMaterial?.id}`})
            </span>
          </Space>
        }
        placement="right"
        width={560}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <Spin spinning={historyLoading}>
          {historyList && historyList.length > 0 ? (
            <Timeline
              mode="left"
              items={historyList.map((h: any, idx: number) => {
                const isLatest = idx === 0
                return {
                  color: h.changeType === 'CREATE' ? 'green' : 'blue',
                  dot: isLatest ? <CheckCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
                  children: (
                    <Card size="small" style={{ marginBottom: 12, borderLeft: '3px solid #1890ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Space>
                          <Tag color="purple">Rev {h.revisionNo || '1.0'}</Tag>
                          <Tag color={h.changeType === 'CREATE' ? 'success' : 'processing'}>{h.changeType}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {h.createTime ? new Date(h.createTime).toLocaleString() : '-'}
                        </Text>
                      </div>
                      <div style={{ fontWeight: 500, margin: '6px 0', color: '#262626' }}>
                        {h.changeSummary || 'Item Master record saved.'}
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        Action by User #{h.changedBy || '1'}
                      </div>
                    </Card>
                  ),
                }
              })}
            />
          ) : (
            <Empty description="No revision history records available for this item." />
          )}
        </Spin>
      </Drawer>
    </Card>
  )
}
