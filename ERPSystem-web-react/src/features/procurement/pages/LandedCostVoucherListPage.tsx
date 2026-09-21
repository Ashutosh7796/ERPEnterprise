import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  FileDoneOutlined,
} from '@ant-design/icons'
import { getLandedCostVouchers, postLandedCostVoucher, LandedCostVoucher } from '../api/procurementApi'
import { LandedCostCreateModal } from '../components/LandedCostCreateModal'

const { Text } = Typography

export const LandedCostVoucherListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<LandedCostVoucher[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const fetchVouchers = useCallback(async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const res = await getLandedCostVouchers({
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
        voucherNumber: values.voucherNumber,
        status: values.status,
      })
      if (res.data?.data) {
        setDataSource(res.data.data.rows || [])
        setPagination((prev) => ({ ...prev, total: res.data.data.total || 0 }))
      } else {
        setDataSource([])
      }
    } catch (err: any) {
      message.error('Failed to load Landed Cost Vouchers: ' + (err.message || 'Server error'))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, form])

  useEffect(() => {
    fetchVouchers()
  }, [fetchVouchers])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchVouchers()
  }

  const handleReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchVouchers()
  }

  const handlePostVoucher = async (record: LandedCostVoucher) => {
    try {
      await postLandedCostVoucher(record.id)
      message.success(`Landed Cost Voucher ${record.voucherNumber} posted to General Ledger successfully.`)
      fetchVouchers()
    } catch (err: any) {
      message.error(err.message || 'Failed to post Landed Cost Voucher')
    }
  }

  const columns: TableColumnsType<LandedCostVoucher> = [
    {
      title: 'Voucher Number',
      dataIndex: 'voucherNumber',
      key: 'voucherNumber',
      render: (num: string) => <Tag color="blue">{num}</Tag>,
    },
    {
      title: 'Voucher Date',
      dataIndex: 'voucherDate',
      key: 'voucherDate',
      render: (d: string) => (d ? String(d).substring(0, 10) : 'N/A'),
    },
    {
      title: 'Charge Type',
      dataIndex: 'costType',
      key: 'costType',
      render: (type: string) => {
        let color = 'cyan'
        if (type === 'CUSTOMS_DUTY') color = 'gold'
        if (type === 'INSURANCE') color = 'geekblue'
        if (type === 'CLEARING_CHARGES') color = 'purple'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: 'Service Provider / Vendor',
      dataIndex: 'vendorName',
      key: 'vendorName',
      render: (name: string) => name || 'N/A',
    },
    {
      title: 'Apportionment Method',
      dataIndex: 'apportionmentMethod',
      key: 'apportionmentMethod',
      render: (method: string) => (
        <Tag color={method === 'VALUE' ? 'green' : method === 'WEIGHT' ? 'magenta' : 'orange'}>
          By {method}
        </Tag>
      ),
    },
    {
      title: 'Total Landed Cost',
      dataIndex: 'totalCostAmount',
      key: 'totalCostAmount',
      align: 'right',
      render: (amt: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          ₹{Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => {
        let color = 'default'
        if (status === 'POSTED') color = 'success'
        if (status === 'DRAFT') color = 'warning'
        if (status === 'CANCELLED') color = 'error'
        return <Tag color={color}>{status || 'DRAFT'}</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 140,
      render: (_, record: LandedCostVoucher) => {
        const isPosted = record.status === 'POSTED'
        return (
          <Space size="small">
            {!isPosted && (
              <Popconfirm
                title="Post Landed Cost Voucher"
                description="This will capitalize acquisition costs into on-hand inventory valuation and post GL entries. Proceed?"
                onConfirm={() => handlePostVoucher(record)}
                okText="Yes, Post"
                cancelText="No"
              >
                <Button size="small" type="primary" icon={<FileDoneOutlined />}>
                  Post GL
                </Button>
              </Popconfirm>
            )}
            {isPosted && <Tag color="green">Capitalized</Tag>}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 16 }}>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="voucherNumber" label="Voucher No." style={{ width: '100%', margin: 0 }}>
                <Input placeholder="Search voucher..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="status" label="Status" style={{ width: '100%', margin: 0 }}>
                <Select placeholder="Filter by status" allowClear>
                  <Select.Option value="DRAFT">Draft</Select.Option>
                  <Select.Option value="POSTED">Posted</Select.Option>
                  <Select.Option value="CANCELLED">Cancelled</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#1890ff' }}
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create Landed Cost Voucher
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Total ${total} Landed Cost Vouchers`,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total })
            },
          }}
        />
      </Card>

      {/* Landed Cost Create Modal */}
      <LandedCostCreateModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          fetchVouchers()
        }}
      />
    </div>
  )
}
