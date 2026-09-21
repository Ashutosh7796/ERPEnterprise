import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
  Card,
  Row,
  Col,
  Alert,
  Tag,
} from 'antd'
import {
  SwapOutlined,
  CheckCircleOutlined,
  PaperClipOutlined,
  BankOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import {
  journalVoucherApi,
  ContraVoucherDTO,
} from '../api/journalVoucherApi'

const { Text, Title } = Typography

interface ContraVoucherModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: ContraVoucherDTO | null
  readonly?: boolean
}

export const ContraVoucherModal: React.FC<ContraVoucherModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialData,
  readonly = false,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  useEffect(() => {
    if (visible) {
      loadAccounts()
      if (initialData) {
        form.setFieldsValue({
          voucherNumber: initialData.voucherNumber,
          voucherDate: initialData.voucherDate ? dayjs(initialData.voucherDate) : dayjs(),
          sourceAccountId: initialData.sourceAccountId,
          destinationAccountId: initialData.destinationAccountId,
          amount: initialData.amount,
          remark: initialData.remark,
          attachment: initialData.attachment,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          voucherDate: dayjs(),
        })
      }
    }
  }, [visible, initialData, form])

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const res: any = await http.get('/account/getAccount')
      let list: any[] = []
      if (res?.data?.accountList) {
        list = res.data.accountList
      } else if (res?.accountList) {
        list = res.accountList
      } else if (Array.isArray(res?.data)) {
        list = res.data
      } else if (Array.isArray(res)) {
        list = res
      }
      setAccounts(list)
    } catch (err) {
      console.error('Failed to load accounts for contra', err)
      // Fallback to searchAccounts from COA
      try {
        const coaRes = await journalVoucherApi.searchAccounts('')
        if (Array.isArray(coaRes)) {
          setAccounts(coaRes.filter((a: any) => a.accountType === 'BANK' || a.accountType === 'CASH' || a.accountCode.startsWith('123')))
        }
      } catch (ignored) {}
    } finally {
      setLoadingAccounts(false)
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (values.sourceAccountId === values.destinationAccountId) {
        message.error('Source and Destination accounts cannot be the same')
        return
      }

      setSubmitting(true)
      const payload: ContraVoucherDTO = {
        voucherNumber: values.voucherNumber,
        voucherDate: values.voucherDate.format('YYYY-MM-DD HH:mm:ss'),
        sourceAccountId: values.sourceAccountId,
        destinationAccountId: values.destinationAccountId,
        amount: values.amount,
        remark: values.remark,
        attachment: values.attachment,
      }

      await journalVoucherApi.saveAndPostContra(payload)
      message.success('Contra transfer posted successfully via authoritative engine!')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.message || 'Failed to post Contra transfer')
    } finally {
      setSubmitting(false)
    }
  }

  const sourceAccountId = Form.useWatch('sourceAccountId', form)
  const destinationAccountId = Form.useWatch('destinationAccountId', form)
  const amount = Form.useWatch('amount', form)

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId)
  const destAccount = accounts.find((a) => a.id === destinationAccountId)

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span>{readonly ? 'Contra Transfer Detail' : 'Create & Post Bank/Cash Contra Transfer'}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={720}
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
              icon={<CheckCircleOutlined />}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Post Contra Transfer
            </Button>
          </Space>
        )
      }
    >
      <Alert
        message="Authoritative Option A Contra Posting"
        description="Contra transfers move liquidity strictly between Bank and Cash accounts (Dr Destination, Cr Source). Zero effect on Revenue, Expenses, GST, Inventory, or AR/AP."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Voucher Number (Optional auto-gen)" name="voucherNumber">
              <Input placeholder="Auto-generated if blank (CON-YYYYMMDD-XXXX)" disabled={readonly} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Voucher Date"
              name="voucherDate"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={readonly} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Source Account (Credit - Outflow)"
              name="sourceAccountId"
              rules={[{ required: true, message: 'Select source bank/cash account' }]}
            >
              <Select
                showSearch
                placeholder="Select Outflow Account"
                loading={loadingAccounts}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={accounts.map((acc) => ({
                  label: `${acc.name || acc.accountName} (${acc.serialNo || acc.accountCode || 'Acc'})`,
                  value: acc.id,
                }))}
                disabled={readonly}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Destination Account (Debit - Inflow)"
              name="destinationAccountId"
              rules={[{ required: true, message: 'Select destination bank/cash account' }]}
            >
              <Select
                showSearch
                placeholder="Select Inflow Account"
                loading={loadingAccounts}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={accounts.map((acc) => ({
                  label: `${acc.name || acc.accountName} (${acc.serialNo || acc.accountCode || 'Acc'})`,
                  value: acc.id,
                }))}
                disabled={readonly}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Transfer Amount (₹)"
              name="amount"
              rules={[
                { required: true, message: 'Please enter transfer amount' },
                {
                  validator: (_, val) =>
                    val && val > 0 ? Promise.resolve() : Promise.reject('Amount must be strictly positive'),
                },
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                disabled={readonly}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Attachment / Cheque / Ref" name="attachment">
              <Input
                prefix={<PaperClipOutlined />}
                placeholder="e.g. /docs/giro_slip_001.pdf"
                disabled={readonly}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Narration / Purpose" name="remark">
          <Input.TextArea rows={2} placeholder="Explain reason for contra transfer (e.g., Cash deposited to Bank)..." disabled={readonly} />
        </Form.Item>

        {/* Live Transfer Flow Preview */}
        {sourceAccountId && destinationAccountId && amount && amount > 0 && (
          <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f', marginTop: 8 }}>
            <Row align="middle" justify="space-between">
              <Col span={10}>
                <Space direction="vertical" size={2}>
                  <Text type="secondary"><Tag color="error">Cr Outflow</Tag> Source</Text>
                  <Text strong>{sourceAccount?.name || sourceAccount?.accountName || 'Source Account'}</Text>
                </Space>
              </Col>
              <Col span={4} style={{ textAlign: 'center' }}>
                <SwapOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div><Text strong style={{ color: '#52c41a' }}>₹ {Number(amount).toFixed(2)}</Text></div>
              </Col>
              <Col span={10} style={{ textAlign: 'right' }}>
                <Space direction="vertical" size={2}>
                  <Text type="secondary"><Tag color="success">Dr Inflow</Tag> Destination</Text>
                  <Text strong>{destAccount?.name || destAccount?.accountName || 'Destination Account'}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        )}
      </Form>
    </Modal>
  )
}
