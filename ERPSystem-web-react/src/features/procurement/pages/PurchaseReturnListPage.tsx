import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Space,
  Select,
  Input,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Empty,
} from 'antd'
import {
  RollbackOutlined,
  PlusOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons'
import {
  getPurchaseReturns,
  getDeliveryChallan,
  cancelPurchaseReturn,
  type ProcurementReturn,
  type DeliveryChallan,
} from '../api/procurementApi'
import { PurchaseReturnCreateModal } from '../components/PurchaseReturnCreateModal'
import { DeliveryChallanViewerModal } from '../components/DeliveryChallanViewerModal'
import { SupplierCreditNoteMatchModal } from '../components/SupplierCreditNoteMatchModal'

const { Title, Text } = Typography
const { Option } = Select

export const PurchaseReturnListPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<ProcurementReturn[]>([])
  const [total, setTotal] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [totalReturnAmount, setTotalReturnAmount] = useState<number>(0)

  // Filters
  const [returnTypeFilter, setReturnTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false)
  const [challanModalVisible, setChallanModalVisible] = useState<boolean>(false)
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null)
  const [matchModalVisible, setMatchModalVisible] = useState<boolean>(false)
  const [selectedReturnForMatch, setSelectedReturnForMatch] = useState<ProcurementReturn | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPurchaseReturns({
        currentPage,
        pageSize,
        returnType: returnTypeFilter || undefined,
        status: statusFilter || undefined,
      })
      if (res.data?.code === 200 && res.data?.data) {
        setData(res.data.data.rows || [])
        setTotal(res.data.data.total || 0)
        setTotalReturnAmount(res.data.data.totalReturnAmount || 0)
      }
    } catch (err: any) {
      message.error(err?.response?.data?.data || 'Failed to load purchase returns')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, returnTypeFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenChallan = async (record: ProcurementReturn) => {
    try {
      const res = await getDeliveryChallan(record.id)
      if (res.data?.code === 200 && res.data?.data) {
        setSelectedChallan(res.data.data)
        setChallanModalVisible(true)
      } else {
        message.info('No outward delivery challan found for this return document')
      }
    } catch (err: any) {
      message.error('Failed to retrieve delivery challan details')
    }
  }

  const handleOpenMatchModal = (record: ProcurementReturn) => {
    setSelectedReturnForMatch(record)
    setMatchModalVisible(true)
  }

  const handleCancelReturn = async (id: number) => {
    try {
      await cancelPurchaseReturn(id)
      message.success('Purchase return cancelled successfully')
      fetchData()
    } catch (err: any) {
      message.error(err?.response?.data?.data || 'Failed to cancel purchase return')
    }
  }

  // Summary KPI Metrics
  const physicalCount = data.filter((r) => r.returnType === 'PHYSICAL_RETURN').length
  const commercialCount = data.filter((r) => r.returnType === 'COMMERCIAL_ADJUSTMENT').length
  const pendingMatchCount = data.filter((r) => r.itcReversalStatus === 'PENDING_RECONCILIATION').length
  const totalItcReversed = data
    .filter((r) => r.isItcEligible)
    .reduce((sum, r) => sum + (r.cgstAmount || 0) + (r.sgstAmount || 0) + (r.igstAmount || 0), 0)

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data
    const term = searchTerm.toLowerCase().trim()
    return data.filter(
      (r) =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(term)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(term)) ||
        (r.originalInvoiceNumber && r.originalInvoiceNumber.toLowerCase().includes(term))
    )
  }, [data, searchTerm])

  const columns = [
    {
      title: 'Return Number & Date',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      render: (text: string, row: ProcurementReturn) => (
        <div>
          <Text strong code>{text}</Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {row.returnDate ? String(row.returnDate).split('T')[0] : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (text: string, row: ProcurementReturn) => (
        <div>
          <Text strong>{text}</Text>
          {row.originalInvoiceNumber && (
            <div style={{ fontSize: 12, color: '#595959' }}>
              Inv: {row.originalInvoiceNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Return Type',
      dataIndex: 'returnType',
      key: 'returnType',
      render: (val: string) => {
        if (val === 'PHYSICAL_RETURN') {
          return <Tag color="cyan">Physical Return</Tag>
        }
        if (val === 'COMMERCIAL_ADJUSTMENT') {
          return <Tag color="purple">Commercial Adj</Tag>
        }
        return <Tag color="blue">{val}</Tag>
      },
    },
    {
      title: 'Taxable Amount (₹)',
      dataIndex: 'taxableAmount',
      key: 'taxableAmount',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Gross Return (₹)',
      dataIndex: 'totalReturnAmount',
      key: 'totalReturnAmount',
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#cf1322' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'ITC Reversal (GSTR-3B 4B2)',
      dataIndex: 'itcReversalStatus',
      key: 'itcReversalStatus',
      render: (status: string, row: ProcurementReturn) => {
        if (!row.isItcEligible || status === 'EXEMPT_BLOCKED') {
          return (
            <Tooltip title="Section 17(5) Blocked ITC: Zero tax touch; reverses capitalized asset cost">
              <Tag color="volcano" icon={<WarningOutlined />}>EXEMPT (Blocked)</Tag>
            </Tooltip>
          )
        }
        if (status === 'RECONCILED_MATCHED') {
          return (
            <Tooltip title={`Matched with Credit Note: ${row.supplierCreditNoteNumber || 'Sec 34(1)'}`}>
              <Tag color="success" icon={<CheckCircleOutlined />}>MATCHED</Tag>
            </Tooltip>
          )
        }
        return (
          <Tooltip title="Pending supplier Credit Note appearance in GSTR-2B">
            <Tag color="warning" icon={<ClockCircleOutlined />}>PENDING 2B</Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Statutory Documents',
      key: 'docs',
      render: (_: any, row: ProcurementReturn) => (
        <Space orientation="vertical" size={2}>
          {row.deliveryChallanNumber && (
            <Button
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleOpenChallan(row)}
              style={{ padding: 0 }}
            >
              Challan: {row.deliveryChallanNumber}
            </Button>
          )}
          {row.supplierCreditNoteNumber && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              CN: {row.supplierCreditNoteNumber}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'GL Journal',
      dataIndex: 'glJournalId',
      key: 'glJournalId',
      render: (id: number) => id ? <Tag color="geekblue">JV-RET-{id}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, row: ProcurementReturn) => (
        <Space size="small">
          {row.returnType === 'PHYSICAL_RETURN' && (
            <Tooltip title="View Rule 55 Delivery Challan & E-Way Bill">
              <Button
                type="text"
                icon={<FileTextOutlined />}
                onClick={() => handleOpenChallan(row)}
              />
            </Tooltip>
          )}
          {row.itcReversalStatus === 'PENDING_RECONCILIATION' && (
            <Tooltip title="Reconcile with GSTR-2B Supplier Credit Note">
              <Button
                type="text"
                icon={<ReconciliationOutlined style={{ color: '#1890ff' }} />}
                onClick={() => handleOpenMatchModal(row)}
              />
            </Tooltip>
          )}
          {row.status !== 'CANCELLED' && (
            <Popconfirm
              title="Cancel Purchase Return?"
              description="Are you sure you want to cancel this return document?"
              onConfirm={() => handleCancelReturn(row.id)}
              okText="Yes, Cancel"
              cancelText="No"
            >
              <Button type="text" danger size="small">
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <RollbackOutlined style={{ color: '#ff4d4f', marginRight: 10 }} />
            Purchase Returns & Debit Notes
          </Title>
          <Text type="secondary">
            Manage supplier goods returns, outward delivery challans, debit notes, and tax adjustments.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Purchase Return
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic
              title="Total Cumulative Returns"
              value={totalReturnAmount}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #13c2c2' }}>
            <Statistic
              title="Physical Returns (Challans)"
              value={physicalCount}
              suffix="docs"
              styles={{ content: { color: '#08979c' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #faad14' }}>
            <Statistic
              title="Pending Matching"
              value={pendingMatchCount}
              suffix="reversals"
              styles={{ content: { color: '#d48806' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Tax Credit Reversals"
              value={totalItcReversed}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#389e0d' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Return Type"
              allowClear
              value={returnTypeFilter || undefined}
              onChange={(val) => setReturnTypeFilter(val || '')}
            >
              <Option value="PHYSICAL_RETURN">Physical Goods Return</Option>
              <Option value="COMMERCIAL_ADJUSTMENT">Commercial Rate Adjustment</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Status"
              allowClear
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
            >
              <Option value="POSTED">Posted (Active)</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search Supplier Name / Return Number..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
            <Button
              type="link"
              onClick={() => {
                setReturnTypeFilter('')
                setStatusFilter('')
                setSearchTerm('')
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Data Table */}
      <Table
        loading={loading}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        scroll={{ x: 1350 }}
        bordered
        size="middle"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No purchase returns found matching the filter criteria."
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
                onClick={() => setCreateModalVisible(true)}
              >
                Create Purchase Return
              </Button>
            </Empty>
          ),
        }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          onChange: (page, size) => {
            setCurrentPage(page)
            setPageSize(size)
          },
        }}
      />

      {/* Modals */}
      <PurchaseReturnCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false)
          fetchData()
        }}
      />

      <DeliveryChallanViewerModal
        visible={challanModalVisible}
        challan={selectedChallan}
        onClose={() => {
          setChallanModalVisible(false)
          setSelectedChallan(null)
        }}
      />

      <SupplierCreditNoteMatchModal
        visible={matchModalVisible}
        returnDoc={selectedReturnForMatch}
        onClose={() => {
          setMatchModalVisible(false)
          setSelectedReturnForMatch(null)
        }}
        onSuccess={() => {
          setMatchModalVisible(false)
          setSelectedReturnForMatch(null)
          fetchData()
        }}
      />
    </div>
  )
}
