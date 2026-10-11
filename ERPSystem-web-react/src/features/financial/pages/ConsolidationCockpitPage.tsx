import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  InputNumber,
  Typography,
  Statistic,
  Row,
  Col,
  Alert,
  message,
  Tooltip,
  Badge,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BranchesOutlined,
  AuditOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  consolidationApi,
  ConsolidationGroup,
  ConsolidationGroupMember,
  IntercompanyRelationship,
  ConsolidationRun,
  ConsolidatedReportResult,
  ConsolidatedLineItem,
  EliminationEntry,
  ConsolidationException,
} from '../api/consolidationApi'

const { Title, Text } = Typography

export const ConsolidationCockpitPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('statements')

  // Group selection & state
  const [groups, setGroups] = useState<ConsolidationGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined)
  const [members, setMembers] = useState<ConsolidationGroupMember[]>([])
  const [relationships, setRelationships] = useState<IntercompanyRelationship[]>([])
  const [runs, setRuns] = useState<ConsolidationRun[]>([])

  // Period / Date filters
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs())
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ])

  // Consolidated statement report state
  const [statementType, setStatementType] = useState<'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS'>('TRIAL_BALANCE')
  const [reportResult, setReportResult] = useState<ConsolidatedReportResult | null>(null)

  // Modals
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false)
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false)
  const [createRelModalVisible, setCreateRelModalVisible] = useState(false)

  const [groupForm] = Form.useForm()
  const [memberForm] = Form.useForm()
  const [relForm] = Form.useForm()

  // 1. Fetch initial groups and relationships
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const [groupsRes, relsRes] = await Promise.all([
        consolidationApi.getGroups(),
        consolidationApi.getRelationships(),
      ])

      const groupList = Array.isArray(groupsRes) ? groupsRes : (groupsRes as any)?.data || []
      setGroups(groupList)
      if (groupList.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupList[0].id)
      }

      const relList = Array.isArray(relsRes) ? relsRes : (relsRes as any)?.data || []
      setRelationships(relList)
    } catch (e: any) {
      console.error('Failed to load consolidation data', e)
    } finally {
      setLoading(false)
    }
  }, [selectedGroupId])

  // 2. Fetch group members and runs when selected group changes
  const fetchGroupDetails = useCallback(async () => {
    if (!selectedGroupId) return
    try {
      const [membersRes, runsRes] = await Promise.all([
        consolidationApi.getGroupMembers(selectedGroupId),
        consolidationApi.getConsolidationRuns(selectedGroupId),
      ])
      setMembers(Array.isArray(membersRes) ? membersRes : (membersRes as any)?.data || [])
      setRuns(Array.isArray(runsRes) ? runsRes : (runsRes as any)?.data || [])
    } catch (e: any) {
      console.error('Failed to load group details', e)
    }
  }, [selectedGroupId])

  // 3. Load consolidated financial statements
  const loadStatement = useCallback(async (type: 'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS') => {
    if (!selectedGroupId) return
    try {
      setLoading(true)
      setStatementType(type)
      let res: any = null
      const dateStr = asOfDate.format('YYYY-MM-DD')
      const startStr = dateRange[0].format('YYYY-MM-DD')
      const endStr = dateRange[1].format('YYYY-MM-DD')

      if (type === 'TRIAL_BALANCE') {
        res = await consolidationApi.getConsolidatedTrialBalance({ groupId: selectedGroupId, asOfDate: dateStr })
      } else if (type === 'BALANCE_SHEET') {
        res = await consolidationApi.getConsolidatedBalanceSheet({ groupId: selectedGroupId, asOfDate: dateStr })
      } else if (type === 'PROFIT_LOSS') {
        res = await consolidationApi.getConsolidatedProfitLoss({ groupId: selectedGroupId, startDate: startStr, endDate: endStr })
      }

      const data = res?.lines ? res : (res?.data?.lines ? res.data : res?.data || res)
      if (data && Array.isArray(data.lines)) {
        setReportResult(data)
      } else {
        setReportResult(null)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load consolidated statement')
      setReportResult(null)
    } finally {
      setLoading(false)
    }
  }, [selectedGroupId, asOfDate, dateRange])

  // 4. Trigger consolidation run (Preview or Finalize)
  const handleExecuteRun = async (finalize: boolean) => {
    if (!selectedGroupId) {
      message.warning('Please select a consolidation group')
      return
    }
    try {
      setLoading(true)
      const payload = {
        groupId: selectedGroupId,
        asOfDate: asOfDate.format('YYYY-MM-DD'),
        periodStartDate: dateRange[0].format('YYYY-MM-DD'),
        periodEndDate: dateRange[1].format('YYYY-MM-DD'),
        finalizeRun: finalize,
      }

      const res: any = finalize
        ? await consolidationApi.executeConsolidation(payload)
        : await consolidationApi.previewConsolidation(payload)

      const data = res?.lines ? res : (res?.data?.lines ? res.data : res?.data || res)
      setReportResult(data)
      message.success(finalize ? 'Consolidation Run successfully executed & finalized!' : 'Consolidation preview generated!')
      fetchGroupDetails()
    } catch (e: any) {
      message.error(e?.message || 'Failed to execute consolidation')
    } finally {
      setLoading(false)
    }
  }

  // 5. Regenerate stale run
  const handleRegenerateRun = async (runId: number) => {
    try {
      setLoading(true)
      const res: any = await consolidationApi.regenerateConsolidationRun(runId)
      const data = res?.lines ? res : (res?.data?.lines ? res.data : res?.data || res)
      setReportResult(data)
      message.success('Consolidation Run successfully regenerated!')
      fetchGroupDetails()
    } catch (e: any) {
      message.error(e?.message || 'Failed to regenerate run')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    fetchGroupDetails()
    if (selectedGroupId) {
      loadStatement('TRIAL_BALANCE')
    }
  }, [selectedGroupId, fetchGroupDetails, loadStatement])

  // Table columns for Consolidated Statements
  const buildStatementColumns = () => {
    const baseColumns: any[] = [
      {
        title: 'Account Code',
        dataIndex: 'accountCode',
        key: 'accountCode',
        width: 140,
        render: (code: string, record: ConsolidatedLineItem) => (
          <Space>
            <Text strong>{code}</Text>
            <Tag color={
              record.accountCategory === 'ASSET' ? 'blue' :
              record.accountCategory === 'LIABILITY' ? 'purple' :
              record.accountCategory === 'EQUITY' ? 'gold' :
              record.accountCategory === 'INCOME' ? 'green' : 'volcano'
            }>
              {record.accountCategory}
            </Tag>
          </Space>
        ),
      },
      {
        title: 'Account Name',
        dataIndex: 'accountName',
        key: 'accountName',
        ellipsis: true,
      },
    ]

    // Dynamic columns for each member organization
    if (reportResult && reportResult.organizationIds && reportResult.organizationNames) {
      reportResult.organizationIds.forEach((orgId) => {
        const orgName = reportResult.organizationNames[orgId] || `Org-${orgId}`
        baseColumns.push({
          title: orgName,
          key: `org_${orgId}`,
          align: 'right',
          width: 150,
          render: (_: any, record: ConsolidatedLineItem) => {
            const val = record.organizationAmounts?.[orgId] || 0
            return (
              <Text type={val === 0 ? 'secondary' : undefined}>
                ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            )
          },
        })
      })
    }

    baseColumns.push(
      {
        title: 'Gross Sum',
        dataIndex: 'grossAmount',
        key: 'grossAmount',
        align: 'right',
        width: 150,
        render: (val: number) => (
          <Text strong>₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        ),
      },
      {
        title: 'Eliminations',
        dataIndex: 'eliminationAmount',
        key: 'eliminationAmount',
        align: 'right',
        width: 150,
        render: (val: number) => (
          <Text type={val !== 0 ? 'danger' : 'secondary'} strong={val !== 0}>
            {val !== 0 ? `-₹${Number(Math.abs(val)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
          </Text>
        ),
      },
      {
        title: 'Consolidated Balance',
        dataIndex: 'consolidatedAmount',
        key: 'consolidatedAmount',
        align: 'right',
        width: 170,
        render: (val: number) => (
          <Text strong style={{ color: '#1890ff', fontSize: '15px' }}>
            ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        ),
      }
    )

    return baseColumns
  }

  // Elimination Entries Table Columns
  const eliminationColumns = [
    {
      title: 'Type',
      dataIndex: 'eliminationType',
      key: 'eliminationType',
      width: 160,
      render: (t: string) => <Tag color="orange">{t}</Tag>,
    },
    {
      title: 'Source Org',
      dataIndex: 'sourceOrgName',
      key: 'sourceOrgName',
    },
    {
      title: 'Counterparty Org',
      dataIndex: 'counterpartyOrgName',
      key: 'counterpartyOrgName',
    },
    {
      title: 'Account',
      dataIndex: 'accountCode',
      key: 'accountCode',
      render: (code: string, r: EliminationEntry) => `${code} - ${r.accountName || ''}`,
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      render: (v: number) => Number(v) > 0 ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      render: (v: number) => Number(v) > 0 ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Reason & Audit Ref',
      dataIndex: 'eliminationReason',
      key: 'eliminationReason',
      render: (reason: string, r: EliminationEntry) => (
        <Space direction="vertical" size={2}>
          <Text>{reason}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{r.auditReference}</Text>
        </Space>
      ),
    },
  ]

  // Exceptions Table Columns
  const exceptionColumns = [
    {
      title: 'Exception Type',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      width: 180,
      render: (t: string) => {
        const color = t === 'ONE_SIDED' ? 'error' : t === 'AMOUNT_MISMATCH' ? 'warning' : 'default'
        return <Tag color={color}>{t}</Tag>
      },
    },
    {
      title: 'Source Org',
      dataIndex: 'sourceOrgName',
      key: 'sourceOrgName',
    },
    {
      title: 'Counterparty Org',
      dataIndex: 'counterpartyOrgName',
      key: 'counterpartyOrgName',
      render: (name: string) => name || '-',
    },
    {
      title: 'Source Amt',
      dataIndex: 'sourceAmount',
      key: 'sourceAmount',
      align: 'right' as const,
      render: (v: number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Counterparty Amt',
      dataIndex: 'counterpartyAmount',
      key: 'counterpartyAmount',
      align: 'right' as const,
      render: (v: number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Unmatched Variance',
      dataIndex: 'varianceAmount',
      key: 'varianceAmount',
      align: 'right' as const,
      render: (v: number) => (
        <Text strong type="danger">
          ₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Top Header Card */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" size="middle">
              <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: '10px' }}>
                <BranchesOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0 }}>Inter-Company Consolidation & Reporting</Title>
                <Text type="secondary">
                  Ind AS 110 / AS 21 Multi-Entity Statutory Consolidation, Reciprocal Eliminations & Audit Workspace
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Select
                id="consolidation-group-select"
                style={{ width: 260 }}
                placeholder="Select Consolidation Group"
                value={selectedGroupId}
                onChange={(val) => setSelectedGroupId(val)}
                options={groups.map((g) => ({
                  value: g.id,
                  label: `${g.groupCode} - ${g.groupName}`,
                }))}
              />
              <DatePicker
                id="consolidation-as-of-date"
                value={asOfDate}
                onChange={(d) => d && setAsOfDate(d)}
                allowClear={false}
              />
              <Button
                id="consolidation-preview-btn"
                icon={<ReloadOutlined />}
                onClick={() => handleExecuteRun(false)}
                loading={loading}
              >
                Preview Live
              </Button>
              <Button
                id="consolidation-execute-btn"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecuteRun(true)}
                loading={loading}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Execute & Finalize
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Warning banner for Stale / Reopened Period Run */}
      {reportResult?.runStatus === 'STALE_REOPENED' && (
        <Alert
          id="consolidation-stale-alert"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Consolidation Run is Out of Date (STALE_REOPENED)"
          description="A constituent member organization reopened a previously locked fiscal period. Consolidated financial figures cannot be used as official reports until regenerated."
          action={
            <Button
              id="consolidation-regenerate-btn"
              type="primary"
              danger
              onClick={() => reportResult.runId && handleRegenerateRun(reportResult.runId)}
            >
              Regenerate Now
            </Button>
          }
          style={{ marginBottom: '20px', borderRadius: '8px' }}
        />
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: '8px', background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<Text type="secondary">Total Gross Assets / Revenue</Text>}
              value={reportResult?.totalGross || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#262626' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: '8px', background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<Text type="secondary">Inter-Company Eliminations</Text>}
              value={reportResult?.totalEliminations || 0}
              precision={2}
              prefix="-₹"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: '8px', background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<Text type="secondary">Net Consolidated Figure</Text>}
              value={reportResult?.totalConsolidated || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: '8px', background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<Text type="secondary">Elimination Status & Variances</Text>}
              value={reportResult?.exceptions?.length || 0}
              suffix={
                <Tag color={reportResult?.isBalanced ? 'success' : 'error'} style={{ marginLeft: '12px' }}>
                  {reportResult?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
                </Tag>
              }
              prefix={<ExclamationCircleOutlined style={{ color: (reportResult?.exceptions?.length || 0) > 0 ? '#faad14' : '#52c41a' }} />}
              valueStyle={{ color: (reportResult?.exceptions?.length || 0) > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Multi-Tab Interface */}
      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs
          id="consolidation-main-tabs"
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Button id="create-group-btn" icon={<PlusOutlined />} onClick={() => setCreateGroupModalVisible(true)}>
                New Group
              </Button>
              <Button id="add-member-btn" icon={<PlusOutlined />} onClick={() => setAddMemberModalVisible(true)}>
                Add Member
              </Button>
              <Button id="create-rel-btn" icon={<BranchesOutlined />} onClick={() => setCreateRelModalVisible(true)}>
                Map Inter-Company Trade
              </Button>
            </Space>
          }
          items={[
            {
              key: 'statements',
              label: (
                <span>
                  <AuditOutlined /> Consolidated Statements
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Button
                        type={statementType === 'TRIAL_BALANCE' ? 'primary' : 'default'}
                        onClick={() => loadStatement('TRIAL_BALANCE')}
                      >
                        Trial Balance
                      </Button>
                      <Button
                        type={statementType === 'BALANCE_SHEET' ? 'primary' : 'default'}
                        onClick={() => loadStatement('BALANCE_SHEET')}
                      >
                        Schedule III Balance Sheet
                      </Button>
                      <Button
                        type={statementType === 'PROFIT_LOSS' ? 'primary' : 'default'}
                        onClick={() => loadStatement('PROFIT_LOSS')}
                      >
                        Schedule III Profit & Loss
                      </Button>
                    </Space>
                    <Text type="secondary">
                      Formula: <strong>Sum of Included Organizations - Eliminations = Consolidated</strong>
                    </Text>
                  </div>

                  <Table
                    id="consolidated-statements-table"
                    dataSource={reportResult?.lines || []}
                    columns={buildStatementColumns()}
                    rowKey="accountCode"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    bordered
                    scroll={{ x: 1200 }}
                  />
                </div>
              ),
            },
            {
              key: 'eliminations',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Elimination Entries ({reportResult?.eliminations?.length || 0})
                </span>
              ),
              children: (
                <Table
                  id="consolidation-eliminations-table"
                  dataSource={reportResult?.eliminations || []}
                  columns={eliminationColumns}
                  rowKey={(r, i) => `${r.sourceOrganizationId}_${r.accountCode}_${i}`}
                  pagination={{ pageSize: 10 }}
                  bordered
                />
              ),
            },
            {
              key: 'exceptions',
              label: (
                <span>
                  <Badge count={reportResult?.exceptions?.length || 0} offset={[10, 0]}>
                    <ExclamationCircleOutlined /> Exceptions & Variances
                  </Badge>
                </span>
              ),
              children: (
                <div>
                  <Alert
                    message="Reciprocal Variance Reconciliation Workspace"
                    description="Identifies one-sided transactions, timing differences (cash/goods in transit), and balance mismatches. Unmatched amounts are preserved in consolidated reporting rather than arbitrarily forced to zero."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <Table
                    id="consolidation-exceptions-table"
                    dataSource={reportResult?.exceptions || []}
                    columns={exceptionColumns}
                    rowKey={(r, i) => `${r.sourceOrganizationId}_${r.exceptionType}_${i}`}
                    pagination={{ pageSize: 10 }}
                    bordered
                  />
                </div>
              ),
            },
            {
              key: 'relationships',
              label: (
                <span>
                  <BranchesOutlined /> Inter-Company Relationships ({relationships.length})
                </span>
              ),
              children: (
                <Table
                  id="consolidation-relationships-table"
                  dataSource={relationships}
                  rowKey="id"
                  columns={[
                    { title: 'Source Org', dataIndex: 'sourceOrgName', key: 'sourceOrgName' },
                    { title: 'Counterparty Org', dataIndex: 'counterpartyOrgName', key: 'counterpartyOrgName' },
                    { title: 'Customer Mapping', dataIndex: 'customerName', key: 'customerName', render: (v) => v || '-' },
                    { title: 'Supplier Mapping', dataIndex: 'supplierName', key: 'supplierName', render: (v) => v || '-' },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                  ]}
                  bordered
                />
              ),
            },
            {
              key: 'members',
              label: (
                <span>
                  <DollarOutlined /> Group Entities ({members.length})
                </span>
              ),
              children: (
                <Table
                  id="consolidation-members-table"
                  dataSource={members}
                  rowKey="organizationId"
                  columns={[
                    { title: 'Org Code', dataIndex: 'organizationCode', key: 'organizationCode' },
                    { title: 'Organization Name', dataIndex: 'organizationName', key: 'organizationName' },
                    { title: 'Consolidation Method', dataIndex: 'consolidationMethod', key: 'consolidationMethod', render: (m) => <Tag color="blue">{m}</Tag> },
                    { title: 'Equity Share %', dataIndex: 'equitySharePct', key: 'equitySharePct', render: (p) => `${p}%` },
                    { title: 'Functional Currency', dataIndex: 'functionalCurrency', key: 'functionalCurrency', render: (c) => <Tag>{c || 'INR'}</Tag> },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                  ]}
                  bordered
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Create Group Modal */}
      <Modal
        title="Create Statutory Consolidation Group"
        open={createGroupModalVisible}
        onCancel={() => setCreateGroupModalVisible(false)}
        onOk={() => {
          groupForm.validateFields().then(async (values) => {
            try {
              await consolidationApi.createGroup(values)
              message.success('Consolidation group created successfully')
              setCreateGroupModalVisible(false)
              groupForm.resetFields()
              fetchInitialData()
            } catch (e: any) {
              message.error(e?.message || 'Failed to create group')
            }
          })
        }}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item name="groupCode" label="Group Code" rules={[{ required: true, message: 'Please enter group code' }]}>
            <Input placeholder="e.g. GRP-CORP" />
          </Form.Item>
          <Form.Item name="groupName" label="Group Name" rules={[{ required: true, message: 'Please enter group name' }]}>
            <Input placeholder="e.g. Corporate Holding Group" />
          </Form.Item>
          <Form.Item name="parentOrganizationId" label="Parent Organization ID" rules={[{ required: true, message: 'Please enter parent org ID' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 10" />
          </Form.Item>
          <Form.Item name="reportingCurrency" label="Reporting Currency" initialValue="INR">
            <Input placeholder="INR" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Statutory consolidation group description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        title="Add Member Organization"
        open={addMemberModalVisible}
        onCancel={() => setAddMemberModalVisible(false)}
        onOk={() => {
          memberForm.validateFields().then(async (values) => {
            if (!selectedGroupId) return
            try {
              await consolidationApi.addMember(selectedGroupId, values)
              message.success('Member organization added successfully')
              setAddMemberModalVisible(false)
              memberForm.resetFields()
              fetchGroupDetails()
            } catch (e: any) {
              message.error(e?.message || 'Failed to add member')
            }
          })
        }}
      >
        <Form form={memberForm} layout="vertical">
          <Form.Item name="organizationId" label="Organization ID" rules={[{ required: true, message: 'Please enter organization ID' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 20" />
          </Form.Item>
          <Form.Item name="consolidationMethod" label="Consolidation Method" initialValue="FULL">
            <Select
              options={[
                { value: 'FULL', label: 'FULL (100% Consolidation)' },
                { value: 'PROPORTIONATE', label: 'PROPORTIONATE' },
                { value: 'EQUITY', label: 'EQUITY' },
              ]}
            />
          </Form.Item>
          <Form.Item name="equitySharePct" label="Equity Share %" initialValue={100}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Map Inter-Company Trade Modal */}
      <Modal
        title="Map Inter-Company Trade Relationship"
        open={createRelModalVisible}
        onCancel={() => setCreateRelModalVisible(false)}
        onOk={() => {
          relForm.validateFields().then(async (values) => {
            try {
              await consolidationApi.createRelationship(values)
              message.success('Relationship mapped successfully')
              setCreateRelModalVisible(false)
              relForm.resetFields()
              fetchInitialData()
            } catch (e: any) {
              message.error(e?.message || 'Failed to map relationship')
            }
          })
        }}
      >
        <Form form={relForm} layout="vertical">
          <Form.Item name="sourceOrganizationId" label="Source Organization ID" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 20 (Subsidiary A)" />
          </Form.Item>
          <Form.Item name="counterpartyOrganizationId" label="Counterparty Organization ID" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 30 (Subsidiary B)" />
          </Form.Item>
          <Form.Item name="sourceCustomerId" label="Customer ID in Source Org">
            <InputNumber style={{ width: '100%' }} placeholder="e.g. Customer entity representing Sub B" />
          </Form.Item>
          <Form.Item name="sourceSupplierId" label="Supplier ID in Source Org">
            <InputNumber style={{ width: '100%' }} placeholder="e.g. Supplier entity representing Sub B" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ConsolidationCockpitPage
