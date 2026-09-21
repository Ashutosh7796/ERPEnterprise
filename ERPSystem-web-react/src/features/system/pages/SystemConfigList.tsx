import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Tabs,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Spin,
  App,
} from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  BankOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

const { Title, Text, Paragraph } = Typography

export const SystemConfigListPage: React.FC = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [configId, setConfigId] = useState<number | null>(null)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await http.get<any>('/systemConfig/getCurrentInfo')
      const data = res?.data || res
      if (data) {
        setConfigId(data.id || null)
        form.setFieldsValue({
          companyName: data.companyName || '',
          companyContacts: data.companyContacts || '',
          companyAddress: data.companyAddress || '',
          companyTel: data.companyTel || '',
          companyFax: data.companyFax || '',
          companyPostCode: data.companyPostCode || '',
          saleAgreement: data.saleAgreement || '',
          depotFlag: data.depotFlag === '1' || data.depotFlag === true,
          customerFlag: data.customerFlag === '1' || data.customerFlag === true,
          minusStockFlag: data.minusStockFlag === '1' || data.minusStockFlag === true,
          purchaseBySaleFlag: data.purchaseBySaleFlag === '1' || data.purchaseBySaleFlag === true,
          overLinkBillFlag: data.overLinkBillFlag === '1' || data.overLinkBillFlag === true,
          updateUnitPriceFlag: data.updateUnitPriceFlag !== '0' && data.updateUnitPriceFlag !== false,
          forceApprovalFlag: data.forceApprovalFlag === '1' || data.forceApprovalFlag === true,
          inOutManageFlag: data.inOutManageFlag === '1' || data.inOutManageFlag === true,
          multiAccountFlag: data.multiAccountFlag === '1' || data.multiAccountFlag === true,
          moveAvgPriceFlag: data.moveAvgPriceFlag === '1' || data.moveAvgPriceFlag === true,
          auditPrintFlag: data.auditPrintFlag === '1' || data.auditPrintFlag === true,
          zeroChangeAmountFlag: data.zeroChangeAmountFlag === '1' || data.zeroChangeAmountFlag === true,
          customerStaticPriceFlag: data.customerStaticPriceFlag === '1' || data.customerStaticPriceFlag === true,
          materialPriceTaxFlag: data.materialPriceTaxFlag === '1' || data.materialPriceTaxFlag === true,
        })
      }
    } catch (err: any) {
      console.error('Failed to load system config:', err)
      message.error(err?.message || 'Failed to load system configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload: any = {
        id: configId,
        companyName: values.companyName || '',
        companyContacts: values.companyContacts || '',
        companyAddress: values.companyAddress || '',
        companyTel: values.companyTel || '',
        companyFax: values.companyFax || '',
        companyPostCode: values.companyPostCode || '',
        saleAgreement: values.saleAgreement || '',
        depotFlag: values.depotFlag ? '1' : '0',
        customerFlag: values.customerFlag ? '1' : '0',
        minusStockFlag: values.minusStockFlag ? '1' : '0',
        purchaseBySaleFlag: values.purchaseBySaleFlag ? '1' : '0',
        overLinkBillFlag: values.overLinkBillFlag ? '1' : '0',
        updateUnitPriceFlag: values.updateUnitPriceFlag ? '1' : '0',
        forceApprovalFlag: values.forceApprovalFlag ? '1' : '0',
        inOutManageFlag: values.inOutManageFlag ? '1' : '0',
        multiAccountFlag: values.multiAccountFlag ? '1' : '0',
        moveAvgPriceFlag: values.moveAvgPriceFlag ? '1' : '0',
        auditPrintFlag: values.auditPrintFlag ? '1' : '0',
        zeroChangeAmountFlag: values.zeroChangeAmountFlag ? '1' : '0',
        customerStaticPriceFlag: values.customerStaticPriceFlag ? '1' : '0',
        materialPriceTaxFlag: values.materialPriceTaxFlag ? '1' : '0',
      }

      await http.put('/systemConfig/update', payload)
      message.success('System configuration updated successfully!')
      fetchConfig()
    } catch (err: any) {
      message.error(err?.message || 'Failed to save system configuration')
    } finally {
      setSaving(false)
    }
  }

  const toggleConfigs = [
    {
      name: 'depotFlag',
      label: 'Assign Warehouse Permission',
      desc: 'When enabled, users must be explicitly granted access to specific warehouses under User Management.',
    },
    {
      name: 'customerFlag',
      label: 'Assign Customer Permission',
      desc: 'When enabled, sales representatives can only view and process transactions for customers assigned to them.',
    },
    {
      name: 'minusStockFlag',
      label: 'Support Negative Inventory',
      desc: 'When enabled, sales and outbound bills can be saved even if stock quantities drop below zero without insufficient stock warnings.',
    },
    {
      name: 'purchaseBySaleFlag',
      label: 'Purchase by Sale (Back-to-Back)',
      desc: 'When enabled, purchase orders can be generated directly based on existing sales orders.',
    },
    {
      name: 'overLinkBillFlag',
      label: 'Exceed Linked Bill Quantities',
      desc: 'When enabled, bills referencing previous documents can exceed the referenced product quantity.',
    },
    {
      name: 'updateUnitPriceFlag',
      label: 'Auto Update Unit Price',
      desc: 'When enabled, product master prices are dynamically updated based on the latest entered purchase/sales invoices.',
    },
    {
      name: 'forceApprovalFlag',
      label: 'Strict Approval for Stock Impact',
      desc: 'When enabled, inventory counts are adjusted only after invoices/bills are approved by an authorized manager.',
    },
    {
      name: 'inOutManageFlag',
      label: 'Dedicated In/Out Management',
      desc: 'When enabled, inventory changes require separate inbound/outbound transfer confirmation.',
    },
    {
      name: 'multiAccountFlag',
      label: 'Multi-Account Settlement',
      desc: 'Allows splitting payments across multiple payment ledgers and bank accounts simultaneously in purchase and sales bills.',
    },
    {
      name: 'moveAvgPriceFlag',
      label: 'Moving Average Cost Valuation',
      desc: 'Calculates product cost using the real-time weighted moving average instead of static catalog prices.',
    },
    {
      name: 'auditPrintFlag',
      label: 'Audit Before Printing',
      desc: 'Enforces that retail, purchase, sales, and warehouse vouchers must be approved before printing.',
    },
    {
      name: 'zeroChangeAmountFlag',
      label: 'Zero Default Payment on New Bills',
      desc: 'Initializes the "This Payment / Receipt" field to ₹0.00 by default when opening new bill forms.',
    },
    {
      name: 'customerStaticPriceFlag',
      label: 'Customer Static Price',
      desc: 'Loads product catalog prices instead of recalling customer-specific historical billing rates.',
    },
    {
      name: 'materialPriceTaxFlag',
      label: 'Product Prices Include Tax',
      desc: 'Treats all product prices as tax-inclusive when generating purchase and sales lines.',
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '20px 24px' } }}>
      <Spin spinning={loading}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>System Settings & Global Configurations</Title>
            <Text type="secondary">Manage enterprise master profile, sales agreement, and ERP module behavior policies.</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchConfig}>Refresh</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>Save Changes</Button>
          </Space>
        </div>

        <Form form={form} layout="vertical">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'basic',
                label: (
                  <span>
                    <BankOutlined /> Enterprise Profile & Legal
                  </span>
                ),
                children: (
                  <div style={{ maxWidth: 850, paddingTop: 12 }}>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="companyName" label="Company / Enterprise Name">
                          <Input placeholder="e.g. Acme ERP Solutions Ltd." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="companyContacts" label="Primary Contact Person">
                          <Input placeholder="e.g. Rahul Sharma" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="companyTel" label="Official Phone Number">
                          <Input placeholder="e.g. +91 11-23456789" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="companyFax" label="Fax Number">
                          <Input placeholder="e.g. 011-23456780" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="companyPostCode" label="Postal / PIN Code">
                          <Input placeholder="e.g. 110001" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="companyAddress" label="Registered Business Address">
                          <Input placeholder="e.g. Plot 101, Tech Park, Phase 2..." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="saleAgreement" label="Standard Sales Agreement / Terms & Conditions">
                          <Input.TextArea rows={4} placeholder="Terms and conditions printed at bottom of customer invoices..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'policies',
                label: (
                  <span>
                    <SettingOutlined /> ERP Feature Policies (14 Rules)
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: 12 }}>
                    <Row gutter={[24, 16]}>
                      {toggleConfigs.map((cfg) => (
                        <Col xs={24} md={12} key={cfg.name}>
                          <Card
                            size="small"
                            bordered
                            style={{
                              borderRadius: 6,
                              height: '100%',
                              backgroundColor: '#fafafa',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text strong style={{ fontSize: 14 }}>{cfg.label}</Text>
                                <Form.Item name={cfg.name} valuePropName="checked" style={{ marginBottom: 0 }}>
                                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                                </Form.Item>
                              </div>
                              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                                {cfg.desc}
                              </Paragraph>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </Spin>
    </Card>
  )
}
