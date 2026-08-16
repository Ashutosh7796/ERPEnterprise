import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
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
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

const { Text } = Typography

export const AccountStatsReportPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [allMonthAmount, setAllMonthAmount] = useState('₹0.00')
  const [allCurrentAmount, setAllCurrentAmount] = useState('₹0.00')

  const allColumnKeys = [
    'name',
    'serialNo',
    'initialAmount',
    'thisMonthAmount',
    'currentAmount',
    'remark',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const searchJson = JSON.stringify({
        name: values.name || '',
        serialNo: values.serialNo || '',
      })

      const res = await http.get('/account/list', {
        params: {
          search: searchJson,
          currentPage: page,
          pageSize,
        },
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      const monthAmt = res?.allMonthAmount !== undefined ? res.allMonthAmount : res?.data?.allMonthAmount || 0
      const currAmt = res?.allCurrentAmount !== undefined ? res.allCurrentAmount : res?.data?.allCurrentAmount || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
      setAllMonthAmount(`₹${Number(monthAmt).toFixed(2)}`)
      setAllCurrentAmount(`₹${Number(currAmt).toFixed(2)}`)
    } catch (err) {
      console.error('Failed to load account stats:', err)
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const columnsConfig: Record<string, any> = {
    name: {
      title: 'Account Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    serialNo: {
      title: 'Account No.',
      dataIndex: 'serialNo',
      key: 'serialNo',
      width: 160,
    },
    initialAmount: {
      title: 'Opening Balance (₹)',
      dataIndex: 'initialAmount',
      key: 'initialAmount',
      width: 150,
      render: (val: any) => (val ? `₹${Number(val).toFixed(2)}` : '₹0.00'),
    },
    thisMonthAmount: {
      title: 'Month Turnover (₹)',
      dataIndex: 'thisMonthAmount',
      key: 'thisMonthAmount',
      width: 150,
      render: (val: any) => (
        <span style={{ color: Number(val) >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>
          {val ? `₹${Number(val).toFixed(2)}` : '₹0.00'}
        </span>
      ),
    },
    currentAmount: {
      title: 'Current Balance (₹)',
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 160,
      render: (val: any) => (
        <strong style={{ color: '#1890ff', fontSize: 14 }}>
          {val ? `₹${Number(val).toFixed(2)}` : '₹0.00'}
        </strong>
      ),
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
          <Checkbox key={key} value={key} disabled={key === 'name'}>
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
              name="name"
              label="Account Name:"
              labelCol={{ flex: '105px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter account name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="serialNo"
              label="Account No.:"
              labelCol={{ flex: '95px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter serial/account number..." allowClear style={{ width: '100%' }} />
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
          background: '#fffbe6',
          border: '1px solid #ffe58f',
          padding: '10px 16px',
          borderRadius: 6,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Month Inflow / Turnover: <strong>{allMonthAmount}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Total Liquidity Balance:{' '}
            <strong style={{ color: '#fa8c16', fontSize: 15 }}>{allCurrentAmount}</strong>
          </Text>
        </Space>

        <Space size="small">
          <ExportPrintButtons
            title="Account Liquidity & Turnover Statistics"
            columns={columns as any}
            dataSource={dataSource}
            summaryItems={[
              { label: 'Total Month Inflow / Turnover', value: allMonthAmount },
              { label: 'Total Liquidity Balance', value: allCurrentAmount },
            ]}
          />
          <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
            <Button icon={<SettingOutlined />}>Column Settings</Button>
          </Popover>
        </Space>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1000 }}
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
