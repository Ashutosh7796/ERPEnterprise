import React, { useState, useEffect } from 'react'
import { Table, Button, Card, Space, Input, Tag, Popconfirm, message, Typography, Flex } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PercentageOutlined, StarFilled } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import { TaxRateModal } from './TaxRateModal'
import type { TaxRate } from '../types'

const { Title, Text } = Typography

export const TaxRateListPage: React.FC = () => {
  const [data, setData] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxRate | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await gstApi.getTaxRateList({
        search: JSON.stringify({ keyword: search }),
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
      })
      if (res.data?.rows) {
        setData(res.data.rows)
        setTotal(res.data.total || res.data.rows.length)
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to load tax rate slabs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize])

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    loadData()
  }

  const handleDelete = async (id: number) => {
    try {
      await gstApi.deleteTaxRate(id)
      message.success('Tax slab deleted.')
      loadData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete tax rate')
    }
  }

  const columns = [
    {
      title: 'Tax Slab',
      dataIndex: 'rateName',
      key: 'rateName',
      render: (name: string, record: TaxRate) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
            {name}
          </Text>
          {record.isDefault && (
            <Tag color="gold" icon={<StarFilled />} style={{ fontSize: 11 }}>
              Default Billing Slab
            </Tag>
          )}
        </Flex>
      ),
    },
    {
      title: 'Total GST %',
      dataIndex: 'gstRate',
      key: 'gstRate',
      width: 140,
      render: (rate: number) => (
        <Tag color="green" style={{ fontSize: 14, fontWeight: 700, padding: '2px 8px' }}>
          {rate}%
        </Tag>
      ),
    },
    {
      title: 'CGST / SGST (Intra-State)',
      key: 'intra',
      width: 220,
      render: (_: any, record: TaxRate) => (
        <Space size={6}>
          <Tag color="blue">CGST: {record.cgstRate}%</Tag>
          <Tag color="cyan">SGST: {record.sgstRate}%</Tag>
        </Space>
      ),
    },
    {
      title: 'IGST (Inter-State)',
      dataIndex: 'igstRate',
      key: 'igstRate',
      width: 140,
      render: (rate: number) => <Tag color="purple">IGST: {rate}%</Tag>,
    },
    {
      title: 'Cess %',
      dataIndex: 'cessRate',
      key: 'cessRate',
      width: 110,
      render: (rate: number) =>
        Number(rate || 0) > 0 ? <Tag color="orange">{rate}%</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 110,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'error'}>{enabled ? 'Active' : 'Disabled'}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: TaxRate) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#2563eb' }} />}
            onClick={() => {
              setEditingItem(record)
              setModalOpen(true)
            }}
          />
          <Popconfirm
            title="Are you sure you want to delete this tax slab?"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} disabled={record.isDefault} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <PercentageOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>GST Tax Slabs & Rate Rules (Effective Schedulers)</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null)
              setModalOpen(true)
            }}
            style={{ borderRadius: 6 }}
          >
            Add Tax Slab
          </Button>
        }
        variant="outlined"
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="Search by slab name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ maxWidth: 360 }}
            allowClear
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            onChange: (page, size) => setPagination({ current: page, pageSize: size }),
          }}
        />
      </Card>

      <TaxRateModal
        open={modalOpen}
        initialValues={editingItem}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(null)
        }}
        onSuccess={loadData}
      />
    </div>
  )
}
