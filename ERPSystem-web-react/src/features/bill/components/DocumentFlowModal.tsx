import React, { useEffect, useState } from 'react'
import { Modal, Spin, Tag, Card, Row, Col, Typography, Empty, Button, Divider, Space } from 'antd'
import {
  BranchesOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  AccountBookOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { procurementApi, DocumentFlowDTO, DocumentNode } from '../api/procurementApi'

const { Text, Title } = Typography

interface DocumentFlowModalProps {
  open: boolean
  onClose: () => void
  docType: string
  docId?: number
  docNumber?: string
  onSelectDoc?: (docId: number) => void
}

export const DocumentFlowModal: React.FC<DocumentFlowModalProps> = ({
  open,
  onClose,
  docType,
  docId,
  docNumber,
  onSelectDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [flow, setFlow] = useState<DocumentFlowDTO | null>(null)

  const loadFlow = async () => {
    if (!docId) return
    setLoading(true)
    try {
      const res: any = await procurementApi.getDocumentFlow(docType || 'PURCHASE_REQUISITION', docId)
      if (res && res.data) {
        setFlow(res.data)
      } else if (res && res.nodes) {
        setFlow(res)
      } else {
        setFlow(null)
      }
    } catch (err) {
      console.error('Failed to load document flow:', err)
      setFlow(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && docId) {
      loadFlow()
    }
  }, [open, docId, docType])

  const getNodeIcon = (type: string) => {
    if (type.includes('REQUISITION') || type.includes('请购')) return <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
    if (type.includes('ORDER') || type.includes('订单')) return <ShoppingCartOutlined style={{ color: '#52c41a', fontSize: 20 }} />
    if (type.includes('INBOUND') || type.includes('DELIVERY') || type.includes('入库') || type.includes('出库')) return <InboxOutlined style={{ color: '#722ed1', fontSize: 20 }} />
    return <AccountBookOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
  }

  const getNodeColor = (type: string) => {
    if (type.includes('REQUISITION') || type.includes('请购')) return '#e6f7ff'
    if (type.includes('ORDER') || type.includes('订单')) return '#f6ffed'
    if (type.includes('INBOUND') || type.includes('DELIVERY') || type.includes('入库')) return '#f9f0ff'
    return '#fff7e6'
  }

  return (
    <Modal
      title={
        <Space>
          <BranchesOutlined style={{ color: '#1890ff' }} />
          <span>Lifecycle Document Flow & Traceability Matrix — {docNumber || `#${docId}`}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadFlow}>
          Refresh Flow
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div style={{ padding: '12px 0' }}>
        <Spin spinning={loading}>
          {!flow || !flow.nodes || flow.nodes.length === 0 ? (
            <Empty description="No connected document lineage found for this transaction." />
          ) : (
            <div>
              <div style={{ marginBottom: 16, background: '#fafafa', padding: 12, borderRadius: 6, border: '1px solid #f0f0f0' }}>
                <Text type="secondary">
                  <strong>Enterprise P2P Lineage:</strong> Visualizing bi-directional relationships, fulfillment commitments, and downstream invoices.
                </Text>
              </div>

              <Row gutter={[16, 16]}>
                {flow.nodes.map((node, index) => {
                  const isCurrent = node.docId === docId
                  return (
                    <React.Fragment key={node.id}>
                      <Col span={24}>
                        <Card
                          size="small"
                          style={{
                            borderRadius: 8,
                            border: isCurrent ? '2px solid #1890ff' : '1px solid #e8e8e8',
                            background: getNodeColor(node.docType),
                            boxShadow: isCurrent ? '0 2px 8px rgba(24, 144, 255, 0.15)' : 'none',
                          }}
                        >
                          <Row align="middle" justify="space-between">
                            <Col>
                              <Space size="middle" align="center">
                                {getNodeIcon(node.docType)}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Text strong style={{ fontSize: 15 }}>
                                      {node.docNumber}
                                    </Text>
                                    <Tag color={node.status === 'APPROVED' ? 'green' : 'orange'}>
                                      {node.status}
                                    </Tag>
                                    {isCurrent && <Tag color="blue">Current Selected</Tag>}
                                  </div>
                                  <div style={{ marginTop: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      Type: <strong>{node.docType.replace(/_/g, ' ')}</strong> | Date: {node.date || '-'} | Partner: {node.partnerName || 'Internal'}
                                    </Text>
                                  </div>
                                </div>
                              </Space>
                            </Col>

                            <Col>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#1890ff' }}>
                                  ₹{Number(node.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                {onSelectDoc && (
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0 }}
                                    onClick={() => {
                                      onSelectDoc(node.docId)
                                      onClose()
                                    }}
                                  >
                                    View Record ➔
                                  </Button>
                                )}
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>

                      {index < flow.nodes.length - 1 && (
                        <Col span={24} style={{ textAlign: 'center', margin: '-6px 0' }}>
                          <Space>
                            <ArrowRightOutlined style={{ transform: 'rotate(90deg)', color: '#8c8c8c', fontSize: 16 }} />
                            <Tag style={{ fontSize: 11, background: '#fff', borderColor: '#d9d9d9' }}>
                              {flow.edges[index]?.label || 'CONVERTED / FULFILLED'}
                            </Tag>
                          </Space>
                        </Col>
                      )}
                    </React.Fragment>
                  )
                })}
              </Row>
            </div>
          )}
        </Spin>
      </div>
    </Modal>
  )
}
