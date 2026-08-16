import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker, Row, Col, message } from 'antd'
import dayjs from 'dayjs'
import { gstApi } from '../api/gstApi'
import type { TaxRule, HsnSac, TaxRate } from '../types'

interface Props {
  open: boolean
  record: TaxRule | null
  hsnList: HsnSac[]
  taxRates: TaxRate[]
  onClose: () => void
  onSuccess: () => void
}

export const TaxRuleModal: React.FC<Props> = ({
  open,
  record,
  hsnList,
  taxRates,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (record) {
        form.setFieldsValue({
          ...record,
          effectiveFrom: record.effectiveFrom ? dayjs(record.effectiveFrom) : null,
          effectiveTo: record.effectiveTo ? dayjs(record.effectiveTo) : null,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          status: 'ACTIVE',
          taxTreatment: 'TAXABLE',
          effectiveFrom: dayjs(),
        })
      }
    }
  }, [open, record, form])

  const handleFinish = async (values: any) => {
    try {
      const payload: Partial<TaxRule> = {
        ...values,
        effectiveFrom: values.effectiveFrom ? values.effectiveFrom.format('YYYY-MM-DD') : undefined,
        effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : undefined,
      }

      if (record?.id) {
        payload.id = record.id
        await gstApi.updateTaxRule(payload)
        message.success('Tax rule updated successfully')
      } else {
        await gstApi.addTaxRule(payload)
        message.success('Effective-dated tax rule created successfully')
      }
      onSuccess()
    } catch (err: any) {
      message.error(err.message || 'Failed to save tax rule')
    }
  }

  return (
    <Modal
      title={record ? 'Edit Effective-Dated Tax Rule' : 'Create Effective-Dated Tax Rule'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="hsnSacId"
              label="HSN / SAC Code"
              rules={[{ required: true, message: 'Please select HSN / SAC Code' }]}
            >
              <Select
                showSearch
                placeholder="Search HSN / SAC..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={hsnList.map((h) => ({
                  value: h.id,
                  label: `${h.hsnSacCode} - ${h.description} (${h.type})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="taxSlabId"
              label="Tax Slab / Rate"
              rules={[{ required: true, message: 'Please select statutory tax slab' }]}
            >
              <Select
                placeholder="Select Tax Slab"
                options={taxRates.map((r) => ({
                  value: r.id,
                  label: `${r.rateName} (${r.gstRate}%)`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="effectiveFrom"
              label="Effective From Date"
              rules={[{ required: true, message: 'Effective From date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="effectiveTo"
              label="Effective To Date (Optional / Open-ended)"
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Open-ended (No expiry)" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="taxTreatment"
              label="Tax Treatment"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'TAXABLE', label: 'Taxable' },
                  { value: 'NIL_RATED', label: 'Nil Rated (0%)' },
                  { value: 'EXEMPT', label: 'Exempt' },
                  { value: 'NON_GST', label: 'Non-GST Supply' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remarks" label="Remarks / Statutory Notification Reference">
          <Input.TextArea rows={2} placeholder="e.g. Notification No. 12/2026-Central Tax (Rate)" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
