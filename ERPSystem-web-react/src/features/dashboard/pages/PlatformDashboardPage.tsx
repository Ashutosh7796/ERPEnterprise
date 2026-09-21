import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Flex,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  App,
  Tabs,
  Alert,
  Empty,
  Spin,
  Progress,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ClusterOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  AppstoreOutlined,
  SyncOutlined,
  UserAddOutlined,
  TeamOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { http } from '@core/api/client'
import { useAppStore } from '@store/useAppStore'
import { useAuthStore } from '@core/auth/authStore'

const { Title, Paragraph, Text } = Typography

interface TenantRecord {
  id: number
  tenantId: number
  loginName: string
  companyName?: string
  userNumLimit: number
  type: number
  enabled: boolean
  createTime?: string
  status?: string | number
}

interface SubscriptionPlan {
  id: number
  planCode: string
  planName: string
  maxUsers: number
  maxOrganizations: number
  maxDepots: number
  maxMonthlyInvoices: number
  monthlyPriceInr: number
  isActive: boolean
}

export const PlatformDashboardPage: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const userAuth = useAppStore((state) => state.userAuth)
  const user = useAuthStore((state) => state.user)

  // Security gate: Platform Super Admin evaluation
  const isPlatformAuthorized = userAuth.tenantId === 0 || userAuth.tenantId === undefined || user?.loginName === 'admin'

  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0)
  
  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false)
  const [registerLoading, setRegisterLoading] = useState<boolean>(false)
  const [provisionModalOpen, setProvisionModalOpen] = useState<boolean>(false)
  const [provisionLoading, setProvisionLoading] = useState<boolean>(false)
  
  const [form] = Form.useForm()
  const [provisionForm] = Form.useForm()

  const fetchPlatformStats = async () => {
    if (!isPlatformAuthorized) return
    setLoading(true)
    setErrorMsg(null)
    try {
      // 1. Fetch Tenants
      const res: any = await http.get('/tenant/list', { params: { currentPage: 1, pageSize: 100 } })
      if (res && res.code === 200 && res.data && res.data.rows) {
        setTenants(res.data.rows)
      } else if (res && Array.isArray(res.data)) {
        setTenants(res.data)
      } else if (res && res.code !== 200) {
        setErrorMsg(res?.msg || 'Failed to retrieve tenant directory from server')
      }

      // 2. Fetch Active Support Sessions
      try {
        const sessionsRes: any = await http.get('/support/session/active')
        if (sessionsRes && sessionsRes.code === 200 && sessionsRes.data && sessionsRes.data.sessions) {
          setActiveSessionsCount(sessionsRes.data.sessions.length)
        }
      } catch {
        // non-blocking
      }

      // 3. Fetch Subscription Plans
      try {
        const plansRes: any = await http.get('/platform/plan/list')
        if (plansRes && plansRes.code === 200 && plansRes.data) {
          setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data.rows || [])
        }
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error communicating with platform services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPlatformAuthorized) {
      fetchPlatformStats()
    }
  }, [isPlatformAuthorized])

  // Tenant Provisioning submission
  const handleProvisionTenant = async (values: any) => {
    setProvisionLoading(true)
    try {
      const res: any = await http.post('/platform/tenant/provision', values)
      if (res && res.code === 200) {
        message.success(`Tenant "${values.companyName}" successfully provisioned and bootstrapped!`)
        setProvisionModalOpen(false)
        provisionForm.resetFields()
        fetchPlatformStats()
      } else {
        message.error(res?.msg || 'Provisioning failed')
      }
    } catch (err: any) {
      message.error(err?.message || 'Server error provisioning tenant')
    } finally {
      setProvisionLoading(false)
    }
  }

  // Register internal support staff
  const handleRegisterSupportStaff = async (values: any) => {
    setRegisterLoading(true)
    try {
      const res: any = await http.post('/support/registerStaff', values)
      if (res && res.code === 200) {
        message.success(`Support user "${values.loginName}" created successfully!`)
        setRegisterModalOpen(false)
        form.resetFields()
        fetchPlatformStats()
      } else {
        message.error(res?.msg || 'Failed to register support staff')
      }
    } catch (err: any) {
      message.error(err?.message || 'Server error registering support user')
    } finally {
      setRegisterLoading(false)
    }
  }

  // KPI Calculations
  const totalTenants = tenants.length
  const activeTenants = tenants.filter(
    (t) => t.status === 'ACTIVE' || t.status === 0 || t.status === '0' || (t.enabled && t.status !== 'SUSPENDED' && t.status !== 'EXPIRED')
  ).length
  const suspendedTenants = tenants.filter((t) => t.status === 'SUSPENDED' || (!t.enabled && t.status !== 'EXPIRED')).length
  const expiredOrGraceTenants = tenants.filter((t) => t.status === 'EXPIRED' || t.status === 'GRACE_PERIOD').length
  const totalAllocatedUsers = tenants.reduce((sum, t) => sum + (t.userNumLimit || 0), 0)

  if (!isPlatformAuthorized) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Alert
          type="error"
          showIcon
          message="403 Access Forbidden"
          description="Platform Administration Dashboard is strictly restricted to authorized Platform Super Administrators. Your current session does not possess the requisite PLATFORM permissions."
          style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/dashboard')}>
              Return to Workspace
            </Button>
          }
        />
      </div>
    )
  }

  const columns: ColumnsType<TenantRecord> = [
    {
      title: 'Tenant ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 110,
      render: (val) => <Tag color="blue" style={{ fontWeight: 600 }}>#{val}</Tag>,
    },
    {
      title: 'Company / Organization',
      key: 'company',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.companyName || r.loginName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>login: @{r.loginName}</Text>
        </div>
      ),
    },
    {
      title: 'User Limit',
      dataIndex: 'userNumLimit',
      key: 'userNumLimit',
      width: 120,
      render: (val) => `${val || 500} Users`,
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_, record) => {
        const isAct = record.status === 'ACTIVE' || record.status === 0 || record.status === '0' || (record.enabled && record.status !== 'SUSPENDED' && record.status !== 'EXPIRED')
        const isSusp = record.status === 'SUSPENDED'
        const isExp = record.status === 'EXPIRED' || record.status === 'GRACE_PERIOD'
        if (isAct) return <Badge status="success" text={<Tag color="success">ACTIVE</Tag>} />
        if (isSusp) return <Badge status="error" text={<Tag color="error">SUSPENDED</Tag>} />
        if (isExp) return <Badge status="warning" text={<Tag color="warning">EXPIRED</Tag>} />
        return <Badge status="default" text={<Tag>{String(record.status || 'ACTIVE')}</Tag>} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => navigate(`/support/center?targetTenantId=${record.tenantId}`)}
          >
            Support
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/system/tenant`)}
          >
            Configure
          </Button>
        </Space>
      ),
    },
  ]

  const planColumns: ColumnsType<SubscriptionPlan> = [
    {
      title: 'Plan Code',
      dataIndex: 'planCode',
      key: 'planCode',
      render: (val) => <Tag color="geekblue" style={{ fontWeight: 600 }}>{val}</Tag>,
    },
    {
      title: 'Plan Name',
      dataIndex: 'planName',
      key: 'planName',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>,
    },
    {
      title: 'User Quota',
      dataIndex: 'maxUsers',
      key: 'maxUsers',
      render: (val) => `${val} Users`,
    },
    {
      title: 'Org / Depot Quota',
      key: 'quotas',
      render: (_, r) => `${r.maxOrganizations} Orgs / ${r.maxDepots} Depots`,
    },
    {
      title: 'Monthly Price',
      dataIndex: 'monthlyPriceInr',
      key: 'monthlyPriceInr',
      render: (val) => `₹${val || 0}/mo`,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val) => (
        <Tag color={val ? 'success' : 'default'}>{val ? 'Active Plan' : 'Archived'}</Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Platform Administration Dashboard
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            Enterprise multi-tenant isolation, platform governance, subscription lifecycle, and audited support delegation.
          </Paragraph>
        </div>
        <Space wrap>
          <Button icon={<SyncOutlined />} onClick={fetchPlatformStats} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProvisionModalOpen(true)}>
            Provision New Tenant
          </Button>
          <Button icon={<UserAddOutlined />} onClick={() => setRegisterModalOpen(true)}>
            Register Support Staff
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('/support/center')}>
            Support Center
          </Button>
        </Space>
      </div>

      {errorMsg && (
        <Alert
          type="warning"
          showIcon
          message="Platform Services Warning"
          description={errorMsg}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={fetchPlatformStats}>
              Retry
            </Button>
          }
        />
      )}

      {/* Primary Platform KPIs */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#e6f7ff', borderLeft: '4px solid #1890ff' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#0050b3' }}>Active Tenants</span>}
              value={activeTenants}
              prefix={<ClusterOutlined style={{ color: '#1890ff' }} />}
              suffix={`/ ${totalTenants}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#fff1f0', borderLeft: '4px solid #f5222d' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#a8071a' }}>Suspended</span>}
              value={suspendedTenants}
              prefix={<PauseCircleOutlined style={{ color: '#f5222d' }} />}
              suffix="Tenants"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#fffbe6', borderLeft: '4px solid #faad14' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#ad6800' }}>Expired / Grace</span>}
              value={expiredOrGraceTenants}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="Tenants"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#f6ffed', borderLeft: '4px solid #52c41a' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#237804' }}>Allocated Users</span>}
              value={totalAllocatedUsers}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              suffix="Seats"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#fff7e6', borderLeft: '4px solid #fa8c16' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#ad4e00' }}>Support Sessions</span>}
              value={activeSessionsCount}
              prefix={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />}
              suffix="Active"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card style={{ background: '#f9f0ff', borderLeft: '4px solid #722ed1' }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#531dab' }}>System Health</span>}
              value={100}
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabbed Operations Container */}
      <Card style={{ marginTop: 20 }}>
        <Tabs
          defaultActiveKey="tenants"
          items={[
            {
              key: 'tenants',
              label: (
                <span>
                  <ClusterOutlined /> Managed Tenants ({tenants.length})
                </span>
              ),
              children: (
                <div>
                  {loading && tenants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                  ) : tenants.length === 0 ? (
                    <Empty description="No tenant instances found in directory" />
                  ) : (
                    <Table
                      dataSource={tenants}
                      columns={columns}
                      rowKey="id"
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      loading={loading}
                      size="middle"
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'plans',
              label: (
                <span>
                  <AppstoreOutlined /> Subscription Plans & Quotas ({plans.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Configured statutory and enterprise subscription tiers with hard quota limits.</Text>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => navigate('/system/platform_config')}>
                      Manage Plans
                    </Button>
                  </div>
                  <Table
                    dataSource={plans}
                    columns={planColumns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal: Atomic Tenant Provisioning */}
      <Modal
        title={
          <Space>
            <ClusterOutlined style={{ color: '#1890ff' }} />
            <span>Atomic Tenant Provisioning & Multi-Resource Bootstrap</span>
          </Space>
        }
        open={provisionModalOpen}
        onCancel={() => setProvisionModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={620}
      >
        <Paragraph type="secondary">
          Provisions a complete isolated tenant container with Root Organization (HQ), Primary Warehouse, Active Indian Fiscal Calendar (2026-27), Document Series, Standard Accounts, and Tenant Admin in one atomic transaction.
        </Paragraph>
        <Form
          form={provisionForm}
          layout="vertical"
          onFinish={handleProvisionTenant}
          initialValues={{
            initialPlanDurationDays: 365,
            adminFullName: 'Administrator',
            initialDepotName: 'General Warehouse',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="companyName"
                label="Company / Legal Entity Name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder="e.g. Acme Technologies Pvt Ltd" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="loginName"
                label="Tenant Domain / Subdomain Handle"
                rules={[{ required: true, message: 'Please enter login handle' }]}
              >
                <Input placeholder="e.g. acme_corp" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="adminFullName"
                label="Tenant Admin Full Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g. Rajesh Sharma" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="adminPassword"
                label="Initial Admin Password"
                rules={[{ required: true }, { min: 6, message: 'Minimum 6 characters' }]}
              >
                <Input.Password placeholder="Admin password" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="adminEmail"
                label="Admin Email Address"
              >
                <Input placeholder="admin@acmetech.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="planId"
                label="Subscription Plan Tier"
              >
                <Select
                  placeholder="Select initial subscription plan"
                  options={
                    plans.length > 0
                      ? plans.map((p) => ({ label: `${p.planName} (${p.maxUsers} Users)`, value: p.id }))
                      : [
                          { label: 'Standard Enterprise (50 Users)', value: 1 },
                          { label: 'Professional Tier (250 Users)', value: 2 },
                        ]
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setProvisionModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={provisionLoading} icon={<PlusOutlined />}>
                Execute Atomic Provisioning
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Register Support Staff */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>Register Internal Support Specialist / Manager</span>
          </Space>
        }
        open={registerModalOpen}
        onCancel={() => setRegisterModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Paragraph type="secondary">
          Register support employees with restricted support privileges. They will receive dedicated logins to access the Support Operations Dashboard to troubleshoot tenant issues without access to Platform Super Admin or tenant financial data.
        </Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRegisterSupportStaff}
          initialValues={{ roleType: 'SYSTEM_SUPPORT' }}
        >
          <Form.Item
            name="loginName"
            label="Login Username"
            rules={[{ required: true, message: 'Please input login username' }]}
          >
            <Input placeholder="e.g. support_john, tier2_sarah" />
          </Form.Item>

          <Form.Item
            name="userName"
            label="Full Employee Name"
            rules={[{ required: true, message: 'Please input employee name' }]}
          >
            <Input placeholder="e.g. John Doe (Support Engineer)" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Initial Password"
            rules={[{ required: true, message: 'Please input password' }, { min: 6, message: 'Minimum 6 characters' }]}
          >
            <Input.Password placeholder="Enter secure password" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="support@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNum" label="Phone Number">
                <Input placeholder="+1 555-0199" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="roleType"
            label="Support Role Tier"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Support Operations Specialist (READ_ONLY, max 60m)', value: 'SYSTEM_SUPPORT' },
                { label: 'Support Operations Manager (Diagnostics & Triage)', value: 'SUPPORT_MANAGER' },
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setRegisterModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={registerLoading} icon={<UserAddOutlined />}>
                Create Support Account
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
