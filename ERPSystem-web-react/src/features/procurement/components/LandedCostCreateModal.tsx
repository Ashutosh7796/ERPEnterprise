import React, { useState, useMemo } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Table,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons'
import {
  createLandedCostVoucher,
  LandedCostGrnAllocationItem,
  LandedCostVoucherCreateRequest,
} from '../api/procurementApi'

const { Text } = Typography

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const LandedCostCreateModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [apportionmentMethod, setApportionmentMethod] = useState<'VALUE' | 'WEIGHT' | 'QUANTITY'>('VALUE')
  const [totalCostAmount, setTotalCostAmount] = useState<number>(5000)

  const [items, setItems] = useState<LandedCostGrnAllocationItem[]>([
    {
      grnHeaderId: 6001,
      materialId: 101,
      materialName: 'Industrial Fasteners',
      depotId: 1,
      receivedQuantity: 100,
      taxableValue: 50000,
      weightKg: 250,
    },
    {
      grnHeaderId: 6002,
      materialId: 102,
      materialName: 'Precision Bearings',
      depotId: 1,
      receivedQuantity: 50,
      taxableValue: 75000,
      weightKg: 100,
    },
  ])

  const calculatedAllocations = useMemo(() => {
    let totalBasis = 0
    items.forEach((item) => {
      if (apportionmentMethod === 'WEIGHT') {
        totalBasis += Number(item.weightKg || 1)
      } else if (apportionmentMethod === 'QUANTITY') {
        totalBasis += Number(item.receivedQuantity || 1)
      } else {
        totalBasis += Number(item.taxableValue || 1)
      }
    })

    if (totalBasis <= 0) totalBasis = items.length || 1

    let runningSum = 0
    return items.map((item, idx) => {
      let basis = 1
      if (apportionmentMethod === 'WEIGHT') {
        basis = Number(item.weightKg || 1)
      } else if (apportionmentMethod === 'QUANTITY') {
        basis = Number(item.receivedQuantity || 1)
      } else {
        basis = Number(item.taxableValue || 1)
      }

      let alloc = 0
      if (idx === items.length - 1) {
        alloc = totalCostAmount - runningSum
      } else {
        alloc = (totalCostAmount * basis) / totalBasis
        runningSum += alloc
      }

      const roundedAlloc = Math.round(alloc * 100) / 100
      return {
        ...item,
        allocatedCost: roundedAlloc,
        basisRatio: ((basis / totalBasis) * 100).toFixed(2),
      }
    })
  }, [items, apportionmentMethod, totalCostAmount])

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        grnHeaderId: 6000 + items.length + 1,
        materialId: 100 + items.length + 1,
        materialName: `Material #${100 + items.length + 1}`,
        depotId: 1,
        receivedQuantity: 20,
        taxableValue: 20000,
        weightKg: 50,
      },
    ])
  }

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      message.warning('At least one GRN line item is required for landed cost apportionment.')
      return
    }
    setItems(items.filter((_, i) => i !== idx))
  }

  const handleItemChange = (idx: number, field: keyof LandedCostGrnAllocationItem, value: any) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload: LandedCostVoucherCreateRequest = {
        voucherNumber: values.voucherNumber,
        vendorName: values.vendorName,
        costType: values.costType,
        apportionmentMethod: apportionmentMethod,
        totalCostAmount: totalCostAmount,
        remark: values.remark,
        grnAllocations: items,
      }
      await createLandedCostVoucher(payload)
      message.success('Landed Cost Voucher created successfully.')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err.message || 'Failed to create Landed Cost Voucher')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<any> = [
    {
      title: 'GRN Doc #',
      dataIndex: 'grnHeaderId',
      key: 'grnHeaderId',
      width: 110,
      render: (v: number, _, idx: number) => (
        <InputNumber
          value={v}
          onChange={(val) => handleItemChange(idx, 'grnHeaderId', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Material Name',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (v: string, _, idx: number) => (
        <Input
          value={v}
          onChange={(e) => handleItemChange(idx, 'materialName', e.target.value)}
          placeholder="Material description"
        />
      ),
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      width: 120,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={1}
          value={v}
          onChange={(val) => handleItemChange(idx, 'receivedQuantity', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Taxable Value (₹)',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      width: 140,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0}
          value={v}
          onChange={(val) => handleItemChange(idx, 'taxableValue', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Weight (kg)',
      dataIndex: 'weightKg',
      key: 'weightKg',
      width: 120,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0}
          value={v}
          onChange={(val) => handleItemChange(idx, 'weightKg', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Share %',
      dataIndex: 'basisRatio',
      key: 'basisRatio',
      width: 90,
      align: 'right',
      render: (v: string) => <Tag color="blue">{v}%</Tag>,
    },
    {
      title: 'Allocated Cost',
      dataIndex: 'allocatedCost',
      key: 'allocatedCost',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          ₹{Number(v || 0).toFixed(2)}
        </Text>
      ),
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
          onClick={() => handleRemoveItem(idx)}
        />
      ),
    },
  ]

  return (
    <Modal
      title="Create Landed Cost Voucher (Ind AS 2 Acquisition Capitalization)"
      open={visible}
      onCancel={onClose}
      width={1050}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={items.length === 0 || totalCostAmount <= 0}
          onClick={handleSubmit}
        >
          Create Landed Cost Voucher
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          costType: 'FREIGHT',
          totalCostAmount: 5000,
          vendorName: 'Global Logistics & Freight Express',
        }}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="costType"
              label="Landed Cost Charge Type"
              rules={[{ required: true, message: 'Select charge type' }]}
            >
              <Select>
                <Select.Option value="FREIGHT">Inward Freight & Carriage</Select.Option>
                <Select.Option value="CUSTOMS_DUTY">Customs Duties (BCD/SWS/AIDC)</Select.Option>
                <Select.Option value="INSURANCE">Transit Insurance</Select.Option>
                <Select.Option value="CLEARING_CHARGES">Port & C&F Clearing Charges</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="vendorName"
              label="Service Provider / Transporter"
              rules={[{ required: true, message: 'Enter provider name' }]}
            >
              <Input placeholder="e.g. Transporter Ltd." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Total Incurred Cost Amount (₹)" required>
              <InputNumber
                min={1}
                value={totalCostAmount}
                onChange={(val) => setTotalCostAmount(val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Apportionment Method" required>
              <Select
                value={apportionmentMethod}
                onChange={(val) => setApportionmentMethod(val)}
              >
                <Select.Option value="VALUE">By Taxable Value (Gross ₹)</Select.Option>
                <Select.Option value="WEIGHT">By Net Weight (kg)</Select.Option>
                <Select.Option value="QUANTITY">By Item Quantity (Units)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start" plain>
          Target Goods Receipts (GRN Lines) for Cost Capitalization
        </Divider>

        <Table
          columns={columns}
          dataSource={calculatedAllocations}
          rowKey={(r, idx) => `${r.grnHeaderId}_${idx}`}
          pagination={false}
          size="small"
          bordered
          footer={() => (
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} block>
              Add GRN Line Allocation Target
            </Button>
          )}
        />

        <Card size="small" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Total Landed Cost to Capitalize"
                value={totalCostAmount}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Apportionment Strategy"
                value={
                  apportionmentMethod === 'VALUE'
                    ? 'Proportional to Taxable Value'
                    : apportionmentMethod === 'WEIGHT'
                    ? 'Proportional to Net Weight (kg)'
                    : 'Proportional to Piece Quantity'
                }
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Ind AS 2 Valuation Effect"
                value="Auto-split: On-Hand -> Asset (1401), Dispatched -> COGS (5101)"
                valueStyle={{ fontSize: 13, color: '#3f8600' }}
              />
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  )
}
