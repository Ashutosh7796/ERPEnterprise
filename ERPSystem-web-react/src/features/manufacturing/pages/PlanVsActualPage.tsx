import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Button,
  Table,
  Tag,
  Progress,
  Statistic,
  Space,
  Alert,
  message,
  Tabs,
  Badge,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  LineChartOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  AuditOutlined,
  EyeOutlined,
  CalendarOutlined,
  AlertOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import {
  planVsActualApi,
  PlanVsActualDashboardResponse,
  WorkOrderVarianceDTO,
  OperationVarianceDTO,
  ShiftVarianceDTO,
} from '../api/planVsActualApi'
import { WorkOrderVarianceDetailModal } from '../components/WorkOrderVarianceDetailModal'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export const PlanVsActualPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [dashboardData, setDashboardData] = useState<PlanVsActualDashboardResponse | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ])
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedShift, setSelectedShift] = useState<string>('ALL')
  const [drillDownWoId, setDrillDownWoId] = useState<number | null>(null)
  const [drillDownVisible, setDrillDownVisible] = useState<boolean>(false)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await planVsActualApi.getDashboard({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        shiftCode: selectedShift === 'ALL' ? undefined : selectedShift,
      })
      setDashboardData(res)
    } catch (err: any) {
      message.error(err?.message || 'Failed to load production plan vs actual analytics data.')
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedStatus, selectedShift])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const summary = dashboardData?.summary
  const workOrders = dashboardData?.workOrderVariances || []
  const operations = dashboardData?.operationVariances || []
  const shifts = dashboardData?.shiftVariances || []
  const bottlenecks = dashboardData?.bottlenecks || []

  const handleOpenDrillDown = (id: number) => {
    setDrillDownWoId(id)
    setDrillDownVisible(true)
  }

  // Shift Output & Rejection Chart
  const shiftChartOption = useMemo(() => {
    if (!shifts || shifts.length === 0) return {}

    const shiftNames = shifts.map((s) => s.shiftName)
    const goodData = shifts.map((s) => s.actualGoodQty)
    const rejData = shifts.map((s) => s.actualRejectedQty)
    const rejRateData = shifts.map((s) => s.rejectionRatePct)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Good Output', 'Rejected Output', 'Rejection Rate %'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: shiftNames,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Quantity (PCS)',
        },
        {
          type: 'value',
          name: 'Rejection Rate %',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value} %' },
        },
      ],
      series: [
        {
          name: 'Good Output',
          type: 'bar',
          stack: 'output',
          data: goodData,
          itemStyle: { color: '#52c41a' },
        },
        {
          name: 'Rejected Output',
          type: 'bar',
          stack: 'output',
          data: rejData,
          itemStyle: { color: '#ff4d4f' },
        },
        {
          name: 'Rejection Rate %',
          type: 'line',
          yAxisIndex: 1,
          data: rejRateData,
          itemStyle: { color: '#fa8c16' },
          lineStyle: { width: 3 },
          symbol: 'circle',
          symbolSize: 8,
        },
      ],
    }
  }, [shifts])

  // Operation Cycle Time Comparison Chart
  const operationChartOption = useMemo(() => {
    if (!operations || operations.length === 0) return {}

    // Take top 10 operations with highest pacing delay or duration
    const sorted = [...operations]
      .sort((a, b) => (b.actualCycleTimeMins - b.standardCycleTimeMins) - (a.actualCycleTimeMins - a.standardCycleTimeMins))
      .slice(0, 10)

    const labels = sorted.map((op) => `${op.orderNumber} - ${op.operationName} (Seq ${op.operationSeq})`)
    const stdData = sorted.map((op) => Number(op.standardCycleTimeMins || 0).toFixed(2))
    const actData = sorted.map((op) => Number(op.actualCycleTimeMins || 0).toFixed(2))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Standard Cycle Time (m)', 'Actual Cycle Time (m)'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '4%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Minutes per Piece',
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
      },
      series: [
        {
          name: 'Standard Cycle Time (m)',
          type: 'bar',
          data: stdData,
          itemStyle: { color: '#1890ff' },
        },
        {
          name: 'Actual Cycle Time (m)',
          type: 'bar',
          data: actData,
          itemStyle: {
            color: (params: any) => {
              const op = sorted[params.dataIndex]
              return op.isBottleneck ? '#cf1322' : '#faad14'
            },
          },
        },
      ],
    }
  }, [operations])

  // Work Order Columns
  const woColumns: ColumnsType<WorkOrderVarianceDTO> = [
    {
      title: 'Work Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      fixed: 'left',
      width: 140,
      render: (num: string, record: WorkOrderVarianceDTO) => (
        <a onClick={() => handleOpenDrillDown(record.workOrderId)} style={{ fontWeight: 600 }}>
          {num}
        </a>
      ),
    },
    {
      title: 'Finished Item',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 180,
      render: (name: string, record: WorkOrderVarianceDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.materialStandard && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.materialStandard}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      width: 140,
      render: (name: string) => name || '-',
    },
    {
      title: 'Planned Quantity',
      dataIndex: 'plannedQty',
      key: 'plannedQty',
      width: 120,
      align: 'right',
      render: (v: number, r: WorkOrderVarianceDTO) => `${Number(v || 0).toFixed(0)} ${r.materialUnit || ''}`,
    },
    {
      title: 'Completed Good Quantity',
      dataIndex: 'completedQty',
      key: 'completedQty',
      width: 130,
      align: 'right',
      render: (v: number) => (
        <span style={{ color: '#3f8600', fontWeight: 'bold' }}>{Number(v || 0).toFixed(0)}</span>
      ),
    },
    {
      title: 'Quantity Variance',
      dataIndex: 'quantityVariance',
      key: 'quantityVariance',
      width: 120,
      align: 'right',
      render: (v: number, r: WorkOrderVarianceDTO) => {
        const num = Number(v || 0)
        const color = num < 0 ? '#cf1322' : num > 0 ? '#3f8600' : 'inherit'
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {num > 0 ? `+${num.toFixed(0)}` : num.toFixed(0)} ({r.fulfillmentPct}%)
          </span>
        )
      },
    },
    {
      title: 'Scrap vs Planned Allowance',
      key: 'scrap',
      width: 160,
      render: (_: any, r: WorkOrderVarianceDTO) => {
        const isExcess = r.scrapVariance > 0
        return (
          <div>
            <span style={{ color: isExcess ? '#cf1322' : '#595959', fontWeight: isExcess ? 'bold' : 'normal' }}>
              {Number(r.actualScrapQty || 0).toFixed(0)} / {Number(r.plannedScrapQty || 0).toFixed(0)}
            </span>
            {isExcess && (
              <Tag color="error" style={{ marginLeft: 6, fontSize: 10 }}>
                +{Number(r.scrapVariance).toFixed(0)} excess
              </Tag>
            )}
          </div>
        )
      },
    },
    {
      title: 'Actual vs Standard Run Time',
      key: 'runTime',
      width: 150,
      render: (_: any, r: WorkOrderVarianceDTO) => {
        const diff = Number(r.runTimeVarianceMins || 0)
        const isHigh = diff > 0
        return (
          <span>
            {Number(r.actualRunMins || 0).toFixed(0)}m / {Number(r.standardRunMins || 0).toFixed(0)}m
            <span style={{ color: isHigh ? '#cf1322' : '#3f8600', marginLeft: 4, fontSize: 11 }}>
              ({diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}m)
            </span>
          </span>
        )
      },
    },
    {
      title: 'Planned Due Date',
      dataIndex: 'plannedDueDate',
      key: 'plannedDueDate',
      width: 110,
      render: (d: string) => (d ? String(d).substring(0, 10) : '-'),
    },
    {
      title: 'Schedule Status',
      key: 'schedule',
      width: 140,
      render: (_: any, r: WorkOrderVarianceDTO) => {
        if (r.isDelayed) {
          return (
            <Tag color="error" icon={<ClockCircleOutlined />}>
              +{r.delayDays}d Overdue
            </Tag>
          )
        }
        if (r.status === 'COMPLETED' || r.status === 'CLOSED') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              On-Time
            </Tag>
          )
        }
        return <Tag color="blue">On-Track</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st: string) => {
        let color = 'default'
        if (st === 'COMPLETED' || st === 'CLOSED') color = 'success'
        if (st === 'IN_PROGRESS') color = 'processing'
        if (st === 'CANCELLED') color = 'default'
        return <Tag color={color}>{st}</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_: any, record: WorkOrderVarianceDTO) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDrillDown(record.workOrderId)}
        >
          View Variance Details
        </Button>
      ),
    },
  ]

  // Operation Columns
  const opColumns: ColumnsType<OperationVarianceDTO> = [
    {
      title: 'Work Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 130,
      render: (num: string, r: OperationVarianceDTO) => (
        <a onClick={() => handleOpenDrillDown(r.workOrderId)}>{num}</a>
      ),
    },
    {
      title: 'Sequence',
      dataIndex: 'operationSeq',
      key: 'operationSeq',
      width: 60,
    },
    {
      title: 'Operation Name',
      dataIndex: 'operationName',
      key: 'operationName',
      render: (name: string, r: OperationVarianceDTO) => (
        <span>
          <strong>{name}</strong>
          {r.isBottleneck && (
            <Tag color="red" icon={<ThunderboltOutlined />} style={{ marginLeft: 8 }}>
              Bottleneck (+{r.bottleneckPacingLossMins}m pacing loss)
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Work Center',
      dataIndex: 'workCenterType',
      key: 'workCenterType',
      width: 110,
    },
    {
      title: 'Workstation',
      dataIndex: 'workstationName',
      key: 'workstationName',
      width: 130,
      render: (name: string, r: any) => name || r.workstationCode || '-',
    },
    {
      title: 'Standard Cycle Time (mins)',
      dataIndex: 'standardCycleTimeMins',
      key: 'standardCycleTimeMins',
      width: 140,
      align: 'right',
      render: (v: number) => Number(v || 0).toFixed(2),
    },
    {
      title: 'Actual Cycle Time (mins)',
      dataIndex: 'actualCycleTimeMins',
      key: 'actualCycleTimeMins',
      width: 140,
      align: 'right',
      render: (v: number, r: OperationVarianceDTO) => {
        const isHigh = r.cycleTimeVarianceMins > 0
        return (
          <span style={{ color: isHigh ? '#cf1322' : '#3f8600', fontWeight: isHigh ? 'bold' : 'normal' }}>
            {Number(v || 0).toFixed(2)}
          </span>
        )
      },
    },
    {
      title: 'Cycle Time Variance (mins)',
      dataIndex: 'cycleTimeVarianceMins',
      key: 'cycleTimeVarianceMins',
      width: 140,
      align: 'right',
      render: (v: number) => {
        const num = Number(v || 0)
        const color = num > 0 ? '#cf1322' : num < 0 ? '#3f8600' : 'inherit'
        return <span style={{ color }}>{num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2)}</span>
      },
    },
    {
      title: 'Good / Rejected Qty',
      key: 'qty',
      width: 130,
      render: (_: any, r: OperationVarianceDTO) => (
        <span>
          <span style={{ color: '#3f8600' }}>{Number(r.completedQty || 0).toFixed(0)}</span>
          {' / '}
          <span style={{ color: r.rejectedQty > 0 ? '#cf1322' : 'inherit' }}>
            {Number(r.rejectedQty || 0).toFixed(0)}
          </span>
        </span>
      ),
    },
    {
      title: 'Total Time (mins)',
      key: 'totalTime',
      width: 130,
      render: (_: any, r: OperationVarianceDTO) => (
        <span>
          {Number(r.actualTotalMins || 0).toFixed(0)}m / {Number(r.plannedTotalMins || 0).toFixed(0)}m
        </span>
      ),
    },
  ]

  // Shift Columns
  const shiftColumns: ColumnsType<ShiftVarianceDTO> = [
    {
      title: 'Shift Code',
      dataIndex: 'shiftCode',
      key: 'shiftCode',
      width: 120,
    },
    {
      title: 'Shift Name & Window',
      dataIndex: 'shiftName',
      key: 'shiftName',
      render: (name: string, r: ShiftVarianceDTO) => (
        <div>
          <strong>{name}</strong>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.shiftWindow}</div>
        </div>
      ),
    },
    {
      title: 'Good Output',
      dataIndex: 'actualGoodQty',
      key: 'actualGoodQty',
      align: 'right',
      render: (v: number) => (
        <span style={{ color: '#3f8600', fontWeight: 'bold' }}>{Number(v || 0).toFixed(0)} PCS</span>
      ),
    },
    {
      title: 'Rejected Quantity',
      dataIndex: 'actualRejectedQty',
      key: 'actualRejectedQty',
      align: 'right',
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#cf1322' : 'inherit' }}>{Number(v || 0).toFixed(0)} PCS</span>
      ),
    },
    {
      title: 'Rejection Rate %',
      dataIndex: 'rejectionRatePct',
      key: 'rejectionRatePct',
      align: 'right',
      render: (v: number) => (
        <span style={{ color: v > 5 ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
          {Number(v || 0).toFixed(2)}%
        </span>
      ),
    },
    {
      title: 'Logged Run Time',
      dataIndex: 'actualRunMins',
      key: 'actualRunMins',
      align: 'right',
      render: (v: number) => `${Number(v || 0).toFixed(0)} mins`,
    },
    {
      title: 'Logged Setup Time',
      dataIndex: 'actualSetupMins',
      key: 'actualSetupMins',
      align: 'right',
      render: (v: number) => `${Number(v || 0).toFixed(0)} mins`,
    },
    {
      title: 'Time Log Entries',
      dataIndex: 'logCount',
      key: 'logCount',
      align: 'right',
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                <LineChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Production Plan vs Actual Variance
              </Title>
              <Text type="secondary">
                Operational Variance Analysis for Quantities, Cycle Times, Schedules, and Shift Execution
              </Text>
            </Space>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchDashboard} loading={loading}>
              Refresh Analytics
            </Button>
          </Col>
        </Row>
      </div>

      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Date Range</Text>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Work Order Status</Text>
            <Select value={selectedStatus} onChange={setSelectedStatus} style={{ width: '100%' }}>
              <Option value="ALL">All Statuses</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="CONFIRMED">Confirmed</Option>
              <Option value="IN_PROGRESS">In Progress</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Shift</Text>
            <Select value={selectedShift} onChange={setSelectedShift} style={{ width: '100%' }}>
              <Option value="ALL">All Shifts</Option>
              <Option value="MORNING">Morning Shift</Option>
              <Option value="EVENING">Evening Shift</Option>
              <Option value="NIGHT">Night Shift</Option>
              <Option value="GENERAL">General Shift</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={10} style={{ textAlign: 'right', marginTop: 18 }}>
            <Text type="secondary">
              Summary: {workOrders.length} Work Orders | {operations.length} Operations | {bottlenecks.length} Bottlenecks Detected
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Bottleneck Warning Alert if bottlenecks exist */}
      {bottlenecks.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<AlertOutlined />}
          message={
            <span>
              <strong>Operational Bottlenecks Detected:</strong> {bottlenecks.length} operation(s) are currently pacing below standard cycle times, creating shop floor pacing loss.
            </span>
          }
          description={
            <div style={{ marginTop: 4 }}>
              Top Bottleneck: <strong>{bottlenecks[0].orderNumber} - {bottlenecks[0].operationName}</strong> at workstation{' '}
              <strong>{bottlenecks[0].workstationName || bottlenecks[0].workstationCode}</strong> (Actual: {bottlenecks[0].actualCycleTimeMins}m vs Std: {bottlenecks[0].standardCycleTimeMins}m, Pacing Loss: +{bottlenecks[0].bottleneckPacingLossMins}m).
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Top 4 KPI Variance Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Quantity Fulfillment Rate"
              value={summary?.fulfillmentRatePct || 0}
              suffix="%"
              precision={2}
              valueStyle={{ color: (summary?.fulfillmentRatePct || 0) >= 90 ? '#3f8600' : '#cf1322', fontSize: 24, fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={Number(summary?.fulfillmentRatePct || 0)}
              size="small"
              status={(summary?.fulfillmentRatePct || 0) >= 90 ? 'success' : 'exception'}
              style={{ marginTop: 8 }}
            />
            <div style={{ fontSize: 12, marginTop: 6, color: '#595959' }}>
              Good: <strong>{Number(summary?.totalActualGoodQty || 0).toFixed(0)}</strong> / Planned: <strong>{Number(summary?.totalPlannedQty || 0).toFixed(0)}</strong> (Var: {Number(summary?.quantityVariance || 0).toFixed(0)})
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="On-Time Delivery (OTD)"
              value={summary?.onTimeDeliveryRatePct || 100}
              suffix="%"
              precision={2}
              valueStyle={{ color: (summary?.onTimeDeliveryRatePct || 100) >= 90 ? '#3f8600' : '#cf1322', fontSize: 24, fontWeight: 700 }}
              prefix={<ClockCircleOutlined />}
            />
            <Progress
              percent={Number(summary?.onTimeDeliveryRatePct || 100)}
              size="small"
              status={(summary?.onTimeDeliveryRatePct || 100) >= 90 ? 'success' : 'exception'}
              style={{ marginTop: 8 }}
            />
            <div style={{ fontSize: 12, marginTop: 6, color: '#595959' }}>
              Delayed Orders: <strong style={{ color: (summary?.delayedWorkOrdersCount || 0) > 0 ? '#cf1322' : 'inherit' }}>{summary?.delayedWorkOrdersCount || 0}</strong> / Completed: <strong>{summary?.completedWorkOrdersCount || 0}</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Run Time Variance"
              value={summary?.runTimeVarianceMins || 0}
              suffix="mins"
              precision={1}
              valueStyle={{ color: (summary?.runTimeVarianceMins || 0) > 0 ? '#cf1322' : '#3f8600', fontSize: 24, fontWeight: 700 }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 12, color: '#595959' }}>
              Actual Run: <strong>{Number(summary?.totalActualRunMins || 0).toFixed(0)}m</strong> vs Std: <strong>{Number(summary?.totalStandardRunMins || 0).toFixed(0)}m</strong>
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#595959' }}>
              Setup Variance: <strong>{Number(summary?.setupTimeVarianceMins || 0).toFixed(0)}m</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Scrap Variance vs Planned Allowance"
              value={summary?.scrapVariance || 0}
              suffix="PCS"
              precision={1}
              valueStyle={{ color: (summary?.scrapVariance || 0) > 0 ? '#cf1322' : '#3f8600', fontSize: 24, fontWeight: 700 }}
              prefix={<WarningOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 12, color: '#595959' }}>
              Actual Rejection: <strong>{Number(summary?.totalActualScrapQty || 0).toFixed(0)}</strong> / Allowance: <strong>{Number(summary?.totalPlannedScrapQty || 0).toFixed(0)}</strong>
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#595959' }}>
              Plant Scrap Rate: <strong>{Number(summary?.scrapRatePct || 0).toFixed(2)}%</strong>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          defaultActiveKey="orders"
          items={[
            {
              key: 'orders',
              label: (
                <span>
                  <AuditOutlined /> Work Order Variances ({workOrders.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={workOrders}
                  columns={woColumns}
                  rowKey="workOrderId"
                  loading={loading}
                  pagination={{ pageSize: 15, showTotal: (t) => `Total ${t} Work Orders` }}
                  scroll={{ x: 1300 }}
                  size="small"
                />
              ),
            },
            {
              key: 'operations',
              label: (
                <span>
                  <ThunderboltOutlined /> Operation & Bottleneck Analysis ({operations.length})
                </span>
              ),
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Card size="small" title="Operation Cycle Time Comparison (Standard vs Actual)" style={{ marginBottom: 16 }}>
                        <ReactECharts option={operationChartOption} style={{ height: 320 }} />
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    dataSource={operations}
                    columns={opColumns}
                    rowKey="operationId"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 1200 }}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'shifts',
              label: (
                <span>
                  <CalendarOutlined /> Shift Variance & Rejection Trends ({shifts.length})
                </span>
              ),
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Card size="small" title="Shift Output and Rejection Quality Analysis" style={{ marginBottom: 16 }}>
                        <ReactECharts option={shiftChartOption} style={{ height: 320 }} />
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    dataSource={shifts}
                    columns={shiftColumns}
                    rowKey="shiftCode"
                    loading={loading}
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 4-Tier Drill-down modal */}
      <WorkOrderVarianceDetailModal
        workOrderId={drillDownWoId}
        visible={drillDownVisible}
        onClose={() => {
          setDrillDownVisible(false)
          setDrillDownWoId(null)
        }}
      />
    </div>
  )
}

export default PlanVsActualPage
