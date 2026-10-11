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
  Button,
  Table,
  message,
  Card,
  Popconfirm,
  Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined, AppstoreOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { productionPlanApi, ProductionPlanDTO, PlanItemRequest } from '../api/productionPlanApi'

interface ProductionPlanModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editingRecord?: ProductionPlanDTO | null
}

export const ProductionPlanModal: React.FC<ProductionPlanModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingRecord,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [productList, setProductList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [items, setItems] = useState<PlanItemRequest[]>([])

  const loadDependencies = useCallback(async () => {
    try {
      const [matRes, depotRes, soRes]: any = await Promise.all([
        http.get('/material/getMaterialEnableList'),
        http.get('/depot/findDepotByCurrentUser'),
        http.get('/depotHead/list', { params: { type: '出库', subType: 'SalesOrder', status: '1', pageSize: 50 } }),
      ])

      const mats = Array.isArray(matRes?.data) ? matRes.data : (Array.isArray(matRes) ? matRes : [])
      setProductList(mats)

      const depots = Array.isArray(depotRes?.data) ? depotRes.data : (Array.isArray(depotRes) ? depotRes : [])
      setDepotList(depots)

      const soRows = soRes?.data?.rows || soRes?.rows || (Array.isArray(soRes?.data) ? soRes.data : [])
      setSalesOrders(soRows)
    } catch (e) {
      console.error('Failed to load dependencies:', e)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    loadDependencies()

    if (editingRecord) {
      form.setFieldsValue({
        planTitle: editingRecord.planTitle,
        demandSource: editingRecord.demandSource,
        postingDate: editingRecord.postingDate ? dayjs(editingRecord.postingDate) : dayjs(),
        plannedStartDate: editingRecord.plannedStartDate ? dayjs(editingRecord.plannedStartDate) : dayjs(),
        plannedEndDate: editingRecord.plannedEndDate ? dayjs(editingRecord.plannedEndDate) : dayjs().add(14, 'day'),
        remark: editingRecord.remark,
      })
      if (editingRecord.items) {
        setItems(
          editingRecord.items.map((it) => ({
            materialId: it.materialId,
            bomId: it.bomId,
            salesOrderId: it.salesOrderId,
            salesOrderItemId: it.salesOrderItemId,
            demandSourceType: it.demandSourceType,
            plannedQty: it.netPlannedQty,
            targetDepotId: it.targetDepotId,
            targetBinId: it.targetBinId,
          }))
        )
      }
    } else {
      form.resetFields()
      form.setFieldsValue({
        demandSource: 'SALES_ORDER',
        postingDate: dayjs(),
        plannedStartDate: dayjs(),
        plannedEndDate: dayjs().add(14, 'day'),
      })
      setItems([])
    }
  }, [open, editingRecord, form, loadDependencies])

  const handleAddItem = () => {
    const defaultDepot = depotList.length > 0 ? depotList[0].id : 1
    const defaultMat = productList.length > 0 ? productList[0].id : undefined
    setItems((prev) => [
      ...prev,
      {
        materialId: defaultMat,
        plannedQty: 10,
        targetDepotId: defaultDepot,
        demandSourceType: form.getFieldValue('demandSource') || 'MANUAL',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleItemChange = (index: number, field: keyof PlanItemRequest, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSalesOrderSelect = async (soId: number) => {
    try {
      const res: any = await http.get(`/depotItem/getDetailList`, { params: { headerId: soId } })
      const lines = res?.data?.rows || res?.rows || (Array.isArray(res?.data) ? res.data : [])
      const newItems: PlanItemRequest[] = lines.map((line: any) => ({
        materialId: line.materialId,
        salesOrderId: soId,
        salesOrderItemId: line.id,
        demandSourceType: 'SALES_ORDER',
        plannedQty: line.operNumber || line.basicNumber || 1,
        targetDepotId: line.depotId || (depotList[0]?.id || 1),
      }))
      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems])
        message.success(`Added ${newItems.length} items from Sales Order.`)
      }
    } catch (e) {
      console.error('Failed to load SO items:', e)
      message.error('Failed to import items from Sales Order.')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (items.length === 0) {
        message.error('Please add at least one planned demand item.')
        return
      }

      setLoading(true)
      const payload = {
        planTitle: values.planTitle,
        demandSource: values.demandSource,
        postingDate: values.postingDate ? values.postingDate.format('YYYY-MM-DD') : undefined,
        plannedStartDate: values.plannedStartDate ? values.plannedStartDate.format('YYYY-MM-DD') : undefined,
        plannedEndDate: values.plannedEndDate ? values.plannedEndDate.format('YYYY-MM-DD') : undefined,
        remark: values.remark,
        items,
      }

      if (editingRecord?.id) {
        await productionPlanApi.updatePlan({ id: editingRecord.id, ...payload })
        message.success('Production Plan updated successfully.')
      } else {
        await productionPlanApi.createPlan(payload)
        message.success('Production Plan created successfully.')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to save Production Plan:', err)
      message.error(err?.message || 'Failed to save Production Plan')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Material / Product',
      dataIndex: 'materialId',
      key: 'materialId',
      render: (val: number, _: any, idx: number) => (
        <Select
          style={{ width: 220 }}
          showSearch
          optionFilterProp="label"
          value={val}
          onChange={(v) => handleItemChange(idx, 'materialId', v)}
          options={productList.map((p) => ({
            value: p.id,
            label: `${p.name} ${p.model ? `(${p.model})` : ''}`,
          }))}
        />
      ),
    },
    {
      title: 'Planned Quantity',
      dataIndex: 'plannedQty',
      key: 'plannedQty',
      width: 120,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={1}
          value={val}
          onChange={(v) => handleItemChange(idx, 'plannedQty', v || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Destination Plant / Warehouse',
      dataIndex: 'targetDepotId',
      key: 'targetDepotId',
      width: 200,
      render: (val: number, _: any, idx: number) => (
        <Select
          style={{ width: '100%' }}
          value={val}
          onChange={(v) => handleItemChange(idx, 'targetDepotId', v)}
          options={depotList.map((d) => ({
            value: d.id,
            label: d.name,
          }))}
        />
      ),
    },
    {
      title: 'Demand Source',
      dataIndex: 'demandSourceType',
      key: 'demandSourceType',
      width: 140,
      render: (val: string) => {
        const color = val === 'SALES_ORDER' ? 'blue' : val === 'FORECAST' ? 'purple' : 'green'
        return <Tag color={color}>{val || 'MANUAL'}</Tag>
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, __: any, idx: number) => (
        <Popconfirm title="Remove this item line?" onConfirm={() => handleRemoveItem(idx)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <AppstoreOutlined />
          <span>{editingRecord ? `Edit Production Plan: ${editingRecord.planNumber}` : 'Create New Production Plan'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={900}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="planTitle"
              label="Plan Title / Target Batch"
              rules={[{ required: true, message: 'Please enter a production plan title.' }]}
            >
              <Input placeholder="e.g. Q4 Automotive Housing Assembly Run" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="demandSource" label="Demand Source" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'SALES_ORDER', label: 'Sales Order Demand' },
                  { value: 'FORECAST', label: 'Forecast / Planned Demand' },
                  { value: 'MANUAL', label: 'Manual Production Demand' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="postingDate" label="Posting Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="plannedStartDate" label="Planned Start Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="plannedEndDate" label="Planned Completion Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="remark" label="Remark / Planning Horizon Note">
              <Input placeholder="e.g. Priority order for key customer" />
            </Form.Item>
          </Col>
        </Row>

        <Card
          size="small"
          title="Planned Demand Items (Finished Goods)"
          extra={
            <Space>
              {salesOrders.length > 0 && (
                <Select
                  placeholder="Import from Approved Sales Order"
                  style={{ width: 250 }}
                  onChange={handleSalesOrderSelect}
                  options={salesOrders.map((so) => ({
                    value: so.id,
                    label: `${so.number || so.id} (${so.organName || 'Customer'})`,
                  }))}
                  allowClear
                  suffixIcon={<ShoppingCartOutlined />}
                />
              )}
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem} size="small">
                Add Item
              </Button>
            </Space>
          }
          style={{ marginTop: 8 }}
        >
          <Table
            dataSource={items}
            columns={columns}
            rowKey={(_, idx) => String(idx)}
            pagination={false}
            size="small"
            scroll={{ y: 240 }}
          />
        </Card>
      </Form>
    </Modal>
  )
}
