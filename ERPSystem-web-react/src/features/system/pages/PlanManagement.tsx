import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  App,
  Row,
  Col,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, ReloadOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'

export interface PlanRecord {
  id: number
  planCode: string
  name: string
  tier: string
  defaultUserLimit: number
  defaultDepotLimit: number
  defaultOrgLimit: number
  enabledFeatures: string
  priceMonthly?: number
  priceAnnual?: number
  currency?: string
  isActive: boolean
  remark?: string
}

const FEATURE_OPTIONS = [
  { label: 'Sales & Billing (MODULE_SALES)', value: 'MODULE_SALES' },
  { label: 'Procurement & Purchasing (MODULE_PURCHASE)', value: 'MODULE_PURCHASE' },
  { label: 'Inventory & Warehousing (MODULE_INVENTORY)', value: 'MODULE_INVENTORY' },
  { label: 'Finance & Accounts (MODULE_FINANCE)', value: 'MODULE_FINANCE' },
  { label: 'GST Compliance (MODULE_TAX_GST)', value: 'MODULE_TAX_GST' },
  { label: 'GST e-Invoice & e-WayBill (MODULE_GST_EINVOICE)', value: 'MODULE_GST_EINVOICE' },
  { label: 'Manufacturing & Assembly (MODULE_MANUFACTURING)', value: 'MODULE_MANUFACTURING' },
  { label: 'Advanced Analytics & Reports (MODULE_ADVANCED_REPORTS)', value: 'MODULE_ADVANCED_REPORTS' },
]

export const PlanManagementPage: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PlanRecord[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null)
  const [form] = Form.useForm()

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res: any = await http.get('/platform/plan/list')
      if (res && res.code === 200) {
        setDataSource(res.data?.rows || [])
      } else {
        message.error(res?.msg || 'Failed to load plans')
      }
    } catch (e: any) {
      message.error(e?.message || 'Error fetching plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleOpenModal = (record?: PlanRecord) => {
    setEditingPlan(record || null)
    if (record) {
      let parsedFeatures = []
      try {
        parsedFeatures = JSON.parse(record.enabledFeatures || '[]')
      } catch (e) {
        parsedFeatures = []
      }
      form.setFieldsValue({
        ...record,
        enabledFeatures: parsedFeatures,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        tier: 'STANDARD',
        defaultUserLimit: 10,
        defaultDepotLimit: 3,
        defaultOrgLimit: 3,
        enabledFeatures: ['MODULE_SALES', 'MODULE_PURCHASE', 'MODULE_INVENTORY'],
        isActive: true,
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        enabledFeatures: values.enabledFeatures || [],
      }

      if (editingPlan) {
        const res: any = await http.post(`/platform/plan/update?id=${editingPlan.id}`, payload)
        if (res && res.code === 200) {
          message.success('Plan template updated successfully')
          setModalOpen(false)
          fetchPlans()
        } else {
          message.error(res?.msg || 'Failed to update plan')
        }
      } else {
        const res: any = await http.post('/platform/plan/add', payload)
        if (res && res.code === 200) {
          message.success('Plan template created successfully')
          setModalOpen(false)
          fetchPlans()
        } else {
          message.error(res?.msg || 'Failed to create plan')
        }
      }
    } catch (e: any) {
      message.error(e?.message || 'Validation failed')
    }
  }

  const columns: TableColumnsType<PlanRecord> = [
    {
      title: 'Plan Code',
      dataIndex: 'planCode',
      key: 'planCode',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Plan Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Space orientation="vertical" size={2}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{r.remark || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      key: 'tier',
      render: (tier) => {
        const color = tier === 'ENTERPRISE' ? 'purple' : tier === 'PRO' ? 'gold' : 'cyan'
        return <Tag color={color}>{tier}</Tag>
      },
    },
    {
      title: 'User Limit',
      dataIndex: 'defaultUserLimit',
      key: 'defaultUserLimit',
      render: (val) => `${val} Users`,
    },
    {
      title: 'Depot Limit',
      dataIndex: 'defaultDepotLimit',
      key: 'defaultDepotLimit',
      render: (val) => `${val} Depots`,
    },
    {
      title: 'Org/Branch Limit',
      dataIndex: 'defaultOrgLimit',
      key: 'defaultOrgLimit',
      render: (val) => `${val} Orgs`,
    },
    {
      title: 'Included Modules',
      dataIndex: 'enabledFeatures',
      key: 'enabledFeatures',
      render: (featuresStr) => {
        let list: string[] = []
        try {
          list = JSON.parse(featuresStr || '[]')
        } catch (e) {
          list = []
        }
        return (
          <Space wrap size={[4, 4]}>
            {list.map((f) => (
              <Tag key={f} color="geekblue" style={{ fontSize: 11 }}>
                {f.replace('MODULE_', '')}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'ACTIVE' : 'INACTIVE'}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleOpenModal(record)}
        >
          Edit Template
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
            <span>Platform Subscription Plan Catalog</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPlans}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              Create New Plan
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan Template'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={650}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="planCode"
                label="Plan Code"
                rules={[{ required: true, message: 'Please enter unique plan code' }]}
              >
                <Input placeholder="e.g., STANDARD_PRO" disabled={!!editingPlan} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Plan Name"
                rules={[{ required: true, message: 'Please enter plan name' }]}
              >
                <Input placeholder="e.g., Standard Business Pro" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tier" label="Tier" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'FREE', value: 'FREE' },
                    { label: 'STARTER', value: 'STARTER' },
                    { label: 'STANDARD', value: 'STANDARD' },
                    { label: 'PRO', value: 'PRO' },
                    { label: 'ENTERPRISE', value: 'ENTERPRISE' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="defaultUserLimit"
                label="Default User Limit"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="defaultDepotLimit"
                label="Default Warehouse Limit"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="defaultOrgLimit"
                label="Default Org Limit"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priceMonthly" label="Monthly Price (INR)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priceAnnual" label="Annual Price (INR)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="enabledFeatures"
            label="Entitled Modules (Tenant Feature Gate)"
            rules={[{ required: true, message: 'Please select entitled modules' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select entitled features"
              options={FEATURE_OPTIONS}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="remark" label="Description / Remarks">
            <Input.TextArea rows={2} placeholder="Optional plan description" />
          </Form.Item>

          <Form.Item name="isActive" label="Active Plan" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
