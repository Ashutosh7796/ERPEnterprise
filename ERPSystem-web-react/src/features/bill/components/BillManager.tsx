import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Card,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Popconfirm,
  message,
  Tooltip,
  Modal,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  EditOutlined,
  EyeOutlined,
  PrinterOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  BranchesOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { useAuthStore } from '@core/auth/authStore'
import { gstApi } from '@features/gst/api/gstApi'
import { procurementApi } from '../api/procurementApi'
import { BillModal } from './BillModal'
import { DocumentFlowModal } from './DocumentFlowModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import {
  ErpAgGrid,
  CurrencyCellRenderer,
  StatusTagCellRenderer,
  DateCellRenderer,
  LinkDocCellRenderer,
  type ErpColDef,
} from '@shared/components/grid'

const { RangePicker } = DatePicker

export interface BillManagerProps {
  type: '入库' | '出库' | '其它'
  subType: string
  title: string
  prefixNo: string
  partnerType?: 'vendor' | 'customer' | 'member' | 'none'
  partnerLabel?: string
}

export const BillManager: React.FC<BillManagerProps> = ({
  type,
  subType,
  title,
  prefixNo,
  partnerType = 'none',
  partnerLabel = 'Partner',
}) => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isManager = useMemo(() => {
    if (user?.leaderStatus === '1') return true
    const role = user?.roleName?.toLowerCase() || ''
    return role.includes('admin') || role.includes('manager') || role.includes('director') || role.includes('leader') || role.includes('super')
  }, [user])

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  // Expand / Collapse State
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Dropdown lists
  const [userList, setUserList] = useState<any[]>([])
  const [partnerList, setPartnerList] = useState<any[]>([])

  // Bill Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  // Document Flow DAG Modal State
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [flowDoc, setFlowDoc] = useState<{ id: number; type: string; number: string } | null>(null)

  const isTransfer = subType === '调拨出库'
  const isSimple =
    subType === '请购单' ||
    subType === '其它入库' ||
    subType === '其它出库' ||
    subType === '组装单' ||
    subType === '拆卸单'

  const resolveDocType = useCallback((st: string) => {
    if (st.includes('请购') || st.includes('Requisition')) return 'PURCHASE_REQUISITION'
    if (st.includes('采购订单') || st.includes('PurchaseOrder')) return 'PURCHASE_ORDER'
    if (st.includes('采购入库') || st.includes('PurchaseInbound')) return 'INBOUND_DELIVERY'
    if (st.includes('销售订单') || st.includes('SalesOrder')) return 'SALES_ORDER'
    if (st.includes('销售出库') || st.includes('SalesOutbound')) return 'OUTBOUND_DELIVERY'
    return 'DOCUMENT'
  }, [])

  // Load Dropdown Data
  useEffect(() => {
    http.get('/user/getUserList').then((res: any) => {
      if (res?.data?.userList) setUserList(res.data.userList)
      else if (Array.isArray(res)) setUserList(res)
    })

    if (partnerType === 'vendor') {
      http.get('/supplier/findBySelect_sup').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    } else if (partnerType === 'customer') {
      http.get('/supplier/findBySelect_cus').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    } else if (partnerType === 'member') {
      http.get('/supplier/findBySelect_retail').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    }
  }, [partnerType])

  const fetchData = useCallback(
    async (page = 1, pageSize = 10, values: any = {}) => {
      setLoading(true)
      try {
        const dates = values.dateRange
        const beginTime = dates ? dates[0]?.format('YYYY-MM-DD') : ''
        const endTime = dates ? dates[1]?.format('YYYY-MM-DD') : ''

        const searchJson = JSON.stringify({
          number: values.number || '',
          materialParam: values.materialParam || '',
          type,
          subType,
          creator: values.creator,
          organId: values.organId,
          status: values.status,
          remark: values.remark || '',
          beginTime,
          endTime,
        })

        const res = await http.get<any>('/depotHead/list', {
          params: {
            search: searchJson,
            currentPage: page,
            pageSize,
          },
        })

        if (res && res.data && res.data.rows) {
          setDataSource(res.data.rows)
          setPagination({ current: page, pageSize, total: res.data.total || 0 })
        } else if (res && res.rows) {
          setDataSource(res.rows)
          setPagination({ current: page, pageSize, total: res.total || 0 })
        } else {
          setDataSource([])
        }
      } catch (err: any) {
        console.error(`Failed to fetch ${title}:`, err)
        setDataSource([])
      } finally {
        setLoading(false)
      }
    },
    [type, subType, title]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select documents to delete')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      const res = await http.delete(`/depotHead/deleteBatch?ids=${ids}`)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Batch delete successful')
        setSelectedRowKeys([])
        fetchData(pagination.current, pagination.pageSize)
      } else {
        message.error('Failed to delete selected documents')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete')
    }
  }

  // Single Delete
  const handleDelete = async (id: number) => {
    try {
      const res = await http.delete(`/depotHead/delete?id=${id}`)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Document deleted successfully')
        fetchData(pagination.current, pagination.pageSize)
      } else {
        message.error('Failed to delete document')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete document')
    }
  }

  // Batch Status
  const handleBatchStatus = async (status: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select documents first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      const res: any = await http.post('/depotHead/batchSetStatus', {
        status: String(status),
        ids,
      })
      if (res && (res.code === 200 || res.status === 200 || res.code === 20000 || res.status === 'OK' || res.status === 0)) {
        message.success(status === 1 ? 'Approved successfully' : 'Unapproved successfully')
        setSelectedRowKeys([])
        fetchData(pagination.current, pagination.pageSize)
      } else {
        message.error(res?.message || res?.data?.message || 'Failed to update status')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to update status')
    }
  }

  // AG Grid Column Definitions
  const columnDefs = useMemo<ErpColDef<any>[]>(() => {
    const isSalesDoc = subType.includes('销售') || subType.includes('Sales') || prefixNo === 'XSCK' || prefixNo === 'XSDD' || prefixNo === 'XSTH'

    const cols: ErpColDef<any>[] = [
      {
        headerName: 'Action',
        colId: 'action',
        pinned: 'left',
        width: 220,
        minWidth: 200,
        lockPinned: true,
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const record = params.data
          if (!record) return null
          return (
            <div className="erp-grid-actions">
              <Tooltip title="View Document">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => {
                    setEditingRecord(record)
                    setModalOpen(true)
                  }}
                />
              </Tooltip>
              <Tooltip title="Edit Document">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#1677ff', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => {
                    setEditingRecord(record)
                    setModalOpen(true)
                  }}
                />
              </Tooltip>

              {/* Contextual Statutory Rule 46 Print for Sales */}
              {isSalesDoc && (
                <Tooltip title="Print Rule 46 Tax Invoice">
                  <Button
                    type="text"
                    size="small"
                    icon={<PrinterOutlined style={{ color: '#595959', fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                    onClick={() => navigate(`/sales/invoices/${record.id}/print`)}
                  />
                </Tooltip>
              )}

              {/* Contextual Statutory Rule 55 Challan Print for Stock Transfers */}
              {isTransfer && (
                <Tooltip title="Print Rule 55 Delivery Challan">
                  <Button
                    type="text"
                    size="small"
                    icon={<PrinterOutlined style={{ color: '#722ed1', fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                    onClick={() => navigate(`/inventory/transfers/${record.id}/print`)}
                  />
                </Tooltip>
              )}

              {/* Lifecycle Document Flow */}
              <Tooltip title="View Lifecycle Document Flow (P2P Trace)">
                <Button
                  type="text"
                  size="small"
                  icon={<BranchesOutlined style={{ color: '#1890ff', fontSize: 14 }} />}
                  style={{ padding: '0 4px' }}
                  onClick={() => {
                    setFlowDoc({ id: record.id, type: resolveDocType(subType), number: record.number })
                    setFlowModalOpen(true)
                  }}
                />
              </Tooltip>

              {/* Convert Requisition to Purchase Order */}
              {subType === '请购单' && record.status === '1' && (
                <Tooltip title="Convert Requisition to Purchase Order">
                  <Button
                    type="text"
                    size="small"
                    icon={<ShoppingCartOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Convert Requisition to Purchase Order',
                        content: `Generate Purchase Order for Requisition ${record.number}?`,
                        okText: 'Convert to PO',
                        onOk: async () => {
                          try {
                            const res: any = await procurementApi.convertToPo(record.id)
                            if (res && (res.code === 200 || res.status === 200)) {
                              message.success(`Purchase Order ${res.data?.poNumber || ''} generated successfully!`)
                              fetchData(pagination.current, pagination.pageSize)
                              navigate('/procurement/orders')
                            } else {
                              message.error(res?.data || res?.message || 'Conversion failed')
                            }
                          } catch (err: any) {
                            message.error(err?.message || 'Conversion error')
                          }
                        },
                      })
                    }}
                  />
                </Tooltip>
              )}

              {/* Contextual IRN Generation for Sales */}
              {isSalesDoc && (
                <Tooltip title="Generate Statutory e-Invoice / IRN">
                  <Button
                    type="text"
                    size="small"
                    icon={<ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                    onClick={async () => {
                      if (prefixNo === 'XSDD' || subType.includes('订单') || subType.includes('Order')) {
                        Modal.info({
                          title: 'Sales Order Compliance Notice',
                          content: (
                            <div>
                              <p><strong>Document: Sales Order ({record.number})</strong></p>
                              <p>Under Section 31 & Rule 48(4) of the CGST Act, government IRP e-Invoicing (IRN) is generated upon the execution of a <strong>Tax Invoice</strong> (Outbound Delivery or Billing Document), not on preliminary order bookings.</p>
                              <p>Please deliver/invoice this order to generate the official IRN & Signed QR Code.</p>
                            </div>
                          ),
                          okText: 'Understood',
                        })
                        return
                      }

                      const isReturnDoc = prefixNo === 'XSTH' || subType.includes('退货') || subType.includes('Return')
                      const docType = isReturnDoc ? 'CRN' : 'INV'

                      try {
                        message.loading({ content: `Generating Statutory ${docType === 'CRN' ? 'Credit Note' : 'Invoice'} IRN...`, key: 'irn_bill' })
                        const res: any = await gstApi.generateIrn({ documentId: record.id, documentType: docType })
                        if (res && res.code === 200) {
                          message.success({ content: 'IRN & Signed QR Generated Successfully!', key: 'irn_bill' })
                          fetchData(pagination.current, pagination.pageSize)
                        } else {
                          const errMsg = res?.data || res?.message || 'Generation Rejected'
                          if (String(errMsg).includes('B2C') || String(errMsg).includes('Unregistered')) {
                            message.destroy('irn_bill')
                            Modal.info({
                              title: 'B2C Transaction - Statutory Notice',
                              content: (
                                <div>
                                  <p><strong>Customer: {record.organName || 'Unregistered Buyer'} (B2C)</strong></p>
                                  <p>Under Rule 48(4) of the CGST Rules, government IRP e-Invoicing (IRN) applies exclusively to registered B2B entities, SEZ, and Export transactions.</p>
                                  <p>For B2C sales, statutory compliance is fulfilled by issuing a standard Rule 46 Tax Invoice with dynamic payment QR codes.</p>
                                </div>
                              ),
                              okText: 'Understood',
                            })
                          } else {
                            message.error({ content: `IRN Generation Failed: ${errMsg}`, key: 'irn_bill' })
                          }
                        }
                      } catch (e: any) {
                        const errMsg = e?.message || String(e)
                        if (errMsg.includes('B2C') || errMsg.includes('Unregistered')) {
                          message.destroy('irn_bill')
                          Modal.info({
                            title: 'B2C Transaction - Statutory Notice',
                            content: (
                              <div>
                                <p><strong>Customer: {record.organName || 'Unregistered Buyer'} (B2C)</strong></p>
                                <p>Under Rule 48(4) of the CGST Rules, government IRP e-Invoicing applies exclusively to registered B2B entities.</p>
                                <p>B2C sales are compliant via standard tax invoice and dynamic QR codes.</p>
                              </div>
                            ),
                            okText: 'Understood',
                          })
                        } else {
                          message.error({ content: `IRN Error: ${errMsg}`, key: 'irn_bill' })
                        }
                      }
                    }}
                  />
                </Tooltip>
              )}

              {/* Contextual Adjustment Note */}
              {isSalesDoc && (
                <Tooltip title="Issue Credit / Debit Note (Rule 53)">
                  <Button
                    type="text"
                    size="small"
                    icon={<SwapOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
                    style={{ padding: '0 4px' }}
                    onClick={() => navigate(`/sales/credit_notes/new?invoiceId=${record.id}`)}
                  />
                </Tooltip>
              )}

              <Popconfirm title="Delete this document?" onConfirm={() => handleDelete(record.id)}>
                <Tooltip title="Delete Document">
                  <Button type="text" danger size="small" icon={<DeleteOutlined style={{ fontSize: 14 }} />} style={{ padding: '0 4px' }} />
                </Tooltip>
              </Popconfirm>
            </div>
          )
        },
      },
    ]

    if (partnerType !== 'none') {
      cols.push({
        headerName: partnerLabel,
        field: 'organName',
        width: 180,
        minWidth: 160,
        flex: 1,
        wrapText: true,
        filter: true,
        valueGetter: (p) => p.data?.organName || '-',
      })
    }

    cols.push(
      {
        headerName: 'Doc Number',
        field: 'number',
        width: 170,
        minWidth: 150,
        filter: true,
        cellRenderer: (params: any) => {
          const val = params.value
          if (!val) return '-'
          return (
            <a
              style={{ fontWeight: 500, color: '#1677ff', cursor: 'pointer' }}
              onClick={() => {
                setEditingRecord(params.data)
                setModalOpen(true)
              }}
            >
              {val}
            </a>
          )
        },
      },
      {
        headerName: 'Ref PR / Linked Doc',
        field: 'linkNumber',
        width: 170,
        minWidth: 150,
        filter: true,
        cellRenderer: (params: any) => (
          <LinkDocCellRenderer
            {...params}
            onClick={(data) => {
              setFlowDoc({ id: data.id, type: resolveDocType(subType), number: data.number })
              setFlowModalOpen(true)
            }}
          />
        ),
      },
      {
        headerName: 'Product Info',
        field: 'materialsList',
        width: 240,
        minWidth: 200,
        flex: 2,
        wrapText: true,
        filter: true,
        tooltipField: 'materialsList',
        valueGetter: (p) => p.data?.materialsList || '-',
      },
      {
        headerName: 'Doc Date',
        field: 'operTimeStr',
        width: 165,
        minWidth: 155,
        filter: true,
        cellRenderer: DateCellRenderer,
      },
      {
        headerName: 'Operator',
        field: 'userName',
        width: 120,
        minWidth: 100,
        filter: true,
        valueGetter: (p) => p.data?.userName || p.data?.creatorName || '-',
      },
      {
        headerName: 'Qty',
        field: 'materialCount',
        width: 90,
        minWidth: 80,
        type: 'numericColumn',
        valueGetter: (p) => (p.data?.materialCount !== undefined && p.data?.materialCount !== null ? Number(p.data.materialCount) : 0),
      }
    )

    if (!isSimple && !isTransfer) {
      cols.push(
        {
          headerName: 'Total Amount (₹)',
          field: 'totalPrice',
          width: 140,
          minWidth: 120,
          type: 'numericColumn',
          cellRenderer: CurrencyCellRenderer,
        },
        {
          headerName: 'Tax-Incl. Total (₹)',
          field: 'totalTaxLastMoney',
          width: 150,
          minWidth: 130,
          type: 'numericColumn',
          valueGetter: (p) => {
            const sum = Number(p.data?.discountMoney || 0) + Number(p.data?.discountLastMoney || 0) || p.data?.totalTaxLastMoney || p.data?.totalPrice
            return sum !== undefined && sum !== null ? sum : 0
          },
          cellRenderer: CurrencyCellRenderer,
        },
        {
          headerName: 'Paid Amount (₹)',
          field: 'changeAmount',
          width: 130,
          minWidth: 110,
          type: 'numericColumn',
          cellRenderer: CurrencyCellRenderer,
        },
        {
          headerName: 'Debt Amount (₹)',
          field: 'debt',
          width: 130,
          minWidth: 110,
          type: 'numericColumn',
          cellRenderer: (p: any) => <CurrencyCellRenderer {...p} colorizeDebt />,
        }
      )
    }

    if (isTransfer) {
      cols.push({
        headerName: 'Total Amount (₹)',
        field: 'totalPrice',
        width: 140,
        minWidth: 120,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      })
    }

    cols.push(
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        minWidth: 110,
        filter: true,
        cellRenderer: (p: any) => {
          const status = String(p.value ?? '')
          if (status === '1') return <Tag color="green">Approved</Tag>
          if (status === '2') return <Tag color="red">Rejected</Tag>
          if (status === '3') return <Tag color="blue">Partial</Tag>
          if (status === '9') return <Tag color="orange">Under Review</Tag>
          if (subType === '请购单' && !isManager) {
            return <Tag color="orange">Pending Review</Tag>
          }
          return <Tag color="gold">Pending Approval</Tag>
        },
      },
      {
        headerName: 'Remarks',
        field: 'remark',
        width: 180,
        minWidth: 150,
        flex: 1.5,
        wrapText: true,
        filter: true,
        tooltipField: 'remark',
        valueGetter: (p) => p.data?.remark || '-',
      }
    )

    return cols
  }, [partnerType, partnerLabel, subType, prefixNo, isSimple, isTransfer, isManager, navigate, resolveDocType, pagination, fetchData])

  // Top Action Bar Buttons
  const leftToolbarButtons = (
    <Space size="small" wrap>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingRecord(null)
          setModalOpen(true)
        }}
      >
        Add New
      </Button>
      <Popconfirm
        title="Delete selected documents?"
        onConfirm={handleBatchDelete}
        disabled={selectedRowKeys.length === 0}
      >
        <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
          Batch Delete
        </Button>
      </Popconfirm>
      <Button
        icon={<CheckOutlined />}
        onClick={() => handleBatchStatus(1)}
        disabled={selectedRowKeys.length === 0}
      >
        Approve
      </Button>
      <Button
        icon={<StopOutlined />}
        onClick={() => handleBatchStatus(0)}
        disabled={selectedRowKeys.length === 0}
      >
        Unapprove
      </Button>
      <ExportPrintButtons
        title={`${title} Documents`}
        columns={columnDefs as any}
        dataSource={dataSource}
      />
    </Space>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Clean Grid Search Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        {/* Row 1 */}
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="number"
              label="Doc Number:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter doc number..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="materialParam"
              label="Product Info:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter barcode, name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="dateRange"
              label="Doc Date:"
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space wrap style={{ paddingLeft: 4 }}>
              <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                Search
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields()
                  fetchData(1, pagination.pageSize)
                }}
              >
                Reset
              </Button>
              <Button
                type="link"
                onClick={() => setExpandedSearch(!expandedSearch)}
                style={{ padding: 0 }}
              >
                {expandedSearch ? 'Collapse' : 'Expand'}{' '}
                {expandedSearch ? <UpOutlined /> : <DownOutlined />}
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Row 2 (Expandable) */}
        {expandedSearch && (
          <Row gutter={[16, 12]} align="middle" style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="creator"
                label="Operator:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select Operator..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  options={userList.map((u) => ({
                    value: u.id,
                    label: u.userName || u.loginName,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {partnerType !== 'none' && (
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="organId"
                  label={`${partnerLabel}:`}
                  labelCol={{ flex: '90px' }}
                  wrapperCol={{ flex: 'auto' }}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    placeholder={`Select ${partnerLabel}...`}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    options={partnerList.map((v) => ({
                      value: v.id,
                      label: v.supplier || v.name,
                    }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="status"
                label="Doc Status:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select status..."
                  allowClear
                  options={[
                    { value: '0', label: 'Pending' },
                    { value: '1', label: 'Approved' },
                    { value: '2', label: 'Completed' },
                    { value: '3', label: 'Partial' },
                    { value: '9', label: 'Under Review' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="remark"
                label="Doc Remarks:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Enter remarks..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>

      {/* Modern High-Performance AG Grid */}
      <ErpAgGrid
        rowData={dataSource}
        columnDefs={columnDefs}
        loading={loading}
        rowSelection="multiple"
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={(_, keys) => setSelectedRowKeys(keys)}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
        leftToolbar={leftToolbarButtons}
        exportFileName={`${title}_documents`}
        persistenceKey={`bill_manager_${subType}`}
        height="560px"
      />

      {/* Add / Edit Bill Modal */}
      <BillModal
        open={modalOpen}
        title={editingRecord ? `Edit ${title}` : `New ${title}`}
        type={type}
        subType={subType}
        prefixNo={prefixNo}
        partnerType={partnerType}
        partnerLabel={partnerLabel}
        editingRecord={editingRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />

      {/* Lifecycle Document Flow DAG Modal */}
      <DocumentFlowModal
        open={flowModalOpen}
        onClose={() => setFlowModalOpen(false)}
        docType={flowDoc?.type || resolveDocType(subType)}
        docId={flowDoc?.id}
        docNumber={flowDoc?.number}
        onSelectDoc={(id) => {
          http.get(`/depotHead/getDetailByNumber?number=${id}`).then((res: any) => {
            if (res && res.data) {
              setEditingRecord(res.data)
              setModalOpen(true)
            }
          })
        }}
      />
    </Card>
  )
}
