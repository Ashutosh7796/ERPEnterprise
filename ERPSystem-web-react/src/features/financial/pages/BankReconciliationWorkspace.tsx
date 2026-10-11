import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Tabs,
  Badge,
  Modal,
  Form,
  Input,
  message,
  Alert,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  DisconnectOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import {
  bankReconciliationApi,
  ReconciliationSummary,
  BankStatementItem,
  GlCandidateItem,
  MatchDetailItem,
} from '../api/bankReconciliationApi'
import { BankAdjustmentModal } from '../components/BankAdjustmentModal'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export const BankReconciliationWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessionId = Number(id)

  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null)
  const [statementLines, setStatementLines] = useState<BankStatementItem[]>([])
  const [glCandidates, setGlCandidates] = useState<GlCandidateItem[]>([])
  const [matches, setMatches] = useState<MatchDetailItem[]>([])

  // Selections for Manual Match
  const [selectedStmtKeys, setSelectedStmtKeys] = useState<React.Key[]>([])
  const [selectedGlKeys, setSelectedGlKeys] = useState<React.Key[]>([])

  // Modals
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)
  const [selectedStmtLineForAdjust, setSelectedStmtLineForAdjust] = useState<BankStatementItem | null>(null)

  const [reopenModalVisible, setReopenModalVisible] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  const loadWorkspace = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const [sumRes, linesRes, glRes, matchRes] = await Promise.all([
        bankReconciliationApi.getSession(sessionId),
        bankReconciliationApi.getStatementLines(sessionId),
        bankReconciliationApi.getGlCandidates(sessionId),
        bankReconciliationApi.getMatches(sessionId),
      ])

      setSummary((sumRes as any).data || sumRes)
      setStatementLines((linesRes as any).data || [])
      setGlCandidates((glRes as any).data || [])
      setMatches((matchRes as any).data || [])
      setSelectedStmtKeys([])
      setSelectedGlKeys([])
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Failed to load workspace data')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const handleAutoMatch = async () => {
    try {
      setLoading(true)
      const res = await bankReconciliationApi.autoMatch(sessionId)
      const data = (res as any).data || res
      message.success(
        `Auto-match finished: ${data.exactMatchesCount} exact matches, ${data.ruleMatchesCount} rule matches!`
      )
      loadWorkspace()
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Auto-match failed')
      setLoading(false)
    }
  }

  const handleManualMatch = async () => {
    if (selectedStmtKeys.length === 0 || selectedGlKeys.length === 0) {
      message.warning('Please select at least 1 statement line and 1 GL entry')
      return
    }

    try {
      setLoading(true)
      await bankReconciliationApi.manualMatch(sessionId, {
        sessionId,
        statementLineIds: selectedStmtKeys.map((k) => Number(k)),
        glEntryIds: selectedGlKeys.map((k) => Number(k)),
      })
      message.success('Manual match created successfully!')
      loadWorkspace()
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Manual match failed')
      setLoading(false)
    }
  }

  const handleUnmatch = async (matchId: number) => {
    try {
      setLoading(true)
      await bankReconciliationApi.unmatch(sessionId, {
        sessionId,
        matchIds: [matchId],
      })
      message.success('Unmatched record successfully')
      loadWorkspace()
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Failed to unmatch')
      setLoading(false)
    }
  }

  const handleFinalize = async () => {
    try {
      setLoading(true)
      const res = await bankReconciliationApi.finalizeSession(sessionId)
      message.success('Reconciliation Session FINALIZED successfully!')
      setSummary((res as any).data || res)
      loadWorkspace()
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Finalization failed')
      setLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      message.warning('Please enter a reopening reason')
      return
    }

    try {
      setLoading(true)
      await bankReconciliationApi.reopenSession(sessionId, {
        sessionId,
        reopenReason,
      })
      message.success('Session REOPENED successfully')
      setReopenModalVisible(false)
      setReopenReason('')
      loadWorkspace()
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Failed to reopen')
      setLoading(false)
    }
  }

  const isFinalized = summary?.status === 'FINALIZED'
  const isZeroVariance = summary?.reconciledDifference === 0

  // Filter unmatched lists
  const unmatchedStmtLines = statementLines.filter(
    (l) => l.matchStatus === 'UNMATCHED' || l.matchStatus === 'AMBIGUOUS'
  )
  const unmatchedGlEntries = glCandidates.filter((g) => !g.matched)

  // Calculations for selection bar
  const selectedStmtSum = statementLines
    .filter((l) => selectedStmtKeys.includes(l.id))
    .reduce((sum, l) => sum + (l.credit - l.debit), 0)

  const selectedGlSum = glCandidates
    .filter((g) => selectedGlKeys.includes(g.glEntryId))
    .reduce((sum, g) => sum + (g.debit - g.credit), 0)

  const selectionDiff = Math.abs(selectedStmtSum - selectedGlSum)

  const stmtColumns = [
    {
      title: 'Date',
      dataIndex: 'transDate',
      key: 'transDate',
      width: 100,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '',
    },
    {
      title: 'Ref / UTR',
      dataIndex: 'refNo',
      key: 'refNo',
      width: 120,
      render: (val: string) => val || '-',
    },
    {
      title: 'Narration',
      dataIndex: 'narration',
      key: 'narration',
      ellipsis: true,
    },
    {
      title: 'Deposit (+)',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      width: 110,
      render: (val: number) => (val > 0 ? <Text type="success">₹{val.toFixed(2)}</Text> : '-'),
    },
    {
      title: 'Withdrawal (-)',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      width: 110,
      render: (val: number) => (val > 0 ? <Text type="danger">₹{val.toFixed(2)}</Text> : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'matchStatus',
      key: 'matchStatus',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'AMBIGUOUS' ? 'orange' : 'default'}>{val}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: BankStatementItem) => (
        <Tooltip title="Create adjustment voucher for bank charges / interest">
          <Button
            size="small"
            type="link"
            disabled={isFinalized}
            onClick={() => {
              setSelectedStmtLineForAdjust(record)
              setAdjustModalVisible(true)
            }}
          >
            Adjust
          </Button>
        </Tooltip>
      ),
    },
  ]

  const glColumns = [
    {
      title: 'Date',
      dataIndex: 'postingDate',
      key: 'postingDate',
      width: 100,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '',
    },
    {
      title: 'Type',
      dataIndex: 'voucherType',
      key: 'voucherType',
      width: 110,
      render: (val: string) => <Tag color="blue">{val?.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Bill / Voucher #',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 130,
    },
    {
      title: 'Narration',
      dataIndex: 'narration',
      key: 'narration',
      ellipsis: true,
    },
    {
      title: 'Debit (In)',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      width: 100,
      render: (val: number) => (val > 0 ? <Text type="success">₹{val.toFixed(2)}</Text> : '-'),
    },
    {
      title: 'Credit (Out)',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      width: 100,
      render: (val: number) => (val > 0 ? <Text type="danger">₹{val.toFixed(2)}</Text> : '-'),
    },
  ]

  const matchColumns = [
    {
      title: 'Match Type',
      dataIndex: 'match_type',
      key: 'match_type',
      render: (val: string) => (
        <Tag color={val.includes('AUTO') ? 'cyan' : val === 'ADJUSTMENT' ? 'purple' : 'geekblue'}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'match_amount',
      key: 'match_amount',
      align: 'right' as const,
      render: (val: number) => <strong>₹{Number(val || 0).toFixed(2)}</strong>,
    },
    {
      title: 'Statement Line',
      key: 'stmt',
      render: (_: any, r: any) => (
        <div>
          <div>{r.stmt_narration}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ref: {r.stmt_ref_no || 'N/A'} | Date: {dayjs(r.trans_date).format('YYYY-MM-DD')}
          </Text>
        </div>
      ),
    },
    {
      title: 'GL Entry',
      key: 'gl',
      render: (_: any, r: any) => (
        <div>
          <div>{r.voucher_no} ({r.voucher_type})</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.gl_narration} | Date: {dayjs(r.posting_date).format('YYYY-MM-DD')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: any) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DisconnectOutlined />}
          disabled={isFinalized}
          onClick={() => handleUnmatch(r.match_id)}
        >
          Unmatch
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/financial/bank-reconciliation')}>
            Back
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {summary?.sessionNumber} — {summary?.bankAccountName}
            </Title>
            <Text type="secondary">
              Cutoff Date: {summary?.asOfDate ? dayjs(summary.asOfDate).format('YYYY-MM-DD') : ''} | Status:{' '}
              {summary?.status === 'FINALIZED' ? (
                <Tag color="green">FINALIZED</Tag>
              ) : summary?.status === 'IN_PROGRESS' ? (
                <Tag color="orange">IN PROGRESS</Tag>
              ) : (
                <Tag color="default">DRAFT</Tag>
              )}
            </Text>
          </div>
        </Space>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadWorkspace} loading={loading}>
            Refresh
          </Button>

          {!isFinalized && (
            <>
              <Button
                type="dashed"
                icon={<ThunderboltOutlined />}
                onClick={handleAutoMatch}
                loading={loading}
              >
                Auto-Match (Exact)
              </Button>

              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={!isZeroVariance}
                onClick={handleFinalize}
                loading={loading}
                style={{ background: isZeroVariance ? '#52c41a' : undefined }}
              >
                Finalize Reconciliation
              </Button>
            </>
          )}

          {isFinalized && (
            <Button icon={<UnlockOutlined />} onClick={() => setReopenModalVisible(true)}>
              Supervisory Reopen
            </Button>
          )}
        </Space>
      </div>

      {/* Metrics Banner */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={3}>
            <Statistic
              title="Bank Statement Balance"
              value={summary?.statementBalance || 0}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="(+) Deposits in Transit"
              value={summary?.uncreditedDeposits || 0}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#52c41a' } }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="(-) Outstanding Cheques"
              value={summary?.unpresentedCheques || 0}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="(±) Unrecorded Adjustments"
              value={summary?.unrecordedAdjustments || 0}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="(=) Adjusted Bank Balance"
              value={summary?.adjustedBankBalance || 0}
              precision={2}
              prefix="₹"
              styles={{ content: { fontWeight: 600 } }}
            />
          </Col>
          <Col span={3}>
            <Statistic
              title="GL Book Balance"
              value={summary?.glBalance || 0}
              precision={2}
              prefix="₹"
              styles={{ content: { fontWeight: 600 } }}
            />
          </Col>
          <Col span={2} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Difference</div>
            {isZeroVariance ? (
              <Tag color="success" style={{ fontSize: 14, padding: '4px 12px' }}>
                ₹0.00 (Balanced)
              </Tag>
            ) : (
              <Tag color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
                ₹{(summary?.reconciledDifference || 0).toFixed(2)}
              </Tag>
            )}
          </Col>
        </Row>
      </Card>

      {/* Selection Action Bar for Manual Matching */}
      {!isFinalized && (selectedStmtKeys.length > 0 || selectedGlKeys.length > 0) && (
        <Alert
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Selected <strong>{selectedStmtKeys.length}</strong> Statement Line(s) (Net: ₹{selectedStmtSum.toFixed(2)}) &nbsp;|&nbsp;
                Selected <strong>{selectedGlKeys.length}</strong> GL Entry(s) (Net: ₹{selectedGlSum.toFixed(2)})
                &nbsp;|&nbsp; Variance: <strong>₹{selectionDiff.toFixed(2)}</strong>
              </span>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                disabled={selectionDiff > 0.001 || selectedStmtKeys.length === 0 || selectedGlKeys.length === 0}
                onClick={handleManualMatch}
              >
                Match Selected ({selectedStmtKeys.length} : {selectedGlKeys.length})
              </Button>
            </div>
          }
          type={selectionDiff <= 0.001 ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Main Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="workspace"
          items={[
            {
              key: 'workspace',
              label: (
                <span>
                  Reconciliation Workspace (Split-Pane) &nbsp;
                  <Badge count={unmatchedStmtLines.length + unmatchedGlEntries.length} />
                </span>
              ),
              children: (
                <Row gutter={16}>
                  {/* Left Column: Bank Statement Lines */}
                  <Col span={12}>
                    <Card
                      title={
                        <Space>
                          <span>Unmatched Bank Statement Lines</span>
                          <Tag color="blue">{unmatchedStmtLines.length}</Tag>
                        </Space>
                      }
                      size="small"
                    >
                      <Table
                        dataSource={unmatchedStmtLines}
                        columns={stmtColumns}
                        rowKey="id"
                        size="small"
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                        rowSelection={
                          isFinalized
                            ? undefined
                            : {
                                selectedRowKeys: selectedStmtKeys,
                                onChange: setSelectedStmtKeys,
                              }
                        }
                      />
                    </Card>
                  </Col>

                  {/* Right Column: GL Bank Entries */}
                  <Col span={12}>
                    <Card
                      title={
                        <Space>
                          <span>Unmatched ERP General Ledger Transactions</span>
                          <Tag color="green">{unmatchedGlEntries.length}</Tag>
                        </Space>
                      }
                      size="small"
                    >
                      <Table
                        dataSource={unmatchedGlEntries}
                        columns={glColumns}
                        rowKey="glEntryId"
                        size="small"
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                        rowSelection={
                          isFinalized
                            ? undefined
                            : {
                                selectedRowKeys: selectedGlKeys,
                                onChange: setSelectedGlKeys,
                              }
                        }
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'matched',
              label: `Matched Records (${matches.length})`,
              children: (
                <Table
                  dataSource={matches}
                  columns={matchColumns}
                  rowKey="match_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'report',
              label: 'Statutory BRS Statement Preview',
              children: (
                <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: '#fafafa', border: '1px solid #d9d9d9' }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>BANK RECONCILIATION STATEMENT</Title>
                    <Text strong>{summary?.bankAccountName}</Text>
                    <div>As of {summary?.asOfDate ? dayjs(summary.asOfDate).format('DD MMMM YYYY') : ''}</div>
                  </div>

                  <Table
                    pagination={false}
                    showHeader={false}
                    columns={[
                      { dataIndex: 'item', key: 'item' },
                      { dataIndex: 'amount', key: 'amount', align: 'right' as const },
                    ]}
                    dataSource={[
                      { item: <strong>Balance as per Bank Statement</strong>, amount: <strong>₹{(summary?.statementBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
                      { item: 'Add: Cheques deposited into bank but not yet credited (Deposits in Transit)', amount: `+ ₹${(summary?.uncreditedDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                      { item: 'Less: Cheques issued by company but not yet presented for payment (Outstanding Cheques)', amount: `- ₹${(summary?.unpresentedCheques || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                      { item: 'Add/Less: Direct bank credits / debits not yet recorded in books', amount: `₹${(summary?.unrecordedAdjustments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                      { item: <strong>Adjusted Bank Balance</strong>, amount: <strong>₹{(summary?.adjustedBankBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
                      { item: <strong>Authoritative Balance as per General Ledger</strong>, amount: <strong>₹{(summary?.glBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
                      {
                        item: <Text strong type={isZeroVariance ? 'success' : 'danger'}>Reconciled Net Difference</Text>,
                        amount: <Text strong type={isZeroVariance ? 'success' : 'danger'}>₹{(summary?.reconciledDifference || 0).toFixed(2)}</Text>,
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Adjustment Modal */}
      <BankAdjustmentModal
        visible={adjustModalVisible}
        sessionId={sessionId}
        statementLine={selectedStmtLineForAdjust}
        onClose={() => setAdjustModalVisible(false)}
        onSuccess={loadWorkspace}
      />

      {/* Reopen Modal */}
      <Modal
        title="Supervisory Reopen of Finalized Reconciliation"
        open={reopenModalVisible}
        onCancel={() => setReopenModalVisible(false)}
        onOk={handleReopen}
        confirmLoading={loading}
        okText="Reopen Session"
      >
        <Alert
          title="Audit Notice"
          description="Reopening a finalized session unlocks the reconciliation for modifications. A mandatory audit log entry will be permanently recorded."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="Reason for Reopening" required>
            <Input.TextArea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Audit correction for late bank charge reversal..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
