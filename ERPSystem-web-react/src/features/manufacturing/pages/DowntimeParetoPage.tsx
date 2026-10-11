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
  Statistic,
  Space,
  Alert,
  Tooltip,
  App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AlertOutlined,
  ReloadOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { oeeAnalyticsApi, DowntimeParetoDTO } from '../api/oeeAnalyticsApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export const DowntimeParetoPage: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState<boolean>(false)
  const [paretoList, setParetoList] = useState<DowntimeParetoDTO[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ])
  const [workstationId, setWorkstationId] = useState<number | undefined>(undefined)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await oeeAnalyticsApi.getDowntimePareto({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        workstationId,
      })
      setParetoList(res)
    } catch (err: any) {
      message.error(err?.message || 'Failed to load downtime Pareto analysis data.')
    } finally {
      setLoading(false)
    }
  }, [dateRange, workstationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Summary Metrics
  const { totalMins, totalEvents, topCause, criticalCausesCount } = useMemo(() => {
    let mins = 0
    let events = 0
    let criticalCount = 0

    paretoList.forEach((p) => {
      mins += p.durationMinutes || 0
      events += p.occurrenceCount || 0
      if (p.cumulativePercentage <= 0.8 || (criticalCount === 0 && p.percentageOfTotal > 0)) {
        criticalCount++
      }
    })

    const top = paretoList.length > 0 ? paretoList[0] : null

    return {
      totalMins: mins,
      totalEvents: events,
      topCause: top,
      criticalCausesCount: criticalCount,
    }
  }, [paretoList])

  // Dual-Axis Pareto Chart
  const paretoChartOption = useMemo(() => {
    if (paretoList.length === 0) return {}

    const labels = paretoList.map((p) => `${p.downtimeCategory}: ${p.reason.substring(0, 16)}`)
    const barData = paretoList.map((p) => p.durationMinutes)
    const lineData = paretoList.map((p) => +(p.cumulativePercentage * 100).toFixed(1))

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const idx = params[0].dataIndex
          const item = paretoList[idx]
          return `
            <b>${item.downtimeCategory}</b><br/>
            Reason: <i>${item.reason}</i><br/>
            Lost Time: <b>${item.durationMinutes} mins</b> (${(item.percentageOfTotal * 100).toFixed(1)}%)<br/>
            Occurrences: <b>${item.occurrenceCount}</b><br/>
            Cumulative %: <b>${(item.cumulativePercentage * 100).toFixed(1)}%</b>
          `
        },
      },
      legend: {
        data: ['Lost Minutes', 'Cumulative %'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          interval: 0,
          rotate: 25,
          fontSize: 11,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Lost Minutes',
          position: 'left',
          axisLabel: { formatter: '{value}m' },
        },
        {
          type: 'value',
          name: 'Cumulative %',
          min: 0,
          max: 100,
          position: 'right',
          axisLabel: { formatter: '{value}%' },
        },
      ],
      series: [
        {
          name: 'Lost Minutes',
          type: 'bar',
          data: barData,
          itemStyle: { color: '#ff4d4f' },
        },
        {
          name: 'Cumulative %',
          type: 'line',
          yAxisIndex: 1,
          data: lineData,
          smooth: true,
          itemStyle: { color: '#1677ff' },
          lineStyle: { width: 3 },
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed', color: '#faad14', width: 2 },
            data: [{ yAxis: 80, name: 'Pareto 80% Cutoff' }],
          },
        },
      ],
    }
  }, [paretoList])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MECHANICAL_BREAKDOWN':
        return 'volcano'
      case 'ELECTRICAL_FAULT':
        return 'magenta'
      case 'TOOLING_CHANGE':
        return 'geekblue'
      case 'MATERIAL_STARVATION':
        return 'gold'
      case 'QUALITY_REJECT_HOLD':
        return 'red'
      case 'OPERATOR_ABSENCE':
        return 'purple'
      default:
        return 'default'
    }
  }

  const columns: ColumnsType<DowntimeParetoDTO> = [
    {
      title: 'Downtime Category',
      dataIndex: 'downtimeCategory',
      key: 'downtimeCategory',
      render: (cat: string) => <Tag color={getCategoryColor(cat)}>{cat}</Tag>,
    },
    {
      title: 'Downtime Reason / Stoppage Cause',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => <Text strong>{reason}</Text>,
    },
    {
      title: 'Lost Duration',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {val} mins
        </Text>
      ),
      sorter: (a, b) => a.durationMinutes - b.durationMinutes,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Occurrences',
      dataIndex: 'occurrenceCount',
      key: 'occurrenceCount',
      align: 'right',
      render: (val: number) => <Text>{val}</Text>,
      sorter: (a, b) => a.occurrenceCount - b.occurrenceCount,
    },
    {
      title: '% of Total Downtime',
      dataIndex: 'percentageOfTotal',
      key: 'percentageOfTotal',
      align: 'right',
      render: (val: number) => <Text strong>{(val * 100).toFixed(1)}%</Text>,
    },
    {
      title: 'Cumulative %',
      dataIndex: 'cumulativePercentage',
      key: 'cumulativePercentage',
      align: 'right',
      render: (val: number) => {
        const pct = +(val * 100).toFixed(1)
        const isVitalFew = val <= 0.8
        return (
          <Space orientation="horizontal">
            <Text>{pct}%</Text>
            {isVitalFew ? (
              <Tag color="error">TOP 80% (VITAL FEW)</Tag>
            ) : (
              <Tag color="default">SECONDARY CAUSES</Tag>
            )}
          </Space>
        )
      },
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
            <AlertOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
            Machine Downtime Pareto Analysis
          </Title>
          <Text type="secondary">
            Cumulative Loss Analysis: Identifying the Primary Stoppages Impairing Plant Availability
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
              title="Total Downtime Duration"
              value={totalMins}
              suffix="mins"
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              {(totalMins / 60).toFixed(1)} machine operating hours
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Downtime Incidents"
              value={totalEvents}
              suffix="incidents"
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
              prefix={<BarChartOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Logged in Shop Floor Terminal
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Primary Downtime Reason"
              value={topCause ? (topCause.percentageOfTotal * 100).toFixed(1) : 0}
              suffix="%"
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              prefix={<WarningOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topCause?.reason || 'None reported'}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Top Contributors (80% Cumulative Loss)"
              value={criticalCausesCount}
              suffix={`of ${paretoList.length}`}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
              Key targets for downtime elimination
            </div>
          </Card>
        </Col>
      </Row>

      {/* Pareto Chart */}
      <Card
        title="Downtime Pareto Distribution (Cumulative Loss)"
        variant="borderless"
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}
      >
        {paretoList.length > 0 ? (
          <ReactECharts option={paretoChartOption} style={{ height: 350 }} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            No downtime records found for the selected date range.
          </div>
        )}
      </Card>

      {/* Pareto Details Table */}
      <Card
        title="Downtime Reason Ranking & Cumulative Contribution"
        variant="borderless"
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Table<DowntimeParetoDTO>
          dataSource={paretoList}
          columns={columns}
          rowKey={(r) => `${r.downtimeCategory}-${r.reason}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
