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
  FileDoneOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { getTdsRegisterRecords, TdsRegisterItem } from '../api/procurementApi'

const { Text, Title } = Typography

export const TdsRegisterReportPage: React.FC = () => {
  const [records, setRecords] = useState<TdsRegisterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [lawVersionFilter, setLawVersionFilter] = useState<string>('')
  const [reportingFormFilter, setReportingFormFilter] = useState<string>('')
  const [supplierNameFilter, setSupplierNameFilter] = useState<string>('')

  const fetchTdsRecords = async () => {
    try {
      setLoading(true)
      const res = await getTdsRegisterRecords({
        currentPage,
        pageSize,
        lawVersion: lawVersionFilter || undefined,
        reportingForm: reportingFormFilter || undefined,
        supplierName: supplierNameFilter || undefined,
      })
      if (res.data && res.data.code === 200) {
        setRecords(res.data.data.rows || [])
        setTotal(res.data.data.total || 0)
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to load TDS register')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTdsRecords()
  }, [currentPage, pageSize, lawVersionFilter, reportingFormFilter, supplierNameFilter])

  const totalTdsAmount = records.reduce((sum, r) => sum + (Number(r.tdsAmount) || 0), 0)
  const totalTaxableBase = records.reduce((sum, r) => sum + (Number(r.taxableBaseAmount) || 0), 0)

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (val: string) => (val ? val.substring(0, 10) : '-'),
    },
    {
      title: 'Supplier & PAN',
      key: 'supplier',
      render: (_: any, record: TdsRegisterItem) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.supplierName || 'Supplier'}</Text>
          <Space>
            <Tag color={record.isPanValid ? 'blue' : 'error'}>
              {record.pan || 'NO PAN'}
            </Tag>
            {!record.isPanValid && <Tag color="red">Higher Rate Sec 397(2)/206AA</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Source Document',
      key: 'sourceDoc',
      render: (_: any, record: TdsRegisterItem) => (
        <Space direction="vertical" size={1}>
          <Text>{record.sourceDocumentNumber}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.sourceDocumentType}</Text>
        </Space>
      ),
    },
    {
      title: 'Taxable Base (₹)',
      dataIndex: 'taxableBaseAmount',
      key: 'taxableBaseAmount',
      render: (val: number) => `₹${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'TDS Rate',
      dataIndex: 'tdsRate',
      key: 'tdsRate',
      render: (val: number) => `${((Number(val) || 0) * 100).toFixed(2)}%`,
    },
    {
      title: 'TDS Withheld (₹)',
      dataIndex: 'tdsAmount',
      key: 'tdsAmount',
      render: (val: number) => (
        <Text strong style={{ color: '#fa8c16', fontSize: 15 }}>
          ₹{(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Statutory Law Reference',
      key: 'lawRef',
      render: (_: any, record: TdsRegisterItem) => (
        <Space direction="vertical" size={2}>
          {record.lawVersion === 'INCOME_TAX_ACT_1961' ? (
            <Tag color="cyan">Income-tax Act, 1961</Tag>
          ) : (
            <Tag color="purple">Income-tax Act, 2025</Tag>
          )}
          <Text style={{ fontSize: 12 }}>{record.provisionDisplayName}</Text>
        </Space>
      ),
    },
    {
      title: 'Reporting Return',
      key: 'returnForm',
      render: (_: any, record: TdsRegisterItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.reportingForm === 'FORM_26Q' ? 'green' : 'geekblue'}>
            {record.reportingForm}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>Code: {record.reportingCode}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="success">{status || 'DEDUCTED'}</Tag>,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              TDS Deductions Register
            </Title>
            <Text type="secondary">
              Tax deducted at source audit trail, withholding rates, and statutory return schedules.
            </Text>
          </Col>
          <Col>
            <Button icon={<SyncOutlined />} onClick={fetchTdsRecords}>
              Refresh Register
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Taxable Base"
                value={totalTaxableBase}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total TDS Withheld"
                value={totalTdsAmount}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Active Deductions Count"
                value={total}
                prefix={<AuditOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Section Threshold"
                value={5000000}
                precision={0}
                prefix="₹"
                suffix="(₹50L)"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filter by Governing Regime"
              allowClear
              value={lawVersionFilter || undefined}
              onChange={(val) => setLawVersionFilter(val || '')}
              style={{ width: '100%' }}
              options={[
                { label: 'Income Tax Act, 1961', value: 'INCOME_TAX_ACT_1961' },
                { label: 'Income Tax Act, 2025', value: 'INCOME_TAX_ACT_2025' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filter by Reporting Return"
              allowClear
              value={reportingFormFilter || undefined}
              onChange={(val) => setReportingFormFilter(val || '')}
              style={{ width: '100%' }}
              options={[
                { label: 'Form 26Q (Quarterly Statement)', value: 'FORM_26Q' },
                { label: 'Form 140 (Quarterly Return)', value: 'FORM_140' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by Supplier Name"
              allowClear
              value={supplierNameFilter}
              onChange={(e) => setSupplierNameFilter(e.target.value)}
            />
          </Col>
        </Row>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
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
