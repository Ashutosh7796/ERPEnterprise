import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  DatePicker,
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

interface SummaryReportProps {
  type: '入库' | '出库'
  title: string
}

export const InboundOutboundSummaryReportPage: React.FC<SummaryReportProps> = ({ type, title }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [totalQty, setTotalQty] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  const allColumnKeys = [
    'barCode',
    'mName',
    'standard',
    'model',
    'color',
    'brand',
    'categoryName',
    'materialUnit',
    'numSum',
    'priceSum',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const dates = values.dateRange || [dayjs().subtract(3, 'month'), dayjs()]
      const beginTime = dates[0]?.format('YYYY-MM-DD')
      const endTime = dates[1]?.format('YYYY-MM-DD')

      const res = await http.get('/depotHead/findInOutMaterialCount', {
        params: {
          materialParam: values.materialParam || '',
          type,
          beginTime,
          endTime,
          currentPage: page,
          pageSize,
        },
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })

      const qtySum = rows.reduce((acc: number, item: any) => acc + (Number(item.numSum) || 0), 0)
      const amtSum = rows.reduce((acc: number, item: any) => acc + (Number(item.priceSum) || 0), 0)
      setTotalQty(qtySum)
      setTotalAmount(amtSum)
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
      title: 'Item Code / Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 140,
    },
    mName: {
      title: 'Item Name',
      dataIndex: 'mName',
      key: 'mName',
      width: 170,
      ellipsis: true,
    },
    standard: {
      title: 'Specification',
      dataIndex: 'standard',
      key: 'standard',
      width: 110,
      ellipsis: true,
    },
    model: {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 90,
      ellipsis: true,
    },
    color: {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 70,
    },
    brand: {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 90,
      ellipsis: true,
    },
    categoryName: {
      title: 'Item Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 110,
      ellipsis: true,
    },
    materialUnit: {
      title: 'Unit of Measure',
      dataIndex: 'materialUnit',
      key: 'materialUnit',
      width: 90,
    },
    numSum: {
      title: `${type === '入库' ? 'Inbound' : 'Outbound'} Quantity`,
      dataIndex: 'numSum',
      key: 'numSum',
      width: 130,
      render: (val: any) => (
        <strong style={{ color: type === '入库' ? '#52c41a' : '#f5222d' }}>
          {val || 0}
        </strong>
      ),
    },
    priceSum: {
      title: `${type === '入库' ? 'Inbound' : 'Outbound'} Amount (₹)`,
      dataIndex: 'priceSum',
      key: 'priceSum',
      width: 140,
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
          <Checkbox key={key} value={key} disabled={key === 'barCode' || key === 'mName'}>
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
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Quantity: <strong>{totalQty}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Total Amount (₹):{' '}
            <strong style={{ color: '#52c41a' }}>₹{totalAmount.toFixed(2)}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title={title}
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Quantity', value: totalQty },
              { label: 'Total Amount', value: `₹${totalAmount.toFixed(2)}` },
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
