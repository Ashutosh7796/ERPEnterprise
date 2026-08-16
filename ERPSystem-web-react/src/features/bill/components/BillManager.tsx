import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Popover,
  Checkbox,
  Popconfirm,
  Divider,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  DownloadOutlined,
  SettingOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { BillModal } from './BillModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

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
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Expand / Collapse State
  const [expandedSearch, setExpandedSearch] = useState(false)

  // Dropdown lists
  const [userList, setUserList] = useState<any[]>([])
  const [partnerList, setPartnerList] = useState<any[]>([])

  // Bill Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const isTransfer = subType === '调拨出库'
  const isSimple =
    subType === '请购单' ||
    subType === '其它入库' ||
    subType === '其它出库' ||
    subType === '组装单' ||
    subType === '拆卸单'

  // Dynamic Column Keys
  const allColumnKeys = useMemo(() => {
    const cols = ['action']
    if (partnerType !== 'none') cols.push('organName')
    cols.push('number', 'materialsList', 'operTimeStr', 'userName', 'materialCount')
    if (!isSimple && !isTransfer) {
      cols.push('totalPrice', 'totalTaxLastMoney', 'changeAmount', 'debt')
    }
    if (isTransfer) {
      cols.push('totalPrice')
    }
    cols.push('status', 'remark')
    return cols
  }, [partnerType, isSimple, isTransfer])

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  // Sync visible columns when subtype changes
  useEffect(() => {
    setVisibleColumns(allColumnKeys)
  }, [allColumnKeys])

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
      const res = await http.post(`/depotHead/batchSetStatus?status=${status}&ids=${ids}`)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success(status === 1 ? 'Approved successfully' : 'Unapproved successfully')
        setSelectedRowKeys([])
        fetchData(pagination.current, pagination.pageSize)
      } else {
        message.error('Failed to update status')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to update status')
    }
  }

  const columnsConfig: Record<string, any> = {
    action: {
      title: 'Action',
      key: 'action',
      width: 170,
      fixed: 'left',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            style={{ padding: 0 }}
            onClick={() => {
              setEditingRecord(record)
              setModalOpen(true)
            }}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            style={{ padding: 0 }}
            onClick={() => {
              setEditingRecord(record)
              setModalOpen(true)
            }}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            style={{ padding: 0 }}
            onClick={() => {
              setEditingRecord({ ...record, id: undefined, number: undefined })
              setModalOpen(true)
            }}
          >
            Copy
          </Button>
          <Popconfirm title="Delete this document?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} style={{ padding: 0 }}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
    organName: {
      title: partnerLabel,
      dataIndex: 'organName',
      key: 'organName',
      width: 150,
      ellipsis: true,
    },
    number: {
      title: 'Doc Number',
      dataIndex: 'number',
      key: 'number',
      width: 170,
      render: (val: string, record: any) => (
        <a
          onClick={() => {
            setEditingRecord(record)
            setModalOpen(true)
          }}
        >
          {val}
        </a>
      ),
    },
    materialsList: {
      title: 'Product Info',
      dataIndex: 'materialsList',
      key: 'materialsList',
      width: 220,
      ellipsis: true,
    },
    operTimeStr: {
      title: 'Doc Date',
      dataIndex: 'operTimeStr',
      key: 'operTimeStr',
      width: 150,
    },
    userName: {
      title: 'Operator',
      dataIndex: 'userName',
      key: 'userName',
      width: 100,
      ellipsis: true,
    },
    materialCount: {
      title: 'Qty',
      dataIndex: 'materialCount',
      key: 'materialCount',
      width: 80,
    },
    totalPrice: {
      title: 'Total Amount (₹)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 130,
      render: (val: any) => (val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    totalTaxLastMoney: {
      title: 'Tax-Incl. Total (₹)',
      dataIndex: 'totalTaxLastMoney',
      key: 'totalTaxLastMoney',
      width: 140,
      render: (val: any, record: any) => {
        const sum = Number(record.discountMoney || 0) + Number(record.discountLastMoney || 0) || val
        return sum !== undefined ? `₹${Number(sum).toFixed(2)}` : '-'
      },
    },
    changeAmount: {
      title: 'Paid Amount (₹)',
      dataIndex: 'changeAmount',
      key: 'changeAmount',
      width: 120,
      render: (val: any) => (val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    debt: {
      title: 'Debt Amount (₹)',
      dataIndex: 'debt',
      key: 'debt',
      width: 120,
      render: (val: any) => (
        <span style={{ color: Number(val) > 0 ? '#fa8c16' : '#52c41a' }}>
          {val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'}
        </span>
      ),
    },
    status: {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => {
        if (status === '1') return <Tag color="green">Approved</Tag>
        if (status === '2') return <Tag color="cyan">Completed</Tag>
        if (status === '3') return <Tag color="blue">Partial</Tag>
        if (status === '9') return <Tag color="orange">Under Review</Tag>
        return <Tag color="red">Pending</Tag>
      },
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 340 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {allColumnKeys.map((key) => (
          <Checkbox key={key} value={key} disabled={key === 'action' || key === 'number'}>
            {columnsConfig[key]?.title || key}
          </Checkbox>
        ))}
      </Checkbox.Group>
      <Divider style={{ margin: '8px 0' }} />
      <Button type="link" size="small" onClick={() => setVisibleColumns(allColumnKeys)}>
        Restore Default Columns
      </Button>
    </div>
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
                    label: u.userName,
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

      {/* Action Bar */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
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
            columns={columns as any}
            dataSource={dataSource}
          />
        </Space>

        <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
          <Button icon={<SettingOutlined />}>Column Settings</Button>
        </Popover>
      </div>

      {/* Main Table */}
      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1300 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
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
    </Card>
  )
}
