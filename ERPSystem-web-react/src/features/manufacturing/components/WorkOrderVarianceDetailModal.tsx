import React, { useEffect, useState } from 'react'
import { Modal, Descriptions, Tag, Table, Tabs, Spin, Alert, Row, Col, Card, Statistic, Badge } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { planVsActualApi, WorkOrderDetailVarianceDTO } from '../api/planVsActualApi'

interface Props {
  workOrderId: number | null
  visible: boolean
  onClose: () => void
}

export const WorkOrderVarianceDetailModal: React.FC<Props> = ({ workOrderId, visible, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WorkOrderDetailVarianceDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && workOrderId) {
      loadDetail(workOrderId)
    } else {
      setData(null)
      setError(null)
    }
  }, [visible, workOrderId])

  const loadDetail = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await planVsActualApi.getWorkOrderDetail(id)
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load work order variance details.')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  const wo = data?.workOrder

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'CLOSED':
        return 'success'
      case 'IN_PROGRESS':
        return 'processing'
      case 'CANCELLED':
        return 'default'
      default:
        return 'warning'
    }
  }

  const renderOperationsTab = () => {
    const columns = [
      {
        title: 'Seq',
        dataIndex: 'operationSeq',
        key: 'operationSeq',
        width: 60,
      },
      {
        title: 'Operation',
        dataIndex: 'operationName',
        key: 'operationName',
        render: (name: string, record: any) => (
          <span>
            <strong>{name}</strong>
            {record.isBottleneck && (
              <Tag color="red" icon={<ThunderboltOutlined />} style={{ marginLeft: 8 }}>
                Bottleneck (+{record.bottleneckPacingLossMins}m pacing loss)
              </Tag>
            )}
          </span>
        ),
      },
      {
        title: 'Workstation',
        dataIndex: 'workstationName',
        key: 'workstationName',
        render: (name: string, r: any) => name || r.workstationCode || 'Unassigned',
      },
      {
        title: 'Std Cycle (m)',
        dataIndex: 'standardCycleTimeMins',
        key: 'standardCycleTimeMins',
        width: 110,
        render: (v: number) => Number(v || 0).toFixed(2),
      },
      {
        title: 'Act Cycle (m)',
        dataIndex: 'actualCycleTimeMins',
        key: 'actualCycleTimeMins',
        width: 110,
        render: (v: number, r: any) => {
          const isHigh = r.cycleTimeVarianceMins > 0
          return (
            <span style={{ color: isHigh ? '#cf1322' : '#3f8600', fontWeight: isHigh ? 'bold' : 'normal' }}>
              {Number(v || 0).toFixed(2)}
              {isHigh ? ' ↑' : ''}
            </span>
          )
        },
      },
      {
        title: 'Cycle Var',
        dataIndex: 'cycleTimeVarianceMins',
        key: 'cycleTimeVarianceMins',
        width: 100,
        render: (v: number) => {
          const num = Number(v || 0)
          const color = num > 0 ? '#cf1322' : num < 0 ? '#3f8600' : 'inherit'
          return <span style={{ color }}>{num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2)}</span>
        },
      },
      {
        title: 'Good / Rej',
        key: 'output',
        width: 110,
        render: (_: any, r: any) => (
          <span>
            <span style={{ color: '#3f8600' }}>{Number(r.completedQty || 0).toFixed(0)}</span>
            {' / '}
            <span style={{ color: r.rejectedQty > 0 ? '#cf1322' : '#8c8c8c' }}>
              {Number(r.rejectedQty || 0).toFixed(0)}
            </span>
          </span>
        ),
      },
      {
        title: 'Run / Setup (m)',
        key: 'time',
        width: 130,
        render: (_: any, r: any) => (
          <span>
            {Number(r.actualRunTimeMins || 0).toFixed(0)}m / {Number(r.actualSetupTimeMins || 0).toFixed(0)}m
          </span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (st: string) => <Tag color={getStatusColor(st)}>{st}</Tag>,
      },
    ]

    return (
      <Table
        dataSource={data?.operations || []}
        columns={columns}
        rowKey="operationId"
        pagination={false}
        size="small"
        bordered
      />
    )
  }

  const renderJobCardsTab = () => {
    const columns = [
      {
        title: 'Job Card Number',
        dataIndex: 'jobCardNumber',
        key: 'jobCardNumber',
      },
      {
        title: 'Sequence',
        dataIndex: 'operationSeq',
        key: 'operationSeq',
        width: 75,
      },
      {
        title: 'Operation',
        dataIndex: 'operationName',
        key: 'operationName',
      },
      {
        title: 'Workstation',
        dataIndex: 'workstationName',
        key: 'workstationName',
        render: (name: string, r: any) => name || r.workstationCode || '-',
      },
      {
        title: 'Operator',
        dataIndex: 'operatorName',
        key: 'operatorName',
        render: (op: string) => op || 'Unassigned',
      },
      {
        title: 'Planned Quantity',
        dataIndex: 'plannedQty',
        key: 'plannedQty',
        width: 110,
        render: (v: number) => Number(v || 0).toFixed(0),
      },
      {
        title: 'Good Output Quantity',
        dataIndex: 'completedQty',
        key: 'completedQty',
        width: 120,
        render: (v: number) => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>{Number(v || 0).toFixed(0)}</span>,
      },
      {
        title: 'Rejected Quantity',
        dataIndex: 'rejectedQty',
        key: 'rejectedQty',
        width: 110,
        render: (v: number) => (
          <span style={{ color: v > 0 ? '#cf1322' : 'inherit' }}>{Number(v || 0).toFixed(0)}</span>
        ),
      },
      {
        title: 'Run (m)',
        dataIndex: 'totalActualRunMins',
        key: 'totalActualRunMins',
        width: 90,
        render: (v: number) => Number(v || 0).toFixed(1),
      },
      {
        title: 'Setup (m)',
        dataIndex: 'totalActualSetupMins',
        key: 'totalActualSetupMins',
        width: 90,
        render: (v: number) => Number(v || 0).toFixed(1),
      },
      {
        title: 'Downtime (m)',
        dataIndex: 'totalActualDowntimeMins',
        key: 'totalActualDowntimeMins',
        width: 100,
        render: (v: number) => (
          <span style={{ color: v > 0 ? '#d46b08' : 'inherit' }}>{Number(v || 0).toFixed(1)}</span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (st: string) => <Tag color={getStatusColor(st)}>{st}</Tag>,
      },
    ]

    return (
      <Table
        dataSource={data?.jobCards || []}
        columns={columns}
        rowKey="jobCardId"
        pagination={false}
        size="small"
        bordered
      />
    )
  }

  const renderMaterialsTab = () => {
    const columns = [
      {
        title: 'Component Item / Material',
        dataIndex: 'materialName',
        key: 'materialName',
        render: (name: string, r: any) => (
          <span>
            <strong>{name}</strong>
            {r.materialStandard && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>({r.materialStandard})</span>}
          </span>
        ),
      },
      {
        title: 'Unit',
        dataIndex: 'materialUnit',
        key: 'materialUnit',
        width: 70,
      },
      {
        title: 'Standard Required Quantity',
        dataIndex: 'standardRequiredQty',
        key: 'standardRequiredQty',
        width: 140,
        render: (v: number) => Number(v || 0).toFixed(2),
      },
      {
        title: 'Actual Issued Quantity',
        dataIndex: 'actualIssuedQty',
        key: 'actualIssuedQty',
        width: 130,
        render: (v: number) => Number(v || 0).toFixed(2),
      },
      {
        title: 'Actual Consumed Quantity',
        dataIndex: 'actualConsumedQty',
        key: 'actualConsumedQty',
        width: 140,
        render: (v: number) => Number(v || 0).toFixed(2),
      },
      {
        title: 'WIP Scrap Quantity',
        dataIndex: 'actualScrappedQty',
        key: 'actualScrappedQty',
        width: 130,
        render: (v: number) => (
          <span style={{ color: v > 0 ? '#cf1322' : 'inherit' }}>{Number(v || 0).toFixed(2)}</span>
        ),
      },
      {
        title: 'Usage Variance',
        dataIndex: 'usageVariance',
        key: 'usageVariance',
        width: 130,
        render: (v: number) => {
          const num = Number(v || 0)
          const color = num > 0 ? '#cf1322' : num < 0 ? '#3f8600' : 'inherit'
          return <span style={{ color, fontWeight: 'bold' }}>{num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2)}</span>
        },
      },
    ]

    return (
      <Table
        dataSource={data?.materials || []}
        columns={columns}
        rowKey="materialId"
        pagination={false}
        size="small"
        bordered
      />
    )
  }

  return (
    <Modal
      title={
        <span>
          Production Plan vs Actual Variance: <strong>{wo?.orderNumber || 'Work Order'}</strong>
          {wo?.status && (
            <Tag color={getStatusColor(wo.status)} style={{ marginLeft: 12 }}>
              {wo.status}
            </Tag>
          )}
          {wo?.isDelayed ? (
            <Tag color="error" icon={<ClockCircleOutlined />}>
              Delayed by {wo.delayDays} day{wo.delayDays > 1 ? 's' : ''}
            </Tag>
          ) : wo?.status === 'COMPLETED' ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Completed On-Time
            </Tag>
          ) : null}
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1050}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" description="Loading work order variance details..." />
        </div>
      ) : error ? (
        <Alert type="error" message={error} showIcon />
      ) : wo ? (
        <div>
          {/* Header Summary */}
          <Descriptions bordered size="small" column={{ xxl: 4, xl: 4, lg: 3, md: 2, sm: 1, xs: 1 }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Finished Item">
              <strong>{wo.materialName}</strong>
              {wo.materialStandard && ` (${wo.materialStandard})`}
            </Descriptions.Item>
            <Descriptions.Item label="Warehouse">{wo.depotName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Production Plan">{wo.productionPlanNumber || 'Manual Release'}</Descriptions.Item>
            <Descriptions.Item label="Operations Count">{wo.operationCount || 0} operations</Descriptions.Item>
            <Descriptions.Item label="Planned Start Date">{wo.plannedStartDate ? String(wo.plannedStartDate).substring(0, 10) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Planned Due Date">{wo.plannedDueDate ? String(wo.plannedDueDate).substring(0, 10) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Actual Start Date">{wo.actualStartDate ? String(wo.actualStartDate).substring(0, 16) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Actual Completion Date">{wo.actualCompletionDate ? String(wo.actualCompletionDate).substring(0, 16) : 'In Progress'}</Descriptions.Item>
          </Descriptions>

          {/* KPI Variance Cards */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic
                  title="Output Quantity Fulfillment"
                  value={wo.completedQty}
                  suffix={`/ ${wo.plannedQty} ${wo.materialUnit || 'PCS'}`}
                  valueStyle={{ color: '#389e0d', fontSize: 18 }}
                />
                <div style={{ fontSize: 12, marginTop: 4, color: wo.quantityVariance < 0 ? '#cf1322' : '#389e0d' }}>
                  Variance: {wo.quantityVariance > 0 ? `+${wo.quantityVariance}` : wo.quantityVariance} ({wo.fulfillmentPct}%)
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#fff2e8', borderColor: '#ffbb96' }}>
                <Statistic
                  title="Scrap vs Planned Allowance"
                  value={wo.actualScrapQty}
                  suffix={`/ ${wo.plannedScrapQty} scrap allowance`}
                  valueStyle={{ color: wo.scrapVariance > 0 ? '#cf1322' : '#d46b08', fontSize: 18 }}
                />
                <div style={{ fontSize: 12, marginTop: 4, color: wo.scrapVariance > 0 ? '#cf1322' : '#389e0d' }}>
                  Variance: {wo.scrapVariance > 0 ? `+${wo.scrapVariance}` : wo.scrapVariance}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                <Statistic
                  title="Run Time Variance"
                  value={wo.actualRunMins}
                  suffix={`/ ${wo.standardRunMins} std mins`}
                  valueStyle={{ color: wo.runTimeVarianceMins > 0 ? '#cf1322' : '#096dd9', fontSize: 18 }}
                />
                <div style={{ fontSize: 12, marginTop: 4, color: wo.runTimeVarianceMins > 0 ? '#cf1322' : '#389e0d' }}>
                  Variance: {wo.runTimeVarianceMins > 0 ? `+${wo.runTimeVarianceMins}` : wo.runTimeVarianceMins} mins
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                <Statistic
                  title="Setup Time Variance"
                  value={wo.actualSetupMins}
                  suffix={`/ ${wo.standardSetupMins} std mins`}
                  valueStyle={{ color: wo.setupVarianceMins > 0 ? '#cf1322' : '#722ed1', fontSize: 18 }}
                />
                <div style={{ fontSize: 12, marginTop: 4, color: wo.setupVarianceMins > 0 ? '#cf1322' : '#389e0d' }}>
                  Variance: {wo.setupVarianceMins > 0 ? `+${wo.setupVarianceMins}` : wo.setupVarianceMins} mins
                </div>
              </Card>
            </Col>
          </Row>

          {/* Multi-tier drill-down tabs */}
          <Tabs
            defaultActiveKey="operations"
            items={[
              {
                key: 'operations',
                label: `Routing Operations (${data?.operations?.length || 0})`,
                children: renderOperationsTab(),
              },
              {
                key: 'jobcards',
                label: `Job Cards & Execution (${data?.jobCards?.length || 0})`,
                children: renderJobCardsTab(),
              },
              {
                key: 'materials',
                label: `Bill of Materials & WIP Consumption (${data?.materials?.length || 0})`,
                children: renderMaterialsTab(),
              },
            ]}
          />
        </div>
      ) : null}
    </Modal>
  )
}
