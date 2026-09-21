import React, { useState, useEffect } from 'react'
import { Card, Typography, Row, Col, Statistic, Table, Button, Tag, Space, message, Tooltip } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons'
import { gstrComplianceApi, Gstr2bReconciliationResult } from '../api/gstrComplianceApi'

const { Title, Text } = Typography

export const Gstr2bReconciliationPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('032026')
  const [data, setData] = useState<Gstr2bReconciliationResult | null>(null)

  const runReconciliation = async () => {
    setLoading(true)
    try {
      const res: any = await gstrComplianceApi.runGstr2bReconciliation(period)
      if (res && res.code === 200) {
        setData(res.data)
        message.success('GSTR-2B 3-Way Auto-Reconciliation completed!')
      }
    } catch (e: any) {
      message.error(e?.message || 'Reconciliation error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runReconciliation()
  }, [period])

  const columns = [
    {
      title: 'Match Status',
      dataIndex: 'matchStatus',
      key: 'status',
      render: (st: string) => {
        if (st === 'EXACT_MATCH') return <Tag color="success" icon={<CheckCircleOutlined />}>Exact Match</Tag>
        if (st === 'MATCHED_BLOCKED_ITC_17_5') return <Tag color="error" icon={<StopOutlined />}>Matched (Blocked 17(5))</Tag>
        if (st === 'VALUE_MISMATCH') return <Tag color="warning" icon={<ExclamationCircleOutlined />}>Value Diff</Tag>
        if (st === 'DATE_MISMATCH') return <Tag color="orange" icon={<ExclamationCircleOutlined />}>Date Diff</Tag>
        return <Tag color="default">Missing in ERP</Tag>
      },
    },
    {
      title: 'Supplier Info',
      key: 'supp',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.supplierTradeName || 'Vendor'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.supplierGstin}</Text>
        </div>
      ),
    },
    {
      title: 'GSTR-2B Portal Details',
      key: 'g2b',
      render: (_: any, r: any) => (
        <div>
          <Text>{r.gstr2bInvoiceNumber}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.gstr2bInvoiceDate} | Taxable: ₹{Number(r.gstr2bTaxableValue || 0).toLocaleString('en-IN')}</Text>
        </div>
      ),
    },
    {
      title: 'ERP Purchase Register',
      key: 'erp',
      render: (_: any, r: any) => (
        <div>
          <Text>{r.erpInvoiceNumber || '-'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.erpInvoiceDate ? `${r.erpInvoiceDate} | Taxable: ₹${Number(r.erpTaxableValue || 0).toLocaleString('en-IN')}` : 'Not booked in ERP'}
          </Text>
        </div>
      ),
    },
    {
      title: 'ITC Claim Eligibility',
      dataIndex: 'itcEligibilityStatus',
      key: 'itc',
      render: (st: string) => {
        if (st === 'ELIGIBLE') return <Tag color="cyan">100% Eligible</Tag>
        if (st === 'BLOCKED_17_5') return <Tag color="red">Ineligible / Blocked</Tag>
        return <Tag color="default">Pending Supplier Action</Tag>
      },
    },
    {
      title: 'Statutory Remarks & Tolerance Audit',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (rm: string) => <Text style={{ fontSize: 12 }}>{rm}</Text>,
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            GSTR-2B vs AP Purchase Register 3-Way Auto-Reconciliation
          </Title>
          <Text type="secondary">
            Multi-pass intelligent matching with ₹{data?.amountTolerance || 1} rounding tolerance, date window deviation, and Section 17(5) Blocked ITC validation.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={runReconciliation}>Refresh</Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={runReconciliation}>
              Re-Run 3-Way Match
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Exact Matches" value={data?.exactMatchCount || 0} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Eligible ITC Claimable" value={data?.totalEligibleItcClaimable || 0} precision={2} prefix="₹" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Blocked / Ineligible ITC" value={data?.totalIneligibleBlockedItc || 0} precision={2} prefix="₹" valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Discrepant / Unbooked Count" value={(data?.valueMismatchCount || 0) + (data?.missingInErpCount || 0)} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          dataSource={data?.items || []}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
