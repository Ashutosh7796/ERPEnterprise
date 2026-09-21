import React, { useEffect, useState, useCallback } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Space,
  Alert,
  message,
  Tag,
} from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { workOrderApi, WorkOrderDTO } from '../api/workOrderApi'
import { bomApi, BomHeadDTO } from '../api/bomApi'

interface WorkOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editingRecord?: WorkOrderDTO | null
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingRecord,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [productList, setProductList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [wipBinList, setWipBinList] = useState<any[]>([])
  const [selectedBom, setSelectedBom] = useState<BomHeadDTO | null>(null)

  const loadWipBins = useCallback(async (depotId: number) => {
    try {
      const res: any = await http.get('/depotBin/list', { params: { depotId } })
      const rawBins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      // Filter strictly for WIP bins for UX, server will also validate
      const filteredWip = rawBins.filter((b: any) => b.binType === 'WIP')
      setWipBinList(filteredWip)
      if (filteredWip.length > 0 && !form.getFieldValue('wipBinId')) {
        form.setFieldValue('wipBinId', filteredWip[0].id)
      }
    } catch (e) {
      console.error('Failed to load WIP bins:', e)
      setWipBinList([])
    }
  }, [form])

  useEffect(() => {
    if (!open) return

    // Load products
    http.get('/material/findBySelect', { params: { page: 1, rows: 500 } }).then((res: any) => {
      let mats: any[] = []
      if (Array.isArray(res)) mats = res
      else if (Array.isArray(res?.data?.rows)) mats = res.data.rows
      else if (Array.isArray(res?.rows)) mats = res.rows
      else if (Array.isArray(res?.data)) mats = res.data
      setProductList(mats)
    })

    // Load depots
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      let depots: any[] = []
      if (Array.isArray(res)) depots = res
      else if (Array.isArray(res?.data)) depots = res.data
      setDepotList(depots)
    })

    if (editingRecord && editingRecord.id) {
      form.setFieldsValue({
        materialId: editingRecord.materialId,
        bomId: editingRecord.bomId,
        orderNumber: editingRecord.orderNumber,
        plannedQty: editingRecord.plannedQty,
        depotId: editingRecord.depotId,
        wipBinId: editingRecord.wipBinId,
        startDate: editingRecord.startDate ? dayjs(editingRecord.startDate) : dayjs(),
        dueDate: editingRecord.dueDate ? dayjs(editingRecord.dueDate) : dayjs().add(7, 'day'),
        remark: editingRecord.remark,
      })
      if (editingRecord.depotId) {
        loadWipBins(editingRecord.depotId)
      }
      if (editingRecord.bomId) {
        bomApi.getBomById(editingRecord.bomId).then((res: any) => {
          if (res && res.code === 200 && res.data) {
            setSelectedBom(res.data)
          }
        })
      }
    } else {
      form.resetFields()
      form.setFieldsValue({
        orderNumber: `WO${dayjs().format('YYYYMMDDHHmmss')}`,
        plannedQty: 10,
        startDate: dayjs(),
        dueDate: dayjs().add(7, 'day'),
      })
      setSelectedBom(null)
      setWipBinList([])
    }
  }, [open, editingRecord, form, loadWipBins])

  const handleMaterialChange = async (matId: number) => {
    try {
      const res: any = await bomApi.getDefaultByMaterial(matId)
      if (res && res.code === 200 && res.data) {
        setSelectedBom(res.data)
        form.setFieldValue('bomId', res.data.id)
      } else {
        setSelectedBom(null)
        form.setFieldValue('bomId', undefined)
        message.warning('No active default Master BOM found for this product. Please define an active BOM first.')
      }
    } catch (err) {
      console.error('Failed to fetch default BOM:', err)
      setSelectedBom(null)
      form.setFieldValue('bomId', undefined)
    }
  }

  const handleDepotChange = (depotId: number) => {
    form.setFieldValue('wipBinId', undefined)
    if (depotId) {
      loadWipBins(depotId)
    } else {
      setWipBinList([])
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload: any = {
        materialId: values.materialId,
        bomId: values.bomId,
        orderNumber: values.orderNumber,
        plannedQty: values.plannedQty,
        depotId: values.depotId,
        wipBinId: values.wipBinId,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        remark: values.remark,
      }

      let res: any
      if (editingRecord && editingRecord.id) {
        payload.id = editingRecord.id
        res = await workOrderApi.updateWorkOrder(payload)
      } else {
        res = await workOrderApi.createWorkOrder(payload)
      }

      if (res && (res.code === 200 || res.status === 200)) {
        message.success(editingRecord ? 'Work Order updated!' : 'Work Order created in DRAFT status!')
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || res?.message || 'Failed to save Work Order')
      }
    } catch (err: any) {
      console.error('Save Work Order error:', err)
      const errMsg = err?.response?.data?.data || err?.message || 'Validation error'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined style={{ color: '#1890ff', fontSize: 18 }} />
          <span>{editingRecord ? `Edit Work Order — ${editingRecord.orderNumber}` : 'Create Production Work Order'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={780}
      destroyOnHidden
      okText={editingRecord ? 'Save Changes' : 'Create Work Order (DRAFT)'}
    >
      <Alert
        type="info"
        showIcon
        message="Discrete Production Work Order Contract"
        description="Orders are initialized in DRAFT. Upon confirmation, the active Master BOM component requirements are frozen immutably into the order snapshot."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="materialId"
              label="Finished Good to Produce"
              rules={[{ required: true, message: 'Please select finished good' }]}
            >
              <Select
                showSearch
                placeholder="Select finished good..."
                optionFilterProp="label"
                disabled={!!editingRecord}
                onChange={handleMaterialChange}
                options={productList.map((p) => ({
                  value: p.id || p.meId,
                  label: `${p.name} ${p.standard || ''} ${p.model || ''} (${p.mBarCode || p.barCode || 'No Barcode'})`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item
              name="orderNumber"
              label="Work Order Number"
              rules={[{ required: true, message: 'Order number is required' }]}
            >
              <Input placeholder="WO..." disabled={!!editingRecord} />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              name="bomId"
              label={
                <Space>
                  <span>Active Recipe / Master BOM</span>
                  {selectedBom && (
                    <Tag color="green">
                      {selectedBom.bomCode} (v{selectedBom.revisionCode}) — Batch Yield: {selectedBom.outputQuantity} units
                    </Tag>
                  )}
                </Space>
              }
              rules={[{ required: true, message: 'Active Master BOM is required' }]}
            >
              <Select
                placeholder="Select Master BOM recipe..."
                disabled={!selectedBom}
                options={
                  selectedBom
                    ? [
                        {
                          value: selectedBom.id,
                          label: `${selectedBom.bomCode} (v${selectedBom.revisionCode}) - Output: ${selectedBom.outputQuantity}`,
                        },
                      ]
                    : []
                }
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="plannedQty"
              label="Planned Production Qty"
              rules={[{ required: true, message: 'Planned quantity is required' }]}
            >
              <InputNumber min={0.0001} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="startDate"
              label="Production Start Date"
              rules={[{ required: true, message: 'Start date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="dueDate"
              label="Production Due Date"
              rules={[{ required: true, message: 'Due date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="depotId"
              label="Manufacturing Facility (Depot)"
              rules={[{ required: true, message: 'Please select manufacturing plant' }]}
            >
              <Select
                placeholder="Select plant depot..."
                onChange={handleDepotChange}
                options={depotList.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="wipBinId"
              label={
                <Space>
                  <span>Shop-Floor WIP Storage Bin</span>
                  <Tag color="purple">binType=WIP</Tag>
                </Space>
              }
              rules={[{ required: true, message: 'WIP storage bin is required' }]}
            >
              <Select
                placeholder={wipBinList.length === 0 ? 'No WIP bins in selected depot' : 'Select WIP storage bin...'}
                options={wipBinList.map((b) => ({
                  value: b.id,
                  label: `${b.binName} (${b.binCode}) [WIP]`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item name="remark" label="Remarks / Production Notes">
              <Input.TextArea rows={2} placeholder="Batch requirements, routing notes, customer delivery timeline..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
