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
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BranchesOutlined,
  AuditOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  FileProtectOutlined,
} from '@ant-design/icons'
import {
  qcApi,
  QcNcrDTO,
  QcNcrDispositionDTO,
  QcDefectRecordDTO,
  QcNcrCreateRequest,
  QcNcrDispositionRequest,
  QcMrbSignOffRequest,
} from '../api/qcApi'
import { workOrderApi } from '@features/manufacturing/api/workOrderApi'

const { Title, Text } = Typography

export const NcrManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('NCR')

  // NCR Table State
  const [ncrForm] = Form.useForm()
  const [ncrLoading, setNcrLoading] = useState(false)
  const [ncrList, setNcrList] = useState<QcNcrDTO[]>([])
  const [ncrPagination, setNcrPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Defect Table State
  const [defectForm] = Form.useForm()
  const [defectLoading, setDefectLoading] = useState(false)
  const [defectList, setDefectList] = useState<QcDefectRecordDTO[]>([])
  const [defectPagination, setDefectPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Drawer & Modals
  const [selectedNcr, setSelectedNcr] = useState<QcNcrDTO | null>(null)
  const [ncrDrawerOpen, setNcrDrawerOpen] = useState(false)
  const [createNcrOpen, setCreateNcrOpen] = useState(false)
  const [proposeDispOpen, setProposeDispOpen] = useState(false)
  const [signOffMrbOpen, setSignOffMrbOpen] = useState(false)
  const [selectedApprovalId, setSelectedApprovalId] = useState<number | null>(null)
  const [recordDefectOpen, setRecordDefectOpen] = useState(false)

  // Forms
  const [createNcrForm] = Form.useForm()
  const [dispForm] = Form.useForm()
  const [mrbSignOffForm] = Form.useForm()
  const [recordDefectForm] = Form.useForm()

  const fetchNcrs = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setNcrLoading(true)
    try {
      const res: any = await qcApi.getNcrList({
        currentPage: page,
        pageSize: size,
        sourceType: filters.sourceType,
        severity: filters.severity,
        status: filters.status,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setNcrList(rows)
      setNcrPagination({ current: page, pageSize: size, total })
    } catch (err) {
      message.error('Failed to load Non-Conformance Reports.')
    } finally {
      setNcrLoading(false)
    }
  }, [])

  const fetchDefects = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setDefectLoading(true)
    try {
      const res: any = await qcApi.getDefectList({
        currentPage: page,
        pageSize: size,
        severity: filters.severity,
        status: filters.status,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDefectList(rows)
      setDefectPagination({ current: page, pageSize: size, total })
    } catch (err) {
      message.error('Failed to load quality defect records.')
    } finally {
      setDefectLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'NCR') {
      fetchNcrs(1, 10)
    } else {
      fetchDefects(1, 10)
    }
  }, [activeTab, fetchNcrs, fetchDefects])

  const handleOpenNcrDrawer = async (ncr: QcNcrDTO) => {
    try {
      setNcrDrawerOpen(true)
      const res: any = await qcApi.getNcrById(ncr.id!)
      setSelectedNcr(res?.data || res)
    } catch (err) {
      message.error('Failed to load Non-Conformance Report details.')
    }
  }

  const handleCreateReworkOrder = async (ncrDispositionId: number) => {
    try {
      const res: any = await workOrderApi.createReworkWorkOrder({ ncrDispositionId })
      const rwo: any = res?.data || res
      message.success(`Dedicated Rework Work Order ${rwo.orderNumber} created successfully.`)
      if (selectedNcr?.id) {
        handleOpenNcrDrawer(selectedNcr)
      }
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Failed to create rework work order.')
    }
  }

  const handleCreateNcr = async () => {
    try {
      const values = await createNcrForm.validateFields()
      const payload: QcNcrCreateRequest = {
        sourceType: values.sourceType,
        materialId: Number(values.materialId),
        quantityNonConforming: Number(values.quantityNonConforming),
        severity: values.severity,
        containmentActions: values.containmentActions,
        quarantineBinId: values.quarantineBinId ? Number(values.quarantineBinId) : undefined,
        remark: values.remark,
      }
      await qcApi.createNcr(payload)
      message.success('Non-Conformance Report created and quarantine hold placed successfully.')
      setCreateNcrOpen(false)
      createNcrForm.resetFields()
      fetchNcrs(1, ncrPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to create Non-Conformance Report.')
    }
  }

  const handleProposeDisposition = async () => {
    if (!selectedNcr) return
    try {
      const values = await dispForm.validateFields()
      const payload: QcNcrDispositionRequest = {
        ncrId: selectedNcr.id!,
        dispositionType: values.dispositionType,
        dispositionJustification: values.dispositionJustification,
        reworkInstructions: values.reworkInstructions,
        scrapValueRecovery: values.scrapValueRecovery ? Number(values.scrapValueRecovery) : undefined,
      }
      await qcApi.proposeDisposition(payload)
      message.success('Material Review Board (MRB) disposition proposed successfully.')
      setProposeDispOpen(false)
      dispForm.resetFields()
      handleOpenNcrDrawer(selectedNcr)
    } catch (err: any) {
      message.error(err.message || 'Failed to propose Material Review Board disposition.')
    }
  }

  const handleSignOffMrb = async () => {
    if (!selectedApprovalId || !selectedNcr) return
    try {
      const values = await mrbSignOffForm.validateFields()
      const payload: QcMrbSignOffRequest = {
        mrbApprovalId: selectedApprovalId,
        approvalStatus: values.approvalStatus,
        comments: values.comments,
      }
      await qcApi.signOffMrb(payload)
      message.success('Material Review Board approval and electronic signature recorded successfully.')
      setSignOffMrbOpen(false)
      mrbSignOffForm.resetFields()
      handleOpenNcrDrawer(selectedNcr)
    } catch (err: any) {
      message.error(err.message || 'Failed to record Material Review Board approval.')
    }
  }

  const handleExecuteDisposition = async (dispId: number) => {
    if (!selectedNcr) return
    try {
      const res: any = await qcApi.executeDisposition(dispId)
      const updated: QcNcrDispositionDTO = res?.data || res
      if (updated.assignedReworkWorkOrderId) {
        message.success(
          `Disposition executed: Rework Work Order ${updated.reworkWorkOrderNumber || updated.assignedReworkWorkOrderId} created with production lineage.`
        )
      } else {
        message.success('Quality disposition executed and inventory movements recorded successfully.')
      }
      handleOpenNcrDrawer(selectedNcr)
      fetchNcrs(ncrPagination.current, ncrPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to execute quality disposition.')
    }
  }

  const handleRecordDefect = async () => {
    try {
      const values = await recordDefectForm.validateFields()
      await qcApi.recordDefect({
        materialId: Number(values.materialId),
        severity: values.severity,
        defectCategory: values.defectCategory,
        quantityAffected: Number(values.quantityAffected),
        rootCauseHypothesis: values.rootCauseHypothesis,
        responsibleDepartment: values.responsibleDepartment,
        containmentAction: values.containmentAction,
      })
      message.success('Quality defect record logged successfully.')
      setRecordDefectOpen(false)
      recordDefectForm.resetFields()
      fetchDefects(1, defectPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to log quality defect record.')
    }
  }

  const ncrColumns: TableColumnsType<QcNcrDTO> = [
    {
      title: 'NCR Number',
      dataIndex: 'ncrNumber',
      key: 'ncrNumber',
      render: (text, record) => (
        <a onClick={() => handleOpenNcrDrawer(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev) => {
        if (sev === 'CRITICAL') return <Tag color="red">CRITICAL</Tag>
        if (sev === 'MAJOR') return <Tag color="orange">MAJOR</Tag>
        return <Tag color="gold">MINOR</Tag>
      },
    },
    {
      title: 'Inspection Source',
      dataIndex: 'sourceType',
      key: 'sourceType',
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Item / Material',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => <Text strong>{name || `Item #${record.materialId}`}</Text>,
    },
    {
      title: 'Non-Conforming Quantity',
      dataIndex: 'quantityNonConforming',
      key: 'quantityNonConforming',
      align: 'right',
      render: (qty) => <Text type="danger" strong>{qty}</Text>,
    },
    {
      title: 'Containment Status',
      dataIndex: 'containmentStatus',
      key: 'containmentStatus',
      render: (status) => {
        if (status === 'QUARANTINED') return <Tag color="volcano">QUARANTINED</Tag>
        if (status === 'BLOCKED') return <Tag color="red">BLOCKED</Tag>
        return <Tag>NONE</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        switch (status) {
          case 'CLOSED':
            return <Tag color="success">CLOSED</Tag>
          case 'DISPOSITIONED':
            return <Tag color="purple">DISPOSITIONED</Tag>
          case 'MRB_REVIEW':
            return <Tag color="geekblue">MRB REVIEW</Tag>
          case 'CONTAINED':
            return <Tag color="warning">CONTAINED</Tag>
          default:
            return <Tag color="error">OPEN</Tag>
        }
      },
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => handleOpenNcrDrawer(record)}>
          View Report
        </Button>
      ),
    },
  ]

  const defectColumns: TableColumnsType<QcDefectRecordDTO> = [
    {
      title: 'Defect Code',
      dataIndex: 'defectCode',
      key: 'defectCode',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Defect Category',
      dataIndex: 'defectCategory',
      key: 'defectCategory',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev) => {
        if (sev === 'CRITICAL') return <Tag color="red">CRITICAL</Tag>
        if (sev === 'MAJOR') return <Tag color="orange">MAJOR</Tag>
        return <Tag color="gold">MINOR</Tag>
      },
    },
    {
      title: 'Quantity Affected',
      dataIndex: 'quantityAffected',
      key: 'quantityAffected',
      align: 'right',
      render: (qty) => <Text type="danger">{qty}</Text>,
    },
    {
      title: 'Probable Root Cause',
      dataIndex: 'rootCauseHypothesis',
      key: 'rootCauseHypothesis',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Responsible Department',
      dataIndex: 'responsibleDepartment',
      key: 'responsibleDepartment',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'RESOLVED') return <Tag color="green">RESOLVED</Tag>
        if (status === 'ESCALATED_NCR') return <Tag color="red">ESCALATED NCR</Tag>
        if (status === 'INVESTIGATING') return <Tag color="blue">INVESTIGATING</Tag>
        return <Tag color="orange">OPEN</Tag>
      },
    },
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: '#ff4d4f' }} />
            Non-Conformance Reports (NCR) & Material Review Board (MRB)
          </Title>
          <Text type="secondary">
            Defect Logging, Mandatory Quarantine Segregation, Multi-Approver MRB Sign-Off, and Rework Lineage Traceability
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => activeTab === 'NCR' ? fetchNcrs(1, 10) : fetchDefects(1, 10)}>
            Refresh
          </Button>
          {activeTab === 'NCR' ? (
            <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setCreateNcrOpen(true)}>
              Create Non-Conformance Report
            </Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecordDefectOpen(true)}>
              Record Quality Defect
            </Button>
          )}
        </Space>
      </div>

      {/* TABS */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          items={[
            { key: 'NCR', label: 'Non-Conformance Reports (NCR)' },
            { key: 'DEFECTS', label: 'Quality Defect Logging' },
          ]}
        />

        {activeTab === 'NCR' ? (
          <div>
            <Form form={ncrForm} layout="inline" onFinish={() => fetchNcrs(1, ncrPagination.pageSize, ncrForm.getFieldsValue())} style={{ marginBottom: 16 }}>
              <Form.Item name="severity">
                <Select placeholder="Severity" allowClear style={{ width: 140 }}>
                  <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                  <Select.Option value="MAJOR">MAJOR</Select.Option>
                  <Select.Option value="MINOR">MINOR</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="status">
                <Select placeholder="Status" allowClear style={{ width: 150 }}>
                  <Select.Option value="OPEN">OPEN</Select.Option>
                  <Select.Option value="CONTAINED">CONTAINED</Select.Option>
                  <Select.Option value="MRB_REVIEW">MRB REVIEW</Select.Option>
                  <Select.Option value="DISPOSITIONED">DISPOSITIONED</Select.Option>
                  <Select.Option value="CLOSED">CLOSED</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    Search
                  </Button>
                  <Button onClick={() => { ncrForm.resetFields(); fetchNcrs(1, ncrPagination.pageSize) }}>
                    Reset
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            <Table
              columns={ncrColumns}
              dataSource={ncrList}
              rowKey="id"
              loading={ncrLoading}
              pagination={{
                current: ncrPagination.current,
                pageSize: ncrPagination.pageSize,
                total: ncrPagination.total,
                onChange: (p, s) => fetchNcrs(p, s, ncrForm.getFieldsValue()),
              }}
            />
          </div>
        ) : (
          <div>
            <Form form={defectForm} layout="inline" onFinish={() => fetchDefects(1, defectPagination.pageSize, defectForm.getFieldsValue())} style={{ marginBottom: 16 }}>
              <Form.Item name="severity">
                <Select placeholder="Severity" allowClear style={{ width: 140 }}>
                  <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                  <Select.Option value="MAJOR">MAJOR</Select.Option>
                  <Select.Option value="MINOR">MINOR</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    Search
                  </Button>
                  <Button onClick={() => { defectForm.resetFields(); fetchDefects(1, defectPagination.pageSize) }}>
                    Reset
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            <Table
              columns={defectColumns}
              dataSource={defectList}
              rowKey="id"
              loading={defectLoading}
              pagination={{
                current: defectPagination.current,
                pageSize: defectPagination.pageSize,
                total: defectPagination.total,
                onChange: (p, s) => fetchDefects(p, s, defectForm.getFieldsValue()),
              }}
            />
          </div>
        )}
      </Card>

      {/* NCR DETAILS & MRB APPROVAL DRAWER */}
      <Drawer
        title={
          <Space>
            <AlertOutlined style={{ color: '#ff4d4f' }} />
            <span>Non-Conformance Report: {selectedNcr?.ncrNumber}</span>
            <Tag color={selectedNcr?.severity === 'CRITICAL' ? 'red' : 'orange'}>
              {selectedNcr?.severity}
            </Tag>
          </Space>
        }
        placement="right"
        width={850}
        open={ncrDrawerOpen}
        onClose={() => setNcrDrawerOpen(false)}
        extra={
          selectedNcr?.status !== 'CLOSED' && (
            <Button type="primary" danger onClick={() => setProposeDispOpen(true)}>
              Propose Disposition
            </Button>
          )
        }
      >
        {selectedNcr && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Containment Alert */}
            <Alert
              type={selectedNcr.containmentStatus === 'QUARANTINED' ? 'warning' : 'info'}
              showIcon
              message={`Containment Status: ${selectedNcr.containmentStatus}`}
              description={selectedNcr.containmentActions || 'Quarantined in quarantine storage bin. Inventory blocked from sales allocation.'}
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Item / Material">
                {selectedNcr.materialName || `Item #${selectedNcr.materialId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Non-Conforming Quantity">
                <Text type="danger" strong>{selectedNcr.quantityNonConforming} Units</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Inspection Source">
                <Tag color="blue">{selectedNcr.sourceType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="NCR Status">
                <Tag color="geekblue">{selectedNcr.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reported By">
                {selectedNcr.creatorName || 'Lead Quality Inspector'}
              </Descriptions.Item>
              <Descriptions.Item label="Creation Date">
                {selectedNcr.createTime || '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* MRB DISPOSITIONS & MULTI-APPROVER COMMITTEE */}
            <div>
              <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AuditOutlined style={{ color: '#1890ff' }} />
                Material Review Board (MRB) Dispositions & Sign-Offs
              </Title>

              {(!selectedNcr.dispositions || selectedNcr.dispositions.length === 0) ? (
                <Alert
                  type="info"
                  message="No Dispositions Proposed"
                  description="Use the 'Propose Disposition' button to submit formal disposition action for MRB committee sign-off."
                  showIcon
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedNcr.dispositions.map((disp) => {
                    const allApproved =
                      disp.approvals &&
                      disp.approvals.length > 0 &&
                      disp.approvals.every((a) => a.approvalStatus === 'APPROVED')

                    return (
                      <Card
                        key={disp.id}
                        size="small"
                        title={
                          <Space>
                            <BranchesOutlined />
                            <Text strong>{disp.dispositionNumber} — {disp.dispositionType}</Text>
                            <Tag color={disp.status === 'EXECUTED' ? 'green' : disp.status === 'APPROVED' ? 'blue' : 'warning'}>
                              {disp.status}
                            </Tag>
                          </Space>
                        }
                        extra={
                          <Space>
                            {disp.dispositionType === 'REWORK' && !disp.assignedReworkWorkOrderId && disp.status === 'APPROVED' && (
                              <Button
                                type="primary"
                                size="small"
                                icon={<BranchesOutlined />}
                                onClick={() => handleCreateReworkOrder(disp.id!)}
                              >
                                Create Rework Work Order
                              </Button>
                            )}
                            {disp.status === 'APPROVED' && (
                              <Button
                                type={disp.dispositionType === 'REWORK' && !disp.assignedReworkWorkOrderId ? 'default' : 'primary'}
                                size="small"
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleExecuteDisposition(disp.id!)}
                              >
                                Execute Disposition
                              </Button>
                            )}
                          </Space>
                        }
                        style={{ border: '1px solid #d9d9d9', borderRadius: 8 }}
                      >
                        <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                          <Descriptions.Item label="Justification">
                            {disp.dispositionJustification}
                          </Descriptions.Item>
                          {disp.reworkInstructions && (
                            <Descriptions.Item label="Rework Instructions">
                              <Text code>{disp.reworkInstructions}</Text>
                            </Descriptions.Item>
                          )}
                          {disp.assignedReworkWorkOrderId && (
                            <Descriptions.Item label="Rework Lineage">
                              <Tag color="cyan">
                                Rework Work Order {disp.reworkWorkOrderNumber || disp.assignedReworkWorkOrderId} (Dedicated Rework Routing)
                              </Tag>
                            </Descriptions.Item>
                          )}
                        </Descriptions>

                        <Divider titlePlacement="start" style={{ margin: '8px 0', fontSize: 13 }}>
                          MRB Multi-Approval Committee Sign-Off Matrix
                        </Divider>

                        <Table
                          dataSource={disp.approvals || []}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: 'Approver Role',
                              dataIndex: 'approverRole',
                              key: 'approverRole',
                              render: (role) => <Tag color="blue">{role}</Tag>,
                            },
                            {
                              title: 'Status',
                              dataIndex: 'approvalStatus',
                              key: 'approvalStatus',
                              render: (st) => {
                                if (st === 'APPROVED') return <Tag color="green"><CheckCircleOutlined /> APPROVED</Tag>
                                if (st === 'REJECTED') return <Tag color="red"><CloseCircleOutlined /> REJECTED</Tag>
                                return <Tag color="orange">PENDING</Tag>
                              },
                            },
                            {
                              title: 'Signed By',
                              dataIndex: 'approverName',
                              key: 'approverName',
                              render: (name) => <Text type="secondary">{name || 'Unassigned'}</Text>,
                            },
                            {
                              title: 'Electronic Signature',
                              dataIndex: 'digitalSignature',
                              key: 'digitalSignature',
                              render: (sig) =>
                                sig ? (
                                  <Tooltip title={sig}>
                                    <Tag color="purple"><FileProtectOutlined /> Verified</Tag>
                                  </Tooltip>
                                ) : (
                                  <Text type="secondary">-</Text>
                                ),
                            },
                            {
                              title: 'Actions',
                              key: 'action',
                              render: (_, app) =>
                                app.approvalStatus === 'PENDING' && (
                                  <Button
                                    size="small"
                                    type="link"
                                    onClick={() => {
                                      setSelectedApprovalId(app.id!)
                                      setSignOffMrbOpen(true)
                                    }}
                                  >
                                    Sign Off Disposition
                                  </Button>
                                ),
                            },
                          ]}
                        />
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE NCR MODAL */}
      <Modal
        title="Create Non-Conformance Report (NCR)"
        open={createNcrOpen}
        onCancel={() => setCreateNcrOpen(false)}
        onOk={handleCreateNcr}
        destroyOnClose
        width={650}
      >
        <Form form={createNcrForm} layout="vertical" initialValues={{ sourceType: 'IQC', severity: 'MAJOR' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sourceType" label="Inspection Source" rules={[{ required: true, message: 'Please select an inspection source.' }]}>
                <Select>
                  <Select.Option value="IQC">Incoming Quality Control (IQC)</Select.Option>
                  <Select.Option value="IPQC">In-Process Quality Control (IPQC)</Select.Option>
                  <Select.Option value="FQC">Final Quality Control (FQC)</Select.Option>
                  <Select.Option value="CUSTOMER_RETURN">Customer RMA Return</Select.Option>
                  <Select.Option value="INTERNAL_AUDIT">Internal Process Audit</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Please select severity.' }]}>
                <Select>
                  <Select.Option value="CRITICAL">CRITICAL (Immediate Line Stoppage)</Select.Option>
                  <Select.Option value="MAJOR">MAJOR (Functional/Fit Non-Conformance)</Select.Option>
                  <Select.Option value="MINOR">MINOR (Cosmetic/Minor Departure)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="materialId" label="Item / Material ID" rules={[{ required: true, message: 'Item / Material ID is required.' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantityNonConforming" label="Non-Conforming Quantity" rules={[{ required: true, message: 'Please enter non-conforming quantity.' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="containmentActions" label="Immediate Containment Actions (Quarantine Hold)">
            <Input.TextArea rows={2} placeholder="Physical segregation into quarantine storage bin..." />
          </Form.Item>

          <Form.Item name="remark" label="Inspection Remarks & Observations">
            <Input.TextArea rows={2} placeholder="Observations and engineering notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* PROPOSE MRB DISPOSITION MODAL */}
      <Modal
        title="Propose Material Review Board (MRB) Disposition"
        open={proposeDispOpen}
        onCancel={() => setProposeDispOpen(false)}
        onOk={handleProposeDisposition}
        destroyOnClose
        width={650}
      >
        <Form form={dispForm} layout="vertical" initialValues={{ dispositionType: 'REWORK' }}>
          <Form.Item name="dispositionType" label="Disposition" rules={[{ required: true, message: 'Please select a disposition.' }]}>
            <Select>
              <Select.Option value="REWORK">REWORK (Generate Rework Work Order)</Select.Option>
              <Select.Option value="SCRAP">SCRAP (Write Off to Scrap Bin with Recovery)</Select.Option>
              <Select.Option value="RETURN_TO_VENDOR">RETURN TO SUPPLIER (Debit Note)</Select.Option>
              <Select.Option value="USE_AS_IS">USE AS IS / CONCESSION (Engineering Concession)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dispositionJustification" label="Technical Justification & Risk Analysis" rules={[{ required: true, message: 'Please enter technical justification.' }]}>
            <Input.TextArea rows={3} placeholder="State structural/functional justification for this disposition..." />
          </Form.Item>

          <Form.Item name="reworkInstructions" label="Rework Routing Instructions">
            <Input.TextArea rows={2} placeholder="e.g. Re-machine outside diameter to 49.95mm on Lathe #2..." />
          </Form.Item>

          <Form.Item name="scrapValueRecovery" label="Estimated Scrap Recovery Value (₹)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MRB SIGN OFF MODAL */}
      <Modal
        title="MRB Electronic Approval & Sign-Off"
        open={signOffMrbOpen}
        onCancel={() => setSignOffMrbOpen(false)}
        onOk={handleSignOffMrb}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="Immutable Electronic Signature Verification"
          description="Your decision and timestamp will be digitally recorded with tenant-scoped electronic signature verification."
          style={{ marginBottom: 16 }}
        />
        <Form form={mrbSignOffForm} layout="vertical" initialValues={{ approvalStatus: 'APPROVED' }}>
          <Form.Item name="approvalStatus" label="Approval Decision" rules={[{ required: true, message: 'Please select approval decision.' }]}>
            <Select>
              <Select.Option value="APPROVED">APPROVE DISPOSITION</Select.Option>
              <Select.Option value="REJECTED">REJECT DISPOSITION</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="comments" label="Engineering Review Comments" rules={[{ required: true, message: 'Please enter engineering review comments.' }]}>
            <Input.TextArea rows={3} placeholder="Technical comments and sign-off remarks..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* RECORD DEFECT MODAL */}
      <Modal
        title="Record Quality Defect"
        open={recordDefectOpen}
        onCancel={() => setRecordDefectOpen(false)}
        onOk={handleRecordDefect}
        destroyOnClose
        width={650}
      >
        <Form form={recordDefectForm} layout="vertical" initialValues={{ severity: 'MAJOR', defectCategory: 'DIMENSIONAL' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="materialId" label="Item / Material ID" rules={[{ required: true, message: 'Item / Material ID is required.' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantityAffected" label="Quantity Affected" rules={[{ required: true, message: 'Please enter quantity affected.' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Please select severity.' }]}>
                <Select>
                  <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                  <Select.Option value="MAJOR">MAJOR</Select.Option>
                  <Select.Option value="MINOR">MINOR</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="defectCategory" label="Defect Category" rules={[{ required: true, message: 'Please select defect category.' }]}>
                <Select>
                  <Select.Option value="DIMENSIONAL">Dimensional Variance</Select.Option>
                  <Select.Option value="SURFACE_DEFECT">Surface Finish / Scratch</Select.Option>
                  <Select.Option value="METALLURGICAL">Hardness / Tensile Departure</Select.Option>
                  <Select.Option value="PACKAGING">Packaging / Labelling</Select.Option>
                  <Select.Option value="ELECTRICAL">Electrical Conductivity</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="rootCauseHypothesis" label="Probable Root Cause">
            <Input.TextArea rows={2} placeholder="Identify probable root cause mechanism..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="responsibleDepartment" label="Responsible Department">
                <Input placeholder="Machining / CNC Line 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="containmentAction" label="Immediate Containment Action">
                <Input placeholder="Segregated to quarantine storage bin" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
