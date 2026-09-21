import React, { useEffect, useState, useMemo } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Table,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  message,
  Descriptions,
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SafetyCertificateOutlined,
  WarningOutlined,
  PlusOutlined,
  DeleteOutlined,
  CalculatorOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import {
  createPurchaseInvoice,
  getPoFulfillmentDetails,
  evaluateTds,
  GstPurchaseInvoiceItem,
  GstPurchaseInvoiceCreateRequest,
} from '../api/procurementApi'

const { Text } = Typography

// Luhn Mod-36 GSTIN Validator Check
const GSTIN_CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
function isValidGSTIN(gstin: string): boolean {
  if (!gstin || gstin.trim().length !== 15) return false
  gstin = gstin.trim().toUpperCase()
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!regex.test(gstin)) return false

  let factor = 1
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const c = gstin.charAt(i)
    const codePoint = GSTIN_CHAR_SET.indexOf(c)
    if (codePoint === -1) return false
    let digit = factor * codePoint
    factor = factor === 2 ? 1 : 2
    digit = Math.floor(digit / 36) + (digit % 36)
    sum += digit
  }
  const remainder = sum % 36
  const checkCodePoint = (36 - remainder) % 36
  return GSTIN_CHAR_SET.charAt(checkCodePoint) === gstin.charAt(14)
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const GstPurchaseInvoiceFormModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [supplierList, setSupplierList] = useState<any[]>([])
  const [approvedPoList, setApprovedPoList] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)

  const [supplierGstin, setSupplierGstin] = useState<string>('')
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('27') // Default Maharashtra
  const [isRcm, setIsRcm] = useState<boolean>(false)
  const [isSez, setIsSez] = useState<boolean>(false)

  // TDS Withholding Configuration
  const [tdsSection, setTdsSection] = useState<string>('NONE')
  const [lowerCertNo, setLowerCertNo] = useState<string>('')
  const [lowerCertRate, setLowerCertRate] = useState<number | undefined>(undefined)
  const [tdsPreview, setTdsPreview] = useState<{
    isDeductionRequired: boolean
    statutoryRate: number
    effectiveRate: number
    taxableBaseAmount: number
    tdsAmount: number
    netPayableAmount: number
    sectionCode: string
    tdsAccountCode: string
    payeeEntityType: string
    reason: string
  } | null>(null)

  // Line items
  const [items, setItems] = useState<GstPurchaseInvoiceItem[]>([
    {
      materialId: 101,
      materialName: 'Industrial Spares / Raw Material',
      hsnSacCode: '84821010',
      quantity: 10,
      unitPrice: 1000,
      discountRate: 0,
      gstRate: 18,
      itcEligible: true,
      itcBlockReason: undefined,
    },
  ])

  useEffect(() => {
    if (visible) {
      fetchSuppliers()
      fetchApprovedPOs()
    }
  }, [visible])

  const fetchSuppliers = async () => {
    try {
      const res: any = await http.get('/supplier/findBySelect_sup')
      if (res && res.code === 200) {
        setSupplierList(res.data || [])
      }
    } catch {}
  }

  const fetchApprovedPOs = async () => {
    try {
      const res: any = await http.get('/depotHead/list', {
        params: {
          currentPage: 1,
          pageSize: 50,
          type: '其它',
          subType: '采购订单',
          status: '1',
        },
      })
      if (res && res.code === 200) {
        setApprovedPoList(res.data?.rows || [])
      }
    } catch {}
  }

  const handleSupplierChange = (supplierId: number) => {
    const s = supplierList.find((sup) => sup.id === supplierId)
    setSelectedSupplier(s)
    if (s && s.taxNum) {
      setSupplierGstin(s.taxNum)
      form.setFieldsValue({ supplierGstin: s.taxNum })
      const extractedState = s.taxNum.substring(0, 2)
      setPlaceOfSupply(extractedState)
      form.setFieldsValue({ placeOfSupply: extractedState })
    }
  }

  const handlePoChange = async (poId: number) => {
    if (!poId) return
    setLoading(true)
    try {
      const res = await getPoFulfillmentDetails(poId)
      if (res.data?.data && res.data.data.length > 0) {
        const mappedItems: GstPurchaseInvoiceItem[] = res.data.data.map((l: any) => ({
          poItemId: l.poItemId,
          materialId: l.materialId,
          materialName: `Material #${l.materialId}`,
          hsnSacCode: '84821010',
          quantity: Number(l.remainingInvoiceQuantity || l.orderedQuantity || 1),
          unitPrice: 1000,
          discountRate: 0,
          gstRate: 18,
          itcEligible: true,
        }))
        setItems(mappedItems)
      }
    } catch (err: any) {
      message.error('Failed to load PO line items: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof GstPurchaseInvoiceItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }

    // If marked ineligible, require block reason
    if (field === 'itcEligible' && value === false && !updated[index].itcBlockReason) {
      updated[index].itcBlockReason = 'SEC_17_5_MOTOR_VEHICLE'
    } else if (field === 'itcEligible' && value === true) {
      updated[index].itcBlockReason = undefined
    }

    setItems(updated)
  }

  const addItemRow = () => {
    setItems([
      ...items,
      {
        materialId: 100 + items.length + 1,
        materialName: 'New Material Item',
        hsnSacCode: '84821010',
        quantity: 1,
        unitPrice: 100,
        discountRate: 0,
        gstRate: 18,
        itcEligible: true,
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      message.warning('At least one item is required in the purchase invoice.')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  // Supply Type & Tax Calculation
  const supplierState = supplierGstin ? supplierGstin.substring(0, 2) : '27'
  const isIntraState = !isSez && supplierState === placeOfSupply
  const supplyType = isSez ? 'SEZ_SUPPLY' : isIntraState ? 'INTRA_STATE' : 'INTER_STATE'

  const calculation = useMemo(() => {
    let totalTaxable = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0
    let eligibleItc = 0
    let blockedItc = 0

    items.forEach((item) => {
      const gross = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discount = gross * (Number(item.discountRate || 0) / 100)
      const taxable = gross - discount
      const rate = Number(item.gstRate || 0)
      const tax = taxable * (rate / 100)

      totalTaxable += taxable

      if (isSez || !isIntraState) {
        totalIgst += tax
      } else {
        totalCgst += tax / 2
        totalSgst += tax / 2
      }

      if (item.itcEligible && !isRcm) {
        eligibleItc += tax
      } else {
        blockedItc += tax
      }
    })

    const totalTax = isIntraState ? totalCgst + totalSgst : totalIgst
    const totalWithTax = totalTaxable + totalTax
    const roundedInvoiceTotal = Math.round(totalWithTax)
    const roundingAdj = roundedInvoiceTotal - totalWithTax

    return {
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundingAdj,
      roundedInvoiceTotal,
      eligibleItc,
      blockedItc,
    }
  }, [items, isIntraState, isSez, isRcm])

  // Live Statutory TDS Calculation Effect
  useEffect(() => {
    if (!selectedSupplier?.id || calculation.totalTaxable <= 0 || tdsSection === 'NONE') {
      setTdsPreview(null)
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const res: any = await evaluateTds({
          supplierId: selectedSupplier.id,
          taxableAmount: calculation.totalTaxable,
          grossInvoiceAmount: calculation.roundedInvoiceTotal,
          tdsSection: tdsSection,
          lowerCertNo: lowerCertNo.trim() || undefined,
          lowerCertRate: lowerCertRate !== undefined ? Number(lowerCertRate) / 100.0 : undefined,
        })
        if (active && res && res.data && res.data.code === 200) {
          setTdsPreview(res.data.data)
        }
      } catch {
        if (active) setTdsPreview(null)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [selectedSupplier, calculation.totalTaxable, calculation.roundedInvoiceTotal, tdsSection, lowerCertNo, lowerCertRate])

  const gstinValid = isValidGSTIN(supplierGstin)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!gstinValid) {
        message.error('Supplier GSTIN is invalid (Rule 46 Luhn Mod-36 Checksum Failure).')
        return
      }

      setSubmitting(true)
      const payload: GstPurchaseInvoiceCreateRequest = {
        invoiceNumber: values.invoiceNumber,
        supplierId: values.supplierId,
        supplierGstin: supplierGstin,
        placeOfSupply: placeOfSupply,
        isRcm: isRcm,
        isSez: isSez,
        poHeaderId: values.poHeaderId,
        tdsSection: tdsSection !== 'NONE' ? tdsSection : undefined,
        lowerCertNo: lowerCertNo.trim() || undefined,
        lowerCertRate: lowerCertRate !== undefined ? Number(lowerCertRate) / 100.0 : undefined,
        items: items,
      }

      await createPurchaseInvoice(payload)
      message.success(`Statutory GST Purchase Invoice ${values.invoiceNumber} created successfully.`)
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err.message || 'Failed to create purchase invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<GstPurchaseInvoiceItem> = [
    {
      title: 'Material Description',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (v: string, _, idx: number) => (
        <Input
          value={v}
          onChange={(e) => handleItemChange(idx, 'materialName', e.target.value)}
          placeholder="Item name"
        />
      ),
    },
    {
      title: 'HSN/SAC',
      dataIndex: 'hsnSacCode',
      key: 'hsnSacCode',
      width: 120,
      render: (v: string, _, idx: number) => (
        <Input
          value={v}
          maxLength={8}
          onChange={(e) => handleItemChange(idx, 'hsnSacCode', e.target.value)}
          placeholder="e.g. 84821010"
        />
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0.01}
          precision={2}
          value={v}
          onChange={(val) => handleItemChange(idx, 'quantity', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0}
          precision={2}
          value={v}
          onChange={(val) => handleItemChange(idx, 'unitPrice', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'GST %',
      dataIndex: 'gstRate',
      key: 'gstRate',
      width: 100,
      render: (v: number, _, idx: number) => (
        <Select
          value={v}
          onChange={(val) => handleItemChange(idx, 'gstRate', val)}
          style={{ width: '100%' }}
        >
          <Select.Option value={0}>0%</Select.Option>
          <Select.Option value={5}>5%</Select.Option>
          <Select.Option value={12}>12%</Select.Option>
          <Select.Option value={18}>18%</Select.Option>
          <Select.Option value={28}>28%</Select.Option>
        </Select>
      ),
    },
    {
      title: 'ITC Status',
      key: 'itc',
      width: 220,
      render: (_, record: GstPurchaseInvoiceItem, idx: number) => {
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space>
              <Switch
                checked={record.itcEligible}
                checkedChildren="Eligible"
                unCheckedChildren="Blocked"
                onChange={(checked) => handleItemChange(idx, 'itcEligible', checked)}
              />
              {!record.itcEligible && (
                <Tag color="orange">Capitalized in Cost</Tag>
              )}
            </Space>

            {!record.itcEligible && (
              <Select
                value={record.itcBlockReason}
                onChange={(val) => handleItemChange(idx, 'itcBlockReason', val)}
                size="small"
                style={{ width: '100%' }}
              >
                <Select.Option value="SEC_17_5_MOTOR_VEHICLE">Sec 17(5)(a) Motor Vehicle</Select.Option>
                <Select.Option value="SEC_17_5_FOOD_BEVERAGES">Sec 17(5)(b) Food & Beverages</Select.Option>
                <Select.Option value="SEC_17_5_PERSONAL_CONSUMPTION">Sec 17(5)(g) Personal Use</Select.Option>
                <Select.Option value="SEC_17_5_FREE_SAMPLES">Sec 17(5)(h) Free Samples</Select.Option>
                <Select.Option value="SEC_17_5_LOST_STOLEN">Sec 17(5)(h) Lost/Stolen</Select.Option>
              </Select>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      align: 'center',
      render: (_, __, idx: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItemRow(idx)}
        />
      ),
    },
  ]

  return (
    <Modal
      title="Create Statutory Indian GST Purchase Invoice (Section 10/16/17 & Rule 46)"
      open={visible}
      onCancel={onClose}
      width={1150}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={!gstinValid || items.length === 0}
          onClick={handleSubmit}
        >
          Create Purchase Invoice
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={{ placeOfSupply: '27' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="invoiceNumber"
                label="Supplier Bill / Invoice Number"
                rules={[{ required: true, message: 'Vendor Bill Number is required' }]}
              >
                <Input placeholder="e.g. BILL-2026-001" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="supplierId"
                label="Supplier (Vendor)"
                rules={[{ required: true, message: 'Select supplier' }]}
              >
                <Select
                  placeholder="Select supplier..."
                  onChange={handleSupplierChange}
                  showSearch
                  filterOption={(input, option: any) =>
                    (option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {supplierList.map((s) => (
                    <Select.Option key={s.id} value={s.id}>
                      {s.supplier}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="supplierGstin"
                label="Supplier GSTIN"
                rules={[{ required: true, message: 'GSTIN is required' }]}
              >
                <Input
                  value={supplierGstin}
                  maxLength={15}
                  onChange={(e) => {
                    setSupplierGstin(e.target.value.toUpperCase())
                    form.setFieldsValue({ supplierGstin: e.target.value.toUpperCase() })
                  }}
                  placeholder="15-char GSTIN"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="placeOfSupply"
                label="Place of Supply (POS State Code)"
                rules={[{ required: true, message: 'Select POS State' }]}
              >
                <Select value={placeOfSupply} onChange={(val) => setPlaceOfSupply(val)}>
                  <Select.Option value="27">27 - Maharashtra</Select.Option>
                  <Select.Option value="29">29 - Karnataka</Select.Option>
                  <Select.Option value="07">07 - Delhi</Select.Option>
                  <Select.Option value="24">24 - Gujarat</Select.Option>
                  <Select.Option value="36">36 - Telangana</Select.Option>
                  <Select.Option value="33">33 - Tamil Nadu</Select.Option>
                  <Select.Option value="06">06 - Haryana</Select.Option>
                  <Select.Option value="09">09 - Uttar Pradesh</Select.Option>
                  <Select.Option value="19">19 - West Bengal</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="poHeaderId" label="Purchase Order Reference (Optional)">
                <Select
                  placeholder="Link approved PO..."
                  onChange={handlePoChange}
                  allowClear
                  showSearch
                >
                  {approvedPoList.map((po) => (
                    <Select.Option key={po.id} value={po.id}>
                      {po.number} ({po.organName})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Reverse Charge (RCM) Sec 9(3)/9(4)">
                <Switch
                  checked={isRcm}
                  onChange={(val) => setIsRcm(val)}
                  checkedChildren="RCM YES"
                  unCheckedChildren="RCM NO"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SEZ Supply">
                <Switch
                  checked={isSez}
                  onChange={(val) => setIsSez(val)}
                  checkedChildren="SEZ"
                  unCheckedChildren="DOMESTIC"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Descriptions size="small" bordered column={1}>
                <Descriptions.Item label="Determined Supply Type">
                  <Tag color={isIntraState ? 'blue' : 'purple'}>
                    {supplyType} {isIntraState ? '(CGST + SGST)' : '(IGST)'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>

          {/* GSTIN Checksum Alert */}
          {supplierGstin && !gstinValid && (
            <Alert
              type="error"
              showIcon
              message="Rule 46 Invalid Supplier GSTIN"
              description="The provided GSTIN fails standard format or Luhn Mod-36 checksum validation. Invoice creation will be blocked."
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Direct Tax Statutory TDS Configuration */}
          <Divider titlePlacement="start" plain>
            Direct Tax Statutory TDS Withholding (Income-tax Act)
          </Divider>

          <Row gutter={16}>
            <Col span={tdsSection !== 'NONE' ? 8 : 12}>
              <Form.Item label="Statutory TDS Deduction Section">
                <Select
                  value={tdsSection}
                  onChange={(val) => setTdsSection(val)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="NONE">None / No TDS Withholding</Select.Option>
                  <Select.Option value="194Q">Sec 194Q — Goods &gt; ₹50L (0.10%) [Acct 2338]</Select.Option>
                  <Select.Option value="194C">Sec 194C — Contractor / Work (1% / 2%) [Acct 2335]</Select.Option>
                  <Select.Option value="194J_TECH">Sec 194J(1)(b) — Technical Services / FTS (2%) [Acct 2336]</Select.Option>
                  <Select.Option value="194J_PROF">Sec 194J(1)(a) — Professional Fees (10%) [Acct 2336]</Select.Option>
                  <Select.Option value="194J_DIRECTOR">Sec 194J(1)(ba) — Director Remuneration (10%, ₹0 threshold) [Acct 2336]</Select.Option>
                  <Select.Option value="194I_PM">Sec 194I(a) — Rent: Plant &amp; Machinery (2%) [Acct 2337]</Select.Option>
                  <Select.Option value="194I_LAND">Sec 194I(b) — Rent: Land &amp; Building (10%) [Acct 2337]</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            {tdsSection !== 'NONE' && (
              <>
                <Col span={8}>
                  <Form.Item label="Section 197 Lower Deduction Cert No">
                    <Input
                      placeholder="e.g. 197-CERT-2026-01"
                      value={lowerCertNo}
                      onChange={(e) => setLowerCertNo(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Section 197 Concessional Rate (%)">
                    <InputNumber
                      min={0}
                      max={100}
                      precision={2}
                      placeholder="e.g. 1.50"
                      value={lowerCertRate}
                      onChange={(val) => setLowerCertRate(val !== null ? val : undefined)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          <Divider titlePlacement="start" plain>
            Invoice Line Items & Section 17(5) ITC Mapping
          </Divider>

          <Table
            columns={columns}
            dataSource={items}
            rowKey="materialId"
            pagination={false}
            size="small"
            bordered
            footer={() => (
              <Button type="dashed" icon={<PlusOutlined />} onClick={addItemRow} block>
                Add Item Line
              </Button>
            )}
          />

          {/* Live Statutory Tax Summary */}
          <Card size="small" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="Taxable Value"
                  value={calculation.totalTaxable}
                  precision={2}
                  prefix="₹"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title={isIntraState ? 'CGST (50%)' : 'IGST'}
                  value={isIntraState ? calculation.totalCgst : calculation.totalIgst}
                  precision={2}
                  prefix="₹"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title={isIntraState ? 'SGST (50%)' : 'Rounding Adj.'}
                  value={isIntraState ? calculation.totalSgst : calculation.roundingAdj}
                  precision={2}
                  prefix="₹"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Gross Invoice"
                  value={calculation.roundedInvoiceTotal}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ fontWeight: 600 }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title={
                    tdsPreview && tdsPreview.isDeductionRequired
                      ? `TDS (${tdsPreview.sectionCode} @ ${(tdsPreview.effectiveRate * 100).toFixed(2)}%)`
                      : 'TDS Withholding'
                  }
                  value={tdsPreview && tdsPreview.isDeductionRequired ? tdsPreview.tdsAmount : 0}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Net AP (Cr 2320)"
                  value={
                    tdsPreview && tdsPreview.isDeductionRequired
                      ? tdsPreview.netPayableAmount
                      : calculation.roundedInvoiceTotal
                  }
                  precision={2}
                  prefix="₹"
                  valueStyle={{ fontWeight: 700, color: '#1890ff' }}
                />
              </Col>
            </Row>

            {tdsPreview && tdsPreview.isDeductionRequired && (
              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <span>
                        <strong>Statutory TDS Deduction Determined:</strong> Section {tdsPreview.sectionCode} (Account {tdsPreview.tdsAccountCode}) at rate {(tdsPreview.effectiveRate * 100).toFixed(2)}%. Taxable Base: ₹{tdsPreview.taxableBaseAmount?.toFixed(2)}, TDS Withheld: ₹{tdsPreview.tdsAmount?.toFixed(2)}, Net Payable to Supplier: ₹{tdsPreview.netPayableAmount?.toFixed(2)}. <em>({tdsPreview.reason})</em>
                      </span>
                    }
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Form>
      </Spin>
    </Modal>
  )
}
