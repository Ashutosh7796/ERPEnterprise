import React, { useState, useEffect } from 'react'
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
  Tag,
  message,
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

export interface LogRecord {
  id: number
  operation?: string
  content?: string
  loginName?: string
  userName?: string
  clientIp?: string
  createTimeStr?: string
  costTime?: number
}

export const LogListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<LogRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [expandedSearch, setExpandedSearch] = useState(false)

  const allColumnKeys = [
    'rowIndex',
    'operation',
    'content',
    'loginName',
    'userName',
    'clientIp',
    'createTimeStr',
    'costTime',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'operation',
    'content',
    'loginName',
    'userName',
    'clientIp',
    'createTimeStr',
    'costTime',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const dates = searchValues.dateRange || []
      const searchObj: Record<string, any> = {
        operation: searchValues.operation || '',
        content: searchValues.content || '',
        userInfo: searchValues.userInfo || '',
        clientIp: searchValues.clientIp || '',
        beginTime: dates[0] ? dates[0].format('YYYY-MM-DD 00:00:00') : '',
        endTime: dates[1] ? dates[1].format('YYYY-MM-DD 23:59:59') : '',
      }

      const res = await http.get('/log/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load audit logs:', err)
      message.error(err?.message || 'Failed to load audit log list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1, 10, {
      dateRange: [dayjs().subtract(30, 'day'), dayjs()],
    })
    form.setFieldsValue({
      dateRange: [dayjs().subtract(30, 'day'), dayjs()],
    })
  }, [])

  const columnsConfig: Record<string, any> = {
    rowIndex: {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) =>
        (pagination.current - 1) * pagination.pageSize + idx + 1,
    },
    operation: {
      title: 'Module / Object',
      dataIndex: 'operation',
      key: 'operation',
      width: 140,
      ellipsis: true,
      render: (v: any) => (v ? <Tag color="blue">{v}</Tag> : '-'),
    },
    content: {
      title: 'Operation Details',
      dataIndex: 'content',
      key: 'content',
      width: 320,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    loginName: {
      title: 'Operator Username',
      dataIndex: 'loginName',
      key: 'loginName',
      width: 130,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    userName: {
      title: 'Operator Name',
      dataIndex: 'userName',
      key: 'userName',
      width: 130,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    clientIp: {
      title: 'Client IP Address',
      dataIndex: 'clientIp',
      key: 'clientIp',
      width: 140,
      render: (v: any) => v || '-',
    },
    createTimeStr: {
      title: 'Log Timestamp',
      dataIndex: 'createTimeStr',
      key: 'createTimeStr',
      width: 160,
      render: (v: any) => v || '-',
    },
    costTime: {
      title: 'Cost Time (ms)',
      dataIndex: 'costTime',
      key: 'costTime',
      width: 110,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? `${v} ms` : '-'),
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 380 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Audit Log Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'operation'}>
                {columnsConfig[key]?.title || key}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
      <Divider style={{ margin: '10px 0 6px 0' }} />
      <Button
        type="link"
        size="small"
        onClick={() =>
          setVisibleColumns([
            'rowIndex',
            'operation',
            'content',
            'loginName',
            'userName',
            'clientIp',
            'createTimeStr',
            'costTime',
          ])
        }
      >
        Restore Default Columns
      </Button>
    </div>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="operation"
              label="Module:"
              labelCol={{ flex: '70px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter module name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="content"
              label="Details:"
              labelCol={{ flex: '70px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search log content..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="dateRange"
              label="Period:"
              labelCol={{ flex: '65px' }}
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
                name="userInfo"
                label="Operator:"
                labelCol={{ flex: '75px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Username or Name..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="clientIp"
                label="Client IP:"
                labelCol={{ flex: '75px' }}
                wrapperCol={{ flex: 'auto' }}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="IP Address..." allowClear style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>

      {/* Action Controls */}
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
          <ExportPrintButtons
            title="System Audit Operation Logs"
            columns={columns as any}
            dataSource={dataSource}
          />
        </Space>

        <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
          <Button icon={<SettingOutlined />}>Column Settings</Button>
        </Popover>
      </div>

      {/* Table */}
      <Table
        rowKey="id"
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
          pageSizeOptions: ['10', '20', '30', '50', '100', '200'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />
    </Card>
  )
}
