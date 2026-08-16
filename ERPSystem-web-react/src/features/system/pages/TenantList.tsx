import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Popover,
  Checkbox,
  Divider,
  Tag,
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
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface TenantRecord {
  id: number
  tenantId?: number
  loginName?: string
  userCount?: string | number
  userNumLimit?: number
  roleName?: string
  roleId?: number
  type?: string | number
  enabled?: boolean | number
  createTimeStr?: string
  expireTimeStr?: string
  expireTime?: any
  remark?: string
}

export const TenantListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<TenantRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Roles for Tenant Modal
  const [roleList, setRoleList] = useState<{ id: number; name: string }[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TenantRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'loginName',
    'userCount',
    'userNumLimit',
    'roleName',
    'type',
    'enabled',
    'createTimeStr',
    'expireTimeStr',
    'remark',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'loginName',
    'userCount',
    'userNumLimit',
    'roleName',
    'type',
    'enabled',
    'expireTimeStr',
    'remark',
  ])

  const loadRoleOptions = async () => {
    try {
      const res = await http.get<any>('/role/findUserRole')
      const roles = Array.isArray(res) ? res : res?.data || []
      setRoleList(roles)
    } catch (_) {}
  }

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        loginName: searchValues.loginName || '',
        type: searchValues.type !== undefined ? searchValues.type : '',
        enabled: searchValues.enabled !== undefined ? searchValues.enabled : '',
        remark: searchValues.remark || '',
      }

      const res = await http.get('/tenant/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load tenants:', err)
      message.error(err?.message || 'Failed to load tenant list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    loadRoleOptions()
  }, [])

  const handleBatchStatus = async (status: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select tenants first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/tenant/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status === 1 ? 'Tenants enabled' : 'Tenants disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update tenant status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    modalForm.setFieldsValue({
      userNumLimit: 10,
      type: '0',
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (record: TenantRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      loginName: record.loginName,
      userNumLimit: record.userNumLimit || 10,
      roleId: record.roleId,
      type: String(record.type || '0'),
      expireTime: record.expireTimeStr ? dayjs(record.expireTimeStr) : undefined,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        loginName: values.loginName,
        userNumLimit: values.userNumLimit || 10,
        roleId: values.roleId,
        type: values.type,
        expireTime: values.expireTime ? values.expireTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/tenant/update', payload)
        message.success('Tenant updated successfully')
      } else {
        await http.post('/tenant/add', payload)
        message.success('Tenant created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save tenant')
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
      width: 100,
      align: 'center' as const,
      render: (_: any, record: TenantRecord) => (
        <a onClick={() => handleOpenEdit(record)}>Edit</a>
      ),
    },
    loginName: {
      title: 'Tenant Username',
      dataIndex: 'loginName',
      key: 'loginName',
      width: 150,
      ellipsis: true,
    },
    userCount: {
      title: 'Active Users',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 110,
      align: 'center' as const,
      render: (v: any) => v || '0',
    },
    userNumLimit: {
      title: 'User Limit',
      dataIndex: 'userNumLimit',
      key: 'userNumLimit',
      width: 100,
      align: 'center' as const,
      render: (v: any) => v || 'Unlimited',
    },
    roleName: {
      title: 'Tenant Role',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 130,
      render: (v: any) => (v ? <Tag color="blue">{v}</Tag> : '-'),
    },
    type: {
      title: 'Tenant Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      align: 'center' as const,
      render: (v: any) => {
        if (v === 0 || v === '0') return <Tag color="default">Trial (试用)</Tag>
        if (v === 1 || v === '1') return <Tag color="green">Paid (付费)</Tag>
        return <Tag>{v || '-'}</Tag>
      },
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
    createTimeStr: {
      title: 'Created Date',
      dataIndex: 'createTimeStr',
      key: 'createTimeStr',
      width: 140,
      render: (v: any) => v || '-',
    },
    expireTimeStr: {
      title: 'Expiry Date',
      dataIndex: 'expireTimeStr',
      key: 'expireTimeStr',
      width: 140,
      render: (v: any) => v || '-',
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 400 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Tenant Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'action' || key === 'loginName'}>
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
            'loginName',
            'userCount',
            'userNumLimit',
            'roleName',
            'type',
            'enabled',
            'expireTimeStr',
            'remark',
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
              name="loginName"
              label="Username:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search tenant username..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="type"
              label="Tenant Type:"
              labelCol={{ flex: '95px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="Select type..." allowClear style={{ width: '100%' }}>
                <Select.Option value="0">Trial Tenant (试用租户)</Select.Option>
                <Select.Option value="1">Paid Tenant (付费租户)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="enabled"
              label="Status:"
              labelCol={{ flex: '60px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="Select status..." allowClear style={{ width: '100%' }}>
                <Select.Option value="1">Active (启用)</Select.Option>
                <Select.Option value="0">Disabled (禁用)</Select.Option>
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
                name="remark"
                label="Remarks:"
                labelCol={{ flex: '85px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Search remarks..." allowClear style={{ width: '100%' }} />
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
            Add New Tenant
          </Button>
          <Button
            icon={<CheckOutlined />}
            onClick={() => handleBatchStatus(1)}
            disabled={selectedRowKeys.length === 0}
          >
            Enable
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={() => handleBatchStatus(0)}
            disabled={selectedRowKeys.length === 0}
          >
            Disable
          </Button>
          <ExportPrintButtons
            title="SaaS Tenant Directory"
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

      {/* Tenant Modal */}
      <Modal
        title={editingRecord ? 'Edit Tenant Information' : 'New SaaS Tenant'}
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
                name="loginName"
                label="Tenant Username"
                rules={[{ required: true, message: 'Please enter tenant username' }]}
              >
                <Input placeholder="e.g. tenant_corp" disabled={!!editingRecord} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="userNumLimit" label="User Seat Limit">
                <InputNumber style={{ width: '100%' }} min={1} max={9999} defaultValue={10} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleId" label="Tenant Admin Role">
                <Select placeholder="Select role..." allowClear>
                  {roleList.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Tenant Type" initialValue="0">
                <Select placeholder="Select type...">
                  <Select.Option value="0">Trial Tenant (试用租户)</Select.Option>
                  <Select.Option value="1">Paid Tenant (付费租户)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="expireTime" label="Subscription Expiration Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" showTime />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="Remarks / Notes">
            <Input.TextArea rows={2} placeholder="Optional tenant notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
