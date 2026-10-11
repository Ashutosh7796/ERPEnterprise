import React, { useEffect, useState } from 'react'
import { Modal, Form, DatePicker, Select, InputNumber, Input, Button, Alert, Row, Col, Divider, message, Spin, Statistic } from 'antd'
import dayjs from 'dayjs'
import { FixedAssetDTO, AssetDisposalDTO, AssetDisposalVo, fixedAssetApi } from '../api/fixedAssetApi'
import { accountCoaApi, AccountCoaNodeDTO } from '../api/accountCoaApi'

interface AssetDisposalModalProps {
  visible: boolean
  asset: FixedAssetDTO | null
  onClose: () => void
  onSuccess: () => void
}

export const AssetDisposalModal: React.FC<AssetDisposalModalProps> = ({
  visible,
  asset,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<AssetDisposalDTO | null>(null)
  const [accounts, setAccounts] = useState<AccountCoaNodeDTO[]>([])

  const disposalType = Form.useWatch('disposalType', form) || 'SALE'

  useEffect(() => {
    if (visible && asset) {
      loadAccounts()
      form.resetFields()
      form.setFieldsValue({
        disposalDate: dayjs(),
        disposalType: 'SALE',
        saleProceeds: 0,
      })
      setPreviewData(null)
      triggerPreview()
    }
  }, [visible, asset])

  const loadAccounts = async () => {
    try {
      const res: any = await accountCoaApi.getList({ pageSize: 1000, status: 'ACTIVE' })
      if (res && res.rows) {
        setAccounts(res.rows.filter((a: AccountCoaNodeDTO) => a.isGroup === '0'))
      }
    } catch (e) {
      console.error('Failed to load accounts', e)
    }
  }

  const getPayload = async (): Promise<AssetDisposalVo | null> => {
    if (!asset || !asset.id) return null
    try {
      const values = await form.validateFields()
      return {
        assetId: asset.id,
        disposalDate: values.disposalDate.format('YYYY-MM-DD'),
        disposalType: values.disposalType,
        saleProceeds: values.saleProceeds || 0,
        settlementAccountId: values.settlementAccountId,
        notes: values.notes,
      }
    } catch (e) {
      return null
    }
  }

  const triggerPreview = async () => {
    const payload = await getPayload()
    if (!payload) return
    try {
      setPreviewing(true)
      const res: any = await fixedAssetApi.previewDisposal(payload)
      const data = res?.data || res
      setPreviewData(data)
    } catch (e: any) {
      message.error('Failed to preview disposal: ' + (e?.message || 'Server error'))
      setPreviewData(null)
    } finally {
      setPreviewing(false)
    }
  }

  const handleExecute = async () => {
    const payload = await getPayload()
    if (!payload) return
    try {
      setLoading(true)
      await fixedAssetApi.executeDisposal(payload)
      message.success(`Asset ${asset?.assetCode} disposed successfully with full GL posting`)
      onSuccess()
      onClose()
    } catch (e: any) {
      message.error(e?.message || 'Failed to execute disposal')
    } finally {
      setLoading(false)
    }
  }

  if (!asset) return null

  return (
    <Modal
      title={`Fixed Asset Disposal & Derecognition: ${asset.assetCode} - ${asset.assetName}`}
      open={visible}
      onCancel={onClose}
      width={760}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="preview" onClick={triggerPreview} loading={previewing}>
          Recalculate Preview
        </Button>,
        <Button key="submit" type="primary" danger onClick={handleExecute} loading={loading}>
          Confirm & Post Disposal GL
        </Button>,
      ]}
      destroyOnClose
    >
      <Alert
        message="Authoritative Accounting Lifecycle Safeguard"
        description="Disposal locks the asset, calculates pro-rata final depreciation up to the disposal date, posts double-entry GL facts to derecognize cost and accumulated depreciation, and recognizes gain/loss. This action is irreversible."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onValuesChange={() => setPreviewData(null)}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="disposalDate"
              label="Disposal Date"
              rules={[{ required: true, message: 'Disposal date required' }]}
            >
              <DatePicker style={{ width: '100%' }} onChange={() => triggerPreview()} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="disposalType"
              label="Disposal Type"
              rules={[{ required: true, message: 'Disposal type required' }]}
            >
              <Select onChange={() => triggerPreview()}>
                <Select.Option value="SALE">SALE (With Proceeds)</Select.Option>
                <Select.Option value="SCRAP">SCRAP (Zero Consideration)</Select.Option>
                <Select.Option value="WRITE_OFF">WRITE OFF (Loss Recognition)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="saleProceeds"
              label="Sale Proceeds (₹)"
              rules={[{ required: disposalType === 'SALE', message: 'Proceeds required' }]}
            >
              <InputNumber
                min={0}
                step={100}
                prefix="₹"
                style={{ width: '100%' }}
                disabled={disposalType !== 'SALE'}
                onBlur={triggerPreview}
              />
            </Form.Item>
          </Col>
        </Row>

        {disposalType === 'SALE' && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="settlementAccountId"
                label="Bank / Settlement Account"
                rules={[{ required: true, message: 'Settlement account required for sales' }]}
              >
                <Select showSearch optionFilterProp="children" placeholder="Select Bank/Cash Account">
                  {accounts
                    .filter((a) => a.accountType === 'BANK' || a.accountType === 'CASH' || a.rootType === 'ASSET')
                    .map((a) => (
                      <Select.Option key={a.id} value={a.id}>
                        {a.accountCode} - {a.accountName}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="notes" label="Disposal Remarks / Buyer Info">
          <Input.TextArea rows={2} placeholder="Reason for disposal, buyer name, reference invoice..." />
        </Form.Item>
      </Form>

      <Divider style={{ margin: '12px 0' }}>
        Disposal Financial Simulation
      </Divider>

      {previewing ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin description="Calculating final depreciation and asset derecognition..." />
        </div>
      ) : previewData ? (
        <div
          style={{
            background: '#f9f9f9',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Gross Cost"
                value={previewData.carryingGrossCost}
                precision={2}
                prefix="₹"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Existing Accum Dep"
                value={previewData.carryingAccumDep}
                precision={2}
                prefix="₹"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Final Pro-Rata Dep"
                value={previewData.finalDepreciationAmount}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="NBV at Disposal"
                value={previewData.netBookValueAtDisposal}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Total Proceeds"
                value={previewData.saleProceeds}
                precision={2}
                prefix="₹"
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={previewData.gainLossAmount >= 0 ? 'Gain on Disposal (Credit)' : 'Loss on Disposal (Debit)'}
                value={Math.abs(previewData.gainLossAmount)}
                precision={2}
                prefix="₹"
                valueStyle={{
                  color: previewData.gainLossAmount >= 0 ? '#52c41a' : '#f5222d',
                  fontWeight: 'bold',
                }}
              />
            </Col>
          </Row>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 16 }}>
          Click "Recalculate Preview" to simulate disposal accounting.
        </div>
      )}
    </Modal>
  )
}
