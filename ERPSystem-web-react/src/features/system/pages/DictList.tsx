import React, { useState, useEffect } from 'react'
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
  Modal,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface DictTypeRecord {
  dictId: number
  dictName: string
  dictType: string
  status?: string | number
  remark?: string
  createTime?: string
}

export interface DictDataRecord {
  dictCode: number
  dictLabel: string
  dictValue: string
  dictSort?: number
  status?: string | number
  remark?: string
}

export const DictListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [dataModalForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<DictTypeRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Dict Type Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DictTypeRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Dict Data List Modal
  const [dataModalOpen, setDataModalOpen] = useState(false)
  const [currentDictType, setCurrentDictType] = useState<DictTypeRecord | null>(null)
  const [dictDataList, setDictDataList] = useState<DictDataRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  // Dict Data Add/Edit Modal
  const [dataItemModalOpen, setDataItemModalOpen] = useState(false)
  const [editingDataItem, setEditingDataItem] = useState<DictDataRecord | null>(null)
  const [submittingDataItem, setSubmittingDataItem] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'dictName',
    'dictType',
    'status',
    'remark',
    'createTime',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'dictName',
    'dictType',
    'status',
    'remark',
    'createTime',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        dictName: searchValues.dictName || '',
        dictType: searchValues.dictType || '',
        status: searchValues.status !== undefined ? searchValues.status : '',
      }

      const res = await http.get('/sysDictType/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load dictionaries:', err)
      message.error(err?.message || 'Failed to load dictionary list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDelete = async (dictId: number) => {
    try {
      await http.delete(`/sysDictType/delete?id=${dictId}`)
      message.success('Dictionary type deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete dictionary')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select dictionaries first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/sysDictType/deleteBatch?ids=${ids}`)
      message.success('Selected dictionaries deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected dictionaries')
    }
  }

  const handleRefreshCache = async () => {
    try {
      await http.post('/sysDictType/refreshCache')
      message.success('Dictionary cache refreshed successfully!')
    } catch (err: any) {
      message.error(err?.message || 'Failed to refresh cache')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    modalForm.setFieldsValue({ status: '0' })
    setModalOpen(true)
  }

  const handleOpenEdit = (record: DictTypeRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      dictName: record.dictName,
      dictType: record.dictType,
      status: String(record.status || '0'),
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        dictName: values.dictName,
        dictType: values.dictType,
        status: values.status,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.dictId = editingRecord.dictId
        await http.put('/sysDictType/update', payload)
        message.success('Dictionary updated successfully')
      } else {
        await http.post('/sysDictType/add', payload)
        message.success('Dictionary created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save dictionary')
    } finally {
      setSubmitting(false)
    }
  }

  // Dict Data (Values) Handlers
  const fetchDictData = async (type: string) => {
    setDataLoading(true)
    try {
      const res = await http.get('/sysDictData/list', {
        search: JSON.stringify({ dictType: type }),
        currentPage: 1,
        pageSize: 100,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      setDictDataList(rows)
    } catch (_) {
      setDictDataList([])
    } finally {
      setDataLoading(false)
    }
  }

  const handleOpenDictData = (record: DictTypeRecord) => {
    setCurrentDictType(record)
    setDataModalOpen(true)
    fetchDictData(record.dictType)
  }

  const handleOpenAddDataItem = () => {
    setEditingDataItem(null)
    dataModalForm.resetFields()
    dataModalForm.setFieldsValue({ dictType: currentDictType?.dictType, status: '0', dictSort: 1 })
    setDataItemModalOpen(true)
  }

  const handleOpenEditDataItem = (item: DictDataRecord) => {
    setEditingDataItem(item)
    dataModalForm.setFieldsValue({
      dictLabel: item.dictLabel,
      dictValue: item.dictValue,
      dictSort: item.dictSort || 1,
      status: String(item.status || '0'),
      remark: item.remark,
    })
    setDataItemModalOpen(true)
  }

  const handleSaveDataItem = async () => {
    try {
      const values = await dataModalForm.validateFields()
      setSubmittingDataItem(true)
      const payload: any = {
        dictType: currentDictType?.dictType,
        dictLabel: values.dictLabel,
        dictValue: values.dictValue,
        dictSort: values.dictSort || 1,
        status: values.status,
        remark: values.remark || '',
      }

      if (editingDataItem) {
        payload.dictCode = editingDataItem.dictCode
        await http.put('/sysDictData/update', payload)
        message.success('Dictionary value updated')
      } else {
        await http.post('/sysDictData/add', payload)
        message.success('Dictionary value added')
      }

      setDataItemModalOpen(false)
      if (currentDictType) fetchDictData(currentDictType.dictType)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save dictionary item')
    } finally {
      setSubmittingDataItem(false)
    }
  }

  const handleDeleteDataItem = async (dictCode: number) => {
    try {
      await http.delete(`/sysDictData/delete?id=${dictCode}`)
      message.success('Dictionary value deleted')
      if (currentDictType) fetchDictData(currentDictType.dictType)
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete dictionary value')
    }
  }

  const columnsConfig: Record<string, any> = {
    rowIndex: {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) =>
        (pagination.current - 1) * pagination.pageSize + idx + 1,
    },
    action: {
      title: 'Action',
      key: 'action',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: DictTypeRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this dictionary?" onConfirm={() => handleDelete(record.dictId)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    dictName: {
      title: 'Dictionary Name',
      dataIndex: 'dictName',
      key: 'dictName',
      width: 180,
      ellipsis: true,
    },
    dictType: {
      title: 'Dictionary Type (Key)',
      dataIndex: 'dictType',
      key: 'dictType',
      width: 200,
      ellipsis: true,
      render: (text: string, record: DictTypeRecord) => (
        <a onClick={() => handleOpenDictData(record)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    status: {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 85,
      align: 'center' as const,
      render: (val: any) => {
        const isNormal = val === 0 || val === '0'
        return <Tag color={isNormal ? 'green' : 'orange'}>{isNormal ? 'Normal' : 'Disabled'}</Tag>
      },
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    createTime: {
      title: 'Created Time',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (v: any) => v || '-',
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 380 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Dictionary Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'action' || key === 'dictName'}>
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
        onClick={() => setVisibleColumns(['rowIndex', 'action', 'dictName', 'dictType', 'status', 'remark', 'createTime'])}
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
              name="dictName"
              label="Dict Name:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter dictionary name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="dictType"
              label="Dict Type:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter dictionary type..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="status"
              label="Status:"
              labelCol={{ flex: '60px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="Select status..." allowClear style={{ width: '100%' }}>
                <Select.Option value="0">Normal (正常)</Select.Option>
                <Select.Option value="1">Disabled (禁用)</Select.Option>
              </Select>
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
            </Space>
          </Col>
        </Row>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Create Dictionary
          </Button>
          <Popconfirm
            title="Delete selected dictionaries?"
            onConfirm={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              Delete Selected Dictionaries
            </Button>
          </Popconfirm>
          <Button icon={<SyncOutlined />} onClick={handleRefreshCache}>
            Refresh Cache
          </Button>
          <ExportPrintButtons
            title="Data Dictionaries Directory"
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
        rowKey="dictId"
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1000 }}
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

      {/* Dict Type Modal */}
      <Modal
        title={editingRecord ? 'Edit Dictionary Type' : 'New Dictionary Type'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={550}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="dictName"
            label="Dictionary Name"
            rules={[{ required: true, message: 'Please enter dictionary name' }]}
          >
            <Input placeholder="e.g. User Status, Payment Mode..." />
          </Form.Item>

          <Form.Item
            name="dictType"
            label="Dictionary Type (Key)"
            rules={[{ required: true, message: 'Please enter dictionary type identifier' }]}
          >
            <Input placeholder="e.g. sys_user_status, pay_type..." disabled={!!editingRecord} />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="0">
            <Select>
              <Select.Option value="0">Normal (正常)</Select.Option>
              <Select.Option value="1">Disabled (停用)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Dict Data List Modal */}
      <Modal
        title={`Dictionary Entries - ${currentDictType?.dictName} (${currentDictType?.dictType})`}
        open={dataModalOpen}
        onCancel={() => setDataModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDataModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={750}
      >
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddDataItem}>
            Add Value Entry
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => currentDictType && fetchDictData(currentDictType.dictType)}>
            Refresh
          </Button>
        </div>

        <Table
          rowKey="dictCode"
          bordered
          size="small"
          loading={dataLoading}
          dataSource={dictDataList}
          pagination={false}
          columns={[
            { title: '#', width: 45, align: 'center', render: (_, __, idx) => idx + 1 },
            {
              title: 'Action',
              width: 110,
              align: 'center',
              render: (_, item: DictDataRecord) => (
                <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
                  <a onClick={() => handleOpenEditDataItem(item)}>Edit</a>
                  <Popconfirm title="Delete this entry?" onConfirm={() => handleDeleteDataItem(item.dictCode)}>
                    <a style={{ color: '#ff4d4f' }}>Delete</a>
                  </Popconfirm>
                </Space>
              ),
            },
            { title: 'Item Label', dataIndex: 'dictLabel', key: 'dictLabel', width: 140 },
            { title: 'Item Value', dataIndex: 'dictValue', key: 'dictValue', width: 130 },
            { title: 'Sort', dataIndex: 'dictSort', key: 'dictSort', width: 70, align: 'center' },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 80,
              align: 'center',
              render: (v) => (
                <Tag color={v === 0 || v === '0' ? 'green' : 'orange'}>
                  {v === 0 || v === '0' ? 'Normal' : 'Disabled'}
                </Tag>
              ),
            },
          ]}
        />
      </Modal>

      {/* Dict Data Item Add/Edit Modal */}
      <Modal
        title={editingDataItem ? 'Edit Dictionary Value' : 'New Dictionary Value'}
        open={dataItemModalOpen}
        onCancel={() => setDataItemModalOpen(false)}
        onOk={handleSaveDataItem}
        confirmLoading={submittingDataItem}
        destroyOnHidden
        width={480}
      >
        <Form form={dataModalForm} layout="vertical">
          <Form.Item
            name="dictLabel"
            label="Data Label (Display Name)"
            rules={[{ required: true, message: 'Please enter data label' }]}
          >
            <Input placeholder="e.g. Enabled, In Progress, Card..." />
          </Form.Item>

          <Form.Item
            name="dictValue"
            label="Data Value (Stored Key)"
            rules={[{ required: true, message: 'Please enter data value' }]}
          >
            <Input placeholder="e.g. 0, 1, CARD..." />
          </Form.Item>

          <Form.Item name="dictSort" label="Sort Order">
            <InputNumber style={{ width: '100%' }} defaultValue={1} />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="0">
            <Select>
              <Select.Option value="0">Normal (正常)</Select.Option>
              <Select.Option value="1">Disabled (停用)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
