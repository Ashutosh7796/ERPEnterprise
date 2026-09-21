import React, { useEffect, useState, useCallback } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Alert,
  message,
  Tag,
  Descriptions,
  Divider,
} from 'antd'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { workOrderApi, WorkOrderDTO, ProductionReceiptRequest } from '../api/workOrderApi'

interface ProductionReceiptModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: WorkOrderDTO | null
}

export const ProductionReceiptModal: React.FC<ProductionReceiptModalProps> = ({
  open,
  onClose,
  onSuccess,
  order,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [depotList, setDepotList] = useState<any[]>([])
  const [targetBins, setTargetBins] = useState<any[]>([])

  const loadDepots = useCallback(async () => {
    try {
      const res: any = await http.get('/depot/findDepotByParams')
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setDepotList(raw)
    } catch (e) {
      console.error('Failed to load depots', e)
    }
  }, [])

  const loadBinsForDepot = useCallback(async (depotId: number) => {
    try {
      const res: any = await http.get('/depotBin/list', { params: { depotId } })
      const bins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      // Finished goods storage bins (STORAGE or default)
      const storageBins = bins.filter((b: any) => b.binType !== 'WIP')
      setTargetBins(storageBins.length > 0 ? storageBins : bins)
      if (storageBins.length > 0) {
        form.setFieldValue('targetBinId', storageBins[0].id)
      }
    } catch (e) {
      console.error('Failed to load bins for depot', depotId, e)
    }
  }, [form])

  const planned = Number(order?.plannedQty || 0)
  const completed = Number(order?.completedQty || 0)
  const scrapped = Number(order?.scrappedQty || 0)
  const remaining = Math.max(0, planned - completed - scrapped)

  useEffect(() => {
    if (!open || !order?.id) return
    loadDepots()
    const defaultDepotId = order.depotId || 0
    loadBinsForDepot(defaultDepotId)

    form.setFieldsValue({
      receiptNumber: `REC-${order.orderNumber}-${Date.now().toString().slice(-4)}`,
      receiptDate: dayjs(),
      receivedQty: remaining, // default to remaining
      scrappedQty: 0,
      targetDepotId: defaultDepotId,
      remark: '',
    })
  }, [open, order, form, remaining, loadDepots, loadBinsForDepot])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!order?.id) return

      const received = Number(values.receivedQty || 0)
      const scrap = Number(values.scrappedQty || 0)

      if (received <= 0 && scrap <= 0) {
        message.error('Received quantity or scrapped quantity must be greater than zero')
        return
      }

      if (received + scrap > remaining) {
        message.error(`Total batch output (${received + scrap}) exceeds remaining planned quantity (${remaining})`)
        return
      }

      setSubmitting(true)
      const payload: ProductionReceiptRequest = {
        workOrderId: order.id,
        receiptNumber: values.receiptNumber,
        receiptDate: values.receiptDate.format('YYYY-MM-DD'),
        receivedQty: received,
        scrappedQty: scrap,
        targetDepotId: values.targetDepotId,
        targetBinId: values.targetBinId,
        remark: values.remark,
      }

      const res: any = await workOrderApi.receiveProduction(payload)
      const receiptData: any = res?.data || res
      const unitCost = receiptData?.unitCost != null ? Number(receiptData.unitCost).toFixed(4) : '-'
      message.success(`Production receipt recorded! Absorbed Actual Unit Cost: $${unitCost}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Production receipt failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <span>Receive Finished Goods & Absorb Cost</span>
          <Tag color="green">{order?.orderNumber}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={700}
      okText="Confirm Production Receipt"
    >
      {order && (
        <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Finished Good">{order.materialName} ({order.materialModel || '-'})</Descriptions.Item>
          <Descriptions.Item label="Planned Quantity">{order.plannedQty}</Descriptions.Item>
          <Descriptions.Item label="Completed Qty">
            <Tag color="blue">{order.completedQty}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Remaining to Produce">
            <Tag color={remaining > 0 ? 'orange' : 'green'}>{remaining}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Current Actual Unit Cost">
            <Tag color="gold">${Number(order.actualUnitCost || 0).toFixed(4)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Shop-Floor WIP Bin">
            <Tag color="cyan">{order.wipBinName || `Bin #${order.wipBinId}`}</Tag>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Alert
        message="WIP Consumption & Cost Absorption Flow"
        description="Receiving Finished Goods automatically consumes raw material components from the WIP bin based on the frozen snapshot formula. The total consumed material value is absorbed directly into the finished goods inventory valuation."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Space size="large" style={{ width: '100%', display: 'flex' }}>
          <Form.Item label="Receipt Voucher #" name="receiptNumber" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Receipt Date" name="receiptDate" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Space size="large" style={{ width: '100%', display: 'flex' }}>
          <Form.Item label="Good Quantity Received" name="receivedQty" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={0} max={remaining} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Scrapped Quantity" name="scrappedQty" style={{ flex: 1 }}>
            <InputNumber min={0} max={remaining} style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Divider style={{ margin: '12px 0', fontSize: 13 }}>Destination Storage</Divider>

        <Space size="large" style={{ width: '100%', display: 'flex' }}>
          <Form.Item label="Target FG Depot" name="targetDepotId" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select
              options={depotList.map(d => ({ label: d.name, value: d.id }))}
              onChange={val => {
                form.setFieldValue('targetBinId', undefined)
                loadBinsForDepot(Number(val))
              }}
            />
          </Form.Item>
          <Form.Item label="Target Storage Bin" name="targetBinId" style={{ flex: 1 }}>
            <Select
              allowClear
              placeholder="Select Storage Bin"
              options={targetBins.map(b => ({ label: `${b.binCode} (${b.binName})`, value: b.id }))}
            />
          </Form.Item>
        </Space>

        <Form.Item label="Remark" name="remark">
          <Input.TextArea rows={2} placeholder="Optional production notes" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
