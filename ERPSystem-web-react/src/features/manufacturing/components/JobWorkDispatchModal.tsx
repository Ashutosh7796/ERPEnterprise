import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Alert,
  Descriptions,
  message,
} from 'antd'
import { CarOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@/core/api/client'
import { jobWorkApi, JobWorkOrder, JobWorkDispatchDto } from '../api/jobWorkApi'

interface JobWorkDispatchModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: JobWorkOrder | null
}

export const JobWorkDispatchModal: React.FC<JobWorkDispatchModalProps> = ({
  open,
  onClose,
  onSuccess,
  order,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [bins, setBins] = useState<any[]>([])

  useEffect(() => {
    if (!open || !order) return

    // Load bins for source depot
    if (order.depotId) {
      http.get('/depotBin/list', { params: { depotId: order.depotId } }).then((res: any) => {
        const rawBins = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setBins(rawBins)
        if (rawBins.length > 0) {
          form.setFieldValue('sourceBinId', rawBins[0].id)
        }
      }).catch(() => setBins([]))
    }

    form.resetFields()
    form.setFieldsValue({
      challanDate: dayjs(),
      transportMode: 'ROAD',
      vehicleNumber: 'MH12JW' + Math.floor(1000 + Math.random() * 9000),
      transporterName: 'VRL Logistics / Dedicated Transit',
    })
  }, [open, order, form])

  const handleDispatch = async () => {
    if (!order) return
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload: JobWorkDispatchDto = {
        jobWorkOrderId: order.id,
        challanNumber: values.challanNumber,
        challanDate: values.challanDate ? values.challanDate.format('YYYY-MM-DD') : undefined,
        sourceDepotId: order.depotId,
        sourceBinId: values.sourceBinId,
        transportMode: values.transportMode,
        vehicleNumber: values.vehicleNumber,
        transporterName: values.transporterName,
        remark: values.remark,
      }

      const res: any = await jobWorkApi.dispatchMaterial(payload)
      if (res?.code === 200) {
        message.success(`Material dispatched! Delivery Challan generated: ${res.data?.challanNumber || 'OK'}`)
        onSuccess()
        onClose()
      } else {
        message.error(res?.data || 'Failed to dispatch material')
      }
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e.message || 'Dispatch failed')
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  return (
    <Modal
      title="Dispatch Materials & Issue Rule 55 Delivery Challan"
      open={open}
      onCancel={onClose}
      onOk={handleDispatch}
      confirmLoading={loading}
      width={720}
      destroyOnClose
    >
      <Alert
        message="Statutory Delivery Challan & Outside Custody"
        description="Outward dispatch deducts raw material inventory from Plant Stores and transfers custody into the Job Worker Staging Bin. Ownership is preserved under Section 143. A serialized Rule 55 Delivery Challan and E-Way Bill JSON payload are generated."
        type="warning"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Job Work Order">{order.orderNumber}</Descriptions.Item>
        <Descriptions.Item label="Classification">{order.goodsType}</Descriptions.Item>
        <Descriptions.Item label="Job Worker">{order.supplierName || `Supplier #${order.supplierId}`}</Descriptions.Item>
        <Descriptions.Item label="Job Worker GSTIN">{order.supplierGstin || 'Not Specified'}</Descriptions.Item>
        <Descriptions.Item label="Statutory Due Date" span={2}>
          <span style={{ color: '#d46b08', fontWeight: 600 }}>
            {order.statutoryDueDate ? dayjs(order.statutoryDueDate).format('DD/MM/YYYY') : '-'}
          </span>
          <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
            ({order.goodsType === 'CAPITAL_GOODS' ? '3-Year' : '1-Year'} Statutory Return Period)
          </span>
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="challanDate" label="Challan / Movement Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="challanNumber" label="Challan Number (Auto if blank)">
              <Input placeholder="Auto e.g. JWC/2627/0001" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sourceBinId" label="Source Storage Bin (Deducted)">
              <Select
                placeholder="Select bin to deduct from"
                options={bins.map((b) => ({
                  value: b.id,
                  label: `${b.binName || b.binCode} (${b.binType})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="transportMode" label="Transport Mode" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'ROAD', label: 'Road' },
                  { value: 'RAIL', label: 'Rail' },
                  { value: 'AIR', label: 'Air' },
                  { value: 'SHIP', label: 'Ship' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vehicleNumber"
              label="Vehicle Number"
              rules={[{ required: true, message: 'Vehicle number is required for E-Way Bill' }]}
            >
              <Input prefix={<CarOutlined />} placeholder="e.g. MH12AB1234" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="transporterName" label="Transporter / Carrier Name">
              <Input placeholder="Transporter name" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remark" label="Transportation Remarks">
          <Input.TextArea rows={2} placeholder="Reason for transport: Job Work under Section 143" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
