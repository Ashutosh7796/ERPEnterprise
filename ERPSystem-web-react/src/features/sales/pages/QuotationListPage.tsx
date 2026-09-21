import React, { useEffect, useState } from 'react'
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
  Badge,
} from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  SwapRightOutlined,
  EditOutlined,
  ReloadOutlined,
  FilePdfOutlined,
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
      message.error('Failed to load sales quotations')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (id: number) => {
    try {
      const res = await salesApi.submitQuotation(id)
      if (res.code === 200) {
        message.success('Quotation submitted for customer review')
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
        message.success('Quotation marked as ACCEPTED by customer')
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
        message.success(`New Revision created (ID: ${res.data})`)
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
        message.success(`Converted to Sales Order successfully! (SO ID: ${res.data})`)
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
        return <Tag color="purple">CONVERTED TO SO</Tag>
      case 'REJECTED':
        return <Tag color="error">REJECTED</Tag>
      default:
        return <Tag>{status || 'DRAFT'}</Tag>
    }
  }

  const columns = [
    {
      title: 'Quotation No.',
      dataIndex: 'quotationNumber',
      key: 'quotationNumber',
      render: (num: string, record: QuotationDto) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1677ff' }}>
            {num}
          </Text>
          <Space>
            <Tag color="cyan">Rev {record.revisionNumber ?? 0}</Tag>
            {record.convertedSoId && (
              <Tag color="geekblue">SO #{record.convertedSoId}</Tag>
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
      render: (date: string) => (date ? new Date(date).toLocaleDateString('en-IN') : '-'),
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntilDate',
      key: 'validUntilDate',
      render: (date: string) => (date ? new Date(date).toLocaleDateString('en-IN') : '-'),
    },
    {
      title: 'Taxable (₹)',
      dataIndex: 'totalTaxableAmount',
      key: 'totalTaxableAmount',
      render: (val: number) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Tax (₹)',
      dataIndex: 'totalTaxAmount',
      key: 'totalTaxAmount',
      render: (val: number) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Grand Total (₹)',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      render: (val: number) => (
        <Text strong style={{ color: '#389e0d', fontSize: '14px' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: QuotationDto) => (
        <Space size="small">
          {record.status === 'DRAFT' && (
            <>
              <Tooltip title="Edit Draft">
                <Button
                  type="text"
                  icon={<EditOutlined />}
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
                  <Button type="text" icon={<SendOutlined />} style={{ color: '#1677ff' }} />
                </Popconfirm>
              </Tooltip>
            </>
          )}

          {record.status === 'SUBMITTED' && (
            <Tooltip title="Customer Accepted">
              <Popconfirm
                title="Mark quotation as ACCEPTED by customer?"
                onConfirm={() => handleAccept(record.id!)}
              >
                <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} />
              </Popconfirm>
            </Tooltip>
          )}

          {record.status === 'ACCEPTED' && !record.convertedSoId && (
            <Tooltip title="1-Click Convert to Sales Order">
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
            <Tooltip title="Create New Revision">
              <Popconfirm
                title="Create a new revision of this quotation?"
                onConfirm={() => handleRevision(record.id!)}
              >
                <Button type="text" icon={<BranchesOutlined />} style={{ color: '#fa8c16' }} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Sales Quotations Management (Q2C)
            </Title>
            <Text type="secondary">
              Authoritative Quotations lifecycle, multi-version revisions, and 1-Click Sales Order conversion
            </Text>
          </Col>
          <Col>
            <Space>
              <Select
                placeholder="Filter by Status"
                allowClear
                style={{ width: 180 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="DRAFT">Draft</Option>
                <Option value="SUBMITTED">Submitted</Option>
                <Option value="ACCEPTED">Accepted</Option>
                <Option value="CONVERTED">Converted to SO</Option>
                <Option value="REJECTED">Rejected</Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={loadQuotations}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditId(undefined)
                  setModalVisible(true)
                }}
              >
                New Quotation
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={quotations}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
            showSizeChanger: true,
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
