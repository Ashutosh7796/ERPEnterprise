import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Switch,
  message,
} from 'antd'
import { PlusOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { salesApi, QuotationDto, QuotationItemDto } from '../api/salesApi'
import { http } from '@core/api/client'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface QuotationModalProps {
  visible: boolean
  quotationId?: number
  onClose: () => void
  onSuccess: () => void
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  visible,
  quotationId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [items, setItems] = useState<QuotationItemDto[]>([])

  useEffect(() => {
    if (visible) {
      loadCustomers()
      loadMaterials()
      if (quotationId) {
        loadQuotation(quotationId)
      } else {
        form.resetFields()
        form.setFieldsValue({
          quotationNumber: `QTN-${Date.now().toString().slice(-6)}`,
          quotationDate: dayjs(),
          validUntilDate: dayjs().add(30, 'day'),
          placeOfSupply: '27',
          isInterState: false,
          currency: 'INR',
        })
        setItems([
          {
            materialId: 0,
            quantity: 1,
            unitPrice: 0,
            discountRate: 0,
            taxRate: 18,
            totalAmount: 0,
          },
        ])
      }
    }
  }, [visible, quotationId])

  const loadCustomers = async () => {
    try {
      let list: any[] = []
      const res: any = await http.get('/supplier/findBySelect_cus').catch(() => null)
      if (Array.isArray(res?.data) && res.data.length > 0) list = res.data
      else if (Array.isArray(res) && res.length > 0) list = res
      else {
        const fb: any = await http.get('/supplier/findBySelectCus').catch(() => null)
        if (Array.isArray(fb?.data)) list = fb.data
        else if (Array.isArray(fb)) list = fb
      }
      setCustomers(list)
    } catch (e) {
      console.error('Failed to load customers', e)
    }
  }

  const loadMaterials = async () => {
    try {
      const res: any = await http.get('/material/findBySelect', { params: { page: 1, rows: 300 } }).catch(() => null)
      let list: any[] = []
      if (Array.isArray(res)) list = res
      else if (Array.isArray(res?.data?.rows)) list = res.data.rows
      else if (Array.isArray(res?.rows)) list = res.rows
      else if (Array.isArray(res?.data)) list = res.data
      if (list.length === 0) {
        const fb: any = await http.get('/material/getMaterialBySelect').catch(() => null)
        if (Array.isArray(fb)) list = fb
        else if (Array.isArray(fb?.data)) list = fb.data
      }
      setMaterials(list)
    } catch (e) {
      console.error('Failed to load materials', e)
    }
  }

  const loadQuotation = async (id: number) => {
    setLoading(true)
    try {
      const res = await salesApi.fetchQuotation(id)
      if (res.code === 200 && res.data) {
        const q = res.data
        form.setFieldsValue({
          quotationNumber: q.quotationNumber,
          customerId: q.customerId,
          quotationDate: q.quotationDate ? dayjs(q.quotationDate) : dayjs(),
          validUntilDate: q.validUntilDate ? dayjs(q.validUntilDate) : dayjs().add(30, 'day'),
          placeOfSupply: q.placeOfSupply || '27',
          isInterState: q.isInterState || false,
          currency: q.currency || 'INR',
          paymentTerms: q.paymentTerms,
          deliveryTerms: q.deliveryTerms,
          remark: q.remark,
        })
        setItems(q.items && q.items.length > 0 ? q.items : [])
      }
    } catch (e) {
      message.error('Failed to load quotation details.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof QuotationItemDto, val: any) => {
    const updated = [...items]
    const row = { ...updated[index], [field]: val }

    if (field === 'materialId') {
      const mat = materials.find((m) => m.id === val || m.meId === val)
      if (mat) {
        row.materialName = mat.name
        row.unitPrice = Number(mat.wholesaleDecimal || mat.commodityDecimal || mat.presetPriceOne || 0)
        if (!row.taxRate && mat.taxRate) {
          row.taxRate = Number(mat.taxRate)
        }
      }
    }

    const qty = Number(row.quantity || 0)
    const price = Number(row.unitPrice || 0)
    const discRate = Number(row.discountRate || 0)
    const taxRate = Number(row.taxRate || 0)

    const gross = qty * price
    const discAmount = (gross * discRate) / 100
    const taxable = Math.max(0, gross - discAmount)
    const taxAmount = (taxable * taxRate) / 100
    const total = taxable + taxAmount

    row.discountAmount = discAmount
    row.taxAmount = taxAmount
    row.totalAmount = total

    updated[index] = row
    setItems(updated)
  }

  const addItemRow = () => {
    setItems([
      ...items,
      {
        materialId: 0,
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        taxRate: 18,
        totalAmount: 0,
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    let totalTaxable = 0
    let totalTax = 0
    let grandTotal = 0

    items.forEach((it) => {
      const qty = it.quantity || 0
      const price = it.unitPrice || 0
      const disc = it.discountAmount || 0
      const taxable = qty * price - disc
      const tax = it.taxAmount || 0

      totalTaxable += taxable
      totalTax += tax
      grandTotal += it.totalAmount || 0
    })

    return { totalTaxable, totalTax, grandTotal }
  }

  const { totalTaxable, totalTax, grandTotal } = calculateTotals()

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (items.length === 0 || items.some((i) => !i.materialId)) {
        message.warning('Please add at least one valid item.')
        return
      }

      setLoading(true)
      const selectedCustomer = customers.find((c) => c.id === values.customerId)

      const payload: QuotationDto = {
        id: quotationId,
        quotationNumber: values.quotationNumber,
        customerId: values.customerId,
        customerName: selectedCustomer ? selectedCustomer.supplier : 'Customer',
        quotationDate: values.quotationDate.format('YYYY-MM-DD'),
        validUntilDate: values.validUntilDate.format('YYYY-MM-DD'),
        placeOfSupply: values.placeOfSupply,
        isInterState: values.isInterState,
        currency: values.currency,
        totalTaxableAmount: totalTaxable,
        totalTaxAmount: totalTax,
        grandTotal: grandTotal,
        paymentTerms: values.paymentTerms,
        deliveryTerms: values.deliveryTerms,
        remark: values.remark,
        items: items,
      }

      const res = quotationId
        ? await salesApi.updateQuotation(payload)
        : await salesApi.createQuotation(payload)

      if (res.code === 200) {
        message.success(quotationId ? 'Quotation updated successfully.' : 'Quotation draft created successfully.')
        onSuccess()
        onClose()
      } else {
        message.error(`Failed to save quotation: ${res.data}`)
      }
    } catch (e: any) {
      if (e.errorFields) return
      message.error(`Error saving quotation: ${e.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Item',
      dataIndex: 'materialId',
      width: 260,
      render: (val: number, _: any, idx: number) => (
        <Select
          showSearch
          optionFilterProp="children"
          value={val || undefined}
          placeholder="Select item..."
          style={{ width: '100%' }}
          onChange={(v) => handleItemChange(idx, 'materialId', v)}
        >
          {materials.map((m) => (
            <Option key={m.id || m.meId} value={m.id || m.meId}>
              {m.mBarCode || m.barCode ? `${m.mBarCode || m.barCode} - ` : ''}{m.name} ({m.standard || m.model || 'Standard'})
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 90,
      align: 'right' as const,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={1}
          value={val}
          style={{ width: '100%' }}
          onChange={(v) => handleItemChange(idx, 'quantity', v || 1)}
        />
      ),
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'unitPrice',
      width: 130,
      align: 'right' as const,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          precision={2}
          value={val}
          style={{ width: '100%' }}
          onChange={(v) => handleItemChange(idx, 'unitPrice', v || 0)}
        />
      ),
    },
    {
      title: 'Disc %',
      dataIndex: 'discountRate',
      width: 90,
      align: 'right' as const,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          max={100}
          value={val || 0}
          style={{ width: '100%' }}
          onChange={(v) => handleItemChange(idx, 'discountRate', v || 0)}
        />
      ),
    },
    {
      title: 'GST Rate',
      dataIndex: 'taxRate',
      width: 110,
      render: (val: number, _: any, idx: number) => (
        <Select
          value={val !== undefined ? val : 18}
          style={{ width: '100%' }}
          onChange={(v) => handleItemChange(idx, 'taxRate', v)}
        >
          <Option value={0}>0%</Option>
          <Option value={5}>5%</Option>
          <Option value={12}>12%</Option>
          <Option value={18}>18%</Option>
          <Option value={28}>28%</Option>
        </Select>
      ),
    },
    {
      title: 'Line Total (₹)',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: '#1677ff' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: '',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItemRow(idx)}
          disabled={items.length === 1}
        />
      ),
    },
  ]

  return (
    <Modal
      title={quotationId ? 'Edit Sales Quotation' : 'Create Sales Quotation'}
      open={visible}
      onCancel={onClose}
      width={1050}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          Save Quotation
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="quotationNumber"
              label="Quotation Number"
              rules={[{ required: true, message: 'Please enter a quotation number.' }]}
            >
              <Input placeholder="QTN-XXXXXX" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="customerId"
              label="Customer"
              rules={[{ required: true, message: 'Please select a customer.' }]}
            >
              <Select showSearch optionFilterProp="children" placeholder="Select customer...">
                {customers.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.supplier || c.name} {c.taxNum ? `(${c.taxNum})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="quotationDate" label="Quotation Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="validUntilDate" label="Valid Until" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="placeOfSupply" label="Place of Supply (State Code)">
              <Input placeholder="e.g. 27" maxLength={2} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isInterState" label="Inter-State IGST" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="paymentTerms" label="Payment Terms">
              <Input placeholder="e.g. Net 30 Days" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="deliveryTerms" label="Delivery Terms">
              <Input placeholder="e.g. Ex-Works / Door Delivery" />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start" style={{ margin: '12px 0' }}>
          Quotation Line Items
        </Divider>

        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          rowKey={(_, idx) => String(idx)}
          size="small"
          bordered
          scroll={{ x: 880 }}
        />

        <Button
          type="dashed"
          onClick={addItemRow}
          block
          icon={<PlusOutlined />}
          style={{ marginTop: 10 }}
        >
          Add Item Line
        </Button>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={16} align="middle">
          <Col span={14}>
            <Form.Item name="remark" label="Remarks / Special Notes" style={{ marginBottom: 0 }}>
              <TextArea rows={3} placeholder="Optional commercial terms or quotation notes..." />
            </Form.Item>
          </Col>
          <Col span={10}>
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <Text type="secondary">Total Taxable Value:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <Text type="secondary">Total GST Amount:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                  ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: '15px', color: '#1e293b' }}>Grand Total:</Text>
                <Text strong style={{ fontSize: '18px', color: '#1677ff', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
