import React, { useEffect, useState, useCallback } from 'react'
import { Modal, Spin, Table, InputNumber, Button, Space, Tag, Typography, Alert } from 'antd'
import { ApartmentOutlined, ReloadOutlined } from '@ant-design/icons'
import { bomApi, BomExplosionNode } from '../api/bomApi'

const { Text } = Typography

interface BomExplosionTreeModalProps {
  open: boolean
  onClose: () => void
  bomId?: number
  bomCode?: string
  defaultOutputQty?: number
}

export const BomExplosionTreeModal: React.FC<BomExplosionTreeModalProps> = ({
  open,
  onClose,
  bomId,
  bomCode,
  defaultOutputQty = 1,
}) => {
  const [loading, setLoading] = useState(false)
  const [targetQty, setTargetQty] = useState<number>(defaultOutputQty)
  const [treeData, setTreeData] = useState<BomExplosionNode[]>([])

  const loadExplosion = useCallback(async (qty: number) => {
    if (!bomId) return
    setLoading(true)
    try {
      const res: any = await bomApi.explodeBom(bomId, qty)
      if (res && res.code === 200 && res.data) {
        setTreeData([res.data])
      } else {
        setTreeData([])
      }
    } catch (err) {
      console.error('Failed to explode BOM:', err)
      setTreeData([])
    } finally {
      setLoading(false)
    }
  }, [bomId])

  useEffect(() => {
    if (open && bomId) {
      setTargetQty(defaultOutputQty)
      loadExplosion(defaultOutputQty)
    }
  }, [open, bomId, defaultOutputQty, loadExplosion])

  const columns = [
    {
      title: 'Level & Item',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (val: string, record: BomExplosionNode) => (
        <Space>
          <Text strong>{record.level === 0 ? `Finished Good: ${val}` : val}</Text>
          {record.subAssembly && <Tag color="purple">Sub-Assembly</Tag>}
          {record.level === 0 && <Tag color="blue">Parent BOM</Tag>}
        </Space>
      ),
    },
    {
      title: 'Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 130,
      render: (val: string) => val || '-',
    },
    {
      title: 'Specification',
      dataIndex: 'standard',
      key: 'standard',
      width: 140,
      render: (val: string, record: BomExplosionNode) => `${val || ''} ${record.model || ''}`.trim() || '-',
    },
    {
      title: 'Base Quantity / Yield',
      key: 'unitQuantity',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: BomExplosionNode) => (
        record.level === 0 ? `Yield: ${record.batchYield || 1}` : `${record.unitQuantity || 1}`
      ),
    },
    {
      title: 'Scrap Factor (%)',
      dataIndex: 'scrapPercent',
      key: 'scrapPercent',
      width: 130,
      align: 'right' as const,
      render: (val: number) => (val !== undefined ? `${Number(val).toFixed(2)}%` : '0.00%'),
    },
    {
      title: 'Required Quantity',
      dataIndex: 'scaledQuantity',
      key: 'scaledQuantity',
      width: 180,
      align: 'right' as const,
      render: (val: number, record: BomExplosionNode) => (
        <Space>
          <Text strong style={{ color: '#1890ff', fontSize: 14 }}>
            {Number(val || 0).toFixed(4)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.unit || 'units'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Issue Method',
      dataIndex: 'issueType',
      key: 'issueType',
      width: 130,
      render: (val: string, record: BomExplosionNode) => (
        record.level === 0 ? '-' : (
          <Tag color={val === 'BACKFLUSH' ? 'cyan' : 'default'}>
            {val === 'BACKFLUSH' ? 'Backflush' : 'Manual Issue'}
          </Tag>
        )
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <ApartmentOutlined style={{ color: '#722ed1', fontSize: 18 }} />
          <span>Multi-Level BOM Explosion Tree — {bomCode || `#${bomId}`}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1050}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div style={{ padding: '8px 0' }}>
        <Alert
          type="info"
          showIcon
          message="Multi-Level Bill of Materials (BOM) Explosion"
          description="All multi-level component requirements, sub-assemblies, and scrap allowances are calculated based on the approved engineering structure."
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: '#fafafa', padding: 12, borderRadius: 6 }}>
          <Text strong>Target Production Quantity:</Text>
          <InputNumber
            min={0.0001}
            step={1}
            value={targetQty}
            onChange={(val) => setTargetQty(val || 1)}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => loadExplosion(targetQty)}
            loading={loading}
          >
            Calculate Material Requirements
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            rowKey={(rec) => `${rec.level}_${rec.materialId}_${rec.bomId || 0}`}
            columns={columns as any}
            dataSource={treeData}
            pagination={false}
            defaultExpandAllRows
            size="middle"
            bordered
          />
        </Spin>
      </div>
    </Modal>
  )
}
