import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Alert,
  Card,
  Statistic,
  Descriptions,
  Divider,
  message,
} from 'antd'
import { CheckCircleOutlined, CalculatorOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@/core/api/client'
import { jobWorkApi, JobWorkOrder, JobWorkItem, JobWorkReceiptRequest } from '../api/jobWorkApi'

interface JobWorkReceiptModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: JobWorkOrder | null
}

export const JobWorkReceiptModal: React.FC<JobWorkReceiptModalProps> = ({
  open,
  onClose,
  onSuccess,
  order,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<JobWorkItem[]>([])
  const [selectedItem, setSelectedItem] = useState<JobWorkItem | null>(null)
  const [allMaterials, setAllMaterials] = useState<any[]>([])
  const [depots, setDepots] = useState<any[]>([])
  const [targetBins, setTargetBins] = useState<any[]>([])

  // Live Cost Absorption calculation state
  const [receivedQty, setReceivedQty] = useState<number>(0)
  const [consumedQty, setConsumedQty] = useState<number>(0)
  const [jobWorkCharges, setJobWorkCharges] = useState<number>(0)

  useEffect(() => {
    if (!open || !order) return

    // Load order items with pending balances
    jobWorkApi.getOrderDetail(order.id).then((res: any) => {
      const orderItems = res?.data?.items || []
      setItems(orderItems)
      if (orderItems.length > 0) {
        const first = orderItems[0]
        setSelectedItem(first)
        form.setFieldValue('consumedRawMaterialId', first.materialId)
        form.setFieldValue('consumedQty', first.pendingQty || 0)
        setConsumedQty(first.pendingQty || 0)
        form.setFieldValue('processedMaterialId', first.materialId)
        form.setFieldValue('receivedQty', first.pendingQty || 0)
        setReceivedQty(first.pendingQty || 0)
      }
    }).catch(() => {})

    // Load materials list
    http.get('/material/findBySelect', { params: { page: 1, rows: 500 } }).then((res: any) => {
      let mats: any[] = []
      if (Array.isArray(res)) mats = res
      else if (Array.isArray(res?.data?.rows)) mats = res.data.rows
      else if (Array.isArray(res?.rows)) mats = res.rows
      else if (Array.isArray(res?.data)) mats = res.data
      setAllMaterials(mats)
    }).catch(() => {})

    // Load depots
    http.get('/depot/findDepotBySelect').then((res: any) => {
      const data = res?.data || res || []
      setDepots(Array.isArray(data) ? data : [])
    }).catch(() => {})

    // Load bins for default depot
    if (order.depotId) {
      http.get('/depotBin/list', { params: { depotId: order.depotId } }).then((res: any) => {
        const rawBins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setTargetBins(rawBins)
        if (rawBins.length > 0) {
          form.setFieldValue('targetBinId', rawBins[0].id)
        }
      }).catch(() => setTargetBins([]))
    }

    form.resetFields()
    form.setFieldsValue({
      receiptDate: dayjs(),
      targetDepotId: order.depotId,
      jobWorkCharges: 0,
      scrappedQty: 0,
      shortageQty: 0,
      sacCode: '9988',
    })
    setJobWorkCharges(0)
  }, [open, order, form])

  const handleRawMaterialChange = (matId: number) => {
    const itm = items.find((i) => i.materialId === matId)
    setSelectedItem(itm || null)
    if (itm) {
      form.setFieldValue('consumedQty', itm.pendingQty || 0)
      setConsumedQty(itm.pendingQty || 0)
      form.setFieldValue('receivedQty', itm.pendingQty || 0)
      setReceivedQty(itm.pendingQty || 0)
    }
  }

  const handleDepotChange = async (depotId: number) => {
    try {
      const res: any = await http.get('/depotBin/list', { params: { depotId } })
      const rawBins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setTargetBins(rawBins)
      if (rawBins.length > 0) {
        form.setFieldValue('targetBinId', rawBins[0].id)
      }
    } catch {
      setTargetBins([])
    }
  }

  const unitRate = selectedItem?.unitCost || 0
  const consumedMaterialCost = consumedQty * unitRate
  const totalBatchCost = consumedMaterialCost + jobWorkCharges
  const absorbedUnitCost = receivedQty > 0 ? totalBatchCost / receivedQty : 0

  const handleReceive = async () => {
    if (!order) return
    try {
      const values = await form.validateFields()
      const pending = selectedItem?.pendingQty || 0
      const totalRaw = (values.consumedQty || 0) + (values.scrappedQty || 0) + (values.shortageQty || 0)

      if (totalRaw > pending) {
        message.error(`Accounted raw material (${totalRaw}) exceeds pending balance (${pending}) at Job Worker`)
        return
      }

      setLoading(true)
      const payload: JobWorkReceiptRequest = {
        jobWorkOrderId: order.id,
        receiptNumber: values.receiptNumber,
        receiptDate: values.receiptDate ? values.receiptDate.format('YYYY-MM-DD') : undefined,
        supplierChallanNumber: values.supplierChallanNumber,
        processedMaterialId: values.processedMaterialId,
        receivedQty: values.receivedQty,
        consumedRawMaterialId: values.consumedRawMaterialId,
        consumedQty: values.consumedQty,
        scrappedQty: values.scrappedQty || 0,
        shortageQty: values.shortageQty || 0,
        targetDepotId: values.targetDepotId,
        targetBinId: values.targetBinId,
        jobWorkCharges: values.jobWorkCharges || 0,
        sacCode: values.sacCode || '9988',
        remark: values.remark,
      }

      const res: any = await jobWorkApi.receiveProcessedGoods(payload)
      if (res?.code === 200) {
        message.success(`Goods received back! Inward voucher #${res.data?.receiptNumber || 'OK'}`)
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || 'Failed to receive goods')
      }
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e.message || 'Validation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  return (
    <Modal
      title="Inward Goods Return & Cost Absorption (Section 143 Reconciliation)"
      open={open}
      onCancel={onClose}
      onOk={handleReceive}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Alert
        message="Inventory Inward & Valuation Reconciliation"
        description="Records processed goods returning from the subcontractor, releases outside custody, reconciles scrap/process loss, and absorbs subcontracting processing charges (SAC 9988) into the unit cost of the returned goods."
        type="info"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Order Number">{order.orderNumber}</Descriptions.Item>
        <Descriptions.Item label="Job Worker">{order.supplierName}</Descriptions.Item>
        <Descriptions.Item label="Pending Units with JW">
          <span style={{ fontWeight: 600, color: '#cf1322' }}>{selectedItem?.pendingQty || 0} Units</span>
        </Descriptions.Item>
        <Descriptions.Item label="Unit Cost at Dispatch">
          ₹{(selectedItem?.unitCost || 0).toFixed(2)}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="consumedRawMaterialId"
              label="Raw Material Consumed by Subcontractor"
              rules={[{ required: true, message: 'Select consumed material' }]}
            >
              <Select
                onChange={handleRawMaterialChange}
                options={items.map((it) => ({
                  value: it.materialId,
                  label: `${it.materialName || 'Material #' + it.materialId} (Pending: ${it.pendingQty})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="processedMaterialId"
              label="Processed / Finished Goods Received"
              rules={[{ required: true, message: 'Select received material' }]}
            >
              <Select
                showSearch
                placeholder="Select processed product"
                optionFilterProp="label"
                options={allMaterials.map((m) => ({
                  value: m.id,
                  label: `${m.name} ${m.standard ? `(${m.standard})` : ''}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="receivedQty"
              label="Processed Qty Received"
              rules={[{ required: true, message: 'Enter received qty' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.0001}
                onChange={(val) => setReceivedQty(val || 0)}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="consumedQty"
              label="Raw Material Consumed"
              rules={[{ required: true, message: 'Enter consumed qty' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.0001}
                onChange={(val) => setConsumedQty(val || 0)}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="scrappedQty" label="Scrap Returned">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="shortageQty" label="Process Shortage / Loss">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="jobWorkCharges"
              label="Job Work Processing Charge (₹)"
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={10}
                onChange={(val) => setJobWorkCharges(val || 0)}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="sacCode" label="SAC Code">
              <Input placeholder="9988 (Manufacturing services)" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="supplierChallanNumber" label="Job Worker Delivery Note / Return Reference">
              <Input placeholder="Supplier delivery challan number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="receiptDate" label="Receipt Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="targetDepotId"
              label="Target Storage Warehouse"
              rules={[{ required: true }]}
            >
              <Select
                onChange={handleDepotChange}
                options={depots.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="targetBinId" label="Target Storage Bin">
              <Select
                options={targetBins.map((b) => ({
                  value: b.id,
                  label: `${b.binName || b.binCode} (${b.binType})`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }}>Manufacturing Cost Absorption Preview</Divider>

        <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Raw Material Valuation Consumed"
                value={consumedMaterialCost}
                precision={2}
                prefix="₹"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Job Work Processing Charges"
                value={jobWorkCharges}
                precision={2}
                prefix="₹"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Absorbed Unit Cost"
                value={absorbedUnitCost}
                precision={4}
                prefix="₹"
                valueStyle={{ color: '#cf1322', fontWeight: 600 }}
              />
            </Col>
          </Row>
        </Card>

        <Form.Item name="remark" label="Receipt Notes">
          <Input.TextArea rows={2} placeholder="Quality remarks, batch notes, scrap disposition, etc." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
