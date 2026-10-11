import React, { useEffect, useState } from 'react'
import { Modal, Table, Tag, Typography, Spin, message, Space, Descriptions, Alert, Card, Row, Col, Statistic } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  DiffOutlined,
} from '@ant-design/icons'
import { evaluateThreeWayMatch, ThreeWayMatchResult, ThreeWayMatchItemComparison } from '../api/procurementApi'

const { Title, Text } = Typography

interface Props {
  visible: boolean
  poId: number | null
  poNumber: string
  grnId?: number
  onClose: () => void
}

export const ThreeWayMatchViewerModal: React.FC<Props> = ({
  visible,
  poId,
  poNumber,
  grnId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [matchResult, setMatchResult] = useState<ThreeWayMatchResult | null>(null)

  useEffect(() => {
    if (visible && poId) {
      fetchMatchEvaluation()
    }
  }, [visible, poId, grnId])

  const fetchMatchEvaluation = async () => {
    if (!poId) return
    setLoading(true)
    try {
      const res = await evaluateThreeWayMatch(poId, grnId)
      if (res.data?.data) {
        setMatchResult(res.data.data)
      } else {
        setMatchResult(null)
      }
    } catch (err: any) {
      message.error('Failed to evaluate Three-Way Match: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            PASS (MATCH VERIFIED)
          </Tag>
        )
      case 'WARNING':
        return (
          <Tag icon={<WarningOutlined />} color="warning">
            WARNING (PRICE/QTY VARIANCE WITHIN TOLERANCE)
          </Tag>
        )
      case 'BLOCK':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            BLOCK (MATCH FAILED — POSTING PROHIBITED)
          </Tag>
        )
      default:
        return <Tag color="default">{status}</Tag>
    }
  }

  const columns: TableColumnsType<ThreeWayMatchItemComparison> = [
    {
      title: 'Item ID',
      dataIndex: 'materialId',
      key: 'materialId',
      width: 110,
    },
    {
      title: 'PO Ordered Quantity',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      align: 'right',
      render: (v: number) => Number(v || 0).toFixed(2),
    },
    {
      title: 'GRN Accepted Quantity',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      align: 'right',
      render: (v: number) => <Text type="success">{Number(v || 0).toFixed(2)}</Text>,
    },
    {
      title: 'Invoiced Quantity',
      dataIndex: 'invoicedQuantity',
      key: 'invoicedQuantity',
      align: 'right',
      render: (v: number) => Number(v || 0).toFixed(2),
    },
    {
      title: 'PO Unit Rate (₹)',
      dataIndex: 'poUnitPrice',
      key: 'poUnitPrice',
      align: 'right',
      render: (v: number) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      title: 'Invoiced Unit Rate (₹)',
      dataIndex: 'invoicedUnitPrice',
      key: 'invoicedUnitPrice',
      align: 'right',
      render: (v: number) => `₹${Number(v || 0).toFixed(2)}`,
    },
    {
      title: 'Price Variance',
      dataIndex: 'priceVariancePercent',
      key: 'priceVariancePercent',
      align: 'right',
      render: (v: number) => {
        const num = Number(v || 0)
        const color = num === 0 ? 'text' : num > 0 ? 'danger' : 'secondary'
        return <Text type={color as any}>{num.toFixed(2)}%</Text>
      },
    },
    {
      title: 'Line Status',
      dataIndex: 'lineMatchStatus',
      key: 'lineMatchStatus',
      align: 'center',
      render: (st: string, record: ThreeWayMatchItemComparison) => (
        <Space orientation="vertical" size={2}>
          {getStatusBadge(st)}
          {record.lineRemarks && <Text type="secondary" style={{ fontSize: 12 }}>{record.lineRemarks}</Text>}
        </Space>
      ),
    },
  ]

  return (
    <Modal
      title={`Three-Way Match Verification: ${poNumber}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={950}
    >
      <Spin spinning={loading}>
        {matchResult && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {/* Status Alert Banner */}
            {matchResult.matchStatus === 'PASS' && (
              <Alert
                type="success"
                showIcon
                message="Three-Way Match Passed"
                description="Quantities and rates across Purchase Order, Goods Receipt Note, and Invoices are fully reconciled. Authorized for invoice posting."
              />
            )}

            {matchResult.matchStatus === 'WARNING' && (
              <Alert
                type="warning"
                showIcon
                message="Three-Way Match Warning (Tolerance Variance)"
                description={
                  <div>
                    <p>Price or quantity variance detected within permissible thresholds.</p>
                    {matchResult.warningReasons?.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                }
              />
            )}

            {matchResult.matchStatus === 'BLOCK' && (
              <Alert
                type="error"
                showIcon
                message="Three-Way Match BLOCKED"
                description={
                  <div>
                    <p>Invoice posting is strictly prohibited due to discrepancy errors:</p>
                    {matchResult.blockReasons?.map((r, i) => (
                      <div key={i} style={{ fontWeight: 600 }}>• {r}</div>
                    ))}
                  </div>
                }
              />
            )}

            {/* Financial Summary Cards */}
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total Expected Amount"
                    value={matchResult.totalExpectedAmount || 0}
                    precision={2}
                    prefix="₹"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total Billed Amount"
                    value={matchResult.totalBilledAmount || 0}
                    precision={2}
                    prefix="₹"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Price Variance"
                    value={matchResult.totalPriceVarianceAmount || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{
                      color: Number(matchResult.totalPriceVarianceAmount || 0) > 0 ? '#cf1322' : '#3f8600',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Line Items Comparator */}
            <Table
              columns={columns}
              dataSource={matchResult.itemComparisons || []}
              rowKey="poItemId"
              pagination={false}
              size="small"
              bordered
            />
          </Space>
        )}
      </Spin>
    </Modal>
  )
}
