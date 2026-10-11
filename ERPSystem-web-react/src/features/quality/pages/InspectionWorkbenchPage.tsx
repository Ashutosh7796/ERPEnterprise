import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Form,
  Modal,
  Drawer,
  InputNumber,
  Descriptions,
  Badge,
  message,
  Tabs,
  Alert,
  Divider,
  Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  FileDoneOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
  BarcodeOutlined,
} from '@ant-design/icons'
import {
  qcApi,
  QcInspectionDTO,
  QcInspectionItemDTO,
  QcInspectionCreateRequest,
  QcReadingDTO,
  QcInspectionSignOffRequest,
  QcTemplateDTO,
} from '../api/qcApi'

const { Title, Text } = Typography

export const InspectionWorkbenchPage: React.FC = () => {
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()
  const [signOffForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<QcInspectionDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedTypeTab, setSelectedTypeTab] = useState<string>('ALL')

  // Execution Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedInspection, setSelectedInspection] = useState<QcInspectionDTO | null>(null)
  const [readingsLoading, setReadingsLoading] = useState(false)
  const [activeReadings, setActiveReadings] = useState<Record<number, { numeric?: number; text?: string; booleanVal?: boolean }>>({})

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [signOffModalOpen, setSignOffModalOpen] = useState(false)
  const [signOffSubmitting, setSignOffSubmitting] = useState(false)

  // Available templates for dropdown
  const [templates, setTemplates] = useState<QcTemplateDTO[]>([])

  const fetchInspections = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setLoading(true)
    try {
      const type = selectedTypeTab !== 'ALL' ? selectedTypeTab : filters.inspectionType
      const res: any = await qcApi.getInspectionList({
        currentPage: page,
        pageSize: size,
        inspectionType: type,
        status: filters.status,
        decision: filters.decision,
        inspectionNumber: filters.inspectionNumber,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDataSource(rows)
      setPagination({ current: page, pageSize: size, total })
    } catch (err) {
      console.error('Failed to load inspections:', err)
      message.error('Failed to load quality inspection records.')
    } finally {
      setLoading(false)
    }
  }, [selectedTypeTab])

  useEffect(() => {
    fetchInspections(1, 10)
  }, [fetchInspections, selectedTypeTab])

  // Load templates on modal open
  const loadTemplates = async () => {
    try {
      const res: any = await qcApi.getTemplateList({ isActive: true, pageSize: 50 })
      const rows = res?.rows || res?.data?.rows || []
      setTemplates(rows)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const handleOpenDetailDrawer = async (record: QcInspectionDTO) => {
    try {
      setReadingsLoading(true)
      setDrawerOpen(true)
      const res: any = await qcApi.getInspectionById(record.id!)
      const fullRecord: QcInspectionDTO = res?.data || res
      setSelectedInspection(fullRecord)

      // Initialize readings map
      const initialMap: Record<number, any> = {}
      if (fullRecord.items) {
        fullRecord.items.forEach((item) => {
          initialMap[item.id!] = {
            numeric: item.measuredValueNumeric,
            text: item.measuredValueText,
            booleanVal: item.measuredValueBoolean,
          }
        })
      }
      setActiveReadings(initialMap)
    } catch (err) {
      message.error('Failed to load quality inspection parameter items.')
    } finally {
      setReadingsLoading(false)
    }
  }

  const handleSaveReadings = async () => {
    if (!selectedInspection || !selectedInspection.items) return
    try {
      setReadingsLoading(true)
      const readingsPayload: QcReadingDTO[] = selectedInspection.items.map((item) => {
        const val = activeReadings[item.id!] || {}
        return {
          templateItemId: item.templateItemId || item.id!,
          parameterName: item.parameterName,
          parameterType: item.parameterType,
          sampleNumber: item.sampleNumber || 1,
          measuredValueNumeric: val.numeric,
          measuredValueText: val.text,
          measuredValueBoolean: val.booleanVal,
        }
      })

      const res: any = await qcApi.recordReadings(selectedInspection.id!, readingsPayload)
      message.success('Sample measurements recorded and evaluated against tolerances successfully.')
      const updated: QcInspectionDTO = res?.data || res
      setSelectedInspection(updated)
      fetchInspections(pagination.current, pagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to save measured values.')
    } finally {
      setReadingsLoading(false)
    }
  }

  const handleCreateInspection = async () => {
    try {
      const values = await createForm.validateFields()
      setCreateSubmitting(true)
      const payload: QcInspectionCreateRequest = {
        inspectionType: values.inspectionType,
        materialId: Number(values.materialId),
        sourceDocumentType: values.sourceDocumentType,
        sourceDocumentNumber: values.sourceDocumentNumber,
        batchQuantity: Number(values.batchQuantity),
        sampleSize: Number(values.sampleSize || 5),
        templateId: values.templateId ? Number(values.templateId) : undefined,
        lotBatchNumber: values.lotBatchNumber,
        remark: values.remark,
      }

      await qcApi.createInspection(payload)
      message.success('Quality inspection initialized successfully.')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchInspections(1, pagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to initialize quality inspection.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleOpenSignOff = () => {
    if (!selectedInspection) return
    signOffForm.setFieldsValue({
      decision: 'PASS',
      acceptedQuantity: selectedInspection.batchQuantity,
      rejectedQuantity: 0,
      scrappedQuantity: 0,
      concessionQuantity: 0,
      remark: 'All dimensional and metallurgical parameters conforming to engineering drawing standards.',
    })
    setSignOffModalOpen(true)
  }

  const handleExecuteSignOff = async () => {
    if (!selectedInspection) return
    try {
      const values = await signOffForm.validateFields()
      const total =
        Number(values.acceptedQuantity || 0) +
        Number(values.rejectedQuantity || 0) +
        Number(values.scrappedQuantity || 0) +
        Number(values.concessionQuantity || 0)

      if (total !== selectedInspection.batchQuantity) {
        message.error(
          `Sum of disposition quantities (${total}) must equal total lot/batch quantity (${selectedInspection.batchQuantity}).`
        )
        return
      }

      setSignOffSubmitting(true)
      const payload: QcInspectionSignOffRequest = {
        inspectionId: selectedInspection.id!,
        decision: values.decision,
        acceptedQuantity: Number(values.acceptedQuantity || 0),
        rejectedQuantity: Number(values.rejectedQuantity || 0),
        scrappedQuantity: Number(values.scrappedQuantity || 0),
        concessionQuantity: Number(values.concessionQuantity || 0),
        remark: values.remark,
      }

      await qcApi.signOffInspection(payload)
      message.success('Quality inspection signed off and inventory disposition executed successfully.')
      setSignOffModalOpen(false)
      setDrawerOpen(false)
      fetchInspections(pagination.current, pagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to complete quality inspection sign-off.')
    } finally {
      setSignOffSubmitting(false)
    }
  }

  const columns: TableColumnsType<QcInspectionDTO> = [
    {
      title: 'Inspection Number',
      dataIndex: 'inspectionNumber',
      key: 'inspectionNumber',
      render: (text, record) => (
        <a onClick={() => handleOpenDetailDrawer(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Inspection Stage',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      render: (type) => {
        const color = type === 'IQC' ? 'blue' : type === 'IPQC' ? 'orange' : 'purple'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: 'Item / Material',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => (
        <div>
          <Text strong>{name || `Item #${record.materialId}`}</Text>
          {record.materialStandard && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.materialStandard}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Source Reference',
      key: 'sourceDoc',
      render: (_, record) => (
        <Text type="secondary">
          {record.sourceDocumentType ? `${record.sourceDocumentType}: ` : ''}
          {record.sourceDocumentNumber || '-'}
        </Text>
      ),
    },
    {
      title: 'Lot / Batch Quantity',
      dataIndex: 'batchQuantity',
      key: 'batchQuantity',
      align: 'right',
      render: (qty, record) => (
        <Space>
          <Text>{qty}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            (Sample Size: {record.sampleSize})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        switch (status) {
          case 'COMPLETED':
            return <Tag color="success">COMPLETED</Tag>
          case 'IN_PROGRESS':
            return <Tag color="processing">IN PROGRESS</Tag>
          case 'PENDING':
            return <Tag color="warning">PENDING</Tag>
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
    {
      title: 'Inspection Disposition',
      dataIndex: 'decision',
      key: 'decision',
      render: (decision) => {
        if (!decision) return <Tag>NOT EVALUATED</Tag>
        if (decision === 'PASS') return <Tag color="green"><CheckCircleOutlined /> PASS</Tag>
        if (decision === 'FAIL') return <Tag color="red"><CloseCircleOutlined /> FAIL</Tag>
        return <Tag color="gold"><ExclamationCircleOutlined /> HOLD / CONDITIONAL</Tag>
      },
    },
    {
      title: 'Quality Inspector',
      dataIndex: 'inspectorName',
      key: 'inspectorName',
      render: (name) => <Text type="secondary">{name || '-'}</Text>,
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary" ghost onClick={() => handleOpenDetailDrawer(record)}>
            {record.status === 'COMPLETED' ? 'View Results' : 'Record Measurements'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            Quality Inspections
          </Title>
          <Text type="secondary">
            Incoming Quality Control (IQC), In-Process Quality Control (IPQC), and Final Quality Control (FQC) Verification and Disposition
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchInspections(pagination.current, pagination.pageSize)}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              loadTemplates()
              setCreateModalOpen(true)
            }}
          >
            Create Quality Inspection
          </Button>
        </Space>
      </div>

      {/* FILTER & TABS */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={selectedTypeTab}
          onChange={(key) => setSelectedTypeTab(key)}
          items={[
            { key: 'ALL', label: 'All Inspections' },
            { key: 'IQC', label: 'Incoming Quality Control (IQC)' },
            { key: 'IPQC', label: 'In-Process Quality Control (IPQC)' },
            { key: 'FQC', label: 'Final Quality Control (FQC)' },
          ]}
        />

        <Form form={form} layout="inline" onFinish={() => fetchInspections(1, pagination.pageSize, form.getFieldsValue())}>
          <Form.Item name="inspectionNumber">
            <Input placeholder="Inspection Number..." allowClear prefix={<BarcodeOutlined />} />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="Status" allowClear style={{ width: 140 }}>
              <Select.Option value="PENDING">PENDING</Select.Option>
              <Select.Option value="IN_PROGRESS">IN PROGRESS</Select.Option>
              <Select.Option value="COMPLETED">COMPLETED</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="decision">
            <Select placeholder="Disposition" allowClear style={{ width: 180 }}>
              <Select.Option value="PASS">PASS</Select.Option>
              <Select.Option value="FAIL">FAIL</Select.Option>
              <Select.Option value="CONDITIONAL">HOLD / CONDITIONAL</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                Search
              </Button>
              <Button onClick={() => { form.resetFields(); fetchInspections(1, pagination.pageSize) }}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* TABLE */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, s) => fetchInspections(p, s, form.getFieldsValue()),
          }}
        />
      </Card>

      {/* EXECUTION DRAWER */}
      <Drawer
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            <span>Quality Inspection Evaluation: {selectedInspection?.inspectionNumber}</span>
            {selectedInspection?.decision === 'PASS' && <Tag color="green">PASS</Tag>}
            {selectedInspection?.decision === 'FAIL' && <Tag color="red">FAIL</Tag>}
            {selectedInspection?.decision === 'CONDITIONAL' && <Tag color="gold">HOLD / CONDITIONAL</Tag>}
          </Space>
        }
        placement="right"
        width={850}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          selectedInspection?.status !== 'COMPLETED' && (
            <Space>
              <Button onClick={handleSaveReadings} loading={readingsLoading}>
                Record Measurements
              </Button>
              <Button type="primary" onClick={handleOpenSignOff}>
                Complete Inspection & Disposition
              </Button>
            </Space>
          )
        }
      >
        {selectedInspection && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Descriptions */}
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Inspection Stage">
                <Tag color="blue">{selectedInspection.inspectionType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Item / Material">
                {selectedInspection.materialName || `Item #${selectedInspection.materialId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Lot / Batch Quantity">
                {selectedInspection.batchQuantity} Units
              </Descriptions.Item>
              <Descriptions.Item label="Inspection Sample Size">
                {selectedInspection.sampleSize} Samples
              </Descriptions.Item>
              <Descriptions.Item label="Source Reference">
                {selectedInspection.sourceDocumentType ? `${selectedInspection.sourceDocumentType}: ` : ''}
                {selectedInspection.sourceDocumentNumber || 'Direct Shift Inspection'}
              </Descriptions.Item>
              <Descriptions.Item label="Quality Inspector">
                {selectedInspection.inspectorName || 'Lead Quality Inspector'}
              </Descriptions.Item>
              {selectedInspection.digitalSignature && (
                <Descriptions.Item label="Electronic Signature" span={2}>
                  <Text code copyable style={{ fontSize: 11 }}>
                    {selectedInspection.digitalSignature}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Checksheet Items Table */}
            <div>
              <Title level={5}>Inspection Specifications & Tolerance Limits</Title>
              {(!selectedInspection.items || selectedInspection.items.length === 0) ? (
                <Alert
                  type="info"
                  showIcon
                  message="Inspection Parameters Not Loaded"
                  description="No inspection parameters attached. Parameters can be configured directly or associated with an active Inspection Template."
                />
              ) : (
                <Table
                  dataSource={selectedInspection.items}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Inspection Parameter',
                      dataIndex: 'parameterName',
                      key: 'parameterName',
                      render: (text, item) => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{text}</Text>
                          {item.isCritical && <Tag color="red">Critical to Quality (CTQ)</Tag>}
                        </Space>
                      ),
                    },
                    {
                      title: 'Specification Limits (LSL / Nominal / USL)',
                      key: 'specs',
                      render: (_, item) => (
                        <div>
                          {item.parameterType === 'NUMERIC' ? (
                            <Text code>
                              [LSL: {item.lsl ?? '-∞'}, Nom: {item.nominalValue ?? '—'}, USL: {item.usl ?? '+∞'}] {item.unitOfMeasure || ''}
                            </Text>
                          ) : (
                            <Text type="secondary">Conforming / Non-Conforming Verification</Text>
                          )}
                        </div>
                      ),
                    },
                    {
                      title: 'Measured Value',
                      key: 'measured',
                      width: 200,
                      render: (_, item) => {
                        const currentVal = activeReadings[item.id!] || {}
                        const isCompleted = selectedInspection.status === 'COMPLETED'

                        if (item.parameterType === 'NUMERIC') {
                          return (
                            <InputNumber
                              disabled={isCompleted}
                              value={currentVal.numeric}
                              placeholder="Enter measured value"
                              onChange={(val) => {
                                setActiveReadings((prev) => ({
                                  ...prev,
                                  [item.id!]: { ...prev[item.id!], numeric: val ?? undefined },
                                }))
                              }}
                              style={{ width: '100%' }}
                            />
                          )
                        } else {
                          return (
                            <Select
                              disabled={isCompleted}
                              value={currentVal.booleanVal}
                              onChange={(val) => {
                                setActiveReadings((prev) => ({
                                  ...prev,
                                  [item.id!]: { ...prev[item.id!], booleanVal: val },
                                }))
                              }}
                              style={{ width: '100%' }}
                            >
                              <Select.Option value={true}>CONFORMING</Select.Option>
                              <Select.Option value={false}>NON-CONFORMING</Select.Option>
                            </Select>
                          )
                        }
                      },
                    },
                    {
                      title: 'Conforming Status',
                      key: 'eval',
                      render: (_, item) => {
                        if (item.isConforming === null || item.isConforming === undefined) {
                          return <Tag>Pending Evaluation</Tag>
                        }
                        if (item.isConforming) {
                          return <Tag color="green"><CheckCircleOutlined /> Conforming (In Spec)</Tag>
                        }
                        return (
                          <Tooltip title={`Deviation: ${item.deviation ?? 'Out of spec'}`}>
                            <Tag color="red"><CloseCircleOutlined /> Non-Conforming (Out of Spec)</Tag>
                          </Tooltip>
                        )
                      },
                    },
                  ]}
                />
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE QUALITY INSPECTION MODAL */}
      <Modal
        title="Create Quality Inspection"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateInspection}
        confirmLoading={createSubmitting}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" initialValues={{ inspectionType: 'IQC', sampleSize: 5 }}>
          <Form.Item name="inspectionType" label="Inspection Stage" rules={[{ required: true, message: 'Please select an inspection stage.' }]}>
            <Select>
              <Select.Option value="IQC">Incoming Quality Control (IQC)</Select.Option>
              <Select.Option value="IPQC">In-Process Quality Control (IPQC)</Select.Option>
              <Select.Option value="FQC">Final Quality Control (FQC)</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="materialId" label="Item / Material ID" rules={[{ required: true, message: 'Item / Material ID is required.' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="templateId" label="Inspection Template">
                <Select placeholder="Select active inspection template..." allowClear>
                  {templates.map((tpl) => (
                    <Select.Option key={tpl.id} value={tpl.id}>
                      {tpl.templateCode} - {tpl.templateName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="batchQuantity" label="Lot / Batch Quantity" rules={[{ required: true, message: 'Please enter lot / batch quantity.' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sampleSize" label="Inspection Sample Size" rules={[{ required: true, message: 'Please enter sample size.' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="5" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sourceDocumentType" label="Source Document Type">
                <Select placeholder="Select source document type..." allowClear>
                  <Select.Option value="PURCHASE_ORDER">Purchase Order</Select.Option>
                  <Select.Option value="GOODS_RECEIPT">Goods Receipt (GRN)</Select.Option>
                  <Select.Option value="WORK_ORDER">Work Order</Select.Option>
                  <Select.Option value="JOB_CARD">Job Card</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sourceDocumentNumber" label="Source Document Number">
                <Input placeholder="e.g. GRN-2026-001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="lotBatchNumber" label="Lot / Batch Traceability Number">
            <Input placeholder="e.g. LOT-202609-A" />
          </Form.Item>

          <Form.Item name="remark" label="Inspection Remarks & Sampling Notes">
            <Input.TextArea rows={2} placeholder="Inspection remarks and sampling notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* SIGN OFF & RELEASE MODAL */}
      <Modal
        title="Quality Inspection Sign-Off & Inventory Disposition"
        open={signOffModalOpen}
        onCancel={() => setSignOffModalOpen(false)}
        onOk={handleExecuteSignOff}
        confirmLoading={signOffSubmitting}
        destroyOnClose
        width={650}
      >
        <Alert
          type="warning"
          showIcon
          message="Mandatory Quality Gate Enforcement"
          description="Only Conforming (Accepted) and Concession quantities will be released from the quarantine storage bin to Available Stock. Rejected quantities remain blocked in quarantine."
          style={{ marginBottom: 16 }}
        />

        <Form form={signOffForm} layout="vertical">
          <Form.Item name="decision" label="Inspection Disposition" rules={[{ required: true, message: 'Please select an inspection disposition.' }]}>
            <Select>
              <Select.Option value="PASS">PASS (Release Conforming Stock)</Select.Option>
              <Select.Option value="FAIL">FAIL (Block & Escalate Non-Conformance)</Select.Option>
              <Select.Option value="CONDITIONAL">HOLD / CONDITIONAL (Partial Acceptance / Concession)</Select.Option>
            </Select>
          </Form.Item>

          <Divider titlePlacement="start">Quantity Disposition Breakdown</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="acceptedQuantity" label="Accepted Quantity (Release to Stock)" rules={[{ required: true, message: 'Please enter accepted quantity.' }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rejectedQuantity" label="Rejected Quantity (Quarantine Block)" rules={[{ required: true, message: 'Please enter rejected quantity.' }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="concessionQuantity" label="Concession Quantity (Use As Is)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scrappedQuantity" label="Scrapped Quantity">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="Inspection Remarks & Disposition Notes">
            <Input.TextArea rows={2} placeholder="Disposition rationale and audit trail notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
