import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Alert,
  Tabs,
  DatePicker,
  Select,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  PieChartOutlined,
  AuditOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  qcApi,
  QcCockpitSummaryDTO,
  QcParetoItemDTO,
  QcSupplierRatingDTO,
  QcTrendDTO,
  QcCustomerRatingDTO,
  QcRejectionCostItemDTO,
  QcStageSummaryDTO,
} from '../api/qcApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export const QualityCockpitPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('operational')
  const [loading, setLoading] = useState(false)

  // Tab 1: Operational Surveillance state
  const [summary, setSummary] = useState<QcCockpitSummaryDTO | null>(null)
  const [pareto, setPareto] = useState<QcParetoItemDTO[]>([])
  const [supplierRatings, setSupplierRatings] = useState<QcSupplierRatingDTO[]>([])
  const [trends, setTrends] = useState<QcTrendDTO[]>([])

  // Tab 2: Customer Quality Performance (REQ-4.3.6)
  const [customerRatings, setCustomerRatings] = useState<QcCustomerRatingDTO[]>([])
  const [customerDateRange, setCustomerDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Tab 3: Rejection Cost Impact Report (REQ-4.3.2)
  const [rejectionCostItems, setRejectionCostItems] = useState<QcRejectionCostItemDTO[]>([])
  const [costStageFilter, setCostStageFilter] = useState<string | undefined>(undefined)
  const [costDateRange, setCostDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Tab 4: Stage-Wise Rejection Summary (REQ-4.3.7)
  const [stageSummaries, setStageSummaries] = useState<QcStageSummaryDTO[]>([])
  const [stageDateRange, setStageDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Fetch Operational Surveillance data
  const fetchOperationalData = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, paretoRes, sqrRes, trendsRes]: any = await Promise.all([
        qcApi.getCockpitSummary(),
        qcApi.getParetoAnalysis(10),
        qcApi.getSupplierQualityRatings(),
        qcApi.getInspectionTrends(),
      ])

      setSummary(sumRes?.data || sumRes)
      setPareto(Array.isArray(paretoRes?.data) ? paretoRes.data : Array.isArray(paretoRes) ? paretoRes : [])
      setSupplierRatings(Array.isArray(sqrRes?.data) ? sqrRes.data : Array.isArray(sqrRes) ? sqrRes : [])
      setTrends(Array.isArray(trendsRes?.data) ? trendsRes.data : Array.isArray(trendsRes) ? trendsRes : [])
    } catch (err) {
      console.error('Failed to load operational quality analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Customer Quality PPM data (REQ-4.3.6)
  const fetchCustomerQualityData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (customerDateRange && customerDateRange[0] && customerDateRange[1]) {
        params.startDate = customerDateRange[0].format('YYYY-MM-DD')
        params.endDate = customerDateRange[1].format('YYYY-MM-DD')
      }
      const res: any = await qcApi.getCustomerQualityRatings(params)
      setCustomerRatings(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
    } catch (err) {
      console.error('Failed to load customer quality PPM analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [customerDateRange])

  // Fetch Rejection Cost Report data (REQ-4.3.2)
  const fetchRejectionCostData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (costDateRange && costDateRange[0] && costDateRange[1]) {
        params.startDate = costDateRange[0].format('YYYY-MM-DD')
        params.endDate = costDateRange[1].format('YYYY-MM-DD')
      }
      if (costStageFilter) {
        params.stage = costStageFilter
      }
      const res: any = await qcApi.getRejectionCostReport(params)
      setRejectionCostItems(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
    } catch (err) {
      console.error('Failed to load rejection cost report:', err)
    } finally {
      setLoading(false)
    }
  }, [costDateRange, costStageFilter])

  // Fetch Stage-Wise Rejection Summary data (REQ-4.3.7)
  const fetchStageSummaryData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (stageDateRange && stageDateRange[0] && stageDateRange[1]) {
        params.startDate = stageDateRange[0].format('YYYY-MM-DD')
        params.endDate = stageDateRange[1].format('YYYY-MM-DD')
      }
      const res: any = await qcApi.getStageRejectionSummary(params)
      setStageSummaries(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
    } catch (err) {
      console.error('Failed to load stage rejection summary:', err)
    } finally {
      setLoading(false)
    }
  }, [stageDateRange])

  // Initial load based on active tab
  useEffect(() => {
    if (activeTab === 'operational') {
      fetchOperationalData()
    } else if (activeTab === 'customerPpm') {
      fetchCustomerQualityData()
    } else if (activeTab === 'rejectionCost') {
      fetchRejectionCostData()
    } else if (activeTab === 'stageSummary') {
      fetchStageSummaryData()
    }
  }, [activeTab, fetchOperationalData, fetchCustomerQualityData, fetchRejectionCostData, fetchStageSummaryData])

  // Refresh current tab
  const handleRefresh = () => {
    if (activeTab === 'operational') fetchOperationalData()
    else if (activeTab === 'customerPpm') fetchCustomerQualityData()
    else if (activeTab === 'rejectionCost') fetchRejectionCostData()
    else if (activeTab === 'stageSummary') fetchStageSummaryData()
  }

  // Column definitions for Supplier Quality (Tab 1)
  const supplierColumns: TableColumnsType<QcSupplierRatingDTO> = [
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (text) => <Text strong>{text || 'Direct / Internal'}</Text>,
    },
    {
      title: 'Lots Received',
      dataIndex: 'totalReceivedLots',
      key: 'totalReceivedLots',
      align: 'right',
    },
    {
      title: 'Rejected Lots',
      dataIndex: 'rejectedLots',
      key: 'rejectedLots',
      align: 'right',
      render: (val) => (
        <Text type={val > 0 ? 'danger' : 'secondary'} strong={val > 0}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Defects Recorded',
      dataIndex: 'totalDefectCount',
      key: 'totalDefectCount',
      align: 'right',
    },
    {
      title: 'Lot Rejection Rate (%)',
      dataIndex: 'rejectionRatePercent',
      key: 'rejectionRatePercent',
      align: 'right',
      render: (rate) => {
        const num = Number(rate || 0)
        return (
          <Space size="small">
            <Text type={num > 5 ? 'danger' : num > 1 ? 'warning' : 'success'}>
              {num.toFixed(2)}%
            </Text>
            <Progress
              percent={Math.min(num * 10, 100)}
              showInfo={false}
              size="small"
              strokeColor={num > 5 ? '#ff4d4f' : num > 1 ? '#faad14' : '#52c41a'}
              style={{ width: 60 }}
            />
          </Space>
        )
      },
    },
    {
      title: 'Parts Per Million (PPM)',
      dataIndex: 'qualityScorePpm',
      key: 'qualityScorePpm',
      align: 'right',
      render: (ppm) => (
        <Tag color={ppm <= 500 ? 'green' : ppm <= 2500 ? 'orange' : 'red'}>
          {ppm != null ? `${ppm.toLocaleString()} PPM` : '0 PPM'}
        </Tag>
      ),
    },
    {
      title: 'Quality Rating Grade',
      dataIndex: 'ratingGrade',
      key: 'ratingGrade',
      render: (grade) => {
        switch (grade) {
          case 'A_PREFERRED':
            return <Tag color="success">Grade A (Preferred Supplier)</Tag>
          case 'B_ACCEPTABLE':
            return <Tag color="processing">Grade B (Acceptable Supplier)</Tag>
          case 'C_PROBATION':
            return <Tag color="warning">Grade C (Probationary Supplier)</Tag>
          case 'D_CRITICAL':
            return <Tag color="error">Grade D (Critical Risk Supplier)</Tag>
          default:
            return <Tag>Unrated</Tag>
        }
      },
    },
  ]

  // Column definitions for Customer Quality PPM (REQ-4.3.6)
  const customerColumns: TableColumnsType<QcCustomerRatingDTO> = [
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text) => <Text strong>{text || 'Direct Account'}</Text>,
    },
    {
      title: 'Dispatched Shipments',
      dataIndex: 'totalShipments',
      key: 'totalShipments',
      align: 'right',
    },
    {
      title: 'Total Dispatched Qty',
      dataIndex: 'totalDispatchedQty',
      key: 'totalDispatchedQty',
      align: 'right',
      render: (qty) => Number(qty || 0).toLocaleString(),
    },
    {
      title: 'Return Shipments',
      dataIndex: 'totalReturnedShipments',
      key: 'totalReturnedShipments',
      align: 'right',
    },
    {
      title: 'Defective Returned Qty',
      dataIndex: 'totalReturnedQty',
      key: 'totalReturnedQty',
      align: 'right',
      render: (val) => {
        const num = Number(val || 0)
        return (
          <Text type={num > 0 ? 'danger' : 'secondary'} strong={num > 0}>
            {num.toLocaleString()}
          </Text>
        )
      },
    },
    {
      title: 'Complaints (NCR)',
      dataIndex: 'totalCustomerNcrs',
      key: 'totalCustomerNcrs',
      align: 'right',
      render: (val) => (
        <Text type={val > 0 ? 'danger' : 'secondary'}>{val || 0}</Text>
      ),
    },
    {
      title: 'Customer PPM',
      dataIndex: 'ppmDefectRate',
      key: 'ppmDefectRate',
      align: 'right',
      render: (ppm) => {
        const val = Number(ppm || 0)
        return (
          <Tag color={val <= 50 ? 'green' : val <= 200 ? 'blue' : val <= 1000 ? 'orange' : 'red'}>
            {val.toLocaleString()} PPM
          </Tag>
        )
      },
    },
    {
      title: 'CQR Score (%)',
      dataIndex: 'cqrScore',
      key: 'cqrScore',
      align: 'right',
      render: (score) => {
        const val = Number(score || 100)
        return (
          <Space size="small">
            <Text type={val >= 99.5 ? 'success' : val >= 98.0 ? 'warning' : 'danger'}>
              {val.toFixed(2)}%
            </Text>
            <Progress
              percent={val}
              showInfo={false}
              size="small"
              strokeColor={val >= 99.5 ? '#52c41a' : val >= 98.0 ? '#faad14' : '#ff4d4f'}
              style={{ width: 60 }}
            />
          </Space>
        )
      },
    },
    {
      title: 'Rating Grade',
      dataIndex: 'ratingGrade',
      key: 'ratingGrade',
      render: (grade) => {
        switch (grade) {
          case 'GRADE_A_EXCELLENT':
            return <Tag color="success">Grade A (Benchmark &le; 50 PPM)</Tag>
          case 'GRADE_B_ACCEPTABLE':
            return <Tag color="processing">Grade B (Acceptable &le; 200 PPM)</Tag>
          case 'GRADE_C_WARNING':
            return <Tag color="warning">Grade C (Warning &le; 1000 PPM)</Tag>
          case 'GRADE_D_CRITICAL':
            return <Tag color="error">Grade D (Critical &gt; 1000 PPM)</Tag>
          default:
            return <Tag>Unrated</Tag>
        }
      },
    },
  ]

  // Column definitions for Rejection Cost Impact Report (REQ-4.3.2)
  const rejectionCostColumns: TableColumnsType<QcRejectionCostItemDTO> = [
    {
      title: 'Rejection Date',
      dataIndex: 'rejectionDate',
      key: 'rejectionDate',
      render: (dt) => dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stg) => {
        const color = stg === 'FINAL_INSPECTION' ? 'purple' : stg === 'JOB_CARD_REJECTION' || stg === 'PROCESS_INSPECTION' ? 'blue' : 'green'
        return <Tag color={color}>{stg || 'IPQC'}</Tag>
      },
    },
    {
      title: 'Defect Code & Category',
      key: 'defectCode',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.defectCode || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.defectCategory || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Material / Component',
      key: 'material',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.materialName || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.materialStandard || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Work Order / Traveler',
      key: 'orderRef',
      render: (_, r) => r.workOrderNumber || r.jobCardNumber ? (
        <Space direction="vertical" size={0}>
          {r.workOrderNumber && <Text code>{r.workOrderNumber}</Text>}
          {r.jobCardNumber && <Text type="secondary" style={{ fontSize: 11 }}>Traveler: {r.jobCardNumber}</Text>}
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev) => {
        const color = sev === 'CRITICAL' ? 'red' : sev === 'MAJOR' ? 'orange' : 'default'
        return <Tag color={color}>{sev || 'MINOR'}</Tag>
      },
    },
    {
      title: 'Rejected Qty',
      dataIndex: 'defectQuantity',
      key: 'defectQuantity',
      align: 'right',
      render: (qty, r) => (
        <Text strong type="danger">
          {Number(qty || 0).toLocaleString()} {r.unitOfMeasure || 'PCS'}
        </Text>
      ),
    },
    {
      title: 'Standard Unit Cost',
      dataIndex: 'standardUnitCost',
      key: 'standardUnitCost',
      align: 'right',
      render: (cost) => `$${Number(cost || 0).toFixed(2)}`,
    },
    {
      title: 'Extended Scrap Valuation',
      dataIndex: 'estimatedScrapCost',
      key: 'estimatedScrapCost',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#cf1322' }}>
          ${Number(val || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Abnormal Scrap P&L (Account 5402)',
      dataIndex: 'abnormalScrapAccountingLoss',
      key: 'abnormalScrapAccountingLoss',
      align: 'right',
      render: (val) => {
        const num = Number(val || 0)
        return num > 0 ? (
          <Tag color="volcano">${num.toFixed(2)}</Tag>
        ) : (
          <Text type="secondary">$0.00</Text>
        )
      },
    },
    {
      title: 'Linked NCR',
      dataIndex: 'ncrNumber',
      key: 'ncrNumber',
      render: (ncr) => ncr ? <Tag color="error">{ncr}</Tag> : <Text type="secondary">-</Text>,
    },
  ]

  // Column definitions for Stage-Wise Rejection Summary (REQ-4.3.7)
  const stageColumns: TableColumnsType<QcStageSummaryDTO> = [
    {
      title: 'Quality Surveillance Stage',
      dataIndex: 'stageName',
      key: 'stageName',
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: 'Total Inspections / Shipments',
      dataIndex: 'totalInspections',
      key: 'totalInspections',
      align: 'right',
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      title: 'Passed Inspections',
      dataIndex: 'passedInspections',
      key: 'passedInspections',
      align: 'right',
      render: (val) => <Text type="success">{Number(val || 0).toLocaleString()}</Text>,
    },
    {
      title: 'Failed Inspections',
      dataIndex: 'failedInspections',
      key: 'failedInspections',
      align: 'right',
      render: (val) => (
        <Text type={val > 0 ? 'danger' : 'secondary'} strong={val > 0}>
          {Number(val || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Total Lot / Dispatched Qty',
      dataIndex: 'totalLotQuantity',
      key: 'totalLotQuantity',
      align: 'right',
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      title: 'Accepted Quantity',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      align: 'right',
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      title: 'Rejected / Defective Qty',
      dataIndex: 'rejectedQuantity',
      key: 'rejectedQuantity',
      align: 'right',
      render: (val) => {
        const num = Number(val || 0)
        return (
          <Text type={num > 0 ? 'danger' : 'secondary'} strong={num > 0}>
            {num.toLocaleString()}
          </Text>
        )
      },
    },
    {
      title: 'Stage Rejection Rate (%)',
      dataIndex: 'rejectionRatePct',
      key: 'rejectionRatePct',
      align: 'right',
      render: (rate) => {
        const num = Number(rate || 0)
        return (
          <Space size="small">
            <Text type={num > 5 ? 'danger' : num > 1 ? 'warning' : 'success'} strong>
              {num.toFixed(2)}%
            </Text>
            <Progress
              percent={Math.min(num * 10, 100)}
              showInfo={false}
              size="small"
              strokeColor={num > 5 ? '#ff4d4f' : num > 1 ? '#faad14' : '#52c41a'}
              style={{ width: 60 }}
            />
          </Space>
        )
      },
    },
    {
      title: 'Associated NCRs',
      dataIndex: 'ncrCount',
      key: 'ncrCount',
      align: 'right',
      render: (val) => val > 0 ? <Tag color="error">{val}</Tag> : <Text type="secondary">0</Text>,
    },
  ]

  const fpy = summary?.firstPassYield ?? 0
  const acceptanceRate = summary?.overallAcceptanceRate ?? 0
  const slaCompliance = summary?.containmentSlaComplianceRate ?? 0

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER SECTION - MATURE ERP TERMINOLOGY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
            Quality Analytics &amp; Performance Surveillance
          </Title>
          <Text type="secondary">
            Operational Quality Surveillance, ISO 9001 / IATF 16949 Standards, Customer PPM, Rejection Cost Valuation, and Multi-Stage Defect Analysis
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh Analytics
          </Button>
          <Button type="primary" onClick={() => navigate('/quality/inspections')}>
            Quality Inspections
          </Button>
          <Button danger onClick={() => navigate('/quality/ncr')}>
            Non-Conformance Reports (NCR)
          </Button>
          <Button onClick={() => navigate('/quality/capa')}>
            CAPA / 8D
          </Button>
        </Space>
      </div>

      {/* NAVIGATION TABS */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'operational',
            label: (
              <span>
                <RiseOutlined />
                Operational Surveillance &amp; FPY
              </span>
            ),
          },
          {
            key: 'customerPpm',
            label: (
              <span>
                <TeamOutlined />
                Customer Quality Performance (PPM)
              </span>
            ),
          },
          {
            key: 'rejectionCost',
            label: (
              <span>
                <DollarOutlined />
                Rejection &amp; Scrap Cost Impact
              </span>
            ),
          },
          {
            key: 'stageSummary',
            label: (
              <span>
                <ApartmentOutlined />
                Stage-Wise Quality Summary
              </span>
            ),
          },
        ]}
      />

      {loading && !summary && customerRatings.length === 0 && rejectionCostItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" description="Loading quality management analytics..." />
        </div>
      ) : (
        <>
          {/* TAB 1: OPERATIONAL SURVEILLANCE & FIRST PASS YIELD */}
          {activeTab === 'operational' && (
            <>
              {/* PRIMARY KPI METRIC CARDS */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)',
                      border: '1px solid #b7eb8f',
                    }}
                  >
                    <Statistic
                      title={<Text strong style={{ color: '#389e0d' }}>First Pass Yield (FPY)</Text>}
                      value={fpy}
                      precision={1}
                      suffix="%"
                      prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#237804', fontWeight: 700, fontSize: 32 }}
                    />
                    <Progress
                      percent={fpy}
                      strokeColor={{ '0%': '#52c41a', '100%': '#389e0d' }}
                      status="active"
                      style={{ marginTop: 8 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>Target: &ge; 95.0% Operational Benchmark</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)',
                      border: '1px solid #91d5ff',
                    }}
                  >
                    <Statistic
                      title={<Text strong style={{ color: '#096dd9' }}>Overall Inspection Acceptance Rate</Text>}
                      value={acceptanceRate}
                      precision={1}
                      suffix="%"
                      prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#0050b3', fontWeight: 700, fontSize: 32 }}
                    />
                    <Progress
                      percent={acceptanceRate}
                      strokeColor={{ '0%': '#1890ff', '100%': '#096dd9' }}
                      status="active"
                      style={{ marginTop: 8 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {summary?.passedInspections ?? 0} Accepted / {summary?.totalInspections ?? 0} Inspected
                    </Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #fffbe6 0%, #ffffff 100%)',
                      border: '1px solid #ffe58f',
                    }}
                  >
                    <Statistic
                      title={<Text strong style={{ color: '#d48806' }}>Quarantine Containment Compliance</Text>}
                      value={slaCompliance}
                      precision={1}
                      suffix="%"
                      prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
                      valueStyle={{ color: '#ad6800', fontWeight: 700, fontSize: 32 }}
                    />
                    <Progress
                      percent={slaCompliance}
                      strokeColor={{ '0%': '#faad14', '100%': '#d48806' }}
                      style={{ marginTop: 8 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>Target: Immediate Quarantine Segregation</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #fff1f0 0%, #ffffff 100%)',
                      border: '1px solid #ffa39e',
                    }}
                  >
                    <Statistic
                      title={<Text strong style={{ color: '#cf1322' }}>Active Non-Conformance Reports (NCR)</Text>}
                      value={summary?.openNcrCount ?? 0}
                      prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
                      valueStyle={{ color: '#a8071a', fontWeight: 700, fontSize: 32 }}
                    />
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Open CAPAs: <Text strong>{summary?.activeCapaCount ?? 0}</Text>
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Pending Inspections: <Text strong>{summary?.pendingInspectionsCount ?? 0}</Text>
                      </Text>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {(summary?.openNcrCount ?? 0) > 0 && <Tag color="red">MRB Review Active</Tag>}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* DEFECT PARETO (80/20) & INSPECTION TRENDS */}
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card
                    title={
                      <Space>
                        <RiseOutlined style={{ color: '#1890ff' }} />
                        <Text strong>Defect Pareto Analysis (80/20 Rule)</Text>
                      </Space>
                    }
                    extra={<Tag color="blue">Top 10 Defect Categories</Tag>}
                    style={{ borderRadius: 12 }}
                  >
                    {pareto.length === 0 ? (
                      <Alert message="Zero Defect Benchmark Achieved" description="No defect records logged in the selected period." type="success" showIcon />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {pareto.map((item, index) => {
                          const is80Cutoff = item.cumulativePercentage <= 80
                          return (
                            <div key={item.defectCategory || index}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Space>
                                  <Tag color={index < 3 ? 'volcano' : 'default'}>#{index + 1}</Tag>
                                  <Text strong>{item.defectCategory}</Text>
                                  {is80Cutoff && <Tag color="error">Top 80% Cumulative</Tag>}
                                </Space>
                                <Space size="large">
                                  <Text type="secondary">{item.count} Occurrences ({item.percentage.toFixed(1)}%)</Text>
                                  <Text strong style={{ color: is80Cutoff ? '#cf1322' : '#595959' }}>
                                    Cumulative: {item.cumulativePercentage.toFixed(1)}%
                                  </Text>
                                </Space>
                              </div>
                              <Progress
                                percent={item.percentage}
                                success={{ percent: 0 }}
                                strokeColor={is80Cutoff ? '#ff4d4f' : '#1890ff'}
                                showInfo={false}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={10}>
                  <Card
                    title={
                      <Space>
                        <ThunderboltOutlined style={{ color: '#52c41a' }} />
                        <Text strong>Daily Inspection Volume &amp; Pass Trends</Text>
                      </Space>
                    }
                    extra={<Tag color="green">30-Day Surveillance</Tag>}
                    style={{ borderRadius: 12 }}
                  >
                    {trends.length === 0 ? (
                      <Alert message="No Inspection Trend Data Found" description="Completed inspections will populate daily trend history." type="info" showIcon />
                    ) : (
                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        <Table
                          dataSource={trends}
                          rowKey="date"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: 'Date', dataIndex: 'date', key: 'date' },
                            { title: 'Inspections', dataIndex: 'inspectionsCount', key: 'inspectionsCount', align: 'right' },
                            {
                              title: 'Pass Rate',
                              dataIndex: 'passRate',
                              key: 'passRate',
                              align: 'right',
                              render: (rate) => (
                                <Tag color={rate >= 90 ? 'green' : rate >= 75 ? 'orange' : 'red'}>
                                  {Number(rate).toFixed(1)}%
                                </Tag>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* SUPPLIER QUALITY RATINGS (SQR) */}
              <Card
                title={
                  <Space>
                    <TeamOutlined style={{ color: '#722ed1' }} />
                    <Text strong>Supplier Quality Rating (SQR) &amp; Inbound PPM Analysis</Text>
                  </Space>
                }
                extra={<Text type="secondary">External Supplier Performance Evaluation</Text>}
                style={{ borderRadius: 12 }}
              >
                <Table
                  columns={supplierColumns}
                  dataSource={supplierRatings}
                  rowKey="supplierId"
                  pagination={{ pageSize: 5 }}
                  size="middle"
                />
              </Card>
            </>
          )}

          {/* TAB 2: CUSTOMER QUALITY PERFORMANCE (PPM) (REQ-4.3.6) */}
          {activeTab === 'customerPpm' && (
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <Text strong>Customer Quality Performance (PPM) &amp; CQR Analysis</Text>
                </Space>
              }
              extra={
                <Space>
                  <RangePicker
                    value={customerDateRange}
                    onChange={(dates: any) => setCustomerDateRange(dates)}
                    format="YYYY-MM-DD"
                  />
                  <Button type="primary" onClick={fetchCustomerQualityData} loading={loading}>
                    Filter
                  </Button>
                </Space>
              }
              style={{ borderRadius: 12 }}
            >
              <Alert
                message="Authoritative Calculation Standard (AIAG / IATF 16949)"
                description="Customer PPM = (Defective Customer Returned Qty / Total Outbound Dispatched Qty) × 1,000,000. Customer Quality Rating (CQR %) = 100.00% - Return Defect Rate %."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={customerColumns}
                dataSource={customerRatings}
                rowKey="customerId"
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            </Card>
          )}

          {/* TAB 3: REJECTION & SCRAP COST IMPACT ANALYSIS (REQ-4.3.2) */}
          {activeTab === 'rejectionCost' && (
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: '#cf1322' }} />
                  <Text strong>Rejection Report with Financial Scrap Cost Impact</Text>
                </Space>
              }
              extra={
                <Space>
                  <Select
                    placeholder="Quality Stage"
                    allowClear
                    style={{ width: 180 }}
                    value={costStageFilter}
                    onChange={(val) => setCostStageFilter(val)}
                    options={[
                      { value: 'INCOMING_INSPECTION', label: 'Incoming (IQC)' },
                      { value: 'JOB_CARD_REJECTION', label: 'Shop-Floor Traveler (IPQC)' },
                      { value: 'PROCESS_INSPECTION', label: 'In-Process (IPQC)' },
                      { value: 'FINAL_INSPECTION', label: 'Final Inspection (FQC)' },
                      { value: 'CUSTOMER_RETURN', label: 'Customer RMA' },
                    ]}
                  />
                  <RangePicker
                    value={costDateRange}
                    onChange={(dates: any) => setCostDateRange(dates)}
                    format="YYYY-MM-DD"
                  />
                  <Button type="primary" onClick={fetchRejectionCostData} loading={loading}>
                    Filter
                  </Button>
                </Space>
              }
              style={{ borderRadius: 12 }}
            >
              <Alert
                message="Financial Valuation Traceability (Ind AS 2 / IAS 2)"
                description="Extended Scrap Valuation is computed from standard inventory valuation rates. Persisted abnormal scrap costs reflect actual P&L charges to General Ledger Account 5402 generated by the manufacturing cost engine."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={rejectionCostColumns}
                dataSource={rejectionCostItems}
                rowKey="defectRecordId"
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            </Card>
          )}

          {/* TAB 4: STAGE-WISE QUALITY SUMMARY (REQ-4.3.7) */}
          {activeTab === 'stageSummary' && (
            <Card
              title={
                <Space>
                  <ApartmentOutlined style={{ color: '#52c41a' }} />
                  <Text strong>Stage-Wise Quality &amp; Defect Distribution Summary</Text>
                </Space>
              }
              extra={
                <Space>
                  <RangePicker
                    value={stageDateRange}
                    onChange={(dates: any) => setStageDateRange(dates)}
                    format="YYYY-MM-DD"
                  />
                  <Button type="primary" onClick={fetchStageSummaryData} loading={loading}>
                    Filter
                  </Button>
                </Space>
              }
              style={{ borderRadius: 12 }}
            >
              <Alert
                message="Multi-Stage Surveillance Integrity"
                description="Preserves stratified quality metrics across Incoming (IQC), In-Process (IPQC), Final Inspection (FQC), and Customer Returns (RMA) without date flattening."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={stageColumns}
                dataSource={stageSummaries}
                rowKey="stageCode"
                pagination={false}
                size="middle"
              />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
