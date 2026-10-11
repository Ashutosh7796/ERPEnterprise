import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Tabs,
  Statistic,
  Descriptions,
  Popconfirm,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
  FundOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import {
  pricingApi,
  ExchangeRate,
  ForexRevaluationResult,
  ForexRevaluationRunRecord,
} from '../api/pricingApi'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

export const ExchangeRateListPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [ratesData, setRatesData] = useState<ExchangeRate[]>([])
  const [runsData, setRunsData] = useState<ForexRevaluationRunRecord[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [revalModalVisible, setRevalModalVisible] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [executeLoading, setExecuteLoading] = useState(false)
  const [reversalLoading, setReversalLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState<ForexRevaluationResult | null>(null)

  const [form] = Form.useForm()
  const [revalForm] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const [rateRes, runRes]: any = await Promise.all([
        pricingApi.listExchangeRates(),
        pricingApi.listForexRevaluationRuns(),
      ])

      if (rateRes && rateRes.code === 200) {
        setRatesData(rateRes.data || [])
      } else if (Array.isArray(rateRes)) {
        setRatesData(rateRes)
      }

      if (runRes && runRes.code === 200) {
        setRunsData(runRes.data || [])
      } else if (Array.isArray(runRes)) {
        setRunsData(runRes)
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

  const handleCreateRate = async () => {
    try {
      const values = await form.validateFields()
      const payload: ExchangeRate = {
        fromCurrency: values.fromCurrency,
        toCurrency: 'INR',
        exchangeRate: values.exchangeRate,
        effectiveDate: values.effectiveDate
          ? values.effectiveDate.format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD'),
        rateType: values.rateType || 'SPOT',
        remark: values.remark,
      }
      const res: any = await pricingApi.setExchangeRate(payload)
      if (res && (res.code === 200 || !res.code)) {
        message.success('Exchange rate saved successfully')
        setModalVisible(false)
        form.resetFields()
        loadData()
      }
    } catch (e: any) {
      message.error(e?.message || 'Validation error')
    }
  }

  const handlePreviewRevaluation = async () => {
    try {
      const values = await revalForm.validateFields()
      setPreviewLoading(true)
      const res: any = await pricingApi.previewForexRevaluation({
        organizationId: values.organizationId || 1,
        period: values.period || '2026-03',
        closingDate: values.closingDate ? values.closingDate.format('YYYY-MM-DD') : undefined,
      })
      if (res && res.code === 200) {
        setPreviewResult(res.data)
        message.info('Revaluation preview calculated. Inspect below before posting.')
      } else {
        message.error(res?.data || 'Failed to preview revaluation')
      }
    } catch (e: any) {
      message.error(e?.message || 'Preview error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleExecuteRevaluation = async () => {
    try {
      const values = await revalForm.validateFields()
      setExecuteLoading(true)
      const res: any = await pricingApi.executeForexRevaluation({
        organizationId: values.organizationId || 1,
        period: values.period || '2026-03',
        closingDate: values.closingDate ? values.closingDate.format('YYYY-MM-DD') : undefined,
      })
      if (res && res.code === 200) {
        message.success(
          `Period-close Forex Revaluation posted to Canonical GL! Run: ${res.data?.runNumber || ''} Voucher: ${res.data?.voucherNumber || ''}`
        )
        setRevalModalVisible(false)
        setPreviewResult(null)
        loadData()
      } else {
        message.error(res?.data || 'Execution error')
      }
    } catch (e: any) {
      message.error(e?.message || 'Execution error')
    } finally {
      setExecuteLoading(false)
    }
  }

  const handleDay1Reversal = async (record: ForexRevaluationRunRecord) => {
    try {
      setReversalLoading(true)
      const res: any = await pricingApi.executeDay1Reversal({
        organizationId: record.organizationId,
        period: record.revaluationPeriod,
      })
      if (res && res.code === 200) {
        message.success(
          `Day-1 Automatic Reversal successfully posted to Canonical GL! Reversal Voucher: ${res.data?.reversalVoucherNumber || res.data?.reversalVoucherId || ''}`
        )
        loadData()
      } else {
        message.error(res?.data || 'Reversal failed')
      }
    } catch (e: any) {
      message.error(e?.message || 'Day-1 reversal error')
    } finally {
      setReversalLoading(false)
    }
  }

  const rateColumns = [
    {
      title: 'Currency Pair',
      key: 'pair',
      render: (_: any, r: any) => (
        <Space>
          <Tag color="cyan" style={{ fontSize: 13, fontWeight: 'bold' }}>
            {r.from_currency || r.fromCurrency}
          </Tag>
          <SwapOutlined style={{ color: '#8c8c8c' }} />
          <Tag color="blue" style={{ fontSize: 13, fontWeight: 'bold' }}>
            {r.to_currency || r.toCurrency || 'INR'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Exchange Rate',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      render: (rate: number, r: any) => (
        <Text strong style={{ fontSize: 14, color: '#0958d9' }}>
          1 {r.from_currency || r.fromCurrency} ={' '}
          {Number(rate || r.exchangeRate).toFixed(6)} INR
        </Text>
      ),
    },
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (d: string, r: any) => {
        const val = d || r.effectiveDate
        return <Text>{val ? dayjs(val).format('YYYY-MM-DD') : '-'}</Text>
      },
    },
    {
      title: 'Rate Type',
      dataIndex: 'rate_type',
      key: 'rate_type',
      render: (t: string, r: any) => {
        const val = t || r.rateType || 'SPOT'
        return <Tag color="purple">{val}</Tag>
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      render: (rm: string) => <Text type="secondary">{rm || '-'}</Text>,
    },
  ]

  const runColumns = [
    {
      title: 'Run Number',
      dataIndex: 'runNumber',
      key: 'runNumber',
      render: (num: string) => <Text strong>{num || '-'}</Text>,
    },
    {
      title: 'Period',
      dataIndex: 'revaluationPeriod',
      key: 'revaluationPeriod',
      render: (p: string) => <Tag color="blue">{p}</Tag>,
    },
    {
      title: 'Org ID',
      dataIndex: 'organizationId',
      key: 'organizationId',
    },
    {
      title: 'Net FX Adjustment',
      dataIndex: 'netForexGainLoss',
      key: 'netForexGainLoss',
      render: (amt: number) => {
        const num = Number(amt || 0)
        const isGain = num >= 0
        return (
          <Text strong style={{ color: isGain ? '#389e0d' : '#cf1322' }}>
            {isGain ? '+' : ''}₹{num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        )
      },
    },
    {
      title: 'GL Voucher ID',
      dataIndex: 'journalVoucherId',
      key: 'journalVoucherId',
      render: (id: number) => <Tag color="geekblue">{id ? `JV-${id}` : '-'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        if (s === 'REVERSED') return <Tag color="orange">REVERSED</Tag>
        if (s === 'POSTED') return <Tag color="green">POSTED</Tag>
        return <Tag>{s}</Tag>
      },
    },
    {
      title: 'Reversal Voucher',
      dataIndex: 'reversalVoucherId',
      key: 'reversalVoucherId',
      render: (id: number, r: ForexRevaluationRunRecord) => (
        <span>
          {id ? (
            <Tag color="volcano">JV-REV-{id}</Tag>
          ) : (
            <Text type="secondary">Pending</Text>
          )}
          {r.reversalDate && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              {dayjs(r.reversalDate).format('YYYY-MM-DD')}
            </div>
          )}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ForexRevaluationRunRecord) => {
        if (r.status === 'POSTED' && !r.reversalVoucherId) {
          return (
            <Popconfirm
              title="Execute Day-1 Automatic Reversal?"
              description="This will post an exact mirror reversal on Day 1 of the following fiscal month via Canonical GlEntryService."
              onConfirm={() => handleDay1Reversal(r)}
              okText="Execute Reversal"
              cancelText="Cancel"
            >
              <Button
                size="small"
                danger
                icon={<RollbackOutlined />}
                loading={reversalLoading}
              >
                Day-1 Reversal
              </Button>
            </Popconfirm>
          )
        }
        return (
          <Tag icon={<CheckCircleOutlined />} color="default">
            Completed
          </Tag>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Multi-Currency & Forex Accounting
          </Title>
          <Text type="secondary">
            Finance Slice 3 — Workstream B: Date-effective exchange rate governance,
            unrealized period-close revaluation, and Day-1 automatic reversal.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<FundOutlined />}
              onClick={() => {
                setRevalModalVisible(true)
                setPreviewResult(null)
              }}
            >
              Period-Close Forex Revaluation
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields()
                setModalVisible(true)
              }}
            >
              Add Exchange Rate
            </Button>
          </Space>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="rates"
        items={[
          {
            key: 'rates',
            label: (
              <span>
                <SwapOutlined /> Exchange Rates Master
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Table
                  dataSource={ratesData}
                  columns={rateColumns}
                  rowKey={(r: any) => r.id || `${r.from_currency}-${r.effective_date}`}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Forex Revaluation Run History
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Table
                  dataSource={runsData}
                  columns={runColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Maintain Exchange Rate Modal */}
      <Modal
        title="Maintain Date-Effective Exchange Rate"
        open={modalVisible}
        onOk={handleCreateRate}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ fromCurrency: 'USD', rateType: 'SPOT', effectiveDate: dayjs() }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fromCurrency"
                label="Foreign Currency"
                rules={[{ required: true }]}
              >
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
              <Form.Item
                name="exchangeRate"
                label="Rate to INR (1 Unit = ₹)"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  precision={6}
                  min={0.000001}
                  placeholder="e.g. 83.500000"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="effectiveDate"
                label="Effective Date"
                rules={[{ required: true }]}
              >
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
            <Input placeholder="e.g. RBI Reference Rate / CBIC Notification" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Period-Close Forex Revaluation Modal */}
      <Modal
        title="Execute Period-Close Unrealized Forex Revaluation"
        open={revalModalVisible}
        width={800}
        onCancel={() => {
          setRevalModalVisible(false)
          setPreviewResult(null)
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setRevalModalVisible(false)
              setPreviewResult(null)
            }}
          >
            Cancel
          </Button>,
          <Button
            key="preview"
            icon={<EyeOutlined />}
            loading={previewLoading}
            onClick={handlePreviewRevaluation}
          >
            Calculate Preview
          </Button>,
          <Button
            key="execute"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={executeLoading}
            onClick={handleExecuteRevaluation}
          >
            Post Canonical GL Revaluation
          </Button>,
        ]}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Statutory Accounting Compliance (Ind AS 21 / AS 11)"
          description="Unrealized revaluation adjustments post strictly to Statutory Accounts 4202 (Net Foreign Exchange Gain) and 5209 (Net Foreign Exchange Loss). All postings route through the canonical General Ledger gateway. Subledger invoice records remain 100% immutable."
        />

        <Form
          form={revalForm}
          layout="inline"
          initialValues={{ period: '2026-03', organizationId: 1, closingDate: dayjs() }}
          style={{ marginBottom: 20 }}
        >
          <Form.Item
            name="period"
            label="Accounting Period"
            rules={[{ required: true }]}
          >
            <Input placeholder="YYYY-MM (e.g. 2026-03)" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="organizationId" label="Org ID">
            <InputNumber min={1} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="closingDate" label="Closing Rate Date">
            <DatePicker style={{ width: 130 }} />
          </Form.Item>
        </Form>

        {previewResult && (
          <div style={{ marginTop: 16 }}>
            <Card size="small" title="Preview Calculation Summary" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Period"
                    value={previewResult.revaluationPeriod}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Unrealized Gain"
                    value={previewResult.totalForexGain || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#389e0d', fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Unrealized Loss"
                    value={previewResult.totalForexLoss || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#cf1322', fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Net FX Adjustment"
                    value={previewResult.netForexAdjustment || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{
                      color:
                        (previewResult.netForexAdjustment || 0) >= 0 ? '#389e0d' : '#cf1322',
                      fontSize: 18,
                    }}
                  />
                </Col>
              </Row>
            </Card>

            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Target GL Account">
                {(previewResult.netForexAdjustment || 0) >= 0
                  ? '4202 — Net Foreign Exchange Gain (P&L Other Income)'
                  : '5209 — Net Foreign Exchange Loss (P&L Other Expense)'}
              </Descriptions.Item>
              <Descriptions.Item label="Statutory Rule">
                Ind AS 21 Closing Rate Monetary Revaluation
              </Descriptions.Item>
              <Descriptions.Item label="Reversal Policy">
                DAY-1 AUTOMATIC REVERSAL (Following Open Period)
              </Descriptions.Item>
              <Descriptions.Item label="Open Monetary Items">
                {previewResult.items?.length || 0} Document(s) Evaluated
              </Descriptions.Item>
            </Descriptions>

            {previewResult.items && previewResult.items.length > 0 && (
              <Table
                size="small"
                dataSource={previewResult.items}
                rowKey="documentId"
                pagination={false}
                columns={[
                  { title: 'Doc #', dataIndex: 'documentNumber', key: 'doc' },
                  { title: 'Currency', dataIndex: 'currencyCode', key: 'cur' },
                  {
                    title: 'Foreign Amt',
                    dataIndex: 'openForeignAmount',
                    key: 'fa',
                    render: (v: number) => Number(v).toFixed(2),
                  },
                  {
                    title: 'Orig Rate',
                    dataIndex: 'originalExchangeRate',
                    key: 'or',
                    render: (v: number) => Number(v).toFixed(4),
                  },
                  {
                    title: 'Closing Rate',
                    dataIndex: 'currentExchangeRate',
                    key: 'cr',
                    render: (v: number) => Number(v).toFixed(4),
                  },
                  {
                    title: 'FX Delta (₹)',
                    dataIndex: 'forexGainLoss',
                    key: 'delta',
                    render: (v: number) => {
                      const num = Number(v)
                      return (
                        <Text strong style={{ color: num >= 0 ? '#389e0d' : '#cf1322' }}>
                          {num >= 0 ? '+' : ''}
                          {num.toFixed(2)}
                        </Text>
                      )
                    },
                  },
                  {
                    title: 'Statutory Account',
                    dataIndex: 'glAccountCode',
                    key: 'acct',
                    render: (code: string) => (
                      <Tag color={code === '4202' ? 'green' : 'red'}>
                        {code}
                      </Tag>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
