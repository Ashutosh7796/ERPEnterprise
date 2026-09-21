import React, { useEffect, useState } from 'react'
import {
  Modal,
  Table,
  Button,
  Space,
  InputNumber,
  Input,
  Tag,
  Typography,
  message,
  Popconfirm,
  Descriptions,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { CheckCircleOutlined, SaveOutlined, LockOutlined } from '@ant-design/icons'
import { stocktakeApi, StocktakeSession, StocktakeItem } from '../api/stocktakeApi'

const { Text } = Typography

interface StocktakeModalProps {
  open: boolean
  stocktakeId: number | null
  onClose: () => void
  onSuccess: () => void
}

export const StocktakeModal: React.FC<StocktakeModalProps> = ({
  open,
  stocktakeId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [session, setSession] = useState<StocktakeSession | null>(null)
  const [items, setItems] = useState<StocktakeItem[]>([])

  const fetchDetail = async (id: number) => {
    setLoading(true)
    try {
      const res: any = await stocktakeApi.getStocktakeDetail(id)
      const data = res?.data || res
      if (data?.session) {
        setSession(data.session)
        setItems(data.items || [])
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load stocktake details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && stocktakeId) {
      fetchDetail(stocktakeId)
    } else {
      setSession(null)
      setItems([])
    }
  }, [open, stocktakeId])

  const isApproved = session?.status === 'APPROVED'
  const isCancelled = session?.status === 'CANCELLED'

  const handleCountChange = (itemId: number, newCount: number | null) => {
    if (isApproved || isCancelled) return
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const counted = newCount !== null && newCount >= 0 ? newCount : 0
          const variance = counted - (item.bookQty || 0)
          const varianceValue = variance * (item.unitPrice || 0)
          return {
            ...item,
            countedQty: counted,
            varianceQty: variance,
            varianceValue,
          }
        }
        return item
      })
    )
  }

  const handleRemarkChange = (itemId: number, newRemark: string) => {
    if (isApproved || isCancelled) return
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, remark: newRemark } : item))
    )
  }

  const handleSaveCounts = async () => {
    if (!stocktakeId) return
    setSaving(true)
    try {
      const payload = items.map((i) => ({
        id: i.id,
        countedQty: Number(i.countedQty || 0),
        remark: i.remark || '',
      }))
      await stocktakeApi.recordCount(stocktakeId, payload)
      message.success('Counts recorded successfully')
      fetchDetail(stocktakeId)
      onSuccess()
    } catch (err: any) {
      message.error(err.message || 'Failed to save counts')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!stocktakeId) return
    setApproving(true)
    try {
      await stocktakeApi.approveStocktake(stocktakeId)
      message.success('Stocktake approved! Physical stock adjustments and immutable stock ledger entries created.')
      fetchDetail(stocktakeId)
      onSuccess()
    } catch (err: any) {
      message.error(err.message || 'Failed to approve stocktake')
    } finally {
      setApproving(false)
    }
  }

  const columns: TableColumnsType<StocktakeItem> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: 'Material Name',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Specification / Model',
      key: 'spec',
      width: 130,
      ellipsis: true,
      render: (_, r) => [r.standard, r.model].filter(Boolean).join(' / ') || '-',
    },
    {
      title: 'Storage Bin',
      dataIndex: 'binCode',
      key: 'binCode',
      width: 100,
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : '-'),
    },
    {
      title: 'Book Qty',
      dataIndex: 'bookQty',
      key: 'bookQty',
      width: 100,
      align: 'right',
      render: (v) => <strong>{Number(v || 0).toFixed(2)}</strong>,
    },
    {
      title: 'Physical Count',
      dataIndex: 'countedQty',
      key: 'countedQty',
      width: 130,
      align: 'right',
      render: (v, r) =>
        isApproved || isCancelled ? (
          <strong>{Number(v || 0).toFixed(2)}</strong>
        ) : (
          <InputNumber
            min={0}
            precision={2}
            value={Number(v || 0)}
            onChange={(val) => handleCountChange(r.id, val)}
            style={{ width: '100%' }}
          />
        ),
    },
    {
      title: 'Variance Qty',
      dataIndex: 'varianceQty',
      key: 'varianceQty',
      width: 110,
      align: 'right',
      render: (v) => {
        const val = Number(v || 0)
        return (
          <strong style={{ color: val > 0 ? '#52c41a' : val < 0 ? '#f5222d' : '#8c8c8c' }}>
            {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
          </strong>
        )
      },
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (v) => (v !== undefined && v !== null ? `₹${Number(v).toFixed(2)}` : '-'),
    },
    {
      title: 'Variance Amount',
      dataIndex: 'varianceValue',
      key: 'varianceValue',
      width: 120,
      align: 'right',
      render: (v) => {
        const val = Number(v || 0)
        return (
          <span style={{ color: val > 0 ? '#52c41a' : val < 0 ? '#f5222d' : '#8c8c8c', fontWeight: 600 }}>
            {val > 0 ? `+₹${val.toFixed(2)}` : `₹${val.toFixed(2)}`}
          </span>
        )
      },
    },
    {
      title: 'Item Remark',
      dataIndex: 'remark',
      key: 'remark',
      width: 140,
      render: (v, r) =>
        isApproved || isCancelled ? (
          v || '-'
        ) : (
          <Input
            value={v || ''}
            placeholder="Audit notes"
            onChange={(e) => handleRemarkChange(r.id, e.target.value)}
          />
        ),
    },
  ]

  const totalVarianceQty = items.reduce((acc, i) => acc + Number(i.varianceQty || 0), 0)
  const totalVarianceValue = items.reduce((acc, i) => acc + Number(i.varianceValue || 0), 0)

  return (
    <Modal
      title={
        <Space>
          <span>Stocktake Audit: {session?.sessionNumber || ''}</span>
          {session?.status === 'APPROVED' && <Tag color="success" icon={<CheckCircleOutlined />}>APPROVED</Tag>}
          {session?.status === 'COUNTING' && <Tag color="processing">COUNTING IN PROGRESS</Tag>}
          {session?.status === 'DRAFT' && <Tag color="default">DRAFT</Tag>}
          {session?.status === 'CANCELLED' && <Tag color="error">CANCELLED</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1150}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        !isApproved && !isCancelled && (
          <Button
            key="save"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveCounts}
          >
            Save Counts
          </Button>
        ),
        !isApproved && !isCancelled && (
          <Popconfirm
            key="approve"
            title="Approve Physical Stocktake?"
            description="Authoritative physical adjustments will be executed via StockMutationService and posted to the Stock Ledger. This action cannot be reversed."
            onConfirm={handleApprove}
            okText="Approve & Post"
            cancelText="Cancel"
            okButtonProps={{ danger: totalVarianceQty !== 0 }}
          >
            <Button
              type="primary"
              icon={<LockOutlined />}
              loading={approving}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Approve & Mutate Stock
            </Button>
          </Popconfirm>
        ),
      ]}
    >
      <Descriptions size="small" bordered column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Session Number">{session?.sessionNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="Warehouse">{session?.depotName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Session Date">
          {session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={session?.status === 'APPROVED' ? 'green' : session?.status === 'COUNTING' ? 'blue' : 'default'}>
            {session?.status || '-'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Auditor / Creator">{session?.creatorName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Approver">{session?.approverName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Approval Time">
          {session?.approveTime ? new Date(session.approveTime).toLocaleString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Total Items">{items.length}</Descriptions.Item>
      </Descriptions>

      {/* Summary Variance Bar */}
      <div
        style={{
          marginBottom: 16,
          padding: '10px 16px',
          background: totalVarianceQty === 0 ? '#f6ffed' : '#fffbe6',
          border: `1px solid ${totalVarianceQty === 0 ? '#b7eb8f' : '#ffe58f'}`,
          borderRadius: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space size="middle" wrap>
          <Text>
            Total Counted Items: <strong>{items.length}</strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Net Variance Qty:{' '}
            <strong style={{ color: totalVarianceQty > 0 ? '#52c41a' : totalVarianceQty < 0 ? '#f5222d' : '#8c8c8c' }}>
              {totalVarianceQty > 0 ? `+${totalVarianceQty.toFixed(2)}` : totalVarianceQty.toFixed(2)}
            </strong>
          </Text>
          <Divider type="vertical" />
          <Text>
            Net Valuation Variance:{' '}
            <strong style={{ color: totalVarianceValue > 0 ? '#52c41a' : totalVarianceValue < 0 ? '#f5222d' : '#8c8c8c' }}>
              {totalVarianceValue > 0 ? `+₹${totalVarianceValue.toFixed(2)}` : `₹${totalVarianceValue.toFixed(2)}`}
            </strong>
          </Text>
        </Space>
        {isApproved && (
          <Tag color="success" style={{ padding: '4px 12px', fontSize: 13 }}>
            ✓ Inventory Mutated & Ledger Posted
          </Tag>
        )}
      </div>

      <Table
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 1100, y: 380 }}
      />
    </Modal>
  )
}
