import React, { useState, useEffect } from 'react'
import { Table, Button, Card, Space, Input, Tag, Popconfirm, message, Tooltip, Typography, Flex } from 'antd'
import { PlusOutlined, SearchOutlined, CheckCircleFilled, StarOutlined, StarFilled, DeleteOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import { CompanyGstinModal } from './CompanyGstinModal'
import type { CompanyGstin } from '../types'

const { Title, Text } = Typography

export const CompanyGstinListPage: React.FC = () => {
  const [data, setData] = useState<CompanyGstin[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CompanyGstin | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await gstApi.getCompanyGstinList({
        search: JSON.stringify({ keyword: search }),
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
      })
      if (res.data?.rows) {
        setData(res.data.rows)
        setTotal(res.data.total || res.data.rows.length)
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to load company GSTINs')
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
      await gstApi.deleteCompanyGstin(id)
      message.success('Company GSTIN deleted.')
      loadData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete GSTIN')
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await gstApi.setDefaultCompanyGstin(id)
      message.success('Primary Default GSTIN updated.')
      loadData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to set default GSTIN')
    }
  }

  const columns = [
    {
      title: 'Primary',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 80,
      align: 'center' as const,
      render: (isDefault: boolean, record: CompanyGstin) => (
        isDefault ? (
          <Tooltip title="Primary Default GSTIN">
            <StarFilled style={{ color: '#f59e0b', fontSize: 18 }} />
          </Tooltip>
        ) : (
          <Tooltip title="Click to make Default">
            <Button
              type="text"
              icon={<StarOutlined style={{ color: '#94a3b8' }} />}
              onClick={() => record.id && handleSetDefault(record.id)}
            />
          </Tooltip>
        )
      ),
    },
    {
      title: 'GSTIN',
      dataIndex: 'gstin',
      key: 'gstin',
      width: 170,
      render: (gstin: string, record: CompanyGstin) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontFamily: 'monospace', fontSize: 14, color: '#1e293b' }}>
            <SafetyCertificateOutlined style={{ color: '#2563eb', marginRight: 4 }} />
            {gstin}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            PAN: {record.pan || '-'}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Legal Entity & Trade Name',
      key: 'names',
      render: (_: any, record: CompanyGstin) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.legalName}</div>
          {record.tradeName && <div style={{ fontSize: 12, color: '#64748b' }}>Trade: {record.tradeName}</div>}
        </div>
      ),
    },
    {
      title: 'State / Location',
      key: 'state',
      width: 200,
      render: (_: any, record: CompanyGstin) => (
        <div>
          <Tag color="blue">{record.stateName || 'State ' + record.stateCode} ({record.stateCode})</Tag>
          {record.pincode && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>PIN: {record.pincode}</div>}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'taxpayerType',
      key: 'taxpayerType',
      width: 130,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          REGULAR: 'green',
          COMPOSITION: 'orange',
          SEZ_DEVELOPER: 'purple',
          SEZ_UNIT: 'geekblue',
          EOU: 'cyan',
          DEEMED_EXPORTER: 'gold',
        }
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: 'Compliance Toggles',
      key: 'toggles',
      width: 160,
      render: (_: any, record: CompanyGstin) => (
        <Space orientation="vertical" size={2}>
          <Tag color={record.isEinvoiceApplicable ? 'blue' : 'default'} style={{ fontSize: 11 }}>
            e-Invoice: {record.isEinvoiceApplicable ? 'Active' : 'Off'}
          </Tag>
          <Tag color={record.isEwaybillApplicable ? 'cyan' : 'default'} style={{ fontSize: 11 }}>
            e-Way Bill: {record.isEwaybillApplicable ? 'Active' : 'Off'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: CompanyGstin) => (
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
            title="Are you sure you want to delete this GSTIN registration?"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isDefault}
            />
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
            <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Company GSTIN & State Tax Registrations</span>
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
            Register GSTIN
          </Button>
        }
        variant="outlined"
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="Search by GSTIN, Legal Name, PAN or State..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ maxWidth: 400 }}
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

      <CompanyGstinModal
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
