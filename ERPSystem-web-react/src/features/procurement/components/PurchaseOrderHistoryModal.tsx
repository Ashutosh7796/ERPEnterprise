import React, { useEffect, useState } from 'react'
import { Modal, Timeline, Tag, Typography, Spin, message, Space, Empty } from 'antd'
import { getPoApprovalHistory, PoApprovalHistoryItem } from '../api/procurementApi'

const { Text } = Typography

interface Props {
  visible: boolean
  poId: number | null
  poNumber: string
  onClose: () => void
}

export const PurchaseOrderHistoryModal: React.FC<Props> = ({ visible, poId, poNumber, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<PoApprovalHistoryItem[]>([])

  useEffect(() => {
    if (visible && poId) {
      fetchHistory()
    }
  }, [visible, poId])

  const fetchHistory = async () => {
    if (!poId) return
    setLoading(true)
    try {
      const res = await getPoApprovalHistory(poId)
      if (res.data?.data) {
        setHistory(res.data.data)
      } else {
        setHistory([])
      }
    } catch (err: any) {
      message.error('Failed to load approval history: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const getActionTag = (action: string) => {
    switch (action) {
      case 'SUBMIT':
        return <Tag color="blue">SUBMITTED</Tag>
      case 'AUTO_APPROVE':
        return <Tag color="cyan">AUTO-APPROVED</Tag>
      case 'APPROVE':
        return <Tag color="green">APPROVED</Tag>
      case 'REJECT':
        return <Tag color="red">REJECTED</Tag>
      case 'CANCEL':
        return <Tag color="default">CANCELLED</Tag>
      default:
        return <Tag>{action}</Tag>
    }
  }

  return (
    <Modal
      title={`Approval Audit History: ${poNumber}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Spin spinning={loading}>
        {history.length === 0 ? (
          <Empty description="No approval history recorded yet" />
        ) : (
          <Timeline style={{ marginTop: 24 }}>
            {history.map((item) => (
              <Timeline.Item
                key={item.id}
                color={item.action === 'APPROVE' ? 'green' : item.action === 'REJECT' ? 'red' : 'blue'}
              >
                <Space orientation="vertical" size={2}>
                  <Space>
                    {getActionTag(item.action)}
                    <Text type="secondary">{item.createTime}</Text>
                  </Space>
                  <Text>
                    <strong>Approver / Actor:</strong> User #{item.actorUserId}
                  </Text>
                  {item.comment && (
                    <Text type="secondary" italic>
                      "{item.comment}"
                    </Text>
                  )}
                  <Text type="secondary">
                    Order Total: ₹{Number(item.orderTotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Space>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Spin>
    </Modal>
  )
}
