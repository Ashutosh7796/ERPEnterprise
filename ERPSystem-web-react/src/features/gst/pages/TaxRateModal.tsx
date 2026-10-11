import React, { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Switch, Row, Col, message } from 'antd'
import { gstApi } from '../api/gstApi'
import type { TaxRate } from '../types'

interface TaxRateModalProps {
  open: boolean
  initialValues?: TaxRate | null
  onClose: () => void
  onSuccess: () => void
}

export const TaxRateModal: React.FC<TaxRateModalProps> = ({
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
          isDefault: initialValues.isDefault || false,
          enabled: initialValues.enabled ?? true,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          gstRate: 18.0,
          cgstRate: 9.0,
          sgstRate: 9.0,
          igstRate: 18.0,
          cessRate: 0.0,
          isDefault: false,
          enabled: true,
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
        await gstApi.updateTaxRate({ ...values, id: initialValues.id })
        message.success('Tax slab updated.')
      } else {
        await gstApi.addTaxRate(values)
        message.success('Tax slab added.')
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
      title={initialValues ? 'Edit GST Tax Slab' : 'Create GST Tax Slab'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      destroyOnHidden
      okText="Save Tax Slab"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="rateName"
          label="Tax Slab Label"
          rules={[{ required: true, message: 'Please enter tax slab label (e.g. GST 18%)' }]}
        >
          <Input placeholder="e.g. GST 18% (Standard Industrial)" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="gstRate"
              label="Total GST %"
              rules={[{ required: true, message: 'GST rate is required' }]}
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
            <Form.Item name="cessRate" label="Compensation Cess %">
              <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isDefault" label="Default Slab" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="enabled" label="Active" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="Applicable commodity/service note..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
