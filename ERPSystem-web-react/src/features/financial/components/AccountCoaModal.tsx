import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, Switch, message } from 'antd'
import { accountCoaApi, AccountCoaNodeDTO } from '../api/accountCoaApi'

const { Option } = Select
const { TextArea } = Input

interface AccountCoaModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  initialValues?: Partial<AccountCoaNodeDTO> | null
  parentOptions: { id: number; accountCode: string; accountName: string; rootType: string }[]
}

const ROOT_TYPE_OPTIONS = [
  { label: 'Asset (Assets)', value: 'ASSET' },
  { label: 'Liability (Liabilities)', value: 'LIABILITY' },
  { label: 'Equity (Shareholders Funds)', value: 'EQUITY' },
  { label: 'Income (Revenue)', value: 'INCOME' },
  { label: 'Expense (Expenses)', value: 'EXPENSE' },
]

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'General Asset / Group', value: 'ASSET' },
  { label: 'Cash Drawer / Petty Cash', value: 'CASH' },
  { label: 'Bank Account', value: 'BANK' },
  { label: 'Trade Receivables (Debtors)', value: 'RECEIVABLE' },
  { label: 'Trade Payables (Creditors)', value: 'PAYABLE' },
  { label: 'Inventories / Stock Asset', value: 'STOCK' },
  { label: 'Duties & Taxes (GST / TDS)', value: 'TAX' },
  { label: 'Revenue / Operating Income', value: 'INCOME' },
  { label: 'Direct / Indirect Expense', value: 'EXPENSE' },
  { label: 'Accumulated Depreciation', value: 'ACCUMULATED_DEPRECIATION' },
  { label: 'Share Capital & Reserves', value: 'EQUITY' },
  { label: 'Fractional Round-Off', value: 'ROUND_OFF' },
]

export const AccountCoaModal: React.FC<AccountCoaModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  initialValues,
  parentOptions,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = React.useState(false)

  const isEdit = !!initialValues?.id
  const isSystem = initialValues?.isSystem === '1'

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          accountCode: initialValues.accountCode || '',
          accountName: initialValues.accountName || '',
          parentId: initialValues.parentId || undefined,
          rootType: initialValues.rootType || 'ASSET',
          accountType: initialValues.accountType || 'ASSET',
          normalBalance: initialValues.normalBalance || 'DEBIT',
          isGroup: initialValues.isGroup === '1',
          status: initialValues.status || 'ACTIVE',
          sort: initialValues.sort || 0,
          remark: initialValues.remark || '',
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          rootType: 'ASSET',
          accountType: 'ASSET',
          normalBalance: 'DEBIT',
          isGroup: false,
          status: 'ACTIVE',
          sort: 0,
        })
      }
    }
  }, [visible, initialValues, form])

  const handleRootTypeChange = (val: string) => {
    if (val === 'ASSET' || val === 'EXPENSE') {
      form.setFieldsValue({ normalBalance: 'DEBIT' })
    } else {
      form.setFieldsValue({ normalBalance: 'CREDIT' })
    }
  }

  const handleParentChange = (parentId: number | undefined) => {
    if (parentId) {
      const parent = parentOptions.find((p) => p.id === parentId)
      if (parent) {
        form.setFieldsValue({ rootType: parent.rootType })
        handleRootTypeChange(parent.rootType)
      }
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload: AccountCoaNodeDTO = {
        ...values,
        id: initialValues?.id,
        isGroup: values.isGroup ? '1' : '0',
        parentId: values.parentId || null,
      }

      if (isEdit) {
        await accountCoaApi.updateNode(payload)
        message.success('Account updated successfully')
      } else {
        await accountCoaApi.addNode(payload)
        message.success('Account created successfully')
      }
      onSuccess()
    } catch (err: any) {
      if (err?.errorFields) {
        message.error('Please check the form for validation errors')
      } else {
        message.error(err?.message || 'Failed to save account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit Account: ${initialValues?.accountCode}` : 'Create Chart of Accounts Node'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={{ isGroup: false, status: 'ACTIVE' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="accountCode"
            label="Account Code"
            rules={[{ required: true, message: 'Please enter account code (e.g. 1120)' }]}
          >
            <Input placeholder="e.g. 1221" disabled={isSystem} />
          </Form.Item>

          <Form.Item
            name="accountName"
            label="Account Name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="e.g. HDFC Current Account" />
          </Form.Item>
        </div>

        <Form.Item name="parentId" label="Parent Account (Folder / Group Node)">
          <Select
            placeholder="Select parent account group (leave blank for root)"
            allowClear
            showSearch
            optionFilterProp="children"
            onChange={handleParentChange}
            disabled={isSystem}
          >
            {parentOptions
              .filter((p) => p.id !== initialValues?.id)
              .map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.accountCode} - {p.accountName} ({p.rootType})
                </Option>
              ))}
          </Select>
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="rootType"
            label="Root Classification"
            rules={[{ required: true, message: 'Please select root type' }]}
          >
            <Select onChange={handleRootTypeChange} disabled={isSystem}>
              {ROOT_TYPE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="accountType"
            label="Functional Account Type"
            rules={[{ required: true, message: 'Please select account type' }]}
          >
            <Select showSearch optionFilterProp="children">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="normalBalance" label="Normal Balance">
            <Select>
              <Option value="DEBIT">Debit (Normal for Assets & Expenses)</Option>
              <Option value="CREDIT">Credit (Normal for Liabilities, Equity & Income)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
          <Form.Item name="isGroup" label="Is Folder / Group Node (Cannot receive direct postings)" valuePropName="checked">
            <Switch checkedChildren="Group" unCheckedChildren="Leaf Ledger" disabled={isSystem} />
          </Form.Item>

          <Form.Item name="sort" label="Display Sort Order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item name="remark" label="Remark / Description">
          <TextArea rows={2} placeholder="Optional accounting notes or statutory descriptions" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
