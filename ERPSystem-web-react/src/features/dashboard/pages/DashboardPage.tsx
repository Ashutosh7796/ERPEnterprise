import React from 'react'
import { Row, Col, Card, Statistic, Typography, Table, Tag, Button, Space, theme as antdTheme } from 'antd'
import {
  ShoppingOutlined,
  ShopOutlined,
  InboxOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@core/auth/authStore'

const { Title, Text } = Typography

export const DashboardPage: React.FC = () => {
  const { token } = antdTheme.useToken()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Chart Option for Monthly Performance
  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Purchase Inbound ($)', 'Sales Revenue ($)'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Purchase Inbound ($)',
        type: 'line',
        smooth: true,
        data: [12000, 19000, 15000, 28000, 22000, 31000, 39000, 42000, 38000, 45000, 52000, 58000],
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.35)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
            ],
          },
        },
      },
      {
        name: 'Sales Revenue ($)',
        type: 'line',
        smooth: true,
        data: [18000, 24000, 22000, 35000, 30000, 45000, 51000, 59000, 54000, 62000, 71000, 82000],
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.35)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.02)' },
            ],
          },
        },
      },
    ],
  }

  // Stock Warning Columns
  const warningColumns = [
    {
      title: 'Material Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'SKU / Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
    },
    {
      title: 'Current Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => <Tag color="error">{stock} Units</Tag>,
    },
    {
      title: 'Safety Threshold',
      dataIndex: 'safety',
      key: 'safety',
      render: (safety: number) => <span>{safety} Units</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="warning">Low Stock Alert</Tag>,
    },
  ]

  const warningData = [
    { key: '1', name: 'Industrial Motor 500W', barcode: '693821098231', stock: 12, safety: 50 },
    { key: '2', name: 'Alloy Bearing 25mm', barcode: '693821098232', stock: 5, safety: 100 },
    { key: '3', name: 'Control Circuit Board V2', barcode: '693821098233', stock: 8, safety: 40 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome Banner */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #0958d9 100%)`,
          color: '#ffffff',
          borderRadius: 8,
        }}
        styles={{ body: { padding: '24px 32px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#ffffff', margin: 0 }}>
              Welcome back, {user?.userName || user?.loginName || 'Administrator'}!
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14 }}>
              Enterprise Resource Planning System · Real-time operational intelligence
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={() => navigate('/purchase/order')}
                style={{ fontWeight: 500 }}
              >
                New Purchase Order
              </Button>
              <Button
                type="primary"
                ghost
                icon={<PlusOutlined />}
                onClick={() => navigate('/sales/order')}
                style={{ fontWeight: 500, borderColor: '#ffffff', color: '#ffffff' }}
              >
                New Sales Order
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Total Material Items"
              value={1428}
              prefix={<InboxOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />}
              suffix="SKUs"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
              <span style={{ color: '#52c41a' }}>
                <ArrowUpOutlined /> +8.4%
              </span>{' '}
              vs last month
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Purchase Inbound Bills"
              value={324}
              prefix={<ShoppingOutlined style={{ color: '#13c2c2', marginRight: 8 }} />}
              suffix="Orders"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
              <span style={{ color: '#52c41a' }}>
                <ArrowUpOutlined /> +12.1%
              </span>{' '}
              fulfillment rate
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Sales Outbound Volume"
              value={862}
              prefix={<ShopOutlined style={{ color: '#eb2f96', marginRight: 8 }} />}
              suffix="Shipments"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
              <span style={{ color: '#52c41a' }}>
                <ArrowUpOutlined /> +19.3%
              </span>{' '}
              growth
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Net Account Balance"
              value={342890.5}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              suffix="$"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
              Settled across all depot accounts
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Charts & Analytics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Revenue & Purchasing Trend (Fiscal Year)"
            variant="borderless"
            extra={
              <Button type="link" onClick={() => navigate('/report/stock')}>
                View Full Reports <RightOutlined />
              </Button>
            }
          >
            <ReactECharts option={chartOption} style={{ height: 350, width: '100%' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Critical Inventory Stock Warnings"
            variant="borderless"
            extra={
              <Button type="link" onClick={() => navigate('/material/list')}>
                View All <RightOutlined />
              </Button>
            }
          >
            <Table
              columns={warningColumns}
              dataSource={warningData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
