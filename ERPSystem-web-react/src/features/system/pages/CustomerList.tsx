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
  Tree,
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
  UserOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface CustomerRecord {
  id: number
  supplier: string // Customer Name
  contacts?: string
  telephone?: string
  phoneNum?: string
  phonenum?: string
  email?: string
  beginNeedGet?: number
  allNeedGet?: number
  taxRate?: number
  sort?: number
  enabled?: boolean | number
  description?: string
}

export const CustomerListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<CustomerRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CustomerRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Assign Users Modal State (CustomerUserModal)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [targetCustomer, setTargetCustomer] = useState<CustomerRecord | null>(null)
  const [userTree, setUserTree] = useState<any[]>([])
  const [checkedUserKeys, setCheckedUserKeys] = useState<React.Key[]>([])
  const [userSubmitting, setUserSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'supplier',
    'contacts',
    'telephone',
    'phoneNum',
    'email',
    'beginNeedGet',
    'allNeedGet',
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
    'beginNeedGet',
    'allNeedGet',
    'taxRate',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        type: '客户',
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
      console.error('Failed to load customers:', err)
      message.error(err?.message || 'Failed to load customer list.')
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
      message.success('Customer deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete customer')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select customers first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/supplier/deleteBatch?ids=${ids}`)
      message.success('Selected customers deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected customers')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select customers first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/supplier/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Customers enabled' : 'Customers disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update customer status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: CustomerRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      supplier: record.supplier,
      contacts: record.contacts,
      telephone: record.telephone,
      phoneNum: record.phoneNum || record.phonenum,
      email: record.email,
      beginNeedGet: record.beginNeedGet || 0,
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
        type: '客户',
        supplier: values.supplier,
        contacts: values.contacts || '',
        telephone: values.telephone || '',
        phoneNum: values.phoneNum || '',
        email: values.email || '',
        beginNeedGet: values.beginNeedGet || 0,
        taxRate: values.taxRate || 0,
        sort: values.sort || 1,
        description: values.description || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/supplier/update', payload)
        message.success('Customer updated successfully')
      } else {
        await http.post('/supplier/add', payload)
        message.success('Customer created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  // Format Checkable Tree Nodes
  const formatCheckTree = (nodes: any[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.id || node.key),
      title: node.title || node.userName || node.name || node.text,
      children: node.children && node.children.length > 0 ? formatCheckTree(node.children) : undefined,
    }))
  }

  // Assign Users Handler
  const handleOpenAssignUser = async (record: CustomerRecord) => {
    setTargetCustomer(record)
    setUserModalOpen(true)
    try {
      const res: any = await http.get(`/user/findUserCustomer?UBType=UserCustomer&UBKeyId=${record.id}`)
      const rawTree = Array.isArray(res) ? res : res?.data || []
      setUserTree(formatCheckTree(rawTree))

      const preChecked: string[] = []
      const scanChecked = (items: any[]) => {
        for (const item of items) {
          if (item.checked) preChecked.push(String(item.id || item.key))
          if (item.children) scanChecked(item.children)
        }
      }
      scanChecked(rawTree)
      setCheckedUserKeys(preChecked)
    } catch (err) {
      message.error('Failed to load user assignments')
    }
  }

  const handleSaveAssignUser = async () => {
    if (!targetCustomer) return
    setUserSubmitting(true)
    try {
      await http.post('/userBusiness/updateBtnStr', {
        roleId: targetCustomer.id,
        btnStr: checkedUserKeys.join(','),
      })
      message.success(`User assignments updated for customer: ${targetCustomer.supplier}`)
      setUserModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save user assignments')
    } finally {
      setUserSubmitting(false)
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
      width: 220,
      align: 'center' as const,
      render: (_: any, record: CustomerRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenAssignUser(record)}>Assign Users</a>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this customer?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    supplier: {
      title: 'Customer Name',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 180,
      ellipsis: true,
    },
    contacts: {
      title: 'Contact Person',
      dataIndex: 'contacts',
      key: 'contacts',
      width: 130,
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
      title: 'Landline / Phone',
      dataIndex: 'phoneNum',
      key: 'phoneNum',
      width: 130,
      render: (v: any, r: CustomerRecord) => v || r.phonenum || '-',
    },
    email: {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      width: 150,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    beginNeedGet: {
      title: 'Opening AR (₹)',
      dataIndex: 'beginNeedGet',
      key: 'beginNeedGet',
      width: 130,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? Number(v).toFixed(2) : '0.00'),
    },
    allNeedGet: {
      title: 'Accumulated AR (₹)',
      dataIndex: 'allNeedGet',
      key: 'allNeedGet',
      width: 140,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? Number(v).toFixed(2) : '0.00'),
    },
    taxRate: {
      title: 'Tax Rate (%)',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 110,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? `${v}%` : '-'),
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
    <div style={{ width: 340 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Customer Column Display Settings</div>
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
            'beginNeedGet',
            'allNeedGet',
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
              label="Customer:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search customer name..." allowClear style={{ width: '100%' }} />
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
              <Input placeholder="Search contact person..." allowClear style={{ width: '100%' }} />
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
              <Input placeholder="Search mobile phone..." allowClear style={{ width: '100%' }} />
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
                label="Landline:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Search landline..." allowClear style={{ width: '100%' }} />
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
            Add New Customer
          </Button>
          <Popconfirm
            title="Delete selected customers?"
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
            title="Customer Master Directory"
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

      {/* Add / Edit Customer Modal */}
      <Modal
        title={editingRecord ? 'Edit Customer' : 'New Customer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={600}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="supplier"
            label="Customer Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input placeholder="e.g. Acme Corporation" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contacts" label="Contact Person">
                <Input placeholder="e.g. Robert Smith" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="telephone" label="Mobile Phone">
                <Input placeholder="e.g. +91 98765 43210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="taxNum"
                label="Customer GSTIN (15-Digit, if B2B)"
                rules={[{ max: 15, message: 'GSTIN cannot exceed 15 characters' }]}
              >
                <Input placeholder="e.g. 27AABCZ9988P1Z3 (leave blank if Retail/B2C)" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Billing / Delivery Address">
                <Input placeholder="e.g. Mumbai, Maharashtra..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phoneNum" label="Landline / Phone">
                <Input placeholder="e.g. 022 2847 1234" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="e.g. contact@acme.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="beginNeedGet" label="Opening AR (₹)" initialValue={0}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxRate" label="Default Tax Rate (%)" initialValue={0}>
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="sort" label="Display Order" initialValue={1}>
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="Remarks / Description">
            <Input.TextArea rows={2} placeholder="Optional customer notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Users Modal (CustomerUserModal) */}
      <Modal
        title={`Assign Users - Customer: ${targetCustomer?.supplier}`}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onOk={handleSaveAssignUser}
        confirmLoading={userSubmitting}
        destroyOnHidden
        width={500}
      >
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {userTree.length > 0 ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedUserKeys}
              onCheck={(keys) => setCheckedUserKeys(keys as React.Key[])}
              treeData={userTree}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>Loading users...</div>
          )}
        </div>
      </Modal>
    </Card>
  )
}
