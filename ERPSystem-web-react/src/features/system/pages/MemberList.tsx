import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
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
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface MemberRecord {
  id: number
  supplier: string // Member Card No.
  contacts?: string
  telephone?: string
  phoneNum?: string
  phonenum?: string
  email?: string
  advanceIn?: number
  sort?: number
  enabled?: boolean | number
  description?: string
}

export const MemberListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<MemberRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MemberRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'supplier',
    'contacts',
    'telephone',
    'phoneNum',
    'email',
    'advanceIn',
    'sort',
    'enabled',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'supplier',
    'contacts',
    'telephone',
    'phoneNum',
    'email',
    'advanceIn',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        type: '会员',
        supplier: searchValues.supplier || '',
        contacts: searchValues.contacts || '',
        telephone: searchValues.telephone || '',
        phonenum: searchValues.phonenum || '',
      }

      const res = await http.get('/supplier/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load members:', err)
      message.error(err?.message || 'Failed to load member list.')
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
      await http.delete(`/supplier/delete?id=${id}`)
      message.success('Member deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete member')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select members first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/supplier/deleteBatch?ids=${ids}`)
      message.success('Selected members deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected members')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select members first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/supplier/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Members enabled' : 'Members disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update member status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: MemberRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      supplier: record.supplier,
      contacts: record.contacts,
      telephone: record.telephone,
      phoneNum: record.phoneNum || record.phonenum,
      email: record.email,
      advanceIn: record.advanceIn || 0,
      sort: record.sort || 1,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        type: '会员',
        supplier: values.supplier,
        contacts: values.contacts || '',
        telephone: values.telephone || '',
        phoneNum: values.phoneNum || '',
        email: values.email || '',
        advanceIn: values.advanceIn || 0,
        sort: values.sort || 1,
        description: values.description || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/supplier/update', payload)
        message.success('Member updated successfully')
      } else {
        await http.post('/supplier/add', payload)
        message.success('Member created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save member')
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
      render: (_: any, record: MemberRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this member?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    supplier: {
      title: 'Member Card / ID',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 160,
      ellipsis: true,
    },
    contacts: {
      title: 'Member Name',
      dataIndex: 'contacts',
      key: 'contacts',
      width: 130,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    telephone: {
      title: 'Mobile Phone',
      dataIndex: 'telephone',
      key: 'telephone',
      width: 130,
      render: (v: any) => v || '-',
    },
    phoneNum: {
      title: 'Telephone',
      dataIndex: 'phoneNum',
      key: 'phoneNum',
      width: 130,
      render: (v: any, r: MemberRecord) => v || r.phonenum || '-',
    },
    email: {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 160,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    advanceIn: {
      title: 'Prepaid / Advance (₹)',
      dataIndex: 'advanceIn',
      key: 'advanceIn',
      width: 160,
      render: (v: any) => (v !== undefined ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
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
    <div style={{ width: 400 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Member Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'action' || key === 'supplier'}>
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
            'rowIndex',
            'action',
            'supplier',
            'contacts',
            'telephone',
            'phoneNum',
            'email',
            'advanceIn',
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
              name="supplier"
              label="Member Card #:"
              labelCol={{ flex: '115px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter member card / ID..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="contacts"
              label="Member Name:"
              labelCol={{ flex: '105px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Member name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="telephone"
              label="Mobile:"
              labelCol={{ flex: '65px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Mobile phone..." allowClear style={{ width: '100%' }} />
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
                name="phonenum"
                label="Telephone:"
                labelCol={{ flex: '95px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Office phone..." allowClear style={{ width: '100%' }} />
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Add New
          </Button>
          <Popconfirm
            title="Delete selected members?"
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
            title="Retail Member Information List"
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
        scroll={{ x: 1300 }}
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

      {/* Member Modal */}
      <Modal
        title={editingRecord ? 'Edit Member Info' : 'Add New Member'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={700}
      >
        <Form form={modalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Member Card # / ID"
                rules={[{ required: true, message: 'Please enter member card number' }]}
              >
                <Input placeholder="e.g. VIP-8801..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contacts"
                label="Member Name"
                rules={[{ required: true, message: 'Please enter member name' }]}
              >
                <Input placeholder="e.g. John Doe..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="telephone" label="Mobile Phone">
                <Input placeholder="e.g. +91 98765 00000..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNum" label="Telephone">
                <Input placeholder="e.g. 011-12345678..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="e.g. member@email.com..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="advanceIn" label="Prepaid Advance (₹)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort" label="Sort Order">
                <InputNumber style={{ width: '100%' }} defaultValue={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Remarks / Notes">
            <Input.TextArea rows={2} placeholder="Additional member notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
