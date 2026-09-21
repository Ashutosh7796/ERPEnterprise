import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, message, Row, Col, Divider } from 'antd'
import { AssetClassDTO, fixedAssetApi } from '../api/fixedAssetApi'
import { accountCoaApi, AccountCoaNodeDTO } from '../api/accountCoaApi'

interface AssetClassModalProps {
  visible: boolean
  editingClass?: AssetClassDTO | null
  onClose: () => void
  onSuccess: () => void
}

const SCHEDULE_II_CATEGORIES = [
  'Buildings (Residential / Factory)',
  'Plant & Machinery (General)',
  'Office Equipment',
  'Computers & Data Processing Units (Servers/Desktops)',
  'Furniture & Fixtures',
  'Motor Vehicles',
  'Electrical Installations',
  'Intangibles / Software',
]

export const AssetClassModal: React.FC<AssetClassModalProps> = ({
  visible,
  editingClass,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<AccountCoaNodeDTO[]>([])

  useEffect(() => {
    if (visible) {
      loadAccounts()
      if (editingClass) {
        form.setFieldsValue({
          ...editingClass,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          depreciationMethod: 'SLM',
          defaultResidualPercentage: 5,
          usefulLifeMonths: 60,
          status: 'ACTIVE',
        })
      }
    }
  }, [visible, editingClass, form])

  const loadAccounts = async () => {
    try {
      const res: any = await accountCoaApi.getList({ pageSize: 1000, status: 'ACTIVE' })
      if (res && res.rows) {
        setAccounts(res.rows.filter((a: AccountCoaNodeDTO) => a.isGroup === '0'))
      }
    } catch (e) {
      console.error('Failed to load COA accounts', e)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingClass && editingClass.id) {
        await fixedAssetApi.updateClass({ ...values, id: editingClass.id })
        message.success('Asset Class updated successfully')
      } else {
        await fixedAssetApi.createClass(values)
        message.success('Asset Class created successfully')
      }
      onSuccess()
      onClose()
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editingClass ? `Edit Asset Class: ${editingClass.className}` : 'New Asset Class'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="classCode"
              label="Class Code"
              rules={[{ required: true, message: 'Class Code is required' }]}
            >
              <Input placeholder="e.g. IT-COMP" disabled={!!editingClass} />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="className"
              label="Class Name"
              rules={[{ required: true, message: 'Class Name is required' }]}
            >
              <Input placeholder="e.g. IT Equipment & Computers" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="scheduleIiCategory"
              label="Companies Act 2013 Category"
              rules={[{ required: true, message: 'Category is required' }]}
            >
              <Select showSearch placeholder="Select Category">
                {SCHEDULE_II_CATEGORIES.map((cat) => (
                  <Select.Option key={cat} value={cat}>
                    {cat}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item
              name="usefulLifeMonths"
              label="Life (Months)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={1} max={1200} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item
              name="defaultResidualPercentage"
              label="Residual %"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }}>
          Default Accounting Integration (COA Mapping)
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="assetAccountId"
              label="Asset Cost Account (1110 Series)"
              rules={[{ required: true, message: 'Asset Account is required' }]}
            >
              <Select showSearch optionFilterProp="children" placeholder="Select Cost Account">
                {accounts
                  .filter((a) => a.rootType === 'ASSET')
                  .map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.accountCode} - {a.accountName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="accumulatedDepAccountId"
              label="Accumulated Depreciation (1119 Series)"
              rules={[{ required: true, message: 'Accum Dep Account is required' }]}
            >
              <Select showSearch optionFilterProp="children" placeholder="Select Accum Dep Account">
                {accounts
                  .filter((a) => a.rootType === 'ASSET' || a.rootType === 'LIABILITY')
                  .map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.accountCode} - {a.accountName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="depreciationExpenseAccountId"
              label="Depreciation Expense (4400 Series)"
              rules={[{ required: true, message: 'Expense Account is required' }]}
            >
              <Select showSearch optionFilterProp="children" placeholder="Select Expense Account">
                {accounts
                  .filter((a) => a.rootType === 'EXPENSE')
                  .map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.accountCode} - {a.accountName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="gainOnDisposalAccountId" label="Gain on Disposal">
              <Select showSearch allowClear optionFilterProp="children" placeholder="Select Income">
                {accounts
                  .filter((a) => a.rootType === 'INCOME')
                  .map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.accountCode} - {a.accountName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lossOnDisposalAccountId" label="Loss on Disposal">
              <Select showSearch allowClear optionFilterProp="children" placeholder="Select Expense">
                {accounts
                  .filter((a) => a.rootType === 'EXPENSE')
                  .map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.accountCode} - {a.accountName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
