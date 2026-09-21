import React, { useEffect, useState } from 'react'
import {
  Drawer,
  Descriptions,
  Badge,
  Progress,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
  Divider,
} from 'antd'
import {
  SafetyCertificateOutlined,
  WarningOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { salesApi, CustomerCreditExposureDto } from '../api/salesApi'

const { Text, Title } = Typography

interface CustomerCreditExposureDrawerProps {
  visible: boolean
  customerId?: number
  currentOrderValue?: number
  onClose: () => void
}

export const CustomerCreditExposureDrawer: React.FC<CustomerCreditExposureDrawerProps> = ({
  visible,
  customerId,
  currentOrderValue,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [exposure, setExposure] = useState<CustomerCreditExposureDto | null>(null)

  useEffect(() => {
    if (visible && customerId) {
      loadExposure()
    } else {
      setExposure(null)
    }
  }, [visible, customerId, currentOrderValue])

  const loadExposure = async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const res = await salesApi.fetchCustomerCreditExposure(customerId, currentOrderValue)
      if (res.code === 200 && res.data) {
        setExposure(res.data)
      }
    } catch (e) {
      console.error('Failed to load credit exposure', e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val?: number) => {
    const num = val || 0
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getUsagePercent = () => {
    if (!exposure || !exposure.creditLimit || exposure.creditLimit <= 0) return 0
    const pct = Math.round((exposure.effectiveCreditExposure / exposure.creditLimit) * 100)
    return Math.min(Math.max(pct, 0), 100)
  }

  const isBlocked = exposure?.creditLimitBreached || exposure?.hasOverdueInvoices

  return (
    <Drawer
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: '20px' }} />
          <span>Real-time Customer Credit Exposure & Overdue Risk Analysis</span>
        </Space>
      }
      placement="right"
      width={640}
      open={visible}
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {exposure ? (
          <div>
            {/* Status Alert Banner */}
            {isBlocked ? (
              <Alert
                message="Credit Limit or Overdue Policy Breach Detected"
                description={exposure.recommendedAction || 'Customer has exceeded credit limit or has overdue invoices beyond grace period.'}
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Alert
                message="Credit Standing: HEALTHY"
                description={exposure.recommendedAction || 'Customer exposure is within approved limits and invoices are within grace period.'}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Quick Metrics */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                  <Statistic
                    title={<Text type="secondary">Credit Limit</Text>}
                    value={exposure.creditLimit || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#389e0d', fontSize: '18px' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                  <Statistic
                    title={<Text type="secondary">Total Exposure</Text>}
                    value={exposure.effectiveCreditExposure || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#d46b08', fontSize: '18px' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  size="small"
                  style={{
                    background: (exposure.availableCredit || 0) < 0 ? '#fff1f0' : '#f0f5ff',
                    borderColor: (exposure.availableCredit || 0) < 0 ? '#ffa39e' : '#adc6ff',
                  }}
                >
                  <Statistic
                    title={<Text type="secondary">Available Credit</Text>}
                    value={exposure.availableCredit || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: (exposure.availableCredit || 0) < 0 ? '#cf1322' : '#1d39c4', fontSize: '18px' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Utilization Gauge */}
            <Card size="small" title="Credit Limit Utilization" style={{ marginBottom: 16 }}>
              <Progress
                percent={getUsagePercent()}
                status={getUsagePercent() > 90 ? 'exception' : getUsagePercent() > 75 ? 'active' : 'success'}
                strokeColor={getUsagePercent() > 90 ? '#ff4d4f' : getUsagePercent() > 75 ? '#faad14' : '#52c41a'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text type="secondary">Utilized: {formatCurrency(exposure.effectiveCreditExposure)}</Text>
                <Text type="secondary">Limit: {formatCurrency(exposure.creditLimit)}</Text>
              </div>
            </Card>

            {/* Mathematical Exposure Decomposition */}
            <Card size="small" title="Authoritative Exposure Formula Breakdown" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="(+) Open Receivables (Unpaid Invoices)">
                  <Text strong>{formatCurrency(exposure.openReceivables)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="(+) Approved Unbilled Orders">
                  <Text strong>{formatCurrency(exposure.unbilledApprovedOrders)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="(+) Current Order Value">
                  <Text strong style={{ color: '#1677ff' }}>
                    {formatCurrency(exposure.currentOrderValue)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="(-) Eligible Unallocated Advances">
                  <Text type="success">-{formatCurrency(exposure.eligibleAdvances)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="(-) Eligible Credit Notes">
                  <Text type="success">-{formatCurrency(exposure.eligibleCreditNotes)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="(=) Net Effective Exposure">
                  <Text strong style={{ fontSize: '16px', color: isBlocked ? '#cf1322' : '#389e0d' }}>
                    {formatCurrency(exposure.effectiveCreditExposure)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Overdue Risk Dimension */}
            <Card size="small" title="Overdue Aging Dimension (Not Double Counted)">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Payment Terms / Credit Days">
                  <Tag color="blue">{exposure.creditDays || 30} Days</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Overdue Grace Period">
                  <Tag color="cyan">{exposure.overdueGraceDays || 7} Days</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Max Overdue Days">
                  <Tag color={(exposure.maxOverdueDays || 0) > (exposure.overdueGraceDays || 7) ? 'red' : 'green'}>
                    {exposure.maxOverdueDays || 0} Days
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Overdue Invoices Count">
                  <Tag color={(exposure.overdueInvoiceCount || 0) > 0 ? 'volcano' : 'default'}>
                    {exposure.overdueInvoiceCount || 0} Invoices
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total Overdue Amount" span={2}>
                  <Text strong style={{ color: (exposure.overdueAmount || 0) > 0 ? '#cf1322' : '#595959' }}>
                    {formatCurrency(exposure.overdueAmount)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">No credit exposure information available</Text>
          </div>
        )}
      </Spin>
    </Drawer>
  )
}
