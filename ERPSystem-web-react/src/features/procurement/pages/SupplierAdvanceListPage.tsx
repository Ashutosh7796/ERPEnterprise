import React, { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  message,
} from 'antd'
import {
  PlusOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  getSupplierAdvances,
  createSupplierAdvance,
  settleSupplierAdvance,
  SupplierAdvance,
  getPurchaseInvoices,
} from '../api/procurementApi'

const { Text, Title } = Typography

export const SupplierAdvanceListPage: React.FC = () => {
  const [advances, setAdvances] = useState<SupplierAdvance[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)

  // Settle Modal
  const [settleModalVisible, setSettleModalVisible] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<SupplierAdvance | null>(null)
  const [openInvoices, setOpenInvoices] = useState<any[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | undefined>(undefined)
  const [offsetAmount, setOffsetAmount] = useState<number>(0)
  const [settleLoading, setSettleLoading] = useState(false)

  const fetchAdvances = async () => {
    try {
      setLoading(true)
      const res = await getSupplierAdvances({
        currentPage,
        pageSize,
        status: statusFilter || undefined,
      })
      if (res.data && res.data.code === 200) {
        setAdvances(res.data.data.rows || [])
        setTotal(res.data.data.total || 0)
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to load supplier advances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdvances()
  }, [currentPage, pageSize, statusFilter])

  const handleCreateAdvance = async (values: any) => {
    try {
      setCreateLoading(true)
      const payload = {
        supplierId: values.supplierId,
        grossAdvanceAmount: values.grossAdvanceAmount,
        bankAccountId: values.bankAccountId || 1,
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : undefined,
        remark: values.remark,
      }
      const res = await createSupplierAdvance(payload)
      if (res.data && res.data.code === 200) {
        message.success('Supplier advance disbursed successfully with authoritative TDS determination')
        setCreateModalVisible(false)
        createForm.resetFields()
        fetchAdvances()
      } else {
        message.error((res.data as any)?.data || 'Failed to disburse advance')
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to disburse advance')
    } finally {
      setCreateLoading(false)
    }
  }

  const openSettleModal = async (record: SupplierAdvance) => {
    setSelectedAdvance(record)
    setSelectedInvoiceId(undefined)
    setOffsetAmount(0)
    setSettleModalVisible(true)

    try {
      const res = await getPurchaseInvoices({ supplierId: record.supplierId, status: 'POSTED' })
      if (res.data && res.data.code === 200) {
        const rows = (res.data.data.rows || []).filter(
          (inv: any) => (inv.totalInvoiceAmount || 0) - (inv.paidAmount || 0) > 0
        )
        setOpenInvoices(rows)
      }
    } catch (ignored) {}
  }

  const handleSettleAdvance = async () => {
    if (!selectedAdvance || !selectedInvoiceId || offsetAmount <= 0) {
      message.error('Please select an invoice and enter a valid offset amount')
      return
    }

    try {
      setSettleLoading(true)
      const res = await settleSupplierAdvance(selectedAdvance.id, {
        invoiceId: selectedInvoiceId,
        offsetAmount,
      })
      if (res.data && res.data.code === 200) {
        message.success('Advance balance settled against invoice successfully')
        setSettleModalVisible(false)
        fetchAdvances()
      } else {
        message.error((res.data as any)?.data || 'Failed to settle advance')
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to settle advance')
    } finally {
      setSettleLoading(false)
    }
  }

  const columns = [
    {
      title: 'Advance No.',
      dataIndex: 'advanceNumber',
      key: 'advanceNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (val: string) => (val ? val.substring(0, 10) : '-'),
    },
    {
      title: 'Gross Amount',
      dataIndex: 'grossAdvanceAmount',
      key: 'grossAdvanceAmount',
      render: (val: number) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'TDS Withheld',
      dataIndex: 'tdsWithheldAmount',
      key: 'tdsWithheldAmount',
      render: (val: number) =>
        val > 0 ? (
          <Tag color="orange">₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Tag>
        ) : (
          '₹0.00'
        ),
    },
    {
      title: 'Net Disbursed',
      dataIndex: 'netDisbursedAmount',
      key: 'netDisbursedAmount',
      render: (val: number) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Unallocated Balance',
      dataIndex: 'unallocatedBalance',
      key: 'unallocatedBalance',
      render: (val: number) => (
        <Text strong style={{ color: val > 0 ? '#1890ff' : '#8c8c8c' }}>
          ₹{(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'ACTIVE') return <Tag color="processing">Active / Open</Tag>
        if (status === 'FULLY_SETTLED') return <Tag color="success">Fully Settled</Tag>
        return <Tag>{status}</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SupplierAdvance) => (
        <Space>
          {record.status === 'ACTIVE' && record.unallocatedBalance > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<DollarCircleOutlined />}
              onClick={() => openSettleModal(record)}
            >
              Offset Invoice
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Supplier Advance Payments & Invoice Settlement
            </Title>
            <Text type="secondary">
              Disburse pre-invoice vendor advances with date-effective statutory TDS withholding and offset against purchase invoices
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<SyncOutlined />} onClick={fetchAdvances}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                Disburse New Advance
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              style={{ width: '100%' }}
              options={[
                { label: 'Active / Open', value: 'ACTIVE' },
                { label: 'Fully Settled', value: 'FULLY_SETTLED' },
              ]}
            />
          </Col>
        </Row>

        <Table
          dataSource={advances}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            onChange: (p, ps) => {
              setCurrentPage(p)
              setPageSize(ps)
            },
          }}
          bordered
        />
      </Card>

      {/* Disburse Advance Modal */}
      <Modal
        title="Disburse New Supplier Advance"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateAdvance}>
          <Form.Item
            name="supplierId"
            label="Supplier / Vendor ID"
            rules={[{ required: true, message: 'Please enter Supplier ID' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="Enter Supplier ID" />
          </Form.Item>

          <Form.Item
            name="grossAdvanceAmount"
            label="Gross Advance Obligation (₹)"
            rules={[{ required: true, message: 'Please enter gross advance amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              step={1000}
              placeholder="e.g. 100000"
            />
          </Form.Item>

          <Form.Item name="bankAccountId" label="Disbursing Bank Account">
            <Select
              defaultValue={1}
              options={[
                { label: 'HDFC Corporate Bank A/c (1002)', value: 1 },
                { label: 'State Bank of India Operations (1002)', value: 2 },
              ]}
            />
          </Form.Item>

          <Form.Item name="paymentDate" label="Disbursement Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="remark" label="Remarks / PO Reference">
            <Input.TextArea rows={2} placeholder="e.g. Advance for Purchase Order PO-2026-001" />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                Disburse & Post GL Journal
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Settle Advance Modal */}
      <Modal
        title="Offset Advance against Open Purchase Invoice"
        open={settleModalVisible}
        onCancel={() => setSettleModalVisible(false)}
        onOk={handleSettleAdvance}
        confirmLoading={settleLoading}
        width={650}
      >
        {selectedAdvance && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Advance Number:</Text>
                  <div><Text strong>{selectedAdvance.advanceNumber}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Available Unallocated Balance:</Text>
                  <div style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>
                    ₹{selectedAdvance.unallocatedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </Col>
              </Row>
            </Card>

            <div>
              <Text strong>Select Open Purchase Invoice:</Text>
              <Select
                placeholder="Select an open purchase invoice"
                value={selectedInvoiceId}
                onChange={setSelectedInvoiceId}
                style={{ width: '100%', marginTop: 8 }}
                options={openInvoices.map((inv) => ({
                  label: `${inv.invoiceNumber} — Gross: ₹${inv.totalInvoiceAmount} | Open: ₹${inv.totalInvoiceAmount - inv.paidAmount}`,
                  value: inv.id,
                }))}
              />
            </div>

            <div>
              <Text strong>Offset Amount (₹):</Text>
              <InputNumber
                style={{ width: '100%', marginTop: 8 }}
                min={1}
                max={selectedAdvance.unallocatedBalance}
                value={offsetAmount}
                onChange={(val) => setOffsetAmount(val || 0)}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  )
}
