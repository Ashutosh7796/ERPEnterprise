import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Typography,
  Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  HistoryOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import {
  getStockLedgerList,
  StockLedgerRecord,
  StockLedgerQueryParams,
} from '../api/stockLedgerApi'

const { RangePicker } = DatePicker
const { Text } = Typography

const VOUCHER_TYPE_OPTIONS = [
  { value: '', label: 'All Voucher Types' },
  { value: 'PURCHASE_RECEIPT', label: 'Purchase Receipt (GRN)' },
  { value: 'PURCHASE_RETURN', label: 'Purchase Return (P7)' },
  { value: 'SALES_DISPATCH', label: 'Sales Dispatch (Outbound)' },
  { value: 'SALES_RETURN', label: 'Sales Return' },
  { value: 'TRANSFER_OUT', label: 'Stock Transfer Out' },
  { value: 'TRANSFER_IN', label: 'Stock Transfer In' },
  { value: 'MANUFACTURING_ISSUE', label: 'Material Issue (To WIP)' },
  { value: 'MANUFACTURING_CONSUMPTION', label: 'Production Consumption' },
  { value: 'MANUFACTURING_RECEIPT', label: 'Finished Goods Receipt' },
  { value: 'STOCK_SURPLUS', label: 'Stocktake Gain (Surplus)' },
  { value: 'STOCK_LOSS', label: 'Stocktake Shrinkage (Loss)' },
  { value: 'OTHER_IN', label: 'Miscellaneous Inbound' },
  { value: 'OTHER_OUT', label: 'Miscellaneous Outbound' },
]

export const StockLedgerListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<StockLedgerRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [depotList, setDepotList] = useState<any[]>([])

  // Load warehouses for filter dropdown
  useEffect(() => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setDepotList(list)
    }).catch((err) => {
      console.error('Failed to fetch depot list:', err)
    })
  }, [])

  const fetchData = useCallback(
    async (page = 1, pageSize = 15, searchValues: any = {}) => {
      setLoading(true)
      try {
        let startDate: string | undefined
        let endDate: string | undefined
        if (searchValues.dateRange && searchValues.dateRange.length === 2) {
          startDate = searchValues.dateRange[0].format('YYYY-MM-DD 00:00:00')
          endDate = searchValues.dateRange[1].format('YYYY-MM-DD 23:59:59')
        }

        const params: StockLedgerQueryParams = {
          currentPage: page,
          pageSize,
          depotId: searchValues.depotId || undefined,
          voucherType: searchValues.voucherType || undefined,
          voucherNo: searchValues.voucherNo ? searchValues.voucherNo.trim() : undefined,
          materialParam: searchValues.materialParam ? searchValues.materialParam.trim() : undefined,
          startDate,
          endDate,
        }

        const data = await getStockLedgerList(params)
        setDataSource(data.rows || [])
        setPagination({ current: page, pageSize, total: data.total || 0 })
      } catch (err) {
        console.error('Failed to load stock ledger:', err)
        setDataSource([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    fetchData(1, pagination.pageSize, values)
  }

  const handleReset = () => {
    form.resetFields()
    fetchData(1, pagination.pageSize, {})
  }

  const getVoucherTag = (type: string) => {
    switch (type) {
      case 'PURCHASE_RECEIPT':
        return <Tag color="green">GRN Receipt</Tag>
      case 'PURCHASE_RETURN':
        return <Tag color="volcano">Purchase Return</Tag>
      case 'SALES_DISPATCH':
        return <Tag color="blue">Sales Dispatch</Tag>
      case 'SALES_RETURN':
        return <Tag color="geekblue">Sales Return</Tag>
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <Tag color="cyan">Transfer</Tag>
      case 'MANUFACTURING_ISSUE':
        return <Tag color="orange">Issue to WIP</Tag>
      case 'MANUFACTURING_CONSUMPTION':
        return <Tag color="gold">WIP Consumption</Tag>
      case 'MANUFACTURING_RECEIPT':
        return <Tag color="purple">FG Receipt</Tag>
      case 'STOCK_SURPLUS':
        return <Tag color="lime">Stock Surplus</Tag>
      case 'STOCK_LOSS':
        return <Tag color="red">Stock Loss</Tag>
      default:
        return <Tag color="default">{type || 'Movement'}</Tag>
    }
  }

  const columns: TableColumnsType<StockLedgerRecord> = [
    {
      title: 'Posting Time',
      dataIndex: 'postingTime',
      key: 'postingTime',
      width: 150,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Voucher Type',
      dataIndex: 'voucherType',
      key: 'voucherType',
      width: 140,
      render: (type) => getVoucherTag(type),
    },
    {
      title: 'Voucher No',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 160,
      render: (v) => <strong>{v || '-'}</strong>,
    },
    {
      title: 'Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      width: 130,
      render: (v) => v || '-',
    },
    {
      title: 'Bin',
      dataIndex: 'binCode',
      key: 'binCode',
      width: 100,
      render: (v) => (v ? <Tag color="processing">{v}</Tag> : <Text type="secondary">Floor</Text>),
    },
    {
      title: 'Product / SKU',
      key: 'product',
      width: 220,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#262626' }}>{r.materialName || 'Material #' + r.materialId}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.barCode ? `Barcode: ${r.barCode}` : ''}
            {r.standard ? ` | ${r.standard}` : ''}
            {r.model ? ` | ${r.model}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Qty Change',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 120,
      align: 'right',
      render: (qty) => {
        const val = Number(qty || 0)
        return (
          <span style={{ fontWeight: 600, color: val >= 0 ? '#52c41a' : '#f5222d' }}>
            {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
          </span>
        )
      },
    },
    {
      title: (
        <Tooltip title="Post-transaction authoritative on-hand balance in this warehouse">
          <span>Running Balance</span>
        </Tooltip>
      ),
      dataIndex: 'qtyAfterTransaction',
      key: 'qtyAfterTransaction',
      width: 130,
      align: 'right',
      render: (qty) => (
        <strong style={{ color: '#1890ff', fontSize: 13 }}>
          {Number(qty || 0).toFixed(2)}
        </strong>
      ),
    },
    {
      title: 'Incoming Rate',
      dataIndex: 'incomingRate',
      key: 'incomingRate',
      width: 120,
      align: 'right',
      render: (rate) => (rate !== undefined && rate !== null ? `₹${Number(rate).toFixed(2)}` : '-'),
    },
    {
      title: (
        <Tooltip title="Updated weighted moving average valuation rate after this transaction">
          <span>Valuation Rate</span>
        </Tooltip>
      ),
      dataIndex: 'valuationRate',
      key: 'valuationRate',
      width: 120,
      align: 'right',
      render: (rate) => (rate !== undefined && rate !== null ? `₹${Number(rate).toFixed(2)}` : '-'),
    },
    {
      title: 'Value Delta',
      dataIndex: 'stockValueDifference',
      key: 'stockValueDifference',
      width: 120,
      align: 'right',
      render: (diff) => {
        if (diff === undefined || diff === null) return '-'
        const val = Number(diff)
        return (
          <span style={{ color: val >= 0 ? '#389e0d' : '#cf1322' }}>
            {val > 0 ? `+₹${val.toFixed(2)}` : `₹${val.toFixed(2)}`}
          </span>
        )
      },
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (r) => r || '-',
    },
  ]

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined style={{ color: '#1890ff' }} />
          <span>Authoritative Stock Ledger</span>
        </Space>
      }
      bordered={false}
      style={{ margin: 16 }}
    >
      {/* Search & Filter Form */}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} style={{ width: '100%' }}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="dateRange" label="Date Range" style={{ width: '100%', margin: 0 }}>
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="depotId" label="Warehouse" style={{ width: '100%', margin: 0 }}>
              <Select
                placeholder="All Warehouses"
                allowClear
                options={depotList.map((d) => ({
                  value: d.id,
                  label: d.depotName || d.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="voucherType" label="Voucher Type" style={{ width: '100%', margin: 0 }}>
              <Select
                placeholder="All Types"
                allowClear
                options={VOUCHER_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="materialParam" label="Product/SKU" style={{ width: '100%', margin: 0 }}>
              <Input placeholder="Name / Barcode" allowClear prefix={<SearchOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Search
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* Action Toolbar */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <ExportPrintButtons
          title="Authoritative Stock Ledger"
          columns={columns as any}
          dataSource={dataSource}
          summaryItems={[
            { label: 'Total Records', value: pagination.total },
          ]}
        />
      </div>

      {/* Stock Ledger Data Table */}
      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1550 }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `Total ${tot} ledger entries (${range[0]}-${range[1]})`,
          showSizeChanger: true,
          pageSizeOptions: ['15', '30', '50', '100'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />
    </Card>
  )
}
