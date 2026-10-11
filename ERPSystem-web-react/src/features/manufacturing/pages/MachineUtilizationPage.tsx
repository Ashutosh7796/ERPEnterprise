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
  Tooltip,
  App,
  Input,
  Radio,
  Segmented,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AppstoreOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  PieChartOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { oeeAnalyticsApi, MachineUtilizationDTO } from '../api/oeeAnalyticsApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export const MachineUtilizationPage: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState<boolean>(false)
  const [utilizationList, setUtilizationList] = useState<MachineUtilizationDTO[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ])
  const [workCenterType, setWorkCenterType] = useState<string | undefined>(undefined)

  // Chart view and navigation controls
  const [chartFilter, setChartFilter] = useState<'ACTIVE' | 'TOP_UTIL' | 'TOP_DOWN' | 'ALL'>('ACTIVE')
  const [chartUnit, setChartUnit] = useState<'MINUTES' | 'PERCENT'>('MINUTES')
  const [chartSearch, setChartSearch] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await oeeAnalyticsApi.getMachineUtilization({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        workCenterType,
      })
      setUtilizationList(res)
    } catch (err: any) {
      message.error(err?.message || 'Failed to load machine utilization data.')
    } finally {
      setLoading(false)
    }
  }, [dateRange, workCenterType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Summary KPI Calculations
  const { totalSched, totalRun, totalSetup, totalDown, totalIdle, avgOpUtil, avgCalUtil } = useMemo(() => {
    let sched = 0
    let run = 0
    let setup = 0
    let down = 0
    let idle = 0

    utilizationList.forEach((u) => {
      sched += u.scheduledCapacityMins || 0
      run += u.runMins || 0
      setup += u.setupMins || 0
      down += u.downtimeMins || 0
      idle += u.idleMins || 0
    })

    const opUtil = sched > 0 ? (run + setup) / sched : 0
    const calSum = utilizationList.reduce((acc, curr) => acc + (curr.calendarUtilizationPct || 0), 0)
    const calAvg = utilizationList.length > 0 ? calSum / utilizationList.length : 0

    return {
      totalSched: sched,
      totalRun: run,
      totalSetup: setup,
      totalDown: down,
      totalIdle: idle,
      avgOpUtil: +(opUtil * 100).toFixed(1),
      avgCalUtil: +(calAvg * 100).toFixed(1),
    }
  }, [utilizationList])

  // Count of active machines (machines with production run, setup, or downtime activity)
  const activeCount = useMemo(() => {
    return utilizationList.filter(
      (u) => (u.runMins || 0) > 0 || (u.setupMins || 0) > 0 || (u.downtimeMins || 0) > 0
    ).length
  }, [utilizationList])

  // Filtered and sorted machines for chart display
  const displayList = useMemo(() => {
    let list = [...utilizationList]

    if (chartSearch.trim()) {
      const q = chartSearch.trim().toLowerCase()
      list = list.filter(
        (u) =>
          u.workstationCode?.toLowerCase().includes(q) ||
          u.workstationName?.toLowerCase().includes(q) ||
          u.workCenterType?.toLowerCase().includes(q)
      )
    }

    if (chartFilter === 'ACTIVE') {
      const active = list.filter(
        (u) => (u.runMins || 0) > 0 || (u.setupMins || 0) > 0 || (u.downtimeMins || 0) > 0
      )
      return active.length > 0 ? active : list.slice(0, 15)
    }

    if (chartFilter === 'TOP_UTIL') {
      return [...list]
        .sort((a, b) => (b.runMins || 0) - (a.runMins || 0))
        .slice(0, 10)
    }

    if (chartFilter === 'TOP_DOWN') {
      return [...list]
        .sort((a, b) => (b.downtimeMins || 0) - (a.downtimeMins || 0))
        .slice(0, 10)
    }

    return list
  }, [utilizationList, chartFilter, chartSearch])

  // Dynamic chart height based on visible workstation count
  const chartHeight = useMemo(() => {
    if (displayList.length <= 14) {
      return Math.min(520, Math.max(340, displayList.length * 36 + 70))
    }
    return 500
  }, [displayList.length])

  // Stacked Capacity Allocation Chart
  const stackedChartOption = useMemo(() => {
    if (displayList.length === 0) return {}

    const names = displayList.map((u) => u.workstationCode)
    const isPercent = chartUnit === 'PERCENT'

    const runSeries: number[] = []
    const setupSeries: number[] = []
    const downSeries: number[] = []
    const idleSeries: number[] = []

    displayList.forEach((u) => {
      const run = u.runMins || 0
      const setup = u.setupMins || 0
      const down = u.downtimeMins || 0
      const idle = u.idleMins || 0
      const total = run + setup + down + idle

      if (isPercent) {
        if (total > 0) {
          runSeries.push(+((run / total) * 100).toFixed(1))
          setupSeries.push(+((setup / total) * 100).toFixed(1))
          downSeries.push(+((down / total) * 100).toFixed(1))
          idleSeries.push(+((idle / total) * 100).toFixed(1))
        } else {
          runSeries.push(0)
          setupSeries.push(0)
          downSeries.push(0)
          idleSeries.push(100)
        }
      } else {
        runSeries.push(run)
        setupSeries.push(setup)
        downSeries.push(down)
        idleSeries.push(idle)
      }
    })

    const hasScroll = displayList.length > 14
    const dataZoomConfig = hasScroll
      ? [
          {
            type: 'slider',
            yAxisIndex: 0,
            startValue: Math.max(0, names.length - 14),
            endValue: names.length - 1,
            width: 14,
            right: 8,
            showDetail: false,
            brushSelect: false,
            zoomLock: true, // Prevents resizing window span
          },
          {
            type: 'inside',
            yAxisIndex: 0,
            startValue: Math.max(0, names.length - 14),
            endValue: names.length - 1,
            zoomLock: true, // Locks window size
            zoomOnMouseWheel: false, // PREVENTS WHEEL ZOOMING IN / ZOOMING OUT
            moveOnMouseWheel: true, // ENABLES CLEAN VERTICAL SCROLLING
            moveOnMouseMove: false, // Prevents unintended drag zooming
          },
        ]
      : []

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          const dataIndex = params[0].dataIndex
          const item = displayList[dataIndex]
          if (!item) return ''

          const run = item.runMins || 0
          const setup = item.setupMins || 0
          const down = item.downtimeMins || 0
          const idle = item.idleMins || 0
          const total = run + setup + down + idle
          const opUtil =
            item.scheduledCapacityMins > 0
              ? +(((run + setup) / item.scheduledCapacityMins) * 100).toFixed(1)
              : 0

          let html = `<div style="font-weight:600;margin-bottom:4px;color:#1f1f1f;">${item.workstationCode}</div>`
          if (item.workstationName) {
            html += `<div style="font-size:12px;color:#666;margin-bottom:6px;">${item.workstationName} (${item.workCenterType || 'GENERAL'})</div>`
          }

          params.forEach((p) => {
            let actualMins = 0
            if (p.seriesName === 'Run Time') actualMins = run
            else if (p.seriesName === 'Setup Time') actualMins = setup
            else if (p.seriesName === 'Unplanned Downtime') actualMins = down
            else if (p.seriesName === 'Idle / Available') actualMins = idle

            const pct = total > 0 ? ((actualMins / total) * 100).toFixed(1) : '0.0'
            html += `<div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;">
              <span>${p.marker} ${p.seriesName}:</span>
              <span style="font-weight:600;">${actualMins.toLocaleString()} mins <span style="font-weight:normal;color:#888;">(${pct}%)</span></span>
            </div>`
          })

          html += `<hr style="margin:6px 0;border:none;border-top:1px solid #e8e8e8;"/>`
          html += `<div style="display:flex;justify-content:space-between;gap:16px;">
            <span>Total Capacity:</span>
            <b>${total.toLocaleString()} mins</b>
          </div>`
          html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:2px;">
            <span>Plant Op Utilization:</span>
            <b style="color:#1677ff;">${opUtil}%</b>
          </div>`

          return html
        },
      },
      legend: {
        data: ['Run Time', 'Setup Time', 'Unplanned Downtime', 'Idle / Available'],
        top: 0,
      },
      grid: {
        left: 20,
        right: hasScroll ? 36 : 24,
        bottom: 24,
        top: 36,
        containLabel: true,
      },
      dataZoom: dataZoomConfig,
      xAxis: {
        type: 'value',
        max: isPercent ? 100 : undefined,
        axisLabel: {
          formatter: isPercent
            ? '{value}%'
            : (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k m` : `${val}m`),
        },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          interval: 0,
          width: 170,
          overflow: 'truncate',
          ellipsis: '...',
        },
      },
      series: [
        {
          name: 'Run Time',
          type: 'bar',
          stack: 'total',
          data: runSeries,
          itemStyle: { color: '#52c41a' },
        },
        {
          name: 'Setup Time',
          type: 'bar',
          stack: 'total',
          data: setupSeries,
          itemStyle: { color: '#1677ff' },
        },
        {
          name: 'Unplanned Downtime',
          type: 'bar',
          stack: 'total',
          data: downSeries,
          itemStyle: { color: '#ff4d4f' },
        },
        {
          name: 'Idle / Available',
          type: 'bar',
          stack: 'total',
          data: idleSeries,
          itemStyle: { color: '#faad14' },
        },
      ],
    }
  }, [displayList, chartUnit])

  const columns: ColumnsType<MachineUtilizationDTO> = [
    {
      title: 'Workstation',
      dataIndex: 'workstationCode',
      key: 'workstationCode',
      render: (code: string, record: MachineUtilizationDTO) => (
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
      title: 'Scheduled Capacity',
      dataIndex: 'scheduledCapacityMins',
      key: 'scheduledCapacityMins',
      align: 'right',
      render: (val: number) => <Text>{val} mins</Text>,
    },
    {
      title: 'Run Time',
      dataIndex: 'runMins',
      key: 'runMins',
      align: 'right',
      render: (val: number) => <Text style={{ color: '#52c41a' }}>{val} mins</Text>,
    },
    {
      title: 'Setup Time',
      dataIndex: 'setupMins',
      key: 'setupMins',
      align: 'right',
      render: (val: number) => <Text style={{ color: '#1677ff' }}>{val} mins</Text>,
    },
    {
      title: 'Downtime',
      dataIndex: 'downtimeMins',
      key: 'downtimeMins',
      align: 'right',
      render: (val: number) => <Text style={{ color: '#ff4d4f' }}>{val} mins</Text>,
    },
    {
      title: 'Idle Time',
      dataIndex: 'idleMins',
      key: 'idleMins',
      align: 'right',
      render: (val: number) => <Text style={{ color: '#faad14' }}>{val} mins</Text>,
    },
    {
      title: 'Operational Utilization',
      dataIndex: 'operationalUtilizationPct',
      key: 'operationalUtilizationPct',
      align: 'right',
      render: (val: number) => {
        const pct = +(val * 100).toFixed(1)
        const color = pct >= 80 ? '#52c41a' : pct >= 60 ? '#1677ff' : '#faad14'
        return (
          <div style={{ minWidth: 100 }}>
            <Text strong style={{ color }}>
              {pct}%
            </Text>
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} />
          </div>
        )
      },
      sorter: (a, b) => a.operationalUtilizationPct - b.operationalUtilizationPct,
    },
    {
      title: 'Calendar Utilization (24×7)',
      dataIndex: 'calendarUtilizationPct',
      key: 'calendarUtilizationPct',
      align: 'right',
      render: (val: number) => <Text>{(val * 100).toFixed(1)}%</Text>,
      sorter: (a, b) => a.calendarUtilizationPct - b.calendarUtilizationPct,
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
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
            <AppstoreOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Machine Utilization & Capacity Allocation
          </Title>
          <Text type="secondary">
            Scheduled Operational Capacity vs Calendar Asset Utilization (24×7)
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
            placeholder="All Work Centers"
            style={{ width: 170 }}
            allowClear
            value={workCenterType}
            onChange={(val) => setWorkCenterType(val)}
          >
            <Option value="MACHINING">Machining</Option>
            <Option value="FORMING">Forming</Option>
            <Option value="ASSEMBLY">Assembly</Option>
            <Option value="FINISHING">Finishing</Option>
            <Option value="PACKAGING">Packaging</Option>
          </Select>
          <Button type="primary" icon={<ReloadOutlined />} loading={loading} onClick={fetchData}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: (Run Time + Setup Time) / Scheduled Shift Capacity">
                  <span>
                    Plant Operational Utilization <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={avgOpUtil}
              suffix="%"
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
              prefix={<PieChartOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Productive: {totalRun + totalSetup} mins
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Tooltip title="Formula: Actual Run Time / Total 24x7 Calendar Time">
                  <span>
                    Calendar Asset Utilization <InfoCircleOutlined style={{ fontSize: 11 }} />
                  </span>
                </Tooltip>
              }
              value={avgCalUtil}
              suffix="%"
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Calendar Basis: 24h / day
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Scheduled Shift Capacity"
              value={totalSched}
              suffix="mins"
              valueStyle={{ color: '#333', fontWeight: 'bold' }}
              prefix={<HourglassOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Idle / Available: {totalIdle} mins
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Unplanned Downtime"
              value={totalDown}
              suffix="mins"
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Lost Capacity Ratio: {totalSched > 0 ? ((totalDown / totalSched) * 100).toFixed(1) : 0}%
            </div>
          </Card>
        </Col>
      </Row>

      {/* Stacked Capacity Allocation Chart */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Workstation Capacity Allocation</span>
            <Tag color="blue" style={{ borderRadius: 12 }}>
              {displayList.length} of {utilizationList.length} machines
            </Tag>
          </div>
        }
        extra={
          <Space wrap size="middle">
            <Radio.Group
              size="small"
              value={chartUnit}
              onChange={(e) => setChartUnit(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="MINUTES">Minutes (m)</Radio.Button>
              <Radio.Button value="PERCENT">Share (%)</Radio.Button>
            </Radio.Group>

            <Segmented
              size="small"
              value={chartFilter}
              onChange={(val) => setChartFilter(val as any)}
              options={[
                { label: `Active (${activeCount})`, value: 'ACTIVE' },
                { label: 'Top 10 Utilized', value: 'TOP_UTIL' },
                { label: 'Top 10 Downtime', value: 'TOP_DOWN' },
                { label: `All (${utilizationList.length})`, value: 'ALL' },
              ]}
            />

            <Input
              size="small"
              placeholder="Filter machine..."
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              allowClear
              value={chartSearch}
              onChange={(e) => setChartSearch(e.target.value)}
              style={{ width: 160 }}
            />
          </Space>
        }
      >
        {displayList.length > 0 ? (
          <ReactECharts
            key={`${chartFilter}-${chartUnit}-${displayList.length}-${chartSearch}`}
            option={stackedChartOption}
            style={{ height: chartHeight }}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            {chartSearch ? `No workstation matching filter "${chartSearch}".` : 'No machine utilization records found.'}
          </div>
        )}
      </Card>

      {/* Utilization Details Table */}
      <Card
        title="Workstation Capacity & Utilization Details"
        variant="borderless"
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Table<MachineUtilizationDTO>
          dataSource={utilizationList}
          columns={columns}
          rowKey="workstationId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
