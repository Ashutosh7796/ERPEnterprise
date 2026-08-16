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

export interface PersonRecord {
  id: number
  name: string
  type?: string
  sort?: number
  enabled?: boolean | number
}

export const PersonListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PersonRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PersonRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = ['rowIndex', 'action', 'name', 'type', 'sort', 'enabled']
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'name',
    'type',
    'sort',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
        type: searchValues.type || '',
      }

      const res = await http.get('/person/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load personnel:', err)
      message.error(err?.message || 'Failed to load personnel list.')
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
      await http.delete(`/person/delete?id=${id}`)
      message.success('Handler deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete handler')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select handlers first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/person/deleteBatch?ids=${ids}`)
      message.success('Selected handlers deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected handlers')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select handlers first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/person/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Handlers enabled' : 'Handlers disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update handler status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: PersonRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      name: record.name,
      type: record.type,
      sort: record.sort || 1,
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
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/person/update', payload)
        message.success('Handler updated successfully')
      } else {
        await http.post('/person/add', payload)
        message.success('Handler created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save handler')
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
      render: (_: any, record: PersonRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this handler?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    name: {
      title: 'Handler / Person Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
    },
    type: {
      title: 'Role / Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (val: string) => {
        if (val === '销售员' || val === 'Salesperson') return <Tag color="cyan">Salesperson (销售员)</Tag>
        if (val === '财务员' || val === 'Finance') return <Tag color="purple">Finance (财务员)</Tag>
        return <Tag>{val || '-'}</Tag>
      },
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
        onClick={() => setVisibleColumns(['rowIndex', 'action', 'name', 'type', 'sort', 'enabled'])}
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
              label="Handler Name:"
              labelCol={{ flex: '105px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter handler name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="type"
              label="Role Type:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="Select role type..." allowClear style={{ width: '100%' }}>
                <Select.Option value="销售员">Salesperson (销售员)</Select.Option>
                <Select.Option value="财务员">Finance (财务员)</Select.Option>
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
            Add New
          </Button>
          <Popconfirm
            title="Delete selected handlers?"
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
            title="Handlers / Personnel List"
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
        scroll={{ x: 800 }}
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
        title={editingRecord ? 'Edit Handler Info' : 'Add New Handler'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={500}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="name"
            label="Handler Name"
            rules={[{ required: true, message: 'Please enter handler name' }]}
          >
            <Input placeholder="e.g. Rahul Sharma..." />
          </Form.Item>

          <Form.Item
            name="type"
            label="Role Type"
            rules={[{ required: true, message: 'Please select role type' }]}
          >
            <Select placeholder="Select role...">
              <Select.Option value="销售员">Salesperson (销售员)</Select.Option>
              <Select.Option value="财务员">Finance (财务员)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="sort" label="Sort Order">
            <InputNumber style={{ width: '100%' }} defaultValue={1} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
