import React, { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Card, Typography, Modal, Form, Input, Select, DatePicker, message, Row, Col } from 'antd'
import { PlusOutlined, ReloadOutlined, DollarOutlined, PercentageOutlined } from '@ant-design/icons'
import { pricingApi, PriceList } from '../api/pricingApi'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

export const PriceListListPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PriceList[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await pricingApi.listPriceLists()
      if (res && res.code === 200) {
        setData(res.data || [])
      } else if (Array.isArray(res)) {
        setData(res)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load price lists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const payload: PriceList = {
        name: values.name,
        code: values.code,
        currencyCode: values.currencyCode || 'INR',
        listType: values.listType || 'CUSTOMER_TIER',
        startDate: values.dateRange ? values.dateRange[0].format('YYYY-MM-DD') : undefined,
        endDate: values.dateRange ? values.dateRange[1].format('YYYY-MM-DD') : undefined,
        status: values.status || 'ACTIVE',
        remark: values.remark,
      }
      const res = await pricingApi.createPriceList(payload)
      if (res && res.code === 200) {
        message.success('Price list created successfully')
        setModalVisible(false)
        form.resetFields()
        loadData()
      }
    } catch (e: any) {
      message.error(e?.message || 'Validation error')
    }
  }

  const columns = [
    {
      title: 'Price List Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PriceList) => (
        <div>
          <Text strong style={{ color: '#1677ff' }}>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>Code: {record.code}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'list_type',
      key: 'list_type',
      render: (type: string) => {
        const color = type === 'PROMOTION' ? 'magenta' : type === 'VOLUME_SLAB' ? 'purple' : 'blue'
        return <Tag color={color}>{type || 'CUSTOMER_TIER'}</Tag>
      },
    },
    {
      title: 'Currency',
      dataIndex: 'currency_code',
      key: 'currency_code',
      render: (c: string) => <Tag color="cyan">{c || 'INR'}</Tag>,
    },
    {
      title: 'Validity Period',
      key: 'validity',
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 12 }}>
          {r.start_date ? dayjs(r.start_date).format('YYYY-MM-DD') : 'Immediate'} ~{' '}
          {r.end_date ? dayjs(r.end_date).format('YYYY-MM-DD') : 'Permanent'}
        </Text>
      ),
    },
    {
      title: 'Items & Customers',
      key: 'counts',
      render: (_: any, r: any) => (
        <Space size={8}>
          <Tag icon={<DollarOutlined />}>{r.item_count || 0} Items</Tag>
          <Tag icon={<PercentageOutlined />}>{r.customer_count || 0} Assigned Customers</Tag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'ACTIVE' ? 'success' : 'default'}>{st || 'ACTIVE'}</Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Commercial Pricing Lists & Discount Matrices
          </Title>
          <Text type="secondary">
            Manage customer-tier pricing, quantity break discount slabs, and promotional price lists.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              New Price List
            </Button>
          </Space>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Create Commercial Price List"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ currencyCode: 'INR', listType: 'CUSTOMER_TIER', status: 'ACTIVE' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Price List Name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="e.g. VIP Wholesale Tier A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="List Code" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="e.g. PL-VIP-2026" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="listType" label="Price List Type">
                <Select>
                  <Option value="CUSTOMER_TIER">Customer Tier Contract</Option>
                  <Option value="VOLUME_SLAB">Volume Break Discount Slab</Option>
                  <Option value="PROMOTION">Promotional Season Campaign</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currencyCode" label="Currency">
                <Select>
                  <Option value="INR">INR - Indian Rupee</Option>
                  <Option value="USD">USD - US Dollar</Option>
                  <Option value="EUR">EUR - Euro</Option>
                  <Option value="GBP">GBP - British Pound</Option>
                  <Option value="AED">AED - UAE Dirham</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dateRange" label="Validity Window">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional pricing policy notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
