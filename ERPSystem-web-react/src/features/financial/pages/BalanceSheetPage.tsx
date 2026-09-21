import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Statistic,
  message,
  Divider,
} from 'antd'
import {
  BankOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  financialStatementApi,
  BalanceSheetReport,
  BalanceSheetItem,
} from '../api/financialStatementApi'

const { Title, Text } = Typography

export const BalanceSheetPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs())
  const [report, setReport] = useState<BalanceSheetReport | null>(null)

  const loadReport = async () => {
    try {
      setLoading(true)
      const res: any = await financialStatementApi.getBalanceSheet({
        asOfDate: asOfDate.format('YYYY-MM-DD'),
      })

      const data = res?.assets ? res : (res?.data?.assets ? res.data : res?.data || res)
      if (data && (Array.isArray(data.assets) || Array.isArray(data.equityAndLiabilities))) {
        setReport(data)
      } else {
        setReport(null)
      }
    } catch (err: any) {
      console.error('Failed to load Balance Sheet', err)
      message.error(err?.message || 'Failed to load Balance Sheet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [asOfDate])

  const itemColumns = [
    {
      title: 'Schedule Ref',
      dataIndex: 'scheduleCode',
      key: 'scheduleCode',
      width: 120,
      render: (code: string) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{code}</Tag>,
    },
    {
      title: 'Particulars',
      dataIndex: 'scheduleName',
      key: 'scheduleName',
      render: (name: string, record: BalanceSheetItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          {record.notes && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.notes}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Header Bar */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Space align="center" size="middle">
              <BankOutlined style={{ fontSize: 28, color: '#52c41a', backgroundColor: '#f6ffed', padding: 8, borderRadius: 6 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Schedule III Balance Sheet
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Statutory Statement of Assets, Liabilities and Equity derived from Pure-GL facts
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <DatePicker
                value={asOfDate}
                onChange={(d) => d && setAsOfDate(d)}
                placeholder="Select As-of Date"
                style={{ width: 180 }}
              />
              <Button type="primary" ghost icon={<ReloadOutlined />} onClick={loadReport} loading={loading}>
                Refresh
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* KPI Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Assets"
              value={report?.totalAssets || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Equity & Liabilities"
              value={report?.totalEquityAndLiabilities || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#722ed1', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Current Period Net P&L"
              value={report?.currentPeriodProfitLoss || 0}
              precision={2}
              prefix="₹"
              valueStyle={{
                color: (report?.currentPeriodProfitLoss || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              backgroundColor: report?.isBalanced ? '#f6ffed' : '#fff1f0',
              border: `1px solid ${report?.isBalanced ? '#b7eb8f' : '#ffa39e'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 88,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {report?.isBalanced ? (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '6px 16px', fontSize: 14, borderRadius: 4 }}>
                  BALANCED (A = L + E)
                </Tag>
              ) : (
                <Tag color="error" icon={<CloseCircleOutlined />} style={{ padding: '6px 16px', fontSize: 14, borderRadius: 4 }}>
                  UNBALANCED (Diff: ₹{report?.difference?.toFixed(2)})
                </Tag>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2-Column Schedule III Layout */}
      <Row gutter={[16, 16]}>
        {/* Left Column: Equity and Liabilities */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Text strong style={{ fontSize: 15, color: '#262626' }}>
                  I. EQUITY AND LIABILITIES
                </Text>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
            extra={
              <Text strong style={{ color: '#722ed1', fontSize: 15, fontFamily: 'monospace' }}>
                Total: ₹ {report?.totalEquityAndLiabilities?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            }
          >
            {(report?.equityAndLiabilities || []).map((sec, idx) => (
              <div key={sec.sectionCode || idx} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '4px 8px', backgroundColor: '#f0f5ff', borderRadius: 4 }}>
                  <Text strong style={{ color: '#1d39c4', fontSize: 13 }}>
                    {sec.sectionName}
                  </Text>
                  <Text strong style={{ fontFamily: 'monospace', color: '#1d39c4' }}>
                    ₹ {sec.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </div>
                <Table
                  dataSource={sec.items || []}
                  columns={itemColumns as any}
                  rowKey="scheduleCode"
                  pagination={false}
                  size="small"
                  bordered
                  showHeader={false}
                />
                {idx < (report?.equityAndLiabilities.length || 0) - 1 && (
                  <Divider style={{ margin: '12px 0' }} />
                )}
              </div>
            ))}
          </Card>
        </Col>

        {/* Right Column: Assets */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Text strong style={{ fontSize: 15, color: '#262626' }}>
                  II. ASSETS
                </Text>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
            extra={
              <Text strong style={{ color: '#1890ff', fontSize: 15, fontFamily: 'monospace' }}>
                Total: ₹ {report?.totalAssets?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            }
          >
            {(report?.assets || []).map((sec, idx) => (
              <div key={sec.sectionCode || idx} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '4px 8px', backgroundColor: '#f6ffed', borderRadius: 4 }}>
                  <Text strong style={{ color: '#389e0d', fontSize: 13 }}>
                    {sec.sectionName}
                  </Text>
                  <Text strong style={{ fontFamily: 'monospace', color: '#389e0d' }}>
                    ₹ {sec.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </div>
                <Table
                  dataSource={sec.items || []}
                  columns={itemColumns as any}
                  rowKey="scheduleCode"
                  pagination={false}
                  size="small"
                  bordered
                  showHeader={false}
                />
                {idx < (report?.assets.length || 0) - 1 && (
                  <Divider style={{ margin: '12px 0' }} />
                )}
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
export default BalanceSheetPage
