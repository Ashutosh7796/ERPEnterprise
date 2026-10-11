import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Checkbox,
  Button,
  Table,
  Space,
  Row,
  Col,
  Typography,
  Card,
  Tag,
  Alert,
  message,
} from 'antd'
import {
  RollbackOutlined,
  PlusOutlined,
  DeleteOutlined,
  CarOutlined,
  WarningOutlined,
  CalculatorOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { createPurchaseReturn, type ProcurementReturnCreateRequest, type ProcurementReturnLine } from '../api/procurementApi'

const { Option } = Select
const { Text, Title } = Typography

interface PurchaseReturnCreateModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const PurchaseReturnCreateModal: React.FC<PurchaseReturnCreateModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [returnType, setReturnType] = useState<'PHYSICAL_RETURN' | 'COMMERCIAL_ADJUSTMENT'>('PHYSICAL_RETURN')
  const [isItcEligible, setIsItcEligible] = useState<boolean>(true)
  const [lines, setLines] = useState<ProcurementReturnLine[]>([
    {
      materialId: 201,
      materialName: 'Precision Bearing SKU-1001',
      depotId: 1,
      returnQuantity: 5,
      unitPrice: 1000,
      gstRate: 18,
      batchNumber: 'BATCH-2026-A1',
    },
  ])

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        supplierId: 1,
        supplierName: 'National Components Ltd',
        originalInvoiceNumber: 'INV-2026-0042',
        depotId: 1,
        returnType: 'PHYSICAL_RETURN',
        returnDate: dayjs(),
        returnReason: 'DEFECTIVE_GOODS',
        isItcEligible: true,
        deliveryChallanRequired: true,
        vehicleNumber: 'MH12AB9999',
        transporterName: 'Express Logistics India',
      })
      setReturnType('PHYSICAL_RETURN')
      setIsItcEligible(true)
    }
  }, [visible, form])

  // Calculation helpers
  const calculateTaxable = () => {
    return lines.reduce((sum, item) => sum + (item.returnQuantity || 0) * (item.unitPrice || 0), 0)
  }

  const calculateTotalTax = () => {
    return lines.reduce((sum, item) => {
      const taxable = (item.returnQuantity || 0) * (item.unitPrice || 0)
      return sum + (taxable * (item.gstRate || 0)) / 100
    }, 0)
  }

  const taxableAmount = calculateTaxable()
  const totalTax = calculateTotalTax()
  const cgstAmount = totalTax / 2
  const sgstAmount = totalTax / 2
  const grossReturnAmount = taxableAmount + totalTax

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        materialId: Date.now(),
        materialName: 'Standard Spare Part',
        depotId: 1,
        returnQuantity: 1,
        unitPrice: 500,
        gstRate: 18,
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      message.warning('At least one item line is required to process the return.')
      return
    }
    const updated = [...lines]
    updated.splice(index, 1)
    setLines(updated)
  }

  const handleUpdateLine = (index: number, field: keyof ProcurementReturnLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload: ProcurementReturnCreateRequest = {
        supplierId: values.supplierId,
        supplierName: values.supplierName,
        originalInvoiceNumber: values.originalInvoiceNumber,
        depotId: values.depotId,
        returnType: returnType,
        returnDate: values.returnDate.format('YYYY-MM-DD'),
        returnReason: values.returnReason,
        isItcEligible: isItcEligible,
        deliveryChallanRequired: returnType === 'PHYSICAL_RETURN' && values.deliveryChallanRequired,
        vehicleNumber: values.vehicleNumber,
        transporterName: values.transporterName,
        remarks: values.remarks,
        lines: lines,
      }

      await createPurchaseReturn(payload)
      message.success('Purchase Return created and posted to General Ledger successfully.')
      onSuccess()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err.message || 'Failed to create Purchase Return.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Item / Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: '28%',
      render: (text: string, row: ProcurementReturnLine, idx: number) => (
        <Input
          value={text}
          placeholder="Material description"
          onChange={(e) => handleUpdateLine(idx, 'materialName', e.target.value)}
        />
      ),
    },
    {
      title: 'Return Quantity',
      dataIndex: 'returnQuantity',
      key: 'returnQuantity',
      width: '16%',
      render: (val: number, row: ProcurementReturnLine, idx: number) => (
        <InputNumber
          min={0.01}
          value={val}
          style={{ width: '100%' }}
          onChange={(v) => handleUpdateLine(idx, 'returnQuantity', v || 0)}
        />
      ),
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: '18%',
      render: (val: number, row: ProcurementReturnLine, idx: number) => (
        <InputNumber
          min={0}
          precision={2}
          value={val}
          style={{ width: '100%' }}
          onChange={(v) => handleUpdateLine(idx, 'unitPrice', v || 0)}
        />
      ),
    },
    {
      title: 'GST %',
      dataIndex: 'gstRate',
      key: 'gstRate',
      width: '14%',
      render: (val: number, row: ProcurementReturnLine, idx: number) => (
        <Select
          value={val}
          style={{ width: '100%' }}
          onChange={(v) => handleUpdateLine(idx, 'gstRate', v)}
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
      key: 'total',
      width: '18%',
      render: (_: any, row: ProcurementReturnLine) => {
        const taxable = (row.returnQuantity || 0) * (row.unitPrice || 0)
        const tax = (taxable * (row.gstRate || 0)) / 100
        return <Text strong>₹{(taxable + tax).toFixed(2)}</Text>
      },
    },
    {
      title: '',
      key: 'action',
      width: '6%',
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLine(idx)}
        />
      ),
    },
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RollbackOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          <span>Create Purchase Return / Supplier Adjustment</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Post Return & General Ledger Reversal"
      width={950}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Return Operation Type" required>
              <Radio.Group
                value={returnType}
                onChange={(e) => {
                  setReturnType(e.target.value)
                  form.setFieldValue('returnType', e.target.value)
                }}
                buttonStyle="solid"
              >
                <Radio.Button value="PHYSICAL_RETURN">Physical Goods Return</Radio.Button>
                <Radio.Button value="COMMERCIAL_ADJUSTMENT">Commercial Rate Adjustment</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="ITC Tax Eligibility (Section 17(5))">
              <Checkbox
                checked={isItcEligible}
                onChange={(e) => setIsItcEligible(e.target.checked)}
              >
                ITC Eligible (Normal Tax Credit Reversal)
              </Checkbox>
              {!isItcEligible && (
                <div style={{ marginTop: 4 }}>
                  <Tag color="volcano" icon={<WarningOutlined />}>
                    Blocked ITC (Sec 17(5)): Reverses Capitalized Asset Cost, Zero GST Reversal
                  </Tag>
                </div>
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="supplierName"
              label="Supplier"
              rules={[{ required: true, message: 'Please select a supplier.' }]}
            >
              <Input placeholder="Supplier Name" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="originalInvoiceNumber" label="Original Invoice Reference">
              <Input placeholder="e.g. INV-2026-0042" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="returnReason"
              label="Return Reason"
              rules={[{ required: true, message: 'Please select a return reason.' }]}
            >
              <Select placeholder="Select Reason">
                <Option value="DEFECTIVE_GOODS">Defective / Damaged Goods</Option>
                <Option value="QUALITY_REJECTION">QC Rejection / Spec Mismatch</Option>
                <Option value="WRONG_SPECIFICATION">Wrong Item Delivered</Option>
                <Option value="PRICING_DISCREPANCY">Commercial Rate Variance</Option>
                <Option value="EXCESS_DELIVERY">Excess Over Purchase Order</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {returnType === 'PHYSICAL_RETURN' && (
          <Card size="small" title="Outward Transport & Rule 55 Delivery Challan" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="vehicleNumber" label="Vehicle Number">
                  <Input prefix={<CarOutlined />} placeholder="e.g. MH12AB9999" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="transporterName" label="Transporter Name">
                  <Input placeholder="Transporter / Carrier" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="deliveryChallanRequired" valuePropName="checked" label="Delivery Challan">
                  <Checkbox defaultChecked>Generate Rule 55 Triplicate Challan</Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>Return Item Lines</Title>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLine}>
            Add Line Item
          </Button>
        </div>

        <Table
          size="small"
          columns={columns}
          dataSource={lines}
          rowKey={(r, i) => String(r.materialId || i)}
          pagination={false}
          style={{ marginBottom: 16 }}
        />

        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row gutter={16} align="middle">
            <Col span={14}>
              <Text strong>Double-Entry Accounting Reversal Preview:</Text>
              <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                • <b>Dr 2101 Accounts Payable</b>: ₹{grossReturnAmount.toFixed(2)}<br />
                • <b>Cr {returnType === 'COMMERCIAL_ADJUSTMENT' ? '5105 PPV' : '1401 Inventory Asset'}</b>: ₹{(isItcEligible ? taxableAmount : grossReturnAmount).toFixed(2)}<br />
                {isItcEligible && totalTax > 0 && (
                  <>
                    • <b>Cr 1301/1302 Input GST (GSTR-3B Table 4(B)(2))</b>: ₹{totalTax.toFixed(2)}
                  </>
                )}
              </div>
            </Col>
            <Col span={10}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>Taxable Value: ₹{taxableAmount.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>GST Reversal: ₹{totalTax.toFixed(2)} (CGST ₹{cgstAmount.toFixed(2)} + SGST ₹{sgstAmount.toFixed(2)})</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#cf1322', marginTop: 4 }}>
                  Total Return Amount: ₹{grossReturnAmount.toFixed(2)}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  )
}
