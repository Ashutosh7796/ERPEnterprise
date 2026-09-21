import React, { useEffect, useState, useMemo } from 'react'
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
  Alert,
} from 'antd'
import { PlusOutlined, DeleteOutlined, FileProtectOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { procurementApi } from '../api/procurementApi'

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
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [partnerList, setPartnerList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [accountList, setAccountList] = useState<any[]>([])
  const [approvedPrList, setApprovedPrList] = useState<any[]>([])
  const [productList, setProductList] = useState<any[]>([])
  const [items, setItems] = useState<BillItem[]>([])

  // Load dropdown resources
  useEffect(() => {
    if (!open) return

    const loadResources = async () => {
      try {
        // Partners
        if (partnerType === 'vendor') {
          let list: any[] = []
          const res: any = await http.get('/supplier/findBySelect_sup').catch(() => null)
          if (Array.isArray(res?.data) && res.data.length > 0) list = res.data
          else if (Array.isArray(res) && res.length > 0) list = res
          else {
            const fb: any = await http.get('/supplier/findBySelectSup').catch(() => null)
            if (Array.isArray(fb?.data)) list = fb.data
            else if (Array.isArray(fb)) list = fb
          }
          setPartnerList(list)
        } else if (partnerType === 'customer') {
          let list: any[] = []
          const res: any = await http.get('/supplier/findBySelect_cus').catch(() => null)
          if (Array.isArray(res?.data) && res.data.length > 0) list = res.data
          else if (Array.isArray(res) && res.length > 0) list = res
          else {
            const fb: any = await http.get('/supplier/findBySelectCus').catch(() => null)
            if (Array.isArray(fb?.data)) list = fb.data
            else if (Array.isArray(fb)) list = fb
          }
          setPartnerList(list)
        } else if (partnerType === 'member') {
          let list: any[] = []
          const res: any = await http.get('/supplier/findBySelect_retail').catch(() => null)
          if (Array.isArray(res?.data) && res.data.length > 0) list = res.data
          else if (Array.isArray(res) && res.length > 0) list = res
          setPartnerList(list)
        }

        // Depots
        let depots: any[] = []
        const depotRes: any = await http.get('/depot/findDepotByCurrentUser').catch(() => null)
        if (Array.isArray(depotRes?.data) && depotRes.data.length > 0) depots = depotRes.data
        else if (Array.isArray(depotRes) && depotRes.length > 0) depots = depotRes
        else {
          const allDepots: any = await http.get('/depot/getAllList').catch(() => null)
          if (Array.isArray(allDepots?.data)) depots = allDepots.data
          else if (Array.isArray(allDepots)) depots = allDepots
        }
        setDepotList(depots)

        // Accounts
        const accRes: any = await http.get('/account/getAccount').catch(() => null)
        if (accRes?.data?.accountList) setAccountList(accRes.data.accountList)
        else if (Array.isArray(accRes?.data)) setAccountList(accRes.data)
        else if (Array.isArray(accRes)) setAccountList(accRes)

        // Load Approved PR list if creating/editing Purchase Order
        if (subType === '采购订单' || subType === 'PurchaseOrder') {
          procurementApi.getApprovedRequisitions().then((res: any) => {
            if (Array.isArray(res)) setApprovedPrList(res)
            else if (res?.data && Array.isArray(res.data)) setApprovedPrList(res.data)
          })
        }

        // Materials
        const matRes: any = await http.get('/material/findBySelect', { params: { page: 1, rows: 300 } })
        let mats: any[] = []
        if (Array.isArray(matRes)) {
          mats = matRes
        } else if (Array.isArray(matRes?.data?.rows)) {
          mats = matRes.data.rows
        } else if (Array.isArray(matRes?.rows)) {
          mats = matRes.rows
        } else if (Array.isArray(matRes?.data)) {
          mats = matRes.data
        }

        if (mats.length === 0) {
          const fallbackRes: any = await http.get('/material/list', { params: { pageSize: 300, currentPage: 1 } })
          if (Array.isArray(fallbackRes?.data?.rows)) {
            mats = fallbackRes.data.rows
          } else if (Array.isArray(fallbackRes?.rows)) {
            mats = fallbackRes.rows
          }
        }
        setProductList(mats)
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
        linkNumber: editingRecord.linkNumber,
        accountId: editingRecord.accountId,
        discount: editingRecord.discount || 0,
        discountMoney: editingRecord.discountMoney || 0,
        changeAmount: editingRecord.changeAmount || 0,
        remark: editingRecord.remark,
      })
      // Immediately clear previous rows to prevent duplicate ghosts
      setItems([])
      // Load details if editing
      if (editingRecord.id) {
        http.get(`/depotItem/getDetailList?headerId=${editingRecord.id}&isReadOnly=1&linkType=basic`).then((res: any) => {
          const rawRows = res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
          if (rawRows && rawRows.length > 0) {
            // Filter out blank ghost rows that have no product and zero price
            const validRows = rawRows.filter((r: any) => {
              const hasProd = r.materialId || r.materialExtendId || r.barCode || r.name || r.mName
              const hasQtyAndPrice = Number(r.operNumber || 0) > 0 && Number(r.unitPrice || 0) > 0
              return hasProd || hasQtyAndPrice
            })

            // Deduplicate by di.id or composite key
            const seen = new Set()
            const uniqueRows = validRows.filter((r: any) => {
              const key = r.id || `${r.materialExtendId || r.materialId}_${r.depotId}_${r.operNumber}_${r.unitPrice}`
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })

            setItems(
              uniqueRows.map((row: any) => {
                const operNumber = Number(row.operNumber || 1)
                const unitPrice = Number(row.unitPrice || 0)
                const allPrice = Number(row.allPrice !== undefined ? row.allPrice : (operNumber * unitPrice))
                const taxRate = Number(row.taxRate || 0)
                const taxMoney = Number(row.taxMoney !== undefined ? row.taxMoney : (allPrice * (taxRate / 100)))
                const taxLastMoney = Number(row.taxLastMoney !== undefined ? row.taxLastMoney : (allPrice + taxMoney))
                const matId = row.materialExtendId || row.materialId ? Number(row.materialExtendId || row.materialId) : undefined

                return {
                  id: String(row.id || Math.random()),
                  materialId: matId,
                  barCode: row.barCode,
                  name: row.name || row.materialName,
                  standard: row.standard || row.materialStandard,
                  model: row.model || row.materialModel,
                  unit: row.unit || row.unitName,
                  depotId: row.depotId ? Number(row.depotId) : undefined,
                  anotherDepotId: row.anotherDepotId ? Number(row.anotherDepotId) : undefined,
                  operNumber,
                  unitPrice,
                  allPrice,
                  taxRate,
                  taxMoney,
                  taxLastMoney,
                  remark: row.remark || '',
                }
              })
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

  // Handle Reference PR selection for Purchase Orders
  const handleSelectPr = async (prId: number) => {
    if (!prId) return
    const selectedPr = approvedPrList.find((p: any) => p.id === prId)
    if (!selectedPr) return

    form.setFieldsValue({
      linkNumber: selectedPr.number,
      organId: selectedPr.organId || form.getFieldValue('organId'),
      remark: `Created against Requisition ${selectedPr.number}`,
    })

    try {
      const res: any = await http.get(`/depotItem/getDetailList?headerId=${prId}&isReadOnly=1&linkType=basic`)
      const rawRows = res?.data?.rows || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      if (rawRows && rawRows.length > 0) {
        setItems(
          rawRows.map((row: any) => {
            const operNumber = Number(row.operNumber || 1)
            const unitPrice = Number(row.unitPrice || 0)
            const taxRate = Number(row.taxRate || 18)
            const allPrice = operNumber * unitPrice
            const taxMoney = allPrice * (taxRate / 100)
            const taxLastMoney = allPrice + taxMoney
            const matId = row.materialExtendId || row.materialId ? Number(row.materialExtendId || row.materialId) : undefined

            return {
              id: String(Math.random()),
              materialId: matId,
              barCode: row.barCode,
              name: row.name || row.materialName,
              standard: row.standard || row.materialStandard,
              model: row.model || row.materialModel,
              unit: row.unit || row.unitName,
              depotId: row.depotId ? Number(row.depotId) : (depotList[0]?.id || undefined),
              operNumber,
              unitPrice,
              allPrice,
              taxRate,
              taxMoney,
              taxLastMoney,
              remark: `From PR #${selectedPr.number}`,
            }
          })
        )
        message.success(`Loaded items from Requisition ${selectedPr.number}`)
      }
    } catch (e) {
      console.error('Failed to load PR details:', e)
    }
  }

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
      const selected = productList.find(
        (p) => p.id === value || p.meId === value || p.id === Number(value) || p.meId === Number(value)
      )
      if (selected) {
        item.materialId = Number(selected.id || selected.meId || value)
        item.name = selected.name
        item.barCode = selected.mBarCode || selected.barCode
        item.standard = selected.standard
        item.model = selected.model
        item.unit = selected.commodityUnit || selected.unit
        item.unitPrice = Number(
          subType.includes('采购') || subType.includes('Purchase')
            ? selected.purchaseDecimal || selected.presetPriceOne || 0
            : selected.wholesaleDecimal || selected.commodityDecimal || selected.presetPriceOne || 0
        )
        if (!item.taxRate) {
          item.taxRate = Number(selected.taxRate || 18)
        }
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
      // Filter out empty rows before saving
      const validItems = items.filter(
        (it) => it.materialId || (Number(it.operNumber || 0) > 0 && Number(it.unitPrice || 0) > 0)
      )
      if (validItems.length === 0) {
        message.warning('Please select a product for at least one item.')
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
          linkNumber: values.linkNumber || editingRecord?.linkNumber || '',
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
          validItems.map((it) => {
            const prod = productList.find(
              (p) => p.id === it.materialId || p.meId === it.materialId || p.id === Number(it.materialId) || p.meId === Number(it.materialId)
            )
            const barCode = it.barCode || prod?.mBarCode || prod?.barCode || ''
            const unit = it.unit || prod?.commodityUnit || prod?.unit || '件'
            return {
              materialId: it.materialId,
              barCode: barCode,
              name: it.name || prod?.name || '',
              standard: it.standard || prod?.standard || '',
              model: it.model || prod?.model || '',
              unit: unit,
              depotId: it.depotId,
              anotherDepotId: it.anotherDepotId,
              operNumber: it.operNumber,
              unitPrice: it.unitPrice,
              allPrice: it.allPrice,
              taxRate: it.taxRate || 0,
              taxMoney: it.taxMoney || 0,
              taxLastMoney: it.taxLastMoney || it.allPrice || 0,
              remark: it.remark || '',
            }
          })
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
  const isSimpleBill = subType === '其它入库' || subType === '其它出库' || subType === '组装单' || subType === '拆卸单'

  // Build product options with fallbacks for existing bill items
  const productOptions = useMemo(() => {
    const opts = productList.map((p) => {
      const code = p.mBarCode || p.barCode || ''
      const name = p.name || ''
      const std = p.standard ? ` (${p.standard})` : ''
      const price = p.wholesaleDecimal || p.purchaseDecimal || p.commodityDecimal || p.presetPriceOne || 0
      return {
        value: Number(p.id || p.meId),
        label: `${code ? `${code} - ` : ''}${name}${std} (₹${price})`,
      }
    })
    // Add graceful labels for existing items if productList hasn't finished indexing
    items.forEach((it) => {
      if (it.materialId && !opts.some((o) => o.value === Number(it.materialId))) {
        opts.push({
          value: Number(it.materialId),
          label: `${it.barCode ? `${it.barCode} - ` : ''}${it.name || `Product #${it.materialId}`}${it.standard ? ` (${it.standard})` : ''}`,
        })
      }
    })
    return opts
  }, [productList, items])

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
      width: 250,
      render: (_: any, record: BillItem, index: number) => (
        <Select
          style={{ width: '100%' }}
          showSearch
          placeholder="Select product..."
          optionFilterProp="label"
          value={record.materialId ? Number(record.materialId) : undefined}
          onChange={(val) => handleItemChange(index, 'materialId', val)}
          options={productOptions}
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
      {subType.includes('销售') || subType.includes('Sales') || prefixNo === 'XSDD' || prefixNo === 'XSCK' ? (
        <Alert
          title="Statutory Indian GST Compliance Notice"
          description={
            <span>
              For statutory Indian GST Rule 46 Tax Invoicing (with Place of Supply determination, Reverse Charge RCM, HSN/SAC resolution, and live IRP e-Invoice IRN / Signed QR generation), please use{' '}
              <a
                style={{ fontWeight: 600, color: '#1677ff', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => {
                  onClose()
                  navigate('/sales/invoices/new')
                }}
              >
                Sales &gt; Billing Documents &gt; New Tax Invoice
              </a>.
            </span>
          }
          type="info"
          showIcon
          icon={<FileProtectOutlined />}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        {/* Header Fields */}
        <Row gutter={16}>
          {partnerType !== 'none' && (
            <Col span={6}>
              <Form.Item
                name="organId"
                label={partnerLabel}
                rules={[{ required: subType !== '请购单', message: `Please select ${partnerLabel}` }]}
              >
                <Select
                  showSearch
                  allowClear
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
          {(subType === '采购订单' || subType === 'PurchaseOrder') && (
            <Col span={6}>
              <Form.Item name="prHeaderId" label="Referenced Requisition (PR)">
                <Select
                  showSearch
                  allowClear
                  placeholder="Link Approved PR..."
                  optionFilterProp="label"
                  onChange={handleSelectPr}
                  options={approvedPrList.map((pr: any) => ({
                    value: pr.id,
                    label: `${pr.number} (₹${Number(pr.totalPrice || 0).toFixed(2)})`,
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
