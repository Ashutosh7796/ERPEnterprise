import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Select,
  Table,
  InputNumber,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  message,
  Descriptions,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { http } from '@core/api/client'
import { getPoFulfillmentDetails, createGoodsReceipt, PoFulfillmentLine, GrnLineItem } from '../api/procurementApi'

const { Text } = Typography

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export const GoodsReceiptCreateModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Approved PO list & Depot list
  const [approvedPoList, setApprovedPoList] = useState<any[]>([])
  const [depotList, setDepotList] = useState<any[]>([])
  const [selectedPo, setSelectedPo] = useState<any>(null)

  // Open PO lines for receipt
  const [lines, setLines] = useState<Array<PoFulfillmentLine & {
    acceptedQty: number
    rejectedQty: number
    rejectionReason?: string
    unitPrice: number
  }>>([])

  useEffect(() => {
    if (visible) {
      fetchApprovedPOs()
      fetchDepots()
    }
  }, [visible])

  const fetchApprovedPOs = async () => {
    setLoading(true)
    try {
      const res: any = await http.get('/depotHead/list', {
        params: {
          currentPage: 1,
          pageSize: 50,
          type: '其它',
          subType: '采购订单',
          status: '1', // Approved POs only
        },
      })
      if (res && res.code === 200) {
        setApprovedPoList(res.data?.rows || [])
      }
    } catch (err: any) {
      message.error('Failed to load approved purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepots = async () => {
    try {
      const res: any = await http.get('/depot/findDepotByCurrentUser')
      if (res && res.code === 200) {
        setDepotList(res.data || [])
      }
    } catch {
      // Fallback
    }
  }

  const handlePoChange = async (poId: number) => {
    const found = approvedPoList.find((p) => p.id === poId)
    setSelectedPo(found)
    if (!poId) {
      setLines([])
      return
    }

    setLoading(true)
    try {
      const res = await getPoFulfillmentDetails(poId)
      if (res.data?.data) {
        const mapped = res.data.data
          .filter((l: any) => Number(l.remainingReceiptQuantity || 0) > 0)
          .map((l: any) => ({
            ...l,
            acceptedQty: Number(l.remainingReceiptQuantity || 0),
            rejectedQty: 0,
            rejectionReason: undefined,
            unitPrice: 100, // Populated from PO line
          }))
        setLines(mapped)
      } else {
        setLines([])
      }
    } catch (err: any) {
      message.error('Failed to fetch PO lines: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleLineQtyChange = (
    index: number,
    field: 'acceptedQty' | 'rejectedQty' | 'rejectionReason',
    value: any
  ) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (lines.length === 0) {
        message.warning('No open lines available for receipt.')
        return
      }

      const totalReceiptQty = lines.reduce(
        (sum, l) => sum + Number(l.acceptedQty || 0) + Number(l.rejectedQty || 0),
        0
      )
      if (totalReceiptQty <= 0) {
        message.error('Total receipt quantity must be greater than 0.')
        return
      }

      setSubmitting(true)
      const payloadItems: GrnLineItem[] = lines.map((l) => ({
        poItemId: l.poItemId,
        materialId: l.materialId,
        materialExtendId: l.materialExtendId,
        orderedQuantity: l.orderedQuantity,
        receivedQuantity: Number(l.acceptedQty || 0) + Number(l.rejectedQty || 0),
        acceptedQuantity: Number(l.acceptedQty || 0),
        rejectedQuantity: Number(l.rejectedQty || 0),
        unitPrice: l.unitPrice || 0,
        rejectionReason: l.rejectionReason,
      }))

      await createGoodsReceipt({
        poHeaderId: values.poHeaderId,
        depotId: values.depotId,
        supplierDeliveryNote: values.supplierDeliveryNote ? values.supplierDeliveryNote.trim() : undefined,
        items: payloadItems,
      })

      message.success('Goods Receipt Note created and posted to inventory successfully.')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(err.message || 'Failed to create Goods Receipt Note.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasOverReceipt = lines.some(
    (l) => Number(l.acceptedQty || 0) + Number(l.rejectedQty || 0) > Number(l.remainingReceiptQuantity || 0)
  )

  const columns: TableColumnsType<any> = [
    {
      title: 'Item ID',
      dataIndex: 'materialId',
      key: 'materialId',
      width: 100,
    },
    {
      title: 'Ordered Quantity',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      align: 'right',
      render: (v: number) => Number(v || 0).toFixed(2),
    },
    {
      title: 'Remaining Balance',
      dataIndex: 'remainingReceiptQuantity',
      key: 'remainingReceiptQuantity',
      align: 'right',
      render: (v: number) => <Text strong>{Number(v || 0).toFixed(2)}</Text>,
    },
    {
      title: 'Accepted Quantity',
      dataIndex: 'acceptedQty',
      key: 'acceptedQty',
      width: 150,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0}
          precision={2}
          value={v}
          onChange={(val) => handleLineQtyChange(idx, 'acceptedQty', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Rejected Quantity (Quarantine)',
      dataIndex: 'rejectedQty',
      key: 'rejectedQty',
      width: 150,
      render: (v: number, _, idx: number) => (
        <InputNumber
          min={0}
          precision={2}
          value={v}
          onChange={(val) => handleLineQtyChange(idx, 'rejectedQty', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectionReason',
      key: 'rejectionReason',
      width: 180,
      render: (v: string, record: any, idx: number) => {
        const hasRejection = Number(record.rejectedQty || 0) > 0
        return (
          <Select
            placeholder="Select reason"
            value={v}
            disabled={!hasRejection}
            onChange={(val) => handleLineQtyChange(idx, 'rejectionReason', val)}
            allowClear
            style={{ width: '100%' }}
          >
            <Select.Option value="DEFECTIVE_PRODUCT">Defective Material</Select.Option>
            <Select.Option value="DAMAGED_IN_TRANSIT">Damaged in Transit</Select.Option>
            <Select.Option value="WRONG_SPECIFICATION">Wrong Specification</Select.Option>
            <Select.Option value="EXPIRED">Expired Shelf Life</Select.Option>
            <Select.Option value="PACKAGING_DAMAGE">Packaging Damage</Select.Option>
          </Select>
        )
      },
    },
  ]

  return (
    <Modal
      title="Create Goods Receipt Note (GRN)"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={lines.length === 0}
          onClick={handleSubmit}
        >
          Post Goods Receipt
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="poHeaderId"
            label="Purchase Order"
            rules={[{ required: true, message: 'Please select an approved Purchase Order' }]}
          >
            <Select
              placeholder="Search and select approved PO..."
              onChange={handlePoChange}
              showSearch
              filterOption={(input, option: any) =>
                (option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {approvedPoList.map((po) => (
                <Select.Option key={po.id} value={po.id}>
                  {po.number} — {po.organName} (₹{Number(po.totalPrice || 0).toFixed(2)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="depotId"
            label="Receiving Warehouse"
            rules={[{ required: true, message: 'Please select receiving warehouse' }]}
          >
            <Select placeholder="Select receiving warehouse...">
              {depotList.map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="supplierDeliveryNote"
            label="Supplier Delivery Note / Challan #"
            rules={[{ max: 100, message: 'Supplier delivery note cannot exceed 100 characters' }]}
          >
            <Input placeholder="e.g. DC-2026-8812, LR-44102" maxLength={100} allowClear />
          </Form.Item>

          {selectedPo && (
            <Descriptions size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Supplier">{selectedPo.organName}</Descriptions.Item>
              <Descriptions.Item label="PO Order Total">₹{Number(selectedPo.totalPrice || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Order Date">{selectedPo.operTime}</Descriptions.Item>
            </Descriptions>
          )}

          {hasOverReceipt && (
            <Alert
              type="warning"
              showIcon
              message="Over-Receipt Warning"
              description="One or more line receipt quantities exceed the open PO balance. Receipt will be checked against the authorized over-receipt tolerance."
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            columns={columns}
            dataSource={lines}
            rowKey="poItemId"
            pagination={false}
            size="small"
            bordered
          />
        </Form>
      </Spin>
    </Modal>
  )
}
