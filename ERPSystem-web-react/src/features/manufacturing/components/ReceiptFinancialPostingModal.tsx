import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  DatePicker,
  Input,
  Checkbox,
  Button,
  Space,
  Tag,
  Alert,
  Descriptions,
  Table,
  message,
  Typography,
  Card,
  Spin,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SafetyCertificateOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import {
  workOrderApi,
  WorkOrderReceiptDTO,
  ReceiptCostBreakdownDTO,
  ReceiptFinancialPostingResultDTO,
  JournalLineSummaryDTO,
} from '../api/workOrderApi'

const { Text } = Typography

interface ReceiptFinancialPostingModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  receipt: WorkOrderReceiptDTO | null
}

export const ReceiptFinancialPostingModal: React.FC<ReceiptFinancialPostingModalProps> = ({
  open,
  onClose,
  onSuccess,
  receipt,
}) => {
  const [form] = Form.useForm()
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [breakdown, setBreakdown] = useState<ReceiptCostBreakdownDTO | null>(null)
  const [postingResult, setPostingResult] = useState<ReceiptFinancialPostingResultDTO | null>(null)

  const userAuth = useAppStore((state) => state.userAuth)
  const permissions = useAuthStore((state) => state.permissions)
  const isAuthorized =
    Boolean(userAuth?.isSuperAdmin ||
    userAuth?.isTenantAdmin ||
    userAuth?.authorityDomain === 'PLATFORM' ||
    permissions?.includes('WORK_ORDER_FINANCIAL_POST') ||
    permissions?.includes('FINANCE_ACCOUNT_MANAGE'))

  useEffect(() => {
    if (!open || !receipt?.id) return
    setConfirmed(false)
    setPostingResult(null)
    form.resetFields()
    form.setFieldsValue({
      postingDate: dayjs(),
      remark: `Manufacturing FG receipt capitalization for ${receipt.receiptNumber}`,
    })

    setLoadingBreakdown(true)
    workOrderApi
      .getReceiptBreakdown(receipt.id)
      .then((res: any) => {
        setBreakdown(res?.data || res)
      })
      .catch((err) => {
        console.error('Failed to load breakdown for financial posting', err)
      })
      .finally(() => {
        setLoadingBreakdown(false)
      })
  }, [open, receipt, form])

  const handleSubmit = async () => {
    if (!receipt?.id) return
    if (!confirmed) {
      message.warning('Please confirm statutory authorization before posting.')
      return
    }

    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload = {
        receiptId: receipt.id,
        postingDate: values.postingDate.format('YYYY-MM-DD'),
        remark: values.remark,
      }

      const res: any = await workOrderApi.postReceiptGl(payload)
      const data: ReceiptFinancialPostingResultDTO = res?.data || res
      setPostingResult(data)
      message.success(`Statutory General Ledger Voucher #${data.glVoucherNo} posted successfully.`)
      onSuccess()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Financial posting failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate simulated preview lines before actual server post
  const previewLines: JournalLineSummaryDTO[] = []
  if (breakdown) {
    let lineIdx = 1
    // Dr 1212 Finished Goods
    if (breakdown.fgCapitalization && Number(breakdown.fgCapitalization) > 0) {
      previewLines.push({
        lineNo: lineIdx++,
        accountCode: '1212',
        accountName: 'Finished Goods Inventory',
        entryType: 'DEBIT',
        amount: Number(breakdown.fgCapitalization),
        narration: `FG Receipt Capitalization: ${breakdown.receivedQty} units @ $${Number(breakdown.fgUnitCost || 0).toFixed(4)}`,
      })
    }
    // Dr 5402 Abnormal Scrap Loss (if applicable)
    if (breakdown.abnormalScrapLoss && Number(breakdown.abnormalScrapLoss) > 0) {
      previewLines.push({
        lineNo: lineIdx++,
        accountCode: '5402',
        accountName: 'Abnormal Production Scrap Loss',
        entryType: 'DEBIT',
        amount: Number(breakdown.abnormalScrapLoss),
        narration: `Abnormal scrap write-off: ${breakdown.abnormalScrapQty} units`,
      })
    }
    // Cr 1213 WIP Material
    if (breakdown.materialCost && Number(breakdown.materialCost) > 0) {
      previewLines.push({
        lineNo: lineIdx++,
        accountCode: '1213',
        accountName: 'Work-in-Progress Inventory',
        entryType: 'CREDIT',
        amount: Number(breakdown.materialCost),
        narration: `Component material relief for receipt ${breakdown.receiptNumber}`,
      })
    }
    // Cr 4210 Direct Labor & Machine OH Clearing
    const laborOhTotal = Number(breakdown.laborCost || 0) + Number(breakdown.overheadCost || 0)
    if (laborOhTotal > 0) {
      previewLines.push({
        lineNo: lineIdx++,
        accountCode: '4210',
        accountName: 'Direct Labor & Machine Clearing',
        entryType: 'CREDIT',
        amount: laborOhTotal,
        narration: `Labor & machine overhead absorption for receipt ${breakdown.receiptNumber}`,
      })
    }
  }

  const columns: TableColumnsType<JournalLineSummaryDTO> = [
    {
      title: 'Line #',
      dataIndex: 'lineNo',
      key: 'lineNo',
      width: 70,
      render: (v) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: 'Account',
      key: 'account',
      width: 220,
      render: (_, r) => (
        <span>
          <Tag color="cyan">{r.accountCode}</Tag>
          <Text strong>{r.accountName}</Text>
        </span>
      ),
    },
    {
      title: 'Debit / Credit',
      dataIndex: 'entryType',
      key: 'entryType',
      width: 100,
      render: (t) => (
        <Tag color={t === 'DEBIT' ? 'green' : 'gold'}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amt) => (
        <Text strong style={{ color: amt > 0 ? '#3f8600' : '#888' }}>
          ₹{Number(amt || 0).toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Narration',
      dataIndex: 'narration',
      key: 'narration',
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>,
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
          <span>Statutory General Ledger Financial Posting</span>
          {receipt && <Tag color="blue">{receipt.receiptNumber}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="close" onClick={onClose}>
          {postingResult ? 'Close' : 'Cancel'}
        </Button>,
        !postingResult && (
          <Button
            key="submit"
            type="primary"
            icon={<LockOutlined />}
            loading={submitting}
            disabled={!isAuthorized || !confirmed}
            onClick={handleSubmit}
          >
            Post to General Ledger
          </Button>
        ),
      ]}
    >
      <Spin spinning={loadingBreakdown}>
        {!isAuthorized && (
          <Alert
            type="warning"
            message="Separation of Duties (SoD) Restriction"
            description="You do not possess the required WORK_ORDER_FINANCIAL_POST or FINANCE_ACCOUNT_MANAGE authorization. Statutory financial postings must be executed by certified Financial Controllers."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {postingResult ? (
          <Card
            style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f', marginBottom: 16 }}
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Statutory Journal Voucher Created Successfully</span>
              </Space>
            }
          >
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="GL Voucher Number">
                <Tag color="green" style={{ fontSize: 14, fontWeight: 700 }}>
                  {postingResult.glVoucherNo}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Posting Date">{String(postingResult.postingDate)}</Descriptions.Item>
              <Descriptions.Item label="Total Debits (₹)">
                <Text strong style={{ color: '#3f8600' }}>₹{Number(postingResult.totalDebit || 0).toFixed(4)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Credits (₹)">
                <Text strong style={{ color: '#3f8600' }}>₹{Number(postingResult.totalCredit || 0).toFixed(4)}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0', fontSize: 13 }}>Posted General Ledger Lines</Divider>

            <Table
              dataSource={postingResult.journalLines || []}
              columns={columns}
              rowKey="lineNo"
              pagination={false}
              size="small"
              bordered
            />
          </Card>
        ) : (
          <>
            <Alert
              message="Statutory Double-Entry Ledger Preview"
              description="Posting will generate immutable balanced debits and credits in the General Ledger according to Schedule III / Ind AS 2 standards. Once posted, changes require a reversing journal."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              dataSource={previewLines}
              columns={columns}
              rowKey="lineNo"
              pagination={false}
              size="small"
              bordered
              style={{ marginBottom: 16 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item
                label="Posting Date"
                name="postingDate"
                rules={[{ required: true, message: 'Please select posting date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="Journal Narration / Remark" name="remark">
                <Input.TextArea rows={2} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Checkbox
                  checked={confirmed}
                  disabled={!isAuthorized}
                  onChange={(e) => setConfirmed(e.target.checked)}
                >
                  <Text strong>
                    I confirm that manufacturing costs are verified and authorized for statutory financial capitalization into the General Ledger.
                  </Text>
                </Checkbox>
              </Form.Item>
            </Form>
          </>
        )}
      </Spin>
    </Modal>
  )
}
