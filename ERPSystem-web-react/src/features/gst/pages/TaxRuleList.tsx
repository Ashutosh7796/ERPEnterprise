import React, { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Space, Tag, Input, Popconfirm, message, Typography, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ScheduleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { gstApi } from '../api/gstApi'
import { TaxRuleModal } from './TaxRuleModal'
import type { TaxRule, HsnSac, TaxRate } from '../types'

const { Title, Text } = Typography

export const TaxRuleList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TaxRule[]>([])
  const [total, setTotal] = useState(0)
  const [hsnList, setHsnList] = useState<HsnSac[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TaxRule | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gstApi.getTaxRuleList({ search })
      if (res.data) {
        setData(res.data.rows || [])
        setTotal(res.data.total || 0)
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load tax rules')
    } finally {
      setLoading(false)
    }
  }, [search])

  const loadDependencies = async () => {
    try {
      const [hsnRes, rateRes] = await Promise.all([
        gstApi.getHsnSacList({ pageSize: 500 }),
        gstApi.getAllTaxRates(),
      ])
      if (hsnRes.data?.rows) setHsnList(hsnRes.data.rows)
      if (rateRes.data?.list) setTaxRates(rateRes.data.list)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
    loadDependencies()
  }, [loadData])

  const handleDelete = async (id: number) => {
    try {
      await gstApi.deleteTaxRule(id)
      message.success('Tax rule inactivated successfully')
      loadData()
    } catch (err: any) {
      message.error(err.message || 'Failed to delete tax rule')
    }
  }

  const columns: ColumnsType<TaxRule> = [
    {
      title: 'HSN / SAC',
      key: 'hsn',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontFamily: 'monospace' }}>{r.hsnSacCode}</Text>
          <div style={{ fontSize: 12, color: '#888' }}>{r.hsnSacDescription}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'hsnType',
      key: 'hsnType',
      width: 100,
      render: (v) => <Tag color={v === 'SERVICES' ? 'purple' : 'blue'}>{v || 'GOODS'}</Tag>,
    },
    {
      title: 'Tax Slab',
      key: 'taxSlab',
      width: 160,
      render: (_, r) => (
        <div>
          <Tag color="cyan">{r.taxSlabName || `${r.gstRate}% GST`}</Tag>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            CGST {r.cgstRate}% | SGST {r.sgstRate}% | IGST {r.igstRate}%
          </div>
        </div>
      ),
    },
    {
      title: 'Effective Validity',
      key: 'validity',
      width: 220,
      render: (_, r) => (
        <Space orientation="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>
            <Text type="secondary">From:</Text> {r.effectiveFrom ? String(r.effectiveFrom).substring(0, 10) : 'Beginning'}
          </Text>
          <Text style={{ fontSize: 12 }}>
            <Text type="secondary">To:</Text> {r.effectiveTo ? String(r.effectiveTo).substring(0, 10) : <Tag color="green">Active (Open)</Tag>}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Treatment',
      dataIndex: 'taxTreatment',
      key: 'taxTreatment',
      width: 120,
      render: (v) => {
        const colorMap: Record<string, string> = {
          TAXABLE: 'blue',
          EXEMPT: 'orange',
          NIL_RATED: 'default',
          NON_GST: 'volcano',
        }
        return <Tag color={colorMap[v] || 'default'}>{v}</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v) => <Tag color={v === 'ACTIVE' ? 'success' : 'error'}>{v}</Tag>,
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingRecord(record)
              setModalOpen(true)
            }}
          />
          <Popconfirm
            title="Inactivate Tax Rule"
            description="Are you sure you want to deactivate this statutory rule?"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card variant="borderless">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space align="baseline">
              <ScheduleOutlined style={{ fontSize: 22, color: '#1677ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>Statutory GST Tax Rules</Title>
                <Text type="secondary">
                  Effective-dated GST rates with statutory validity intervals and overlap prevention.
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Input.Search
                placeholder="Search HSN code or slab..."
                allowClear
                onSearch={(v) => setSearch(v)}
                style={{ width: 240 }}
              />
              <Button icon={<ReloadOutlined />} onClick={loadData}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRecord(null)
                  setModalOpen(true)
                }}
              >
                New Tax Rule
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            showTotal: (t) => `Total ${t} rules`,
            pageSize: 15,
          }}
        />
      </Card>

      <TaxRuleModal
        open={modalOpen}
        record={editingRecord}
        hsnList={hsnList}
        taxRates={taxRates}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          loadData()
        }}
      />
    </div>
  )
}
