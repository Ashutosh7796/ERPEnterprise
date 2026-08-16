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
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface AccountRecord {
  id: number
  name: string
  serialNo?: string
  initialAmount?: number
  currentAmount?: number
  remark?: string
  sort?: number
  isDefault?: boolean | number
  enabled?: boolean | number
}

export const AccountListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<AccountRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AccountRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'name',
    'serialNo',
    'initialAmount',
    'currentAmount',
    'remark',
    'sort',
    'enabled',
    'isDefault',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'name',
    'serialNo',
    'initialAmount',
    'currentAmount',
    'remark',
    'enabled',
    'isDefault',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
        serialNo: searchValues.serialNo || '',
        remark: searchValues.remark || '',
      }

      const res = await http.get('/account/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      message.error(err?.message || 'Failed to load settlement account list.')
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
      await http.delete(`/account/delete?id=${id}`)
      message.success('Account deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete account')
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await http.post(`/account/updateIsDefault?id=${id}`)
      message.success('Account set as default successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to set default account')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select accounts first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/account/deleteBatch?ids=${ids}`)
      message.success('Selected accounts deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected accounts')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select accounts first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/account/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Accounts enabled' : 'Accounts disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update account status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: AccountRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      name: record.name,
      serialNo: record.serialNo,
      initialAmount: record.initialAmount || 0,
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
        serialNo: values.serialNo || '',
        initialAmount: values.initialAmount || 0,
        sort: values.sort || 1,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/account/update', payload)
        message.success('Account updated successfully')
      } else {
        await http.post('/account/add', payload)
        message.success('Account created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save account')
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
      width: 190,
      align: 'center' as const,
      render: (_: any, record: AccountRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <Popconfirm title="Set this as default settlement account?" onConfirm={() => handleSetDefault(record.id)}>
            <a>Set Default</a>
          </Popconfirm>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this account?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    name: {
      title: 'Account Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
    },
    serialNo: {
      title: 'Account Number / Code',
      dataIndex: 'serialNo',
      key: 'serialNo',
      width: 190,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    initialAmount: {
      title: 'Opening Balance (₹)',
      dataIndex: 'initialAmount',
      key: 'initialAmount',
      width: 160,
      render: (v: any) => (v !== undefined ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    currentAmount: {
      title: 'Current Balance (₹)',
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 160,
      render: (v: any) => (v !== undefined ? `₹${Number(v).toFixed(2)}` : '₹0.00'),
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
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
        const isEnabled = val === true || val === 1 || val === '1'
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
    isDefault: {
      title: 'Is Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 95,
      align: 'center' as const,
      render: (val: any) => {
        const isDef = val === true || val === 1 || val === '1'
        return <Tag color={isDef ? 'green' : 'default'}>{isDef ? 'Yes (Default)' : 'No'}</Tag>
      },
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 400 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Account Column Display Settings</div>
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
          setVisibleColumns([
            'rowIndex',
            'action',
            'name',
            'serialNo',
            'initialAmount',
            'currentAmount',
            'remark',
            'enabled',
            'isDefault',
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
              name="name"
              label="Account Name:"
              labelCol={{ flex: '110px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter account name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="serialNo"
              label="Account #:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Account number / code..." allowClear style={{ width: '100%' }} />
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
              <Input placeholder="Search remarks..." allowClear style={{ width: '100%' }} />
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
            title="Delete selected accounts?"
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
            title="Settlement Accounts List"
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

      {/* Account Modal */}
      <Modal
        title={editingRecord ? 'Edit Settlement Account' : 'Add Settlement Account'}
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
                name="name"
                label="Account Name"
                rules={[{ required: true, message: 'Please enter account name' }]}
              >
                <Input placeholder="e.g. HDFC Bank, Petty Cash..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serialNo" label="Account Number / Code">
                <Input placeholder="e.g. 5010023456789..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="initialAmount" label="Opening Balance (₹)">
                <InputNumber style={{ width: '100%' }} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="Sort Order">
                <InputNumber style={{ width: '100%' }} defaultValue={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="Remarks / Notes">
            <Input.TextArea rows={2} placeholder="Additional account details..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
