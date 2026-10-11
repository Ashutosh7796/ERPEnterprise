import React, { useEffect, useState, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Select,
  Modal,
  Form,
  InputNumber,
  Input,
  Progress,
  Typography,
  Descriptions,
  Divider,
  App,
} from 'antd'
import {
  PlayCircleFilled,
  PauseCircleFilled,
  CheckCircleFilled,
  WarningFilled,
  StopFilled,
  ReloadOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DesktopOutlined,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import {
  jobCardApi,
  JobCardDTO,
  REJECTION_REASONS,
  DOWNTIME_CATEGORIES,
  SHIFT_OPTIONS,
} from '../api/jobCardApi'

const { Title, Text } = Typography

export const ShopFloorExecutionPage: React.FC = () => {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const initialJobCardId = searchParams.get('jobCardId')

  const [loading, setLoading] = useState(false)
  const [jobCards, setJobCards] = useState<JobCardDTO[]>([])
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(
    initialJobCardId ? Number(initialJobCardId) : undefined
  )
  const [currentCard, setCurrentCard] = useState<JobCardDTO | null>(null)

  // Shift
  const [selectedShift, setSelectedShift] = useState<string>('MORNING')

  // Modals
  const [pauseModalOpen, setPauseModalOpen] = useState(false)
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [downtimeModalOpen, setDowntimeModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)

  // Forms
  const [pauseForm] = Form.useForm()
  const [rejectionForm] = Form.useForm()
  const [downtimeForm] = Form.useForm()
  const [completeForm] = Form.useForm()

  // Real-time elapsed stopwatch timer
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const timerRef = useRef<any>(null)

  const loadActiveJobCards = () => {
    setLoading(true)
    jobCardApi.list({ pageSize: 50 })
      .then((res: any) => {
        const list = res?.data?.rows || res?.rows || []
        setJobCards(list)
        if (!selectedCardId && list.length > 0) {
          setSelectedCardId(list[0].id)
        }
      })
      .catch((err) => {
        message.error('Failed to load active cards: ' + (err.message || 'Error'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const loadCardDetail = (id: number) => {
    setLoading(true)
    jobCardApi.getById(id)
      .then((res: any) => {
        const card: JobCardDTO = res?.data || res
        setCurrentCard(card)
        // Initialize stopwatch from totalActualRunMins
        setStopwatchSeconds(Math.round(Number(card.totalActualRunMins || 0) * 60))
      })
      .catch((err) => {
        message.error('Failed to load card details: ' + (err.message || 'Error'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadActiveJobCards()
  }, [])

  useEffect(() => {
    if (selectedCardId) {
      loadCardDetail(selectedCardId)
    }
  }, [selectedCardId])

  // Stopwatch ticking when IN_PROGRESS
  useEffect(() => {
    if (currentCard?.status === 'IN_PROGRESS') {
      timerRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentCard?.status])

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // --- Touch Actions ---

  const handleStart = () => {
    if (!currentCard?.id) return
    jobCardApi.start({ jobCardId: currentCard.id, shiftCode: selectedShift })
      .then((res: any) => {
        message.success('Operation started!')
        setCurrentCard(res?.data || res)
        loadActiveJobCards()
      })
      .catch((err) => {
        message.error('Start failed: ' + (err.message || 'Error'))
      })
  }

  const handleOpenPause = () => {
    pauseForm.resetFields()
    setPauseModalOpen(true)
  }

  const handleConfirmPause = () => {
    pauseForm.validateFields().then((vals) => {
      if (!currentCard?.id) return
      jobCardApi.pause({
        jobCardId: currentCard.id,
        reason: vals.reason,
        downtimeCategory: vals.downtimeCategory,
      })
        .then((res: any) => {
          message.warning('Operation paused.')
          setCurrentCard(res?.data || res)
          setPauseModalOpen(false)
          loadActiveJobCards()
        })
        .catch((err) => {
          message.error('Pause failed: ' + (err.message || 'Error.'))
        })
    })
  }

  const handleResume = () => {
    if (!currentCard?.id) return
    jobCardApi.resume({ jobCardId: currentCard.id, shiftCode: selectedShift })
      .then((res: any) => {
        message.success('Operation resumed successfully.')
        setCurrentCard(res?.data || res)
        loadActiveJobCards()
      })
      .catch((err) => {
        message.error('Resume failed: ' + (err.message || 'Error.'))
      })
  }

  const handleOpenRejection = () => {
    rejectionForm.resetFields()
    setRejectionModalOpen(true)
  }

  const handleConfirmRejection = () => {
    rejectionForm.validateFields().then((vals) => {
      if (!currentCard?.id) return
      jobCardApi.recordRejection({
        jobCardId: currentCard.id,
        rejectionReasonCode: vals.rejectionReasonCode,
        rejectionReasonDesc: vals.rejectionReasonDesc,
        rejectedQty: vals.rejectedQty,
        remark: vals.remark,
      })
        .then((res: any) => {
          message.warning(`Recorded ${vals.rejectedQty} scrap units.`)
          setCurrentCard(res?.data || res)
          setRejectionModalOpen(false)
          loadActiveJobCards()
        })
        .catch((err) => {
          message.error('Failed to record scrap: ' + (err.message || 'Error.'))
        })
    })
  }

  const handleOpenDowntime = () => {
    downtimeForm.resetFields()
    setDowntimeModalOpen(true)
  }

  const handleConfirmDowntime = () => {
    downtimeForm.validateFields().then((vals) => {
      if (!currentCard) return
      jobCardApi.startDowntime({
        workstationId: currentCard.workstationId || 0,
        jobCardId: currentCard.id,
        downtimeCategory: vals.downtimeCategory,
        reason: vals.reason,
        shiftCode: selectedShift,
      })
        .then(() => {
          message.warning('Downtime stoppage recorded successfully.')
          setDowntimeModalOpen(false)
          if (currentCard.id) loadCardDetail(currentCard.id)
        })
        .catch((err) => {
          message.error('Failed to record downtime: ' + (err.message || 'Error.'))
        })
    })
  }

  const handleOpenComplete = () => {
    completeForm.setFieldsValue({
      completedQty: currentCard?.completedQty || currentCard?.plannedQty || 0,
      rejectedQty: currentCard?.rejectedQty || 0,
    })
    setCompleteModalOpen(true)
  }

  const handleConfirmComplete = () => {
    completeForm.validateFields().then((vals) => {
      if (!currentCard?.id) return
      jobCardApi.complete({
        jobCardId: currentCard.id,
        completedQty: vals.completedQty,
        rejectedQty: vals.rejectedQty,
        remark: vals.remark,
      })
        .then((res: any) => {
          message.success('Job Card operation completed successfully. Next operation unlocked.')
          setCurrentCard(res?.data || res)
          setCompleteModalOpen(false)
          loadActiveJobCards()
        })
        .catch((err) => {
          message.error('Completion failed: ' + (err.message || 'Error.'))
        })
    })
  }

  const planned = Number(currentCard?.plannedQty || 0)
  const completed = Number(currentCard?.completedQty || 0)
  const rejected = Number(currentCard?.rejectedQty || 0)
  const percentGood = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0

  return (
    <div style={{ padding: 24, backgroundColor: '#0f172a', minHeight: '100vh', color: '#fff' }}>
      {/* Top Bar */}
      <Card
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155', marginBottom: 20 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size="middle">
              <DesktopOutlined style={{ fontSize: 28, color: '#38bdf8' }} />
              <div>
                <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
                  Shop Floor Execution Terminal
                </Title>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Touch-Optimized Workstation & Operator Dispatch
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space size="large">
              {/* Shift Selector */}
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>Active Shift</Text>
                <Select
                  value={selectedShift}
                  onChange={(v) => setSelectedShift(v)}
                  style={{ width: 170 }}
                  options={SHIFT_OPTIONS.map((s) => ({ label: s.label, value: s.code }))}
                />
              </div>

              {/* Job Card Traveler Selector */}
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>Active Job Card</Text>
                <Select
                  value={selectedCardId}
                  onChange={(id) => setSelectedCardId(id)}
                  style={{ width: 300 }}
                  placeholder="Select Job Card"
                  options={jobCards.map((c) => ({
                    label: `${c.jobCardNumber} — Step ${c.operationSeq} (${c.operationName})`,
                    value: c.id,
                  }))}
                />
              </div>

              <Button icon={<ReloadOutlined />} onClick={() => currentCard?.id && loadCardDetail(currentCard.id)}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Terminal Grid */}
      {currentCard ? (
        <Row gutter={24}>
          {/* Left Column: Operation Details & Stopwatch */}
          <Col span={10}>
            {/* Stopwatch Card */}
            <Card
              style={{
                backgroundColor: '#1e293b',
                border: currentCard.status === 'IN_PROGRESS' ? '2px solid #22c55e' : '1px solid #334155',
                marginBottom: 20,
                textAlign: 'center',
              }}
              styles={{ body: { padding: '24px 16px' } }}
            >
              <div style={{ marginBottom: 8 }}>
                {currentCard.status === 'IN_PROGRESS' && (
                  <Tag color="#16a34a" style={{ fontSize: 14, padding: '4px 12px' }}>
                    ● RUNNING
                  </Tag>
                )}
                {currentCard.status === 'PAUSED' && (
                  <Tag color="#d97706" style={{ fontSize: 14, padding: '4px 12px' }}>
                    ❚❚ PAUSED
                  </Tag>
                )}
                {currentCard.status === 'READY' && (
                  <Tag color="#0284c7" style={{ fontSize: 14, padding: '4px 12px' }}>
                    READY TO COMMENCE
                  </Tag>
                )}
                {currentCard.status === 'COMPLETED' && (
                  <Tag color="#059669" style={{ fontSize: 14, padding: '4px 12px' }}>
                    ✔ COMPLETED
                  </Tag>
                )}
                {currentCard.status === 'PENDING' && (
                  <Tag color="#475569" style={{ fontSize: 14, padding: '4px 12px' }}>
                    PENDING UPSTREAM COMPLETION
                  </Tag>
                )}
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 56,
                  fontWeight: 700,
                  color: currentCard.status === 'IN_PROGRESS' ? '#4ade80' : '#e2e8f0',
                  letterSpacing: 2,
                  margin: '12px 0',
                }}
              >
                {formatTimer(stopwatchSeconds)}
              </div>

              <Text style={{ color: '#94a3b8' }}>
                <ClockCircleOutlined style={{ marginRight: 6 }} />
                Active Elapsed Time (hh:mm:ss)
              </Text>
            </Card>

            {/* Job Card Traveler Details */}
            <Card
              title={<span style={{ color: '#f8fafc' }}>Job Card Metadata</span>}
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              styles={{ body: { padding: 16 } }}
            >
              <Descriptions
                column={1}
                bordered
                size="small"
                style={{ backgroundColor: '#0f172a' }}
                labelStyle={{ color: '#94a3b8', width: 140 }}
                contentStyle={{ color: '#f8fafc', fontWeight: 500 }}
              >
                <Descriptions.Item label="Job Card Number">{currentCard.jobCardNumber}</Descriptions.Item>
                <Descriptions.Item label="Work Order">{currentCard.workOrderNumber || currentCard.workOrderId}</Descriptions.Item>
                <Descriptions.Item label="Finished Good">{currentCard.materialName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Operation Step">Step #{currentCard.operationSeq} — {currentCard.operationName}</Descriptions.Item>
                <Descriptions.Item label="Assigned Machine">
                  {currentCard.workstationName ? (
                    <Tag color="purple" icon={<ToolOutlined />}>{currentCard.workstationName}</Tag>
                  ) : (
                    <Text type="warning">Unassigned</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Operator">
                  <UserOutlined style={{ marginRight: 6 }} />
                  {currentCard.operatorName || 'Floor Team'}
                </Descriptions.Item>
                <Descriptions.Item label="Tool / Mold">{currentCard.toolMoldReference || 'Standard'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Right Column: Touch Buttons & Real-Time Counters */}
          <Col span={14}>
            {/* Production Progress Card */}
            <Card
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155', marginBottom: 20 }}
              styles={{ body: { padding: 24 } }}
            >
              <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Planned Target</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#f8fafc' }}>{planned}</div>
                </Col>
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Text style={{ color: '#22c55e', fontSize: 13 }}>Good Accepted</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#4ade80' }}>{completed}</div>
                </Col>
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>Scrap / Defect</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#f87171' }}>{rejected}</div>
                </Col>
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Text style={{ color: '#38bdf8', fontSize: 13 }}>Remaining</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#38bdf8' }}>
                    {Math.max(0, planned - completed - rejected)}
                  </div>
                </Col>
              </Row>

              <Progress
                percent={percentGood}
                strokeColor="#22c55e"
                trailColor="#334155"
                status="active"
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12 }}>
                <span>Yield Progress: {percentGood}%</span>
                <span>Scrap Rate: {planned > 0 ? ((rejected / planned) * 100).toFixed(1) : 0}%</span>
              </div>
            </Card>

            {/* Touch Action Pad (Min 52px height targets) */}
            <Card
              title={<span style={{ color: '#f8fafc' }}>Execution Controls</span>}
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              styles={{ body: { padding: 24 } }}
            >
              <Row gutter={[16, 16]}>
                {/* START BUTTON */}
                <Col span={12}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<PlayCircleFilled />}
                    disabled={currentCard.status === 'IN_PROGRESS' || currentCard.status === 'COMPLETED' || currentCard.status === 'PENDING'}
                    style={{
                      height: 60,
                      fontSize: 18,
                      fontWeight: 700,
                      backgroundColor: '#16a34a',
                      borderColor: '#16a34a',
                      borderRadius: 8,
                    }}
                    onClick={handleStart}
                  >
                    START OPERATION
                  </Button>
                </Col>

                {/* PAUSE BUTTON */}
                <Col span={12}>
                  <Button
                    size="large"
                    block
                    icon={<PauseCircleFilled />}
                    disabled={currentCard.status !== 'IN_PROGRESS'}
                    style={{
                      height: 60,
                      fontSize: 18,
                      fontWeight: 700,
                      backgroundColor: currentCard.status === 'IN_PROGRESS' ? '#d97706' : undefined,
                      borderColor: '#d97706',
                      color: '#fff',
                      borderRadius: 8,
                    }}
                    onClick={handleOpenPause}
                  >
                    PAUSE EXECUTION
                  </Button>
                </Col>

                {/* RESUME BUTTON */}
                <Col span={12}>
                  <Button
                    size="large"
                    block
                    icon={<PlayCircleFilled />}
                    disabled={currentCard.status !== 'PAUSED'}
                    style={{
                      height: 60,
                      fontSize: 18,
                      fontWeight: 700,
                      backgroundColor: currentCard.status === 'PAUSED' ? '#2563eb' : undefined,
                      borderColor: '#2563eb',
                      color: '#fff',
                      borderRadius: 8,
                    }}
                    onClick={handleResume}
                  >
                    RESUME OPERATION
                  </Button>
                </Col>

                {/* LOG REJECTION / SCRAP */}
                <Col span={12}>
                  <Button
                    size="large"
                    block
                    icon={<StopFilled />}
                    disabled={currentCard.status === 'COMPLETED' || currentCard.status === 'PENDING'}
                    style={{
                      height: 60,
                      fontSize: 18,
                      fontWeight: 700,
                      backgroundColor: '#dc2626',
                      borderColor: '#dc2626',
                      color: '#fff',
                      borderRadius: 8,
                    }}
                    onClick={handleOpenRejection}
                  >
                    RECORD SCRAP / REJECTION
                  </Button>
                </Col>

                {/* RECORD DOWNTIME */}
                <Col span={12}>
                  <Button
                    size="large"
                    block
                    icon={<WarningFilled />}
                    style={{
                      height: 60,
                      fontSize: 16,
                      fontWeight: 700,
                      backgroundColor: '#7c3aed',
                      borderColor: '#7c3aed',
                      color: '#fff',
                      borderRadius: 8,
                    }}
                    onClick={handleOpenDowntime}
                  >
                    RECORD DOWNTIME
                  </Button>
                </Col>

                {/* COMPLETE OPERATION */}
                <Col span={12}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<CheckCircleFilled />}
                    disabled={currentCard.status === 'COMPLETED' || currentCard.status === 'PENDING'}
                    style={{
                      height: 60,
                      fontSize: 18,
                      fontWeight: 700,
                      backgroundColor: '#0284c7',
                      borderColor: '#0284c7',
                      borderRadius: 8,
                    }}
                    onClick={handleOpenComplete}
                  >
                    COMPLETE OPERATION
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card style={{ backgroundColor: '#1e293b', border: '1px solid #334155', textAlign: 'center', padding: 48 }}>
          <Text style={{ color: '#94a3b8', fontSize: 16 }}>
            Please select an active Job Card from the top bar to begin shop floor execution.
          </Text>
        </Card>
      )}

      {/* --- MODALS --- */}

      {/* Pause Modal */}
      <Modal
        title="Pause Operation Execution"
        open={pauseModalOpen}
        onOk={handleConfirmPause}
        onCancel={() => setPauseModalOpen(false)}
        destroyOnClose
      >
        <Form form={pauseForm} layout="vertical">
          <Form.Item name="reason" label="Pause Reason" rules={[{ required: true, message: 'Please enter pause reason' }]}>
            <Input placeholder="e.g. Operator Break, Shift Handover, Blade Inspection" />
          </Form.Item>
          <Form.Item name="downtimeCategory" label="Stoppage Category (Optional)">
            <Select
              placeholder="Select if machine is halting"
              allowClear
              options={DOWNTIME_CATEGORIES.map((d) => ({ label: d.label, value: d.code }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Rejection / Scrap Modal */}
      <Modal
        title="Log Defect / Scrap Pieces"
        open={rejectionModalOpen}
        onOk={handleConfirmRejection}
        onCancel={() => setRejectionModalOpen(false)}
        destroyOnClose
      >
        <Form form={rejectionForm} layout="vertical">
          <Form.Item
            name="rejectionReasonCode"
            label="Defect Classification"
            rules={[{ required: true, message: 'Please select a reason code' }]}
          >
            <Select
              placeholder="Choose defect code"
              options={REJECTION_REASONS.map((r) => ({ label: r.label, value: r.code }))}
            />
          </Form.Item>
          <Form.Item
            name="rejectedQty"
            label="Defective Quantity (Pieces)"
            rules={[{ required: true, message: 'Please enter scrapped quantity' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Number of defective parts" />
          </Form.Item>
          <Form.Item name="remark" label="Defect Notes">
            <Input.TextArea rows={2} placeholder="Optional operator observations" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Machine Downtime Modal */}
      <Modal
        title="Record Machine Stoppage / Downtime"
        open={downtimeModalOpen}
        onOk={handleConfirmDowntime}
        onCancel={() => setDowntimeModalOpen(false)}
        destroyOnClose
      >
        <Form form={downtimeForm} layout="vertical">
          <Form.Item
            name="downtimeCategory"
            label="Downtime Category"
            rules={[{ required: true, message: 'Please select downtime category' }]}
          >
            <Select
              placeholder="Select category"
              options={DOWNTIME_CATEGORIES.map((d) => ({ label: d.label, value: d.code }))}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Root Cause Description"
            rules={[{ required: true, message: 'Please enter stoppage description' }]}
          >
            <Input placeholder="e.g. Hydraulic leak, Motor overheat, Die alignment" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Completion Modal */}
      <Modal
        title="Complete Operation & Unlock Next Sequence"
        open={completeModalOpen}
        onOk={handleConfirmComplete}
        onCancel={() => setCompleteModalOpen(false)}
        destroyOnClose
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="completedQty"
            label="Good / Accepted Output Units"
            rules={[{ required: true, message: 'Enter accepted output quantity' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rejectedQty" label="Scrapped / Defective Units">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="Completion Remarks">
            <Input placeholder="Optional execution remarks" />
          </Form.Item>
          <div style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 6, color: '#166534', fontSize: 13 }}>
            Note: Only GOOD/ACCEPTED units will flow as planned input into the subsequent operation step.
          </div>
        </Form>
      </Modal>
    </div>
  )
}
export default ShopFloorExecutionPage
