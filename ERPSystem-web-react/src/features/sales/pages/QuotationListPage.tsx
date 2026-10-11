import React, { useEffect, useState, useMemo } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Input,
  Row,
  Col,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Statistic,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  SwapRightOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { salesApi, QuotationDto } from '../api/salesApi'
import { QuotationModal } from '../components/QuotationModal'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography
const { Option } = Select

export const QuotationListPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [quotations, setQuotations] = useState<QuotationDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  const [modalVisible, setModalVisible] = useState(false)
  const [editId, setEditId] = useState<number | undefined>(undefined)

  const navigate = useNavigate()

  useEffect(() => {
    loadQuotations()
  }, [page, pageSize, statusFilter])

  const loadQuotations = async () => {
    setLoading(true)
    try {
      const res = await salesApi.fetchQuotations({
        status: statusFilter,
        page,
        rows: pageSize,
      })
      if (res.code === 200 && res.data) {
        setQuotations(res.data.rows || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      message.error('Failed to load sales quotations.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (id: number) => {
    try {
      const res = await salesApi.submitQuotation(id)
      if (res.code === 200) {
        message.success('Quotation submitted for customer review.')
        loadQuotations()
      } else {
        message.error(`Submission failed: ${res.data}`)
      }
    } catch (e: any) {
      message.error(`Error submitting quotation: ${e.message || e}`)
    }
  }

  const handleAccept = async (id: number) => {
    try {
      const res = await salesApi.acceptQuotation(id)
      if (res.code === 200) {
        message.success('Quotation marked as accepted by customer.')
        loadQuotations()
      } else {
        message.error(`Acceptance failed: ${res.data}`)
      }
    } catch (e: any) {
      message.error(`Error accepting quotation: ${e.message || e}`)
    }
  }

  const handleRevision = async (id: number) => {
    try {
      const res = await salesApi.createRevision(id)
      if (res.code === 200) {
        message.success(`New revision created successfully (Revision ID: ${res.data}).`)
        loadQuotations()
      } else {
        message.error(`Revision failed: ${res.data}`)
      }
    } catch (e: any) {
      message.error(`Error creating revision: ${e.message || e}`)
    }
  }

  const handleConvertToSO = async (id: number) => {
    try {
      const res = await salesApi.convertToSalesOrder(id)
      if (res.code === 200) {
        message.success(`Converted to Sales Order successfully (Sales Order ID: ${res.data}).`)
        loadQuotations()
      } else {
        message.error(`Conversion failed: ${res.data}`)
      }
    } catch (e: any) {
      message.error(`Error converting quotation: ${e.message || e}`)
    }
  }

  const getStatusTag = (status?: string) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">DRAFT</Tag>
      case 'SUBMITTED':
        return <Tag color="processing">SUBMITTED</Tag>
      case 'ACCEPTED':
        return <Tag color="success">ACCEPTED</Tag>
      case 'CONVERTED':
        return <Tag color="purple">CONVERTED TO SALES ORDER</Tag>
      case 'REJECTED':
        return <Tag color="error">REJECTED</Tag>
      default:
        return <Tag>{status || 'DRAFT'}</Tag>
    }
  }

  // Filtered in-memory data for search keyword
  const filteredQuotations = useMemo(() => {
    if (!searchKeyword.trim()) return quotations
    const kw = searchKeyword.toLowerCase().trim()
    return quotations.filter(
      (q) =>
        q.quotationNumber?.toLowerCase().includes(kw) ||
        q.customerName?.toLowerCase().includes(kw)
    )
  }, [quotations, searchKeyword])

  // Summary Metrics
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length
  const submittedCount = quotations.filter((q) => q.status === 'SUBMITTED').length
  const convertedCount = quotations.filter((q) => q.status === 'CONVERTED' || q.status === 'ACCEPTED').length

  const columns = [
    {
      title: 'Quotation Number',
      dataIndex: 'quotationNumber',
      key: 'quotationNumber',
      width: 200,
      render: (num: string, record: QuotationDto) => (
        <Space orientation="vertical" size={2}>
          <Text strong style={{ color: '#1677ff', cursor: 'pointer' }} onClick={() => { setEditId(record.id); setModalVisible(true) }}>
            {num}
          </Text>
          <Space size={4}>
            <Tag color="cyan" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>Rev {record.revisionNumber ?? 0}</Tag>
            {record.convertedSoId && (
              <Tag color="geekblue" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>SO #{record.convertedSoId}</Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Quotation Date',
      dataIndex: 'quotationDate',
      key: 'quotationDate',
      width: 130,
      render: (date: string) => (date ? new Date(date).toLocaleDateString('en-IN') : '-'),
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntilDate',
      key: 'validUntilDate',
      width: 130,
      render: (date: string) => (date ? new Date(date).toLocaleDateString('en-IN') : '-'),
    },
    {
      title: 'Taxable Amount (₹)',
      dataIndex: 'totalTaxableAmount',
      key: 'totalTaxableAmount',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Tax Amount (₹)',
      dataIndex: 'totalTaxAmount',
      key: 'totalTaxAmount',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Grand Total (₹)',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ color: '#0958d9', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center' as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      align: 'center' as const,
      render: (_: any, record: QuotationDto) => (
        <Space size="small">
          {record.status === 'DRAFT' && (
            <>
              <Tooltip title="Edit Draft Quotation">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#1677ff' }} />}
                  onClick={() => {
                    setEditId(record.id)
                    setModalVisible(true)
                  }}
                />
              </Tooltip>
              <Tooltip title="Submit for Customer Review">
                <Popconfirm
                  title="Submit this quotation to customer?"
                  onConfirm={() => handleSubmit(record.id!)}
                >
                  <Button type="text" size="small" icon={<SendOutlined style={{ color: '#1677ff' }} />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}

          {record.status === 'SUBMITTED' && (
            <Tooltip title="Mark as Accepted by Customer">
              <Popconfirm
                title="Mark quotation as ACCEPTED by customer?"
                onConfirm={() => handleAccept(record.id!)}
              >
                <Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
              </Popconfirm>
            </Tooltip>
          )}

          {record.status === 'ACCEPTED' && !record.convertedSoId && (
            <Tooltip title="Convert to Active Sales Order">
              <Popconfirm
                title="Convert this quotation into an active Sales Order?"
                onConfirm={() => handleConvertToSO(record.id!)}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<SwapRightOutlined />}
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                  Convert to SO
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {record.status !== 'CONVERTED' && (
            <Tooltip title="Create Revised Version">
              <Popconfirm
                title="Create a new revision of this quotation?"
                onConfirm={() => handleRevision(record.id!)}
              >
                <Button type="text" size="small" icon={<BranchesOutlined style={{ color: '#fa8c16' }} />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 20 }}>
      {/* KPI Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Total Quotations"
              value={total || quotations.length}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Draft Quotations"
              value={draftCount}
              prefix={<EditOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Submitted for Review"
              value={submittedCount}
              prefix={<ClockCircleOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Accepted & Converted"
              value={convertedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>Sales Quotations Registry</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditId(undefined)
              setModalVisible(true)
            }}
          >
            Create Quotation
          </Button>
        }
      >
        {/* Search & Filter Bar */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Search Quotation Number / Customer..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="SUBMITTED">Submitted</Option>
              <Option value="ACCEPTED">Accepted</Option>
              <Option value="CONVERTED">Converted to Sales Order</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6} md={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchKeyword('')
                  setStatusFilter(undefined)
                  loadQuotations()
                }}
              >
                Reset
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadQuotations}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={filteredQuotations}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space orientation="vertical" size={4}>
                    <Text strong>No Sales Quotations Found</Text>
                    <Text type="secondary">
                      Create your first sales quotation to initiate commercial proposals and track customer conversions.
                    </Text>
                  </Space>
                }
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditId(undefined)
                    setModalVisible(true)
                  }}
                >
                  Create First Quotation
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
            showSizeChanger: true,
            showTotal: (totalCount) => `Total ${totalCount} quotations`,
          }}
        />
      </Card>

      <QuotationModal
        visible={modalVisible}
        quotationId={editId}
        onClose={() => setModalVisible(false)}
        onSuccess={loadQuotations}
      />
    </div>
  )
}
