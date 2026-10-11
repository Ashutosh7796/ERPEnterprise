import React, { useState, useEffect, useCallback } from 'react'
import {
  Drawer,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Typography,
  Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  getDepotBins,
  createDepotBin,
  updateDepotBin,
  deleteDepotBin,
  DepotBinRecord,
  BinType,
} from '../api/depotBinApi'

const { Text } = Typography

interface DepotBinDrawerProps {
  visible: boolean
  depot: { id: number; name: string } | null
  onClose: () => void
}

const BIN_TYPE_OPTIONS = [
  { value: 'STORAGE', label: 'Storage (Standard)' },
  { value: 'WIP', label: 'WIP (Shop Floor Staging)' },
  { value: 'QUARANTINE', label: 'Quarantine (QC Staging)' },
  { value: 'TRANSIT', label: 'Transit (Cross-dock Staging)' },
]

export const DepotBinDrawer: React.FC<DepotBinDrawerProps> = ({
  visible,
  depot,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [bins, setBins] = useState<DepotBinRecord[]>([])

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBin, setEditingBin] = useState<DepotBinRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const loadBins = useCallback(async () => {
    if (!depot) return
    setLoading(true)
    try {
      const data = await getDepotBins(depot.id)
      setBins(data)
    } catch (err: any) {
      console.error('Failed to load storage bins', err)
      message.error(err?.message || 'Failed to load storage bins')
    } finally {
      setLoading(false)
    }
  }, [depot])

  useEffect(() => {
    if (visible && depot) {
      loadBins()
    } else {
      setBins([])
    }
  }, [visible, depot, loadBins])

  const handleOpenAdd = () => {
    setEditingBin(null)
    form.resetFields()
    form.setFieldsValue({
      binType: 'STORAGE',
      isDefault: bins.length === 0, // Auto default if first bin
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (bin: DepotBinRecord) => {
    setEditingBin(bin)
    form.resetFields()
    form.setFieldsValue({
      binCode: bin.binCode,
      binName: bin.binName,
      binType: bin.binType,
      isDefault: Boolean(bin.isDefault),
    })
    setModalOpen(true)
  }

  const handleQuickCreateWip = async () => {
    if (!depot) return
    try {
      await createDepotBin({
        depotId: depot.id,
        binCode: 'WIP-FLOOR',
        binName: 'Shop Floor WIP Staging',
        binType: 'WIP',
        isDefault: false,
      })
      message.success('Shop Floor WIP staging bin (WIP-FLOOR) created successfully.')
      loadBins()
    } catch (err: any) {
      message.error(err?.message || 'Failed to create WIP bin')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!depot) return

      setSubmitting(true)
      if (editingBin && editingBin.id) {
        await updateDepotBin({
          ...editingBin,
          binCode: values.binCode.trim().toUpperCase(),
          binName: values.binName ? values.binName.trim() : '',
          binType: values.binType,
          isDefault: values.isDefault,
        })
        message.success(`Storage bin '${values.binCode}' updated successfully.`)
      } else {
        await createDepotBin({
          depotId: depot.id,
          binCode: values.binCode.trim().toUpperCase(),
          binName: values.binName ? values.binName.trim() : '',
          binType: values.binType,
          isDefault: values.isDefault,
        })
        message.success(`Storage bin '${values.binCode}' created successfully.`)
      }
      setModalOpen(false)
      loadBins()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || 'Failed to save storage bin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (binId?: number) => {
    if (!binId) return
    try {
      await deleteDepotBin(binId)
      message.success('Storage bin deleted successfully.')
      loadBins()
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete storage bin')
    }
  }

  const handleSetDefault = async (bin: DepotBinRecord) => {
    if (!bin.id || !depot) return
    try {
      await updateDepotBin({
        ...bin,
        isDefault: true,
      })
      message.success(`Storage bin '${bin.binCode}' set as default storage location successfully.`)
      loadBins()
    } catch (err: any) {
      message.error(err?.message || 'Failed to set default bin')
    }
  }

  const getBinTypeTag = (type: BinType) => {
    switch (type) {
      case 'STORAGE':
        return <Tag color="blue">STORAGE</Tag>
      case 'WIP':
        return <Tag color="orange">WIP STAGING</Tag>
      case 'QUARANTINE':
        return <Tag color="red">QUARANTINE</Tag>
      case 'TRANSIT':
        return <Tag color="cyan">TRANSIT</Tag>
      default:
        return <Tag>{type}</Tag>
    }
  }

  const hasWipBin = bins.some((b) => b.binType === 'WIP')

  const columns: TableColumnsType<DepotBinRecord> = [
    {
      title: 'Bin Code',
      dataIndex: 'binCode',
      key: 'binCode',
      width: 140,
      render: (v, r) => (
        <Space>
          <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</strong>
          {r.isDefault && <Tag color="gold" icon={<CheckCircleOutlined />}>Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Bin Name',
      dataIndex: 'binName',
      key: 'binName',
      render: (v) => v || '-',
    },
    {
      title: 'Location Type',
      dataIndex: 'binType',
      key: 'binType',
      width: 150,
      render: (type) => getBinTypeTag(type),
    },
    {
      title: 'Default Action',
      key: 'defaultAction',
      width: 120,
      align: 'center',
      render: (_, r) =>
        r.isDefault ? (
          <Text type="secondary">Active Default</Text>
        ) : (
          <Button size="small" type="link" onClick={() => handleSetDefault(r)}>
            Set as Default
          </Button>
        ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(r)}
          />
          <Popconfirm
            title="Delete storage bin?"
            description="Bins containing inventory cannot be deleted."
            onConfirm={() => handleDelete(r.id)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Drawer
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#1890ff' }} />
            <span>Storage Location Bins — {depot?.name || 'Warehouse'}</span>
          </Space>
        }
        width={720}
        open={visible}
        onClose={onClose}
        extra={
          <Space>
            {!hasWipBin && (
              <Tooltip title="Quick create shop-floor staging bin (WIP-FLOOR)">
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={handleQuickCreateWip}
                >
                  Add WIP Bin
                </Button>
              </Tooltip>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
            >
              Create Storage Bin
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Manage granular 2-tier storage location bins for this warehouse. Every physical stock movement and stocktake adjustment can optionally or by default target these specific bins.
          </Text>
        </div>

        <Table
          rowKey="id"
          bordered
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={bins}
          pagination={false}
        />
      </Drawer>

      {/* Add / Edit Bin Modal */}
      <Modal
        title={editingBin ? `Edit Storage Bin: ${editingBin.binCode}` : 'Create Storage Bin'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="binCode"
            label="Bin Code"
            rules={[
              { required: true, message: 'Please enter a bin code' },
              {
                pattern: /^[A-Za-z0-9\-_]+$/,
                message: 'Bin code must only contain alphanumeric characters, hyphens, or underscores',
              },
            ]}
          >
            <Input
              placeholder="e.g. A-01, BIN-RACK-1, WIP-FLOOR"
              onChange={(e) => {
                form.setFieldsValue({ binCode: e.target.value.toUpperCase() })
              }}
            />
          </Form.Item>

          <Form.Item name="binName" label="Bin Description / Label">
            <Input placeholder="e.g. Ground Floor East Rack 1, Inward Staging" />
          </Form.Item>

          <Form.Item
            name="binType"
            label="Location Type"
            rules={[{ required: true, message: 'Please select a location type' }]}
          >
            <Select options={BIN_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="isDefault"
            label="Make Default Storage Bin"
            valuePropName="checked"
            extra="If designated as default, automated GRN, production completion, and inward movements will target this bin automatically."
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
