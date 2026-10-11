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
  Checkbox,
  Statistic,
  message,
  Tooltip,
} from 'antd'
import {
  FileTextOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapRightOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  financialStatementApi,
  TrialBalanceReport,
  TrialBalanceItem,
} from '../api/financialStatementApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export const TrialBalancePage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ])
  const [hideZero, setHideZero] = useState(false)
  const [report, setReport] = useState<TrialBalanceReport | null>(null)

  const loadReport = async () => {
    try {
      setLoading(true)
      const res: any = await financialStatementApi.getTrialBalance({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        hideZeroBalance: hideZero,
      })

      const data = res?.items ? res : (res?.data?.items ? res.data : res?.data || res)
      if (data && Array.isArray(data.items)) {
        setReport(data)
      } else {
        setReport(null)
      }
    } catch (err: any) {
      console.error('Failed to load Trial Balance', err)
      message.error(err?.message || 'Failed to load Trial Balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [dateRange, hideZero])

  const columns = [
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 140,
      render: (code: string, record: TrialBalanceItem) => (
        <Space size="small">
          <Text strong={record.isGroup === '1'} style={{ fontFamily: 'monospace', color: record.isGroup === '1' ? '#0958d9' : '#262626' }}>
            {code}
          </Text>
          {record.isGroup === '1' && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>GROUP</Tag>}
        </Space>
      ),
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
      minWidth: 220,
      render: (name: string, record: TrialBalanceItem) => (
        <Space size="small">
          <Text
            strong={record.isGroup === '1'}
            style={{
              color: record.isGroup === '1' ? '#1890ff' : undefined,
              fontSize: record.isGroup === '1' ? 14 : 13,
            }}
          >
            {name}
          </Text>
          {record.isGroup === '0' && (
            <Tooltip title="View General Ledger Audit Trail">
              <Button
                type="link"
                size="small"
                icon={<SwapRightOutlined />}
                style={{ padding: 0 }}
                onClick={() =>
                  navigate(`/financial/reports/gl_audit_trail?accountId=${record.accountId}&accountCode=${record.accountCode}`)
                }
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'rootType',
      key: 'rootType',
      width: 110,
      render: (type: string) => {
        const color =
          type === 'ASSET'
            ? 'blue'
            : type === 'LIABILITY'
            ? 'orange'
            : type === 'INCOME'
            ? 'green'
            : type === 'EXPENSE'
            ? 'magenta'
            : 'purple'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: 'Opening Balance (₹)',
      children: [
        {
          title: 'Debit',
          dataIndex: 'openingDebit',
          key: 'openingDebit',
          width: 125,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong={r.isGroup === '1'} style={{ fontFamily: 'monospace' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
        {
          title: 'Credit',
          dataIndex: 'openingCredit',
          key: 'openingCredit',
          width: 125,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong={r.isGroup === '1'} style={{ fontFamily: 'monospace' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
      ],
    },
    {
      title: 'Period Movement (₹)',
      children: [
        {
          title: 'Debit',
          dataIndex: 'periodDebit',
          key: 'periodDebit',
          width: 125,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong={r.isGroup === '1'} style={{ fontFamily: 'monospace', color: '#1890ff' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
        {
          title: 'Credit',
          dataIndex: 'periodCredit',
          key: 'periodCredit',
          width: 125,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong={r.isGroup === '1'} style={{ fontFamily: 'monospace', color: '#722ed1' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
      ],
    },
    {
      title: 'Closing Balance (₹)',
      children: [
        {
          title: 'Debit',
          dataIndex: 'closingDebit',
          key: 'closingDebit',
          width: 135,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong style={{ fontFamily: 'monospace', color: '#52c41a' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
        {
          title: 'Credit',
          dataIndex: 'closingCredit',
          key: 'closingCredit',
          width: 135,
          align: 'right' as const,
          render: (val: number, r: TrialBalanceItem) =>
            val > 0 ? (
              <Text strong style={{ fontFamily: 'monospace', color: '#eb2f96' }}>
                {Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
      ],
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Header Bar */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Space align="center" size="middle">
              <FileTextOutlined style={{ fontSize: 28, color: '#1890ff', backgroundColor: '#e6f7ff', padding: 8, borderRadius: 6 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pure-GL Trial Balance
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Statutory Double-Entry Trial Balance aggregated from immutable General Ledger entries
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={12}>
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
              <Checkbox checked={hideZero} onChange={(e) => setHideZero(e.target.checked)}>
                Hide Zero Balances
              </Checkbox>
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
              title="Total Opening Volume"
              value={report?.totalOpeningDebit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#595959', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Period Movement"
              value={report?.totalPeriodDebit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff', fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Closing Balance"
              value={report?.totalClosingDebit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a', fontFamily: 'monospace', fontWeight: 600 }}
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
                  BALANCED (Dr == Cr)
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

      {/* Main Table */}
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={report?.items || []}
          columns={columns as any}
          rowKey="accountId"
          pagination={false}
          loading={loading}
          size="small"
          scroll={{ x: 1000 }}
          bordered
          rowClassName={(record) => (record.isGroup === '1' ? 'tb-group-row' : '')}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={3} align="right">
                  <Text strong>Grand Total (Authoritative Leaf Facts Only):</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>
                    {report?.totalOpeningDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>
                    {report?.totalOpeningCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>
                    {report?.totalPeriodDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>
                    {report?.totalPeriodCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#52c41a' }}>
                    {report?.totalClosingDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#eb2f96' }}>
                    {report?.totalClosingCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  )
}
export default TrialBalancePage
