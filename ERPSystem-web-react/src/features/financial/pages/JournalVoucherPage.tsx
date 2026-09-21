import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Modal,
  message,
  DatePicker,
  Select,
  Typography,
  Tooltip,
  Statistic,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  SwapOutlined,
  FileTextOutlined,
  UndoOutlined,
  EyeOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  journalVoucherApi,
  JournalVoucherDTO,
} from '../api/journalVoucherApi'
import { JournalVoucherModal } from '../components/JournalVoucherModal'
import { ContraVoucherModal } from '../components/ContraVoucherModal'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

interface JournalVoucherPageProps {
  defaultTab?: string
}

export const JournalVoucherPage: React.FC<JournalVoucherPageProps> = ({ defaultTab }) => {
  const [filterForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<JournalVoucherDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })

  // Modals
  const [jvModalOpen, setJvModalOpen] = useState(false)
  const [contraModalOpen, setContraModalOpen] = useState(defaultTab === 'CONTRA')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucherDTO | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Reversal
  const [reversalModalOpen, setReversalModalOpen] = useState(false)
  const [reversalTarget, setReversalTarget] = useState<JournalVoucherDTO | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [reversing, setReversing] = useState(false)

  const fetchData = useCallback(async (page = pagination.current, size = pagination.pageSize) => {
    try {
      setLoading(true)
      const values = filterForm.getFieldsValue()
      let startDateStr: string | undefined
      let endDateStr: string | undefined
      if (values.dateRange && values.dateRange.length === 2) {
        startDateStr = values.dateRange[0].format('YYYY-MM-DD')
        endDateStr = values.dateRange[1].format('YYYY-MM-DD')
      }

      const res = await journalVoucherApi.getList({
        voucherType: values.voucherType || undefined,
        voucherNumber: values.voucherNumber ? values.voucherNumber.trim() : undefined,
        status: values.status || undefined,
        startDate: startDateStr,
        endDate: endDateStr,
        currentPage: page,
        pageSize: size,
      })

      let list: JournalVoucherDTO[] = []
      if (Array.isArray(res)) {
        list = res
      } else if (res && Array.isArray((res as any).data)) {
        list = (res as any).data
      } else if (res && (res as any).rows && Array.isArray((res as any).rows)) {
        list = (res as any).rows
      }

      setDataSource(list)
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize: size,
        total: list.length >= size ? page * size + 1 : (page - 1) * size + list.length,
      }))
    } catch (err) {
      console.error('Failed to fetch journal vouchers', err)
      message.error('Failed to load voucher list')
    } finally {
      setLoading(false)
    }
  }, [filterForm, pagination.current, pagination.pageSize])

  useEffect(() => {
    fetchData(1, pagination.pageSize)
  }, [])

  const handleOpenDetail = async (record: JournalVoucherDTO) => {
    if (!record.id) return
    try {
      setDetailLoading(true)
      setDetailModalOpen(true)
      const detail = await journalVoucherApi.getDetail(record.id, record.voucherType)
      const detailData = (detail as any)?.data || detail
      setSelectedVoucher(detailData)
    } catch (err: any) {
      message.error(err?.message || 'Failed to load voucher detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenReversal = (record: JournalVoucherDTO) => {
    setReversalTarget(record)
    setReversalReason('')
    setReversalModalOpen(true)
  }

  const handleConfirmReversal = async () => {
    if (!reversalTarget || !reversalTarget.id) return
    try {
      setReversing(true)
      await journalVoucherApi.reverseVoucher(
        reversalTarget.id,
        reversalTarget.voucherType,
        reversalReason || 'Manual user reversal'
      )
      message.success(`Voucher ${reversalTarget.voucherNumber} reversed successfully!`)
      setReversalModalOpen(false)
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      message.error(err?.message || 'Failed to reverse voucher')
    } finally {
      setReversing(false)
    }
  }

  // Summary Metrics
  const totalJVs = dataSource.filter((d) => d.voucherType === 'JOURNAL_VOUCHER').length
  const totalContras = dataSource.filter((d) => d.voucherType === 'BANK_CONTRA_TRANSFER' || d.voucherType === 'CONTRA').length
  const activePostings = dataSource.filter((d) => d.status === 'POSTED').length
  const totalTurnover = dataSource
    .filter((d) => d.status === 'POSTED')
    .reduce((sum, d) => sum + (Number(d.totalDebit) || 0), 0)

  const columns: TableColumnsType<JournalVoucherDTO> = [
    {
      title: 'Voucher Number',
      dataIndex: 'voucherNumber',
      key: 'voucherNumber',
      width: 170,
      render: (text: string, record: JournalVoucherDTO) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => handleOpenDetail(record)}>
            {text}
          </Text>
          {record.attachment && (
            <Tag color="cyan" icon={<PaperClipOutlined />} style={{ fontSize: 11, marginTop: 2 }}>
              Attachment
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'voucherDate',
      key: 'voucherDate',
      width: 110,
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Voucher Type',
      dataIndex: 'voucherType',
      key: 'voucherType',
      width: 160,
      render: (val: string) => {
        if (val === 'BANK_CONTRA_TRANSFER' || val === 'CONTRA') {
          return <Tag color="green" icon={<SwapOutlined />}>Bank/Cash Contra</Tag>
        }
        return <Tag color="blue" icon={<FileTextOutlined />}>Journal Voucher</Tag>
      },
    },
    {
      title: 'Total Debit (₹)',
      dataIndex: 'totalDebit',
      key: 'totalDebit',
      width: 140,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1890ff' }}>
          ₹ {Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Total Credit (₹)',
      dataIndex: 'totalCredit',
      key: 'totalCredit',
      width: 140,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#722ed1' }}>
          ₹ {Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (val: string) =>
        val === 'POSTED' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>POSTED</Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>CANCELLED</Tag>
        ),
    },
    {
      title: 'Narration / Remark',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (val: string) => val || <Text type="secondary">-</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_: any, record: JournalVoucherDTO) => (
        <Space size="small">
          <Tooltip title="View Double-Entry Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
          {record.status === 'POSTED' && (
            <Tooltip title="Append-Only Reversal">
              <Button
                type="text"
                danger
                size="small"
                icon={<UndoOutlined />}
                onClick={() => handleOpenReversal(record)}
              >
                Reverse
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  const detailColumns: TableColumnsType<any> = [
    {
      title: 'Line #',
      dataIndex: 'lineNo',
      key: 'lineNo',
      width: 60,
    },
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 220,
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: val > 0 ? 'bold' : 'normal', color: val > 0 ? '#1890ff' : undefined }}>
          {val > 0 ? `₹ ${Number(val).toFixed(2)}` : '-'}
        </Text>
      ),
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: val > 0 ? 'bold' : 'normal', color: val > 0 ? '#722ed1' : undefined }}>
          {val > 0 ? `₹ ${Number(val).toFixed(2)}` : '-'}
        </Text>
      ),
    },
    {
      title: 'Narration / Party',
      dataIndex: 'narration',
      key: 'narration',
      render: (val: string, r: any) => (
        <Space direction="vertical" size={0}>
          <span>{val || '-'}</span>
          {r.partyType && <Text type="secondary" style={{ fontSize: 11 }}>Party: {r.partyType} #{r.partyId}</Text>}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ background: '#f0f5ff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Journal Vouchers</Text>}
              value={totalJVs}
              prefix={<FileTextOutlined style={{ color: '#1890ff', marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ background: '#f6ffed', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Contra Transfers</Text>}
              value={totalContras}
              prefix={<SwapOutlined style={{ color: '#52c41a', marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ background: '#fff7e6', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Active Posted</Text>}
              value={activePostings}
              prefix={<CheckCircleOutlined style={{ color: '#fa8c16', marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" bordered={false} style={{ background: '#f9f0ff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Total Posted Volume</Text>}
              value={totalTurnover}
              precision={2}
              prefix={<span style={{ fontSize: 16 }}>₹</span>}
              valueStyle={{ color: '#722ed1', fontWeight: 700, fontFamily: 'monospace' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Workspace Card */}
      <Card
        title={
          <Space align="center">
            <FileTextOutlined style={{ color: '#1890ff', fontSize: 18 }} />
            <div>
              <Text strong style={{ fontSize: 16 }}>Manual Journal Voucher & Contra Workspace</Text>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 'normal' }}>
                Double-entry manual adjustments and cash/bank liquidity transfers
              </div>
            </div>
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setJvModalOpen(true)}
              style={{ backgroundColor: '#1890ff' }}
            >
              New Journal Voucher
            </Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setContraModalOpen(true)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              New Contra Transfer
            </Button>
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Responsive Filter Bar */}
        <Form form={filterForm} layout="vertical" style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} sm={12} md={5}>
              <Form.Item name="voucherType" label="Voucher Type" style={{ marginBottom: 0 }}>
                <Select placeholder="All Types" allowClear style={{ width: '100%' }}>
                  <Select.Option value="JOURNAL_VOUCHER">Journal Voucher</Select.Option>
                  <Select.Option value="BANK_CONTRA_TRANSFER">Bank/Cash Contra</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Form.Item name="voucherNumber" label="Voucher Number" style={{ marginBottom: 0 }}>
                <Input placeholder="Search voucher no..." prefix={<SearchOutlined />} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item name="status" label="Status" style={{ marginBottom: 0 }}>
                <Select placeholder="All Status" allowClear style={{ width: '100%' }}>
                  <Select.Option value="POSTED">POSTED</Select.Option>
                  <Select.Option value="CANCELLED">CANCELLED</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="dateRange" label="Date Range" style={{ marginBottom: 0 }}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={4}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pagination.pageSize)}>
                  Filter
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => { filterForm.resetFields(); fetchData(1, pagination.pageSize) }}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        {/* Vouchers Table */}
        <Table
          dataSource={dataSource}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '15', '30', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} vouchers`,
            onChange: (p, s) => fetchData(p, s),
          }}
          size="middle"
          bordered
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Create Journal Voucher Modal */}
      <JournalVoucherModal
        visible={jvModalOpen}
        onClose={() => setJvModalOpen(false)}
        onSuccess={() => fetchData(1, pagination.pageSize)}
      />

      {/* Create Contra Transfer Modal */}
      <ContraVoucherModal
        visible={contraModalOpen}
        onClose={() => setContraModalOpen(false)}
        onSuccess={() => fetchData(1, pagination.pageSize)}
      />

      {/* Voucher Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>Voucher Detail — {selectedVoucher?.voucherNumber}</span>
            {selectedVoucher?.status === 'POSTED' ? (
              <Tag color="success">POSTED</Tag>
            ) : (
              <Tag color="error">CANCELLED</Tag>
            )}
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={850}
        footer={<Button onClick={() => setDetailModalOpen(false)}>Close</Button>}
      >
        {selectedVoucher && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Text type="secondary">Voucher Date:</Text>
                <div><Text strong>{selectedVoucher.voucherDate ? dayjs(selectedVoucher.voucherDate).format('YYYY-MM-DD') : '-'}</Text></div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Type:</Text>
                <div><Tag color="blue">{selectedVoucher.voucherType}</Tag></div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Total Debit:</Text>
                <div><Text strong style={{ color: '#1890ff' }}>₹ {Number(selectedVoucher.totalDebit || 0).toFixed(2)}</Text></div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Total Credit:</Text>
                <div><Text strong style={{ color: '#722ed1' }}>₹ {Number(selectedVoucher.totalCredit || 0).toFixed(2)}</Text></div>
              </Col>
            </Row>

            {selectedVoucher.remark && (
              <div style={{ marginBottom: 16, background: '#f5f5f5', padding: '8px 12px', borderRadius: 4 }}>
                <Text type="secondary">Narration / Remark: </Text>
                <Text>{selectedVoucher.remark}</Text>
              </div>
            )}

            {selectedVoucher.attachment && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">Attachment Reference: </Text>
                <Tag color="cyan" icon={<PaperClipOutlined />}>
                  {selectedVoucher.attachment}
                </Tag>
              </div>
            )}

            <Divider titlePlacement="start" style={{ margin: '12px 0' }}>Double-Entry GL Facts (erp_gl_entry)</Divider>
            <Table
              dataSource={selectedVoucher.lines || []}
              columns={detailColumns}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              loading={detailLoading}
            />
          </div>
        )}
      </Modal>

      {/* Append-Only Reversal Modal */}
      <Modal
        title={
          <Space>
            <UndoOutlined style={{ color: '#ff4d4f' }} />
            <span>Confirm Append-Only Reversal</span>
          </Space>
        }
        open={reversalModalOpen}
        onCancel={() => setReversalModalOpen(false)}
        onOk={handleConfirmReversal}
        confirmLoading={reversing}
        okText="Execute Reversal"
        okButtonProps={{ danger: true }}
      >
        <p>
          You are about to reverse voucher <Text strong>{reversalTarget?.voucherNumber}</Text> ({reversalTarget?.voucherType}).
        </p>
        <p style={{ color: '#8c8c8c' }}>
          This will append an inverse double-entry posting to the General Ledger with <code>reversal_of_id</code> linkage. Historical records will remain completely intact.
        </p>
        <Form layout="vertical">
          <Form.Item label="Reason for Reversal (Audit Log)" required>
            <Input.TextArea
              rows={3}
              placeholder="Provide clear justification for reversing this journal voucher..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
