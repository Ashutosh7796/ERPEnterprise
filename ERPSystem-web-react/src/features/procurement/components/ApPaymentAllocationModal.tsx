import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Table,
  Button,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Divider,
  message,
} from 'antd'
import {
  allocateApPayment,
  ApPaymentAllocationRequest,
  ApPaymentAllocationLine,
} from '../api/procurementApi'

const { Text, Title } = Typography

interface OpenInvoiceRow {
  id: number
  invoiceNumber: string
  invoiceDate: string
  grossAmount: number
  paidAmount: number
  openBalance: number
  allocationAmount: number
  discountAmount: number
  tdsAmount: number
}

interface ApPaymentAllocationModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  supplierId?: number
  supplierName?: string
  initialInvoices?: any[]
}

export const ApPaymentAllocationModal: React.FC<ApPaymentAllocationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  supplierId,
  supplierName,
  initialInvoices = [],
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<OpenInvoiceRow[]>([])
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [bankAccountId, setBankAccountId] = useState<number>(1)
  const [remarks, setRemarks] = useState<string>('')

  useEffect(() => {
    if (visible) {
      const rows: OpenInvoiceRow[] = (initialInvoices || []).map((inv: any) => {
        const gross = inv.totalInvoiceAmount || inv.totalPrice || 0
        const paid = inv.paidAmount || inv.changeAmount || 0
        const open = Math.max(0, gross - paid)
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.number || `INV-${inv.id}`,
          invoiceDate: inv.invoiceDate || inv.createTime || '',
          grossAmount: gross,
          paidAmount: paid,
          openBalance: open,
          allocationAmount: 0,
          discountAmount: 0,
          tdsAmount: 0,
        }
      })
      setInvoices(rows)
      setPaymentAmount(0)
    }
  }, [visible, initialInvoices])

  // FIFO Auto-Allocation
  const handleFifoAllocate = () => {
    let remainingToAllocate = paymentAmount
    const updated = invoices.map((row) => {
      if (remainingToAllocate <= 0) {
        return { ...row, allocationAmount: 0 }
      }
      const canAlloc = Math.min(row.openBalance, remainingToAllocate)
      remainingToAllocate -= canAlloc
      return { ...row, allocationAmount: canAlloc }
    })
    setInvoices(updated)
    message.info('FIFO allocation calculated across open invoices')
  }

  const handleLineChange = (id: number, field: keyof OpenInvoiceRow, val: number) => {
    setInvoices((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: val || 0 }
          if (field === 'allocationAmount' && updated.allocationAmount > row.openBalance) {
            message.warning(`Allocation amount cannot exceed open balance of ₹${row.openBalance}`)
            updated.allocationAmount = row.openBalance
          }
          return updated
        }
        return row
      })
    )
  }

  const totalAllocated = invoices.reduce((sum, r) => sum + (r.allocationAmount || 0), 0)
  const totalDiscount = invoices.reduce((sum, r) => sum + (r.discountAmount || 0), 0)
  const totalTds = invoices.reduce((sum, r) => sum + (r.tdsAmount || 0), 0)
  const netBankRemitted = Math.max(0, totalAllocated - totalDiscount - totalTds)
  const grossSettled = totalAllocated

  const isBalanced = Math.abs(grossSettled - (netBankRemitted + totalTds + totalDiscount)) < 0.001

  const handleSubmit = async () => {
    if (totalAllocated <= 0) {
      message.error('Please enter at least one invoice allocation amount')
      return
    }

    const allocationLines: ApPaymentAllocationLine[] = invoices
      .filter((r) => r.allocationAmount > 0)
      .map((r) => ({
        invoiceId: r.id,
        invoiceNumber: r.invoiceNumber,
        allocationAmount: r.allocationAmount,
        discountAmount: r.discountAmount,
        tdsAmount: r.tdsAmount,
      }))

    const payload: ApPaymentAllocationRequest = {
      supplierId: supplierId || 1,
      supplierName: supplierName || 'Vendor',
      bankAccountId,
      totalPaymentAmount: netBankRemitted,
      totalTdsWithheld: totalTds,
      totalDiscountAmount: totalDiscount,
      totalGrossSettlement: grossSettled,
      remarks,
      allocations: allocationLines,
    }

    try {
      setLoading(true)
      const res = await allocateApPayment(payload)
      if (res.data && res.data.code === 200) {
        message.success('AP Payment Allocation and GL Journal posted successfully')
        onSuccess()
        onClose()
      } else {
        message.error((res.data as any)?.data || 'Payment allocation failed')
      }
    } catch (e: any) {
      message.error(e.message || 'Payment allocation failed')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (val: string) => (val ? val.substring(0, 10) : '-'),
    },
    {
      title: 'Gross Amount',
      dataIndex: 'grossAmount',
      key: 'grossAmount',
      render: (val: number) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Open Balance',
      dataIndex: 'openBalance',
      key: 'openBalance',
      render: (val: number) => (
        <Text type={val > 0 ? 'danger' : 'secondary'}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Allocation (₹)',
      dataIndex: 'allocationAmount',
      key: 'allocationAmount',
      render: (val: number, record: OpenInvoiceRow) => (
        <InputNumber
          min={0}
          max={record.openBalance}
          step={100}
          value={val}
          onChange={(num) => handleLineChange(record.id, 'allocationAmount', num || 0)}
          style={{ width: 130 }}
        />
      ),
    },
    {
      title: 'Cash Discount (₹)',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      render: (val: number, record: OpenInvoiceRow) => (
        <InputNumber
          min={0}
          max={record.allocationAmount}
          value={val}
          onChange={(num) => handleLineChange(record.id, 'discountAmount', num || 0)}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: 'TDS Withheld (₹)',
      dataIndex: 'tdsAmount',
      key: 'tdsAmount',
      render: (val: number, record: OpenInvoiceRow) => (
        <InputNumber
          min={0}
          max={record.allocationAmount}
          value={val}
          onChange={(num) => handleLineChange(record.id, 'tdsAmount', num || 0)}
          style={{ width: 110 }}
        />
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space direction="vertical" size={2}>
          <Title level={4} style={{ margin: 0 }}>
            Accounts Payable (AP) Multi-Invoice Payment Allocation
          </Title>
          <Text type="secondary">
            Settle open purchase invoices with prompt payment discounts and date-effective statutory TDS withholding
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1050}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit} disabled={!isBalanced || totalAllocated === 0}>
          Confirm & Post Settlement
        </Button>,
      ]}
    >
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fcfcfc' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text type="secondary">Supplier / Vendor:</Text>
            <div>
              <Text strong style={{ fontSize: 16 }}>{supplierName || 'Selected Vendor'}</Text>
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">Disbursement Bank / Cash:</Text>
            <Select
              value={bankAccountId}
              onChange={setBankAccountId}
              style={{ width: '100%' }}
              options={[
                { label: 'HDFC Corporate Bank A/c (1002)', value: 1 },
                { label: 'State Bank of India Operations (1002)', value: 2 },
                { label: 'Main Petty Cash Vault (1001)', value: 3 },
              ]}
            />
          </Col>
          <Col span={6}>
            <Text type="secondary">Target Payment Amount (₹):</Text>
            <InputNumber
              min={0}
              step={500}
              value={paymentAmount}
              onChange={(val) => setPaymentAmount(val || 0)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <Button type="dashed" onClick={handleFifoAllocate} style={{ marginTop: 18, width: '100%' }}>
              FIFO Auto-Allocate
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={invoices}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
      />

      <Divider style={{ margin: '16px 0' }} />

      <Card size="small" style={{ backgroundColor: '#fafafa' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text type="secondary">Gross Settled AP (Dr 2101):</Text>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
              ₹{grossSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">Net Bank Disbursed (Cr 1002):</Text>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
              ₹{netBankRemitted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">TDS Withheld (Cr 2205):</Text>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
              ₹{totalTds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">Cash Discount (Cr 4205):</Text>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#722ed1' }}>
              ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          {isBalanced ? (
            <Tag color="success">Double-Entry Balanced: Dr 2101 = Cr 1002 + Cr 2205 + Cr 4205</Tag>
          ) : (
            <Tag color="error">Unbalanced Entry Difference Detected</Tag>
          )}
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary">Payment Remarks / Voucher Notes:</Text>
        <Input.TextArea
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Cleared invoices under contractual prompt payment terms"
        />
      </div>
    </Modal>
  )
}
