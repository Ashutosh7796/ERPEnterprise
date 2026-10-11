import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Upload,
  Button,
  message,
  Tabs,
  Alert,
  Space,
} from 'antd'
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'
import { bankReconciliationApi, StatementUploadRequest } from '../api/bankReconciliationApi'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  defaultBankAccountId?: number
}

export const BankStatementImportModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  defaultBankAccountId,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file')
  const [fileContent, setFileContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setErrorMessage(null)
      fetchBankAccounts()
      form.resetFields()
      if (defaultBankAccountId) {
        form.setFieldsValue({ bankAccountId: defaultBankAccountId })
      }
    }
  }, [visible, defaultBankAccountId, form])

  const fetchBankAccounts = async () => {
    try {
      const res = await http.get('/account/list', {
        params: { currentPage: 1, pageSize: 100 },
      })
      if (res && (res as any).rows) {
        setBankAccounts((res as any).rows)
      } else if (Array.isArray(res)) {
        setBankAccounts(res)
      }
    } catch (e) {
      console.error('Failed to load bank accounts', e)
    }
  }

  const handleFileUpload = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setFileContent(text || '')
      message.success(`Loaded file: ${file.name}`)
    }
    reader.readAsText(file)
    return false // prevent auto-upload
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const content = uploadMode === 'file' ? fileContent : values.pasteContent

      if (!content || !content.trim()) {
        message.error('Please upload a CSV file or paste CSV content')
        return
      }

      setLoading(true)
      setErrorMessage(null)

      const payload: StatementUploadRequest = {
        bankAccountId: values.bankAccountId,
        statementNumber: values.statementNumber,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        openingBalance: values.openingBalance || 0,
        closingBalance: values.closingBalance,
        fileName: fileName || 'statement.csv',
        csvContent: content,
      }

      const res = await bankReconciliationApi.uploadStatement(payload)
      if ((res as any).code === 200 || (res as any).statementId) {
        message.success('Bank statement imported successfully!')
        onSuccess()
        onClose()
      } else {
        const errorText = (res as any).data || 'Import failed'
        setErrorMessage(errorText)
      }
    } catch (e: any) {
      const errorText = e?.response?.data?.data || e?.message || 'Error uploading statement'
      setErrorMessage(errorText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Import Bank Statement (CSV)"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={680}
      okText="Import Statement"
    >
      {errorMessage && (
        <Alert
          title="Statement Import Error"
          description={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="bankAccountId"
          label="Bank Account"
          rules={[{ required: true, message: 'Please select a bank account' }]}
        >
          <Select placeholder="Select bank account">
            {bankAccounts.map((acc) => (
              <Select.Option key={acc.id} value={acc.id}>
                {acc.name} ({acc.serialNo || 'No A/C No'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="statementNumber" label="Statement Number (Optional)">
          <Input placeholder="e.g. STMT-2026-SEP-HDFC" />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Statement Period"
          rules={[{ required: true, message: 'Please select statement period' }]}
        >
          <DatePicker.RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Space orientation="horizontal" style={{ width: '100%' }}>
          <Form.Item
            name="openingBalance"
            label="Opening Balance (₹)"
            initialValue={0}
            rules={[{ required: true, message: 'Opening balance is required' }]}
          >
            <InputNumber style={{ width: 280 }} precision={2} />
          </Form.Item>

          <Form.Item
            name="closingBalance"
            label="Closing Balance (₹) [Integrity Check]"
          >
            <InputNumber style={{ width: 280 }} precision={2} />
          </Form.Item>
        </Space>

        <Tabs
          activeKey={uploadMode}
          onChange={(k) => setUploadMode(k as any)}
          items={[
            {
              key: 'file',
              label: (
                <span>
                  <UploadOutlined /> Upload File
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #d9d9d9', borderRadius: 8 }}>
                  <Upload beforeUpload={handleFileUpload} maxCount={1} accept=".csv,text/csv">
                    <Button icon={<UploadOutlined />}>Select CSV Statement File</Button>
                  </Upload>
                  {fileName && (
                    <div style={{ marginTop: 8, color: '#52c41a' }}>
                      Selected: <strong>{fileName}</strong>
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                    Supported format: CSV with headers (Date, Ref/UTR, Description, Debit, Credit, Balance)
                  </div>
                </div>
              ),
            },
            {
              key: 'paste',
              label: (
                <span>
                  <FileTextOutlined /> Paste CSV Text
                </span>
              ),
              children: (
                <Form.Item name="pasteContent" style={{ marginBottom: 0 }}>
                  <Input.TextArea
                    rows={6}
                    placeholder="Date,Reference,Description,Debit,Credit,Balance&#10;2026-09-01,UTR12345,Payment,0,10000.00,10000.00"
                  />
                </Form.Item>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  )
}
