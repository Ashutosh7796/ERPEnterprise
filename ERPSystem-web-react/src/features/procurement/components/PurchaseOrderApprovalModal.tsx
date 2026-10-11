import React, { useState } from 'react'
import { Modal, Form, Input, Button, Radio, Typography, Alert, Space, Descriptions } from 'antd'
import { approvePurchaseOrder, rejectPurchaseOrder } from '../api/procurementApi'

const { Text } = Typography

interface Props {
  visible: boolean
  poId: number | null
  poNumber: string
  orderTotal: number
  creatorId: number
  currentUserId: number
  onClose: () => void
  onSuccess: () => void
}

export const PurchaseOrderApprovalModal: React.FC<Props> = ({
  visible,
  poId,
  poNumber,
  orderTotal,
  creatorId,
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE')

  const isSelfApproval = creatorId > 0 && creatorId === currentUserId

  const handleSubmit = async () => {
    if (!poId) return
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (action === 'APPROVE') {
        await approvePurchaseOrder(poId, values.comment)
      } else {
        await rejectPurchaseOrder(poId, values.reason)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      // Form validation error or API error handled
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`Purchase Order Approval Decision: ${poNumber}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type={action === 'APPROVE' ? 'primary' : 'primary'}
          danger={action === 'REJECT'}
          loading={loading}
          disabled={action === 'APPROVE' && isSelfApproval}
          onClick={handleSubmit}
        >
          {action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
        </Button>,
      ]}
    >
      <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="PO Number">{poNumber}</Descriptions.Item>
        <Descriptions.Item label="Total Amount (₹)">
          ₹{Number(orderTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Descriptions.Item>
      </Descriptions>

      {isSelfApproval && (
        <Alert
          type="warning"
          showIcon
          message="Segregation of Duties (SoD) Restriction"
          description="You are the creator of this Purchase Order. Strict policy prohibits self-approval. Another authorized manager must approve."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" initialValues={{ action: 'APPROVE' }}>
        <Form.Item label="Decision Action" required>
          <Radio.Group
            value={action}
            onChange={(e) => setAction(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="APPROVE" disabled={isSelfApproval}>
              Approve Order
            </Radio.Button>
            <Radio.Button value="REJECT">Reject Order</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {action === 'APPROVE' ? (
          <Form.Item name="comment" label="Approval Remarks (Optional)">
            <Input.TextArea rows={3} placeholder="Enter approval notes or budget allocation comments..." />
          </Form.Item>
        ) : (
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please specify reason for rejection' }]}
          >
            <Input.TextArea rows={3} placeholder="Specify why this purchase order is rejected..." />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
