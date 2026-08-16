import React, { useEffect, useState, useMemo } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Row,
  Col,
  Popover,
  Checkbox,
  Divider,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

const { RangePicker } = DatePicker
const { Text } = Typography

interface DetailReportProps {
  type: '入库' | '出库' | '调拨'
  title: string
}

export const InboundOutboundDetailReportPage: React.FC<DetailReportProps> = ({ type, title }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [depotList, setDepotList] = useState<any[]>([])
  const [partnerList, setPartnerList] = useState<any[]>([])
  const [userList, setUserList] = useState<any[]>([])

  const [totalQty, setTotalQty] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  const allColumnKeys = useMemo(() => {
    const cols = ['number', 'barCode', 'mname', 'standard', 'model', 'mUnit', 'operNumber', 'unitPrice', 'allPrice']
    if (type === '调拨') {
      cols.push('dname', 'sname')
    } else {
      cols.push('sname', 'dname')
    }
    cols.push('operTime', 'newRemark')
    return cols
  }, [type])

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  useEffect(() => {
    setVisibleColumns(allColumnKeys)
  }, [allColumnKeys])

  useEffect(() => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      if (Array.isArray(res)) setDepotList(res)
      else if (res?.data) setDepotList(res.data)
    })
    http.get('/supplier/findBySelect_sup').then((res: any) => {
      if (Array.isArray(res)) setPartnerList(res)
      else if (res?.data) setPartnerList(res.data)
    })
    http.get('/user/getUserList').then((res: any) => {
      if (res?.data?.userList) setUserList(res.data.userList)
      else if (Array.isArray(res)) setUserList(res)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const dates = values.dateRange || [dayjs().subtract(3, 'month'), dayjs()]
      const beginTime = dates[0]?.format('YYYY-MM-DD')
      const endTime = dates[1]?.format('YYYY-MM-DD')

      const endpoint = type === '调拨' ? '/depotHead/findAllocationDetail' : '/depotHead/findInOutDetail'

      const res = await http.get(endpoint, {
        params: {
          number: values.number || '',
          materialParam: values.materialParam || '',
          type: type === '调拨' ? undefined : type,
          depotId: values.depotId,
          organId: values.organId,
          creator: values.creator,
          remark: values.remark || '',
          beginTime,
          endTime,
          currentPage: page,
          pageSize,
        },
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      const qty = res?.operNumberTotal !== undefined ? res.operNumberTotal : res?.data?.operNumberTotal || 0
      const amt = res?.allPriceTotal !== undefined ? res.allPriceTotal : res?.data?.allPriceTotal || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
      setTotalQty(Number(qty))
      setTotalAmount(Number(amt))
    } catch (err) {
      console.error(`Failed to load ${title}:`, err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1, 10, { dateRange: [dayjs().subtract(3, 'month'), dayjs()] })
  }, [type])

  const columnsConfig: Record<string, any> = {
    number: {
      title: 'Doc Number',
      dataIndex: 'number',
      key: 'number',
      width: 160,
      render: (val: any) => <a style={{ color: '#1890ff' }}>{val}</a>,
    },
    barCode: {
      title: 'Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 130,
    },
    mname: {
      title: 'Product Name',
      dataIndex: 'mname',
      key: 'mname',
      width: 170,
      ellipsis: true,
    },
    standard: {
      title: 'Spec',
      dataIndex: 'standard',
      key: 'standard',
      width: 90,
      ellipsis: true,
    },
    model: {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 90,
      ellipsis: true,
    },
    mUnit: {
      title: 'Unit',
      dataIndex: 'mUnit',
      key: 'mUnit',
      width: 70,
    },
    operNumber: {
      title: 'Qty',
      dataIndex: 'operNumber',
      key: 'operNumber',
      width: 80,
      render: (val: any) => val || 0,
    },
    unitPrice: {
      title: 'Unit Price (₹)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    allPrice: {
      title: 'Amount (₹)',
      dataIndex: 'allPrice',
      key: 'allPrice',
      width: 130,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '-'),
    },
    sname: {
      title: type === '调拨' ? 'Target WH' : 'Related Party',
      dataIndex: 'sname',
      key: 'sname',
      width: 140,
      ellipsis: true,
    },
    dname: {
      title: type === '调拨' ? 'Source WH' : 'Warehouse',
      dataIndex: 'dname',
      key: 'dname',
      width: 130,
      ellipsis: true,
    },
    operTime: {
      title: 'Date',
      dataIndex: 'operTime',
      key: 'operTime',
      width: 150,
    },
    newRemark: {
      title: 'Remarks',
      dataIndex: 'newRemark',
      key: 'newRemark',
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
          <Checkbox key={key} value={key} disabled={key === 'number' || key === 'barCode'}>
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
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        initialValues={{ dateRange: [dayjs().subtract(3, 'month'), dayjs()] }}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="materialParam"
              label="Product Info:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter barcode, name, spec..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
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
              name="dateRange"
              label="Date Range:"
              labelCol={{ flex: '85px' }}
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

        {expandedSearch && (
          <Row gutter={[16, 12]} align="middle" style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="depotId"
                label="Warehouse:"
                labelCol={{ flex: '90px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select Warehouse..."
                  allowClear
                  options={depotList.map((d) => ({
                    value: d.id,
                    label: d.depotName || d.name,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {type !== '调拨' && (
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="organId"
                  label="Party:"
                  labelCol={{ flex: '90px' }}
                  wrapperCol={{ flex: 'auto' }}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    placeholder="Select Party / Supplier..."
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    options={partnerList.map((p) => ({
                      value: p.id,
                      label: p.supplier || p.name,
                    }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="creator"
                label="Operator:"
                labelCol={{ flex: '80px' }}
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

      {/* Action Controls & Summary Banner */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          background: '#f0f5ff',
          border: '1px solid #adc6ff',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Item Qty: <strong>{totalQty}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Total Net Amount: <strong style={{ color: '#1890ff' }}>₹{totalAmount.toFixed(2)}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title={title}
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Item Qty', value: totalQty },
              { label: 'Total Net Amount', value: `₹${totalAmount.toFixed(2)}` },
            ]}
          />
          <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
            <Button icon={<SettingOutlined />}>Column Settings</Button>
          </Popover>
        </Space>
      </div>

      <Table
        rowKey={(record, index) => `${record.id || record.number || ''}_${index}`}
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1300 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />
    </Card>
  )
}
