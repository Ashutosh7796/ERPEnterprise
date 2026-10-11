import React, { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Statistic,
  message,
} from 'antd'
import {
  SyncOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { getMsmeAgingReport, MsmeAgingItem } from '../api/procurementApi'

const { Text, Title } = Typography

export const MsmeAgingReportPage: React.FC = () => {
  const [items, setItems] = useState<MsmeAgingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [msmeTypeFilter, setMsmeTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const fetchAgingData = async () => {
    try {
      setLoading(true)
      const res = await getMsmeAgingReport({
        currentPage,
        pageSize,
        msmeType: msmeTypeFilter || undefined,
        complianceStatus: statusFilter || undefined,
      })
      if (res.data && res.data.code === 200) {
        setItems(res.data.data.rows || [])
        setTotal(res.data.data.total || 0)
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to load MSME aging report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgingData()
  }, [currentPage, pageSize, msmeTypeFilter, statusFilter])

  const totalOverdueAtRisk = items
    .filter((i) => i.complianceStatus === 'OVERDUE_AT_RISK')
    .reduce((sum, i) => sum + (Number(i.remainingOpenAmount) || 0), 0)

  const totalDisallowed = items
    .filter((i) => i.complianceStatus === 'DISALLOWED_43BH')
    .reduce((sum, i) => sum + (Number(i.remainingOpenAmount) || 0), 0)

  const totalPenalInterest = items.reduce(
    (sum, i) => sum + (Number(i.penalInterestAccrued) || 0),
    0
  )

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT_PAID':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Compliant Paid
          </Tag>
        )
      case 'WITHIN_LIMIT':
        return (
          <Tag color="processing" icon={<ClockCircleOutlined />}>
            Within Limit
          </Tag>
        )
      case 'OVERDUE_AT_RISK':
        return (
          <Tag color="warning" icon={<AlertOutlined />}>
            Overdue (43B-h Risk)
          </Tag>
        )
      case 'DISALLOWED_43BH':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Disallowed 43B(h)
          </Tag>
        )
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Supplier & Category',
      key: 'supplier',
      render: (_: any, record: MsmeAgingItem) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.supplierName || 'Supplier'}</Text>
          <Space>
            <Tag color={record.msmeType === 'MICRO' ? 'magenta' : record.msmeType === 'SMALL' ? 'volcano' : 'default'}>
              {record.msmeType}
            </Tag>
            {record.udyamRegistrationNumber && (
              <Text type="secondary" style={{ fontSize: 11 }}>{record.udyamRegistrationNumber}</Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Invoice / Acceptance',
      key: 'dates',
      render: (_: any, record: MsmeAgingItem) => (
        <Space direction="vertical" size={1}>
          <Text style={{ fontSize: 12 }}>Inv: {record.invoiceDate ? record.invoiceDate.substring(0, 10) : '-'}</Text>
          <Text style={{ fontSize: 12 }} type="secondary">
            Acc: {record.acceptanceDate ? record.acceptanceDate.substring(0, 10) : '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Statutory Due Date',
      key: 'dueDate',
      render: (_: any, record: MsmeAgingItem) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: record.daysOverdue > 0 ? '#ff4d4f' : '#262626' }}>
            {record.statutoryDueDate ? record.statutoryDueDate.substring(0, 10) : '-'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Terms: {record.agreedCreditDays}d (Cap: 45d)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Days Overdue',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger" strong>
            {val} Days Overdue
          </Text>
        ) : (
          <Text type="success">0 (Current)</Text>
        ),
    },
    {
      title: 'Open Amount (₹)',
      dataIndex: 'remainingOpenAmount',
      key: 'remainingOpenAmount',
      render: (val: number) => `₹${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '43B(h) Risk Status',
      dataIndex: 'complianceStatus',
      key: 'complianceStatus',
      render: (status: string) => renderStatusBadge(status),
    },
    {
      title: 'Sec 16 Interest (₹)',
      dataIndex: 'penalInterestAccrued',
      key: 'penalInterestAccrued',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger" strong>
            ₹{(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        ) : (
          '₹0.00'
        ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              MSME Supplier Aging & Payment Schedule
            </Title>
            <Text type="secondary">
              Monitor supplier payment timelines, MSME payment status, and statutory compliance aging.
            </Text>
          </Col>
          <Col>
            <Button icon={<SyncOutlined />} onClick={fetchAgingData}>
              Refresh Schedule
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Overdue Risk Amount"
                value={totalOverdueAtRisk}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Disallowed 43B(h) Amount"
                value={totalDisallowed}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Penal Interest"
                value={totalPenalInterest}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Monitored Invoices"
                value={total}
                prefix={<AlertOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Enterprise Category"
              allowClear
              value={msmeTypeFilter || undefined}
              onChange={(val) => setMsmeTypeFilter(val || '')}
              style={{ width: '100%' }}
              options={[
                { label: 'Micro Enterprise (Protected)', value: 'MICRO' },
                { label: 'Small Enterprise (Protected)', value: 'SMALL' },
                { label: 'Medium Enterprise (Excluded)', value: 'MEDIUM' },
                { label: 'Trader (Excluded per OM)', value: 'TRADER' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Compliance Status"
              allowClear
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              style={{ width: '100%' }}
              options={[
                { label: 'Compliant Paid', value: 'COMPLIANT_PAID' },
                { label: 'Within Limit', value: 'WITHIN_LIMIT' },
                { label: 'Overdue (At Risk)', value: 'OVERDUE_AT_RISK' },
                { label: 'Disallowed 43B(h)', value: 'DISALLOWED_43BH' },
              ]}
            />
          </Col>
        </Row>

        <Table
          dataSource={items}
          columns={columns}
          rowKey="invoiceId"
          loading={loading}
          scroll={{ x: 1300 }}
          size="middle"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            onChange: (p, ps) => {
              setCurrentPage(p)
              setPageSize(ps)
            },
          }}
          bordered
        />
      </Card>
    </div>
  )
}
