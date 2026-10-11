import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  message,
  Alert,
} from 'antd'
import { bankReconciliationApi, AdjustmentVoucherRequest, BankStatementItem } from '../api/bankReconciliationApi'
import dayjs from 'dayjs'

interface Props {
  visible: boolean
  sessionId: number
  statementLine: BankStatementItem | null
  onClose: () => void
  onSuccess: () => void
}

export const BankAdjustmentModal: React.FC<Props> = ({
  visible,
  sessionId,
  statementLine,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (visible && statementLine) {
      setErrorMessage(null)
      form.resetFields()

      const isDebit = statementLine.debit > 0
      const amount = isDebit ? statementLine.debit : statementLine.credit
      const defaultType = isDebit ? 'BANK_CHARGE' : 'INTEREST_INCOME'
      const defaultCode = isDebit ? '5208' : '4201'

      form.setFieldsValue({
        adjustmentType: defaultType,
        targetAccountCode: defaultCode,
        amount: amount,
        postingDate: statementLine.transDate ? dayjs(statementLine.transDate) : dayjs(),
        narration: `BRS Adjustment: ${statementLine.narration || ''} (Ref: ${statementLine.refNo || ''})`,
      })
    }
  }, [visible, statementLine, form])

  const handleTypeChange = (type: string) => {
    if (type === 'BANK_CHARGE') {
      form.setFieldsValue({ targetAccountCode: '5208' })
    } else if (type === 'INTEREST_INCOME') {
      form.setFieldsValue({ targetAccountCode: '4201' })
    }
  }

  const handleSubmit = async () => {
    if (!statementLine) return
    try {
      const values = await form.validateFields()
      setLoading(true)
      setErrorMessage(null)

      const payload: AdjustmentVoucherRequest = {
        sessionId,
        statementLineId: statementLine.id,
        adjustmentType: values.adjustmentType,
        targetAccountCode: values.targetAccountCode,
        amount: values.amount,
        narration: values.narration,
        postingDate: values.postingDate ? values.postingDate.format('YYYY-MM-DD') : undefined,
      }

      await bankReconciliationApi.postAdjustment(sessionId, payload)
      message.success('Adjustment voucher posted to canonical GL and matched!')
      onSuccess()
      onClose()
    } catch (e: any) {
      const errorText = e?.response?.data?.data || e?.message || 'Failed to post adjustment voucher'
      setErrorMessage(errorText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Create Bank Adjustment Voucher → Canonical GL"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText="Post to GL & Match"
    >
      {errorMessage && (
        <Alert
          title="Posting Error"
          description={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
        <div><strong>Statement Line:</strong> {statementLine?.narration || 'No description'}</div>
        <div><strong>Date:</strong> {statementLine?.transDate} | <strong>Ref:</strong> {statementLine?.refNo || 'N/A'}</div>
        <div><strong>Amount:</strong> ₹{statementLine?.credit ? `${statementLine.credit} (Deposit)` : `${statementLine?.debit} (Withdrawal)`}</div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="adjustmentType"
          label="Adjustment Type"
          rules={[{ required: true }]}
        >
          <Select onChange={handleTypeChange}>
            <Select.Option value="BANK_CHARGE">Bank Charges & Commission (Dr 5208 / Cr 1232 Bank)</Select.Option>
            <Select.Option value="INTEREST_INCOME">Interest Income (Dr 1232 Bank / Cr 4201 Income)</Select.Option>
            <Select.Option value="DIRECT_DEBIT">Direct Debit / Statutory Expense (Dr Expense / Cr 1232 Bank)</Select.Option>
            <Select.Option value="DIRECT_CREDIT">Direct Customer Wire / Credit (Dr 1232 Bank / Cr Income or AR)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="targetAccountCode"
          label="Target COA Account Code"
          rules={[{ required: true, message: 'Please enter target COA code' }]}
        >
          <Input placeholder="e.g. 5208 (Bank Charges), 4201 (Interest)" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Adjustment Amount (₹)"
          rules={[{ required: true, message: 'Please enter amount' }]}
        >
          <InputNumber style={{ width: '100%' }} precision={2} min={0.01} />
        </Form.Item>

        <Form.Item
          name="postingDate"
          label="GL Posting Date"
          rules={[{ required: true, message: 'Posting date is required' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item
          name="narration"
          label="Voucher Narration"
          rules={[{ required: true, message: 'Please enter narration' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
