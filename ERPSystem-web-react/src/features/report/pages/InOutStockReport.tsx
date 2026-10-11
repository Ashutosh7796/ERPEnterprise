import React, { useEffect, useState } from 'react'
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
  SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

const { RangePicker } = DatePicker
const { Text } = Typography

export const InOutStockReportPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [depotList, setDepotList] = useState<any[]>([])
  const [prevSumPrice, setPrevSumPrice] = useState(0)
  const [inSumPrice, setInSumPrice] = useState(0)
  const [outSumPrice, setOutSumPrice] = useState(0)
  const [thisSumPrice, setThisSumPrice] = useState(0)

  const allColumnKeys = [
    'barCode',
    'materialName',
    'materialStandard',
    'materialModel',
    'unitName',
    'prevSum',
    'inSum',
    'outSum',
    'thisSum',
    'thisSumPrice',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  useEffect(() => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      if (Array.isArray(res)) setDepotList(res)
      else if (res?.data) setDepotList(res.data)
    })
  }, [])

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const dates = values.dateRange || [dayjs().subtract(3, 'month'), dayjs()]
      const beginTime = dates[0]?.format('YYYY-MM-DD')
      const endTime = dates[1]?.format('YYYY-MM-DD')

      const [res, countRes] = await Promise.all([
        http.get('/depotItem/getInOutStock', {
          params: {
            materialParam: values.materialParam || '',
            depotId: values.depotId || '',
            beginTime,
            endTime,
            currentPage: page,
            pageSize,
          },
        }),
        http.get('/depotItem/getInOutStockCountMoney', {
          params: {
            materialParam: values.materialParam || '',
            depotId: values.depotId || '',
            beginTime,
            endTime,
          },
        }),
      ])

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })

      const cData = countRes?.data || countRes || {}
      setPrevSumPrice(Number(cData.prevSumPrice || 0))
      setInSumPrice(Number(cData.inSumPrice || 0))
      setOutSumPrice(Number(cData.outSumPrice || 0))
      setThisSumPrice(Number(cData.thisSumPrice || 0))
    } catch (err) {
      console.error('Failed to load in-out stock report:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1, 10, { dateRange: [dayjs().subtract(3, 'month'), dayjs()] })
  }, [])

  const columnsConfig: Record<string, any> = {
    barCode: {
      title: 'Item Code / Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 140,
    },
    materialName: {
      title: 'Item Name',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 170,
      ellipsis: true,
    },
    materialStandard: {
      title: 'Specification',
      dataIndex: 'materialStandard',
      key: 'materialStandard',
      width: 110,
      ellipsis: true,
    },
    materialModel: {
      title: 'Model',
      dataIndex: 'materialModel',
      key: 'materialModel',
      width: 90,
      ellipsis: true,
    },
    unitName: {
      title: 'Unit of Measure',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 90,
    },
    prevSum: {
      title: 'Opening Quantity',
      dataIndex: 'prevSum',
      key: 'prevSum',
      width: 120,
      render: (val: any) => val || 0,
    },
    inSum: {
      title: 'Inbound Quantity',
      dataIndex: 'inSum',
      key: 'inSum',
      width: 120,
      render: (val: any) => <span style={{ color: '#52c41a' }}>{val || 0}</span>,
    },
    outSum: {
      title: 'Outbound Quantity',
      dataIndex: 'outSum',
      key: 'outSum',
      width: 120,
      render: (val: any) => <span style={{ color: '#f5222d' }}>{val || 0}</span>,
    },
    thisSum: {
      title: 'Closing Quantity',
      dataIndex: 'thisSum',
      key: 'thisSum',
      width: 120,
      render: (val: any) => <strong style={{ color: '#1890ff' }}>{val || 0}</strong>,
    },
    thisSumPrice: {
      title: 'Closing Valuation (₹)',
      dataIndex: 'thisSumPrice',
      key: 'thisSumPrice',
      width: 150,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '₹0.00'),
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
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="materialParam"
              label="Item Information:"
              labelCol={{ flex: '120px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter barcode, name, spec..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="depotId"
              label="Warehouse:"
              labelCol={{ flex: '85px' }}
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
          <Col xs={24} sm={12} md={8}>
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
          <Col xs={24} sm={12} md={8}>
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
            </Space>
          </Col>
        </Row>
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
            Opening: <strong>₹{prevSumPrice.toFixed(2)}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Inbound: <strong style={{ color: '#52c41a' }}>₹{inSumPrice.toFixed(2)}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Outbound: <strong style={{ color: '#f5222d' }}>₹{outSumPrice.toFixed(2)}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Closing Valuation:{' '}
            <strong style={{ color: '#1890ff', fontSize: 15 }}>₹{thisSumPrice.toFixed(2)}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title="Inventory Movement Summary"
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Opening Valuation', value: `₹${prevSumPrice.toFixed(2)}` },
              { label: 'Inbound Valuation', value: `₹${inSumPrice.toFixed(2)}` },
              { label: 'Outbound Valuation', value: `₹${outSumPrice.toFixed(2)}` },
              { label: 'Closing Valuation', value: `₹${thisSumPrice.toFixed(2)}` },
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
        scroll={{ x: 1200 }}
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
