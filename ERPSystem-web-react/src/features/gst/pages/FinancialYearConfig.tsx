import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Button,
  Tag,
  Space,
  Typography,
  message,
  Modal,
  Alert,
  Row,
  Col,
  Drawer,
  Select,
  Popconfirm,
  Badge,
} from 'antd'
import {
  CalendarOutlined,
  NumberOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import type { FinancialYear, DocumentNumberSeries, DocumentNumberAudit, CompanyGstin } from '../types'

const { Title, Text } = Typography

export const FinancialYearConfigPage: React.FC = () => {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([])
  const [selectedFyId, setSelectedFyId] = useState<number | undefined>(undefined)
  const [gstins, setGstins] = useState<CompanyGstin[]>([])
  const [selectedGstinId, setSelectedGstinId] = useState<number | undefined>(undefined)
  const [seriesList, setSeriesList] = useState<DocumentNumberSeries[]>([])
  const [loading, setLoading] = useState(false)
  const [editingSeries, setEditingSeries] = useState<DocumentNumberSeries | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Audit trail drawer state
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditList, setAuditList] = useState<DocumentNumberAudit[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditFilterSeries, setAuditFilterSeries] = useState<number | undefined>(undefined)
  const [auditSearch, setAuditSearch] = useState('')

  // Cancel number modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancellingDocNumber, setCancellingDocNumber] = useState<string>('')
  const [cancelReason, setCancelReason] = useState<string>('')

  const [form] = Form.useForm()

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [fyRes, gstinRes] = await Promise.all([
        gstApi.getAllFinancialYears(),
        gstApi.getAllCompanyGstins(),
      ])

      if (fyRes.data?.list) {
        setFinancialYears(fyRes.data.list)
        const current = fyRes.data.list.find((f) => f.isCurrent || f.status === 'ACTIVE')
        if (current?.id) {
          setSelectedFyId(current.id)
        }
      }

      if (gstinRes.data?.list) {
        setGstins(gstinRes.data.list)
      }
    } catch (err: any) {
      message.error('Failed to load financial year and GSTIN configurations.')
    } finally {
      setLoading(false)
    }
  }

  const loadSeriesList = async () => {
    if (!selectedFyId) return
    setLoading(true)
    try {
      const res = await gstApi.getSeriesList({ financialYearId: selectedFyId })
      if (res.data?.list) {
        setSeriesList(res.data.list)
      }
    } catch (err: any) {
      message.error('Failed to load document number series.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedFyId) {
      loadSeriesList()
    }
  }, [selectedFyId])

  const loadAuditTrail = async () => {
    setAuditLoading(true)
    try {
      const res = await gstApi.getDocumentAuditList({
        seriesId: auditFilterSeries,
        search: auditSearch,
      })
      if (res.data) {
        setAuditList(res.data.rows || [])
        setAuditTotal(res.data.total || 0)
      }
    } catch (err: any) {
      message.error('Failed to load document audit trail')
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (auditDrawerOpen) {
      loadAuditTrail()
    }
  }, [auditDrawerOpen, auditFilterSeries, auditSearch])

  const handleGenerateNext = async (series: DocumentNumberSeries) => {
    try {
      const res = await gstApi.generateDocumentNumber({
        companyGstinId: series.companyGstinId,
        branchId: series.branchId,
        docType: series.documentType,
      })
      if (res.data?.docNumber) {
        message.success(`Reserved sequential number: ${res.data.docNumber} (Logged in Audit Trail)`)
        loadSeriesList()
        if (auditDrawerOpen) {
          loadAuditTrail()
        }
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to generate document number')
    }
  }

  const handleSaveSeriesConfig = async () => {
    try {
      const values = await form.validateFields()
      await gstApi.configureSeriesConfig({
        ...editingSeries,
        ...values,
      })
      message.success('Document series configuration updated.')
      setModalOpen(false)
      setEditingSeries(null)
      loadSeriesList()
    } catch (err: any) {
      message.error(err?.message || 'Failed to save configuration')
    }
  }

  const handleExecuteCancellation = async () => {
    if (!cancellingDocNumber || !cancelReason.trim()) {
      message.error('Cancellation reason is required')
      return
    }
    try {
      await gstApi.cancelDocumentNumber({
        docNumber: cancellingDocNumber,
        reason: cancelReason,
      })
      message.success(`Document number ${cancellingDocNumber} cancelled (permanently archived, never recycled).`)
      setCancelModalOpen(false)
      setCancellingDocNumber('')
      setCancelReason('')
      loadAuditTrail()
    } catch (err: any) {
      message.error(err?.message || 'Failed to cancel document number')
    }
  }

  const activeFy = financialYears.find((f) => f.id === selectedFyId)

  const seriesColumns = [
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 180,
      render: (type: string) => (
        <Space>
          <NumberOutlined style={{ color: '#2563eb' }} />
          <Text strong style={{ fontSize: 14 }}>{type}</Text>
        </Space>
      ),
    },
    {
      title: 'Scope (GSTIN / Branch)',
      key: 'scope',
      width: 220,
      render: (_: any, record: DocumentNumberSeries) => (
        <Space orientation="vertical" size={2}>
          <Tag color="purple" icon={<ApartmentOutlined />}>
            {record.companyGstin || 'All Company GSTINs'}
          </Tag>
          {record.branchName && (
            <span style={{ fontSize: 11, color: '#64748b' }}>Branch: {record.branchName}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Prefix Format',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 180,
      render: (prefix: string) => (
        <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 13, padding: '2px 8px' }}>
          {prefix}
        </Tag>
      ),
    },
    {
      title: 'Next Sequential Number',
      dataIndex: 'nextNumber',
      key: 'nextNumber',
      width: 200,
      render: (val: number, record: DocumentNumberSeries) => {
        const pad = record.paddingLength || 4
        const sample = record.prefix + String(val).padStart(pad, '0')
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#059669' }}>Next Counter: {val}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>Upcoming: {sample}</div>
          </div>
        )
      },
    },
    {
      title: 'Padding',
      dataIndex: 'paddingLength',
      key: 'paddingLength',
      width: 100,
      render: (pad: number) => <Tag color="default">{pad} Digits</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (st: string) => <Tag color={st === 'ACTIVE' ? 'success' : 'default'}>{st}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_: any, record: DocumentNumberSeries) => (
        <Space size="small">
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => {
              setEditingSeries(record)
              form.setFieldsValue(record)
              setModalOpen(true)
            }}
          >
            Configure
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<ThunderboltOutlined />}
            onClick={() => handleGenerateNext(record)}
          >
            Test Reserve
          </Button>
        </Space>
      ),
    },
  ]

  const auditColumns = [
    {
      title: 'Document Number',
      dataIndex: 'docNumber',
      key: 'docNumber',
      render: (num: string) => (
        <Text strong style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e293b' }}>
          {num}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Badge
          status={st === 'ISSUED' ? 'success' : 'error'}
          text={st === 'ISSUED' ? 'Issued' : 'Cancelled'}
        />
      ),
    },
    {
      title: 'Generated At',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      render: (dt: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{dt ? String(dt).replace('T', ' ').substring(0, 19) : '-'}</span>,
    },
    {
      title: 'Cancellation Info',
      key: 'cancellation',
      render: (_: any, r: DocumentNumberAudit) =>
        r.status === 'CANCELLED' ? (
          <div>
            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>
              Reason: {r.cancellationReason || 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              At: {r.cancelledAt ? String(r.cancelledAt).replace('T', ' ').substring(0, 19) : '-'}
            </div>
          </div>
        ) : (
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setCancellingDocNumber(r.docNumber)
              setCancelModalOpen(true)
            }}
          >
            Cancel Number
          </Button>
        ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Alert
            title={
              <Space size={24} align="center">
                <span>
                  <strong>Active Fiscal Year:</strong> {activeFy?.name || '2026-27'} ({activeFy?.code || '26-27'})
                </span>
                <span>
                  <strong>Period:</strong> {activeFy?.startDate || '2026-04-01'} to {activeFy?.endDate || '2027-03-31'}
                </span>
                <Tag color={activeFy?.status === 'ACTIVE' ? 'green' : 'default'} icon={<CheckCircleOutlined />}>
                  {activeFy?.status || 'ACTIVE'}
                </Tag>
                <Button
                  icon={<HistoryOutlined />}
                  type="primary"
                  ghost
                  onClick={() => setAuditDrawerOpen(true)}
                >
                  View Audit Trail ({auditTotal} Reserved)
                </Button>
              </Space>
            }
            type="info"
            showIcon
            icon={<CalendarOutlined style={{ fontSize: 20 }} />}
          />
        </Col>

        <Col span={24}>
          <Card
            title={
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <NumberOutlined style={{ color: '#2563eb', fontSize: 20 }} />
                    <span>Enterprise Sequential Document Numbering Series (Rule 46(b))</span>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <span style={{ fontSize: 13, color: '#64748b' }}>Select Financial Year:</span>
                    <Select
                      style={{ width: 140 }}
                      value={selectedFyId}
                      onChange={(id) => setSelectedFyId(id)}
                      options={financialYears.map((f) => ({
                        value: f.id,
                        label: `${f.name} (${f.status})`,
                      }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadSeriesList}>
                      Refresh
                    </Button>
                  </Space>
                </Col>
              </Row>
            }
            variant="outlined"
          >
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Indian GST mandates unique, sequential document numbers with a maximum length of 16 characters per financial year.
                Each GSTIN and branch operates under strictly gapless, non-recycling atomic reservation.
              </Text>
            </div>

            <Table
              columns={seriesColumns}
              dataSource={seriesList}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      {/* Series Edit Modal */}
      <Modal
        title={`Configure Series: ${editingSeries?.documentType}`}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingSeries(null)
        }}
        onOk={handleSaveSeriesConfig}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="prefix" label="Prefix Format (e.g. INV/26-27/)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nextNumber" label="Next Counter Value" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paddingLength" label="Zero-Padding Digit Length" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Audit Trail Drawer */}
      <Drawer
        title="Sequential Document Number Audit Trail"
        open={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        size="large"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadAuditTrail}>
            Refresh
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search document number or reason..."
            allowClear
            onSearch={(v) => setAuditSearch(v)}
            style={{ width: '100%' }}
          />
        </div>

        <Table
          columns={auditColumns}
          dataSource={auditList}
          rowKey="id"
          loading={auditLoading}
          pagination={{
            total: auditTotal,
            pageSize: 15,
            showTotal: (t) => `Total ${t} records`,
          }}
        />
      </Drawer>

      {/* Cancel Number Modal */}
      <Modal
        title={`Cancel Document Number: ${cancellingDocNumber}`}
        open={cancelModalOpen}
        onCancel={() => {
          setCancelModalOpen(false)
          setCancellingDocNumber('')
        }}
        onOk={handleExecuteCancellation}
        okText="Confirm Non-Recycling Cancellation"
        okButtonProps={{ danger: true }}
      >
        <Alert
          title="Compliance Warning"
          description="Under Indian GST statutory guidelines, cancelled document numbers cannot be recycled or reused. This action permanently flags this sequence as CANCELLED in the immutable audit log."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="Cancellation Reason / Audit Justification" required>
            <Input.TextArea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order prior to dispatch / entry error"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
export default FinancialYearConfigPage
