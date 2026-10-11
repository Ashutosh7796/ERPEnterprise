import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Tabs,
  Typography,
  Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  PlusOutlined,
  PrinterOutlined,
  ThunderboltOutlined,
  CarOutlined,
  QrcodeOutlined,
  RedoOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  SwapOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { gstApi } from '@features/gst/api/gstApi'
import { formatCurrency, formatIndianDate } from '@shared/utils/indianTax'
import { GstSignedQrViewer } from '@features/gst/components/GstSignedQrViewer'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface BillingDocumentItem {
  id: number
  documentType: 'INV' | 'CRN' | 'DBN' | 'PROFORMA'
  number: string
  operTimeStr: string
  operTime: string
  organId?: number
  organName?: string
  customerGstin?: string
  posStateCode?: string
  taxableValue?: number
  totalPrice?: number
  taxLastMoney?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  status?: string
  postingStatus?: string
  irn?: string
  ackNo?: string
  ackDate?: string
  signedQrCode?: string
  ewbNumber?: string
  ewbValidUntil?: string
  einvoiceStatus?: string
  ewbStatus?: string
  remark?: string
}

export const BillingDocumentList: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [loading, setLoading] = useState<boolean>(false)
  const [dataSource, setDataSource] = useState<BillingDocumentItem[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false)
  const [selectedQrRecord, setSelectedQrRecord] = useState<BillingDocumentItem | null>(null)

  const [ewbModalOpen, setEwbModalOpen] = useState<boolean>(false)
  const [selectedEwbDoc, setSelectedEwbDoc] = useState<BillingDocumentItem | null>(null)
  const [ewbForm] = Form.useForm()

  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false)
  const [selectedCancelDoc, setSelectedCancelDoc] = useState<BillingDocumentItem | null>(null)
  const [cancelType, setCancelType] = useState<'IRN' | 'EWB'>('IRN')
  const [cancelForm] = Form.useForm()

  const [allDocuments, setAllDocuments] = useState<BillingDocumentItem[]>([])

  const fetchDocuments = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const searchParams: any = {}
      if (searchKeyword) {
        searchParams.number = searchKeyword
      }
      if (statusFilter) {
        searchParams.status = statusFilter
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        searchParams.beginTime = dateRange[0].format('YYYY-MM-DD 00:00:00')
        searchParams.endTime = dateRange[1].format('YYYY-MM-DD 23:59:59')
      }

      const res: any = await http.get('/depotHead/list', {
        params: {
          search: JSON.stringify(searchParams),
          currentPage: page,
          pageSize,
        },
      })

      if (res && res.data && res.data.rows) {
        const mapped: BillingDocumentItem[] = res.data.rows.map((row: any) => {
          let docType: 'INV' | 'CRN' | 'DBN' | 'PROFORMA' = 'INV'
          const sub = row.subType || ''
          const num = row.number || ''
          if (sub === 'CreditNote' || sub === '销售退货' || sub === '销售退货入库' || num.startsWith('CRN') || num.startsWith('CN')) {
            docType = 'CRN'
          } else if (sub === 'DebitNote' || num.startsWith('DBN') || num.startsWith('DN')) {
            docType = 'DBN'
          }

          const rawTotal = row.totalPrice != null ? Number(row.totalPrice) : (row.discountLastMoney != null ? Number(row.discountLastMoney) : (row.taxLastMoney != null ? Number(row.taxLastMoney) : 0))
          const rawTaxable = row.discountLastMoney != null ? Number(row.discountLastMoney) : (row.taxLastMoney != null ? Number(row.taxLastMoney) : rawTotal)
          return {
            id: row.id,
            documentType: docType,
            number: row.number,
            operTimeStr: row.operTimeStr || dayjs(row.operTime).format('YYYY-MM-DD HH:mm'),
            operTime: row.operTime,
            organId: row.organId,
            organName: row.organName || 'Walk-in Customer',
            customerGstin: row.taxNum || '-',
            posStateCode: '27',
            taxableValue: rawTaxable,
            totalPrice: rawTotal,
            taxLastMoney: rawTotal,
            status: row.status === '1' ? 'POSTED' : row.status === '0' ? 'DRAFT' : row.status || 'DRAFT',
            postingStatus: row.postingStatus || (row.status === '1' ? 'POSTED' : 'DRAFT'),
            irn: row.otherField1, // Check if IRN exists
            signedQrCode: row.otherField2,
            ewbNumber: row.otherField3,
            einvoiceStatus: row.otherField1 ? 'GENERATED' : 'NOT_GENERATED',
            remark: row.remark,
          }
        })

        setAllDocuments(mapped)

        // Tab Filtering
        let filtered = mapped
        if (activeTab === 'INVOICE') {
          filtered = mapped.filter((d) => d.documentType === 'INV')
        } else if (activeTab === 'CREDIT_NOTE') {
          filtered = mapped.filter((d) => d.documentType === 'CRN')
        } else if (activeTab === 'DEBIT_NOTE') {
          filtered = mapped.filter((d) => d.documentType === 'DBN')
        }

        setDataSource(filtered)
        setPagination({
          current: page,
          pageSize,
          total: res.data.total || mapped.length,
        })
      } else {
        setDataSource([])
        setAllDocuments([])
      }
    } catch (e: any) {
      console.error('Failed to load billing documents', e)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchKeyword, statusFilter, dateRange])

  useEffect(() => {
    fetchDocuments(pagination.current, pagination.pageSize)
  }, [fetchDocuments, pagination.current, pagination.pageSize])

  // Contextual Actions
  const handleGenerateIrn = async (record: BillingDocumentItem) => {
    const isB2bOrExport = record.customerGstin && record.customerGstin !== '-' && record.customerGstin.length >= 15
    if (!isB2bOrExport) {
      Modal.info({
        title: 'Statutory Notice: e-Invoice Rule 48(4)',
        centered: true,
        content: 'IRP e-Invoicing applies exclusively to B2B, SEZ, and Export transactions. This document is a B2C / Unregistered buyer sale, so statutory IRN generation is not applicable under GST law.',
        okText: 'Understood',
      })
      return
    }

    try {
      message.loading({ content: `Submitting ${record.number} to Statutory IRP Gateway...`, key: 'irn_gen' })
      const res: any = await gstApi.generateIrn({
        documentId: record.id,
        documentType: record.documentType,
      })
      if (res && res.code === 200) {
        message.success({ content: `IRN Generated Successfully for ${record.number}!`, key: 'irn_gen' })
        fetchDocuments(pagination.current, pagination.pageSize)
      } else {
        message.error({ content: `IRN Generation Failed: ${res?.data || 'Unknown error'}`, key: 'irn_gen' })
      }
    } catch (e: any) {
      message.error({ content: `IRN Generation Failed: ${e?.message || e}`, key: 'irn_gen' })
    }
  }

  const handleOpenEwbModal = (record: BillingDocumentItem) => {
    setSelectedEwbDoc(record)
    ewbForm.resetFields()
    ewbForm.setFieldsValue({
      distance: 120,
      vehicleType: 'R',
      transMode: '1',
    })
    setEwbModalOpen(true)
  }

  const handleGenerateEwbSubmit = async () => {
    try {
      const values = await ewbForm.validateFields()
      if (!selectedEwbDoc) return

      message.loading({ content: `Generating e-Way Bill for ${selectedEwbDoc.number}...`, key: 'ewb_gen' })
      const res: any = await gstApi.generateEwb(
        { documentId: selectedEwbDoc.id, documentType: selectedEwbDoc.documentType },
        {
          ...values,
          docNo: selectedEwbDoc.number,
          docDate: selectedEwbDoc.operTime,
        }
      )
      if (res && res.code === 200) {
        message.success({ content: `e-Way Bill Generated! EWB No: ${res.data?.ewbNo || 'Success'}`, key: 'ewb_gen' })
        setEwbModalOpen(false)
        fetchDocuments(pagination.current, pagination.pageSize)
      } else {
        message.error({ content: `EWB Generation Failed: ${res?.data || 'Unknown error'}`, key: 'ewb_gen' })
      }
    } catch (e: any) {
      message.error({ content: `EWB Generation Failed: ${e?.message || e}`, key: 'ewb_gen' })
    }
  }

  const handleReconcileStatus = async (record: BillingDocumentItem) => {
    try {
      message.loading({ content: `Reconciling status with IRP Portal for ${record.number}...`, key: 'rec_status' })
      const res: any = await gstApi.reconcileEinvoiceStatus({
        documentId: record.id,
        documentType: record.documentType,
      })
      if (res && res.code === 200) {
        message.success({ content: `Reconciliation Complete: ${res.data?.einvoiceStatus || 'Up-to-date'}`, key: 'rec_status' })
        fetchDocuments(pagination.current, pagination.pageSize)
      } else {
        message.error({ content: `Reconciliation Failed: ${res?.data || 'Unknown error'}`, key: 'rec_status' })
      }
    } catch (e: any) {
      message.error({ content: `Reconciliation Failed: ${e?.message || e}`, key: 'rec_status' })
    }
  }

  const handleCancelSubmit = async () => {
    try {
      const values = await cancelForm.validateFields()
      if (!selectedCancelDoc) return

      if (cancelType === 'IRN') {
        const res: any = await gstApi.cancelIrn({
          documentId: selectedCancelDoc.id,
          documentType: selectedCancelDoc.documentType,
          reasonCode: values.reasonCode,
          remarks: values.remarks,
        })
        if (res && res.code === 200) {
          message.success('IRN Cancelled Successfully on IRP Portal')
          setCancelModalOpen(false)
          fetchDocuments(pagination.current, pagination.pageSize)
        } else {
          message.error(`IRN Cancellation Failed: ${res?.data || 'Error'}`)
        }
      } else {
        const res: any = await gstApi.cancelEwb({
          documentId: selectedCancelDoc.id,
          reasonCode: values.reasonCode,
          remarks: values.remarks,
        })
        if (res && res.code === 200) {
          message.success('E-Way Bill Cancelled Successfully on NIC Portal')
          setCancelModalOpen(false)
          fetchDocuments(pagination.current, pagination.pageSize)
        } else {
          message.error(`EWB Cancellation Failed: ${res?.data || 'Error'}`)
        }
      }
    } catch (e: any) {
      message.error(`Cancellation Failed: ${e?.message || e}`)
    }
  }

  const columns: TableColumnsType<BillingDocumentItem> = [
    {
      title: 'Doc Number',
      dataIndex: 'number',
      key: 'number',
      width: 170,
      fixed: 'left',
      render: (val: string, record: BillingDocumentItem) => (
        <Space orientation="vertical" size={2}>
          <a
            style={{ fontWeight: 600 }}
            onClick={() => {
              if (record.documentType === 'CRN' || record.documentType === 'DBN') {
                navigate(`/sales/credit_notes/${record.id}`)
              } else {
                navigate(`/sales/invoices/${record.id}`)
              }
            }}
          >
            {val}
          </a>
          {record.documentType === 'INV' && (
            <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
              Tax Invoice · Rule 46
            </Tag>
          )}
          {record.documentType === 'CRN' && (
            <Tag color="orange" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
              Credit Note · Rule 53
            </Tag>
          )}
          {record.documentType === 'DBN' && (
            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
              Debit Note · Rule 53
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Doc Date',
      dataIndex: 'operTimeStr',
      key: 'operTimeStr',
      width: 130,
    },
    {
      title: 'Customer Legal Name & GSTIN',
      dataIndex: 'organName',
      key: 'organName',
      width: 220,
      render: (val: string, record: BillingDocumentItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{val}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            GSTIN: {record.customerGstin || 'URP / Unregistered'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Taxable Val (₹)',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      width: 130,
      align: 'right',
      render: (val: number) => formatCurrency(val || 0),
    },
    {
      title: 'Total Invoice Val (₹)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 150,
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#1677ff' }}>
          {formatCurrency(val || 0)}
        </span>
      ),
    },
    {
      title: 'Posting Status',
      dataIndex: 'postingStatus',
      key: 'postingStatus',
      width: 120,
      align: 'center',
      render: (st: string) => {
        switch (st) {
          case 'POSTED':
            return <Tag color="green">POSTED</Tag>
          case 'APPROVED':
            return <Tag color="blue">APPROVED</Tag>
          case 'VALIDATED':
            return <Tag color="cyan">VALIDATED</Tag>
          case 'TAX_VALIDATED':
            return <Tag color="gold">TAX VALIDATED</Tag>
          default:
            return <Tag color="default">DRAFT</Tag>
        }
      },
    },
    {
      title: 'Statutory e-Docs',
      key: 'edocs',
      width: 180,
      render: (_: any, record: BillingDocumentItem) => (
        <Space orientation="vertical" size={2}>
          {record.irn ? (
            <Tooltip title={`Official IRN: ${record.irn}`}>
              <Tag
                color="success"
                icon={<QrcodeOutlined />}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedQrRecord(record)
                  setQrModalOpen(true)
                }}
              >
                IRN Verified
              </Tag>
            </Tooltip>
          ) : (
            <Tag color="default" style={{ fontSize: 11 }}>
              Pending IRN
            </Tag>
          )}

          {record.ewbNumber && (
            <Tooltip title={`EWB: ${record.ewbNumber} (Valid: ${record.ewbValidUntil || 'Active'})`}>
              <Tag color="processing" icon={<CarOutlined />}>
                EWB Active
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Contextual Actions',
      key: 'action',
      width: 240,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: BillingDocumentItem) => (
        <Space size="small" wrap>
          {/* Print Statutory Document */}
          <Tooltip title="Print Rule 46 / Rule 53 Compliant Document">
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => {
                if (record.documentType === 'CRN' || record.documentType === 'DBN') {
                  navigate(`/sales/credit_notes/${record.id}/print`)
                } else {
                  navigate(`/sales/invoices/${record.id}/print`)
                }
              }}
            />
          </Tooltip>

          {/* IRN Generation / View */}
          {!record.irn ? (
            <Tooltip title="Generate Statutory e-Invoice / IRN">
              <Button
                type="text"
                size="small"
                icon={<ThunderboltOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => handleGenerateIrn(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="View Signed QR Code & Claims">
              <Button
                type="text"
                size="small"
                icon={<QrcodeOutlined style={{ color: '#52c41a' }} />}
                onClick={() => {
                  setSelectedQrRecord(record)
                  setQrModalOpen(true)
                }}
              />
            </Tooltip>
          )}

          {/* E-Way Bill Generation */}
          <Tooltip title="Generate e-Way Bill (Rule 138(10))">
            <Button
              type="text"
              size="small"
              icon={<CarOutlined style={{ color: '#1677ff' }} />}
              onClick={() => handleOpenEwbModal(record)}
            />
          </Tooltip>

          {/* Issue Adjustment Note */}
          {record.documentType === 'INV' && (
            <Tooltip title="Issue Credit / Debit Note against this Invoice">
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined style={{ color: '#722ed1' }} />}
                onClick={() => navigate(`/sales/credit_notes/new?invoiceId=${record.id}`)}
              />
            </Tooltip>
          )}

          {/* Reconcile Status */}
          <Tooltip title="Reconcile IRP Status">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              onClick={() => handleReconcileStatus(record)}
            />
          </Tooltip>

          {/* Statutory Cancellation */}
          {record.irn && (
            <Tooltip title="Cancel IRN (24-Hour Statutory Window)">
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedCancelDoc(record)
                  setCancelType('IRN')
                  cancelForm.resetFields()
                  setCancelModalOpen(true)
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // KPI calculations
  const totalCount = allDocuments.length || dataSource.length
  const invoiceCount = (allDocuments.length ? allDocuments : dataSource).filter((d) => d.documentType === 'INV').length
  const adjustmentCount = (allDocuments.length ? allDocuments : dataSource).filter((d) => d.documentType === 'CRN' || d.documentType === 'DBN').length
  const irnVerifiedCount = (allDocuments.length ? allDocuments : dataSource).filter((d) => d.irn).length

  return (
    <div style={{ padding: 20 }}>
      {/* Executive Process & KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              borderColor: activeTab === 'ALL' ? '#1677ff' : undefined,
              transition: 'all 0.2s ease',
            }}
            onClick={() => setActiveTab('ALL')}
          >
            <Statistic
              title="Total Billing Documents"
              value={totalCount}
              prefix={<FileProtectOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              borderColor: activeTab === 'INVOICE' ? '#52c41a' : undefined,
              transition: 'all 0.2s ease',
            }}
            onClick={() => setActiveTab('INVOICE')}
          >
            <Statistic
              title="Tax Invoices (Rule 46)"
              value={invoiceCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              borderColor: activeTab === 'CREDIT_NOTE' || activeTab === 'DEBIT_NOTE' ? '#722ed1' : undefined,
              transition: 'all 0.2s ease',
            }}
            onClick={() => setActiveTab('CREDIT_NOTE')}
          >
            <Statistic
              title="Credit & Debit Notes (Rule 53)"
              value={adjustmentCount}
              prefix={<SwapOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <Statistic
              title="e-Invoices Verified (IRN)"
              value={irnVerifiedCount}
              prefix={<QrcodeOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#1677ff' }} />
            <span>Manage Billing Documents</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sales/invoices/new')}
            >
              New Tax Invoice
            </Button>
            <Button
              icon={<SwapOutlined />}
              onClick={() => navigate('/sales/credit_notes/new')}
            >
              New Credit / Debit Note
            </Button>
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => navigate('/compliance/edocument_cockpit')}
            >
              e-Document Center
            </Button>
          </Space>
        }
      >
        {/* Process Filter Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            { key: 'ALL', label: 'All Billing Documents' },
            { key: 'INVOICE', label: 'Tax Invoices (Rule 46)' },
            { key: 'CREDIT_NOTE', label: 'Credit Notes (Rule 53)' },
            { key: 'DEBIT_NOTE', label: 'Debit Notes (Rule 53)' },
          ]}
        />

        {/* Filter Bar */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search Doc Number / Customer..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter Posting Status"
              style={{ width: '100%' }}
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              allowClear
            >
              <Select.Option value="POSTED">POSTED</Select.Option>
              <Select.Option value="APPROVED">APPROVED</Select.Option>
              <Select.Option value="VALIDATED">VALIDATED</Select.Option>
              <Select.Option value="DRAFT">DRAFT</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={7}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
          </Col>
          <Col xs={24} sm={24} md={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setSearchKeyword('')
                  setStatusFilter('')
                  setDateRange(null)
                  fetchDocuments(1, pagination.pageSize)
                }}
              >
                Reset
              </Button>
              <Button
                icon={<RedoOutlined />}
                onClick={() => fetchDocuments(pagination.current, pagination.pageSize)}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Documents Table */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <FileProtectOutlined style={{ fontSize: 40, color: '#bfbfbf', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: '#262626', marginBottom: 4 }}>
                  No Billing Documents Found
                </div>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 16 }}>
                  Create your first statutory Rule 46 Tax Invoice or adjust existing accounts with Rule 53 notes.
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/sales/invoices/new')}
                >
                  Create Tax Invoice
                </Button>
              </div>
            ),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} billing documents`,
            onChange: (page, pageSize) => fetchDocuments(page, pageSize),
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* Signed QR Code Modal */}
      <Modal
        title="Authoritative Signed QR Code & Compliance Claims"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setQrModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={540}
      >
        {selectedQrRecord && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <GstSignedQrViewer
                signedQrJwt={selectedQrRecord.signedQrCode || ''}
                irn={selectedQrRecord.irn}
                isVerified={true}
              />
            </div>
            <Card size="small" style={{ background: '#f5f5f5' }}>
              <div><strong>Document Number:</strong> {selectedQrRecord.number}</div>
              <div><strong>Official IRN:</strong> <span style={{ wordBreak: 'break-all', fontSize: 11 }}>{selectedQrRecord.irn}</span></div>
              <div><strong>Buyer GSTIN:</strong> {selectedQrRecord.customerGstin}</div>
              <div><strong>Total Invoice Value:</strong> {formatCurrency(selectedQrRecord.taxLastMoney || 0)}</div>
            </Card>
          </div>
        )}
      </Modal>

      {/* e-Way Bill Generation Modal */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: '#1677ff' }} />
            <span>Generate e-Way Bill (Statutory Rule 138(10))</span>
          </Space>
        }
        open={ewbModalOpen}
        onCancel={() => setEwbModalOpen(false)}
        onOk={handleGenerateEwbSubmit}
        okText="Generate E-Way Bill"
        width={560}
      >
        <Form form={ewbForm} layout="vertical" initialValues={{ distance: 120, vehicleType: 'R', transMode: '1' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="distance"
                label="Transportation Distance (KM)"
                rules={[{ required: true, message: 'Please enter distance' }]}
                extra="Validity: 1 day per 100 km (Regular) / 20 km (ODC)"
              >
                <InputNumber min={1} max={5000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vehicleType"
                label="Vehicle Cargo Type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="R">Regular Transport (100 km/day)</Select.Option>
                  <Select.Option value="O">Over Dimensional Cargo (20 km/day)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicleNo"
                label="Vehicle Number"
                rules={[{ required: true, message: 'Enter vehicle number' }]}
              >
                <Input placeholder="e.g. MH12AB1234" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transMode"
                label="Transport Mode"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="1">1 - Road</Select.Option>
                  <Select.Option value="2">2 - Rail</Select.Option>
                  <Select.Option value="3">3 - Air</Select.Option>
                  <Select.Option value="4">4 - Ship</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="transporterId" label="Transporter ID (GSTIN / TRANSIN)">
                <Input placeholder="15-digit GSTIN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transporterName" label="Transporter Name">
                <Input placeholder="Logistics Agency Name" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Statutory Cancellation Modal */}
      <Modal
        title={`Cancel Statutory ${cancelType} (24-Hour Window)`}
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={handleCancelSubmit}
        okText={`Confirm ${cancelType} Cancellation`}
        okButtonProps={{ danger: true }}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reasonCode"
            label="Statutory Cancellation Reason"
            rules={[{ required: true, message: 'Please select cancellation reason' }]}
          >
            <Select placeholder="Select Reason Code">
              <Select.Option value="1">1 - Duplicate Document</Select.Option>
              <Select.Option value="2">2 - Order Cancelled</Select.Option>
              <Select.Option value="3">3 - Data Entry Error</Select.Option>
              <Select.Option value="4">4 - Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="remarks"
            label="Cancellation Remarks"
            rules={[{ required: true, message: 'Please provide remark' }]}
          >
            <Input.TextArea rows={3} placeholder="Detailed explanation for statutory audit log" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
