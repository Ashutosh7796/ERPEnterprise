import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, Switch, Row, Col, message } from 'antd'
import { gstApi } from '../api/gstApi'
import type { HsnSac } from '../types'

interface HsnSacModalProps {
  open: boolean
  initialValues?: HsnSac | null
  onClose: () => void
  onSuccess: () => void
}

export const HsnSacModal: React.FC<HsnSacModalProps> = ({
  open,
  initialValues,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          isExempt: initialValues.isExempt || false,
          isNilRated: initialValues.isNilRated || false,
          isNonGst: initialValues.isNonGst || false,
          isRcm: initialValues.isRcm || false,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          type: 'GOODS',
          gstRate: 18.0,
          cgstRate: 9.0,
          sgstRate: 9.0,
          igstRate: 18.0,
          cessRate: 0.0,
          cessSpecificRate: 0.0,
          isExempt: false,
          isNilRated: false,
          isNonGst: false,
          isRcm: false,
        })
      }
    }
  }, [open, initialValues, form])

  const handleGstRateChange = (rate: number | null) => {
    const val = Number(rate || 0)
    const half = Number((val / 2).toFixed(2))
    form.setFieldsValue({
      gstRate: val,
      cgstRate: half,
      sgstRate: half,
      igstRate: val,
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (initialValues?.id) {
        await gstApi.updateHsnSac({ ...values, id: initialValues.id })
        message.success('HSN/SAC code updated successfully.')
      } else {
        await gstApi.addHsnSac(values)
        message.success('HSN/SAC code added successfully.')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message)
      }
    }
  }

  return (
    <Modal
      title={initialValues ? 'Edit HSN / SAC Code' : 'Add New HSN / SAC Code'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={680}
      destroyOnHidden
      okText="Save Code"
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="hsnSacCode"
              label="HSN / SAC Code (4, 6, or 8 digits)"
              rules={[{ required: true, message: 'Please enter HSN/SAC code' }]}
            >
              <Input placeholder="e.g. 8471 or 9983" maxLength={10} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label="Classification"
              rules={[{ required: true, message: 'Please select type' }]}
            >
              <Select
                options={[
                  { value: 'GOODS', label: 'GOODS (HSN)' },
                  { value: 'SERVICES', label: 'SERVICES (SAC)' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Commodity / Service Description"
          rules={[{ required: true, message: 'Description is required' }]}
        >
          <Input.TextArea rows={2} placeholder="Official description of the item/service..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="gstRate"
              label="Total GST Rate %"
              rules={[{ required: true, message: 'Rate is required' }]}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.5}
                style={{ width: '100%' }}
                onChange={handleGstRateChange}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="cgstRate" label="CGST %">
              <InputNumber disabled style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="sgstRate" label="SGST / UTGST %">
              <InputNumber disabled style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="igstRate" label="IGST %">
              <InputNumber disabled style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="cessRate" label="Ad-Valorem Cess Rate %">
              <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="cessSpecificRate" label="Specific Cess per Unit (₹)">
              <InputNumber min={0} step={10} style={{ width: '100%' }} placeholder="0.0000" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 8, padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
          <Col span={6}>
            <Form.Item name="isExempt" label="Exempt Supply" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isNilRated" label="Nil-Rated Supply" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isNonGst" label="Non-GST Supply" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isRcm" label="Reverse Charge (RCM)" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
