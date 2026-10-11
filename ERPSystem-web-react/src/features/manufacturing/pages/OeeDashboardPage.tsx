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
  Tooltip,
  App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DashboardOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import {
  oeeAnalyticsApi,
  OeeDashboardResponse,
  MachineOeeDetailDTO,
} from '../api/oeeAnalyticsApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export const OeeDashboardPage: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState<boolean>(false)
  const [recalculating, setRecalculating] = useState<boolean>(false)
  const [dashboardData, setDashboardData] = useState<OeeDashboardResponse | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ])
  const [selectedWorkstationId, setSelectedWorkstationId] = useState<number | undefined>(undefined)
  const [selectedShift, setSelectedShift] = useState<string | undefined>(undefined)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await oeeAnalyticsApi.getOeeDashboard({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        workstationId: selectedWorkstationId,
        shiftCode: selectedShift,
      })
      setDashboardData(res)
    } catch (err: any) {
      message.error(err?.message || 'Failed to load OEE analytics data.')
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedWorkstationId, selectedShift])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleRecalculate = async () => {
    try {
      setRecalculating(true)
      const res = await oeeAnalyticsApi.recalculateMetrics({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        workstationId: selectedWorkstationId,
      })
      message.success(`Daily OEE metrics recalculated successfully (${res.rowsProcessed} records updated).`)
      fetchDashboard()
    } catch (err: any) {
      message.error(err?.message || 'Failed to recalculate OEE metrics.')
    } finally {
      setRecalculating(false)
    }
  }

  const summary = dashboardData?.summary
  const machineDetails = dashboardData?.machineDetails || []
  const trends = dashboardData?.trends || []

  // Trend Chart Options
  const trendChartOption = useMemo(() => {
    if (!trends || trends.length === 0) return {}

    const dates = trends.map((t) => t.metricDate)
    const oeeData = trends.map((t) => +(t.oeePct * 100).toFixed(1))
    const availData = trends.map((t) => +(t.availabilityPct * 100).toFixed(1))
    const perfData = trends.map((t) => +(t.performancePct * 100).toFixed(1))
    const qualData = trends.map((t) => +(t.qualityPct * 100).toFixed(1))

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          let html = `<b>${params[0].name}</b><br/>`
          params.forEach((p) => {
            html += `${p.marker} ${p.seriesName}: <b>${p.value}%</b><br/>`
          })
          return html
        },
      },
      legend: {
        data: ['Overall OEE', 'Availability', 'Performance', 'Quality'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' },
      },
      series: [
        {
          name: 'Overall OEE',
          type: 'line',
          data: oeeData,
          smooth: true,
          itemStyle: { color: '#1677ff' },
          lineStyle: { width: 3 },
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed', color: '#52c41a' },
            data: [{ yAxis: 85, name: 'World Class (85%)' }],
          },
        },
        {
          name: 'Availability',
          type: 'line',
          data: availData,
          smooth: true,
          itemStyle: { color: '#fa8c16' },
        },
        {
          name: 'Performance',
          type: 'line',
          data: perfData,
          smooth: true,
          itemStyle: { color: '#722ed1' },
        },
        {
          name: 'Quality',
          type: 'line',
          data: qualData,
          smooth: true,
          itemStyle: { color: '#13c2c2' },
        },
      ],
    }
  }, [trends])

  const columns: ColumnsType<MachineOeeDetailDTO> = [
    {
      title: 'Workstation',
      dataIndex: 'workstationCode',
      key: 'workstationCode',
      render: (code: string, record: MachineOeeDetailDTO) => (
        <div>
          <Text strong>{code}</Text>
          <div style={{ fontSize: 12, color: '#888' }}>{record.workstationName}</div>
        </div>
      ),
    },
    {
      title: 'Work Center',
      dataIndex: 'workCenterType',
      key: 'workCenterType',
      render: (type: string) => <Tag color="blue">{type || 'GENERAL'}</Tag>,
    },
    {
      title: 'Availability (A)',
      dataIndex: 'availabilityPct',
      key: 'availabilityPct',
      align: 'right',
      render: (val: number, record: MachineOeeDetailDTO) => (
        <div>
          <Text strong>{(val * 100).toFixed(1)}%</Text>
          <div style={{ fontSize: 11, color: '#888' }}>
            Run: {record.runMins}m / PPT: {record.plannedMins}m
          </div>
        </div>
      ),
    },
    {
      title: 'Performance (P)',
      dataIndex: 'performancePct',
      key: 'performancePct',
      align: 'right',
      render: (val: number) => (
        <div>
          <Text strong>{(val * 100).toFixed(1)}%</Text>
        </div>
      ),
    },
    {
      title: 'Quality (Q)',
      dataIndex: 'qualityPct',
      key: 'qualityPct',
      align: 'right',
      render: (val: number, record: MachineOeeDetailDTO) => (
        <div>
          <Text strong>{(val * 100).toFixed(1)}%</Text>
          <div style={{ fontSize: 11, color: '#888' }}>
            Good: {record.goodQty} / Rej: {record.rejectedQty}
          </div>
        </div>
      ),
    },
    {
      title: 'Overall OEE',
      dataIndex: 'oeePct',
      key: 'oeePct',
      align: 'right',
      render: (val: number) => {
        const pct = +(val * 100).toFixed(1)
        const color = pct >= 85 ? '#52c41a' : pct >= 70 ? '#1677ff' : '#faad14'
        return (
          <div style={{ minWidth: 90 }}>
            <Text strong style={{ color, fontSize: 15 }}>
              {pct}%
            </Text>
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} />
          </div>
        )
      },
      sorter: (a, b) => a.oeePct - b.oeePct,
    },
    {
      title: 'Utilization',
      dataIndex: 'utilizationPct',
      key: 'utilizationPct',
      align: 'right',
      render: (val: number) => <Text>{(val * 100).toFixed(1)}%</Text>,
      sorter: (a, b) => a.utilizationPct - b.utilizationPct,
    },
    {
      title: 'Health Status',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      align: 'center',
      render: (status: string) => {
        if (status === 'EXCELLENT') return <Tag color="success">EXCELLENT (≥85%)</Tag>
        if (status === 'GOOD') return <Tag color="processing">GOOD (≥70%)</Tag>
        if (status === 'NO_RUN') return <Tag color="default">NO RUN</Tag>
        return <Tag color="warning">NEEDS ATTENTION</Tag>
      },
    },
  ]

  const oeePercent = summary ? +(summary.overallOeePct * 100).toFixed(1) : 0
  const availabilityPercent = summary ? +(summary.overallAvailabilityPct * 100).toFixed(1) : 0
  const performancePercent = summary ? +(summary.overallPerformancePct * 100).toFixed(1) : 0
  const qualityPercent = summary ? +(summary.overallQualityPct * 100).toFixed(1) : 0
  const utilizationPercent = summary ? +(summary.overallUtilizationPct * 100).toFixed(1) : 0

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Page Title & Filter Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <DashboardOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Overall Equipment Effectiveness (OEE)
          </Title>
          <Text type="secondary">
            SEMI E10 / ISO 22400-2 Operational Availability, Performance, and Quality Analytics
          </Text>
        </div>

        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
            allowClear={false}
          />
          <Select
            placeholder="All Workstations"
            style={{ width: 180 }}
            allowClear
            value={selectedWorkstationId}
            onChange={(val) => setSelectedWorkstationId(val)}
          >
            {machineDetails.map((m) => (
              <Option key={m.workstationId} value={m.workstationId}>
                {m.workstationCode} - {m.workstationName}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="All Shifts"
            style={{ width: 130 }}
            allowClear
            value={selectedShift}
            onChange={(val) => setSelectedShift(val)}
          >
            <Option value="MORNING">Morning Shift</Option>
            <Option value="EVENING">Evening Shift</Option>
            <Option value="NIGHT">Night Shift</Option>
            <Option value="GENERAL">General Shift</Option>
          </Select>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={recalculating || loading}
            onClick={handleRecalculate}
          >
            Recalculate Metrics
          </Button>
        </Space>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Main OEE Card */}
        <Col xs={24} sm={12} md={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              color: '#fff',
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Plant Overall Equipment Effectiveness (OEE)</span>}
              value={oeePercent}
              suffix="%"
              valueStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 32 }}
              prefix={<ThunderboltOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={oeePercent}
                strokeColor="#52c41a"
                trailColor="rgba(255,255,255,0.3)"
                showInfo={false}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              Target: 85.0% World Class Benchmark
            </div>
          </Card>
        </Col>

        {/* Availability Factor */}
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: Actual Run Time / Planned Production Time (PPT)">
                  <span>
                    Availability (A) <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={availabilityPercent}
              suffix="%"
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Run: {summary?.totalActualRunMins ?? 0}m
            </div>
          </Card>
        </Col>

        {/* Performance Factor */}
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: (Ideal Cycle Time × Total Output) / Actual Run Time">
                  <span>
                    Performance (P) <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={performancePercent}
              suffix="%"
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              prefix={<ThunderboltOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Output: {summary?.totalOutputQty ?? 0} units
            </div>
          </Card>
        </Col>

        {/* Quality Factor */}
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: Good Output / Total Output">
                  <span>
                    Quality (Q) <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={qualityPercent}
              suffix="%"
              valueStyle={{ color: '#13c2c2', fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Good: {summary?.goodOutputQty ?? 0} / Scrap: {summary?.rejectedOutputQty ?? 0}
            </div>
          </Card>
        </Col>

        {/* Operational Utilization */}
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: (Run Time + Setup Time) / Scheduled Capacity">
                  <span>
                    Operational Utilization <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={utilizationPercent}
              suffix="%"
              valueStyle={{ color: '#0958d9', fontWeight: 'bold' }}
              prefix={<DashboardOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Active Workstations: {summary?.activeWorkstationCount ?? 0}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Analytical Visualizations */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Trend Chart */}
        <Col xs={24} lg={16}>
          <Card
            title="OEE Factor Trends (Availability, Performance, Quality)"
            variant="borderless"
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {trends.length > 0 ? (
              <ReactECharts option={trendChartOption} style={{ height: 320 }} />
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                No trend metrics recorded for the selected date range. Click &quot;Recalculate Metrics&quot; to aggregate.
              </div>
            )}
          </Card>
        </Col>

        {/* Stoppage & Allocation Summary */}
        <Col xs={24} lg={8}>
          <Card
            title="Workstation Operating Time Allocation"
            variant="borderless"
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
          >
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>Actual Run Time</Text>
                  <Text strong>{summary?.totalActualRunMins ?? 0} mins</Text>
                </div>
                <Progress
                  percent={
                    summary?.totalPlannedProductionMins
                      ? Math.min(
                          100,
                          +((summary.totalActualRunMins / summary.totalPlannedProductionMins) * 100).toFixed(1)
                        )
                      : 0
                  }
                  strokeColor="#52c41a"
                  size="small"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>Actual Setup Time</Text>
                  <Text strong>{summary?.totalActualSetupMins ?? 0} mins</Text>
                </div>
                <Progress
                  percent={
                    summary?.totalPlannedProductionMins
                      ? Math.min(
                          100,
                          +((summary.totalActualSetupMins / summary.totalPlannedProductionMins) * 100).toFixed(1)
                        )
                      : 0
                  }
                  strokeColor="#1677ff"
                  size="small"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>Unplanned Downtime</Text>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {summary?.totalDowntimeMins ?? 0} mins
                  </Text>
                </div>
                <Progress
                  percent={
                    summary?.totalPlannedProductionMins
                      ? Math.min(
                          100,
                          +((summary.totalDowntimeMins / summary.totalPlannedProductionMins) * 100).toFixed(1)
                        )
                      : 0
                  }
                  strokeColor="#ff4d4f"
                  size="small"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>Idle / Unallocated</Text>
                  <Text strong>{summary?.totalIdleMins ?? 0} mins</Text>
                </div>
                <Progress
                  percent={
                    summary?.totalPlannedProductionMins
                      ? Math.min(
                          100,
                          +((summary.totalIdleMins / summary.totalPlannedProductionMins) * 100).toFixed(1)
                        )
                      : 0
                  }
                  strokeColor="#faad14"
                  size="small"
                />
              </div>

              <Alert
                type="info"
                showIcon
                message="Production Telemetry Basis"
                description="Metrics are aggregated from shop floor job card execution logs and recorded machine downtime events."
                style={{ marginTop: 8 }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Machine Details Table */}
      <Card
        title="Workstation Performance Breakdown"
        variant="borderless"
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Table<MachineOeeDetailDTO>
          dataSource={machineDetails}
          columns={columns}
          rowKey="workstationId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
