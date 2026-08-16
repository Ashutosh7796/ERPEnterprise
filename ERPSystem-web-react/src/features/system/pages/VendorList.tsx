import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  EditOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface VendorRecord {
  id: number
  supplier: string
  contacts?: string
  telephone?: string
  phoneNum?: string
  phonenum?: string
  email?: string
  beginNeedPay?: number
  allNeedPay?: number
  taxRate?: number
  sort?: number
  enabled?: boolean | number
  description?: string
}

export const VendorListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<VendorRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<VendorRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'supplier',
    'contacts',
    'telephone',
    'phoneNum',
    'email',
    'beginNeedPay',
    'allNeedPay',
    'taxRate',
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
    'beginNeedPay',
    'allNeedPay',
    'taxRate',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        type: '供应商',
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
      console.error('Failed to load vendors:', err)
      message.error(err?.message || 'Failed to load vendor list.')
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
      message.success('Vendor deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete vendor')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select vendors first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/supplier/deleteBatch?ids=${ids}`)
      message.success('Selected vendors deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected vendors')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select vendors first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/supplier/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Vendors enabled' : 'Vendors disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update vendor status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: VendorRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      supplier: record.supplier,
      contacts: record.contacts,
      telephone: record.telephone,
      phoneNum: record.phoneNum || record.phonenum,
      email: record.email,
      beginNeedPay: record.beginNeedPay || 0,
      taxRate: record.taxRate || 0,
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
        type: '供应商',
        supplier: values.supplier,
        contacts: values.contacts || '',
        telephone: values.telephone || '',
        phoneNum: values.phoneNum || '',
        email: values.email || '',
        beginNeedPay: values.beginNeedPay || 0,
        taxRate: values.taxRate || 0,
        sort: values.sort || 1,
        description: values.description || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/supplier/update', payload)
        message.success('Vendor updated successfully')
      } else {
        await http.post('/supplier/add', payload)
        message.success('Vendor created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save vendor')
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
      render: (_: any, record: VendorRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this vendor?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    supplier: {
      title: 'Vendor Name',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 180,
      ellipsis: true,
    },
    contacts: {
      title: 'Contact Person',
      dataIndex: 'contacts',
      key: 'contacts',
      width: 120,
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
      render: (v: any, r: VendorRecord) => v || r.phonenum || '-',
    },
    email: {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 160,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    beginNeedPay: {
      title: 'Opening Payable (₹)',
      dataIndex: 'beginNeedPay',
      key: 'beginNeedPay',
      width: 140,
      render: (v: any) => (v !== undefined ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    allNeedPay: {
      title: 'Closing Payable (₹)',
      dataIndex: 'allNeedPay',
      key: 'allNeedPay',
      width: 140,
      render: (v: any) => (v !== undefined ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    taxRate: {
      title: 'Tax Rate (%)',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 110,
      render: (v: any) => (v !== undefined ? `${v}%` : '0%'),
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
    <div style={{ width: 420 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Vendor Column Display Settings</div>
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
            'beginNeedPay',
            'allNeedPay',
            'taxRate',
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
              label="Vendor Name:"
              labelCol={{ flex: '95px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter vendor name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="contacts"
              label="Contact:"
              labelCol={{ flex: '70px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Contact person..." allowClear style={{ width: '100%' }} />
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
            title="Delete selected vendors?"
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
            title="Vendor / Supplier Master List"
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
        scroll={{ x: 1400 }}
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

      {/* Vendor Modal */}
      <Modal
        title={editingRecord ? 'Edit Vendor Info' : 'Add New Vendor'}
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
                label="Vendor Name"
                rules={[{ required: true, message: 'Please enter vendor name' }]}
              >
                <Input placeholder="e.g. Acme Supplies Ltd..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contacts" label="Contact Person">
                <Input placeholder="e.g. John Doe..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="telephone" label="Mobile Phone">
                <Input placeholder="e.g. +91 98765 43210..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNum" label="Office Telephone">
                <Input placeholder="e.g. 011-23456789..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="e.g. vendor@company.com..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxRate" label="Tax Rate (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="beginNeedPay" label="Opening Payable (₹)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="Sort Order">
                <InputNumber style={{ width: '100%' }} defaultValue={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Remarks / Notes">
            <Input.TextArea rows={2} placeholder="Additional vendor information..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
