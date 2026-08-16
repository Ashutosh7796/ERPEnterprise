import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  Table,
  Space,
  Row,
  Col,
  Divider,
  Typography,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'

const { Text } = Typography

export interface FinancialItem {
  id?: string
  inOutItemId?: number
  name?: string
  eachAmount: number
  remark?: string
}

interface FinancialModalProps {
  open: boolean
  title: string
  type: '收入' | '支出' | '收款' | '付款' | '转账' | '收预付款'
  prefixNo: string
  partnerType?: 'vendor' | 'customer' | 'member' | 'none'
  partnerLabel?: string
  editingRecord?: any
  onClose: () => void
  onSuccess: () => void
}

export const FinancialModal: React.FC<FinancialModalProps> = ({
  open,
  title,
  type,
  prefixNo,
  partnerType = 'none',
  partnerLabel = 'Partner',
  editingRecord,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [partnerList, setPartnerList] = useState<any[]>([])
  const [accountList, setAccountList] = useState<any[]>([])
  const [personList, setPersonList] = useState<any[]>([])
  const [inOutItemList, setInOutItemList] = useState<any[]>([])
  const [items, setItems] = useState<FinancialItem[]>([])

  useEffect(() => {
    if (!open) return

    const loadResources = async () => {
      try {
        if (partnerType === 'vendor') {
          const res = await http.get('/supplier/findBySelect_sup')
          if (Array.isArray(res)) setPartnerList(res)
          else if (res?.data) setPartnerList(res.data)
        } else if (partnerType === 'customer' || partnerType === 'member') {
          const res = await http.get('/supplier/findBySelect_cus')
          if (Array.isArray(res)) setPartnerList(res)
          else if (res?.data) setPartnerList(res.data)
        }

        const accRes = await http.get('/account/getAccount')
        if (accRes?.data?.accountList) setAccountList(accRes.data.accountList)

        const personRes = await http.get('/person/getAll')
        if (Array.isArray(personRes)) setPersonList(personRes)
        else if (personRes?.data) setPersonList(personRes.data)

        const itemType = type === '收入' ? 1 : 2
        const inOutRes = await http.get(`/inOutItem/findBySelect?type=${itemType}`)
        if (Array.isArray(inOutRes)) setInOutItemList(inOutRes)
        else if (inOutRes?.data) setInOutItemList(inOutRes.data)
      } catch (err) {
        console.error('Failed to load financial resources:', err)
      }
    }

    loadResources()

    if (editingRecord) {
      form.setFieldsValue({
        organId: editingRecord.organId,
        billTime: editingRecord.billTime ? dayjs(editingRecord.billTime) : dayjs(),
        billNo: editingRecord.billNo,
        accountId: editingRecord.accountId,
        handsPersonId: editingRecord.handsPersonId,
        changeAmount: editingRecord.changeAmount || 0,
        discountMoney: editingRecord.discountMoney || 0,
        totalPrice: editingRecord.totalPrice || 0,
        remark: editingRecord.remark,
      })

      if (editingRecord.id) {
        http.get(`/accountItem/getDetailList?headerId=${editingRecord.id}`).then((res: any) => {
          if (res?.data?.rows) {
            setItems(
              res.data.rows.map((row: any) => ({
                id: String(row.id || Math.random()),
                inOutItemId: row.inOutItemId,
                name: row.inOutItemName || row.name,
                eachAmount: Number(row.eachAmount || 0),
                remark: row.remark || '',
              }))
            )
          }
        })
      }
    } else {
      const timestamp = dayjs().format('YYYYMMDDHHmmss')
      form.setFieldsValue({
        billTime: dayjs(),
        billNo: `${prefixNo}${timestamp}`,
        changeAmount: 0,
        discountMoney: 0,
        totalPrice: 0,
      })
      setItems([
        {
          id: 'item_1',
          eachAmount: 0,
          remark: '',
        },
      ])
    }
  }, [open, editingRecord, prefixNo, partnerType, type, form])

  const totalAmount = items.reduce((acc, item) => acc + (Number(item.eachAmount) || 0), 0)

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        eachAmount: 0,
        remark: '',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  const handleItemChange = (index: number, field: keyof FinancialItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload = {
        info: JSON.stringify({
          type,
          organId: values.organId,
          billTime: values.billTime?.format('YYYY-MM-DD HH:mm:ss'),
          billNo: values.billNo,
          accountId: values.accountId,
          handsPersonId: values.handsPersonId,
          changeAmount: type === '收入' || type === '支出' ? totalAmount : values.changeAmount,
          discountMoney: values.discountMoney || 0,
          totalPrice: type === '收入' || type === '支出' ? totalAmount : values.totalPrice,
          remark: values.remark || '',
          id: editingRecord?.id,
        }),
        rows: JSON.stringify(
          items.map((it) => ({
            inOutItemId: it.inOutItemId,
            eachAmount: it.eachAmount,
            remark: it.remark || '',
          }))
        ),
      }

      const endpoint = editingRecord?.id
        ? '/accountHead/updateAccountHeadAndDetail'
        : '/accountHead/addAccountHeadAndDetail'

      const res = await http.post(endpoint, payload)
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Document saved successfully')
        onSuccess()
        onClose()
      } else {
        message.error(res?.message || res?.data?.message || 'Failed to save document')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || 'Failed to save document')
    } finally {
      setLoading(false)
    }
  }

  const isSimpleTransfer = type === '转账' || type === '收款' || type === '付款' || type === '收预付款'

  const itemColumns = [
    {
      title: 'No.',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: type === '收入' ? 'Income Item' : 'Expense Item',
      key: 'inOutItemId',
      width: 220,
      render: (_: any, record: FinancialItem, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select item..."
          value={record.inOutItemId}
          onChange={(val) => handleItemChange(index, 'inOutItemId', val)}
          options={inOutItemList.map((it) => ({
            value: it.id,
            label: it.name,
          }))}
        />
      ),
    },
    {
      title: 'Amount (₹)',
      key: 'eachAmount',
      width: 140,
      render: (_: any, record: FinancialItem, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.eachAmount}
          onChange={(val) => handleItemChange(index, 'eachAmount', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Remarks',
      key: 'remark',
      render: (_: any, record: FinancialItem, index: number) => (
        <Input
          placeholder="Line remark..."
          value={record.remark}
          onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Popconfirm title="Remove this item?" onConfirm={() => handleRemoveItem(index)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Modal
      title={title}
      open={open}
      width={900}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      destroyOnHidden
      okText="Save Document"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          {partnerType !== 'none' && (
            <Col span={8}>
              <Form.Item
                name="organId"
                label={partnerLabel}
                rules={[{ required: true, message: `Please select ${partnerLabel}` }]}
              >
                <Select
                  showSearch
                  placeholder={`Select ${partnerLabel}...`}
                  optionFilterProp="children"
                  options={partnerList.map((v) => ({
                    value: v.id,
                    label: v.supplier || v.name,
                  }))}
                />
              </Form.Item>
            </Col>
          )}
          <Col span={8}>
            <Form.Item
              name="billTime"
              label="Document Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="billNo"
              label="Document Number"
              rules={[{ required: true, message: 'Doc number is required' }]}
            >
              <Input placeholder="Doc Number" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="accountId" label="Settlement Account" rules={[{ required: true, message: 'Please select account' }]}>
              <Select
                placeholder="Select settlement account..."
                options={accountList.map((a) => ({
                  value: a.id,
                  label: `${a.name} (Bal: ₹${Number(a.currentAmount || 0).toFixed(2)})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="handsPersonId" label="Financial Staff">
              <Select
                placeholder="Select staff..."
                allowClear
                options={personList.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
              />
            </Form.Item>
          </Col>
          {isSimpleTransfer && (
            <Col span={8}>
              <Form.Item
                name="changeAmount"
                label="Amount (₹)"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* Line Items for Income & Expense */}
        {!isSimpleTransfer && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14 }}>
                Detail Items
              </Text>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} size="small">
                Add Item Row
              </Button>
            </div>

            <Table
              rowKey="id"
              bordered
              size="small"
              columns={itemColumns}
              dataSource={items}
              pagination={false}
              style={{ marginBottom: 16 }}
            />

            <div style={{ textAlign: 'right', marginBottom: 12 }}>
              <Text>Total Amount: </Text>
              <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                ₹{totalAmount.toFixed(2)}
              </Text>
            </div>
          </>
        )}

        <Form.Item name="remark" label="Document Remarks" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} placeholder="Enter any general remarks..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
