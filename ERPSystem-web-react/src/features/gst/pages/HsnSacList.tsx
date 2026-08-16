import React, { useState, useEffect } from 'react'
import { Table, Button, Card, Space, Input, Tag, Popconfirm, message, Select, Typography, Flex } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import { HsnSacModal } from './HsnSacModal'
import type { HsnSac } from '../types'

const { Title, Text } = Typography

export const HsnSacListPage: React.FC = () => {
  const [data, setData] = useState<HsnSac[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HsnSac | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await gstApi.getHsnSacList({
        search: JSON.stringify({ keyword: search, type: typeFilter }),
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
      })
      if (res.data?.rows) {
        setData(res.data.rows)
        setTotal(res.data.total || res.data.rows.length)
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to load HSN/SAC catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, typeFilter])

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    loadData()
  }

  const handleDelete = async (id: number) => {
    try {
      await gstApi.deleteHsnSac(id)
      message.success('HSN/SAC code deleted.')
      loadData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete HSN/SAC code')
    }
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'hsnSacCode',
      key: 'hsnSacCode',
      width: 140,
      render: (code: string, record: HsnSac) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontFamily: 'monospace', fontSize: 14, color: '#1e293b' }}>
            {code}
          </Text>
          <Tag color={record.type === 'GOODS' ? 'blue' : 'purple'} style={{ fontSize: 10 }}>
            {record.type}
          </Tag>
        </Flex>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => <div style={{ fontSize: 13, color: '#334155' }}>{desc}</div>,
    },
    {
      title: 'GST Slabs Breakdown',
      key: 'rates',
      width: 240,
      render: (_: any, record: HsnSac) => (
        <Flex vertical gap={2}>
          <Tag color="green" style={{ fontWeight: 600 }}>
            Total GST: {record.gstRate}%
          </Tag>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            CGST: {record.cgstRate}% | SGST: {record.sgstRate}% | IGST: {record.igstRate}%
          </div>
          {Number(record.cessRate || 0) > 0 && (
            <Tag color="orange" style={{ fontSize: 10 }}>
              Cess: {record.cessRate}%
            </Tag>
          )}
        </Flex>
      ),
    },
    {
      title: 'Attributes',
      key: 'attributes',
      width: 160,
      render: (_: any, record: HsnSac) => (
        <Flex vertical gap={2}>
          {record.isExempt && <Tag color="gold">Exempt Supply</Tag>}
          {record.isNilRated && <Tag color="default">Nil-Rated</Tag>}
          {record.isNonGst && <Tag color="volcano">Non-GST</Tag>}
          {record.isRcm && <Tag color="magenta">Reverse Charge (RCM)</Tag>}
          {!record.isExempt && !record.isNilRated && !record.isNonGst && !record.isRcm && (
            <Tag color="blue">Standard Taxable</Tag>
          )}
        </Flex>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: HsnSac) => (
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
            title="Are you sure you want to delete this HSN/SAC code?"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
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
            <BookOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>HSN & SAC Code Catalog (Commodity / Service Tax Master)</span>
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
            Add HSN / SAC Code
          </Button>
        }
        variant="outlined"
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by HSN/SAC code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ maxWidth: 360 }}
            allowClear
          />
          <Select
            placeholder="Filter Classification"
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            allowClear
            style={{ width: 180 }}
            options={[
              { value: 'GOODS', label: 'Goods Only (HSN)' },
              { value: 'SERVICES', label: 'Services Only (SAC)' },
            ]}
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

      <HsnSacModal
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
