import React, { useState } from 'react'
import {
  Modal,
  Table,
  Tabs,
  Tag,
  Button,
  Space,
  Typography,
  Alert,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Select,
} from 'antd'
import {
  NodeIndexOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons'
import {
  productionPlanApi,
  ProductionPlanDTO,
  ProductionPlanItemDTO,
  ProductionPlanMaterialDTO,
} from '../api/productionPlanApi'

const { Text, Title } = Typography

interface MrpExplosionModalProps {
  open: boolean
  onClose: () => void
  plan: ProductionPlanDTO | null
  onRefresh: () => void
}

export const MrpExplosionModal: React.FC<MrpExplosionModalProps> = ({
  open,
  onClose,
  plan,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([])

  if (!plan) return null

  const items = plan.items || []
  const materials = plan.materials || []
  const shortages = materials.filter((m) => m.netShortageQty > 0)

  const handleCreatePR = async () => {
    try {
      setLoading(true)
      const res: any = await productionPlanApi.createPurchaseRequisition({
        planId: plan.id!,
        materialIds: selectedMaterials.length > 0 ? selectedMaterials : undefined,
        actionType: 'PURCHASE',
        remark: 'Generated from MRP Shortage Screen',
      })
      message.success(`Purchase Requisition #${res?.number || res?.data?.number || 'PR'} created successfully.`)
      onRefresh()
    } catch (err: any) {
      console.error('Failed to create PR:', err)
      message.error(err?.message || 'Failed to create Purchase Requisition.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransfer = async () => {
    try {
      setLoading(true)
      // Pick first non-target depot for demo
      const res: any = await productionPlanApi.createStockTransfer({
        planId: plan.id!,
        materialIds: selectedMaterials.length > 0 ? selectedMaterials : undefined,
        actionType: 'TRANSFER',
        sourceDepotId: 2, // Secondary Depot
        targetDepotId: items[0]?.targetDepotId || 1,
        remark: 'Generated from MRP Transfer recommendation',
      })
      message.success(`Stock Transfer #${res?.number || res?.data?.number || 'ST'} created successfully.`)
      onRefresh()
    } catch (err: any) {
      console.error('Failed to create Transfer:', err)
      message.error(err?.message || 'Failed to create Stock Transfer.')
    } finally {
      setLoading(false)
    }
  }

  const itemColumns = [
    {
      title: 'Level',
      dataIndex: 'bomLevel',
      key: 'bomLevel',
      width: 80,
      render: (level: number, row: ProductionPlanItemDTO) => {
        if (row.isSubAssembly === '1') {
          return <Tag color="orange">Lvl {level} Sub-Assy</Tag>
        }
        return <Tag color="blue">Finished Good</Tag>
      },
    },
    {
      title: 'Material / Part',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 240,
      render: (text: string, row: ProductionPlanItemDTO) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || `Material #${row.materialId}`}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>
            {row.materialModel || ''} {row.materialStandard || ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'BOM Code & Revision',
      dataIndex: 'bomCode',
      key: 'bomCode',
      width: 180,
      render: (code: string, row: ProductionPlanItemDTO) => (
        <Space>
          <Tag color="cyan">{code || `BOM #${row.bomId}`}</Tag>
          <Tag>{row.bomRevisionCode || 'Rev 0'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Planned Quantity',
      dataIndex: 'netPlannedQty',
      key: 'netPlannedQty',
      width: 120,
      render: (qty: number, row: ProductionPlanItemDTO) => (
        <Text strong>
          {qty} {row.materialUnit || 'PCS'}
        </Text>
      ),
    },
    {
      title: 'Target Plant / Warehouse',
      dataIndex: 'targetDepotName',
      key: 'targetDepotName',
      width: 170,
      render: (name: string, row: ProductionPlanItemDTO) => name || `Plant #${row.targetDepotId}`,
    },
    {
      title: 'Work Order Status',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: string, row: ProductionPlanItemDTO) => {
        if (row.workOrderNumber || row.workOrderId) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              {row.workOrderNumber || `WO #${row.workOrderId}`}
            </Tag>
          )
        }
        return <Tag color="gold">Pending Work Order Release</Tag>
      },
    },
  ]

  const materialColumns = [
    {
      title: 'Component / Raw Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 250,
      render: (text: string, row: ProductionPlanMaterialDTO) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || `Part #${row.materialId}`}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>
            {row.materialModel || ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Gross Demand',
      dataIndex: 'grossRequiredQty',
      key: 'grossRequiredQty',
      width: 110,
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'On-Hand Stock',
      dataIndex: 'currentStockQty',
      key: 'currentStockQty',
      width: 110,
    },
    {
      title: 'Allocated / Reserved',
      dataIndex: 'allocatedStockQty',
      key: 'allocatedStockQty',
      width: 120,
      render: (qty: number) => (qty > 0 ? <Tag color="warning">-{qty}</Tag> : '0'),
    },
    {
      title: 'Available Stock (ATP)',
      dataIndex: 'availableStockQty',
      key: 'availableStockQty',
      width: 130,
      render: (qty: number) => <Tag color={qty > 0 ? 'green' : 'default'}>{qty}</Tag>,
    },
    {
      title: 'Open PO / Inbound Orders',
      dataIndex: 'openPurchaseQty',
      key: 'openPurchaseQty',
      width: 140,
      render: (qty: number) => (qty > 0 ? <Tag color="processing">+{qty}</Tag> : '0'),
    },
    {
      title: 'Net Shortage',
      dataIndex: 'netShortageQty',
      key: 'netShortageQty',
      width: 120,
      render: (qty: number) =>
        qty > 0 ? (
          <Tag color="red" icon={<WarningOutlined />}>
            {qty} SHORT
          </Tag>
        ) : (
          <Tag color="green">Fulfilled</Tag>
        ),
    },
    {
      title: 'Recommended Action',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 180,
      render: (action: string, row: ProductionPlanMaterialDTO) => {
        if (row.procurementVoucherNo) {
          return <Tag color="blue">{row.procurementVoucherNo}</Tag>
        }
        if (action === 'RECOMMEND_PURCHASE') {
          return <Tag color="magenta">Purchase Requisition</Tag>
        }
        if (action === 'RECOMMEND_TRANSFER') {
          return <Tag color="purple">Stock Transfer</Tag>
        }
        return <Tag color="default">In Stock</Tag>
      },
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <DeploymentUnitOutlined style={{ color: '#1677ff' }} />
          <span>Material Requirements Planning (MRP) Explosion & Netting: {plan.planNumber}</span>
          <Tag color={plan.status === 'APPROVED' ? 'green' : plan.status === 'RELEASED' ? 'blue' : 'gold'}>
            {plan.status}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        shortages.length > 0 && (
          <Button
            key="transfer"
            icon={<SwapOutlined />}
            onClick={handleCreateTransfer}
            loading={loading}
          >
            Create Stock Transfer
          </Button>
        ),
        shortages.length > 0 && (
          <Button
            key="pr"
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={handleCreatePR}
            loading={loading}
          >
            Create Purchase Requisition
          </Button>
        ),
      ]}
      width={1200}
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" variant="borderless">
            <Statistic title="Total Planned Items" value={items.length} prefix={<NodeIndexOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless">
            <Statistic
              title="Raw Material Components"
              value={materials.length}
              prefix={<DeploymentUnitOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless">
            <Statistic
              title="Net Shortages"
              value={shortages.length}
              valueStyle={{ color: shortages.length > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless">
            <Statistic
              title="MRP Netting Mode"
              value="Deterministic"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      {shortages.length > 0 ? (
        <Alert
          message={`${shortages.length} Material Shortage(s) Detected`}
          description="MRP has identified raw material shortages. You can review the gross-to-net formulation below and generate Purchase Requisitions or Inter-Warehouse Transfers."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          message="Zero Material Shortages"
          description="All raw materials and sub-assemblies are fully covered by unreserved on-hand stock and active open supply. This plan is ready for release."
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="materials"
        items={[
          {
            key: 'materials',
            label: `Gross-to-Net Material Requirements (${materials.length})`,
            children: (
              <Table
                dataSource={materials}
                columns={materialColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 1200, y: 360 }}
                rowSelection={{
                  selectedRowKeys: selectedMaterials,
                  onChange: (keys) => setSelectedMaterials(keys as number[]),
                }}
              />
            ),
          },
          {
            key: 'assemblies',
            label: `Assembly & Sub-Assembly Schedule (${items.length})`,
            children: (
              <Table
                dataSource={items}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 1050, y: 360 }}
              />
            ),
          },
        ]}
      />
    </Modal>
  )
}
