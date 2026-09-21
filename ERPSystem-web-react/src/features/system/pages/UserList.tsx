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
  Tree,
  App,
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
  KeyOutlined,
  DatabaseOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { md5 } from '@shared/utils/md5'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface UserRecord {
  id: number
  loginName: string
  userName: string
  userType?: string
  roleName?: string
  roleId?: number
  orgAbr?: string
  orgaId?: number
  leaderFlagStr?: string
  phonenum?: string
  email?: string
  userBlngOrgaDsplSeq?: number
  status?: number // 0: Enabled, 2: Disabled
  description?: string
}

export const UserListPage: React.FC = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [resetPwdForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<UserRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Roles & Orgs for Modal Select
  const [roleList, setRoleList] = useState<{ id: number; name: string }[]>([])
  const [orgList, setOrgList] = useState<{ id: number; orgAbr: string }[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<UserRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset Pwd Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetUserRecord, setResetUserRecord] = useState<UserRecord | null>(null)
  const [resetSubmitting, setResetSubmitting] = useState(false)

  // Assign Depot Modal State
  const [depotModalOpen, setDepotModalOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<UserRecord | null>(null)
  const [depotTree, setDepotTree] = useState<any[]>([])
  const [checkedDepotKeys, setCheckedDepotKeys] = useState<React.Key[]>([])
  const [depotSubmitting, setDepotSubmitting] = useState(false)

  // Assign Customer Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerTree, setCustomerTree] = useState<any[]>([])
  const [checkedCustomerKeys, setCheckedCustomerKeys] = useState<React.Key[]>([])
  const [customerSubmitting, setCustomerSubmitting] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'loginName',
    'userName',
    'userType',
    'roleName',
    'orgAbr',
    'leaderFlagStr',
    'phonenum',
    'userBlngOrgaDsplSeq',
    'status',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'loginName',
    'userName',
    'roleName',
    'orgAbr',
    'leaderFlagStr',
    'phonenum',
    'status',
  ])

  const loadSelectOptions = async () => {
    try {
      const [rolesRes, orgsRes] = await Promise.all([
        http.get<any>('/role/findUserRole'),
        http.get<any>('/organization/getOrganizationTree'),
      ])
      const rawRoles = Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || []
      const mappedRoles = rawRoles.map((r: any) => ({
        ...r,
        id: r.id,
        name: r.name || r.text || '',
      }))
      setRoleList(mappedRoles)
      if (Array.isArray(orgsRes)) {
        setOrgList(orgsRes)
      } else if (orgsRes?.data && Array.isArray(orgsRes.data)) {
        setOrgList(orgsRes.data)
      }
    } catch (_) {}
  }

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        loginName: searchValues.loginName || '',
        userName: searchValues.userName || '',
      }

      const res: any = await http.get('/user/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load users:', err)
      message.error(err?.message || 'Failed to load user list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    loadSelectOptions()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await http.delete(`/user/delete?id=${id}`)
      message.success('User deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete user')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select users first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/user/deleteBatch?ids=${ids}`)
      message.success('Selected users deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected users')
    }
  }

  const handleBatchStatus = async (status: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select users first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/user/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status === 0 ? 'Users enabled' : 'Users disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update user status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: UserRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      loginName: record.loginName,
      userName: record.userName,
      phonenum: record.phonenum,
      email: record.email,
      roleId: record.roleId,
      orgaId: record.orgaId,
      userBlngOrgaDsplSeq: record.userBlngOrgaDsplSeq || 1,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        loginName: values.loginName,
        userName: values.userName,
        phonenum: values.phonenum || '',
        email: values.email || '',
        roleId: values.roleId,
        orgaId: values.orgaId,
        userBlngOrgaDsplSeq: values.userBlngOrgaDsplSeq || 1,
        description: values.description || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/user/update', payload)
        message.success('User updated successfully')
      } else {
        payload.password = md5(values.password || '123456')
        await http.post('/user/addUser', payload)
        message.success('User created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenResetPwd = (record: UserRecord) => {
    setResetUserRecord(record)
    resetPwdForm.resetFields()
    setResetModalOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetUserRecord) return
    try {
      const values = await resetPwdForm.validateFields()
      setResetSubmitting(true)
      await http.post('/user/resetPwd', {
        id: resetUserRecord.id,
        password: md5(values.newPassword),
      })
      message.success(`Password for ${resetUserRecord.userName || resetUserRecord.loginName} has been reset!`)
      setResetModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to reset password')
    } finally {
      setResetSubmitting(false)
    }
  }

  // Format Tree nodes for Depot / Customer selection
  const formatCheckTree = (nodes: any[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.id || node.key),
      title: node.title || node.name || node.text || node.supplier,
      children: node.children && node.children.length > 0 ? formatCheckTree(node.children) : undefined,
    }))
  }

  // Assign Depot Handler
  const handleOpenAssignDepot = async (record: UserRecord) => {
    setTargetUser(record)
    setDepotModalOpen(true)
    try {
      const res: any = await http.get(`/depot/findUserDepot?UBType=UserDepot&UBKeyId=${record.id}`)
      const rawTree = Array.isArray(res) ? res : res?.data || []
      setDepotTree(formatCheckTree(rawTree))

      const preChecked: string[] = []
      const collectChecked = (items: any[]) => {
        for (const item of items) {
          if (item.checked) preChecked.push(String(item.id || item.key))
          if (item.children) collectChecked(item.children)
        }
      }
      collectChecked(rawTree)
      setCheckedDepotKeys(preChecked)
    } catch (err) {
      message.error('Failed to load user warehouse assignments')
    }
  }

  const handleSaveDepot = async () => {
    if (!targetUser) return
    setDepotSubmitting(true)
    try {
      await http.post('/userBusiness/updateBtnStr', {
        userId: targetUser.id,
        btnStr: checkedDepotKeys.join(','),
      })
      message.success(`Warehouse assignments updated for ${targetUser.userName}`)
      setDepotModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save warehouse assignments')
    } finally {
      setDepotSubmitting(false)
    }
  }

  // Assign Customer Handler
  const handleOpenAssignCustomer = async (record: UserRecord) => {
    setTargetUser(record)
    setCustomerModalOpen(true)
    try {
      const res: any = await http.get(`/supplier/findUserCustomer?UBType=UserCustomer&UBKeyId=${record.id}`)
      const rawTree = Array.isArray(res) ? res : res?.data || []
      setCustomerTree(formatCheckTree(rawTree))

      const preChecked: string[] = []
      const collectChecked = (items: any[]) => {
        for (const item of items) {
          if (item.checked) preChecked.push(String(item.id || item.key))
          if (item.children) collectChecked(item.children)
        }
      }
      collectChecked(rawTree)
      setCheckedCustomerKeys(preChecked)
    } catch (err) {
      message.error('Failed to load customer assignments')
    }
  }

  const handleSaveCustomer = async () => {
    if (!targetUser) return
    setCustomerSubmitting(true)
    try {
      await http.post('/userBusiness/updateBtnStr', {
        userId: targetUser.id,
        btnStr: checkedCustomerKeys.join(','),
      })
      message.success(`Customer assignments updated for ${targetUser.userName}`)
      setCustomerModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save customer assignments')
    } finally {
      setCustomerSubmitting(false)
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
      width: 320,
      align: 'center' as const,
      render: (_: any, record: UserRecord) => (
        <Space separator={<span style={{ color: '#d9d9d9', margin: '0 4px' }}>|</span>} size={0}>
          <a onClick={() => handleOpenAssignDepot(record)}>Assign Depot</a>
          <a onClick={() => handleOpenAssignCustomer(record)}>Assign Customer</a>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
          <a onClick={() => handleOpenResetPwd(record)}>Reset Pwd</a>
        </Space>
      ),
    },
    loginName: {
      title: 'Login Username',
      dataIndex: 'loginName',
      key: 'loginName',
      width: 140,
      ellipsis: true,
    },
    userName: {
      title: 'Full Name',
      dataIndex: 'userName',
      key: 'userName',
      width: 140,
      ellipsis: true,
    },
    userType: {
      title: 'User Type',
      dataIndex: 'userType',
      key: 'userType',
      width: 110,
      render: (v: any) => v || '-',
    },
    roleName: {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 130,
      render: (v: any) => (v ? <Tag color="blue">{v}</Tag> : '-'),
    },
    orgAbr: {
      title: 'Department / Org',
      dataIndex: 'orgAbr',
      key: 'orgAbr',
      width: 150,
      render: (v: any) => v || '-',
    },
    leaderFlagStr: {
      title: 'Is Manager',
      dataIndex: 'leaderFlagStr',
      key: 'leaderFlagStr',
      width: 100,
      render: (v: any) => v || '-',
    },
    phonenum: {
      title: 'Phone',
      dataIndex: 'phonenum',
      key: 'phonenum',
      width: 130,
      render: (v: any) => v || '-',
    },
    userBlngOrgaDsplSeq: {
      title: 'Sort Order',
      dataIndex: 'userBlngOrgaDsplSeq',
      key: 'userBlngOrgaDsplSeq',
      width: 90,
    },
    status: {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 85,
      align: 'center' as const,
      render: (val: any) => {
        const isEnabled = val === 0 || val === '0'
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 380 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>User Column Display Settings</div>
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
            'userName',
            'roleName',
            'orgAbr',
            'leaderFlagStr',
            'phonenum',
            'status',
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
              <Input placeholder="Search login name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="userName"
              label="Full Name:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search user full name..." allowClear style={{ width: '100%' }} />
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
            Add New User
          </Button>
          <Popconfirm
            title="Delete selected users?"
            onConfirm={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              Batch Delete
            </Button>
          </Popconfirm>
          <Button
            icon={<CheckOutlined />}
            onClick={() => handleBatchStatus(0)}
            disabled={selectedRowKeys.length === 0}
          >
            Enable
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={() => handleBatchStatus(2)}
            disabled={selectedRowKeys.length === 0}
          >
            Disable
          </Button>
          <ExportPrintButtons
            title="User Management Directory"
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
        scroll={{ x: 1450 }}
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

      {/* User Add / Edit Modal */}
      <Modal
        title={editingRecord ? 'Edit User Account' : 'New User Account'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        forceRender
        width={650}
      >
        <Form form={modalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="loginName"
                label="Login Username"
                rules={[{ required: true, message: 'Please enter login username' }]}
              >
                <Input placeholder="e.g. john.doe" disabled={!!editingRecord} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="userName"
                label="User Full Name"
                rules={[{ required: true, message: 'Please enter user full name' }]}
              >
                <Input placeholder="e.g. John Doe" />
              </Form.Item>
            </Col>
          </Row>

          {!editingRecord && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="password"
                  label="Initial Password"
                  rules={[{ required: true, message: 'Please enter initial password' }]}
                  initialValue="123456"
                >
                  <Input.Password placeholder="Default: 123456" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phonenum" label="Phone Number">
                <Input placeholder="e.g. +91 98765 43210" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="e.g. user@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleId" label="Assign Role">
                <Select placeholder="Select user role..." allowClear>
                  {roleList.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="orgaId" label="Assign Department">
                <Select placeholder="Select department..." allowClear>
                  {orgList.map((o) => (
                    <Select.Option key={o.id} value={o.id}>
                      {o.orgAbr}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Remarks / Description">
            <Input.TextArea rows={2} placeholder="Optional user notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password for ${resetUserRecord?.userName || resetUserRecord?.loginName}`}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onOk={handleResetPassword}
        confirmLoading={resetSubmitting}
        forceRender
        width={450}
      >
        <Form form={resetPwdForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Warehouse (UserDepot) Modal */}
      <Modal
        title={`Assign Warehouses - ${targetUser?.userName || targetUser?.loginName}`}
        open={depotModalOpen}
        onCancel={() => setDepotModalOpen(false)}
        onOk={handleSaveDepot}
        confirmLoading={depotSubmitting}
        forceRender
        width={500}
      >
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {depotTree.length > 0 ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedDepotKeys}
              onCheck={(keys) => setCheckedDepotKeys(keys as React.Key[])}
              treeData={depotTree}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>Loading warehouses...</div>
          )}
        </div>
      </Modal>

      {/* Assign Customer (UserCustomer) Modal */}
      <Modal
        title={`Assign Customers - ${targetUser?.userName || targetUser?.loginName}`}
        open={customerModalOpen}
        onCancel={() => setCustomerModalOpen(false)}
        onOk={handleSaveCustomer}
        confirmLoading={customerSubmitting}
        forceRender
        width={500}
      >
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {customerTree.length > 0 ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedCustomerKeys}
              onCheck={(keys) => setCheckedCustomerKeys(keys as React.Key[])}
              treeData={customerTree}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>Loading customers...</div>
          )}
        </div>
      </Modal>
    </Card>
  )
}
