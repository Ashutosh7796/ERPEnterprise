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
  Tabs,
  Card,
  Statistic,
  Tag,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  BuildOutlined,
  CalculatorOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { bomApi, BomHeadDTO, BomItemDTO, BomOperationDTO, BomCostWarningDTO } from '../api/bomApi'

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
  const [calculatingCost, setCalculatingCost] = useState(false)
  const [productList, setProductList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [supplierList, setSupplierList] = useState<any[]>([])
  const [items, setItems] = useState<BomItemDTO[]>([])
  const [operations, setOperations] = useState<BomOperationDTO[]>([])
  const [activeTab, setActiveTab] = useState('components')

  // Cost Rollup state
  const [materialCost, setMaterialCost] = useState<number>(0)
  const [laborCost, setLaborCost] = useState<number>(0)
  const [overheadCost, setOverheadCost] = useState<number>(0)
  const [totalCost, setTotalCost] = useState<number>(0)
  const [costingMethod, setCostingMethod] = useState<string>('ESTIMATED_MATERIAL_ONLY')
  const [costCompleteness, setCostCompleteness] = useState<'VALID_STANDARD_COST' | 'INCOMPLETE_COST_BASIS'>('VALID_STANDARD_COST')
  const [costWarnings, setCostWarnings] = useState<BomCostWarningDTO[]>([])

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

    // Load depots for component source warehouse
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      let depots: any[] = []
      if (Array.isArray(res)) depots = res
      else if (Array.isArray(res?.data)) depots = res.data
      setDepotList(depots)
    })

    // Load suppliers / subcontractors for outsourced operations
    http.get('/supplier/findBySelect_sup', { params: { type: '供应商' } }).then((res: any) => {
      let sups: any[] = []
      if (Array.isArray(res)) sups = res
      else if (Array.isArray(res?.data)) sups = res.data
      setSupplierList(sups)
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

      setMaterialCost(Number(editingRecord.materialCost || 0))
      setLaborCost(Number(editingRecord.laborCost || 0))
      setOverheadCost(Number(editingRecord.overheadCost || 0))
      setTotalCost(Number(editingRecord.totalCost || 0))
      setCostingMethod(editingRecord.costingMethod || 'ESTIMATED_MATERIAL_ONLY')
      setCostCompleteness(editingRecord.costCompleteness || 'VALID_STANDARD_COST')
      setCostWarnings(editingRecord.costWarnings || [])

      // Load detailed items and operations
      bomApi.getBomById(editingRecord.id).then((res: any) => {
        if (res && res.code === 200 && res.data) {
          setItems(res.data.items || [])
          setOperations(res.data.operations || [])
          if (res.data.materialCost !== undefined) setMaterialCost(Number(res.data.materialCost))
          if (res.data.laborCost !== undefined) setLaborCost(Number(res.data.laborCost))
          if (res.data.overheadCost !== undefined) setOverheadCost(Number(res.data.overheadCost))
          if (res.data.totalCost !== undefined) setTotalCost(Number(res.data.totalCost))
          if (res.data.costingMethod) setCostingMethod(res.data.costingMethod)
          if (res.data.costCompleteness) setCostCompleteness(res.data.costCompleteness)
          if (res.data.costWarnings) setCostWarnings(res.data.costWarnings)
        } else {
          setItems(editingRecord.items || [])
          setOperations(editingRecord.operations || [])
        }
      })
    } else {
      form.resetFields()
      setCostCompleteness('VALID_STANDARD_COST')
      setCostWarnings([])
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
          rate: 0,
          amount: 0,
          issueType: 'MANUAL_ISSUE',
          operationSequence: 10,
        },
      ])
      setOperations([
        {
          operationSequence: 10,
          operationName: 'Assembly & Setup',
          workstationName: 'Assembly Station 1',
          setupTimeMinutes: 15,
          runTimeMinutes: 30,
          description: 'Standard initial assembly and mechanical fitment',
        },
      ])
      setMaterialCost(0)
      setLaborCost(0)
      setOverheadCost(0)
      setTotalCost(0)
      setCostingMethod('ESTIMATED_MATERIAL_ONLY')
    }
  }, [open, editingRecord, form])

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        componentMaterialId: undefined as any,
        quantity: 1,
        scrapPercent: 0,
        rate: 0,
        amount: 0,
        issueType: 'MANUAL_ISSUE',
        operationSequence: (items.length + 1) * 10,
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
    const row = { ...updated[index], [field]: value }

    // Recompute line amount if quantity, scrapPercent, or rate changed
    if (field === 'quantity' || field === 'rate' || field === 'scrapPercent') {
      const qty = Number(field === 'quantity' ? value : row.quantity) || 0
      const rate = Number(field === 'rate' ? value : row.rate) || 0
      const scrap = Number(field === 'scrapPercent' ? value : row.scrapPercent) || 0
      row.amount = Number((qty * rate * (1 + scrap / 100)).toFixed(4))
    }

    updated[index] = row
    setItems(updated)
  }

  const handleAddOperation = () => {
    const nextSeq = operations.length > 0 ? Math.max(...operations.map((o) => o.operationSequence || 0)) + 10 : 10
    setOperations([
      ...operations,
      {
        operationSequence: nextSeq,
        operationName: '',
        workstationName: '',
        setupTimeMinutes: 0,
        setupTimeMins: 0,
        targetDepotId: undefined,
        runTimeMinutes: 0,
        description: '',
      },
    ])
  }

  const handleRemoveOperation = (index: number) => {
    const updated = [...operations]
    updated.splice(index, 1)
    setOperations(updated)
  }

  const handleOperationChange = (index: number, field: keyof BomOperationDTO, value: any) => {
    const updated = [...operations]
    updated[index] = { ...updated[index], [field]: value }
    setOperations(updated)
  }

  const handleCalculateCostRollup = async () => {
    if (!editingRecord || !editingRecord.id) {
      // Live calculation from current form items
      let totalMat = 0
      items.forEach((it) => {
        const qty = Number(it.quantity || 0)
        const rate = Number(it.rate || 0)
        const scrap = Number(it.scrapPercent || 0)
        totalMat += qty * rate * (1 + scrap / 100)
      })
      setMaterialCost(Number(totalMat.toFixed(4)))
      setLaborCost(0)
      setOverheadCost(0)
      setTotalCost(Number(totalMat.toFixed(4)))
      setCostingMethod('ESTIMATED_MATERIAL_ONLY')
      message.info('Estimated pure material rollup calculated from current lines.')
      return
    }

    setCalculatingCost(true)
    try {
      const res: any = await bomApi.calculateCost(editingRecord.id)
      if (res && (res.code === 200 || res.status === 200)) {
        const data = res.data
        if (data) {
          setMaterialCost(Number(data.materialCost || 0))
          setLaborCost(Number(data.laborCost || 0))
          setOverheadCost(Number(data.overheadCost || 0))
          setTotalCost(Number(data.totalCost || 0))
          setCostingMethod(data.costingMethod || 'ESTIMATED_MATERIAL_ONLY')
          setCostCompleteness(data.costCompleteness || 'VALID_STANDARD_COST')
          setCostWarnings(data.costWarnings || [])
          if (data.items) {
            setItems(data.items)
          }
        }
        if (data?.costCompleteness === 'INCOMPLETE_COST_BASIS') {
          message.warning('Pre-Production Standard Cost calculated with INCOMPLETE COST BASIS. See diagnostic warnings.')
        } else {
          message.success('Pre-Production Standard BOM Cost roll-up calculated and saved.')
        }
      } else {
        message.error(res?.data || res?.message || 'Failed to calculate BOM standard cost.')
      }
    } catch (e: any) {
      console.error('Calculate cost error:', e)
      message.error(e?.message || 'Error executing cost roll-up.')
    } finally {
      setCalculatingCost(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const validItems = items.filter((it) => it.componentMaterialId && Number(it.quantity || 0) > 0)

      if (validItems.length === 0) {
        message.warning('Please specify at least one valid component raw material with positive quantity.')
        setActiveTab('components')
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
        operations: operations
          .filter((o) => o.operationName && o.operationName.trim().length > 0)
          .map((o) => ({
            ...o,
            isOutsource: o.isOutsource === 1 || o.isOutsource === true ? 1 : 0,
            defaultSupplierId: o.isOutsource === 1 || o.isOutsource === true ? o.defaultSupplierId : undefined,
          })),
      }

      let res: any
      if (editingRecord && editingRecord.id) {
        payload.id = editingRecord.id
        res = await bomApi.updateBom(payload)
      } else {
        res = await bomApi.createBom(payload)
      }

      if (res && (res.code === 200 || res.status === 200)) {
        message.success(editingRecord ? 'Bill of Materials updated successfully.' : 'Bill of Materials created successfully.')
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || res?.message || 'Failed to save BOM.')
      }
    } catch (err: any) {
      console.error('Save BOM error:', err)
      const errMsg = err?.response?.data?.data || err?.message || 'Validation error'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const componentColumns = [
    {
      title: 'Sequence',
      dataIndex: 'operationSequence',
      key: 'operationSequence',
      width: 75,
      render: (_: any, record: BomItemDTO, index: number) => (
        <InputNumber
          min={1}
          max={999}
          value={record.operationSequence || (index + 1) * 10}
          onChange={(val) => handleItemChange(index, 'operationSequence', val || (index + 1) * 10)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Component Item / Raw Material',
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
      title: 'Quantity per Batch',
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
      title: 'Scrap Factor (%)',
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
      title: 'Valuation Rate (₹)',
      key: 'rate',
      width: 130,
      render: (_: any, record: BomItemDTO, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          precision={4}
          value={record.rate}
          placeholder="0.0000"
          onChange={(val) => handleItemChange(index, 'rate', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Amount (₹)',
      key: 'amount',
      width: 120,
      render: (_: any, record: BomItemDTO) => (
        <Text strong style={{ color: '#2f54eb' }}>
          ₹{Number(record.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </Text>
      ),
    },
    {
      title: 'Source Warehouse',
      key: 'sourceDepotId',
      width: 150,
      render: (_: any, record: BomItemDTO, index: number) => (
        <Select
          allowClear
          placeholder="Source Warehouse..."
          value={record.sourceDepotId}
          onChange={(val) => handleItemChange(index, 'sourceDepotId', val)}
          style={{ width: '100%' }}
          options={depotList.map((d) => ({
            value: d.id,
            label: d.name,
          }))}
        />
      ),
    },
    {
      title: 'Issue Method',
      key: 'issueType',
      width: 130,
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
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Popconfirm title="Remove component line?" onConfirm={() => handleRemoveItem(index)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  const operationColumns = [
    {
      title: 'Sequence',
      dataIndex: 'operationSequence',
      key: 'operationSequence',
      width: 80,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <InputNumber
          min={1}
          max={999}
          value={record.operationSequence || (index + 1) * 10}
          onChange={(val) => handleOperationChange(index, 'operationSequence', val || (index + 1) * 10)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Operation Name',
      key: 'operationName',
      width: 220,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <Input
          placeholder="e.g. CNC Milling, Sheet Cutting..."
          value={record.operationName}
          onChange={(e) => handleOperationChange(index, 'operationName', e.target.value)}
        />
      ),
    },
    {
      title: 'Work Center',
      key: 'workstationName',
      width: 200,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <Input
          placeholder="e.g. Workstation A-01..."
          value={record.workstationName}
          onChange={(e) => handleOperationChange(index, 'workstationName', e.target.value)}
        />
      ),
    },
    {
      title: 'Execution Mode',
      key: 'isOutsource',
      width: 140,
      render: (_: any, record: BomOperationDTO, index: number) => {
        const isOut = Boolean(record.isOutsource === 1 || record.isOutsource === true)
        return (
          <Switch
            checkedChildren="Subcontract"
            unCheckedChildren="In-House"
            checked={isOut}
            onChange={(checked) => {
              handleOperationChange(index, 'isOutsource', checked ? 1 : 0)
              if (!checked) {
                handleOperationChange(index, 'defaultSupplierId', undefined)
              }
            }}
          />
        )
      },
    },
    {
      title: 'Preferred Subcontractor',
      key: 'defaultSupplierId',
      width: 210,
      render: (_: any, record: BomOperationDTO, index: number) => {
        const isOut = Boolean(record.isOutsource === 1 || record.isOutsource === true)
        if (!isOut) {
          return <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>Internal Facility</Text>
        }
        return (
          <Select
            placeholder="Select subcontractor..."
            allowClear
            showSearch
            optionFilterProp="label"
            value={record.defaultSupplierId}
            onChange={(val) => handleOperationChange(index, 'defaultSupplierId', val)}
            style={{ width: '100%' }}
            options={supplierList.map((s) => ({
              value: s.id,
              label: s.supplier,
            }))}
          />
        )
      },
    },
    {
      title: 'Fixed Setup Time (mins)',
      key: 'setupTimeMinutes',
      width: 140,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <InputNumber
          min={0}
          precision={2}
          placeholder="0.00"
          value={record.setupTimeMinutes !== undefined ? record.setupTimeMinutes : record.setupTimeMins}
          onChange={(val) => {
            handleOperationChange(index, 'setupTimeMinutes', val || 0)
            handleOperationChange(index, 'setupTimeMins', val || 0)
          }}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Target Warehouse',
      key: 'targetDepotId',
      width: 170,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <Select
          allowClear
          placeholder="Default (WO Depot)"
          value={record.targetDepotId}
          onChange={(val) => handleOperationChange(index, 'targetDepotId', val)}
          style={{ width: '100%' }}
          options={depotList.map((d) => ({
            value: d.id,
            label: d.name,
          }))}
        />
      ),
    },
    {
      title: 'Cycle Run Time (Minutes)',
      key: 'runTimeMinutes',
      width: 150,
      render: (_: any, record: BomOperationDTO, index: number) => (
        <InputNumber
          min={0}
          value={record.runTimeMinutes}
          onChange={(val) => handleOperationChange(index, 'runTimeMinutes', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Operation Instructions',
      key: 'description',
      render: (_: any, record: BomOperationDTO, index: number) => (
        <Input
          placeholder="Process instructions..."
          value={record.description}
          onChange={(e) => handleOperationChange(index, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Popconfirm title="Remove operation step?" onConfirm={() => handleRemoveOperation(index)}>
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
          <span>{editingRecord ? `Edit Bill of Materials (BOM) — ${editingRecord.bomCode}` : 'Create Bill of Materials (BOM)'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={1180}
      destroyOnHidden
      okText={editingRecord ? 'Save BOM' : 'Create Bill of Materials'}
    >
      <Alert
        type="info"
        showIcon
        message="Bill of Materials (BOM) Engineering Controls"
        description="Every parent finished good maintains one default active BOM. Circular dependencies are verified recursively server-side on save. BOM revisions are immutable once referenced."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={9}>
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

          <Col span={6}>
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

          <Col span={5}>
            <Form.Item name="isDefault" label="Default Active BOM" valuePropName="checked">
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

        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}>
          <Tabs.TabPane
            tab={
              <span>
                <UnorderedListOutlined />
                Components & Materials ({items.length})
              </span>
            }
            key="components"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>
                Component Raw Materials & Sub-Assemblies
              </Text>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} size="small">
                Add Component Line
              </Button>
            </div>

            <Table
              rowKey={(_, idx) => String(idx)}
              columns={componentColumns as any}
              dataSource={items}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 900 }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <span>
                <ToolOutlined />
                Routing & Operations ({operations.length})
              </span>
            }
            key="operations"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>
                Manufacturing Process Sequence & Workstation Routing
              </Text>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddOperation} size="small">
                Add Operation Step
              </Button>
            </div>

            <Table
              rowKey={(_, idx) => String(idx)}
              columns={operationColumns as any}
              dataSource={operations}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 800 }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <span>
                <DollarCircleOutlined />
                BOM Cost Rollup Summary
              </span>
            }
            key="costing"
          >
            <Card
              size="small"
              title="Pre-Production Standard Cost Estimate (REQ-1.2.4)"
              extra={
                <Button
                  type="primary"
                  icon={<CalculatorOutlined />}
                  loading={calculatingCost}
                  onClick={handleCalculateCostRollup}
                >
                  Calculate Standard Cost Roll-Up
                </Button>
              }
              style={{ background: '#fafafa' }}
            >
              {costCompleteness === 'INCOMPLETE_COST_BASIS' && (
                <Alert
                  type="warning"
                  showIcon
                  message={<Text strong style={{ color: '#d46b08' }}>Incomplete Cost Basis — Missing Rate Diagnostic</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <div>One or more operational or component rates could not be authoritatively resolved. Labor and/or overhead rates have defaulted to ₹0.0000. This estimate must NOT be treated as a fully certified standard cost.</div>
                      {costWarnings && costWarnings.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {costWarnings.map((w, idx) => (
                            <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                              <Tag color="orange">{w.warningCode}</Tag>
                              {w.workCenterType && <Tag color="blue">Work Center: {w.workCenterType}</Tag>}
                              {w.operationSeq && <Tag>Op Seq: {w.operationSeq}</Tag>}
                              {w.operationName && <span><strong>{w.operationName}</strong>: </span>}
                              {w.componentName && <span>Component: <strong>{w.componentName}</strong>: </span>}
                              <span>{w.message}</span>
                              {w.affectedCostBuckets && w.affectedCostBuckets.length > 0 && (
                                <span style={{ marginLeft: 6 }}>
                                  (Affected Buckets: {w.affectedCostBuckets.join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              <Row gutter={16}>
                <Col span={6}>
                  <Card variant="borderless" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="Material Cost"
                      value={materialCost}
                      precision={4}
                      prefix="₹"
                      valueStyle={{ color: '#1890ff' }}
                    />
                    <Tag color="blue" style={{ marginTop: 8 }}>Component Standard Rollup</Tag>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card variant="borderless" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="Labour Cost"
                      value={laborCost}
                      precision={4}
                      prefix="₹"
                      valueStyle={{ color: laborCost > 0 ? '#13c2c2' : '#8c8c8c' }}
                    />
                    <Tag color={laborCost > 0 ? 'cyan' : (costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'warning' : 'default')} style={{ marginTop: 8 }}>
                      {laborCost > 0 ? 'Standard Direct Labor' : (costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'Rate Unavailable' : 'No In-House Labor')}
                    </Tag>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card variant="borderless" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="Overhead Cost"
                      value={overheadCost}
                      precision={4}
                      prefix="₹"
                      valueStyle={{ color: overheadCost > 0 ? '#722ed1' : '#8c8c8c' }}
                    />
                    <Tag color={overheadCost > 0 ? 'purple' : (costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'warning' : 'default')} style={{ marginTop: 8 }}>
                      {overheadCost > 0 ? 'Machine Overhead' : (costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'Rate Unavailable' : 'No Machine Overhead')}
                    </Tag>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card variant="borderless" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="Total Standard Cost"
                      value={totalCost}
                      precision={4}
                      prefix="₹"
                      valueStyle={{ color: costCompleteness === 'INCOMPLETE_COST_BASIS' ? '#fa8c16' : '#52c41a' }}
                    />
                    <Tag color={costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'warning' : 'green'} style={{ marginTop: 8 }}>
                      {costCompleteness === 'INCOMPLETE_COST_BASIS' ? 'Incomplete Cost Basis' : costingMethod}
                    </Tag>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Form>
    </Modal>
  )
}
