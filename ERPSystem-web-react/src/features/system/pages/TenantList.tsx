import React, { useState, useEffect } from 'react'
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
  App,
  Steps,
  Dropdown,
  Descriptions,
  Alert,
  Tooltip,
} from 'antd'
import type { TableColumnsType, MenuProps } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
  KeyOutlined,
  ThunderboltOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  UndoOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { md5 } from '@shared/utils/md5'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface TenantRecord {
  id: number
  tenantId?: number
  loginName?: string
  companyName?: string
  status?: string
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
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<TenantRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Roles for Tenant Modal
  const [roleList, setRoleList] = useState<{ id: number; name: string }[]>([])

  // Basic Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TenantRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset Password Modal State
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdRecord, setResetPwdRecord] = useState<TenantRecord | null>(null)
  const [resetPwdForm] = Form.useForm()
  const [resetPwdSubmitting, setResetPwdSubmitting] = useState(false)

  // Lifecycle Action Modal State
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState<'suspend' | 'reactivate' | 'renew' | 'restore' | 'delete'>('suspend')
  const [lifecycleRecord, setLifecycleRecord] = useState<TenantRecord | null>(null)
  const [lifecycleForm] = Form.useForm()
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false)

  // Multi-Step Provisioning Wizard State
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardForm] = Form.useForm()
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  const allColumnKeys = [
    'rowIndex',
    'action',
    'loginName',
    'companyName',
    'status',
    'userCount',
    'userNumLimit',
    'roleName',
    'type',
    'createTimeStr',
    'expireTimeStr',
    'remark',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'loginName',
    'companyName',
    'status',
    'userCount',
    'userNumLimit',
    'roleName',
    'type',
    'expireTimeStr',
    'remark',
  ])

  const loadRoleOptions = async () => {
    try {
      let res: any = await http.get('/role/tenantRoleList')
      let roles = Array.isArray(res) ? res : res?.data || []
      if (!roles || roles.length === 0) {
        res = await http.get('/role/allList')
        roles = Array.isArray(res) ? res : res?.data || []
      }
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
      if (err?.status === 403 || err?.code === 403 || err?.message?.includes('Access Denied')) {
        // Suppress notification if customer tenant has legacy tab cached
      } else {
        console.error('Failed to load tenants:', err)
        message.error(err?.message || 'Failed to load tenant list.')
      }
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

  const handleOpenResetPwd = (record: TenantRecord) => {
    setResetPwdRecord(record)
    resetPwdForm.resetFields()
    resetPwdForm.setFieldsValue({
      newPassword: '123456',
    })
    setResetPwdOpen(true)
  }

  const handleSaveResetPwd = async () => {
    if (!resetPwdRecord) return
    try {
      const values = await resetPwdForm.validateFields()
      setResetPwdSubmitting(true)
      const targetId = resetPwdRecord.tenantId || resetPwdRecord.id
      await http.post('/user/resetPwd', {
        id: targetId,
        loginName: resetPwdRecord.loginName,
        password: md5(values.newPassword),
      })
      message.success(`Password for tenant "${resetPwdRecord.loginName}" reset successfully!`)
      setResetPwdOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to reset password')
    } finally {
      setResetPwdSubmitting(false)
    }
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
        password: values.password ? md5(values.password) : undefined,
        expireTime: values.expireTime ? values.expireTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        payload.tenantId = editingRecord.tenantId || editingRecord.id
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

  // =========================================================================
  // Lifecycle Governance Actions (/platform/tenant/*)
  // =========================================================================

  const openLifecycleModal = (record: TenantRecord, action: 'suspend' | 'reactivate' | 'renew' | 'restore' | 'delete') => {
    setLifecycleRecord(record)
    setLifecycleAction(action)
    lifecycleForm.resetFields()

    if (action === 'renew') {
      lifecycleForm.setFieldsValue({
        extendDays: 365,
        newPlanId: 1,
        reason: 'Enterprise annual subscription renewal',
      })
    } else if (action === 'restore') {
      lifecycleForm.setFieldsValue({
        reason: 'Authorized enterprise decommission restoration',
      })
    } else if (action === 'suspend') {
      lifecycleForm.setFieldsValue({
        reason: 'Administrative policy review suspension',
      })
    } else if (action === 'reactivate') {
      lifecycleForm.setFieldsValue({
        reason: 'Administrative reinstatement after compliance review',
      })
    } else if (action === 'delete') {
      lifecycleForm.setFieldsValue({
        reason: 'Decommissioned by SuperAdmin request',
      })
    }

    setLifecycleModalOpen(true)
  }

  const handleExecuteLifecycleAction = async () => {
    if (!lifecycleRecord) return
    try {
      const values = await lifecycleForm.validateFields()
      setLifecycleSubmitting(true)
      const targetTenantId = lifecycleRecord.tenantId || lifecycleRecord.id

      if (lifecycleAction === 'suspend') {
        await http.post('/platform/tenant/suspend', {
          tenantId: targetTenantId,
          reason: values.reason,
        })
        message.success(`Tenant ${lifecycleRecord.loginName} has been administratively SUSPENDED and sessions evicted.`)
      } else if (lifecycleAction === 'reactivate') {
        await http.post('/platform/tenant/reactivate', {
          tenantId: targetTenantId,
          reason: values.reason,
        })
        message.success(`Tenant ${lifecycleRecord.loginName} successfully reactivated to ACTIVE.`)
      } else if (lifecycleAction === 'renew') {
        await http.post('/platform/tenant/renew', {
          tenantId: targetTenantId,
          newPlanId: values.newPlanId,
          extendDays: values.extendDays,
          reason: values.reason,
        })
        message.success(`Subscription renewed for tenant ${lifecycleRecord.loginName} (+${values.extendDays} days).`)
      } else if (lifecycleAction === 'restore') {
        await http.post('/platform/tenant/restore', {
          tenantId: targetTenantId,
          reason: values.reason,
        })
        message.success(`Tenant ${lifecycleRecord.loginName} successfully RESTORED to ACTIVE.`)
      } else if (lifecycleAction === 'delete') {
        await http.delete(`/platform/tenant/delete?tenantId=${targetTenantId}&reason=${encodeURIComponent(values.reason || 'Decommission')}`)
        message.success(`Tenant ${lifecycleRecord.loginName} has been marked SOFT_DELETED.`)
      }

      setLifecycleModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      console.error('Lifecycle action failed:', err)
      message.error(err?.message || 'Lifecycle transition rejected by server authority')
    } finally {
      setLifecycleSubmitting(false)
    }
  }

  // =========================================================================
  // Multi-Step Provisioning Wizard (/platform/tenant/provision)
  // =========================================================================

  const openProvisionWizard = () => {
    wizardForm.resetFields()
    wizardForm.setFieldsValue({
      planId: 1,
      durationDays: 365,
      initialOrgName: 'Head Office',
      initialDepotName: 'Central Warehouse',
      password: '',
    })
    setWizardStep(0)
    setWizardError(null)
    setWizardOpen(true)
  }

  const handleNextWizardStep = async () => {
    try {
      if (wizardStep === 0) {
        await wizardForm.validateFields(['loginName', 'companyName', 'remark'])
      } else if (wizardStep === 1) {
        await wizardForm.validateFields(['adminFullName', 'adminEmail', 'adminPhone', 'password'])
      } else if (wizardStep === 2) {
        await wizardForm.validateFields(['planId', 'durationDays', 'initialOrgName', 'initialDepotName'])
      }
      setWizardError(null)
      setWizardStep((prev) => prev + 1)
    } catch (validationErr) {
      // Form fields invalid
    }
  }

  const handlePrevWizardStep = () => {
    setWizardStep((prev) => prev - 1)
  }

  const handleExecuteProvisionWizard = async () => {
    try {
      const values = await wizardForm.validateFields()
      setWizardSubmitting(true)
      setWizardError(null)

      const payload = {
        loginName: values.loginName?.trim(),
        companyName: values.companyName?.trim(),
        adminFullName: values.adminFullName?.trim() || 'Primary Admin',
        adminEmail: values.adminEmail?.trim(),
        adminPhone: values.adminPhone?.trim(),
        password: values.password ? values.password : '123456',
        planId: values.planId || 1,
        durationDays: values.durationDays || 365,
        initialOrgName: values.initialOrgName?.trim() || 'Head Office',
        initialDepotName: values.initialDepotName?.trim() || 'Central Warehouse',
        remark: values.remark || '',
      }

      await http.post('/platform/tenant/provision', payload)
      message.success(`Tenant "${payload.loginName}" (${payload.companyName}) provisioned successfully!`)
      setWizardOpen(false)
      fetchData(1, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      console.error('Provisioning failed:', err)
      const errorMsg = err?.message || err?.msg || 'Failed to provision tenant'
      setWizardError(errorMsg)
      message.error(errorMsg)
    } finally {
      setWizardSubmitting(false)
    }
  }

  // 7-State Lifecycle Tag Renderer
  const renderLifecycleStatus = (status?: string, enabled?: boolean | number) => {
    let norm = (status || '').toUpperCase()
    if (!norm) {
      norm = enabled === true || enabled === 1 || String(enabled) === '1' ? 'ACTIVE' : 'SUSPENDED'
    }

    switch (norm) {
      case 'PROVISIONING':
        return <Tag color="cyan" icon={<SafetyCertificateOutlined />}>PROVISIONING</Tag>
      case 'ACTIVE':
        return <Tag color="green" icon={<CheckOutlined />}>ACTIVE</Tag>
      case 'SUSPENDED':
        return <Tag color="orange" icon={<PauseCircleOutlined />}>SUSPENDED</Tag>
      case 'GRACE_PERIOD':
        return <Tag color="gold" icon={<RedoOutlined />}>GRACE_PERIOD</Tag>
      case 'EXPIRED':
        return <Tag color="red" icon={<StopOutlined />}>EXPIRED</Tag>
      case 'SOFT_DELETED':
        return <Tag color="magenta" icon={<DeleteOutlined />}>SOFT_DELETED</Tag>
      case 'ARCHIVED':
        return <Tag color="purple">ARCHIVED (Terminal)</Tag>
      default:
        return <Tag>{norm}</Tag>
    }
  }

  const getLifecycleMenuItems = (record: TenantRecord): MenuProps['items'] => {
    let norm = (record.status || '').toUpperCase()
    if (!norm) {
      norm = record.enabled === true || record.enabled === 1 || String(record.enabled) === '1' ? 'ACTIVE' : 'SUSPENDED'
    }

    const items: MenuProps['items'] = []

    if (norm === 'ACTIVE') {
      items.push({
        key: 'suspend',
        label: 'Suspend Tenant',
        icon: <PauseCircleOutlined style={{ color: '#fa8c16' }} />,
        onClick: () => openLifecycleModal(record, 'suspend'),
      })
      items.push({
        key: 'renew',
        label: 'Renew / Extend Subscription',
        icon: <RedoOutlined style={{ color: '#1890ff' }} />,
        onClick: () => openLifecycleModal(record, 'renew'),
      })
      items.push({ type: 'divider' })
      items.push({
        key: 'delete',
        label: 'Decommission (Soft Delete)',
        danger: true,
        icon: <DeleteOutlined />,
        onClick: () => openLifecycleModal(record, 'delete'),
      })
    } else if (norm === 'SUSPENDED') {
      items.push({
        key: 'reactivate',
        label: 'Reactivate Tenant',
        icon: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
        onClick: () => openLifecycleModal(record, 'reactivate'),
      })
      items.push({
        key: 'renew',
        label: 'Renew Subscription',
        icon: <RedoOutlined style={{ color: '#1890ff' }} />,
        onClick: () => openLifecycleModal(record, 'renew'),
      })
      items.push({ type: 'divider' })
      items.push({
        key: 'delete',
        label: 'Decommission (Soft Delete)',
        danger: true,
        icon: <DeleteOutlined />,
        onClick: () => openLifecycleModal(record, 'delete'),
      })
    } else if (norm === 'GRACE_PERIOD' || norm === 'EXPIRED') {
      items.push({
        key: 'renew',
        label: 'Renew Subscription',
        icon: <RedoOutlined style={{ color: '#52c41a' }} />,
        onClick: () => openLifecycleModal(record, 'renew'),
      })
      items.push({
        key: 'suspend',
        label: 'Suspend Immediately',
        icon: <PauseCircleOutlined style={{ color: '#fa8c16' }} />,
        onClick: () => openLifecycleModal(record, 'suspend'),
      })
    } else if (norm === 'SOFT_DELETED') {
      items.push({
        key: 'restore',
        label: 'Restore Tenant to Active',
        icon: <UndoOutlined style={{ color: '#52c41a' }} />,
        onClick: () => openLifecycleModal(record, 'restore'),
      })
    } else if (norm === 'ARCHIVED') {
      items.push({
        key: 'archived_info',
        disabled: true,
        label: 'Archived is strictly terminal',
      })
    }

    return items
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
      render: (_: any, record: TenantRecord) => {
        const lifecycleItems = getLifecycleMenuItems(record)
        return (
          <Space size="middle">
            <a onClick={() => handleOpenEdit(record)}>Edit</a>
            <a onClick={() => handleOpenResetPwd(record)} style={{ color: '#fa8c16' }}>
              <KeyOutlined /> Reset
            </a>
            {lifecycleItems && lifecycleItems.length > 0 && (
              <Dropdown menu={{ items: lifecycleItems }} trigger={['click']}>
                <a style={{ color: '#1677ff', fontWeight: 500 }}>
                  Lifecycle <DownOutlined style={{ fontSize: 10 }} />
                </a>
              </Dropdown>
            )}
          </Space>
        )
      },
    },
    loginName: {
      title: 'Tenant Username',
      dataIndex: 'loginName',
      key: 'loginName',
      width: 140,
      ellipsis: true,
    },
    companyName: {
      title: 'Company / Organization',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 180,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    status: {
      title: 'Lifecycle Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      align: 'center' as const,
      render: (v: any, record: TenantRecord) => renderLifecycleStatus(v, record.enabled),
    },
    userCount: {
      title: 'Active Users',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 105,
      align: 'center' as const,
      render: (v: any) => v || '0',
    },
    userNumLimit: {
      title: 'Seat Limit',
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
      width: 120,
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
      width: 180,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 420 }}>
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
            'companyName',
            'status',
            'userCount',
            'userNumLimit',
            'roleName',
            'type',
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
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={openProvisionWizard}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            Provision Tenant (Wizard)
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Quick Add
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

      {/* Basic Tenant Modal */}
      <Modal
        title={editingRecord ? 'Edit Tenant Information' : 'New SaaS Tenant'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        forceRender
        width={600}
      >
        <Form form={modalForm} layout="vertical" initialValues={{ userNumLimit: 10, type: '0' }}>
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
                <InputNumber style={{ width: '100%' }} min={1} max={9999} />
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
              <Form.Item name="type" label="Tenant Type">
                <Select placeholder="Select type...">
                  <Select.Option value="0">Trial Tenant (试用租户)</Select.Option>
                  <Select.Option value="1">Paid Tenant (付费租户)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingRecord && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="password"
                  label="Initial Tenant Admin Password"
                  extra="Default password is 123456 if left empty."
                >
                  <Input.Password placeholder="Set custom password or leave blank for default: 123456" />
                </Form.Item>
              </Col>
            </Row>
          )}

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

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password - ${resetPwdRecord?.loginName || ''}`}
        open={resetPwdOpen}
        onCancel={() => setResetPwdOpen(false)}
        onOk={handleSaveResetPwd}
        confirmLoading={resetPwdSubmitting}
        forceRender
        width={450}
      >
        <Form form={resetPwdForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
            extra="Credentials can be provided to the tenant administrator."
          >
            <Input.Password placeholder="Enter new password (e.g. 123456)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lifecycle Governance Action Modal */}
      <Modal
        title={
          lifecycleAction === 'suspend'
            ? `Suspend Tenant — ${lifecycleRecord?.loginName}`
            : lifecycleAction === 'reactivate'
            ? `Reactivate Tenant — ${lifecycleRecord?.loginName}`
            : lifecycleAction === 'renew'
            ? `Renew Subscription — ${lifecycleRecord?.loginName}`
            : lifecycleAction === 'restore'
            ? `Restore Soft-Deleted Tenant — ${lifecycleRecord?.loginName}`
            : `Decommission Tenant — ${lifecycleRecord?.loginName}`
        }
        open={lifecycleModalOpen}
        onCancel={() => setLifecycleModalOpen(false)}
        onOk={handleExecuteLifecycleAction}
        confirmLoading={lifecycleSubmitting}
        forceRender
        width={500}
      >
        <Form form={lifecycleForm} layout="vertical" style={{ marginTop: 16 }}>
          {lifecycleAction === 'suspend' && (
            <Alert
              message="Session Invalidation Warning"
              description="Suspending this tenant increments the Redis version key and immediately revokes all active JWT tokens across the entire cluster."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {lifecycleAction === 'restore' && (
            <Alert
              message="SuperAdmin Restoration Authority"
              description="Restoration recovers the tenant from SOFT_DELETED to ACTIVE, assigns an active subscription plan, and clears deletion flags."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {lifecycleAction === 'renew' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="newPlanId"
                    label="Subscription Plan"
                    rules={[{ required: true, message: 'Please select a plan' }]}
                  >
                    <Select>
                      <Select.Option value={1}>Starter Plan (10 Users)</Select.Option>
                      <Select.Option value={2}>Professional Plan (50 Users)</Select.Option>
                      <Select.Option value={3}>Enterprise Plan (Unlimited)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="extendDays"
                    label="Extend By (Days)"
                    rules={[{ required: true, message: 'Please specify days' }]}
                  >
                    <InputNumber min={1} max={3650} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item
            name="reason"
            label={lifecycleAction === 'restore' ? 'Mandatory Enterprise Justification' : 'Action Justification / Reason'}
            rules={[
              { required: true, message: 'Please provide a valid justification' },
              {
                min: lifecycleAction === 'restore' ? 10 : 5,
                message: lifecycleAction === 'restore' ? 'Justification must be at least 10 characters' : 'Reason must be at least 5 characters',
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                lifecycleAction === 'restore'
                  ? 'Detailed compliance or business justification for restoration (min 10 characters)...'
                  : 'Document reason for this lifecycle transition (min 5 characters)...'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Multi-Step Provisioning Wizard Modal */}
      <Modal
        title="Enterprise Multi-Resource Tenant Provisioning Wizard"
        open={wizardOpen}
        onCancel={() => setWizardOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button disabled={wizardStep === 0} onClick={handlePrevWizardStep}>
              Previous
            </Button>
            <div>
              <Button style={{ marginRight: 8 }} onClick={() => setWizardOpen(false)}>
                Cancel
              </Button>
              {wizardStep < 3 ? (
                <Button type="primary" onClick={handleNextWizardStep}>
                  Next
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  loading={wizardSubmitting}
                  onClick={handleExecuteProvisionWizard}
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                  Confirm & Provision
                </Button>
              )}
            </div>
          </div>
        }
        width={700}
        destroyOnClose
      >
        <div style={{ margin: '16px 0 24px' }}>
          <Steps
            current={wizardStep}
            items={[
              { title: 'Identity' },
              { title: 'Admin Account' },
              { title: 'Topology & Plan' },
              { title: 'Review' },
            ]}
          />
        </div>

        {wizardError && (
          <Alert
            message="Provisioning Authorization / Validation Error"
            description={wizardError}
            type="error"
            showIcon
            closable
            onClose={() => setWizardError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={wizardForm} layout="vertical">
          {/* Step 0: Identity */}
          {wizardStep === 0 && (
            <div>
              <Alert
                message="Tenant Identity"
                description="Unique system slug identifier and corporate business name for the new enterprise tenant."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="loginName"
                    label="Tenant System Identifier (Slug)"
                    rules={[
                      { required: true, message: 'Please enter tenant username slug' },
                      { min: 3, message: 'Must be at least 3 characters' },
                      { pattern: /^[a-z0-9_-]+$/, message: 'Only lowercase letters, numbers, hyphens and underscores allowed' },
                    ]}
                  >
                    <Input placeholder="e.g. acme_corp" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="companyName"
                    label="Corporate / Legal Business Name"
                    rules={[{ required: true, message: 'Please enter legal company name' }]}
                  >
                    <Input placeholder="e.g. Acme Industries Ltd" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="remark" label="Notes / Enterprise Description">
                <Input.TextArea rows={2} placeholder="Optional organizational notes..." />
              </Form.Item>
            </div>
          )}

          {/* Step 1: Administrator */}
          {wizardStep === 1 && (
            <div>
              <Alert
                message="Tenant Root Administrator"
                description="Bootstrap credentials for the primary tenant administrator who will govern the organization."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="adminFullName"
                    label="Administrator Full Name"
                    rules={[{ required: true, message: 'Please enter administrator name' }]}
                  >
                    <Input placeholder="e.g. Alexander Vance" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="adminEmail"
                    label="Official Admin Email"
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter a valid email address' },
                    ]}
                  >
                    <Input placeholder="e.g. admin@acme.com" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="adminPhone"
                    label="Contact Phone"
                    rules={[{ required: true, message: 'Please enter contact number' }]}
                  >
                    <Input placeholder="e.g. +91 9876543210" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Initial Password"
                    extra="Leave blank for system default: 123456"
                  >
                    <Input.Password placeholder="Default: 123456" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}

          {/* Step 2: Subscription & Topology */}
          {wizardStep === 2 && (
            <div>
              <Alert
                message="SaaS Subscription & Topology Bootstrap"
                description="Assigns subscription tier and automatically scaffolds default organization root and primary warehouse."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="planId"
                    label="Subscription Plan Tier"
                    rules={[{ required: true, message: 'Please select a tier' }]}
                  >
                    <Select>
                      <Select.Option value={1}>Starter Tier (10 Users, Standard)</Select.Option>
                      <Select.Option value={2}>Professional Tier (50 Users, Multi-Org)</Select.Option>
                      <Select.Option value={3}>Enterprise Tier (Unlimited, Dedicated SLA)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="durationDays"
                    label="Subscription Duration (Days)"
                    rules={[{ required: true, message: 'Please specify days' }]}
                  >
                    <InputNumber min={30} max={3650} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="initialOrgName"
                    label="Root Organization / Branch Name"
                    rules={[{ required: true, message: 'Please enter root organization' }]}
                  >
                    <Input placeholder="e.g. Head Office Mumbai" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="initialDepotName"
                    label="Default Warehouse / Depot Name"
                    rules={[{ required: true, message: 'Please enter warehouse name' }]}
                  >
                    <Input placeholder="e.g. Central Warehouse" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}

          {/* Step 3: Review & Summary */}
          {wizardStep === 3 && (
            <div>
              <Alert
                message="Review Provisioning Specification"
                description="Click 'Confirm & Provision' to atomically scaffold the tenant, organization hierarchy, chart of accounts, and subscription."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Identifier (Slug)">
                  <Tag color="blue">{wizardForm.getFieldValue('loginName')}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Company Name">
                  <strong>{wizardForm.getFieldValue('companyName')}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Admin Contact">
                  {wizardForm.getFieldValue('adminFullName')} ({wizardForm.getFieldValue('adminEmail')})
                </Descriptions.Item>
                <Descriptions.Item label="Admin Phone">
                  {wizardForm.getFieldValue('adminPhone')}
                </Descriptions.Item>
                <Descriptions.Item label="Plan Tier">
                  {wizardForm.getFieldValue('planId') === 1
                    ? 'Starter Plan (10 Users)'
                    : wizardForm.getFieldValue('planId') === 2
                    ? 'Professional Plan (50 Users)'
                    : 'Enterprise Plan (Unlimited)'}
                </Descriptions.Item>
                <Descriptions.Item label="Duration">
                  {wizardForm.getFieldValue('durationDays')} Days
                </Descriptions.Item>
                <Descriptions.Item label="Root Organization">
                  {wizardForm.getFieldValue('initialOrgName')}
                </Descriptions.Item>
                <Descriptions.Item label="Default Depot">
                  {wizardForm.getFieldValue('initialDepotName')}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  )
}
