import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  Table,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  Alert,
  message,
  Card,
  Row,
  Col,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PaperClipOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  journalVoucherApi,
  JournalVoucherDTO,
  JournalVoucherLineItem,
  AccountCoaSummary,
} from '../api/journalVoucherApi'

const { Text, Title } = Typography

interface JournalVoucherModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: JournalVoucherDTO | null
  readonly?: boolean
}

export const JournalVoucherModal: React.FC<JournalVoucherModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialData,
  readonly = false,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<AccountCoaSummary[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [lines, setLines] = useState<JournalVoucherLineItem[]>([])

  useEffect(() => {
    if (visible) {
      loadAccounts()
      if (initialData) {
        form.setFieldsValue({
          voucherNumber: initialData.voucherNumber,
          voucherDate: initialData.voucherDate ? dayjs(initialData.voucherDate) : dayjs(),
          remark: initialData.remark,
          attachment: initialData.attachment,
        })
        setLines(
          initialData.lines && initialData.lines.length > 0
            ? initialData.lines.map((l, idx) => ({ ...l, key: idx + 1 }))
            : [
                { key: 1, accountId: undefined, debit: 0, credit: 0, narration: '' },
                { key: 2, accountId: undefined, debit: 0, credit: 0, narration: '' },
              ]
        )
      } else {
        form.resetFields()
        form.setFieldsValue({
          voucherDate: dayjs(),
        })
        setLines([
          { key: 1, accountId: undefined, debit: 0, credit: 0, narration: '' } as any,
          { key: 2, accountId: undefined, debit: 0, credit: 0, narration: '' } as any,
        ])
      }
    }
  }, [visible, initialData, form])

  const loadAccounts = async (keyword?: string) => {
    try {
      setLoadingAccounts(true)
      const res = await journalVoucherApi.searchAccounts(keyword)
      if (res && Array.isArray(res)) {
        setAccounts(res)
      } else if (res && (res as any).data && Array.isArray((res as any).data)) {
        setAccounts((res as any).data)
      }
    } catch (err) {
      console.error('Failed to load leaf accounts', err)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        key: Date.now(),
        accountId: undefined,
        debit: 0,
        credit: 0,
        narration: '',
      } as any,
    ])
  }

  const handleDeleteLine = (key: any) => {
    if (lines.length <= 2) {
      message.warning('A Journal Voucher requires at least 2 lines')
      return
    }
    setLines(lines.filter((l: any) => l.key !== key))
  }

  const handleLineChange = (key: any, field: keyof JournalVoucherLineItem, value: any) => {
    setLines((prev) =>
      prev.map((line: any) => {
        if (line.key === key) {
          const updated = { ...line, [field]: value }
          // If entering debit, auto-zero credit, and vice versa
          if (field === 'debit' && value > 0) {
            updated.credit = 0
          } else if (field === 'credit' && value > 0) {
            updated.debit = 0
          }
          return updated
        }
        return line
      })
    )
  }

  const { totalDebit, totalCredit, difference, isBalanced, canSubmit } = useMemo(() => {
    const dr = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
    const cr = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
    const diff = Math.abs(dr - cr)
    const balanced = diff < 0.0001 && dr > 0
    const validLines =
      lines.length >= 2 &&
      lines.every((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))

    return {
      totalDebit: dr,
      totalCredit: cr,
      difference: diff,
      isBalanced: balanced,
      canSubmit: balanced && validLines,
    }
  }, [lines])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!isBalanced) {
        message.error('Total Debit must strictly equal Total Credit before posting')
        return
      }

      setSubmitting(true)
      const payload: JournalVoucherDTO = {
        voucherNumber: values.voucherNumber,
        voucherDate: values.voucherDate.format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark,
        attachment: values.attachment,
        lines: lines.map((l, index) => ({
          lineNo: index + 1,
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          narration: l.narration,
        })),
      }

      await journalVoucherApi.saveAndPostJV(payload)
      message.success('Journal Voucher posted successfully to General Ledger!')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.message || 'Failed to post Journal Voucher')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Account (COA Leaf)',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 320,
      render: (val: any, record: any) =>
        readonly ? (
          <div>
            <Text strong>{record.accountCode} - {record.accountName}</Text>
          </div>
        ) : (
          <Select
            showSearch
            placeholder="Select GL Account"
            value={val}
            loading={loadingAccounts}
            filterOption={false}
            onSearch={(v) => loadAccounts(v)}
            onChange={(v) => handleLineChange(record.key, 'accountId', v)}
            style={{ width: '100%' }}
            options={accounts.map((acc) => ({
              label: (
                <Space>
                  <Tag color={acc.rootType === 'ASSET' ? 'blue' : acc.rootType === 'LIABILITY' ? 'orange' : acc.rootType === 'EXPENSE' ? 'purple' : 'green'}>
                    {acc.accountCode}
                  </Tag>
                  <span>{acc.accountName}</span>
                </Space>
              ),
              value: acc.id,
            }))}
          />
        ),
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      width: 140,
      render: (val: any, record: any) =>
        readonly ? (
          <Text style={{ fontFamily: 'monospace', fontWeight: val > 0 ? 'bold' : 'normal' }}>
            {val ? Number(val).toFixed(2) : '-'}
          </Text>
        ) : (
          <InputNumber
            min={0}
            precision={2}
            value={val}
            style={{ width: '100%' }}
            onChange={(v) => handleLineChange(record.key, 'debit', v || 0)}
          />
        ),
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      width: 140,
      render: (val: any, record: any) =>
        readonly ? (
          <Text style={{ fontFamily: 'monospace', fontWeight: val > 0 ? 'bold' : 'normal' }}>
            {val ? Number(val).toFixed(2) : '-'}
          </Text>
        ) : (
          <InputNumber
            min={0}
            precision={2}
            value={val}
            style={{ width: '100%' }}
            onChange={(v) => handleLineChange(record.key, 'credit', v || 0)}
          />
        ),
    },
    {
      title: 'Narration / Cost Center',
      dataIndex: 'narration',
      key: 'narration',
      render: (val: any, record: any) =>
        readonly ? (
          <span>{val || '-'}</span>
        ) : (
          <Input
            placeholder="Line narration..."
            value={val}
            onChange={(e) => handleLineChange(record.key, 'narration', e.target.value)}
          />
        ),
    },
    ...(!readonly
      ? [
          {
            title: 'Action',
            key: 'action',
            width: 70,
            render: (_: any, record: any) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteLine(record.key)}
                disabled={lines.length <= 2}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>{readonly ? 'Journal Voucher Detail' : 'Create & Post Manual Journal Voucher'}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={980}
      footer={
        readonly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              icon={<CheckCircleOutlined />}
              style={{
                backgroundColor: canSubmit ? '#52c41a' : undefined,
                borderColor: canSubmit ? '#52c41a' : undefined,
              }}
            >
              Post Voucher (Dr == Cr)
            </Button>
          </Space>
        )
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Voucher Number (Optional auto-gen)" name="voucherNumber">
              <Input placeholder="Auto-generated if blank (JV-YYYYMMDD-XXXX)" disabled={readonly} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Voucher Date"
              name="voucherDate"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={readonly} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Attachment / Evidence Reference" name="attachment">
              <Input
                prefix={<PaperClipOutlined />}
                placeholder="e.g. /docs/audit_ref_001.pdf"
                disabled={readonly}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Header Narration / Remark" name="remark">
          <Input.TextArea rows={2} placeholder="Explain reason for journal entry..." disabled={readonly} />
        </Form.Item>
      </Form>

      <Divider style={{ margin: '12px 0' }}>
        <Space>
          <Text strong>Double-Entry Transaction Lines</Text>
          {!readonly && (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddLine}
            >
              Add Line
            </Button>
          )}
        </Space>
      </Divider>

      <Table
        dataSource={lines}
        columns={columns as any}
        pagination={false}
        size="small"
        bordered
        rowKey="key"
      />

      {/* Real-Time Balance Verification Bar */}
      <Card
        size="small"
        style={{
          marginTop: 16,
          backgroundColor: isBalanced ? '#f6ffed' : '#fff1f0',
          borderColor: isBalanced ? '#b7eb8f' : '#ffa39e',
        }}
      >
        <Row align="middle" justify="space-between">
          <Col span={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Total Debit</Text>
              <Title level={4} style={{ margin: 0, color: '#1890ff', fontFamily: 'monospace' }}>
                ₹ {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Title>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Total Credit</Text>
              <Title level={4} style={{ margin: 0, color: '#722ed1', fontFamily: 'monospace' }}>
                ₹ {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Title>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            {isBalanced ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '6px 12px', fontSize: 14 }}>
                BALANCED (Diff: ₹0.00)
              </Tag>
            ) : (
              <Tag color="error" icon={<CloseCircleOutlined />} style={{ padding: '6px 12px', fontSize: 14 }}>
                UNBALANCED (Diff: ₹{difference.toFixed(2)})
              </Tag>
            )}
          </Col>
        </Row>
      </Card>
    </Modal>
  )
}
