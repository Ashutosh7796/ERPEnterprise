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
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import { translateMenuTitle } from '@shared/utils/menuTranslations'

export interface FunctionRecord {
  id: number
  number: string
  name: string
  parentNumber?: string
  parentName?: string
  url?: string
  component?: string
  sort?: number
  enabled?: boolean | number
  icon?: string
}

export const FunctionListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<FunctionRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FunctionRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'number',
    'name',
    'parentNumber',
    'parentName',
    'url',
    'component',
    'sort',
    'enabled',
    'icon',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'number',
    'name',
    'parentName',
    'url',
    'sort',
    'enabled',
    'icon',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
      }

      const res = await http.get('/function/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load functions:', err)
      message.error(err?.message || 'Failed to load menu list.')
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
      await http.delete(`/function/delete?id=${id}`)
      message.success('Menu item deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete menu item')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select menu items first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/function/deleteBatch?ids=${ids}`)
      message.success('Selected menu items deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected menu items')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    modalForm.setFieldsValue({
      enabled: 1,
      sort: 1,
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (record: FunctionRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      number: record.number,
      name: record.name,
      parentNumber: record.parentNumber,
      url: record.url,
      component: record.component,
      sort: record.sort || 1,
      enabled: record.enabled === 1 || record.enabled === true ? 1 : 0,
      icon: record.icon,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        number: values.number,
        name: values.name,
        parentNumber: values.parentNumber || '',
        url: values.url || '',
        component: values.component || '',
        sort: values.sort || 1,
        enabled: values.enabled,
        icon: values.icon || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/function/update', payload)
        message.success('Menu item updated successfully')
      } else {
        await http.post('/function/add', payload)
        message.success('Menu item created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save menu item')
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
      render: (_: any, record: FunctionRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this menu item?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    number: {
      title: 'Menu Code',
      dataIndex: 'number',
      key: 'number',
      width: 110,
    },
    name: {
      title: 'Menu Name',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
      render: (v: any) => translateMenuTitle(v) || '-',
    },
    parentNumber: {
      title: 'Parent Code',
      dataIndex: 'parentNumber',
      key: 'parentNumber',
      width: 110,
      render: (v: any) => v || '-',
    },
    parentName: {
      title: 'Parent Menu',
      dataIndex: 'parentName',
      key: 'parentName',
      width: 140,
      render: (v: any) => translateMenuTitle(v) || '-',
    },
    url: {
      title: 'Route URL',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    component: {
      title: 'Component Path',
      dataIndex: 'component',
      key: 'component',
      width: 200,
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
        const isEnabled = val === 1 || val === '1' || val === true
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
    icon: {
      title: 'Icon Name',
      dataIndex: 'icon',
      key: 'icon',
      width: 120,
      render: (v: any) => v || '-',
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 380 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Menu Column Display Settings</div>
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
        onClick={() =>
          setVisibleColumns(['rowIndex', 'action', 'number', 'name', 'parentName', 'url', 'sort', 'enabled', 'icon'])
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
              name="name"
              label="Menu Name:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter menu name..." allowClear style={{ width: '100%' }} />
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
            Add New Menu
          </Button>
          <Popconfirm
            title="Delete selected menu items?"
            onConfirm={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              Batch Delete
            </Button>
          </Popconfirm>
          <ExportPrintButtons
            title="System Navigation Menu Management"
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
        scroll={{ x: 1200 }}
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
        title={editingRecord ? 'Edit Menu Item' : 'Add New Menu Item'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={600}
      >
        <Form form={modalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="number"
                label="Menu Code #"
                rules={[{ required: true, message: 'Please enter menu code' }]}
              >
                <Input placeholder="e.g. 010101" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Menu Name"
                rules={[{ required: true, message: 'Please enter menu name' }]}
              >
                <Input placeholder="e.g. Sales Inbound" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parentNumber" label="Parent Menu Code">
                <Input placeholder="e.g. 0101" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="url" label="Frontend Route URL">
                <Input placeholder="e.g. /sales/outbound" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort" label="Sort Order">
                <InputNumber style={{ width: '100%' }} defaultValue={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enabled" label="Status" initialValue={1}>
                <Select>
                  <Select.Option value={1}>Active (启用)</Select.Option>
                  <Select.Option value={0}>Disabled (禁用)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="icon" label="Icon Name">
            <Input placeholder="e.g. appstore, shop, user..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
