import React, { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Card, Typography, Row, Col, Statistic, Tabs, message, Tooltip } from 'antd'
import { DownloadOutlined, ReloadOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { gstrComplianceApi, Gstr1Summary } from '../api/gstrComplianceApi'

const { Title, Text } = Typography

export const Gstr1FilingWorkspacePage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('032026')
  const [data, setData] = useState<Gstr1Summary | null>(null)

  const loadSummary = async () => {
    setLoading(true)
    try {
      const res: any = await gstrComplianceApi.getGstr1Summary(period)
      if (res && res.code === 200) {
        setData(res.data)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to fetch GSTR-1 summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [period])

  const handleDownloadJson = () => {
    if (!data?.gstnOfficialJsonPayload) {
      message.warning('No GSTR-1 payload available')
      return
    }
    const blob = new Blob([JSON.stringify(data.gstnOfficialJsonPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `GSTR1_${data.gstin}_${data.fp}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('Downloaded official GSTN GSTR-1 JSON Payload!')
  }

  const b2bColumns = [
    { title: 'Recipient GSTIN', dataIndex: 'customerGstin', key: 'ctin', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: 'Customer Name', dataIndex: 'customerLegalName', key: 'cname' },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'inum', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Date', dataIndex: 'invoiceDate', key: 'idt' },
    { title: 'Taxable Value', dataIndex: 'taxableValue', key: 'txval', render: (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Rate', dataIndex: 'gstRate', key: 'rt', render: (r: number) => `${r}%` },
    { title: 'CGST', dataIndex: 'cgstAmount', key: 'camt', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'SGST', dataIndex: 'sgstAmount', key: 'samt', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'IGST', dataIndex: 'igstAmount', key: 'iamt', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
  ]

  const hsnColumns = [
    { title: 'HSN / SAC Code', dataIndex: 'hsnCode', key: 'hsn', render: (t: string) => <Tag color="purple">{t}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'desc' },
    { title: 'Total Quantity', dataIndex: 'totalQuantity', key: 'qty', render: (q: number, r: any) => `${q} ${r.uqc || ''}` },
    { title: 'Taxable Value', dataIndex: 'taxableValue', key: 'txval', render: (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'CGST', dataIndex: 'cgstAmount', key: 'cgst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'SGST', dataIndex: 'sgstAmount', key: 'sgst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
    { title: 'IGST', dataIndex: 'igstAmount', key: 'igst', render: (v: number) => `₹${Number(v || 0).toFixed(2)}` },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Statutory GSTR-1 Outward Supplies Filing Workspace
          </Title>
          <Text type="secondary">
            Period: <strong>{period}</strong> | Filing Entity GSTIN: <strong>{data?.gstin || '27AAACE1234E1Z1'}</strong>
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSummary}>Refresh</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadJson} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
              Download GSTN JSON
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Total Taxable Turnover" value={data?.totalTaxableValue || 0} precision={2} prefix="₹" />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Total Output GST" value={data?.totalTaxAmount || 0} precision={2} prefix="₹" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="B2B Registered Count" value={data?.b2bCount || 0} suffix="Invoices" />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="HSN Unique Codes" value={data?.hsnCount || 0} suffix="Lines" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Tabs
          defaultActiveKey="b2b"
          items={[
            {
              key: 'b2b',
              label: `Table 4A - B2B Invoices (${data?.b2bCount || 0})`,
              children: <Table dataSource={data?.b2bList || []} columns={b2bColumns} rowKey="invoiceNumber" pagination={{ pageSize: 8 }} />,
            },
            {
              key: 'hsn',
              label: `Table 12 - HSN Summary (${data?.hsnCount || 0})`,
              children: <Table dataSource={data?.hsnList || []} columns={hsnColumns} rowKey="hsnCode" pagination={{ pageSize: 8 }} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
