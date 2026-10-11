import React, { useState, useEffect, useCallback } from 'react'
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
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface InOutItemRecord {
  id: number
  name: string
  type: string
  remark?: string
  sort?: number
  enabled?: boolean | number
}

export const InOutItemListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<InOutItemRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InOutItemRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = ['rowIndex', 'action', 'name', 'type', 'remark', 'sort', 'enabled']
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'name',
    'type',
    'remark',
    'sort',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
        type: searchValues.type || '',
        remark: searchValues.remark || '',
      }

      const res = await http.get('/inOutItem/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load income/expense items:', err)
      message.error(err?.message || 'Failed to load income/expense item list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await http.delete(`/inOutItem/delete?id=${id}`)
      message.success('Item deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete item')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select items first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/inOutItem/deleteBatch?ids=${ids}`)
      message.success('Selected items deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected items')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select items first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/inOutItem/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Items enabled' : 'Items disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update item status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: InOutItemRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      name: record.name,
      type: record.type,
      sort: record.sort || 1,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        name: values.name,
        type: values.type,
        sort: values.sort || 1,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/inOutItem/update', payload)
        message.success('Item updated successfully')
      } else {
        await http.post('/inOutItem/add', payload)
        message.success('Item created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save item')
    } finally {
      setSubmitting(false)
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
      render: (_: any, record: InOutItemRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    name: {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
    },
    type: {
      title: 'Item Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (val: string) => {
        if (val === '收入' || val === 'Income') return <Tag color="blue">Income (收入)</Tag>
        if (val === '支出' || val === 'Expense') return <Tag color="magenta">Expense (支出)</Tag>
        return <Tag>{val || '-'}</Tag>
      },
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 240,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    sort: {
      title: 'Sort Order',
      dataIndex: 'sort',
      key: 'sort',
      width: 90,
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
    <div style={{ width: 360 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'action' || key === 'name'}>
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
        onClick={() => setVisibleColumns(['rowIndex', 'action', 'name', 'type', 'remark', 'sort', 'enabled'])}
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
              name="name"
              label="Item Name:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter item name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="type"
              label="Item Type:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="Select type..." allowClear style={{ width: '100%' }}>
                <Select.Option value="收入">Income (收入)</Select.Option>
                <Select.Option value="支出">Expense (支出)</Select.Option>
              </Select>
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
              <Input placeholder="Remarks / Notes..." allowClear style={{ width: '100%' }} />
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
            Create Item
          </Button>
          <Popconfirm
            title="Delete selected items?"
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
            title="Income and Expense Items"
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

      {/* Modal */}
      <Modal
        title={editingRecord ? 'Edit Income/Expense Item' : 'Create Income/Expense Item'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={550}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="name"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter item name' }]}
          >
            <Input placeholder="e.g. Courier Charges, Office Rent..." />
          </Form.Item>

          <Form.Item
            name="type"
            label="Item Type"
            rules={[{ required: true, message: 'Please select item type' }]}
          >
            <Select placeholder="Select Income or Expense...">
              <Select.Option value="收入">Income (收入)</Select.Option>
              <Select.Option value="支出">Expense (支出)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="sort" label="Sort Order">
            <InputNumber style={{ width: '100%' }} defaultValue={1} />
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
