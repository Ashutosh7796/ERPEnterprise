import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  InputNumber,
  Row,
  Col,
  Alert,
  message,
} from 'antd'
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@/core/api/client'
import { jobWorkApi, JobWorkOrderRequest } from '../api/jobWorkApi'

interface JobWorkOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ItemRow {
  key: string
  materialId?: number
  dispatchedQty?: number
  remark?: string
}

export const JobWorkOrderModal: React.FC<JobWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [depots, setDepots] = useState<any[]>([])
  const [bins, setBins] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [goodsType, setGoodsType] = useState<'INPUT' | 'SEMI_FINISHED' | 'CAPITAL_GOODS'>('INPUT')
  const [orderDate, setOrderDate] = useState<dayjs.Dayjs>(dayjs())

  useEffect(() => {
    if (!open) return

    // Load Job Workers / Suppliers
    http.get('/supplier/findBySelect_sup', { params: { type: '供应商' } }).then((res: any) => {
      const data = res?.data || res || []
      setSuppliers(Array.isArray(data) ? data : [])
    }).catch(() => {})

    // Load Depots
    http.get('/depot/findDepotBySelect').then((res: any) => {
      const data = res?.data || res || []
      setDepots(Array.isArray(data) ? data : [])
    }).catch(() => {})

    // Load Materials
    http.get('/material/findBySelect', { params: { page: 1, rows: 500 } }).then((res: any) => {
      let mats: any[] = []
      if (Array.isArray(res)) mats = res
      else if (Array.isArray(res?.data?.rows)) mats = res.data.rows
      else if (Array.isArray(res?.rows)) mats = res.rows
      else if (Array.isArray(res?.data)) mats = res.data
      setMaterials(mats)
    }).catch(() => {})

    // Load Work Orders for optional linkage
    http.get('/workOrder/list', { params: { pageSize: 100 } }).then((res: any) => {
      const rows = res?.data?.rows || []
      setWorkOrders(rows)
    }).catch(() => {})

    form.resetFields()
    form.setFieldsValue({
      goodsType: 'INPUT',
      orderDate: dayjs(),
      expectedReturnDate: dayjs().add(1, 'year'),
    })
    setGoodsType('INPUT')
    setOrderDate(dayjs())
    setItems([{ key: '1', materialId: undefined, dispatchedQty: 1, remark: '' }])
  }, [open, form])

  const handleDepotChange = async (depotId: number) => {
    try {
      const res: any = await http.get('/depotBin/list', { params: { depotId } })
      const rawBins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setBins(rawBins)
      if (rawBins.length > 0) {
        form.setFieldValue('jwBinId', rawBins[0].id)
      }
    } catch {
      setBins([])
    }
  }

  const handleGoodsTypeChange = (val: 'INPUT' | 'SEMI_FINISHED' | 'CAPITAL_GOODS') => {
    setGoodsType(val)
    const years = val === 'CAPITAL_GOODS' ? 3 : 1
    form.setFieldValue('expectedReturnDate', orderDate.add(years, 'year'))
  }

  const handleOrderDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setOrderDate(date)
      const years = goodsType === 'CAPITAL_GOODS' ? 3 : 1
      form.setFieldValue('expectedReturnDate', date.add(years, 'year'))
    }
  }

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { key: Date.now().toString(), materialId: undefined, dispatchedQty: 1, remark: '' },
    ])
  }

  const removeItemRow = (key: string) => {
    if (items.length <= 1) {
      message.warning('At least one item line is required')
      return
    }
    setItems((prev) => prev.filter((it) => it.key !== key))
  }

  const updateItemRow = (key: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, [field]: value } : it))
    )
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      for (const it of items) {
        if (!it.materialId) {
          message.error('Please select material for all lines')
          return
        }
        if (!it.dispatchedQty || it.dispatchedQty <= 0) {
          message.error('Dispatched quantity must be greater than zero')
          return
        }
      }

      setLoading(true)
      const payload: JobWorkOrderRequest = {
        orderNumber: values.orderNumber,
        supplierId: values.supplierId,
        workOrderId: values.workOrderId,
        goodsType: values.goodsType,
        orderDate: values.orderDate ? values.orderDate.format('YYYY-MM-DD') : undefined,
        expectedReturnDate: values.expectedReturnDate
          ? values.expectedReturnDate.format('YYYY-MM-DD')
          : undefined,
        depotId: values.depotId,
        jwBinId: values.jwBinId,
        remark: values.remark,
        items: items.map((it) => ({
          materialId: it.materialId!,
          dispatchedQty: it.dispatchedQty!,
          remark: it.remark,
        })),
      }

      const res: any = await jobWorkApi.createOrder(payload)
      if (res?.code === 200) {
        message.success('Job Work Order created successfully')
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || 'Failed to create Job Work Order')
      }
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e.message || 'Validation failed')
    } finally {
      setLoading(false)
    }
  }

  const statutoryDeadlinePreview = orderDate
    ? orderDate.add(goodsType === 'CAPITAL_GOODS' ? 3 : 1, 'year').format('DD/MM/YYYY')
    : '-'

  const itemColumns = [
    {
      title: 'Material / Component',
      dataIndex: 'materialId',
      key: 'materialId',
      render: (_: any, record: ItemRow) => (
        <Select
          style={{ width: '100%' }}
          showSearch
          placeholder="Select raw material / component"
          optionFilterProp="label"
          value={record.materialId}
          onChange={(val) => updateItemRow(record.key, 'materialId', val)}
          options={materials.map((m) => ({
            value: m.id,
            label: `${m.name} ${m.standard ? `(${m.standard})` : ''} ${m.unit ? `[${m.unit}]` : ''}`,
          }))}
        />
      ),
    },
    {
      title: 'Dispatch Quantity',
      dataIndex: 'dispatchedQty',
      key: 'dispatchedQty',
      width: 160,
      render: (_: any, record: ItemRow) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0.0001}
          step={1}
          value={record.dispatchedQty}
          onChange={(val) => updateItemRow(record.key, 'dispatchedQty', val || 1)}
        />
      ),
    },
    {
      title: 'Remark / Specification',
      dataIndex: 'remark',
      key: 'remark',
      render: (_: any, record: ItemRow) => (
        <Input
          placeholder="e.g., Grinding spec #G42"
          value={record.remark}
          onChange={(e) => updateItemRow(record.key, 'remark', e.target.value)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: ItemRow) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItemRow(record.key)}
        />
      ),
    },
  ]

  return (
    <Modal
      title="Create Indian Job Work Order (CGST Section 143)"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={850}
      destroyOnClose
    >
      <Alert
        message="Statutory Section 143 Compliance"
        description={
          <div>
            Goods sent to a Job Worker must be returned within <b>1 year</b> (for Inputs) or{' '}
            <b>3 years</b> (for Capital Goods). Expected statutory return due date for this order:{' '}
            <b style={{ color: '#1677ff' }}>{statutoryDeadlinePreview}</b>. Failure to return within
            this period deems the goods supplied retrospectively under Section 143(3).
          </div>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="supplierId"
              label="Job Worker (Vendor)"
              rules={[{ required: true, message: 'Select Job Worker' }]}
            >
              <Select
                showSearch
                placeholder="Select subcontractor"
                optionFilterProp="label"
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.supplier || s.name} ${s.taxNum ? `[GSTIN: ${s.taxNum}]` : ''}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="goodsType" label="Goods Classification" rules={[{ required: true }]}>
              <Select
                onChange={handleGoodsTypeChange}
                options={[
                  { value: 'INPUT', label: 'Inputs & Raw Materials (1-Year Statutory Limit)' },
                  { value: 'SEMI_FINISHED', label: 'Semi-Finished Goods (1-Year Statutory Limit)' },
                  { value: 'CAPITAL_GOODS', label: 'Capital Goods / Dies / Moulds (3-Year Limit)' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="workOrderId" label="Originating Work Order (Optional)">
              <Select
                showSearch
                allowClear
                placeholder="Link to Work Order"
                optionFilterProp="label"
                options={workOrders.map((w) => ({
                  value: w.id,
                  label: `${w.orderNumber} - ${w.materialName || 'Material #' + w.materialId}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="orderDate" label="Order / Dispatch Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} onChange={handleOrderDateChange} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="expectedReturnDate"
              label="Expected Return Date"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="orderNumber" label="Order Number (Auto if blank)">
              <Input placeholder="Auto-generated e.g. JWO-2026-0001" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="depotId"
              label="Source Plant Depot"
              rules={[{ required: true, message: 'Select depot' }]}
            >
              <Select
                placeholder="Select dispatch warehouse"
                onChange={handleDepotChange}
                options={depots.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="jwBinId" label="Job Worker Outside-Premises Staging Bin">
              <Select
                placeholder="Select or auto-assign JW Bin"
                allowClear
                options={bins.map((b) => ({
                  value: b.id,
                  label: `${b.binName || b.binCode} (${b.binType})`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remark" label="Notes / Instructions">
          <Input.TextArea rows={2} placeholder="Process specifications, transport notes, etc." />
        </Form.Item>

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Materials to Dispatch for Subcontracting:</span>
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItemRow}>
            Add Component Line
          </Button>
        </div>

        <Table
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          size="small"
          bordered
        />
      </Form>
    </Modal>
  )
}
