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
  Select,
  Input,
  Statistic,
  message,
  Pagination,
} from 'antd'
import {
  AuditOutlined,
  ReloadOutlined,
  SearchOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSearchParams } from 'react-router-dom'
import {
  financialStatementApi,
  GlAuditTrailReport,
  GlAuditTrailItem,
} from '../api/financialStatementApi'
import { journalVoucherApi, AccountCoaSummary } from '../api/journalVoucherApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export const GlAuditTrailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialAccountId = searchParams.get('accountId')

  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountCoaSummary[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(
    initialAccountId ? Number(initialAccountId) : undefined
  )
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ])
  const [voucherType, setVoucherType] = useState<string | undefined>()
  const [voucherNumber, setVoucherNumber] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [report, setReport] = useState<GlAuditTrailReport | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async (keyword?: string) => {
    try {
      const res: any = await journalVoucherApi.searchAccounts(keyword)
      const data = Array.isArray(res) ? res : (res?.data || [])
      if (Array.isArray(data)) {
        setAccounts(data)
        if (!selectedAccountId && data.length > 0 && !initialAccountId) {
          setSelectedAccountId(data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load accounts for GL audit trail', err)
    }
  }

  const loadAuditTrail = async () => {
    if (!selectedAccountId) return
    try {
      setLoading(true)
      const res: any = await financialStatementApi.getGlAuditTrail({
        accountId: selectedAccountId,
        voucherType,
        voucherNumber: voucherNumber || undefined,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        currentPage,
        pageSize,
      })

      const data = res?.entries ? res : (res?.data?.entries ? res.data : res?.data || res)
      if (data && Array.isArray(data.entries)) {
        setReport(data)
      } else {
        setReport(null)
      }
    } catch (err: any) {
      console.error('Failed to load GL Audit Trail', err)
      message.error(err?.message || 'Failed to load GL Audit Trail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditTrail()
  }, [selectedAccountId, dateRange, voucherType, currentPage, pageSize])

  const columns = [
    {
      title: 'Posting Date',
      dataIndex: 'postingDate',
      key: 'postingDate',
      width: 115,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Voucher Type',
      dataIndex: 'voucherType',
      key: 'voucherType',
      width: 140,
      render: (type: string) => {
        let color = 'blue'
        if (type?.includes('REVERSAL')) color = 'volcano'
        else if (type?.includes('SALES')) color = 'green'
        else if (type?.includes('PURCHASE')) color = 'orange'
        else if (type?.includes('CONTRA')) color = 'cyan'
        return <Tag color={color}>{type || 'GL_ENTRY'}</Tag>
      },
    },
    {
      title: 'Voucher No',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 160,
      render: (no: string, r: GlAuditTrailItem) => (
        <Space size="small">
          <Text copyable style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {no}
          </Text>
          {r.reversalOfId && <Tag color="error">REV</Tag>}
        </Space>
      ),
    },
    {
      title: 'Narration / Description',
      dataIndex: 'narration',
      key: 'narration',
      minWidth: 200,
      render: (n: string) => n || '-',
    },
    {
      title: 'Party',
      dataIndex: 'partyName',
      key: 'partyName',
      width: 160,
      render: (name: string, r: GlAuditTrailItem) =>
        name ? (
          <Space size="small">
            <Tag color="geekblue">{r.partyType}</Tag>
            <Text>{name}</Text>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      width: 130,
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>
            {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      width: 130,
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>
            {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Running Balance (₹)',
      dataIndex: 'runningBalance',
      key: 'runningBalance',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ fontFamily: 'monospace', color: val >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 13 }}>
          {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Header Controls */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Space align="center" size="middle">
              <AuditOutlined style={{ fontSize: 28, color: '#722ed1', backgroundColor: '#f9f0ff', padding: 8, borderRadius: 6 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  General Ledger Audit Trail
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Continuous chronological ledger drill-down with running balance continuity
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={16}>
            <Row gutter={[8, 8]} justify="end">
              <Col xs={24} sm={12} md={7}>
                <Select
                  showSearch
                  placeholder="Select Account Head"
                  value={selectedAccountId}
                  onChange={(val) => {
                    setSelectedAccountId(val)
                    setCurrentPage(1)
                  }}
                  onSearch={(v) => loadAccounts(v)}
                  filterOption={false}
                  style={{ width: '100%' }}
                  options={accounts.map((a) => ({
                    label: `${a.accountCode} - ${a.accountName}`,
                    value: a.id,
                  }))}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dates[0], dates[1]])
                      setCurrentPage(1)
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={16} sm={16} md={5}>
                <Input
                  placeholder="Voucher No..."
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  onPressEnter={() => {
                    setCurrentPage(1)
                    loadAuditTrail()
                  }}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>
              <Col xs={8} sm={8} md={4}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setCurrentPage(1)
                    loadAuditTrail()
                  }}
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  Search
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* KPI Metrics Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Page Opening Balance"
              value={report?.openingBalance || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#595959', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Period Debits"
              value={report?.totalDebit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Period Credits"
              value={report?.totalCredit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#722ed1', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Closing Balance"
              value={report?.closingBalance || 0}
              precision={2}
              prefix="₹"
              valueStyle={{
                color: (report?.closingBalance || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Entries Table */}
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={report?.entries || []}
          columns={columns as any}
          rowKey="id"
          pagination={false}
          loading={loading}
          size="small"
          scroll={{ x: 1000 }}
          bordered
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={report?.totalCount || 0}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
            onChange={(page, pSize) => {
              setCurrentPage(page)
              setPageSize(pSize)
            }}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} ledger entries`}
          />
        </div>
      </Card>
    </div>
  )
}
export default GlAuditTrailPage
