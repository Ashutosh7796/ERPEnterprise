import React, { useEffect, useState, useCallback } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Button,
  Space,
  Tag,
  Alert,
  message,
  Popconfirm,
  Descriptions,
  Divider,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  CalculatorOutlined,
  UndoOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import {
  workOrderApi,
  ReceiptCostCalculationRequest,
  TimeLogAllocationItem,
  WorkOrderReceiptDTO,
} from '../api/workOrderApi'
import { jobCardApi, JobCardDTO, JobCardTimeLogDTO } from '../api/jobCardApi'

const { Text } = Typography

interface ReceiptCostCalculationModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  receipt: WorkOrderReceiptDTO | null
  workOrderId: number | null
}

interface EditableAllocationRow {
  key: string
  timeLogId: number
  jobCardNumber?: string
  operationName?: string
  operatorName?: string
  logType?: string
  durationMinutes?: number
  allocatedMinutes: number
  laborHourlyRateOverride?: number
  overheadHourlyRateOverride?: number
}

export const ReceiptCostCalculationModal: React.FC<ReceiptCostCalculationModalProps> = ({
  open,
  onClose,
  onSuccess,
  receipt,
  workOrderId,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [availableLogs, setAvailableLogs] = useState<JobCardTimeLogDTO[]>([])
  const [allocations, setAllocations] = useState<EditableAllocationRow[]>([])

  const loadJobCards = useCallback(async () => {
    if (!workOrderId) return
    try {
      const res: any = await jobCardApi.byWorkOrder(workOrderId)
      const cards: JobCardDTO[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      const logs: JobCardTimeLogDTO[] = []
      cards.forEach((jc) => {
        if (jc.timeLogs && Array.isArray(jc.timeLogs)) {
          jc.timeLogs.forEach((tl) => {
            // Only non-pause ended time logs
            if (tl.endTime && tl.logType !== 'PAUSE') {
              logs.push({
                ...tl,
                operatorName: tl.operatorName || jc.operatorName,
              })
            }
          })
        }
      })
      setAvailableLogs(logs)
    } catch (e) {
      console.error('Failed to load job cards for time-log allocation', e)
    }
  }, [workOrderId])

  useEffect(() => {
    if (!open || !receipt) return
    loadJobCards()
    setAllocations([])
    form.resetFields()
    form.setFieldsValue({
      expectedScrapPctOverride: undefined,
      materialCostOverride: undefined,
      reworkType: 'NORMAL',
      remark: '',
    })
  }, [open, receipt, form, loadJobCards])

  const handleAddLog = (timeLogId: number) => {
    const existing = allocations.find((a) => a.timeLogId === timeLogId)
    if (existing) {
      message.warning('Time log already added to allocation list')
      return
    }
    const log = availableLogs.find((l) => l.id === timeLogId)
    if (!log) return

    const newRow: EditableAllocationRow = {
      key: `tl-${timeLogId}-${Date.now()}`,
      timeLogId,
      logType: log.logType,
      operatorName: log.operatorName,
      durationMinutes: log.durationMinutes,
      allocatedMinutes: log.durationMinutes || 0,
      laborHourlyRateOverride: undefined,
      overheadHourlyRateOverride: undefined,
    }
    setAllocations((prev) => [...prev, newRow])
  }

  const handleRemoveAllocation = (key: string) => {
    setAllocations((prev) => prev.filter((a) => a.key !== key))
  }

  const handleUpdateAllocation = (key: string, field: keyof EditableAllocationRow, val: any) => {
    setAllocations((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: val } : row))
    )
  }

  const handleAllocateAllAvailable = () => {
    const newRows: EditableAllocationRow[] = availableLogs.map((log) => ({
      key: `tl-${log.id}-${Date.now()}`,
      timeLogId: log.id!,
      logType: log.logType,
      operatorName: log.operatorName,
      durationMinutes: log.durationMinutes,
      allocatedMinutes: log.durationMinutes || 0,
      laborHourlyRateOverride: undefined,
      overheadHourlyRateOverride: undefined,
    }))
    setAllocations(newRows)
  }

  const handleSubmit = async () => {
    if (!receipt?.id) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const timeAllocationItems: TimeLogAllocationItem[] = allocations.map((a) => ({
        timeLogId: a.timeLogId,
        allocatedMinutes: Number(a.allocatedMinutes || 0),
        laborHourlyRateOverride: a.laborHourlyRateOverride ? Number(a.laborHourlyRateOverride) : undefined,
        overheadHourlyRateOverride: a.overheadHourlyRateOverride ? Number(a.overheadHourlyRateOverride) : undefined,
      }))

      const payload: ReceiptCostCalculationRequest = {
        receiptId: receipt.id,
        timeAllocations: timeAllocationItems,
        materialCostOverride: values.materialCostOverride ? Number(values.materialCostOverride) : undefined,
        expectedScrapPctOverride: values.expectedScrapPctOverride ? Number(values.expectedScrapPctOverride) : undefined,
        isRework: receipt.remark?.includes('REWORK') || false,
        reworkType: values.reworkType,
        remark: values.remark,
      }

      const res: any = await workOrderApi.calculateReceiptCost(payload)
      const data = res?.data || res
      message.success(
        `Actual cost staged! Finished Goods Unit Cost: $${Number(data?.fgUnitCost || 0).toFixed(4)}`
      )
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Cost calculation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAllocation = async () => {
    if (!receipt?.id) return
    setResetting(true)
    try {
      await workOrderApi.reverseCostAllocation(receipt.id)
      message.success('Cost allocation reversed! Time logs released.')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Failed to reverse cost allocation')
    } finally {
      setResetting(false)
    }
  }

  const columns: TableColumnsType<EditableAllocationRow> = [
    {
      title: 'Time Log',
      dataIndex: 'timeLogId',
      key: 'timeLogId',
      width: 110,
      render: (id) => <Tag color="blue">#{id}</Tag>,
    },
    {
      title: 'Type & Operator',
      key: 'type',
      render: (_, r) => (
        <span>
          <Tag color="geekblue">{r.logType || 'RUN'}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.operatorName || 'Operator'}</Text>
        </span>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      width: 100,
      render: (m) => `${m || 0} mins`,
    },
    {
      title: 'Allocated Mins',
      dataIndex: 'allocatedMinutes',
      key: 'allocatedMinutes',
      width: 140,
      render: (val, r) => (
        <InputNumber
          min={0.1}
          max={r.durationMinutes || 9999}
          value={val}
          onChange={(v) => handleUpdateAllocation(r.key, 'allocatedMinutes', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Labor Rate Override (₹/hr)',
      dataIndex: 'laborHourlyRateOverride',
      key: 'laborHourlyRateOverride',
      width: 160,
      render: (val, r) => (
        <InputNumber
          min={0}
          placeholder="Default"
          value={val}
          onChange={(v) => handleUpdateAllocation(r.key, 'laborHourlyRateOverride', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Overhead Rate Override (₹/hr)',
      dataIndex: 'overheadHourlyRateOverride',
      key: 'overheadHourlyRateOverride',
      width: 170,
      render: (val, r) => (
        <InputNumber
          min={0}
          placeholder="Default"
          value={val}
          onChange={(v) => handleUpdateAllocation(r.key, 'overheadHourlyRateOverride', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 70,
      render: (_, r) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveAllocation(r.key)}
        />
      ),
    },
  ]

  const isStaged = receipt?.financialStatus === 'PENDING_FINANCIAL_POSTING'

  return (
    <Modal
      title={
        <Space>
          <CalculatorOutlined style={{ color: '#1890ff' }} />
          <span>Stage Actual Manufacturing Cost</span>
          {receipt && <Tag color="blue">{receipt.receiptNumber}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        isStaged && (
          <Popconfirm
            key="reset"
            title="Reset Cost Allocation?"
            description="This will release committed time logs back to available pool and reset status to PENDING_COSTING."
            onConfirm={handleResetAllocation}
          >
            <Button danger icon={<UndoOutlined />} loading={resetting} style={{ float: 'left' }}>
              Reset Cost Allocation
            </Button>
          </Popconfirm>
        ),
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CalculatorOutlined />}
          loading={submitting}
          onClick={handleSubmit}
        >
          Calculate & Stage Cost
        </Button>,
      ]}
    >
      {receipt && (
        <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Received Quantity">
            <Tag color="green">{receipt.receivedQty} units</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Scrap Quantity">
            <Tag color={receipt.scrappedQty > 0 ? 'red' : 'default'}>{receipt.scrappedQty} units</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Receipt Date">{receipt.receiptDate}</Descriptions.Item>
          <Descriptions.Item label="Financial Status">
            <Tag color={receipt.financialStatus === 'PENDING_FINANCIAL_POSTING' ? 'orange' : 'default'}>
              {receipt.financialStatus || 'PENDING_COSTING'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Initial Material Cost (₹)">
            ₹{Number(receipt.totalCost || 0).toFixed(4)}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Alert
        message="Discrete Cost Engine Staging Workflow"
        description="Select shop-floor job card time logs to absorb actual direct labor and machine overhead into this receipt. Once staged, the receipt transitions to PENDING_FINANCIAL_POSTING awaiting statutory GL posting authorization."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space>
          <Text strong>Job Card Shift Time Logs</Text>
          <Select
            placeholder="Select time log to add"
            style={{ width: 260 }}
            onChange={(val) => handleAddLog(Number(val))}
            value={undefined}
            options={availableLogs.map((l) => ({
              label: `Log #${l.id} (${l.logType} - ${l.durationMinutes} mins - ${l.operatorName || 'Op'})`,
              value: l.id,
            }))}
          />
        </Space>
        {availableLogs.length > 0 && (
          <Button size="small" icon={<PlusOutlined />} onClick={handleAllocateAllAvailable}>
            Allocate All Available
          </Button>
        )}
      </div>

      <Table
        dataSource={allocations}
        columns={columns}
        rowKey="key"
        pagination={false}
        size="small"
        bordered
        style={{ marginBottom: 16 }}
        locale={{
          emptyText: 'No time logs allocated. You can add job card time logs or proceed with material-only costing.',
        }}
      />

      <Divider style={{ margin: '12px 0', fontSize: 13 }}>Optional Overrides & Policies</Divider>

      <Form form={form} layout="vertical">
        <Space size="large" style={{ width: '100%', display: 'flex' }}>
          <Form.Item
            label="Normal Scrap Allowance Override (%)"
            name="expectedScrapPctOverride"
            tooltip="Overrides the routing operation expected scrap percentage (e.g., 5.0 for 5%)."
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={100} placeholder="Use BOM/Routing default" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Material Cost Override (₹)"
            name="materialCostOverride"
            tooltip="Overrides frozen snapshot component material valuation."
            style={{ flex: 1 }}
          >
            <InputNumber min={0} placeholder="Auto-calculated from snapshot" style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item label="Remark / Costing Audit Notes" name="remark">
          <Input.TextArea rows={2} placeholder="Optional reason for override or cost allocation specifics" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
