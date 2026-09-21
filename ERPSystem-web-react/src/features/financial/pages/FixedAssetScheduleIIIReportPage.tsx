import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Table,
  Tag,
  Alert,
  Statistic,
  Space,
  Divider,
  message,
} from 'antd'
import {
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  ScheduleIIPpeClassRowDTO,
  ScheduleIIPpeReportDTO,
  fixedAssetApi,
} from '../api/fixedAssetApi'

const { RangePicker } = DatePicker

export const FixedAssetScheduleIIIReportPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ScheduleIIPpeReportDTO | null>(null)

  // Default date range: Current Indian Financial Year (April 1 to today)
  const now = dayjs()
  const currentYear = now.year()
  const currentMonth = now.month() // 0-based, April is 3
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear
  const defaultStart = dayjs(`${fyStartYear}-04-01`)
  const defaultEnd = now

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd])

  const loadReport = useCallback(async () => {
    try {
      setLoading(true)
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      const res: any = await fixedAssetApi.getScheduleIIPpe(startDate, endDate)
      const data = res?.data || res
      setReport(data)
    } catch (e: any) {
      message.error(e?.message || 'Failed to generate Schedule III statement')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleExportCsv = () => {
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate = dateRange[1].format('YYYY-MM-DD')
    const params = new URLSearchParams({ startDate, endDate })
    window.open(`/api/fixedAsset/report/export-schedule-iii-csv?${params.toString()}`, '_blank')
  }

  const columns: any = [
    {
      title: 'Class',
      dataIndex: 'classCode',
      key: 'classCode',
      fixed: 'left',
      width: 100,
      render: (code: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{code}</span>,
    },
    {
      title: 'Schedule II Classification',
      dataIndex: 'className',
      key: 'className',
      fixed: 'left',
      width: 180,
      render: (name: string, r: ScheduleIIPpeClassRowDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.scheduleIICategory}</div>
        </div>
      ),
    },
    {
      title: 'Gross Carrying Amount (Gross Block)',
      children: [
        {
          title: 'Opening Block',
          dataIndex: 'openingGrossBlock',
          key: 'openingGrossBlock',
          align: 'right',
          render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        },
        {
          title: 'Additions',
          dataIndex: 'additions',
          key: 'additions',
          align: 'right',
          render: (v: number) => (
            <span style={{ color: Number(v) > 0 ? '#52c41a' : undefined }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
        {
          title: 'Deductions',
          dataIndex: 'deductions',
          key: 'deductions',
          align: 'right',
          render: (v: number) => (
            <span style={{ color: Number(v) > 0 ? '#f5222d' : undefined }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
        {
          title: 'Closing Block',
          dataIndex: 'closingGrossBlock',
          key: 'closingGrossBlock',
          align: 'right',
          render: (v: number) => (
            <span style={{ fontWeight: 600 }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
      ],
    },
    {
      title: 'Accumulated Depreciation Block',
      children: [
        {
          title: 'Opening Accum',
          dataIndex: 'openingAccumulatedDep',
          key: 'openingAccumulatedDep',
          align: 'right',
          render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        },
        {
          title: 'Period Charge',
          dataIndex: 'periodDepreciation',
          key: 'periodDepreciation',
          align: 'right',
          render: (v: number) => (
            <span style={{ color: '#fa8c16' }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
        {
          title: 'On Disposals',
          dataIndex: 'deductionsOnDisposal',
          key: 'deductionsOnDisposal',
          align: 'right',
          render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        },
        {
          title: 'Closing Accum',
          dataIndex: 'closingAccumulatedDep',
          key: 'closingAccumulatedDep',
          align: 'right',
          render: (v: number) => (
            <span style={{ fontWeight: 600, color: '#fa8c16' }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
      ],
    },
    {
      title: 'Net Carrying Amount (Net Block)',
      children: [
        {
          title: 'Opening Net',
          dataIndex: 'openingNetBlock',
          key: 'openingNetBlock',
          align: 'right',
          render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        },
        {
          title: 'Closing Net Block',
          dataIndex: 'closingNetBlock',
          key: 'closingNetBlock',
          align: 'right',
          render: (v: number) => (
            <span style={{ fontWeight: 700, color: '#52c41a' }}>
              {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ),
        },
      ],
    },
  ]

  const isReconciled = report?.reconciliationStatus === 'RECONCILED'

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Companies Act 2013 - Schedule III Property, Plant & Equipment (PPE) Movement"
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/financial/fixed-assets')}>
              Back to Register
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              Export Statement CSV
            </Button>
          </Space>
        }
      >
        {/* Date Filter Bar */}
        <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
          <Col span={10}>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Disclosure Period (Financial Year)</span>
            <RangePicker
              style={{ width: '100%', marginTop: 4 }}
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]])
                }
              }}
              allowClear={false}
            />
          </Col>
          <Col span={14} style={{ textAlign: 'right', paddingTop: 20 }}>
            <Button icon={<ReloadOutlined />} onClick={loadReport} loading={loading}>
              Generate Statement
            </Button>
          </Col>
        </Row>

        {/* Balance Sheet Invariant Reconciliation Card */}
        {report && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: isReconciled ? '#f6ffed' : '#fff1f0',
              borderColor: isReconciled ? '#b7eb8f' : '#ffa39e',
            }}
          >
            <Row gutter={24} align="middle">
              <Col span={6}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {isReconciled ? (
                    <span style={{ color: '#52c41a' }}>
                      <CheckCircleOutlined style={{ marginRight: 6 }} />
                      GL & Statement Reconciled
                    </span>
                  ) : (
                    <span style={{ color: '#f5222d' }}>
                      <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                      Reconciliation Variance Detected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                  Against General Ledger Balance Sheet (SCH-08 / SCH-08A)
                </div>
              </Col>

              <Col span={6}>
                <Statistic
                  title="Closing Gross Block vs BS SCH-08"
                  value={report.totals?.closingGrossBlock || 0}
                  precision={2}
                  prefix="₹"
                  suffix={
                    <span style={{ fontSize: 11, color: report.grossVariance === 0 ? '#52c41a' : '#f5222d' }}>
                      ({report.grossVariance === 0 ? 'Exact' : `Var: ₹${report.grossVariance}`})
                    </span>
                  }
                />
              </Col>

              <Col span={6}>
                <Statistic
                  title="Closing Accum Dep vs BS SCH-08A"
                  value={report.totals?.closingAccumulatedDep || 0}
                  precision={2}
                  prefix="₹"
                  suffix={
                    <span style={{ fontSize: 11, color: report.accumDepVariance === 0 ? '#52c41a' : '#f5222d' }}>
                      ({report.accumDepVariance === 0 ? 'Exact' : `Var: ₹${report.accumDepVariance}`})
                    </span>
                  }
                />
              </Col>

              <Col span={6}>
                <Statistic
                  title="Closing Net Block vs BS Net PPE"
                  value={report.totals?.closingNetBlock || 0}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                  suffix={
                    <span style={{ fontSize: 11, color: report.netVariance === 0 ? '#52c41a' : '#f5222d' }}>
                      ({report.netVariance === 0 ? 'Exact' : `Var: ₹${report.netVariance}`})
                    </span>
                  }
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Schedule III Disclosure Table */}
        <Table
          columns={columns}
          dataSource={report?.rows || []}
          rowKey="classCode"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          summary={() => {
            const t = report?.totals
            if (!t) return null
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>All Asset Classes</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    {Number(t.openingGrossBlock || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    {Number(t.additions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {Number(t.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {Number(t.closingGrossBlock || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    {Number(t.openingAccumulatedDep || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    {Number(t.periodDepreciation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    {Number(t.deductionsOnDisposal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    {Number(t.closingAccumulatedDep || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">
                    {Number(t.openingNetBlock || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11} align="right">
                    <span style={{ color: '#52c41a' }}>
                      {Number(t.closingNetBlock || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
        />
      </Card>
    </div>
  )
}
