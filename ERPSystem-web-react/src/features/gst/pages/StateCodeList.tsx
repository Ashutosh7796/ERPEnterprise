import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Tag, Space, Typography } from 'antd'
import { SearchOutlined, CompassOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import type { StateCode } from '../types'

const { Title, Text } = Typography

export const StateCodeListPage: React.FC = () => {
  const [data, setData] = useState<StateCode[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await gstApi.getStateList({
        search: JSON.stringify({ keyword: search }),
      })
      const rows = res?.data?.rows || res?.rows || (Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.list || []))
      if (rows && Array.isArray(rows)) {
        setData(rows)
      }
    } catch (err) {
      console.error('Failed to load state list', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = (data || []).filter(
    (item) =>
      (item.stateCode || '').includes(search) ||
      (item.stateName || '').toLowerCase().includes((search || '').toLowerCase()) ||
      (item.stateType || '').toLowerCase().includes((search || '').toLowerCase())
  )

  const columns = [
    {
      title: 'GST State Code',
      dataIndex: 'stateCode',
      key: 'stateCode',
      width: 150,
      render: (code: string) => (
        <Tag color="geekblue" style={{ fontSize: 14, fontWeight: 700, padding: '2px 8px' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'State / Territory Name',
      dataIndex: 'stateName',
      key: 'stateName',
      render: (name: string) => <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>,
    },
    {
      title: 'Jurisdiction Type',
      dataIndex: 'stateType',
      key: 'stateType',
      width: 200,
      render: (type: string) => {
        if (type === 'STATE') return <Tag color="blue">State</Tag>
        if (type === 'UNION_TERRITORY') return <Tag color="cyan">Union Territory (UT)</Tag>
        return <Tag color="purple">Other Jurisdiction</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 120,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'error'}>{enabled ? 'Active' : 'Disabled'}</Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <CompassOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Official Indian State & Union Territory Codes (GSTN / CBIC)</span>
          </Space>
        }
        variant="outlined"
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="Search state code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ maxWidth: 360 }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}
