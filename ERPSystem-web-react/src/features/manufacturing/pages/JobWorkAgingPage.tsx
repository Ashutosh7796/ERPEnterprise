import React, { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Select,
  Statistic,
  Alert,
  Tooltip,
  Divider,
  App,
} from 'antd'
import {
  WarningOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@/core/api/client'
import { jobWorkApi, Section143AgingVo, AgingItem } from '../api/jobWorkApi'

const { Title, Text } = Typography

export const JobWorkAgingPage: React.FC = () => {
  const { message } = App.useApp()
  const [agingData, setAgingData] = useState<Section143AgingVo | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [supplierFilter, setSupplierFilter] = useState<number | undefined>(undefined)
  const [suppliers, setSuppliers] = useState<any[]>([])

  useEffect(() => {
    // Load suppliers for dropdown
    http.get('/supplier/findBySelect_sup', { params: { type: '供应商' } }).then((res: any) => {
      const data = res?.data || res || []
      setSuppliers(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  const fetchAging = async () => {
    try {
      setLoading(true)
      const res: any = await jobWorkApi.getSection143Aging({
        supplierId: supplierFilter,
        statusFilter: statusFilter === 'ALL' ? undefined : statusFilter,
      })
      if (res?.code === 200) {
        setAgingData(res.data)
      } else {
        message.error(res?.data || 'Failed to fetch Section 143 aging')
      }
    } catch (e: any) {
      message.error(e.message || 'Error fetching aging data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAging()
  }, [statusFilter, supplierFilter])

  const handleExportItc04 = () => {
    if (!agingData || !agingData.rows || agingData.rows.length === 0) {
      message.warning('No data available to export')
      return
    }
    const exportJson = JSON.stringify(agingData.rows, null, 2)
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Form_GST_ITC-04_${dayjs().format('YYYYMMDD')}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('Form GST ITC-04 data exported successfully')
  }

  const columns = [
    {
      title: 'Material Component',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 220,
      render: (name: string, record: AgingItem) => (
        <div>
          <b>{name}</b>
          {record.materialModel && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.materialModel}</div>}
          <div style={{ fontSize: 11, color: '#1677ff' }}>ID #{record.materialId} [{record.materialUnit || 'PCS'}]</div>
        </div>
      ),
    },
    {
      title: 'Job Worker (Subcontractor)',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
      render: (name: string, record: AgingItem) => (
        <div>
          <b>{name}</b>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            GSTIN: <code>{record.supplierGstin || 'Unregistered'}</code>
          </div>
        </div>
      ),
    },
    {
      title: 'Challan & Routing Ref',
      dataIndex: 'challanNumber',
      key: 'challanNumber',
      width: 180,
      render: (challan: string, record: AgingItem) => (
        <div>
          <div><Tag color="cyan">{challan}</Tag></div>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
            WO: {record.workOrderNumber || 'Direct Order'}
          </div>
          {record.operationName && (
            <div style={{ marginTop: 2 }}>
              <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                {record.operationSeq ? `Op #${record.operationSeq} ` : ''}{record.operationName}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Dispatch Date',
      dataIndex: 'dispatchDate',
      key: 'dispatchDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Due Date',
      dataIndex: 'statutoryDueDate',
      key: 'statutoryDueDate',
      width: 130,
      render: (date: string, record: AgingItem) => {
        const isOverdue = record.complianceStatus === 'OVERDUE'
        return (
          <span style={{ color: isOverdue ? '#cf1322' : '#d46b08', fontWeight: 600 }}>
            {date ? dayjs(date).format('DD/MM/YYYY') : '-'}
          </span>
        )
      },
    },
    {
      title: 'Sent / Returned',
      key: 'sentReturned',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: AgingItem) => (
        <div>
          <div>Sent: {record.dispatchedQty}</div>
          <div style={{ color: '#52c41a', fontSize: 12 }}>Ret: {record.receivedQty || 0}</div>
        </div>
      ),
    },
    {
      title: 'Pending Outside',
      dataIndex: 'pendingQty',
      key: 'pendingQty',
      width: 130,
      align: 'right' as const,
      render: (v: number, record: AgingItem) => (
        <div>
          <span style={{ fontWeight: 700, color: v > 0 ? '#cf1322' : '#52c41a', fontSize: 14 }}>
            {v}
          </span>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            ₹{(record.pendingValue || 0).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      title: 'Aging Days',
      key: 'aging',
      width: 140,
      render: (_: any, record: AgingItem) => (
        <div>
          <div><b>{record.daysElapsed} days</b> elapsed</div>
          <div style={{ fontSize: 11, color: record.daysRemaining < 0 ? '#cf1322' : '#8c8c8c' }}>
            {record.daysRemaining < 0
              ? `${Math.abs(record.daysRemaining)} days overdue`
              : `${record.daysRemaining} days remaining`}
          </div>
        </div>
      ),
    },
    {
      title: 'Aging Bucket',
      dataIndex: 'agingBucket',
      key: 'agingBucket',
      width: 130,
      render: (b: string) => {
        if (b === '> 365 DAYS') return <Tag color="error">{b}</Tag>
        if (b === '271-365 DAYS') return <Tag color="warning">{b}</Tag>
        return <Tag color="default">{b}</Tag>
      },
    },
    {
      title: 'Compliance Status',
      dataIndex: 'complianceStatus',
      key: 'complianceStatus',
      width: 160,
      render: (status: string) => {
        switch (status) {
          case 'COMPLIANT':
            return <Tag icon={<CheckCircleOutlined />} color="success">Compliant</Tag>
          case 'APPROACHING_DUE':
            return <Tag icon={<ClockCircleOutlined />} color="warning">Due Soon (&lt;60d)</Tag>
          case 'OVERDUE':
            return (
              <Tooltip title="Exceeded Statutory Return Deadline: Deemed supply risk">
                <Tag icon={<AlertOutlined />} color="error" style={{ fontWeight: 600 }}>
                  DEEMED SUPPLY RISK
                </Tag>
              </Tooltip>
            )
          case 'COMPLETED':
            return <Tag color="default">Completed</Tag>
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
  ]

  const totalOverdueCount = agingData?.totalOverdueCount || 0

  return (
    <div style={{ padding: 24 }}>
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <SafetyCertificateOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              Job Work Aging & Compliance Dashboard
            </Title>
            <Text type="secondary">
              Monitor return timelines, pending material quantities, and subcontractor aging compliance.
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExportItc04}>
                Export ITC-04 Report
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchAging}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {totalOverdueCount > 0 && (
        <Alert
          message="Overdue Subcontract Material Warning"
          description={`There are ${totalOverdueCount} open line item(s) exceeding the return deadline. These items may be subject to retrospective GST adjustments.`}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small">
            <Statistic
              title="Open Subcontract Orders"
              value={agingData?.totalOpenOrders || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card size="small">
            <Statistic
              title="Pending Units Outside"
              value={agingData?.totalPendingQuantity || 0}
              valueStyle={{ color: '#1677ff', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card size="small">
            <Statistic
              title="Total Pending Valuation"
              value={agingData?.totalPendingValue || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={3}>
          <Card size="small">
            <Statistic
              title="Compliant"
              value={agingData?.totalCompliantCount || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={3}>
          <Card size="small">
            <Statistic
              title="Due Within 60 Days"
              value={agingData?.totalApproachingDueCount || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={4}>
          <Card size="small" style={{ borderColor: totalOverdueCount > 0 ? '#ff4d4f' : undefined }}>
            <Statistic
              title="Overdue Items"
              value={totalOverdueCount}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Aging Buckets Valuation Summary */}
      <Card size="small" title="Aging Buckets Breakdown (Pending Material Valuation)" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Statistic
              title="0 - 90 Days"
              value={agingData?.bucket0to90Value || 0}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Statistic
              title="91 - 180 Days"
              value={agingData?.bucket91to180Value || 0}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Statistic
              title="181 - 270 Days"
              value={agingData?.bucket181to270Value || 0}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Statistic
              title="271 - 365 Days (Urgent)"
              value={agingData?.bucket271to365Value || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#d46b08' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Statistic
              title="> 365 Days (Overdue)"
              value={agingData?.bucketOver365Value || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
            />
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small" variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              showSearch
              allowClear
              placeholder="Filter by Job Worker"
              optionFilterProp="label"
              value={supplierFilter}
              onChange={(val) => setSupplierFilter(val)}
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.supplier || s.name,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'All Compliance States' },
                { value: 'OVERDUE', label: 'Overdue Items Only' },
                { value: 'APPROACHING_DUE', label: 'Due Within 60 Days Only' },
                { value: 'COMPLIANT', label: 'Compliant Only' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Traceability Table */}
      <Card variant="borderless">
        <Table
          dataSource={agingData?.rows || []}
          columns={columns}
          rowKey={(r) => `${r.jobWorkOrderId}-${r.materialId}`}
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1520 }}
          size="middle"
          bordered
        />
      </Card>
    </div>
  )
}
