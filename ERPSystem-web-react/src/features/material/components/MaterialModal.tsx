import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Tabs,
  Table,
  Button,
  Space,
  Row,
  Col,
  Divider,
  message,
  Card,
  Popconfirm,
  Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'

interface MaterialModalProps {
  open: boolean
  record: any | null
  onClose: () => void
  onSuccess: () => void
}

interface SkuPriceItem {
  id?: number
  barCode: string
  commodityUnit?: string
  purchaseDecimal?: number
  commodityDecimal?: number
  wholesaleDecimal?: number
  lowDecimal?: number
}

interface DepotStockItem {
  id?: number
  depotId: number
  name: string
  initStock?: number
  lowSafeStock?: number
  highSafeStock?: number
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  open,
  record,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  const [categoryList, setCategoryList] = useState<any[]>([])
  const [unitList, setUnitList] = useState<any[]>([])
  const [isMultiUnit, setIsMultiUnit] = useState(false)

  const [skuList, setSkuList] = useState<SkuPriceItem[]>([])
  const [depotStockList, setDepotStockList] = useState<DepotStockItem[]>([])

  // Load Categories & Multi-Units
  useEffect(() => {
    if (open) {
      http.get('/materialCategory/getAllList').then((res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : [])
        setCategoryList(list)
      })

      http.get('/unit/getAllList').then((res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : [])
        setUnitList(list)
      })
    }
  }, [open])

  // Initialize Form Data
  useEffect(() => {
    if (open) {
      if (record) {
        setIsMultiUnit(!!record.unitId)
        form.setFieldsValue({
          name: record.name,
          standard: record.standard,
          model: record.model,
          unit: record.unit || record.unitName,
          unitId: record.unitId,
          color: record.color,
          brand: record.brand,
          mnemonic: record.mnemonic,
          categoryId: record.categoryId,
          weight: record.weight,
          expiryNum: record.expiryNum,
          position: record.position,
          mfrs: record.mfrs,
          otherField1: record.otherField1,
          otherField2: record.otherField2,
          otherField3: record.otherField3,
          enableSerialNumber: String(record.enableSerialNumber || 0),
          enableBatchNumber: String(record.enableBatchNumber || 0),
          remark: record.remark,
        })

        // Fetch SKU / Barcode items
        http
          .get('/materialsExtend/getDetailList', { materialId: record.id })
          .then((res: any) => {
            const list = res?.data || res?.rows || (Array.isArray(res) ? res : [])
            if (Array.isArray(list) && list.length > 0) {
              setSkuList(list)
            } else {
              setSkuList([
                {
                  barCode: record.mBarCode || record.barCode || '',
                  commodityUnit: record.unit || record.unitName || '',
                  purchaseDecimal: record.purchaseDecimal || 0,
                  commodityDecimal: record.commodityDecimal || 0,
                  wholesaleDecimal: record.wholesaleDecimal || 0,
                  lowDecimal: record.lowDecimal || 0,
                },
              ])
            }
          })
          .catch(() => {
            setSkuList([
              {
                barCode: record.mBarCode || record.barCode || '',
                commodityUnit: record.unit || record.unitName || '',
                purchaseDecimal: record.purchaseDecimal || 0,
                commodityDecimal: record.commodityDecimal || 0,
                wholesaleDecimal: record.wholesaleDecimal || 0,
                lowDecimal: record.lowDecimal || 0,
              },
            ])
          })

        // Fetch Warehouse Initial Stocks
        http
          .get('/depot/getAllListWithStock', { materialId: record.id })
          .then((res: any) => {
            const list = res?.data || (Array.isArray(res) ? res : [])
            setDepotStockList(
              list.map((d: any) => ({
                depotId: d.id,
                name: d.name || d.depotName,
                initStock: d.initStock || 0,
                lowSafeStock: d.lowSafeStock || 0,
                highSafeStock: d.highSafeStock || 0,
              }))
            )
          })
          .catch(() => {
            loadDefaultDepots()
          })
      } else {
        // New Product Initial State
        form.resetFields()
        setIsMultiUnit(false)
        setActiveTab('1')

        // Generate initial barcode
        http.get('/material/getMaxBarCode').then((res: any) => {
          const nextBarcode = res?.data?.barCode || res?.barCode || String(Date.now()).slice(-8)
          setSkuList([
            {
              barCode: nextBarcode,
              commodityUnit: '',
              purchaseDecimal: 0,
              commodityDecimal: 0,
              wholesaleDecimal: 0,
              lowDecimal: 0,
            },
          ])
        }).catch(() => {
          setSkuList([
            {
              barCode: String(Date.now()).slice(-8),
              commodityUnit: '',
              purchaseDecimal: 0,
              commodityDecimal: 0,
              wholesaleDecimal: 0,
              lowDecimal: 0,
            },
          ])
        })

        loadDefaultDepots()
      }
    }
  }, [open, record, form])

  const loadDefaultDepots = () => {
    http.get('/depot/findDepotByCurrentUser').then((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : [])
      setDepotStockList(
        list.map((d: any) => ({
          depotId: d.id,
          name: d.depotName || d.name,
          initStock: 0,
          lowSafeStock: 0,
          highSafeStock: 0,
        }))
      )
    })
  }

  // Handle Name changes to auto-generate mnemonic acronym & pinyin
  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value?.trim()
    if (!val) return

    // If English word, generate quick acronym
    if (/^[A-Za-z0-9\s-_]+$/.test(val)) {
      const acronym = val
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
      form.setFieldsValue({ mnemonic: acronym })
    } else {
      // If Chinese or multi-lingual, query backend pinyin transformer
      try {
        const res: any = await http.post('/material/changeNameToPinYin', { name: val })
        const pinyin = res?.data || res
        if (pinyin && typeof pinyin === 'string') {
          form.setFieldsValue({ mnemonic: pinyin.toUpperCase() })
        }
      } catch (_) {}
    }
  }

  const handleAddSkuRow = () => {
    setSkuList([
      ...skuList,
      {
        barCode: String(Date.now()).slice(-8),
        commodityUnit: form.getFieldValue('unit') || '',
        purchaseDecimal: 0,
        commodityDecimal: 0,
        wholesaleDecimal: 0,
        lowDecimal: 0,
      },
    ])
  }

  const handleDeleteSkuRow = (index: number) => {
    if (skuList.length === 1) {
      message.warning('At least one barcode/SKU entry is required.')
      return
    }
    const updated = [...skuList]
    updated.splice(index, 1)
    setSkuList(updated)
  }

  const handleUpdateSkuRow = (index: number, field: keyof SkuPriceItem, value: any) => {
    const updated = [...skuList]
    updated[index] = { ...updated[index], [field]: value }
    setSkuList(updated)
  }

  const handleUpdateDepotStock = (index: number, field: keyof DepotStockItem, value: any) => {
    const updated = [...depotStockList]
    updated[index] = { ...updated[index], [field]: value }
    setDepotStockList(updated)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload: any = {
        name: values.name,
        standard: values.standard || '',
        model: values.model || '',
        unit: isMultiUnit ? undefined : values.unit || '',
        unitId: isMultiUnit ? values.unitId : undefined,
        color: values.color || '',
        brand: values.brand || '',
        mfrs: values.mfrs || '',
        categoryId: values.categoryId,
        weight: values.weight || 0,
        expiryNum: values.expiryNum || 0,
        position: values.position || '',
        otherField1: values.otherField1 || '',
        otherField2: values.otherField2 || '',
        otherField3: values.otherField3 || '',
        enableSerialNumber: values.enableSerialNumber || '0',
        enableBatchNumber: values.enableBatchNumber || '0',
        remark: values.remark || '',
        meList: skuList.map((sku) => ({
          id: sku.id,
          barCode: sku.barCode,
          commodityUnit: sku.commodityUnit || values.unit || '',
          purchaseDecimal: sku.purchaseDecimal || 0,
          commodityDecimal: sku.commodityDecimal || 0,
          wholesaleDecimal: sku.wholesaleDecimal || 0,
          lowDecimal: sku.lowDecimal || 0,
        })),
        stock: depotStockList.map((stk) => ({
          depotId: stk.depotId,
          initStock: stk.initStock || 0,
          lowSafeStock: stk.lowSafeStock || 0,
          highSafeStock: stk.highSafeStock || 0,
        })),
      }

      if (record && record.id) {
        payload.id = record.id
        await http.put('/material/update', payload)
        message.success('Product updated successfully!')
      } else {
        await http.post('/material/add', payload)
        message.success('Product created successfully!')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      if (err.errorFields) {
        setActiveTab('1')
        return
      }
      message.error(err?.message || 'Failed to save product.')
    } finally {
      setSubmitting(false)
    }
  }

  const skuColumns = [
    {
      title: 'Barcode',
      dataIndex: 'barCode',
      key: 'barCode',
      width: 170,
      render: (val: string, _: any, index: number) => (
        <Input
          value={val}
          placeholder="Barcode..."
          onChange={(e) => handleUpdateSkuRow(index, 'barCode', e.target.value)}
        />
      ),
    },
    {
      title: 'Unit/SKU',
      dataIndex: 'commodityUnit',
      key: 'commodityUnit',
      width: 110,
      render: (val: string, _: any, index: number) => (
        <Input
          value={val}
          placeholder="Unit..."
          onChange={(e) => handleUpdateSkuRow(index, 'commodityUnit', e.target.value)}
        />
      ),
    },
    {
      title: 'Purchase Price (₹)',
      dataIndex: 'purchaseDecimal',
      key: 'purchaseDecimal',
      width: 140,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={val}
          onChange={(v) => handleUpdateSkuRow(index, 'purchaseDecimal', v || 0)}
        />
      ),
    },
    {
      title: 'Retail Price (₹)',
      dataIndex: 'commodityDecimal',
      key: 'commodityDecimal',
      width: 140,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={val}
          onChange={(v) => handleUpdateSkuRow(index, 'commodityDecimal', v || 0)}
        />
      ),
    },
    {
      title: 'Sales Price (₹)',
      dataIndex: 'wholesaleDecimal',
      key: 'wholesaleDecimal',
      width: 140,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={val}
          onChange={(v) => handleUpdateSkuRow(index, 'wholesaleDecimal', v || 0)}
        />
      ),
    },
    {
      title: 'Min Price (₹)',
      dataIndex: 'lowDecimal',
      key: 'lowDecimal',
      width: 130,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={val}
          onChange={(v) => handleUpdateSkuRow(index, 'lowDecimal', v || 0)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteSkuRow(index)}
        />
      ),
    },
  ]

  const depotColumns = [
    {
      title: 'Warehouse',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Initial Stock',
      dataIndex: 'initStock',
      key: 'initStock',
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={val}
          placeholder="Initial stock..."
          onChange={(v) => handleUpdateDepotStock(index, 'initStock', v || 0)}
        />
      ),
    },
    {
      title: 'Min Safety Stock',
      dataIndex: 'lowSafeStock',
      key: 'lowSafeStock',
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={val}
          placeholder="Min safety stock..."
          onChange={(v) => handleUpdateDepotStock(index, 'lowSafeStock', v || 0)}
        />
      ),
    },
    {
      title: 'Max Safety Stock',
      dataIndex: 'highSafeStock',
      key: 'highSafeStock',
      render: (val: number, _: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={val}
          placeholder="Max safety stock..."
          onChange={(v) => handleUpdateDepotStock(index, 'highSafeStock', v || 0)}
        />
      ),
    },
  ]

  return (
    <Modal
      title={record ? `Edit Product: ${record.name || ''}` : 'Add New Product / Goods SKU'}
      open={open}
      onCancel={onClose}
      width={1150}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={submitting}
          onClick={handleSave}
        >
          Save Product
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="middle">
          <Tabs.TabPane tab="Basic Information" key="1">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="name"
                  label="Product Name"
                  rules={[{ required: true, message: 'Please enter product name' }]}
                >
                  <Input placeholder="Enter product name..." onChange={handleNameChange} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="standard" label="Specification">
                  <Input placeholder="e.g. 500ml, XL, 10kg..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="model" label="Model Number">
                  <Input placeholder="e.g. RX-01, Pro Max..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Unit of Measure" required>
                  <Space.Compact style={{ width: '100%' }}>
                    {!isMultiUnit ? (
                      <Form.Item
                        name="unit"
                        noStyle
                        rules={[{ required: !isMultiUnit, message: 'Please enter unit' }]}
                      >
                        <Input placeholder="e.g. piece, box..." style={{ width: '65%' }} />
                      </Form.Item>
                    ) : (
                      <Form.Item
                        name="unitId"
                        noStyle
                        rules={[{ required: isMultiUnit, message: 'Please select unit' }]}
                      >
                        <Select
                          placeholder="Select multi-unit..."
                          style={{ width: '65%' }}
                          options={unitList.map((u) => ({
                            value: u.id,
                            label: u.name,
                          }))}
                        />
                      </Form.Item>
                    )}
                    <Checkbox
                      checked={isMultiUnit}
                      onChange={(e) => setIsMultiUnit(e.target.checked)}
                      style={{ paddingLeft: 8, lineHeight: '32px' }}
                    >
                      Multi-Unit
                    </Checkbox>
                  </Space.Compact>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="categoryId" label="Product Category">
                  <Select
                    placeholder="Select category..."
                    allowClear
                    options={categoryList.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="brand" label="Brand">
                  <Input placeholder="Brand name..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="color" label="Color">
                  <Input placeholder="Color..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="mnemonic" label="Mnemonic Code">
                  <Input placeholder="Search mnemonic..." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="weight" label="Base Weight (kg)">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="expiryNum" label="Shelf Life (Days)">
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="Days..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="position" label="Shelf / Bin Location">
                  <Input placeholder="e.g. Rack A-01..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="mfrs" label="Manufacturer">
                  <Input placeholder="Manufacturer name..." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="otherField1" label="Custom Field 1">
                  <Input placeholder="Field 1..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="otherField2" label="Custom Field 2">
                  <Input placeholder="Field 2..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="otherField3" label="Custom Field 3">
                  <Input placeholder="Field 3..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space style={{ width: '100%', paddingTop: 28 }} size="large">
                  <Form.Item
                    name="enableSerialNumber"
                    valuePropName="checked"
                    getValueFromEvent={(e) => (e.target.checked ? '1' : '0')}
                    getValueProps={(value) => ({ checked: value === '1' })}
                    noStyle
                  >
                    <Checkbox>Serial No (SN)</Checkbox>
                  </Form.Item>
                  <Form.Item
                    name="enableBatchNumber"
                    valuePropName="checked"
                    getValueFromEvent={(e) => (e.target.checked ? '1' : '0')}
                    getValueProps={(value) => ({ checked: value === '1' })}
                    noStyle
                  >
                    <Checkbox>Batch No</Checkbox>
                  </Form.Item>
                </Space>
              </Col>
            </Row>

            {/* SKU / Barcode & Pricing Table */}
            <div style={{ marginTop: 10, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>SKU Barcodes & Price Tiers</div>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddSkuRow}>
                  Add SKU Row
                </Button>
              </div>

              <Table
                rowKey={(record) => String(record.id || record.barCode)}
                size="small"
                bordered
                pagination={false}
                columns={skuColumns as any}
                dataSource={skuList}
                scroll={{ x: 850 }}
              />
            </div>

            <Form.Item name="remark" label="Remarks / Description">
              <Input.TextArea rows={2} placeholder="Additional product notes..." />
            </Form.Item>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Warehouse Initial Stocks" key="2">
            <div style={{ marginBottom: 12, color: '#595959', fontSize: 12 }}>
              Configure opening inventory balance and safety stock thresholds across your warehouses:
            </div>
            <Table
              rowKey="depotId"
              size="small"
              bordered
              pagination={false}
              columns={depotColumns as any}
              dataSource={depotStockList}
            />
          </Tabs.TabPane>
        </Tabs>
      </Form>
    </Modal>
  )
}
