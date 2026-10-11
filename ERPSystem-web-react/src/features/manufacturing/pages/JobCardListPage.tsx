import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  message,
  Descriptions,
  Badge,
  Tooltip,
  App,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  EyeOutlined,
  ReloadOutlined,
  DesktopOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { jobCardApi, JobCardDTO } from '../api/jobCardApi'
import { workstationApi, WorkstationDTO } from '../api/workstationApi'

export const JobCardListPage: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JobCardDTO[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filters
  const [searchNumber, setSearchNumber] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<JobCardDTO | null>(null)
  const [assignForm] = Form.useForm()

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailCard, setDetailCard] = useState<JobCardDTO | null>(null)

  const [workstations, setWorkstations] = useState<WorkstationDTO[]>([])

  const loadWorkstations = () => {
    workstationApi.allActive()
      .then((res: any) => {
        setWorkstations(res?.data || [])
      })
      .catch(() => {})
  }

  const loadData = () => {
    setLoading(true)
    jobCardApi.list({
      jobCardNumber: searchNumber || undefined,
      status: statusFilter || undefined,
      currentPage,
      pageSize,
    })
      .then((res: any) => {
        const payload = res?.data || res
        setData(payload?.rows || [])
        setTotal(payload?.total || 0)
      })
      .catch((err) => {
        message.error('Failed to load Job Cards: ' + (err.message || 'Unknown error'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadWorkstations()
  }, [])

  useEffect(() => {
    loadData()
  }, [currentPage, pageSize, searchNumber, statusFilter])

  const handleOpenAssign = (card: JobCardDTO) => {
    setSelectedCard(card)
    assignForm.setFieldsValue({
      workstationId: card.workstationId,
      operatorId: card.operatorId,
      toolMoldReference: card.toolMoldReference,
    })
    setAssignModalOpen(true)
  }

  const handleSaveAssign = () => {
    assignForm.validateFields().then((vals) => {
      if (!selectedCard?.id) return
      jobCardApi.assign({
        jobCardId: selectedCard.id,
        workstationId: vals.workstationId,
        operatorId: vals.operatorId,
        toolMoldReference: vals.toolMoldReference,
      })
        .then(() => {
          message.success('Workstation and Operator assigned successfully.')
          setAssignModalOpen(false)
          loadData()
        })
        .catch((err) => {
          message.error('Assignment failed: ' + (err.message || 'Unknown error.'))
        })
    })
  }

  const handleViewDetail = (id: number) => {
    jobCardApi.getById(id)
      .then((res: any) => {
        setDetailCard(res?.data || res)
        setDetailModalOpen(true)
      })
      .catch((err) => {
        message.error('Failed to fetch details: ' + (err.message || 'Error.'))
      })
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'READY':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>READY</Tag>
      case 'IN_PROGRESS':
        return <Tag color="processing" icon={<PlayCircleOutlined />}>IN PROGRESS</Tag>
      case 'PAUSED':
        return <Tag color="warning" icon={<PauseCircleOutlined />}>PAUSED</Tag>
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>COMPLETED</Tag>
      case 'CANCELLED':
        return <Tag color="default">CANCELLED</Tag>
      default:
        return <Tag color="default">PENDING</Tag>
    }
  }

  const totalCards = total
  const inProgressCount = data.filter((d) => d.status === 'IN_PROGRESS').length
  const pausedCount = data.filter((d) => d.status === 'PAUSED').length
  const completedCount = data.filter((d) => d.status === 'COMPLETED').length

  const columns = [
    {
      title: 'Job Card Number',
      dataIndex: 'jobCardNumber',
      key: 'jobCardNumber',
      width: 230,
      render: (text: string, record: JobCardDTO) => (
        <Space direction="vertical" size={2}>
          <a
            style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
            onClick={() => handleViewDetail(record.id!)}
          >
            {text}
          </a>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>WO: {record.workOrderNumber || record.workOrderId}</span>
        </Space>
      ),
    },
    {
      title: 'Sequence',
      dataIndex: 'operationSeq',
      key: 'operationSeq',
      width: 90,
      render: (seq: number) => <Tag color="geekblue">#{seq}</Tag>,
    },
    {
      title: 'Operation Name',
      dataIndex: 'operationName',
      key: 'operationName',
      width: 180,
      render: (name: string, record: JobCardDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.materialName && <div style={{ fontSize: 12, color: '#595959' }}>FG: {record.materialName}</div>}
        </div>
      ),
    },
    {
      title: 'Workstation',
      dataIndex: 'workstationName',
      key: 'workstationName',
      width: 160,
      render: (ws: string) => ws ? <Tag color="purple" icon={<ToolOutlined />}>{ws}</Tag> : <span style={{ color: '#bfbfbf' }}>Unassigned</span>,
    },
    {
      title: 'Operator',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 130,
      render: (op: string) => op ? <span>{op}</span> : <span style={{ color: '#bfbfbf' }}>Unassigned</span>,
    },
    {
      title: 'Planned Quantity',
      dataIndex: 'plannedQty',
      key: 'plannedQty',
      width: 110,
      render: (v: number) => Number(v || 0).toFixed(0),
    },
    {
      title: 'Good / Scrap Quantity',
      key: 'output',
      width: 140,
      render: (_: any, record: JobCardDTO) => (
        <Space>
          <span style={{ color: '#52c41a', fontWeight: 600 }}>{Number(record.completedQty || 0).toFixed(0)}</span>
          <span>/</span>
          <span style={{ color: Number(record.rejectedQty || 0) > 0 ? '#ff4d4f' : '#8c8c8c', fontWeight: 600 }}>
            {Number(record.rejectedQty || 0).toFixed(0)}
          </span>
        </Space>
      ),
    },
    {
      title: 'Actual Run Time',
      dataIndex: 'totalActualRunMins',
      key: 'totalActualRunMins',
      width: 120,
      render: (mins: number) => `${Number(mins || 0).toFixed(1)}m`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_: any, record: JobCardDTO) => (
        <Space size="small">
          <Tooltip title="View Job Card & Time Logs">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id!)} />
          </Tooltip>
          <Tooltip title="Assign Workstation / Operator">
            <Button
              size="small"
              icon={<ToolOutlined />}
              disabled={record.status === 'COMPLETED' || record.status === 'CANCELLED'}
              onClick={() => handleOpenAssign(record)}
            />
          </Tooltip>
          <Tooltip title="Open Execution Terminal">
            <Button
              size="small"
              type="primary"
              icon={<DesktopOutlined />}
              onClick={() => navigate(`/manufacturing/shop_floor?jobCardId=${record.id}`)}
            >
              Execute
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Metrics Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic title="Total Job Cards" value={totalCards} />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="In Progress"
              value={inProgressCount}
              valueStyle={{ color: '#1677ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="Paused / Stoppage"
              value={pausedCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<PauseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="Completed"
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Shop Floor Job Cards"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<DesktopOutlined />}
              style={{ backgroundColor: '#0958d9' }}
              onClick={() => navigate('/manufacturing/shop_floor')}
            >
              Shop Floor Kiosk Terminal
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="Search Job Card # or Work Order #"
              allowClear
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Status"
              allowClear
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'PENDING', value: 'PENDING' },
                { label: 'READY', value: 'READY' },
                { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
                { label: 'PAUSED', value: 'PAUSED' },
                { label: 'COMPLETED', value: 'COMPLETED' },
              ]}
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns as any}
          scroll={{ x: 1450 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setCurrentPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      {/* Assignment Modal */}
      <Modal
        title={`Assign Station & Operator — ${selectedCard?.jobCardNumber}`}
        open={assignModalOpen}
        onOk={handleSaveAssign}
        onCancel={() => setAssignModalOpen(false)}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="workstationId" label="Workstation">
            <Select
              placeholder="Select workstation"
              allowClear
              options={workstations.map((w) => ({
                label: `${w.workstationCode} — ${w.workstationName} (${w.workCenterType})`,
                value: w.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="operatorId" label="Operator ID">
            <Input placeholder="Enter Operator ID or Person ID" type="number" />
          </Form.Item>
          <Form.Item name="toolMoldReference" label="Tool / Mold Reference">
            <Input placeholder="e.g. MOLD-DIE-402, JIG-VMC-01" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail & History Modal */}
      <Modal
        title={`Job Card Details — ${detailCard?.jobCardNumber}`}
        open={detailModalOpen}
        onOk={() => setDetailModalOpen(false)}
        onCancel={() => setDetailModalOpen(false)}
        width={750}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="terminal"
            type="primary"
            icon={<DesktopOutlined />}
            onClick={() => {
              setDetailModalOpen(false)
              navigate(`/manufacturing/shop_floor?jobCardId=${detailCard?.id}`)
            }}
          >
            Launch in Terminal
          </Button>,
        ]}
      >
        {detailCard && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Work Order">{detailCard.workOrderNumber || detailCard.workOrderId}</Descriptions.Item>
              <Descriptions.Item label="Operation">{detailCard.operationSeq} — {detailCard.operationName}</Descriptions.Item>
              <Descriptions.Item label="Status">{getStatusTag(detailCard.status)}</Descriptions.Item>
              <Descriptions.Item label="Workstation">{detailCard.workstationName || 'Unassigned'}</Descriptions.Item>
              <Descriptions.Item label="Planned Quantity">{detailCard.plannedQty}</Descriptions.Item>
              <Descriptions.Item label="Good Quantity Produced">{detailCard.completedQty}</Descriptions.Item>
              <Descriptions.Item label="Scrap / Rejected Quantity">{detailCard.rejectedQty}</Descriptions.Item>
              <Descriptions.Item label="Actual Run Time">{detailCard.totalActualRunMins} mins</Descriptions.Item>
              <Descriptions.Item label="Total Downtime">{detailCard.totalActualDowntimeMins} mins</Descriptions.Item>
              <Descriptions.Item label="Tool / Mold">{detailCard.toolMoldReference || 'None'}</Descriptions.Item>
            </Descriptions>

            <h4>Execution Time Logs</h4>
            <Table
              size="small"
              rowKey="id"
              dataSource={detailCard.timeLogs || []}
              pagination={false}
              columns={[
                { title: 'Shift', dataIndex: 'shiftCode', width: 90 },
                { title: 'Type', dataIndex: 'logType', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                { title: 'Start', dataIndex: 'startTime', render: (t: string) => t ? new Date(t).toLocaleTimeString() : '-' },
                { title: 'End', dataIndex: 'endTime', render: (t: string) => t ? new Date(t).toLocaleTimeString() : <Badge status="processing" text="Active" /> },
                { title: 'Duration (Mins)', dataIndex: 'durationMinutes', width: 120 },
              ]}
              style={{ marginBottom: 16 }}
            />

            <h4>Scrap & Rejection Logs</h4>
            <Table
              size="small"
              rowKey="id"
              dataSource={detailCard.rejections || []}
              pagination={false}
              columns={[
                { title: 'Reason', dataIndex: 'rejectionReasonCode', render: (v: string) => <Tag color="error">{v}</Tag> },
                { title: 'Description', dataIndex: 'rejectionReasonDesc' },
                { title: 'Rejected Quantity', dataIndex: 'rejectedQty', width: 140, render: (q: number) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{q}</span> },
                { title: 'Logged At', dataIndex: 'loggedTime', render: (t: string) => t ? new Date(t).toLocaleTimeString() : '-' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
export default JobCardListPage
