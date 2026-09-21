import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Table,
  Space,
  Typography,
  message,
  Popconfirm,
  Row,
  Col,
  Alert,
} from 'antd'
import { PlusOutlined, DeleteOutlined, BuildOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'
import { bomApi, BomHeadDTO, BomItemDTO } from '../api/bomApi'

const { Text } = Typography

interface BomModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editingRecord?: BomHeadDTO | null
}

export const BomModal: React.FC<BomModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingRecord,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [productList, setProductList] = useState<any[]>([])
  const [items, setItems] = useState<BomItemDTO[]>([])

  useEffect(() => {
    if (!open) return

    // Load materials
    http.get('/material/findBySelect', { params: { page: 1, rows: 500 } }).then((res: any) => {
      let mats: any[] = []
      if (Array.isArray(res)) mats = res
      else if (Array.isArray(res?.data?.rows)) mats = res.data.rows
      else if (Array.isArray(res?.rows)) mats = res.rows
      else if (Array.isArray(res?.data)) mats = res.data
      setProductList(mats)
    })

    if (editingRecord && editingRecord.id) {
      form.setFieldsValue({
        materialId: editingRecord.materialId,
        bomCode: editingRecord.bomCode,
        revisionCode: editingRecord.revisionCode || '1.0',
        outputQuantity: editingRecord.outputQuantity || 1,
        isDefault: editingRecord.isDefault === '1',
        status: editingRecord.status || 'ACTIVE',
        remark: editingRecord.remark,
      })
      // Load detailed items
      bomApi.getBomById(editingRecord.id).then((res: any) => {
        if (res && res.code === 200 && res.data?.items) {
          setItems(res.data.items)
        } else {
          setItems(editingRecord.items || [])
        }
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        bomCode: `BOM-${Date.now().toString().slice(-6)}`,
        revisionCode: '1.0',
        outputQuantity: 1,
        isDefault: true,
        status: 'ACTIVE',
      })
      setItems([
        {
          componentMaterialId: undefined as any,
          quantity: 1,
          scrapPercent: 0,
          issueType: 'MANUAL_ISSUE',
        },
      ])
    }
  }, [open, editingRecord, form])

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        componentMaterialId: undefined as any,
        quantity: 1,
        scrapPercent: 0,
        issueType: 'MANUAL_ISSUE',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  const handleItemChange = (index: number, field: keyof BomItemDTO, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const validItems = items.filter((it) => it.componentMaterialId && Number(it.quantity || 0) > 0)

      if (validItems.length === 0) {
        message.warning('Please specify at least one valid component raw material with positive quantity.')
        return
      }

      setLoading(true)
      const payload: any = {
        materialId: values.materialId,
        bomCode: values.bomCode,
        revisionCode: values.revisionCode,
        outputQuantity: values.outputQuantity,
        isDefault: values.isDefault ? '1' : '0',
        status: values.status,
        remark: values.remark,
        items: validItems,
      }

      let res: any
      if (editingRecord && editingRecord.id) {
        payload.id = editingRecord.id
        res = await bomApi.updateBom(payload)
      } else {
        res = await bomApi.createBom(payload)
      }

      if (res && (res.code === 200 || res.status === 200)) {
        message.success(editingRecord ? 'BOM updated successfully!' : 'Master BOM created successfully!')
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || res?.message || 'Failed to save BOM')
      }
    } catch (err: any) {
      console.error('Save BOM error:', err)
      const errMsg = err?.response?.data?.data || err?.message || 'Validation error'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Component Raw Material',
      key: 'componentMaterialId',
      render: (_: any, record: BomItemDTO, index: number) => (
        <Select
          showSearch
          placeholder="Select raw material / sub-assembly..."
          value={record.componentMaterialId}
          onChange={(val) => handleItemChange(index, 'componentMaterialId', val)}
          optionFilterProp="label"
          style={{ width: '100%' }}
          options={productList.map((p) => ({
            value: p.id || p.meId,
            label: `${p.name} ${p.standard || ''} ${p.model || ''} (${p.mBarCode || p.barCode || 'No Barcode'})`,
          }))}
        />
      ),
    },
    {
      title: 'Qty per Batch',
      key: 'quantity',
      width: 140,
      render: (_: any, record: BomItemDTO, index: number) => (
        <InputNumber
          min={0.000001}
          step={1}
          value={record.quantity}
          onChange={(val) => handleItemChange(index, 'quantity', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Scrap %',
      key: 'scrapPercent',
      width: 110,
      render: (_: any, record: BomItemDTO, index: number) => (
        <InputNumber
          min={0}
          max={100}
          step={0.5}
          value={record.scrapPercent}
          onChange={(val) => handleItemChange(index, 'scrapPercent', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Issue Method',
      key: 'issueType',
      width: 140,
      render: (_: any, record: BomItemDTO, index: number) => (
        <Select
          value={record.issueType || 'MANUAL_ISSUE'}
          onChange={(val) => handleItemChange(index, 'issueType', val)}
          style={{ width: '100%' }}
          options={[
            { value: 'MANUAL_ISSUE', label: 'Manual Issue' },
            { value: 'BACKFLUSH', label: 'Backflush (Auto)' },
          ]}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Popconfirm title="Remove component line?" onConfirm={() => handleRemoveItem(index)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined style={{ color: '#1890ff', fontSize: 18 }} />
          <span>{editingRecord ? `Edit Master BOM — ${editingRecord.bomCode}` : 'Create Master Bill of Materials (BOM)'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={950}
      destroyOnHidden
      okText={editingRecord ? 'Save Changes' : 'Create Master BOM'}
    >
      <Alert
        type="info"
        showIcon
        message="Master BOM & Recipe Invariants"
        description="Every parent finished good maintains one default active recipe. Circular dependencies are verified recursively server-side on save."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="materialId"
              label="Parent Finished Good"
              rules={[{ required: true, message: 'Please select finished good' }]}
            >
              <Select
                showSearch
                placeholder="Select finished good..."
                optionFilterProp="label"
                disabled={!!editingRecord}
                options={productList.map((p) => ({
                  value: p.id || p.meId,
                  label: `${p.name} ${p.standard || ''} ${p.model || ''} (${p.mBarCode || p.barCode || 'No Barcode'})`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={7}>
            <Form.Item
              name="bomCode"
              label="BOM Code"
              rules={[{ required: true, message: 'BOM code is required' }]}
            >
              <Input placeholder="e.g. BOM-FG-001" disabled={!!editingRecord} />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Form.Item
              name="revisionCode"
              label="Revision"
              rules={[{ required: true, message: 'Revision is required' }]}
            >
              <Input placeholder="1.0" />
            </Form.Item>
          </Col>

          <Col span={3}>
            <Form.Item name="isDefault" label="Default Recipe" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="outputQuantity"
              label="Batch Yield Output Qty"
              rules={[{ required: true, message: 'Output batch yield is required' }]}
            >
              <InputNumber min={0.000001} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'DRAFT', label: 'DRAFT' },
                  { value: 'OBSOLETE', label: 'OBSOLETE' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="remark" label="Remarks">
              <Input placeholder="Formula notes, manufacturing revisions..." />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 }}>
          <Text strong style={{ fontSize: 14 }}>
            Component Raw Materials & Sub-Assemblies
          </Text>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} size="small">
            Add Component Line
          </Button>
        </div>

        <Table
          rowKey={(_, idx) => String(idx)}
          columns={columns as any}
          dataSource={items}
          pagination={false}
          size="small"
          bordered
        />
      </Form>
    </Modal>
  )
}
