import React, { useEffect, useState, useCallback } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Table,
  Space,
  Alert,
  message,
  Tag,
  Descriptions,
} from 'antd'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { workOrderApi, WorkOrderDTO, WorkOrderItemDTO, MaterialIssueRequest } from '../api/workOrderApi'

interface MaterialIssueModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: WorkOrderDTO | null
}

interface IssueLineState {
  workOrderItemId: number
  componentMaterialId: number
  componentName: string
  componentModel: string
  requiredQty: number
  issuedQty: number
  remainingQty: number
  issueQty: number
  sourceDepotId: number
  sourceBinId?: number
  remark?: string
}

export const MaterialIssueModal: React.FC<MaterialIssueModalProps> = ({
  open,
  onClose,
  onSuccess,
  order,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<IssueLineState[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [depotBinsMap, setDepotBinsMap] = useState<Record<number, any[]>>({})

  const loadDepots = useCallback(async () => {
    try {
      const res: any = await http.get('/depot/findDepotByParams')
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setDepotList(raw)
    } catch (e) {
      console.error('Failed to load depots', e)
    }
  }, [])

  const loadBinsForDepot = useCallback(async (depotId: number) => {
    if (depotBinsMap[depotId]) return
    try {
      const res: any = await http.get('/depotBin/list', { params: { depotId } })
      const bins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setDepotBinsMap(prev => ({ ...prev, [depotId]: bins }))
    } catch (e) {
      console.error('Failed to load bins for depot', depotId, e)
    }
  }, [depotBinsMap])

  useEffect(() => {
    if (!open || !order?.id) return
    loadDepots()
    setLoading(true)

    workOrderApi.getWorkOrderById(order.id)
      .then((res: any) => {
        const fullOrder = res?.data || res
        const items: WorkOrderItemDTO[] = fullOrder?.items || []
        const defaultDepotId = fullOrder.depotId || 0

        loadBinsForDepot(defaultDepotId)

        const initialLines: IssueLineState[] = items.map(it => {
          const req = Number(it.requiredQty || 0)
          const iss = Number(it.issuedQty || 0)
          const rem = Math.max(0, req - iss)
          return {
            workOrderItemId: it.id || 0,
            componentMaterialId: it.componentMaterialId,
            componentName: it.componentName || `Material #${it.componentMaterialId}`,
            componentModel: it.componentModel || '-',
            requiredQty: req,
            issuedQty: iss,
            remainingQty: rem,
            issueQty: rem, // default to remaining
            sourceDepotId: defaultDepotId,
            remark: '',
          }
        })
        setLines(initialLines)
        form.setFieldsValue({
          issueNumber: `ISS-${order.orderNumber}-${Date.now().toString().slice(-4)}`,
          issueDate: dayjs(),
          remark: '',
        })
      })
      .catch(err => {
        message.error('Failed to load component snapshot: ' + (err.message || err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, order, form, loadDepots, loadBinsForDepot])

  const handleLineChange = (index: number, field: keyof IssueLineState, value: any) => {
    setLines(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'sourceDepotId') {
        loadBinsForDepot(Number(value))
        next[index].sourceBinId = undefined
      }
      return next
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!order?.id) return

      // Validate quantities
      const itemsToIssue = lines.filter(l => l.issueQty > 0)
      if (itemsToIssue.length === 0) {
        message.error('Please enter an issue quantity greater than 0 for at least one component')
        return
      }

      for (const item of itemsToIssue) {
        if (item.issueQty > item.remainingQty) {
          message.error(`Issue quantity for "${item.componentName}" cannot exceed remaining requirement (${item.remainingQty})`)
          return
        }
      }

      setSubmitting(true)
      const payload: MaterialIssueRequest = {
        workOrderId: order.id,
        issueNumber: values.issueNumber,
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        remark: values.remark,
        items: itemsToIssue.map(l => ({
          workOrderItemId: l.workOrderItemId,
          componentMaterialId: l.componentMaterialId,
          sourceDepotId: l.sourceDepotId,
          sourceBinId: l.sourceBinId,
          issueQty: l.issueQty,
          remark: l.remark,
        })),
      }

      await workOrderApi.issueMaterial(payload)
      message.success('Materials issued to WIP successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Material issue failed')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Component',
      key: 'component',
      render: (_: any, r: IssueLineState) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.componentName}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Model: {r.componentModel}</div>
        </div>
      ),
    },
    {
      title: 'Required',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 100,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Issued',
      dataIndex: 'issuedQty',
      key: 'issuedQty',
      width: 90,
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'Remaining',
      dataIndex: 'remainingQty',
      key: 'remainingQty',
      width: 100,
      render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Issue Qty',
      key: 'issueQty',
      width: 130,
      render: (_: any, r: IssueLineState, idx: number) => (
        <InputNumber
          min={0}
          max={r.remainingQty}
          value={r.issueQty}
          style={{ width: '100%' }}
          onChange={val => handleLineChange(idx, 'issueQty', val || 0)}
        />
      ),
    },
    {
      title: 'Source Depot',
      key: 'sourceDepotId',
      width: 160,
      render: (_: any, r: IssueLineState, idx: number) => (
        <Select
          value={r.sourceDepotId}
          style={{ width: '100%' }}
          onChange={val => handleLineChange(idx, 'sourceDepotId', val)}
          options={depotList.map(d => ({ label: d.name, value: d.id }))}
        />
      ),
    },
    {
      title: 'Source Bin',
      key: 'sourceBinId',
      width: 140,
      render: (_: any, r: IssueLineState, idx: number) => {
        const bins = depotBinsMap[r.sourceDepotId] || []
        return (
          <Select
            allowClear
            placeholder="Select Bin"
            value={r.sourceBinId}
            style={{ width: '100%' }}
            onChange={val => handleLineChange(idx, 'sourceBinId', val)}
            options={bins.map(b => ({ label: `${b.binCode} (${b.binName})`, value: b.id }))}
          />
        )
      },
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <span>Issue Materials to WIP</span>
          <Tag color="purple">{order?.orderNumber}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={1000}
      okText="Confirm Issue to WIP"
    >
      {order && (
        <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Finished Good">{order.materialName} ({order.materialModel || '-'})</Descriptions.Item>
          <Descriptions.Item label="Planned Qty">{order.plannedQty}</Descriptions.Item>
          <Descriptions.Item label="Shop-Floor WIP Bin">
            <Tag color="cyan">{order.wipBinName || `Bin #${order.wipBinId}`}</Tag>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Alert
        message="Frozen Master BOM Component Snapshot"
        description="Quantities and components are authoritatively derived from the immutable snapshot frozen upon Work Order confirmation. Issuing transfers stock from the selected source depot/bin to the work order's WIP bin."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="Issue Voucher #" name="issueNumber" rules={[{ required: true }]}>
          <Input style={{ width: 220 }} />
        </Form.Item>
        <Form.Item label="Issue Date" name="issueDate" rules={[{ required: true }]}>
          <DatePicker style={{ width: 150 }} />
        </Form.Item>
        <Form.Item label="Remark" name="remark">
          <Input placeholder="Optional notes" style={{ width: 240 }} />
        </Form.Item>
      </Form>

      <Table
        dataSource={lines}
        columns={columns}
        rowKey="workOrderItemId"
        pagination={false}
        loading={loading}
        size="small"
        bordered
      />
    </Modal>
  )
}
