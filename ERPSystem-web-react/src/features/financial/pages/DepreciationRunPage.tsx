import React, { useEffect, useState } from 'react'
import {
  Card,
  Tabs,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Statistic,
  Space,
  Modal,
  Input,
  message,
  Alert,
  Drawer,
} from 'antd'
import {
  PlayCircleOutlined,
  EyeOutlined,
  RollbackOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  AssetDepreciationItemDTO,
  AssetDepreciationRunDTO,
  fixedAssetApi,
} from '../api/fixedAssetApi'

const MONTH_OPTIONS = [
  { label: 'January (01)', value: 1 },
  { label: 'February (02)', value: 2 },
  { label: 'March (03)', value: 3 },
  { label: 'April (04)', value: 4 },
  { label: 'May (05)', value: 5 },
  { label: 'June (06)', value: 6 },
  { label: 'July (07)', value: 7 },
  { label: 'August (08)', value: 8 },
  { label: 'September (09)', value: 9 },
  { label: 'October (10)', value: 10 },
  { label: 'November (11)', value: 11 },
  { label: 'December (12)', value: 12 },
]

export const DepreciationRunPage: React.FC = () => {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)

  // Simulation Preview state
  const [previewing, setPreviewing] = useState(false)
  const [previewItems, setPreviewItems] = useState<AssetDepreciationItemDTO[]>([])
  const [executing, setExecuting] = useState(false)

  // Past Runs state
  const [runsLoading, setRunsLoading] = useState(false)
  const [runs, setRuns] = useState<AssetDepreciationRunDTO[]>([])
  const [runsTotal, setRunsTotal] = useState(0)
  const [runsPage, setRunsPage] = useState(1)
  const [runsPageSize, setRunsPageSize] = useState(10)

  // Run detail drawer
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [drawerRun, setDrawerRun] = useState<AssetDepreciationRunDTO | null>(null)
  const [drawerItems, setDrawerItems] = useState<AssetDepreciationItemDTO[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Reversal modal
  const [reverseModalVisible, setReverseModalVisible] = useState(false)
  const [reversingRun, setReversingRun] = useState<AssetDepreciationRunDTO | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [reversing, setReversing] = useState(false)

  const previewTotalAmount = previewItems.reduce((sum, item) => sum + (Number(item.periodDepreciation) || 0), 0)

  useEffect(() => {
    loadRuns()
  }, [runsPage, runsPageSize])

  const handlePreview = async () => {
    try {
      setPreviewing(true)
      const res: any = await fixedAssetApi.previewDepreciation(selectedYear, selectedMonth)
      const data = Array.isArray(res) ? res : res?.data || []
      setPreviewItems(data)
      if (data.length === 0) {
        message.info('No active fixed assets requiring depreciation for the selected period.')
      } else {
        message.success(`Preview generated for ${data.length} assets.`)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to generate depreciation preview')
    } finally {
      setPreviewing(false)
    }
  }

  const handleExecute = () => {
    if (previewItems.length === 0) {
      message.warning('Please generate a preview first.')
      return
    }
    Modal.confirm({
      title: `Execute & Post Depreciation Batch for ${selectedYear}-${String(selectedMonth).padStart(2, '0')}?`,
      content: (
        <div>
          <p>Total Assets to Depreciate: <b>{previewItems.length}</b></p>
          <p>Total Depreciation Amount: <b>₹{previewTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></p>
          <p style={{ color: '#fa8c16' }}>
            This will append double-entry GL postings (Dr Depreciation Expense / Cr Accumulated Depreciation) and update asset carrying amounts.
          </p>
        </div>
      ),
      okText: 'Execute & Post GL',
      okType: 'primary',
      onOk: async () => {
        try {
          setExecuting(true)
          const run: any = await fixedAssetApi.executeDepreciation(selectedYear, selectedMonth)
          message.success('Depreciation run posted successfully to General Ledger!')
          setPreviewItems([])
          loadRuns()
        } catch (e: any) {
          message.error(e?.message || 'Execution failed')
        } finally {
          setExecuting(false)
        }
      },
    })
  }

  const loadRuns = async () => {
    try {
      setRunsLoading(true)
      const res: any = await fixedAssetApi.listDepreciationRuns({
        currentPage: runsPage,
        pageSize: runsPageSize,
      })
      const rows = res?.rows || res?.data?.rows || []
      const count = res?.total || res?.data?.total || 0
      setRuns(rows)
      setRunsTotal(count)
    } catch (e: any) {
      message.error(e?.message || 'Failed to load past runs')
    } finally {
      setRunsLoading(false)
    }
  }

  const handleViewRunDetails = async (run: AssetDepreciationRunDTO) => {
    try {
      setDrawerRun(run)
      setDrawerVisible(true)
      setDrawerLoading(true)
      const res: any = await fixedAssetApi.getDepreciationRunItems(run.id!)
      const data = Array.isArray(res) ? res : res?.data || []
      setDrawerItems(data)
    } catch (e: any) {
      message.error(e?.message || 'Failed to load run items')
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleOpenReverse = (run: AssetDepreciationRunDTO) => {
    setReversingRun(run)
    setReverseReason('')
    setReverseModalVisible(true)
  }

  const handleConfirmReverse = async () => {
    if (!reversingRun) return
    if (!reverseReason.trim()) {
      message.warning('Please provide a reason for reversal')
      return
    }
    try {
      setReversing(true)
      await fixedAssetApi.reverseDepreciation(reversingRun.id!, reverseReason)
      message.success(`Depreciation run ${reversingRun.runNumber} reversed and GL facts rolled back`)
      setReverseModalVisible(false)
      loadRuns()
    } catch (e: any) {
      message.error(e?.message || 'Reversal failed')
    } finally {
      setReversing(false)
    }
  }

  const previewColumns = [
    {
      title: 'Asset Tag',
      dataIndex: 'assetCode',
      key: 'assetCode',
      render: (code: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{code}</span>,
    },
    {
      title: 'Asset Description',
      dataIndex: 'assetName',
      key: 'assetName',
    },
    {
      title: 'Gross Cost (₹)',
      dataIndex: 'acquisitionCost',
      key: 'acquisitionCost',
      align: 'right' as const,
      render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Accum. Dep Before (₹)',
      dataIndex: 'accumulatedDepBefore',
      key: 'accumulatedDepBefore',
      align: 'right' as const,
      render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Days Charged',
      dataIndex: 'daysCalculated',
      key: 'daysCalculated',
      align: 'center' as const,
      render: (d: number) => <Tag color="blue">{d || 30} days</Tag>,
    },
    {
      title: 'Monthly Charge (₹)',
      dataIndex: 'periodDepreciation',
      key: 'periodDepreciation',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: '#fa8c16' }}>
          ₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'New Accum. Dep (₹)',
      dataIndex: 'accumulatedDepAfter',
      key: 'accumulatedDepAfter',
      align: 'right' as const,
      render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'New NBV (₹)',
      dataIndex: 'netBookValueAfter',
      key: 'netBookValueAfter',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: '#52c41a' }}>
          ₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ]

  const runsColumns = [
    {
      title: 'Run Number',
      dataIndex: 'runNumber',
      key: 'runNumber',
      render: (num: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{num}</span>,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, r: AssetDepreciationRunDTO) => `${r.runYear}-${String(r.runMonth).padStart(2, '0')}`,
    },
    {
      title: 'Execution Date',
      dataIndex: 'runDate',
      key: 'runDate',
      render: (d: string) => d ? d.substring(0, 10) : '-',
    },
    {
      title: 'Assets Depreciated',
      dataIndex: 'totalAssets',
      key: 'totalAssets',
      align: 'center' as const,
    },
    {
      title: 'Total Amount (₹)',
      dataIndex: 'totalDepreciationAmount',
      key: 'totalDepreciationAmount',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600 }}>
          ₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'GL Voucher',
      dataIndex: 'glEntryId',
      key: 'glEntryId',
      render: (id: number) => id ? <Tag color="geekblue">GL #{id}</Tag> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'POSTED' ? 'success' : 'error'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AssetDepreciationRunDTO) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewRunDetails(record)}>
            Items
          </Button>
          {record.status === 'POSTED' && (
            <Button
              type="link"
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleOpenReverse(record)}
            >
              Reverse
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Monthly Depreciation Management (Straight Line Method)"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/financial/fixed-assets')}>
            Back to Register
          </Button>
        }
      >
        <Tabs
          defaultActiveKey="cockpit"
          items={[
            {
              key: 'cockpit',
              label: 'Execution & Preview',
              children: (
                <div>
                  <Alert
                    message="Authoritative SLM Monthly Depreciation Batch"
                    description="Preview calculates actual pro-rata days and depreciation charges under the Straight Line Method (SLM) for all active capitalized fixed assets. Execution atomically posts balanced double-entry GL entries (Debit Depreciation Expense / Credit Accumulated Depreciation) and advances asset NBVs."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  {/* Period Selection & Actions */}
                  <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                    <Col span={4}>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>Fiscal Year</span>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        value={selectedYear}
                        onChange={(y) => setSelectedYear(y)}
                      >
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                          <Select.Option key={y} value={y}>
                            {y}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={5}>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>Depreciation Month</span>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        value={selectedMonth}
                        onChange={(m) => setSelectedMonth(m)}
                        options={MONTH_OPTIONS}
                      />
                    </Col>
                    <Col span={15} style={{ textAlign: 'right', paddingTop: 20 }}>
                      <Space>
                        <Button
                          icon={<EyeOutlined />}
                          onClick={handlePreview}
                          loading={previewing}
                        >
                          Simulate Preview
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={handleExecute}
                          loading={executing}
                          disabled={previewItems.length === 0}
                        >
                          Execute & Post GL Run
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  {/* Simulation Stats */}
                  {previewItems.length > 0 && (
                    <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                      <Row gutter={24}>
                        <Col span={8}>
                          <Statistic title="Qualifying Assets" value={previewItems.length} />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Total Periodic Depreciation Charge"
                            value={previewTotalAmount}
                            precision={2}
                            prefix="₹"
                            valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="GL Posting Status"
                            value="SIMULATION (UNPOSTED)"
                            valueStyle={{ color: '#1890ff', fontSize: 16 }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  )}

                  <Table
                    columns={previewColumns}
                    dataSource={previewItems}
                    rowKey="assetId"
                    loading={previewing}
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              ),
            },
            {
              key: 'history',
              label: 'Depreciation Run History',
              children: (
                <div>
                  <Row justify="end" style={{ marginBottom: 12 }}>
                    <Button icon={<ReloadOutlined />} onClick={loadRuns}>
                      Refresh History
                    </Button>
                  </Row>
                  <Table
                    columns={runsColumns}
                    dataSource={runs}
                    rowKey="id"
                    loading={runsLoading}
                    pagination={{
                      current: runsPage,
                      pageSize: runsPageSize,
                      total: runsTotal,
                      showSizeChanger: true,
                      onChange: (p, s) => {
                        setRunsPage(p)
                        setRunsPageSize(s)
                      },
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Run Items Drawer */}
      <Drawer
        title={`Depreciation Run Breakdown: ${drawerRun?.runNumber || ''}`}
        width={840}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Table
          columns={previewColumns}
          dataSource={drawerItems}
          rowKey="assetId"
          loading={drawerLoading}
          pagination={{ pageSize: 15 }}
        />
      </Drawer>

      {/* Reversal Confirmation Modal */}
      <Modal
        title={`Reverse Depreciation Run: ${reversingRun?.runNumber}?`}
        open={reverseModalVisible}
        onCancel={() => setReverseModalVisible(false)}
        onOk={handleConfirmReverse}
        confirmLoading={reversing}
        okText="Confirm & Post Reversal GL"
        okType="danger"
      >
        <Alert
          message="Reversal Audit Safeguard"
          description="Reversing this run will append compensating reversal GL facts to reverse the depreciation expense, and roll back each asset's accumulated depreciation and net book value snapshot."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 8 }}>Reason for Reversal:</div>
        <Input.TextArea
          rows={3}
          value={reverseReason}
          onChange={(e) => setReverseReason(e.target.value)}
          placeholder="e.g. Incorrect asset capitalization date corrected; re-running batch..."
        />
      </Modal>
    </div>
  )
}
