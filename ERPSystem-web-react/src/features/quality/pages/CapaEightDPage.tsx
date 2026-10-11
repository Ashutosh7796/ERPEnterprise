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
  Steps,
  Timeline,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  AuditOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import {
  qcApi,
  QcCapaDTO,
  QcEightDDTO,
  QcEightDStepDTO,
} from '../api/qcApi'

const { Title, Text } = Typography

export const CapaEightDPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('CAPA')

  // CAPA State
  const [capaLoading, setCapaLoading] = useState(false)
  const [capaList, setCapaList] = useState<QcCapaDTO[]>([])
  const [capaPagination, setCapaPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedCapa, setSelectedCapa] = useState<QcCapaDTO | null>(null)
  const [capaDrawerOpen, setCapaDrawerOpen] = useState(false)
  const [initiateCapaOpen, setInitiateCapaOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)

  // 8D State
  const [eightDLoading, setEightDLoading] = useState(false)
  const [eightDList, setEightDList] = useState<QcEightDDTO[]>([])
  const [eightDPagination, setEightDPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedEightD, setSelectedEightD] = useState<QcEightDDTO | null>(null)
  const [eightDDrawerOpen, setEightDDrawerOpen] = useState(false)
  const [initiateEightDOpen, setInitiateEightDOpen] = useState(false)
  const [advanceStepOpen, setAdvanceStepOpen] = useState(false)

  // Forms
  const [initiateCapaForm] = Form.useForm()
  const [fiveWhyForm] = Form.useForm()
  const [verifyForm] = Form.useForm()
  const [initiateEightDForm] = Form.useForm()
  const [advanceStepForm] = Form.useForm()

  const fetchCapas = useCallback(async (page = 1, size = 10) => {
    setCapaLoading(true)
    try {
      const res: any = await qcApi.getCapaList({ currentPage: page, pageSize: size })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setCapaList(rows)
      setCapaPagination({ current: page, pageSize: size, total })
    } catch (err) {
      message.error('Failed to load CAPA records.')
    } finally {
      setCapaLoading(false)
    }
  }, [])

  const fetchEightD = useCallback(async (page = 1, size = 10) => {
    setEightDLoading(true)
    try {
      const res: any = await qcApi.getEightDList({ currentPage: page, pageSize: size })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setEightDList(rows)
      setEightDPagination({ current: page, pageSize: size, total })
    } catch (err) {
      message.error('Failed to load 8D reports.')
    } finally {
      setEightDLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'CAPA') {
      fetchCapas(1, 10)
    } else {
      fetchEightD(1, 10)
    }
  }, [activeTab, fetchCapas, fetchEightD])

  const handleOpenCapaDrawer = async (capa: QcCapaDTO) => {
    try {
      setCapaDrawerOpen(true)
      const res: any = await qcApi.getCapaById(capa.id!)
      const full = res?.data || res
      setSelectedCapa(full)
      fiveWhyForm.setFieldsValue({
        why1: full.why1,
        why2: full.why2,
        why3: full.why3,
        why4: full.why4,
        why5: full.why5,
        rootCauseConclusion: full.rootCauseConclusion,
        correctiveActionPlan: full.correctiveActionPlan,
        preventiveActionPlan: full.preventiveActionPlan,
      })
    } catch (err) {
      message.error('Failed to load CAPA record details.')
    }
  }

  const handleOpenEightDDrawer = async (eightD: QcEightDDTO) => {
    try {
      setEightDDrawerOpen(true)
      const res: any = await qcApi.getEightDById(eightD.id!)
      setSelectedEightD(res?.data || res)
    } catch (err) {
      message.error('Failed to load 8D report details.')
    }
  }

  const handleInitiateCapa = async () => {
    try {
      const values = await initiateCapaForm.validateFields()
      await qcApi.initiateCapa({
        problemStatement: values.problemStatement,
        interimContainment: values.interimContainment,
        effectivenessVerificationDays: Number(values.effectivenessVerificationDays || 30),
      })
      message.success('CAPA initiated successfully.')
      setInitiateCapaOpen(false)
      initiateCapaForm.resetFields()
      fetchCapas(1, capaPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to initiate CAPA.')
    }
  }

  const handleSaveFiveWhy = async () => {
    if (!selectedCapa) return
    try {
      const values = await fiveWhyForm.validateFields()
      await qcApi.updateCapaRootCause({
        capaId: selectedCapa.id!,
        why1: values.why1,
        why2: values.why2,
        why3: values.why3,
        why4: values.why4,
        why5: values.why5,
        rootCauseConclusion: values.rootCauseConclusion,
        correctiveActionPlan: values.correctiveActionPlan,
        preventiveActionPlan: values.preventiveActionPlan,
      })
      message.success('5-Why root cause analysis and action plans saved successfully.')
      handleOpenCapaDrawer(selectedCapa)
      fetchCapas(capaPagination.current, capaPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to save 5-Why root cause analysis.')
    }
  }

  const handleVerifyEffectiveness = async () => {
    if (!selectedCapa) return
    try {
      const values = await verifyForm.validateFields()
      await qcApi.verifyCapaEffectiveness({
        capaId: selectedCapa.id!,
        recurrenceDetected: values.recurrenceDetected === 'YES',
        notes: values.notes,
      })
      if (values.recurrenceDetected === 'YES') {
        message.warning('Recurrence detected during effectiveness review. CAPA reopened for corrective action revision.')
      } else {
        message.success('Effectiveness verified successfully. CAPA closed.')
      }
      setVerifyOpen(false)
      verifyForm.resetFields()
      handleOpenCapaDrawer(selectedCapa)
      fetchCapas(capaPagination.current, capaPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to record effectiveness verification result.')
    }
  }

  const handleInitiateEightD = async () => {
    try {
      const values = await initiateEightDForm.validateFields()
      await qcApi.initiateEightD({
        title: values.title,
        leaderUserId: values.leaderUserId ? Number(values.leaderUserId) : undefined,
        championUserId: values.championUserId ? Number(values.championUserId) : undefined,
      })
      message.success('8D report created successfully. Current discipline: D1 — Establish the Team.')
      setInitiateEightDOpen(false)
      initiateEightDForm.resetFields()
      fetchEightD(1, eightDPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to create 8D report.')
    }
  }

  const handleAdvanceStep = async () => {
    if (!selectedEightD) return
    try {
      const values = await advanceStepForm.validateFields()
      await qcApi.updateEightDDiscipline({
        eightDId: selectedEightD.id!,
        disciplineCode: values.disciplineCode,
        contentJson: values.contentJson,
      })
      message.success(`8D discipline ${values.disciplineCode} completed and signed electronically.`)
      setAdvanceStepOpen(false)
      advanceStepForm.resetFields()
      handleOpenEightDDrawer(selectedEightD)
      fetchEightD(eightDPagination.current, eightDPagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to complete 8D discipline step.')
    }
  }

  const capaColumns: TableColumnsType<QcCapaDTO> = [
    {
      title: 'CAPA Number',
      dataIndex: 'capaNumber',
      key: 'capaNumber',
      render: (text, record) => (
        <a onClick={() => handleOpenCapaDrawer(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Problem Statement',
      dataIndex: 'problemStatement',
      key: 'problemStatement',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        if (st === 'CLOSED') return <Tag color="green">CLOSED</Tag>
        if (st === 'EFFECTIVENESS_VERIFIED') return <Tag color="cyan">VERIFIED</Tag>
        if (st === 'REOPENED') return <Tag color="error">REOPENED</Tag>
        if (st === 'ACTIONS_IMPLEMENTED') return <Tag color="blue">ACTIONS IMPLEMENTED</Tag>
        return <Tag color="orange">{st}</Tag>
      },
    },
    {
      title: 'Effectiveness Verification Period',
      dataIndex: 'effectivenessVerificationDays',
      key: 'effectivenessVerificationDays',
      render: (days) => <Tag color="purple">{days || 30} Days</Tag>,
    },
    {
      title: 'Effectiveness',
      dataIndex: 'effectivenessResult',
      key: 'effectivenessResult',
      render: (res) => {
        if (!res) return <Tag>PENDING</Tag>
        if (res === 'SUCCESS') return <Tag color="green"><CheckCircleOutlined /> SUCCESS</Tag>
        return <Tag color="red"><CloseCircleOutlined /> RECURRENCE</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => handleOpenCapaDrawer(record)}>
          5-Why & Actions
        </Button>
      ),
    },
  ]

  const eightDColumns: TableColumnsType<QcEightDDTO> = [
    {
      title: '8D Report Number',
      dataIndex: 'eightDNumber',
      key: 'eightDNumber',
      render: (text, record) => (
        <a onClick={() => handleOpenEightDDrawer(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Title / Subject',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Current Discipline',
      dataIndex: 'currentDiscipline',
      key: 'currentDiscipline',
      render: (d) => <Tag color="geekblue" style={{ fontWeight: 700 }}>{d}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        st === 'CLOSED' ? <Tag color="green">CLOSED</Tag> : <Tag color="processing">ACTIVE</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => handleOpenEightDDrawer(record)}>
          View Report
        </Button>
      ),
    },
  ]

  const disciplineList = [
    { code: 'D1', title: 'D1: Establish the Team' },
    { code: 'D2', title: 'D2: Describe the Problem' },
    { code: 'D3', title: 'D3: Interim Containment Actions' },
    { code: 'D4', title: 'D4: Root Cause & Escape Point Analysis' },
    { code: 'D5', title: 'D5: Permanent Corrective Actions' },
    { code: 'D6', title: 'D6: Implement & Validate Corrective Actions' },
    { code: 'D7', title: 'D7: Prevent Recurrence' },
    { code: 'D8', title: 'D8: Recognize the Team & Close' },
  ]

  const getCurrentStepIndex = (code?: string) => {
    if (!code) return 0
    const idx = disciplineList.findIndex((d) => d.code === code)
    return idx >= 0 ? idx : 0
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            Corrective & Preventive Actions (CAPA) / 8D Problem Solving
          </Title>
          <Text type="secondary">
            5-Why Root Cause Analysis, Closed-Loop Effectiveness Verification, and 8D Structured Problem Solving
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => activeTab === 'CAPA' ? fetchCapas(1, 10) : fetchEightD(1, 10)}>
            Refresh
          </Button>
          {activeTab === 'CAPA' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInitiateCapaOpen(true)}>
              Initiate CAPA
            </Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInitiateEightDOpen(true)}>
              Create 8D Report
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
            { key: 'CAPA', label: 'Corrective & Preventive Actions (CAPA)' },
            { key: '8D', label: '8D Structured Problem Solving' },
          ]}
        />

        {activeTab === 'CAPA' ? (
          <Table
            columns={capaColumns}
            dataSource={capaList}
            rowKey="id"
            loading={capaLoading}
            pagination={{
              current: capaPagination.current,
              pageSize: capaPagination.pageSize,
              total: capaPagination.total,
              onChange: (p, s) => fetchCapas(p, s),
            }}
          />
        ) : (
          <Table
            columns={eightDColumns}
            dataSource={eightDList}
            rowKey="id"
            loading={eightDLoading}
            pagination={{
              current: eightDPagination.current,
              pageSize: eightDPagination.pageSize,
              total: eightDPagination.total,
              onChange: (p, s) => fetchEightD(p, s),
            }}
          />
        )}
      </Card>

      {/* CAPA DETAILS DRAWER */}
      <Drawer
        title={
          <Space>
            <ApartmentOutlined style={{ color: '#1890ff' }} />
            <span>CAPA Record: {selectedCapa?.capaNumber}</span>
            <Tag color="blue">{selectedCapa?.status}</Tag>
          </Space>
        }
        placement="right"
        width={850}
        open={capaDrawerOpen}
        onClose={() => setCapaDrawerOpen(false)}
        extra={
          selectedCapa?.status !== 'CLOSED' && (
            <Button type="primary" ghost onClick={() => setVerifyOpen(true)}>
              Verify Effectiveness
            </Button>
          )
        }
      >
        {selectedCapa && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Problem Statement" span={2}>
                <Text strong>{selectedCapa.problemStatement}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Interim Containment" span={2}>
                {selectedCapa.interimContainment || 'Immediate segregation implemented.'}
              </Descriptions.Item>
              <Descriptions.Item label="Verification Window">
                {selectedCapa.effectivenessVerificationDays || 30} Days Post-Implementation
              </Descriptions.Item>
              <Descriptions.Item label="Effectiveness Outcome">
                {selectedCapa.effectivenessResult ? (
                  <Tag color={selectedCapa.effectivenessResult === 'SUCCESS' ? 'green' : 'red'}>
                    {selectedCapa.effectivenessResult}
                  </Tag>
                ) : (
                  <Tag color="orange">Pending Verification</Tag>
                )}
              </Descriptions.Item>
              {selectedCapa.recurrenceDetected && (
                <Descriptions.Item label="Recurrence Alert" span={2}>
                  <Alert
                    type="error"
                    showIcon
                    message="Recurrence Detected During Verification"
                    description="This CAPA was automatically reopened to drive iterative root cause investigation."
                  />
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 5-WHY ROOT CAUSE ANALYSIS SECTION */}
            <Card
              size="small"
              title={
                <Space>
                  <ApartmentOutlined style={{ color: '#fa8c16' }} />
                  <Text strong>5-Why Root Cause Analysis</Text>
                </Space>
              }
              style={{ background: '#fafafa' }}
            >
              <Form form={fiveWhyForm} layout="vertical">
                <Form.Item name="why1" label="Why #1: Why did the non-conformance occur?">
                  <Input placeholder="Direct observable cause..." />
                </Form.Item>
                <Form.Item name="why2" label="Why #2: Why did that condition arise?">
                  <Input placeholder="Intermediate causal factor..." />
                </Form.Item>
                <Form.Item name="why3" label="Why #3: Why was that factor present?">
                  <Input placeholder="Process or tooling cause..." />
                </Form.Item>
                <Form.Item name="why4" label="Why #4: Why did standard control not prevent it?">
                  <Input placeholder="Method or standard limitation..." />
                </Form.Item>
                <Form.Item name="why5" label="Why #5: Root Cause Foundation (Systemic Failure)">
                  <Input placeholder="Management system / design foundation..." />
                </Form.Item>
                <Form.Item name="rootCauseConclusion" label="Confirmed Root Cause">
                  <Input.TextArea rows={2} placeholder="Definitive root cause conclusion..." />
                </Form.Item>

                <Divider titlePlacement="start">Corrective & Preventive Actions</Divider>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="correctiveActionPlan" label="Corrective Action (Eliminate Cause)">
                      <Input.TextArea rows={3} placeholder="Action taken on existing process..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="preventiveActionPlan" label="Preventive Action (Systemic Safeguard)">
                      <Input.TextArea rows={3} placeholder="Process control / Poka-Yoke error proofing..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Button type="primary" onClick={handleSaveFiveWhy} block>
                  Save 5-Why Analysis & Action Plans
                </Button>
              </Form>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 8D DOSSIER DRAWER */}
      <Drawer
        title={
          <Space>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>8D Report: {selectedEightD?.eightDNumber}</span>
            <Tag color="geekblue">{selectedEightD?.currentDiscipline}</Tag>
          </Space>
        }
        placement="right"
        width={900}
        open={eightDDrawerOpen}
        onClose={() => setEightDDrawerOpen(false)}
        extra={
          selectedEightD && selectedEightD.status !== 'CLOSED' && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                advanceStepForm.setFieldsValue({
                  disciplineCode: selectedEightD?.currentDiscipline,
                })
                setAdvanceStepOpen(true)
              }}
            >
              Complete Current Discipline
            </Button>
          )
        }
      >
        {selectedEightD && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Subject" span={2}>
                <Text strong>{selectedEightD.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Executive Sponsor">
                {selectedEightD.championName || 'Senior VP Operations'}
              </Descriptions.Item>
              <Descriptions.Item label="Team Leader">
                {selectedEightD.leaderName || 'Lead Quality Engineer'}
              </Descriptions.Item>
              <Descriptions.Item label="Current Progression">
                <Tag color="blue">{selectedEightD.currentDiscipline}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedEightD.status === 'CLOSED' ? 'green' : 'orange'}>
                  {selectedEightD.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* 8D STEPPER */}
            <div>
              <Title level={5}>8-Discipline Progression</Title>
              <Steps
                current={getCurrentStepIndex(selectedEightD.currentDiscipline)}
                size="small"
                items={disciplineList.map((d) => ({
                  title: d.code,
                  description: d.title.replace(`${d.code}: `, ''),
                }))}
              />
            </div>

            {/* STEP PROGRESSION TIMELINE */}
            <div>
              <Title level={5}>Completed Disciplines & Electronic Signatures</Title>
              {(!selectedEightD.steps || selectedEightD.steps.length === 0) ? (
                <Alert
                  type="info"
                  message="D1 — Establish the Team: In Progress"
                  description="Use the 'Complete Current Discipline' button to document findings, containment actions, and permanent corrective actions."
                  showIcon
                />
              ) : (
                <Timeline
                  items={selectedEightD.steps.map((st) => ({
                    color: st.status === 'COMPLETED' ? 'green' : 'blue',
                    children: (
                      <div>
                        <Space>
                          <Tag color="geekblue" style={{ fontWeight: 700 }}>{st.disciplineCode}</Tag>
                          <Text strong>{st.title || st.disciplineCode}</Text>
                          {st.completedByName && <Text type="secondary">by {st.completedByName}</Text>}
                          {st.completedDate && <Text type="secondary">({st.completedDate})</Text>}
                        </Space>
                        <div style={{ marginTop: 4, background: '#f5f5f5', padding: 8, borderRadius: 6 }}>
                          <Text>{st.contentJson || 'Discipline requirements fulfilled.'}</Text>
                        </div>
                        {st.digitalSignature && (
                          <div style={{ marginTop: 4 }}>
                            <Tag color="purple"><FileProtectOutlined /> Electronically Signed: {st.digitalSignature}</Tag>
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* INITIATE CAPA MODAL */}
      <Modal
        title="Initiate Corrective & Preventive Action (CAPA)"
        open={initiateCapaOpen}
        onCancel={() => setInitiateCapaOpen(false)}
        onOk={handleInitiateCapa}
        destroyOnClose
        width={650}
      >
        <Form form={initiateCapaForm} layout="vertical" initialValues={{ effectivenessVerificationDays: 30 }}>
          <Form.Item name="problemStatement" label="Problem Statement" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Describe the specific non-conformance condition..." />
          </Form.Item>
          <Form.Item name="interimContainment" label="Interim Containment Actions">
            <Input.TextArea rows={2} placeholder="Immediate containment, quarantine bins, sorting..." />
          </Form.Item>
          <Form.Item name="effectivenessVerificationDays" label="Effectiveness Verification Window (Days)">
            <Select>
              <Select.Option value={30}>30 Days Post-Implementation (Default)</Select.Option>
              <Select.Option value={60}>60 Days Post-Implementation</Select.Option>
              <Select.Option value={90}>90 Days Post-Implementation (Critical CTQ)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* VERIFY EFFECTIVENESS MODAL */}
      <Modal
        title="Verify Closed-Loop CAPA Effectiveness"
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        onOk={handleVerifyEffectiveness}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="Closed-Loop Verification Rule"
          description="If recurrence of the defect has been detected during the verification period, the CAPA will automatically be reopened."
          style={{ marginBottom: 16 }}
        />
        <Form form={verifyForm} layout="vertical" initialValues={{ recurrenceDetected: 'NO' }}>
          <Form.Item name="recurrenceDetected" label="Recurrence Detected?" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="NO">NO — Actions Verified Effective (Close CAPA)</Select.Option>
              <Select.Option value="YES">YES — Recurrence Detected (Reopen CAPA)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Verification Evidence & Audit Findings" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Audit findings over the verification period..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* INITIATE 8D MODAL */}
      <Modal
        title="Create 8D Report"
        open={initiateEightDOpen}
        onCancel={() => setInitiateEightDOpen(false)}
        onOk={handleInitiateEightD}
        destroyOnClose
        width={650}
      >
        <Form form={initiateEightDForm} layout="vertical">
          <Form.Item name="title" label="8D Report Subject" rules={[{ required: true, message: '8D report subject is required.' }]}>
            <Input placeholder="e.g. Investigation into CNC Spindle Runout and Surface Scratching" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="championUserId" label="Executive Sponsor">
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="leaderUserId" label="Team Leader">
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ADVANCE 8D STEP MODAL */}
      <Modal
        title="Complete 8D Discipline"
        open={advanceStepOpen}
        onCancel={() => setAdvanceStepOpen(false)}
        onOk={handleAdvanceStep}
        destroyOnClose
        width={650}
      >
        <Alert
          type="info"
          showIcon
          message="Sequential Discipline Completion"
          description="Disciplines must be completed sequentially from D1 through D8. Each discipline is permanently recorded with your electronic signature."
          style={{ marginBottom: 16 }}
        />
        <Form form={advanceStepForm} layout="vertical">
          <Form.Item name="disciplineCode" label="Target Discipline" rules={[{ required: true }]}>
            <Select>
              {disciplineList.map((d) => (
                <Select.Option key={d.code} value={d.code}>{d.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contentJson" label="Findings, Actions & Deliverables" rules={[{ required: true, message: 'Please enter discipline findings and deliverables.' }]}>
            <Input.TextArea rows={4} placeholder="Detailed documentation for this discipline step..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
