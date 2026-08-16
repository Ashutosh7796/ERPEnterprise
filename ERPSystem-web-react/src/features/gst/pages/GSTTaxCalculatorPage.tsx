import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Table, InputNumber, Row, Col, Space, Tag, Typography, Switch, Divider, Alert } from 'antd'
import { CalculatorOutlined, PlusOutlined, DeleteOutlined, SafetyCertificateOutlined, SwapOutlined } from '@ant-design/icons'
import { StateSelect } from '../components/StateSelect'
import { GSTINInput } from '../components/GSTINInput'
import { GSTBreakdownBadge } from '../components/GSTBreakdownBadge'
import { gstApi } from '../api/gstApi'
import type { GSTTaxLineItemInput, GSTTaxCalculationResult } from '../types'

const { Title, Text } = Typography

export const GSTTaxCalculatorPage: React.FC = () => {
  const [form] = Form.useForm()
  const [supplierState, setSupplierState] = useState('27')
  const [posState, setPosState] = useState('27')
  const [customerGstin, setCustomerGstin] = useState('')
  const [isRcm, setIsRcm] = useState(false)
  const [items, setItems] = useState<GSTTaxLineItemInput[]>([
    {
      name: 'Sample Industrial Component A',
      hsnSacCode: '8471',
      quantity: 2,
      unitPrice: 1500,
      discountRate: 0,
      discountAmount: 0,
      gstRate: 18,
      cessRate: 0,
      cessSpecificRate: 0,
    },
    {
      name: 'Sample Industrial Material B',
      hsnSacCode: '7208',
      quantity: 5,
      unitPrice: 800,
      discountRate: 5,
      discountAmount: 0,
      gstRate: 18,
      cessRate: 0,
      cessSpecificRate: 0,
    },
  ])
  const [calcResult, setCalcResult] = useState<GSTTaxCalculationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const recalculate = async (
    currentItems: GSTTaxLineItemInput[] = items,
    sState: string = supplierState,
    pState: string = posState,
    cGstin: string = customerGstin,
    rcm: boolean = isRcm
  ) => {
    setLoading(true)
    try {
      const validItems = (currentItems || []).map((it) => ({
        ...it,
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice || 0),
        discountRate: Number(it.discountRate || 0),
        discountAmount: Number(it.discountAmount || 0),
        gstRate: Number(it.gstRate || 0),
        cessRate: Number(it.cessRate || 0),
        cessSpecificRate: Number(it.cessSpecificRate || 0),
      }))

      const res = await gstApi.calculateTax({
        supplierStateCode: sState || '27',
        posStateCode: pState || sState || '27',
        customerGstin: cGstin || undefined,
        isRcm: rcm,
        items: validItems,
      })
      if (res.data?.result) {
        setCalcResult(res.data.result)
      }
    } catch (err: any) {
      console.error('Calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    recalculate()
  }, [])

  const handleItemChange = (index: number, field: keyof GSTTaxLineItemInput, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
    recalculate(updated, supplierState, posState, customerGstin, isRcm)
  }

  const addItem = () => {
    const newItem: GSTTaxLineItemInput = {
      name: `Line Item ${items.length + 1}`,
      hsnSacCode: '8504',
      quantity: 1,
      unitPrice: 1000,
      discountRate: 0,
      discountAmount: 0,
      gstRate: 18,
      cessRate: 0,
      cessSpecificRate: 0,
    }
    const updated = [...items, newItem]
    setItems(updated)
    recalculate(updated, supplierState, posState, customerGstin, isRcm)
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    recalculate(updated, supplierState, posState, customerGstin, isRcm)
  }

  const columns = [
    {
      title: 'Item Description',
      dataIndex: 'name',
      key: 'name',
      render: (val: string, _: any, idx: number) => (
        <Input
          value={val}
          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
          placeholder="Item Name"
        />
      ),
    },
    {
      title: 'HSN / SAC',
      dataIndex: 'hsnSacCode',
      key: 'hsnSacCode',
      width: 110,
      render: (val: string, _: any, idx: number) => (
        <Input
          value={val}
          onChange={(e) => handleItemChange(idx, 'hsnSacCode', e.target.value)}
          placeholder="HSN"
        />
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0.01}
          value={val}
          onChange={(v) => handleItemChange(idx, 'quantity', v || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Price (₹)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 130,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          value={val}
          onChange={(v) => handleItemChange(idx, 'unitPrice', v || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Discount %',
      dataIndex: 'discountRate',
      key: 'discountRate',
      width: 100,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          max={100}
          value={val}
          onChange={(v) => handleItemChange(idx, 'discountRate', v || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'GST %',
      dataIndex: 'gstRate',
      key: 'gstRate',
      width: 100,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          max={100}
          value={val}
          onChange={(v) => handleItemChange(idx, 'gstRate', v || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Cess %',
      dataIndex: 'cessRate',
      key: 'cessRate',
      width: 90,
      render: (val: number, _: any, idx: number) => (
        <InputNumber
          min={0}
          max={100}
          value={val}
          onChange={(v) => handleItemChange(idx, 'cessRate', v || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Line Tax',
      key: 'tax',
      width: 150,
      render: (_: any, __: any, idx: number) => {
        const lineRes = calcResult?.items?.[idx]
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#059669' }}>
              ₹{lineRes?.totalTaxAmount?.toFixed(2) || '0.00'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Taxable: ₹{lineRes?.taxableValue?.toFixed(2) || '0.00'}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Line Total',
      key: 'total',
      width: 130,
      render: (_: any, __: any, idx: number) => {
        const lineRes = calcResult?.items?.[idx]
        return (
          <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
            ₹{lineRes?.lineTotal?.toFixed(2) || '0.00'}
          </Text>
        )
      },
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(idx)}
          disabled={items.length <= 1}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <CalculatorOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Interactive Indian GST Tax Calculation Sandbox & Simulator</span>
          </Space>
        }
        variant="outlined"
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Text strong>Supplier State:</Text>
            <div style={{ marginTop: 4 }}>
              <StateSelect
                value={supplierState}
                onChange={(code) => {
                  setSupplierState(code)
                  recalculate(items, code, posState, customerGstin, isRcm)
                }}
              />
            </div>
          </Col>
          <Col span={6}>
            <Text strong>Place of Supply (POS):</Text>
            <div style={{ marginTop: 4 }}>
              <StateSelect
                value={posState}
                onChange={(code) => {
                  setPosState(code)
                  recalculate(items, supplierState, code, customerGstin, isRcm)
                }}
              />
            </div>
          </Col>
          <Col span={8}>
            <Text strong>Customer GSTIN (Optional):</Text>
            <div style={{ marginTop: 4 }}>
              <GSTINInput
                value={customerGstin}
                onChange={(val) => {
                  setCustomerGstin(val)
                  recalculate(items, supplierState, posState, val, isRcm)
                }}
              />
            </div>
          </Col>
          <Col span={4}>
            <Text strong>Reverse Charge (RCM):</Text>
            <div style={{ marginTop: 8 }}>
              <Switch
                checked={isRcm}
                onChange={(chk) => {
                  setIsRcm(chk)
                  recalculate(items, supplierState, posState, customerGstin, chk)
                }}
              />
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color={calcResult?.supplyType === 'INTRA_STATE' ? 'blue' : 'purple'} style={{ fontSize: 13, padding: '4px 10px' }}>
              <SwapOutlined style={{ marginRight: 4 }} />
              Supply: {calcResult?.supplyType === 'INTRA_STATE' ? 'INTRA-STATE (CGST + SGST)' : 'INTER-STATE (IGST)'}
            </Tag>
            <Tag color="geekblue" style={{ fontSize: 13, padding: '4px 10px' }}>
              Category: {calcResult?.transactionType || 'B2B'}
            </Tag>
            {isRcm && <Tag color="magenta">RCM Applicable</Tag>}
          </Space>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
            Add Line Item
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey={(_, idx) => String(idx)}
          pagination={false}
          loading={loading}
        />

        <Divider style={{ margin: '20px 0 16px' }} />

        <Row gutter={[24, 16]}>
          <Col span={14}>
            <Alert
              title="Total Invoice Amount in Words (Indian Numbering Format):"
              description={<Text strong style={{ color: '#1e293b', fontSize: 14 }}>{calcResult?.amountInWords || '-'}</Text>}
              type="success"
              showIcon
            />
          </Col>
          <Col span={10}>
            <Card size="small" style={{ background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Total Taxable Value:</Text>
                <Text strong>₹{calcResult?.totalTaxableValue?.toFixed(2) || '0.00'}</Text>
              </div>

              {calcResult?.supplyType === 'INTRA_STATE' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text type="secondary">Central GST (CGST):</Text>
                    <Text style={{ color: '#2563eb', fontWeight: 600 }}>₹{calcResult?.totalCgstAmount?.toFixed(2) || '0.00'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text type="secondary">State/UT GST (SGST):</Text>
                    <Text style={{ color: '#0891b2', fontWeight: 600 }}>₹{calcResult?.totalSgstAmount?.toFixed(2) || '0.00'}</Text>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text type="secondary">Integrated GST (IGST):</Text>
                  <Text style={{ color: '#7c3aed', fontWeight: 600 }}>₹{calcResult?.totalIgstAmount?.toFixed(2) || '0.00'}</Text>
                </div>
              )}

              {Number(calcResult?.totalCessAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text type="secondary">Compensation Cess:</Text>
                  <Text style={{ color: '#ea580c', fontWeight: 600 }}>₹{calcResult?.totalCessAmount?.toFixed(2) || '0.00'}</Text>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Total Statutory Tax:</Text>
                <Text strong style={{ color: '#16a34a' }}>₹{calcResult?.totalTaxAmount?.toFixed(2) || '0.00'}</Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Round Off (+/-):</Text>
                <Text>₹{calcResult?.roundOffAmount?.toFixed(2) || '0.00'}</Text>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16 }}>Final Net Payable:</Text>
                <Text strong style={{ fontSize: 20, color: '#1e293b' }}>
                  ₹{calcResult?.finalInvoiceTotal?.toFixed(2) || '0.00'}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
