import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Typography,
  Tabs,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Input,
  message,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { http } from '@core/api/client'
import { bankReconciliationApi } from '../api/bankReconciliationApi'
import { BankStatementImportModal } from '../components/BankStatementImportModal'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export const BankReconciliationListPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>(undefined)

  const [sessions, setSessions] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])

  const [importModalVisible, setImportModalVisible] = useState(false)
  const [createSessionVisible, setCreateSessionVisible] = useState(false)
  const [createForm] = Form.useForm()

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await http.get('/account/list', {
        params: { currentPage: 1, pageSize: 100 },
      })
      if (res && (res as any).rows) {
        setBankAccounts((res as any).rows)
      } else if (Array.isArray(res)) {
        setBankAccounts(res)
      }
    } catch (e) {
      console.error('Failed to load accounts', e)
    }
  }, [])

  useEffect(() => {
    fetchBankAccounts()
  }, [fetchBankAccounts])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sessRes, stmtRes] = await Promise.all([
        bankReconciliationApi.listSessions(selectedBankId),
        bankReconciliationApi.listStatements(selectedBankId),
      ])
      setSessions((sessRes as any).data || [])
      setStatements((stmtRes as any).data || [])
    } catch (e) {
      console.error('Failed to load BRS list data', e)
    } finally {
      setLoading(false)
    }
  }, [selectedBankId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateSession = async () => {
    try {
      const values = await createForm.validateFields()
      setLoading(true)
      const res = await bankReconciliationApi.createSession({
        bankAccountId: values.bankAccountId,
        statementId: values.statementId,
        asOfDate: values.asOfDate.format('YYYY-MM-DD'),
        statementBalance: values.statementBalance || 0,
        remark: values.remark,
      })
      message.success('Reconciliation session created successfully')
      setCreateSessionVisible(false)
      createForm.resetFields()
      fetchData()
      if ((res as any).data && (res as any).data.sessionId) {
        navigate(`/financial/bank-reconciliation/${(res as any).data.sessionId}`)
      }
    } catch (e: any) {
      message.error(e?.response?.data?.data || e?.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return <Tag color="green" icon={<CheckCircleOutlined />}>FINALIZED</Tag>
      case 'RECONCILED':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>RECONCILED</Tag>
      case 'IN_PROGRESS':
        return <Tag color="orange" icon={<ClockCircleOutlined />}>IN PROGRESS</Tag>
      case 'REOPENED':
        return <Tag color="purple" icon={<ExclamationCircleOutlined />}>REOPENED</Tag>
      default:
        return <Tag color="default">DRAFT</Tag>
    }
  }

  const sessionColumns = [
    {
      title: 'Session #',
      dataIndex: 'session_number',
      key: 'session_number',
      render: (val: string, record: any) => (
        <a onClick={() => navigate(`/financial/bank-reconciliation/${record.id}`)} style={{ fontWeight: 600 }}>
          {val}
        </a>
      ),
    },
    {
      title: 'Bank Account',
      dataIndex: 'bank_account_name',
      key: 'bank_account_name',
      render: (val: string) => val || 'Primary Operating Bank',
    },
    {
      title: 'Cutoff Date',
      dataIndex: 'as_of_date',
      key: 'as_of_date',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '',
    },
    {
      title: 'Statement Balance (₹)',
      dataIndex: 'statement_balance',
      key: 'statement_balance',
      align: 'right' as const,
      render: (val: number) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'GL Balance (₹)',
      dataIndex: 'gl_balance',
      key: 'gl_balance',
      align: 'right' as const,
      render: (val: number) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Reconciled Diff (₹)',
      dataIndex: 'reconciled_difference',
      key: 'reconciled_difference',
      align: 'right' as const,
      render: (val: number) => {
        const diff = Number(val || 0)
        return diff === 0 ? (
          <Tag color="success">₹0.00</Tag>
        ) : (
          <Tag color="error">₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Tag>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/financial/bank-reconciliation/${record.id}`)}
        >
          Open Workspace
        </Button>
      ),
    },
  ]

  const statementColumns = [
    {
      title: 'Statement #',
      dataIndex: 'statement_number',
      key: 'statement_number',
      render: (val: string) => <strong>{val}</strong>,
    },
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: 'SHA-256 Hash',
      dataIndex: 'file_hash',
      key: 'file_hash',
      render: (val: string) => (
        <Tooltip title={val}>
          <Text code copyable={{ text: val }}>
            {val ? `${val.substring(0, 10)}...` : ''}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record: any) =>
        `${dayjs(record.start_date).format('YYYY-MM-DD')} to ${dayjs(record.end_date).format('YYYY-MM-DD')}`,
    },
    {
      title: 'Lines',
      dataIndex: 'line_count',
      key: 'line_count',
      align: 'right' as const,
    },
    {
      title: 'Total Credits (₹)',
      dataIndex: 'total_credits',
      key: 'total_credits',
      align: 'right' as const,
      render: (val: number) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Total Debits (₹)',
      dataIndex: 'total_debits',
      key: 'total_debits',
      align: 'right' as const,
      render: (val: number) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => <Tag color={val === 'RECONCILED' ? 'green' : 'blue'}>{val}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            createForm.setFieldsValue({
              bankAccountId: record.bank_account_id,
              statementId: record.id,
              asOfDate: dayjs(record.end_date),
              statementBalance: record.closing_balance,
            })
            setCreateSessionVisible(true)
          }}
        >
          Create Session
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Bank Reconciliation Statement (BRS)</Title>
          <Text type="secondary">
            Reconcile external bank statement feeds with canonical ERP General Ledger
          </Text>
        </div>
        <Space>
          <Select
            placeholder="All Bank Accounts"
            allowClear
            style={{ width: 220 }}
            value={selectedBankId}
            onChange={(val) => setSelectedBankId(val)}
          >
            {bankAccounts.map((acc) => (
              <Select.Option key={acc.id} value={acc.id}>
                {acc.name}
              </Select.Option>
            ))}
          </Select>

          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>

          <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
            Import Statement (CSV)
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields()
              if (selectedBankId) {
                createForm.setFieldsValue({ bankAccountId: selectedBankId })
              }
              createForm.setFieldsValue({ asOfDate: dayjs() })
              setCreateSessionVisible(true)
            }}
          >
            New Reconciliation
          </Button>
        </Space>
      </div>

      <Card>
        <Tabs
          defaultActiveKey="sessions"
          items={[
            {
              key: 'sessions',
              label: `Reconciliation Sessions (${sessions.length})`,
              children: (
                <Table
                  dataSource={sessions}
                  columns={sessionColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'statements',
              label: `Imported Statements (${statements.length})`,
              children: (
                <Table
                  dataSource={statements}
                  columns={statementColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <BankStatementImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={fetchData}
        defaultBankAccountId={selectedBankId}
      />

      <Modal
        title="Start New Bank Reconciliation Session"
        open={createSessionVisible}
        onCancel={() => setCreateSessionVisible(false)}
        onOk={handleCreateSession}
        confirmLoading={loading}
        okText="Start Reconciliation"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="bankAccountId"
            label="Bank Account"
            rules={[{ required: true, message: 'Please select a bank account' }]}
          >
            <Select placeholder="Select bank account">
              {bankAccounts.map((acc) => (
                <Select.Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.serialNo || 'No A/C No'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="statementId" label="Linked Statement (Optional)">
            <Select placeholder="Select uploaded statement" allowClear>
              {statements.map((stmt) => (
                <Select.Option key={stmt.id} value={stmt.id}>
                  {stmt.statement_number || `STMT-${stmt.id}`} ({stmt.start_date} to {stmt.end_date})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="asOfDate"
            label="Reconciliation Cutoff Date"
            rules={[{ required: true, message: 'Cutoff date is required' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="statementBalance"
            label="Bank Statement Closing Balance (₹)"
            rules={[{ required: true, message: 'Statement closing balance is required' }]}
          >
            <InputNumber style={{ width: '100%' }} precision={2} />
          </Form.Item>

          <Form.Item name="remark" label="Notes / Reference">
            <Input.TextArea rows={2} placeholder="Optional reconciliation notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
