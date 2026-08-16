import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, Switch, Row, Col, message } from 'antd'
import { GSTINInput } from '../components/GSTINInput'
import { StateSelect } from '../components/StateSelect'
import { gstApi } from '../api/gstApi'
import type { CompanyGstin } from '../types'

interface CompanyGstinModalProps {
  open: boolean
  initialValues?: CompanyGstin | null
  onClose: () => void
  onSuccess: () => void
}

export const CompanyGstinModal: React.FC<CompanyGstinModalProps> = ({
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
          isEinvoiceApplicable: initialValues.isEinvoiceApplicable || false,
          isEwaybillApplicable: initialValues.isEwaybillApplicable ?? true,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          taxpayerType: 'REGULAR',
          isDefault: false,
          isEinvoiceApplicable: false,
          isEwaybillApplicable: true,
        })
      }
    }
  }, [open, initialValues, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (initialValues?.id) {
        await gstApi.updateCompanyGstin({ ...values, id: initialValues.id })
        message.success('Company GSTIN updated successfully.')
      } else {
        await gstApi.addCompanyGstin(values)
        message.success('Company GSTIN added successfully.')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message)
      }
    }
  }

  const handleGstinMeta = (meta: { stateCode?: string; stateName?: string; pan?: string }) => {
    if (meta.stateCode) {
      form.setFieldsValue({ stateCode: meta.stateCode })
    }
    if (meta.stateName) {
      form.setFieldsValue({ stateName: meta.stateName })
    }
    if (meta.pan) {
      form.setFieldsValue({ pan: meta.pan })
    }
  }

  return (
    <Modal
      title={initialValues ? 'Edit Company GSTIN Registration' : 'Register New Company GSTIN'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={720}
      destroyOnHidden
      okText="Save Registration"
    >
      <Form form={form} layout="vertical" initialValues={{ taxpayerType: 'REGULAR' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="gstin"
              label="GSTIN (15 characters)"
              rules={[{ required: true, message: 'Please enter a valid 15-character GSTIN' }]}
            >
              <GSTINInput onMetadataChange={handleGstinMeta} placeholder="e.g. 27AABCU9603R1ZN" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="legalName"
              label="Legal Entity Name (as per GST certificate)"
              rules={[{ required: true, message: 'Please enter registered legal name' }]}
            >
              <Input placeholder="e.g. ACME INDUSTRIAL MFG PVT LTD" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="tradeName" label="Trade / Brand Name">
              <Input placeholder="e.g. ACME TECH" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="pan"
              label="PAN (10 characters)"
              rules={[{ required: true, message: 'PAN is required' }]}
            >
              <Input placeholder="e.g. AABCU9603R" maxLength={10} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="tan" label="TAN (10 characters)">
              <Input placeholder="e.g. MUMA12345B" maxLength={10} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="stateCode"
              label="State / Union Territory"
              rules={[{ required: true, message: 'Please select registered state' }]}
            >
              <StateSelect
                onChange={(code, name) => {
                  form.setFieldsValue({ stateCode: code, stateName: name })
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="taxpayerType"
              label="Taxpayer Category"
              rules={[{ required: true, message: 'Please select category' }]}
            >
              <Select
                options={[
                  { value: 'REGULAR', label: 'Regular Taxpayer' },
                  { value: 'COMPOSITION', label: 'Composition Scheme' },
                  { value: 'SEZ_DEVELOPER', label: 'SEZ Developer' },
                  { value: 'SEZ_UNIT', label: 'SEZ Unit' },
                  { value: 'EOU', label: 'Export Oriented Unit (EOU)' },
                  { value: 'DEEMED_EXPORTER', label: 'Deemed Exporter' },
                  { value: 'ISD', label: 'Input Service Distributor (ISD)' },
                  { value: 'UNREGISTERED', label: 'Unregistered / Not Registered' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={18}>
            <Form.Item name="principalAddress" label="Principal Place of Business Address">
              <Input placeholder="Plot/Building, Street, Industrial Area, City" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="pincode" label="PIN Code">
              <Input placeholder="e.g. 400093" maxLength={6} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="email" label="Registered Contact Email">
              <Input placeholder="gst@company.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Registered Contact Phone">
              <Input placeholder="+91 98765 43210" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 8, padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
          <Col span={8}>
            <Form.Item name="isDefault" label="Primary Default GSTIN" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isEinvoiceApplicable" label="e-Invoicing (Rule 48(4))" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isEwaybillApplicable" label="e-Way Bill (Rule 138)" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
