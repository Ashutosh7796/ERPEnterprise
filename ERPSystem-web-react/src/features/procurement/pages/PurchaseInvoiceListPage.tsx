import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  message,
  Tooltip,
  Popconfirm,
  Typography,
  Statistic,
  Empty,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  DiffOutlined,
  BranchesOutlined,
  FileDoneOutlined,
  StopOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { getPurchaseInvoices, postPurchaseInvoice } from '../api/procurementApi'
import { GstPurchaseInvoiceFormModal } from '../components/GstPurchaseInvoiceFormModal'
import { ThreeWayMatchViewerModal } from '../components/ThreeWayMatchViewerModal'
import { DocumentFlowModal } from '@/features/bill/components/DocumentFlowModal'

export const PurchaseInvoiceListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [selectedPoForMatch, setSelectedPoForMatch] = useState<{ id: number; number: string } | null>(null)

  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [flowDoc, setFlowDoc] = useState<{ id: number; type: string; number: string } | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const res = await getPurchaseInvoices({
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
        invoiceNumber: values.invoiceNumber,
        status: values.status,
      })
      const rows = res?.rows || res?.data?.rows || res?.data?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : 0)
      setDataSource(rows)
      setPagination((prev) => ({ ...prev, total }))
    } catch (err: any) {
      message.error('Failed to load purchase invoices: ' + (err.message || 'Server error'))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, form])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchInvoices()
  }

  const handleReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchInvoices()
  }

  const handlePostInvoice = async (record: any) => {
    try {
      await postPurchaseInvoice(record.id)
      message.success(`Purchase Invoice ${record.invoice_number} posted to ledger successfully.`)
      fetchInvoices()
    } catch (err: any) {
      message.error(err.message || 'Posting failed: Three-Way Match blocked or discrepancy detected')
    }
  }

  const { Text, Title } = Typography

  const kpis = useMemo(() => {
    const totalCount = pagination.total || dataSource.length
    const matchedCount = dataSource.filter((inv) => inv.status === 'MATCHED' || inv.status === 'POSTED').length
    const postedCount = dataSource.filter((inv) => inv.status === 'POSTED').length
    const totalVal = dataSource.reduce((acc, curr) => acc + (Number(curr.total_invoice_amount) || 0), 0)
    return { totalCount, matchedCount, postedCount, totalVal }
  }, [pagination.total, dataSource])

  const columns: TableColumnsType<any> = [
    {
      title: 'Supplier Invoice Number',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (num: string, record: any) => (
        <a
          style={{ fontWeight: 600 }}
          onClick={() => {
            setFlowDoc({ id: record.id, type: 'PURCHASE_INVOICE', number: num })
            setFlowModalOpen(true)
          }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'System Document Number',
      dataIndex: 'system_invoice_number',
      key: 'system_invoice_number',
      render: (num: string) => <Tag>{num}</Tag>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name: string, record: any) => (
        <Space orientation="vertical" size={1}>
          <Text strong>{name || `Supplier #${record.supplier_id}`}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            GSTIN: {record.supplier_gstin || 'N/A'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Supply Type',
      dataIndex: 'supply_type',
      key: 'supply_type',
      render: (type: string, record: any) => {
        const isRcm = record.is_rcm === 1 || record.is_rcm === true
        return (
          <Space orientation="vertical" size={2}>
            <Tag color={type === 'INTRA_STATE' ? 'blue' : 'purple'}>
              {type} (POS: {record.place_of_supply})
            </Tag>
            {isRcm && <Tag color="volcano">RCM SEC 9(3)</Tag>}
          </Space>
        )
      },
    },
    {
      title: 'Taxable Amount',
      dataIndex: 'total_taxable_amount',
      key: 'total_taxable_amount',
      align: 'right',
      render: (amt: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
          ₹{Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'GST Breakdown',
      key: 'tax_breakdown',
      align: 'right',
      render: (_, record: any) => {
        const cgst = Number(record.cgst_amount || 0)
        const sgst = Number(record.sgst_amount || 0)
        const igst = Number(record.igst_amount || 0)
        return (
          <Space orientation="vertical" size={1} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {igst > 0 ? (
              <Text type="secondary">IGST: ₹{igst.toFixed(2)}</Text>
            ) : (
              <>
                <Text type="secondary">CGST: ₹{cgst.toFixed(2)}</Text>
                <Text type="secondary">SGST: ₹{sgst.toFixed(2)}</Text>
              </>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Invoice Total',
      dataIndex: 'total_invoice_amount',
      key: 'total_invoice_amount',
      align: 'right',
      render: (amt: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1677ff' }}>
          ₹{Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'ITC Status',
      key: 'itc_summary',
      render: (_, record: any) => {
        const eligible = Number(record.eligible_itc_amount || 0)
        const blocked = Number(record.blocked_itc_amount || 0)
        return (
          <Space orientation="vertical" size={1} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {eligible > 0 && <Tag color="green">Eligible: ₹{eligible.toFixed(2)}</Tag>}
            {blocked > 0 && <Tag color="orange">Blocked (17(5)): ₹{blocked.toFixed(2)}</Tag>}
          </Space>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => {
        let color = 'default'
        if (status === 'POSTED') color = 'success'
        if (status === 'MATCHED') color = 'processing'
        if (status === 'DRAFT') color = 'warning'
        if (status === 'CANCELLED') color = 'error'
        return <Tag color={color}>{status || 'DRAFT'}</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 180,
      render: (_, record: any) => {
        const isPosted = record.status === 'POSTED'
        return (
          <Space size="small">
            {/* Post Invoice Button */}
            {!isPosted && (
              <Popconfirm
                title="Post Purchase Invoice"
                description="Post this Purchase Invoice? The 3-Way Match will be verified and financial liabilities posted to Accounts Payable."
                onConfirm={() => handlePostInvoice(record)}
                okText="Post Invoice"
                cancelText="Dismiss"
              >
                <Button size="small" type="primary" icon={<FileDoneOutlined />}>
                  Post
                </Button>
              </Popconfirm>
            )}

            {/* 3-Way Match Viewer */}
            <Tooltip title="View Three-Way Match Reconciler">
              <Button
                size="small"
                icon={<DiffOutlined />}
                onClick={() => {
                  setSelectedPoForMatch({
                    id: record.po_header_id || record.id,
                    number: record.invoice_number,
                  })
                  setMatchModalOpen(true)
                }}
              />
            </Tooltip>

            {/* Document Flow / Lineage DAG */}
            <Tooltip title="View Document Lineage Flow">
              <Button
                size="small"
                icon={<BranchesOutlined />}
                onClick={() => {
                  setFlowDoc({ id: record.id, type: 'PURCHASE_INVOICE', number: record.invoice_number })
                  setFlowModalOpen(true)
                }}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 20 }}>
      {/* Executive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <FileTextOutlined style={{ color: '#1677ff', marginRight: 10 }} />
            Purchase Invoices (AP)
          </Title>
          <Text type="secondary">
            Process statutory supplier invoices, audit Input Tax Credit (ITC) eligibility, enforce 3-Way Match, and book general ledger AP liabilities.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Purchase Invoice
          </Button>
        </Space>
      </div>

      {/* KPI Statistic Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Total Purchase Invoices"
              value={kpis.totalCount}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
              styles={{ content: { fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="3-Way Matched"
              value={kpis.matchedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a', fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Posted to Ledger (AP)"
              value={kpis.postedCount}
              prefix={<AuditOutlined style={{ color: '#722ed1' }} />}
              styles={{ content: { color: '#722ed1', fontWeight: 600 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Invoice Liabilities (Page)"
              value={kpis.totalVal}
              precision={2}
              prefix="₹"
              styles={{ content: { color: '#1677ff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Form form={form} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={10} md={8}>
              <Form.Item name="invoiceNumber" label="Invoice Number" style={{ width: '100%', margin: 0 }}>
                <Input placeholder="Enter invoice number..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10} md={8}>
              <Form.Item name="status" label="Status" style={{ width: '100%', margin: 0 }}>
                <Select placeholder="Filter by status" allowClear>
                  <Select.Option value="DRAFT">Draft</Select.Option>
                  <Select.Option value="MATCHED">Matched</Select.Option>
                  <Select.Option value="POSTED">Posted</Select.Option>
                  <Select.Option value="CANCELLED">Cancelled</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={4} md={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Main Table */}
      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1350 }}
          bordered
          size="middle"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No purchase invoices found matching the filter criteria."
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create Purchase Invoice
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Total ${total} Purchase Invoices`,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total })
            },
          }}
        />
      </Card>

      {/* Create Purchase Invoice Modal */}
      <GstPurchaseInvoiceFormModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          fetchInvoices()
        }}
      />

      {/* Three-Way Match Modal */}
      <ThreeWayMatchViewerModal
        visible={matchModalOpen}
        poId={selectedPoForMatch?.id || null}
        poNumber={selectedPoForMatch?.number || ''}
        onClose={() => {
          setMatchModalOpen(false)
          setSelectedPoForMatch(null)
        }}
      />

      {/* Document Flow DAG Modal */}
      {flowDoc && (
        <DocumentFlowModal
          open={flowModalOpen}
          docType={flowDoc.type}
          docId={flowDoc.id}
          docNumber={flowDoc.number}
          onClose={() => {
            setFlowModalOpen(false)
            setFlowDoc(null)
          }}
        />
      )}
    </div>
  )
}
