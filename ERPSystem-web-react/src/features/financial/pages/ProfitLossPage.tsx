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
} from 'antd'
import {
  LineChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  financialStatementApi,
  ProfitLossReport,
  ProfitLossItem,
} from '../api/financialStatementApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export const ProfitLossPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ])
  const [report, setReport] = useState<ProfitLossReport | null>(null)

  const loadReport = async () => {
    try {
      setLoading(true)
      const res: any = await financialStatementApi.getProfitLoss({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      })

      const data = (res?.totalRevenue !== undefined ? res : (res?.data?.totalRevenue !== undefined ? res.data : res?.data || res))
      if (data && (data.revenue || data.expenses || data.totalRevenue !== undefined)) {
        setReport(data)
      } else {
        setReport(null)
      }
    } catch (err: any) {
      console.error('Failed to load Profit & Loss', err)
      message.error(err?.message || 'Failed to load Profit & Loss Statement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [dateRange])

  const itemColumns = [
    {
      title: 'Item Ref',
      dataIndex: 'itemCode',
      key: 'itemCode',
      width: 120,
      render: (code: string) => <Tag color="cyan" style={{ fontFamily: 'monospace' }}>{code}</Tag>,
    },
    {
      title: 'Particulars',
      dataIndex: 'itemName',
      key: 'itemName',
      render: (name: string, record: ProfitLossItem) => (
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
              <LineChartOutlined style={{ fontSize: 28, color: '#fa8c16', backgroundColor: '#fff7e6', padding: 8, borderRadius: 6 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Schedule III Profit & Loss Statement
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Statutory Statement of Profit & Loss with Moving-Average COGS directly from erp_gl_entry
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]])
                  }
                }}
                style={{ width: 240 }}
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
              title="Total Revenue & Income"
              value={report?.totalRevenue || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Expenses"
              value={report?.totalExpenses || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#eb2f96', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Profit Before Tax (PBT)"
              value={report?.profitBeforeTax || 0}
              precision={2}
              prefix="₹"
              valueStyle={{
                color: (report?.profitBeforeTax || 0) >= 0 ? '#1890ff' : '#ff4d4f',
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
              backgroundColor: (report?.netProfit || 0) >= 0 ? '#f6ffed' : '#fff1f0',
              border: `1px solid ${(report?.netProfit || 0) >= 0 ? '#b7eb8f' : '#ffa39e'}`,
            }}
          >
            <Statistic
              title="Net Profit / (Loss)"
              value={report?.netProfit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{
                color: (report?.netProfit || 0) >= 0 ? '#389e0d' : '#cf1322',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue Section */}
      <Card
        title={
          <Text strong style={{ fontSize: 15, color: '#262626' }}>
            I. REVENUE & INCOME
          </Text>
        }
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        extra={
          <Text strong style={{ color: '#52c41a', fontSize: 15, fontFamily: 'monospace' }}>
            Total Revenue: ₹ {report?.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '4px 8px', backgroundColor: '#f6ffed', borderRadius: 4 }}>
            <Text strong style={{ color: '#389e0d', fontSize: 13 }}>
              {report?.revenue?.sectionName || 'Revenue from Operations'}
            </Text>
            <Text strong style={{ fontFamily: 'monospace', color: '#389e0d' }}>
              ₹ {report?.revenue?.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </div>
          <Table
            dataSource={report?.revenue?.items || []}
            columns={itemColumns as any}
            rowKey="itemCode"
            pagination={false}
            size="small"
            bordered
            showHeader={false}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '4px 8px', backgroundColor: '#f9f0ff', borderRadius: 4 }}>
            <Text strong style={{ color: '#722ed1', fontSize: 13 }}>
              {report?.otherIncome?.sectionName || 'Other Income'}
            </Text>
            <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>
              ₹ {report?.otherIncome?.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </div>
          <Table
            dataSource={report?.otherIncome?.items || []}
            columns={itemColumns as any}
            rowKey="itemCode"
            pagination={false}
            size="small"
            bordered
            showHeader={false}
          />
        </div>
      </Card>

      {/* Expenses Section */}
      <Card
        title={
          <Text strong style={{ fontSize: 15, color: '#262626' }}>
            II. EXPENSES
          </Text>
        }
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        extra={
          <Text strong style={{ color: '#eb2f96', fontSize: 15, fontFamily: 'monospace' }}>
            Total Expenses: ₹ {report?.totalExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        }
      >
        <Table
          dataSource={report?.expenses?.items || []}
          columns={itemColumns as any}
          rowKey="itemCode"
          pagination={false}
          size="small"
          bordered
          showHeader={false}
        />
      </Card>

      {/* Net Profit Summary Footer Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          backgroundColor: (report?.netProfit || 0) >= 0 ? '#f6ffed' : '#fff1f0',
          border: `1px solid ${(report?.netProfit || 0) >= 0 ? '#b7eb8f' : '#ffa39e'}`,
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} sm={14}>
            <Title level={4} style={{ margin: 0 }}>
              III. PROFIT / (LOSS) FOR THE PERIOD
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Revenue from Operations + Other Income − Total Expenses
            </Text>
          </Col>
          <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
            <Title
              level={3}
              style={{
                margin: 0,
                color: (report?.netProfit || 0) >= 0 ? '#389e0d' : '#cf1322',
                fontFamily: 'monospace',
              }}
            >
              ₹ {report?.netProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Title>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
export default ProfitLossPage
