import React, { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Card, Typography, Modal, Form, Input, InputNumber, Select, DatePicker, message, Row, Col } from 'antd'
import { PlusOutlined, ReloadOutlined, SwapOutlined, FundOutlined } from '@ant-design/icons'
import { pricingApi, ExchangeRate } from '../api/pricingApi'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

export const ExchangeRateListPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExchangeRate[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [revalVisible, setRevalVisible] = useState(false)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await pricingApi.listExchangeRates()
      if (res && res.code === 200) {
        setData(res.data || [])
      } else if (Array.isArray(res)) {
        setData(res)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load exchange rates')
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
      const payload: ExchangeRate = {
        fromCurrency: values.fromCurrency,
        toCurrency: 'INR',
        exchangeRate: values.exchangeRate,
        effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        rateType: values.rateType || 'SPOT',
        remark: values.remark,
      }
      const res = await pricingApi.setExchangeRate(payload)
      if (res && res.code === 200) {
        message.success('Exchange rate saved successfully')
        setModalVisible(false)
        form.resetFields()
        loadData()
      }
    } catch (e: any) {
      message.error(e?.message || 'Validation error')
    }
  }

  const handleRunRevaluation = async () => {
    try {
      const res: any = await pricingApi.executeForexRevaluation('2026-03')
      if (res && res.code === 200) {
        message.success('Period-close Forex Revaluation completed successfully! Net Adj: ' + res.data?.netForexAdjustment)
        setRevalVisible(false)
      }
    } catch (e: any) {
      message.error(e?.message || 'Revaluation error')
    }
  }

  const columns = [
    {
      title: 'Currency Pair',
      key: 'pair',
      render: (_: any, r: any) => (
        <Space>
          <Tag color="cyan" style={{ fontSize: 13, fontWeight: 'bold' }}>{r.from_currency}</Tag>
          <SwapOutlined style={{ color: '#8c8c8c' }} />
          <Tag color="blue" style={{ fontSize: 13, fontWeight: 'bold' }}>{r.to_currency || 'INR'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Exchange Rate',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      render: (rate: number, r: any) => (
        <Text strong style={{ fontSize: 14, color: '#0958d9' }}>
          1 {r.from_currency} = {Number(rate).toFixed(6)} INR
        </Text>
      ),
    },
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (d: string) => <Text>{d ? dayjs(d).format('YYYY-MM-DD') : '-'}</Text>,
    },
    {
      title: 'Rate Type',
      dataIndex: 'rate_type',
      key: 'rate_type',
      render: (t: string) => <Tag color="purple">{t || 'SPOT'}</Tag>,
    },
    {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      render: (rm: string) => <Text type="secondary">{rm || '-'}</Text>,
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Multi-Currency Masters & Exchange Rates
          </Title>
          <Text type="secondary">
            Maintain date-effective exchange rates for USD, EUR, GBP, AED to Base Currency (INR) and run Forex Revaluations.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button icon={<FundOutlined />} onClick={() => setRevalVisible(true)}>
              Month-End Forex Revaluation
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              Update Rate
            </Button>
          </Space>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Maintain Date-Effective Exchange Rate"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ fromCurrency: 'USD', rateType: 'SPOT', effectiveDate: dayjs() }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fromCurrency" label="Foreign Currency" rules={[{ required: true }]}>
                <Select>
                  <Option value="USD">USD - US Dollar</Option>
                  <Option value="EUR">EUR - Euro</Option>
                  <Option value="GBP">GBP - British Pound</Option>
                  <Option value="AED">AED - UAE Dirham</Option>
                  <Option value="JPY">JPY - Japanese Yen</Option>
                  <Option value="SGD">SGD - Singapore Dollar</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="exchangeRate" label="Rate to INR (1 Unit = ₹)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} precision={6} min={0.000001} placeholder="e.g. 83.500000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="effectiveDate" label="Effective Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rateType" label="Rate Classification">
                <Select>
                  <Option value="SPOT">Spot Market Rate</Option>
                  <Option value="CUSTOMS_STATUTORY">CBIC Customs Statutory Rate</Option>
                  <Option value="MONTHLY_AVERAGE">Monthly Average Rate</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="Notes">
            <Input placeholder="e.g. Daily RBI Reference Rate" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Execute Period-Close Unrealized Forex Revaluation"
        open={revalVisible}
        onOk={handleRunRevaluation}
        onCancel={() => setRevalVisible(false)}
      >
        <p>This routine recalculates all open foreign currency AR/AP balances against the latest closing exchange rates and automatically posts balanced double-entry General Ledger journals to <strong>Account 7101 (Forex Fluctuation)</strong>.</p>
        <p>The process is <strong>100% idempotent</strong> per accounting period.</p>
      </Modal>
    </div>
  )
}
