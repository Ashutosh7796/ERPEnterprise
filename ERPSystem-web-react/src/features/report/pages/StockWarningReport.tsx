import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Popover,
  Checkbox,
  Divider,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export const StockWarningReportPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [depotList, setDepotList] = useState<any[]>([])

  const allColumnKeys = [
    'barCode',
    'materialName',
    'materialStandard',
    'materialModel',
    'unitName',
    'depotName',
    'currentNumber',
    'lowSafeStock',
    'highSafeStock',
    'warningType',
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
      const res = await http.get('/depotItem/findStockWarningCount', {
        params: {
          materialParam: values.materialParam || '',
          depotId: values.depotId || '',
          currentPage: page,
          pageSize,
        },
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err) {
      console.error('Failed to load stock warning report:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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
    depotName: {
      title: 'Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      width: 130,
      ellipsis: true,
    },
    currentNumber: {
      title: 'On-Hand Stock',
      dataIndex: 'currentNumber',
      key: 'currentNumber',
      width: 110,
      render: (val: any) => <strong>{val || 0}</strong>,
    },
    lowSafeStock: {
      title: 'Safety Stock',
      dataIndex: 'lowSafeStock',
      key: 'lowSafeStock',
      width: 130,
      render: (val: any) => val || '-',
    },
    highSafeStock: {
      title: 'Maximum Stock Level',
      dataIndex: 'highSafeStock',
      key: 'highSafeStock',
      width: 140,
      render: (val: any) => val || '-',
    },
    warningType: {
      title: 'Stock Alert Status',
      key: 'warningType',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const cur = Number(record.currentNumber || 0)
        const low = Number(record.lowSafeStock || 0)
        const high = Number(record.highSafeStock || 0)
        if (low > 0 && cur < low) {
          return (
            <Tag color="error" icon={<WarningOutlined />}>
              Understocked (-{low - cur})
            </Tag>
          )
        }
        if (high > 0 && cur > high) {
          return (
            <Tag color="warning" icon={<WarningOutlined />}>
              Overstocked (+{cur - high})
            </Tag>
          )
        }
        return <Tag color="success">Optimal</Tag>
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
              <Input placeholder="Search item code, name..." allowClear style={{ width: '100%' }} />
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

      {/* Action Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <ExportPrintButtons
          title="Safety Stock Alerts"
          columns={columns as any}
          dataSource={dataSource}
        />
        <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
          <Button icon={<SettingOutlined />}>Column Settings</Button>
        </Popover>
      </div>

      <Table
        rowKey={(record) => record.id || `${record.barCode || ''}_${record.depotId || ''}_${record.materialId || ''}`}
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
