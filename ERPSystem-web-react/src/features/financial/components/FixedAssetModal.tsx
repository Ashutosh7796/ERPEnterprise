import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, DatePicker, Select, message, Row, Col, Divider, Alert, Tag } from 'antd'
import dayjs from 'dayjs'
import { FixedAssetDTO, AssetClassDTO, fixedAssetApi } from '../api/fixedAssetApi'

interface FixedAssetModalProps {
  visible: boolean
  editingAsset?: FixedAssetDTO | null
  onClose: () => void
  onSuccess: () => void
}

export const FixedAssetModal: React.FC<FixedAssetModalProps> = ({
  visible,
  editingAsset,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [classes, setClasses] = useState<AssetClassDTO[]>([])
  const [selectedClass, setSelectedClass] = useState<AssetClassDTO | null>(null)

  // Live simulation states
  const grossCost = Form.useWatch('grossCost', form) || 0
  const residualPercentage = Form.useWatch('residualPercentage', form) || 0
  const usefulLifeMonths = Form.useWatch('usefulLifeMonths', form) || 1
  const status = Form.useWatch('status', form) || 'ACTIVE'

  const salvageValue = (grossCost * (residualPercentage / 100))
  const depreciableBase = Math.max(0, grossCost - salvageValue)
  const monthlyDep = usefulLifeMonths > 0 ? (depreciableBase / usefulLifeMonths) : 0

  const isFinancialLocked = Boolean(editingAsset && editingAsset.status !== 'DRAFT')

  useEffect(() => {
    if (visible) {
      loadClasses()
      if (editingAsset) {
        form.setFieldsValue({
          ...editingAsset,
          acquisitionDate: editingAsset.acquisitionDate ? dayjs(editingAsset.acquisitionDate) : undefined,
          capitalizationDate: editingAsset.capitalizationDate ? dayjs(editingAsset.capitalizationDate) : undefined,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          status: 'ACTIVE',
          acquisitionDate: dayjs(),
          capitalizationDate: dayjs(),
          residualPercentage: 5,
          usefulLifeMonths: 60,
        })
      }
    }
  }, [visible, editingAsset, form])

  const loadClasses = async () => {
    try {
      const res: any = await fixedAssetApi.getAllClasses('ACTIVE')
      if (Array.isArray(res)) {
        setClasses(res)
      } else if (res?.data && Array.isArray(res.data)) {
        setClasses(res.data)
      }
    } catch (e) {
      console.error('Failed to load asset classes', e)
    }
  }

  const handleClassChange = (classId: number) => {
    const cls = classes.find((c) => c.id === classId)
    setSelectedClass(cls || null)
    if (cls && !editingAsset) {
      form.setFieldsValue({
        usefulLifeMonths: cls.usefulLifeMonths,
        residualPercentage: cls.defaultResidualPercentage || 5,
        glCostAccountId: cls.assetAccountId,
        glAccumDepAccountId: cls.accumulatedDepAccountId,
        glDepExpenseAccountId: cls.depreciationExpenseAccountId,
      })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload: Partial<FixedAssetDTO> = {
        ...values,
        acquisitionDate: values.acquisitionDate ? values.acquisitionDate.format('YYYY-MM-DD') : undefined,
        capitalizationDate: values.capitalizationDate ? values.capitalizationDate.format('YYYY-MM-DD') : undefined,
      }

      if (editingAsset && editingAsset.id) {
        await fixedAssetApi.update({ ...payload, id: editingAsset.id })
        message.success('Fixed Asset updated successfully')
      } else {
        await fixedAssetApi.create(payload)
        message.success('Fixed Asset registered successfully')
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
      title={editingAsset ? `Edit Asset: ${editingAsset.assetCode} - ${editingAsset.assetName}` : 'Register New Fixed Asset'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={760}
      destroyOnClose
    >
      {isFinancialLocked && (
        <Alert
          message="Financial Core Locked"
          description="This asset is active and financially posted. Cost, capitalization date, and life are authoritative and can only be modified through depreciation or disposal workflows. Only operational metadata (location, department, serial number) may be updated."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name="assetCode" label="Asset Tag / Code">
              <Input placeholder="Auto-generated if blank (AST-YYYYMM-XXXX)" disabled={!!editingAsset} />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="assetName"
              label="Asset Description / Name"
              rules={[{ required: true, message: 'Asset Name is required' }]}
            >
              <Input placeholder="e.g. Dell PowerEdge Server R750" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="assetClassId"
              label="Asset Class"
              rules={[{ required: true, message: 'Asset Class is required' }]}
            >
              <Select
                showSearch
                placeholder="Select Asset Class"
                onChange={handleClassChange}
                disabled={isFinancialLocked}
              >
                {classes.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.classCode} - {c.className}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="status"
              label="Registration Status"
              rules={[{ required: true }]}
            >
              <Select disabled={isFinancialLocked}>
                <Select.Option value="ACTIVE">ACTIVE (Capitalized)</Select.Option>
                <Select.Option value="DRAFT">DRAFT (Pending)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="serialNumber"
              label="Serial Number"
            >
              <Input placeholder="Manufacturer S/N" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '10px 0' }}>
          Valuation & Statutory Depreciation Basis
        </Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="grossCost"
              label="Gross Cost (Acquisition Value)"
              rules={[{ required: true, message: 'Cost is required' }]}
            >
              <InputNumber
                min={0.01}
                step={100}
                style={{ width: '100%' }}
                prefix="₹"
                disabled={isFinancialLocked}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="residualPercentage"
              label="Residual / Scrap %"
              rules={[{ required: true, message: 'Residual % required' }]}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.5}
                style={{ width: '100%' }}
                suffix="%"
                disabled={isFinancialLocked}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="usefulLifeMonths"
              label="Useful Life (Months)"
              rules={[{ required: true, message: 'Life is required' }]}
            >
              <InputNumber
                min={1}
                max={1200}
                style={{ width: '100%' }}
                disabled={isFinancialLocked}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Live Simulation Preview Card */}
        <div
          style={{
            background: '#fafafa',
            border: '1px dashed #d9d9d9',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>Salvage Value:</span>
              <div style={{ fontWeight: 600, color: '#262626' }}>
                ₹{salvageValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>Depreciable Base:</span>
              <div style={{ fontWeight: 600, color: '#1890ff' }}>
                ₹{depreciableBase.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>Est. Monthly Charge:</span>
              <div style={{ fontWeight: 600, color: '#52c41a' }}>
                ₹{monthlyDep.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
              </div>
            </Col>
          </Row>
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="acquisitionDate"
              label="Acquisition Date"
              rules={[{ required: true, message: 'Acquisition date required' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={isFinancialLocked} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="capitalizationDate"
              label="Capitalization / Put to Use Date"
              rules={[{ required: status === 'ACTIVE', message: 'Capitalization date required for ACTIVE assets' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={isFinancialLocked} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '10px 0' }}>
          Operational Metadata
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="location" label="Location / Building / Room">
              <Input placeholder="e.g. Data Center - Rack B04" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="department" label="Department / Cost Center">
              <Input placeholder="e.g. Information Technology" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
