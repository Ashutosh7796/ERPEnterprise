import React, { useState } from 'react'
import {
  Table,
  Card,
  Form,
  Row,
  Col,
  Button,
  Space,
  Popconfirm,
  theme,
} from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExportOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'

export interface DataTableFilterField {
  name: string
  label: string
  component: React.ReactNode
  span?: number
}

export interface DataTableProps<T extends Record<string, any>> {
  title?: React.ReactNode
  columns: TableColumnsType<T>
  dataSource: T[]
  loading?: boolean
  total?: number
  current?: number
  pageSize?: number
  onPageChange?: (page: number, pageSize: number) => void
  onSearch?: (values: Record<string, any>) => void
  onReset?: () => void
  onAdd?: () => void
  onBatchDelete?: (selectedRowKeys: React.Key[]) => void
  onExport?: () => void
  filterFields?: DataTableFilterField[]
  extraActions?: React.ReactNode
  rowKey?: string | ((record: T) => string)
  scroll?: TableProps<T>['scroll']
}

export function DataTable<T extends Record<string, any>>({
  title,
  columns,
  dataSource,
  loading = false,
  total = 0,
  current = 1,
  pageSize = 10,
  onPageChange,
  onSearch,
  onReset,
  onAdd,
  onBatchDelete,
  onExport,
  filterFields = [],
  extraActions,
  rowKey = 'id',
  scroll = { x: 'max-content' },
}: DataTableProps<T>) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [expandFilter, setExpandFilter] = useState(false)

  const handleFinish = (values: Record<string, any>) => {
    if (onSearch) {
      onSearch(values)
    }
  }

  const handleReset = () => {
    form.resetFields()
    if (onReset) {
      onReset()
    }
  }

  const rowSelection = onBatchDelete
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
      }
    : undefined

  const displayedFilterFields = expandFilter ? filterFields : filterFields.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search Filter Card */}
      {filterFields.length > 0 && (
        <Card
          variant="borderless"
          style={{
            borderRadius: token.borderRadiusLG,
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.04)',
          }}
        >
          <Form form={form} onFinish={handleFinish} layout="horizontal">
            <Row gutter={[16, 16]}>
              {displayedFilterFields.map((field) => (
                <Col xs={24} sm={12} md={field.span || 8} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    style={{ marginBottom: 0 }}
                  >
                    {field.component}
                  </Form.Item>
                </Col>
              ))}

              <Col
                xs={24}
                sm={12}
                md={displayedFilterFields.length % 3 === 0 ? 24 : 8}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 8,
                  marginLeft: 'auto',
                }}
              >
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  Search
                </Button>
                <Button onClick={handleReset} icon={<ReloadOutlined />}>
                  Reset
                </Button>
                {filterFields.length > 3 && (
                  <Button
                    type="link"
                    onClick={() => setExpandFilter(!expandFilter)}
                    style={{ fontSize: 13 }}
                  >
                    {expandFilter ? (
                      <>
                        Collapse <UpOutlined />
                      </>
                    ) : (
                      <>
                        Expand <DownOutlined />
                      </>
                    )}
                  </Button>
                )}
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* Main Table Card */}
      <Card
        variant="borderless"
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.04)',
        }}
        title={title}
        extra={
          <Space>
            {onAdd && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                New Record
              </Button>
            )}

            {onBatchDelete && selectedRowKeys.length > 0 && (
              <Popconfirm
                title="Batch Delete"
                description={`Are you sure you want to delete ${selectedRowKeys.length} selected records?`}
                onConfirm={() => {
                  onBatchDelete(selectedRowKeys)
                  setSelectedRowKeys([])
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}

            {onExport && (
              <Button icon={<ExportOutlined />} onClick={onExport}>
                Export
              </Button>
            )}

            {extraActions}
          </Space>
        }
      >
        <Table<T>
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey={rowKey}
          rowSelection={rowSelection}
          scroll={scroll}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `Total ${t} items`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => onPageChange && onPageChange(p, ps),
          }}
        />
      </Card>
    </div>
  )
}
