import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Form,
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

export const VendorStatementPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [vendorList, setVendorList] = useState<any[]>([])
  const [firstTotal, setFirstTotal] = useState('₹0.00')
  const [lastTotal, setLastTotal] = useState('₹0.00')

  const allColumnKeys = [
    'supplier',
    'contacts',
    'telephone',
    'preNeed',
    'debtMoney',
    'backMoney',
    'allNeed',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  useEffect(() => {
    http.get('/supplier/findBySelect_sup').then((res: any) => {
      if (Array.isArray(res)) setVendorList(res)
      else if (res?.data) setVendorList(res.data)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const dates = values.dateRange || [dayjs().subtract(3, 'month'), dayjs()]
      const beginTime = dates[0]?.format('YYYY-MM-DD')
      const endTime = dates[1]?.format('YYYY-MM-DD')

      const res = await http.get('/depotHead/getStatementAccount', {
        params: {
          currentPage: page,
          pageSize,
          beginTime,
          endTime,
          organId: values.organId || undefined,
          hasDebt: values.hasDebt !== undefined && values.hasDebt !== '' ? Number(values.hasDebt) : undefined,
          supplierType: '供应商',
        },
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      const first = res?.firstTotal !== undefined ? res.firstTotal : res?.data?.firstTotal || 0
      const last = res?.lastTotal !== undefined ? res.lastTotal : res?.data?.lastTotal || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
      setFirstTotal(`₹${Number(first).toFixed(2)}`)
      setLastTotal(`₹${Number(last).toFixed(2)}`)
    } catch (err) {
      console.error('Failed to load supplier statement:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1, 10, { dateRange: [dayjs().subtract(3, 'month'), dayjs()] })
  }, [])

  const columnsConfig: Record<string, any> = {
    supplier: {
      title: 'Supplier Name',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 180,
      ellipsis: true,
    },
    contacts: {
      title: 'Contact Person',
      dataIndex: 'contacts',
      key: 'contacts',
      width: 130,
    },
    telephone: {
      title: 'Mobile Phone',
      dataIndex: 'telephone',
      key: 'telephone',
      width: 130,
    },
    preNeed: {
      title: 'Opening Balance (₹)',
      dataIndex: 'preNeed',
      key: 'preNeed',
      width: 160,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '₹0.00'),
    },
    debtMoney: {
      title: 'Period Purchases (₹)',
      dataIndex: 'debtMoney',
      key: 'debtMoney',
      width: 160,
      render: (val: any) => (
        <span style={{ color: '#fa541c', fontWeight: 600 }}>
          {val ? `₹${Number(val).toFixed(2)}` : '₹0.00'}
        </span>
      ),
    },
    backMoney: {
      title: 'Period Payments (₹)',
      dataIndex: 'backMoney',
      key: 'backMoney',
      width: 160,
      render: (val: any) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          {val ? `₹${Number(val).toFixed(2)}` : '₹0.00'}
        </span>
      ),
    },
    allNeed: {
      title: 'Closing Balance (₹)',
      dataIndex: 'allNeed',
      key: 'allNeed',
      width: 160,
      render: (val: any) => (
        <strong style={{ color: '#fa541c', fontSize: 14 }}>
          {val ? `₹${Number(val).toFixed(2)}` : '₹0.00'}
        </strong>
      ),
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
          <Checkbox key={key} value={key} disabled={key === 'supplier'}>
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
              name="organId"
              label="Supplier:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select Supplier..."
                allowClear
                showSearch
                optionFilterProp="children"
                options={vendorList.map((v) => ({
                  value: v.id,
                  label: v.supplier || v.name,
                }))}
                style={{ width: '100%' }}
              />
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
                name="hasDebt"
                label="Balance Status:"
                labelCol={{ flex: '95px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="All Payables"
                  allowClear
                  options={[
                    { value: '1', label: 'With Outstanding Balance' },
                    { value: '0', label: 'Settled (Zero Balance)' },
                  ]}
                  style={{ width: '100%' }}
                />
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
          background: '#fff2e8',
          border: '1px solid #ffbb96',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Opening Balance: <strong>{firstTotal}</strong>
          </Text>
          <Divider vertical />
          <Text>
            Total Closing Balance:{' '}
            <strong style={{ color: '#fa541c', fontSize: 15 }}>{lastTotal}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title="Supplier Statement (AP)"
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Opening Balance', value: firstTotal },
              { label: 'Total Closing Balance', value: lastTotal },
            ]}
          />
          <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
            <Button icon={<SettingOutlined />}>Column Settings</Button>
          </Popover>
        </Space>
      </div>

      <Table
        rowKey={(record) => record.id || `${record.organId || record.supplier || ''}`}
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1100 }}
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
