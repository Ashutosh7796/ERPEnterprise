import React, { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Descriptions,
  Tag,
  Typography,
  message,
  Divider,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { salesApi } from '../api/salesApi'
import { CustomerCreditExposureDrawer } from './CustomerCreditExposureDrawer'

const { Text } = Typography
const { TextArea } = Input

interface SalesOrderApprovalModalProps {
  visible: boolean
  order?: {
    id: number
    orderNumber: string
    customerId: number
    customerName: string
    totalAmount: number
    status: string
  }
  onClose: () => void
  onSuccess: () => void
}

export const SalesOrderApprovalModal: React.FC<SalesOrderApprovalModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [creditDrawerVisible, setCreditDrawerVisible] = useState(false)

  if (!order) return null

  const handleApprove = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const res = await salesApi.approveSalesOrder(order.id, values.remarks)
      if (res.code === 200) {
        message.success('Sales Order approved successfully. Stock reserved.')
        onSuccess()
        onClose()
      } else {
        message.error(`Approval failed: ${res.data}`)
      }
    } catch (e: any) {
      if (e.errorFields) return
      message.error(`Error approving order: ${e.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      const values = await form.validateFields()
      if (!values.remarks) {
        message.warning('Please provide a justification reason for rejection.')
        return
      }
      setLoading(true)
      const res = await salesApi.rejectSalesOrder(order.id, values.remarks)
      if (res.code === 200) {
        message.success('Sales Order rejected.')
        onSuccess()
        onClose()
      } else {
        message.error(`Rejection failed: ${res.data}`)
      }
    } catch (e: any) {
      if (e.errorFields) return
      message.error(`Error rejecting order: ${e.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal
        title={
          <Space>
            <span>Sales Order Approval & Multi-Tier Review</span>
            <Tag color="blue">{order.orderNumber}</Tag>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={650}
        footer={[
          <Button key="cancel" onClick={onClose} disabled={loading}>
            Cancel
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseCircleOutlined />}
            loading={loading}
            onClick={handleReject}
          >
            Reject Order
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={loading}
            onClick={handleApprove}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Approve Order
          </Button>,
        ]}
      >
        <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Order Number">
            <Text strong>{order.orderNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="orange">{order.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            <Space>
              <span>{order.customerName}</span>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setCreditDrawerVisible(true)}
              >
                Credit Risk
              </Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ color: '#1677ff', fontSize: '15px' }}>
              ₹{(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <Form form={form} layout="vertical">
          <Form.Item
            name="remarks"
            label="Decision Justification / Approval Remarks"
            rules={[{ max: 500, message: 'Remarks cannot exceed 500 characters' }]}
          >
            <TextArea
              rows={4}
              placeholder="Enter approval notes or mandatory rejection justification..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <CustomerCreditExposureDrawer
        visible={creditDrawerVisible}
        customerId={order.customerId}
        currentOrderValue={order.totalAmount}
        onClose={() => setCreditDrawerVisible(false)}
      />
    </>
  )
}
