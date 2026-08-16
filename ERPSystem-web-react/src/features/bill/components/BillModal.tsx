import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  Table,
  Space,
  Row,
  Col,
  Divider,
  Typography,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'

const { Text } = Typography

export interface BillItem {
  id?: string
  materialId?: number
  barCode?: string
  name?: string
  standard?: string
  model?: string
  unit?: string
  depotId?: number
  anotherDepotId?: number
  operNumber: number
  unitPrice: number
  allPrice: number
  taxRate?: number
  taxMoney?: number
  taxLastMoney?: number
  remark?: string
}

interface BillModalProps {
  open: boolean
  title: string
  type: '入库' | '出库' | '其它'
  subType: string
  prefixNo: string
  partnerType?: 'vendor' | 'customer' | 'member' | 'none'
  partnerLabel?: string
  editingRecord?: any
  onClose: () => void
  onSuccess: () => void
}

export const BillModal: React.FC<BillModalProps> = ({
  open,
  title,
  type,
  subType,
  prefixNo,
  partnerType = 'vendor',
  partnerLabel = 'Vendor / Supplier',
  editingRecord,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [partnerList, setPartnerList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [accountList, setAccountList] = useState<any[]>([])
  const [productList, setProductList] = useState<any[]>([])
  const [items, setItems] = useState<BillItem[]>([])

  // Load dropdown resources
  useEffect(() => {
    if (!open) return

    const loadResources = async () => {
      try {
        // Partners
        if (partnerType === 'vendor') {
          const res = await http.get('/supplier/findBySelect_sup')
          if (Array.isArray(res)) setPartnerList(res)
          else if (res?.data) setPartnerList(res.data)
        } else if (partnerType === 'customer') {
          const res = await http.get('/supplier/findBySelect_cus')
          if (Array.isArray(res)) setPartnerList(res)
          else if (res?.data) setPartnerList(res.data)
        } else if (partnerType === 'member') {
          const res = await http.get('/supplier/findBySelect_retail')
          if (Array.isArray(res)) setPartnerList(res)
          else if (res?.data) setPartnerList(res.data)
        }

        // Depots
        const depotRes = await http.get('/depot/findDepotByCurrentUser')
        if (Array.isArray(depotRes)) setDepotList(depotRes)
        else if (depotRes?.data) setDepotList(depotRes.data)

        // Accounts
        const accRes = await http.get('/account/getAccount')
        if (accRes?.data?.accountList) setAccountList(accRes.data.accountList)

        // Materials
        const matRes = await http.get('/material/findBySelect')
        if (Array.isArray(matRes)) setProductList(matRes)
        else if (matRes?.data) setProductList(matRes.data)
      } catch (err) {
        console.error('Failed to load bill resources:', err)
      }
    }

    loadResources()

    if (editingRecord) {
      form.setFieldsValue({
        organId: editingRecord.organId,
        operTime: editingRecord.operTime ? dayjs(editingRecord.operTime) : dayjs(),
        number: editingRecord.number,
        accountId: editingRecord.accountId,
        discount: editingRecord.discount || 0,
        discountMoney: editingRecord.discountMoney || 0,
        changeAmount: editingRecord.changeAmount || 0,
        remark: editingRecord.remark,
      })
      // Load details if editing
      if (editingRecord.id) {
        http.get(`/depotItem/getDetailList?headerId=${editingRecord.id}`).then((res: any) => {
          if (res?.data?.rows) {
            setItems(
              res.data.rows.map((row: any) => ({
                id: String(row.id || Math.random()),
                materialId: row.materialId,
                barCode: row.barCode,
                name: row.name || row.materialName,
                standard: row.standard || row.materialStandard,
                model: row.model || row.materialModel,
                unit: row.unit || row.unitName,
                depotId: row.depotId,
                anotherDepotId: row.anotherDepotId,
                operNumber: Number(row.operNumber || 1),
                unitPrice: Number(row.unitPrice || 0),
                allPrice: Number(row.allPrice || 0),
                taxRate: Number(row.taxRate || 0),
                taxMoney: Number(row.taxMoney || 0),
                taxLastMoney: Number(row.taxLastMoney || row.allPrice || 0),
                remark: row.remark || '',
              }))
            )
          }
        })
      }
    } else {
      // Auto generate Doc Number
      const timestamp = dayjs().format('YYYYMMDDHHmmss')
      form.setFieldsValue({
        operTime: dayjs(),
        number: `${prefixNo}${timestamp}`,
        discount: 0,
        discountMoney: 0,
        changeAmount: 0,
      })
      setItems([
        {
          id: 'item_1',
          operNumber: 1,
          unitPrice: 0,
          allPrice: 0,
          taxRate: 0,
          taxMoney: 0,
          taxLastMoney: 0,
        },
      ])
    }
  }, [open, editingRecord, prefixNo, partnerType, form])

  // Calculations
  const totalAmount = items.reduce((acc, item) => acc + (Number(item.allPrice) || 0), 0)
  const totalWithTax = items.reduce((acc, item) => acc + (Number(item.taxLastMoney) || Number(item.allPrice) || 0), 0)

  const discount = Form.useWatch('discount', form) || 0
  const discountMoney = totalWithTax * (Number(discount) / 100)
  const finalAmount = totalWithTax - discountMoney
  const changeAmount = Form.useWatch('changeAmount', form) || 0
  const debt = Math.max(0, finalAmount - Number(changeAmount))

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        operNumber: 1,
        unitPrice: 0,
        allPrice: 0,
        taxRate: 0,
        taxMoney: 0,
        taxLastMoney: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }

    if (field === 'materialId') {
      const selected = productList.find((p) => p.id === value)
      if (selected) {
        item.name = selected.name
        item.barCode = selected.mBarCode || selected.barCode
        item.standard = selected.standard
        item.model = selected.model
        item.unit = selected.unit
        item.unitPrice = Number(
          subType.includes('采购')
            ? selected.purchaseDecimal || selected.presetPriceOne || 0
            : selected.commodityDecimal || selected.presetPriceOne || 0
        )
      }
    }

    // Recalculate amounts
    const qty = Number(item.operNumber || 0)
    const price = Number(item.unitPrice || 0)
    const rate = Number(item.taxRate || 0)

    const rawAll = qty * price
    const tax = rawAll * (rate / 100)
    item.allPrice = rawAll
    item.taxMoney = tax
    item.taxLastMoney = rawAll + tax

    updated[index] = item
    setItems(updated)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (items.length === 0) {
        message.warning('Please add at least one product item.')
        return
      }

      setLoading(true)

      const payload = {
        info: JSON.stringify({
          type,
          subType,
          organId: values.organId,
          operTime: values.operTime?.format('YYYY-MM-DD HH:mm:ss'),
          number: values.number,
          accountId: values.accountId,
          discount: values.discount,
          discountMoney: discountMoney,
          discountLastMoney: finalAmount,
          changeAmount: values.changeAmount,
          debt: debt,
          totalPrice: totalAmount,
          remark: values.remark || '',
          id: editingRecord?.id,
        }),
        rows: JSON.stringify(
          items.map((it) => ({
            materialId: it.materialId,
            barCode: it.barCode,
            depotId: it.depotId,
            anotherDepotId: it.anotherDepotId,
            operNumber: it.operNumber,
            unitPrice: it.unitPrice,
            allPrice: it.allPrice,
            taxRate: it.taxRate,
            taxMoney: it.taxMoney,
            taxLastMoney: it.taxLastMoney,
            remark: it.remark || '',
          }))
        ),
      }

      const endpoint = editingRecord?.id
        ? '/depotHead/updateDepotHeadAndDetail'
        : '/depotHead/addDepotHeadAndDetail'

      const res = await http.post(endpoint, payload)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Document saved successfully')
        onSuccess()
        onClose()
      } else {
        message.error(res?.message || res?.data?.message || 'Failed to save document')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || 'Failed to save document')
    } finally {
      setLoading(false)
    }
  }

  const isTransfer = subType === '调拨出库'
  const isSimpleBill = subType === '请购单' || subType === '其它入库' || subType === '其它出库' || subType === '组装单' || subType === '拆卸单'

  const itemColumns = [
    {
      title: 'No.',
      key: 'index',
      width: 45,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Product (Barcode / Name)',
      key: 'materialId',
      width: 220,
      render: (_: any, record: BillItem, index: number) => (
        <Select
          style={{ width: '100%' }}
          showSearch
          placeholder="Select product..."
          optionFilterProp="children"
          value={record.materialId}
          onChange={(val) => handleItemChange(index, 'materialId', val)}
          options={productList.map((p) => ({
            value: p.id,
            label: `${p.mBarCode || p.barCode || ''} - ${p.name || ''}`,
          }))}
        />
      ),
    },
    {
      title: isTransfer ? 'Source Warehouse' : 'Warehouse',
      key: 'depotId',
      width: 140,
      render: (_: any, record: BillItem, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select warehouse..."
          value={record.depotId}
          onChange={(val) => handleItemChange(index, 'depotId', val)}
          options={depotList.map((d) => ({
            value: d.id,
            label: d.depotName || d.name,
          }))}
        />
      ),
    },
    ...(isTransfer
      ? [
          {
            title: 'Target Warehouse',
            key: 'anotherDepotId',
            width: 140,
            render: (_: any, record: BillItem, index: number) => (
              <Select
                style={{ width: '100%' }}
                placeholder="Target warehouse..."
                value={record.anotherDepotId}
                onChange={(val) => handleItemChange(index, 'anotherDepotId', val)}
                options={depotList.map((d) => ({
                  value: d.id,
                  label: d.depotName || d.name,
                }))}
              />
            ),
          },
        ]
      : []),
    {
      title: 'Qty',
      key: 'operNumber',
      width: 90,
      render: (_: any, record: BillItem, index: number) => (
        <InputNumber
          min={1}
          value={record.operNumber}
          onChange={(val) => handleItemChange(index, 'operNumber', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    ...(!isSimpleBill
      ? [
          {
            title: 'Unit Price (₹)',
            key: 'unitPrice',
            width: 120,
            render: (_: any, record: BillItem, index: number) => (
              <InputNumber
                min={0}
                step={0.01}
                value={record.unitPrice}
                onChange={(val) => handleItemChange(index, 'unitPrice', val || 0)}
                style={{ width: '100%' }}
              />
            ),
          },
          {
            title: 'Amount (₹)',
            key: 'allPrice',
            width: 110,
            render: (_: any, record: BillItem) => (
              <Text strong>₹{Number(record.allPrice || 0).toFixed(2)}</Text>
            ),
          },
          {
            title: 'Tax Rate (%)',
            key: 'taxRate',
            width: 90,
            render: (_: any, record: BillItem, index: number) => (
              <InputNumber
                min={0}
                max={100}
                value={record.taxRate}
                onChange={(val) => handleItemChange(index, 'taxRate', val || 0)}
                style={{ width: '100%' }}
              />
            ),
          },
          {
            title: 'Total w/ Tax (₹)',
            key: 'taxLastMoney',
            width: 120,
            render: (_: any, record: BillItem) => (
              <Text strong style={{ color: '#1890ff' }}>
                ₹{Number(record.taxLastMoney || 0).toFixed(2)}
              </Text>
            ),
          },
        ]
      : []),
    {
      title: 'Remarks',
      key: 'remark',
      width: 130,
      render: (_: any, record: BillItem, index: number) => (
        <Input
          placeholder="Line remark..."
          value={record.remark}
          onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Popconfirm title="Remove this item?" onConfirm={() => handleRemoveItem(index)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Modal
      title={title}
      open={open}
      width={1100}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      destroyOnHidden
      okText="Save Document"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        {/* Header Fields */}
        <Row gutter={16}>
          {partnerType !== 'none' && (
            <Col span={6}>
              <Form.Item
                name="organId"
                label={partnerLabel}
                rules={[{ required: true, message: `Please select ${partnerLabel}` }]}
              >
                <Select
                  showSearch
                  placeholder={`Select ${partnerLabel}...`}
                  optionFilterProp="children"
                  options={partnerList.map((v) => ({
                    value: v.id,
                    label: v.supplier || v.name,
                  }))}
                />
              </Form.Item>
            </Col>
          )}
          <Col span={6}>
            <Form.Item
              name="operTime"
              label="Document Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="number"
              label="Document Number"
              rules={[{ required: true, message: 'Doc number is required' }]}
            >
              <Input placeholder="Doc Number" />
            </Form.Item>
          </Col>
          {!isSimpleBill && (
            <Col span={6}>
              <Form.Item name="accountId" label="Settlement Account">
                <Select
                  placeholder="Select settlement account..."
                  allowClear
                  options={accountList.map((a) => ({
                    value: a.id,
                    label: `${a.name} (Bal: ₹${Number(a.currentAmount || 0).toFixed(2)})`,
                  }))}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* Item List Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14 }}>
            Product Items
          </Text>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} size="small">
            Add Product Row
          </Button>
        </div>

        {/* Items Table */}
        <Table
          rowKey="id"
          bordered
          size="small"
          columns={itemColumns}
          dataSource={items}
          pagination={false}
          scroll={{ x: 1000 }}
          style={{ marginBottom: 16 }}
        />

        {/* Footer Financial Breakdown */}
        {!isSimpleBill && (
          <Row gutter={16} style={{ background: '#fafafa', padding: '12px 16px', borderRadius: 6, marginBottom: 12 }}>
            <Col span={4}>
              <Form.Item label="Discount Rate (%)" name="discount" style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Discount Amount:
                </Text>
                <Text strong style={{ fontSize: 14, color: '#f5222d' }}>
                  -₹{discountMoney.toFixed(2)}
                </Text>
              </div>
            </Col>
            <Col span={5}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Net Total with Tax:
                </Text>
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  ₹{finalAmount.toFixed(2)}
                </Text>
              </div>
            </Col>
            <Col span={5}>
              <Form.Item label="This Payment (₹)" name="changeAmount" style={{ marginBottom: 0 }}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Outstanding Debt:
                </Text>
                <Text strong style={{ fontSize: 15, color: debt > 0 ? '#fa8c16' : '#52c41a' }}>
                  ₹{debt.toFixed(2)}
                </Text>
              </div>
            </Col>
          </Row>
        )}

        <Form.Item name="remark" label="Document Remarks" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} placeholder="Enter any general remarks or instructions..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
