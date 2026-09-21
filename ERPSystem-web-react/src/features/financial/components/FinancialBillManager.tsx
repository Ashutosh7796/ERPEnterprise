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
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { FinancialModal } from './FinancialModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import {
  ErpAgGrid,
  CurrencyCellRenderer,
  DateCellRenderer,
  type ErpColDef,
} from '@shared/components/grid'

const { RangePicker } = DatePicker

export interface FinancialBillManagerProps {
  type: '收入' | '支出' | '收款' | '付款' | '转账' | '收预付款'
  title: string
  prefixNo: string
  partnerType?: 'vendor' | 'customer' | 'member' | 'none'
  partnerLabel?: string
}

export const FinancialBillManager: React.FC<FinancialBillManagerProps> = ({
  type,
  title,
  prefixNo,
  partnerType = 'none',
  partnerLabel = 'Partner',
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  // Search Expand / Collapse State
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Dropdown lists
  const [userList, setUserList] = useState<any[]>([])
  const [partnerList, setPartnerList] = useState<any[]>([])
  const [accountList, setAccountList] = useState<any[]>([])
  const [personList, setPersonList] = useState<any[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

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
    } else if (partnerType === 'customer' || partnerType === 'member') {
      http.get('/supplier/findBySelect_cus').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    }

    http.get('/account/getAccount').then((res: any) => {
      if (res?.data?.accountList) setAccountList(res.data.accountList)
    })

    http.get('/person/getAll').then((res: any) => {
      if (Array.isArray(res)) setPersonList(res)
      else if (res?.data) setPersonList(res.data)
    })
  }, [partnerType])

  const fetchData = useCallback(
    async (page = 1, pageSize = 10, values: any = {}) => {
      setLoading(true)
      try {
        const dates = values.dateRange
        const beginTime = dates ? dates[0]?.format('YYYY-MM-DD') : ''
        const endTime = dates ? dates[1]?.format('YYYY-MM-DD') : ''

        const searchJson = JSON.stringify({
          billNo: values.billNo || '',
          type,
          organId: values.organId,
          creator: values.creator,
          handsPersonId: values.handsPersonId,
          accountId: values.accountId,
          status: values.status,
          remark: values.remark || '',
          beginTime,
          endTime,
        })

        const res = await http.get<any>('/accountHead/list', {
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
    [type, title]
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
      const res = await http.delete(`/accountHead/deleteBatch?ids=${ids}`)
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
      const res = await http.delete(`/accountHead/delete?id=${id}`)
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
      const res: any = await http.post('/accountHead/batchSetStatus', {
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
    const cols: ErpColDef<any>[] = [
      {
        headerName: 'Action',
        colId: 'action',
        pinned: 'left',
        width: 130,
        minWidth: 120,
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
        field: 'billNo',
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
        headerName: 'Doc Date',
        field: 'billTimeStr',
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
        headerName: 'Financial Staff',
        field: 'handsPersonName',
        width: 150,
        minWidth: 130,
        wrapText: true,
        filter: true,
        valueGetter: (p) => p.data?.handsPersonName || '-',
      },
      {
        headerName: 'Account',
        field: 'accountName',
        width: 210,
        minWidth: 180,
        flex: 1.5,
        wrapText: true,
        filter: true,
        valueGetter: (p) => p.data?.accountName || '-',
      }
    )

    if (type === '收款' || type === '付款') {
      cols.push(
        {
          headerName: 'Total (₹)',
          field: 'totalPrice',
          width: 140,
          minWidth: 120,
          type: 'numericColumn',
          cellRenderer: CurrencyCellRenderer,
        },
        {
          headerName: 'Discount (₹)',
          field: 'discountMoney',
          width: 130,
          minWidth: 110,
          type: 'numericColumn',
          cellRenderer: CurrencyCellRenderer,
        }
      )
    }

    cols.push(
      {
        headerName: 'Amount (₹)',
        field: 'changeAmount',
        width: 140,
        minWidth: 120,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        minWidth: 100,
        filter: true,
        cellRenderer: (p: any) => {
          const status = String(p.value ?? '')
          if (status === '1') return <Tag color="green">Approved</Tag>
          if (status === '9') return <Tag color="orange">Under Review</Tag>
          return <Tag color="red">Pending</Tag>
        },
      },
      {
        headerName: 'Remarks',
        field: 'remark',
        width: 180,
        minWidth: 150,
        flex: 1,
        wrapText: true,
        filter: true,
        tooltipField: 'remark',
        valueGetter: (p) => p.data?.remark || '-',
      }
    )

    return cols
  }, [partnerType, partnerLabel, type])

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
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="billNo"
              label="Doc Number:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter doc number..." allowClear style={{ width: '100%' }} />
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
                name="handsPersonId"
                label="Staff:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select staff..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  options={personList.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="accountId"
                label="Account:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select account..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  options={accountList.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
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
        exportFileName={`${title}_financial_docs`}
        persistenceKey={`financial_grid_${type}`}
        height="560px"
      />

      {/* Add / Edit Financial Modal */}
      <FinancialModal
        open={modalOpen}
        title={editingRecord ? `Edit ${title}` : `New ${title}`}
        type={type}
        prefixNo={prefixNo}
        partnerType={partnerType}
        partnerLabel={partnerLabel}
        editingRecord={editingRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />
    </Card>
  )
}
