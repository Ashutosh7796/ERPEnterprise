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

interface TrendReportProps {
  type: 'purchase' | 'sale' | 'retail'
  title: string
}

export const TrendReportPage: React.FC<TrendReportProps> = ({ type, title }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [expandedSearch, setExpandedSearch] = useState(false)

  const [partnerList, setPartnerList] = useState<any[]>([])
  const [categoryList, setCategoryList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])

  const [totalQty, setTotalQty] = useState(0)
  const [realityPriceTotal, setRealityPriceTotal] = useState(0)

  const allColumnKeys = [
    'barCode',
    'materialName',
    'materialStandard',
    'materialModel',
    'categoryName',
    'unitName',
    'inSum',
    'inSumPrice',
    'outSum',
    'outSumPrice',
    'inOutSumPrice',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  useEffect(() => {
    if (type === 'purchase') {
      http.get('/supplier/findBySelect_sup').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    } else if (type === 'sale') {
      http.get('/supplier/findBySelect_cus').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    } else {
      http.get('/supplier/findBySelect_retail').then((res: any) => {
        if (Array.isArray(res)) setPartnerList(res)
        else if (res?.data) setPartnerList(res.data)
      })
    }

    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      if (Array.isArray(res)) setDepotList(res)
      else if (res?.data) setDepotList(res.data)
    })

    http.get('/materialCategory/getAllList').then((res: any) => {
      if (Array.isArray(res)) setCategoryList(res)
      else if (res?.data) setCategoryList(res.data)
    })
  }, [type])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const dates = values.dateRange || [dayjs().subtract(3, 'month'), dayjs()]
      const beginTime = dates[0]?.format('YYYY-MM-DD')
      const endTime = dates[1]?.format('YYYY-MM-DD')

      const endpoint =
        type === 'purchase'
          ? '/depotItem/buyIn'
          : type === 'sale'
          ? '/depotItem/saleOut'
          : '/depotItem/retailOut'

      const res = await http.get(endpoint, {
        params: {
          currentPage: page,
          pageSize,
          beginTime,
          endTime,
          materialParam: values.materialParam || '',
          organId: values.organId || undefined,
          depotId: values.depotId || undefined,
          categoryId: values.categoryId || undefined,
        },
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      const reality = res?.realityPriceTotal !== undefined ? res.realityPriceTotal : res?.data?.realityPriceTotal || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
      setRealityPriceTotal(Number(reality))

      const qtySum = rows.reduce(
        (acc: number, item: any) =>
          acc + (Number(type === 'purchase' ? item.inSum : item.outSum) || 0),
        0
      )
      setTotalQty(qtySum)
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
    barCode: {
      title: 'Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 140,
    },
    materialName: {
      title: 'Product Name',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 180,
      ellipsis: true,
    },
    materialStandard: {
      title: 'Spec',
      dataIndex: 'materialStandard',
      key: 'materialStandard',
      width: 100,
      ellipsis: true,
    },
    materialModel: {
      title: 'Model',
      dataIndex: 'materialModel',
      key: 'materialModel',
      width: 100,
      ellipsis: true,
    },
    categoryName: {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      ellipsis: true,
    },
    unitName: {
      title: 'Unit',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 80,
    },
    inSum: {
      title: type === 'purchase' ? 'Purchase Qty' : 'Return Qty',
      dataIndex: 'inSum',
      key: 'inSum',
      width: 110,
      render: (val: any) => val || 0,
    },
    inSumPrice: {
      title: type === 'purchase' ? 'Purchase Amount (₹)' : 'Return Amount (₹)',
      dataIndex: 'inSumPrice',
      key: 'inSumPrice',
      width: 140,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '₹0.00'),
    },
    outSum: {
      title: type === 'purchase' ? 'Return Qty' : 'Sales Qty',
      dataIndex: 'outSum',
      key: 'outSum',
      width: 110,
      render: (val: any) => val || 0,
    },
    outSumPrice: {
      title: type === 'purchase' ? 'Return Amount (₹)' : 'Sales Amount (₹)',
      dataIndex: 'outSumPrice',
      key: 'outSumPrice',
      width: 140,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '₹0.00'),
    },
    inOutSumPrice: {
      title: type === 'purchase' ? 'Actual Purchase (₹)' : 'Actual Sales (₹)',
      dataIndex: type === 'purchase' ? 'inOutSumPrice' : 'outInSumPrice',
      key: 'inOutSumPrice',
      width: 150,
      render: (val: any, record: any) => {
        const amt = val !== undefined ? val : record.inOutSumPrice || record.outInSumPrice
        return <strong style={{ color: '#52c41a' }}>{amt ? `₹${Number(amt).toFixed(2)}` : '₹0.00'}</strong>
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
          <Checkbox key={key} value={key} disabled={key === 'barCode' || key === 'materialName'}>
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
              label="Item Info:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter barcode, name, spec..." allowClear style={{ width: '100%' }} />
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
            <Form.Item
              name="organId"
              label={type === 'purchase' ? 'Supplier:' : type === 'sale' ? 'Customer:' : 'Member:'}
              labelCol={{ flex: '80px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder={`Select ${type === 'purchase' ? 'Supplier' : type === 'sale' ? 'Customer' : 'Member'}...`}
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
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="categoryId"
                label="Category:"
                labelCol={{ flex: '80px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select Category..."
                  allowClear
                  options={categoryList.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
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
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Item Activity Qty: <strong>{totalQty}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Total Net Turnover Amount:{' '}
            <strong style={{ color: '#52c41a', fontSize: 15 }}>₹{realityPriceTotal.toFixed(2)}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title={title}
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Item Activity Qty', value: totalQty },
              { label: 'Total Net Turnover Amount', value: `₹${realityPriceTotal.toFixed(2)}` },
            ]}
          />
          <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
            <Button icon={<SettingOutlined />}>Column Settings</Button>
          </Popover>
        </Space>
      </div>

      <Table
        rowKey={(record, index) => `${record.barCode || ''}_${index}`}
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1250 }}
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
