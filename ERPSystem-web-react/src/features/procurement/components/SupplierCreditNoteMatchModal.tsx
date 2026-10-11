import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, DatePicker, Row, Col, Typography, Card, Tag, Alert, message } from 'antd'
import { ReconciliationOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { reconcileSupplierCreditNote, type ProcurementReturn, type SupplierCreditNoteMatchRequest } from '../api/procurementApi'

const { Text, Title } = Typography

interface SupplierCreditNoteMatchModalProps {
  visible: boolean
  returnDoc: ProcurementReturn | null
  onClose: () => void
  onSuccess: () => void
}

export const SupplierCreditNoteMatchModal: React.FC<SupplierCreditNoteMatchModalProps> = ({
  visible,
  returnDoc,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [gstr2bTaxable, setGstr2bTaxable] = useState<number>(0)

  useEffect(() => {
    if (returnDoc) {
      const taxable = returnDoc.taxableAmount || 0
      setGstr2bTaxable(taxable)
      form.setFieldsValue({
        supplierCreditNoteNumber: returnDoc.supplierCreditNoteNumber || '',
        supplierCreditNoteDate: returnDoc.supplierCreditNoteDate ? dayjs(returnDoc.supplierCreditNoteDate) : dayjs(),
        supplierGstin: '27AAAAA0000A1Z5',
        gstr2bTaxableValue: taxable,
        gstr2bCgstAmount: returnDoc.cgstAmount || 0,
        gstr2bSgstAmount: returnDoc.sgstAmount || 0,
        gstr2bIgstAmount: returnDoc.igstAmount || 0,
        remarks: 'Matched against GSTR-2B Table 4B(2)',
      })
    }
  }, [returnDoc, form])

  if (!returnDoc) return null

  const internalTaxable = returnDoc.taxableAmount || 0
  const diff = Math.abs(internalTaxable - gstr2bTaxable)
  const isMatch = diff <= 1.0 // Within ₹1.00 tolerance

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload: SupplierCreditNoteMatchRequest = {
        returnId: returnDoc.id,
        supplierCreditNoteNumber: values.supplierCreditNoteNumber,
        supplierCreditNoteDate: values.supplierCreditNoteDate.format('YYYY-MM-DD'),
        supplierGstin: values.supplierGstin,
        gstr2bTaxableValue: values.gstr2bTaxableValue,
        gstr2bCgstAmount: values.gstr2bCgstAmount,
        gstr2bSgstAmount: values.gstr2bSgstAmount,
        gstr2bIgstAmount: values.gstr2bIgstAmount,
        remarks: values.remarks,
      }

      await reconcileSupplierCreditNote(returnDoc.id, payload)
      message.success('Purchase Return matched with Supplier Credit Note successfully.')
      onSuccess()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err.message || 'Failed to reconcile Supplier Credit Note.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReconciliationOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>GSTR-2B Supplier Credit Note 2-Way Reconciliation</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Confirm & Match Credit Note"
      width={750}
    >
      <Alert
        message="Statutory Legal Authority (Section 34(1))"
        description="The Supplier Credit Note is the statutory tax document. Reconciling it against the internal Commercial Purchase Return document formalizes the permanent ITC reversal in GSTR-3B Table 4(B)(2)."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">Return Document No:</Text> <Text strong>{returnDoc.returnNumber}</Text><br />
            <Text type="secondary">Supplier:</Text> <Text strong>{returnDoc.supplierName}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Internal Taxable Amount:</Text> <Text strong>₹{internalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text><br />
            <Text type="secondary">Total Return Value:</Text> <Text strong>₹{(returnDoc.totalReturnAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </Col>
        </Row>
      </Card>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="supplierCreditNoteNumber"
              label="Supplier Credit Note Number (u/s 34(1))"
              rules={[{ required: true, message: 'Please enter Credit Note number' }]}
            >
              <Input placeholder="e.g. CN-2026-0042" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplierCreditNoteDate"
              label="Credit Note Date"
              rules={[{ required: true, message: 'Please select Credit Note date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="supplierGstin"
              label="Supplier GSTIN"
              rules={[{ required: true, message: 'Please enter Supplier GSTIN' }]}
            >
              <Input placeholder="e.g. 27AAAAA0000A1Z5" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="gstr2bTaxableValue"
              label="GSTR-2B Taxable Value (₹)"
              rules={[{ required: true, message: 'Please enter taxable value' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                onChange={(val) => setGstr2bTaxable(val || 0)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="gstr2bCgstAmount" label="CGST Amount (₹)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="gstr2bSgstAmount" label="SGST Amount (₹)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="gstr2bIgstAmount" label="IGST Amount (₹)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remarks" label="Reconciliation Remarks">
          <Input.TextArea rows={2} placeholder="Optional reconciliation notes..." />
        </Form.Item>

        <Card size="small" style={{ background: isMatch ? '#f6ffed' : '#fff2f0', borderColor: isMatch ? '#b7eb8f' : '#ffccc7' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong>Variance Assessment: </Text>
              {isMatch ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>MATCHED (Diff: ₹{diff.toFixed(2)} ≤ ₹1.00 tolerance)</Tag>
              ) : (
                <Tag color="error" icon={<ExclamationCircleOutlined />}>VARIANCE DETECTED (Diff: ₹{diff.toFixed(2)} &gt; ₹1.00 tolerance)</Tag>
              )}
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  )
}
