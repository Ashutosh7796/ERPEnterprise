import React, { useState, useEffect } from 'react'
import { Card, Typography, Row, Col, Statistic, Table, Button, Tag, Space, Alert, message } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, DollarOutlined, BankOutlined } from '@ant-design/icons'
import { gstrComplianceApi, Gstr3bSummary } from '../api/gstrComplianceApi'

const { Title, Text } = Typography

export const Gstr3bSummaryPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('032026')
  const [data, setData] = useState<Gstr3bSummary | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await gstrComplianceApi.getGstr3bSummary(period)
      if (res && res.code === 200) {
        setData(res.data)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load GSTR-3B summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  const offsetData = data?.offsetResult
    ? [
        {
          head: 'Integrated Tax (IGST)',
          payable: data.offsetResult.igstPayable,
          paidByIgst: data.offsetResult.igstPaidByIgstCredit,
          paidByCgst: 0,
          paidBySgst: 0,
          cashPayable: data.offsetResult.igstCashPayable,
        },
        {
          head: 'Central Tax (CGST)',
          payable: data.offsetResult.cgstPayable,
          paidByIgst: data.offsetResult.cgstPaidByIgstCredit,
          paidByCgst: data.offsetResult.cgstPaidByCgstCredit,
          paidBySgst: 0,
          cashPayable: data.offsetResult.cgstCashPayable,
        },
        {
          head: 'State Tax (SGST)',
          payable: data.offsetResult.sgstPayable,
          paidByIgst: data.offsetResult.sgstPaidByIgstCredit,
          paidByCgst: 0,
          paidBySgst: data.offsetResult.sgstPaidBySgstCredit,
          cashPayable: data.offsetResult.sgstCashPayable,
        },
      ]
    : []

  const offsetColumns = [
    { title: 'Tax Head', dataIndex: 'head', key: 'head', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Gross Liability', dataIndex: 'payable', key: 'payable', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'Paid by IGST Credit', dataIndex: 'paidByIgst', key: 'paidByIgst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'Paid by CGST Credit', dataIndex: 'paidByCgst', key: 'paidByCgst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'Paid by SGST Credit', dataIndex: 'paidBySgst', key: 'paidBySgst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    {
      title: 'Net Cash Ledger Payment',
      dataIndex: 'cashPayable',
      key: 'cashPayable',
      render: (v: number) => (
        <Tag color={v > 0 ? 'volcano' : 'success'} style={{ fontSize: 13, fontWeight: 'bold' }}>
          ₹{Number(v || 0).toFixed(2)}
        </Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Statutory GSTR-3B Monthly Return & Section 49 Tax Payment Optimizer
          </Title>
          <Text type="secondary">
            Period: <strong>{period}</strong> | Entity GSTIN: <strong>{data?.gstin || '27AAACE1234E1Z1'}</strong>
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Table 3.1 Total Output Tax Liability"
              value={data?.totalGrossTaxLiability || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Table 4(C) Net Eligible ITC Available"
              value={data?.totalNetItcAvailable || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Net Cash Payable (Electronic Cash Ledger)"
              value={data?.offsetResult?.totalCashPayable || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Section 49 Statutory Tax Payment & Credit Offsetting Breakdown" bordered={false} style={{ borderRadius: 8 }}>
        <Alert
          message="Statutory Sequencing Rule Enforced"
          description="IGST Credit is first utilized against IGST, then CGST and SGST liabilities. Cross-utilization between CGST and SGST is strictly prohibited under GST Law."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table dataSource={offsetData} columns={offsetColumns} pagination={false} rowKey="head" size="middle" />
      </Card>
    </div>
  )
}
