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
  SettingOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { FinancialModal } from './FinancialModal'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

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

  // Dynamic Column Keys
  const allColumnKeys = useMemo(() => {
    const cols = ['action']
    if (partnerType !== 'none') cols.push('organName')
    cols.push('billNo', 'billTimeStr', 'userName', 'handsPersonName', 'accountName')
    if (type === '收款' || type === '付款') {
      cols.push('totalPrice', 'discountMoney', 'changeAmount')
    } else {
      cols.push('changeAmount')
    }
    cols.push('remark', 'status')
    return cols
  }, [partnerType, type])

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

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
      const res = await http.post(`/accountHead/batchSetStatus?status=${status}&ids=${ids}`)
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
      width: 150,
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
    billNo: {
      title: 'Doc Number',
      dataIndex: 'billNo',
      key: 'billNo',
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
    billTimeStr: {
      title: 'Doc Date',
      dataIndex: 'billTimeStr',
      key: 'billTimeStr',
      width: 150,
    },
    userName: {
      title: 'Operator',
      dataIndex: 'userName',
      key: 'userName',
      width: 100,
      ellipsis: true,
    },
    handsPersonName: {
      title: 'Financial Staff',
      dataIndex: 'handsPersonName',
      key: 'handsPersonName',
      width: 120,
      ellipsis: true,
    },
    accountName: {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 130,
      ellipsis: true,
    },
    totalPrice: {
      title: 'Total (₹)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 110,
      render: (val: any) => (val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    discountMoney: {
      title: 'Discount (₹)',
      dataIndex: 'discountMoney',
      key: 'discountMoney',
      width: 110,
      render: (val: any) => (val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    changeAmount: {
      title: 'Amount (₹)',
      dataIndex: 'changeAmount',
      key: 'changeAmount',
      width: 120,
      render: (val: any) => (
        <strong style={{ color: '#1890ff' }}>
          {val !== undefined ? `₹${Number(val).toFixed(2)}` : '-'}
        </strong>
      ),
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    status: {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => {
        if (status === '1') return <Tag color="green">Approved</Tag>
        if (status === '9') return <Tag color="orange">Under Review</Tag>
        return <Tag color="red">Pending</Tag>
      },
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
          <Checkbox key={key} value={key} disabled={key === 'action' || key === 'billNo'}>
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
          {partnerType !== 'none' ? (
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
          ) : (
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="accountId"
                label="Account:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select Account..."
                  allowClear
                  options={accountList.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          )}
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
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="handsPersonId"
                label="Staff:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select Staff..."
                  allowClear
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
                label="Remarks:"
                labelCol={{ flex: '80px' }}
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
        scroll={{ x: 1200 }}
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
