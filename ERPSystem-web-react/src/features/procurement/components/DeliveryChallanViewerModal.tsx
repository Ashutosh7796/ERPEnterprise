import React from 'react'
import { Modal, Card, Row, Col, Typography, Table, Tag, Button, Space, message } from 'antd'
import { PrinterOutlined, CopyOutlined, CheckCircleOutlined, CarOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import type { DeliveryChallan, DeliveryChallanItem } from '../api/procurementApi'

const { Title, Text } = Typography

interface DeliveryChallanViewerModalProps {
  visible: boolean
  challan: DeliveryChallan | null
  onClose: () => void
}

export const DeliveryChallanViewerModal: React.FC<DeliveryChallanViewerModalProps> = ({
  visible,
  challan,
  onClose,
}) => {
  if (!challan) return null

  const handleCopyEwb = () => {
    if (challan.ewayBillPayload) {
      navigator.clipboard.writeText(challan.ewayBillPayload)
      message.success('E-Way Bill JSON payload copied to clipboard')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const columns = [
    {
      title: 'Item Description',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (text: string, row: DeliveryChallanItem) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>HSN: {row.hsnCode || '8471'}</div>
        </div>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number, row: DeliveryChallanItem) => `${val.toLocaleString()} ${row.unit || 'PCS'}`,
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'unitValue',
      key: 'unitValue',
      render: (val: number) => `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Taxable Value (₹)',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      render: (val: number) => `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'GST Rate',
      dataIndex: 'gstRate',
      key: 'gstRate',
      render: (val: number) => `${val}%`,
    },
    {
      title: 'Total Amount (₹)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>Statutory Rule 55 Delivery Challan — Triplicate Transport Document</span>
          <Tag color="blue">{challan.challanNumber}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        challan.ewayBillPayload && (
          <Button key="copyEwb" icon={<CopyOutlined />} onClick={handleCopyEwb}>
            Copy E-Way Bill JSON
          </Button>
        ),
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print Triplicate Challan
        </Button>,
      ]}
    >
      <div id="printable-challan" style={{ padding: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>DELIVERY CHALLAN</Title>
          <Text type="secondary">(Issued under Rule 55 of the CGST / SGST Rules, 2017)</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="green">ORIGINAL FOR CONSIGNEE</Tag>
            <Tag color="cyan">DUPLICATE FOR TRANSPORTER</Tag>
            <Tag color="orange">TRIPLICATE FOR CONSIGNOR</Tag>
          </div>
        </div>

        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={24}>
            <Col span={12}>
              <Text strong>Challan No:</Text> <Text code>{challan.challanNumber}</Text><br />
              <Text strong>Challan Date:</Text> {challan.challanDate ? String(challan.challanDate).split('T')[0] : 'N/A'}<br />
              <Text strong>Return Ref:</Text> {challan.returnNumber}
            </Col>
            <Col span={12}>
              <Text strong>Transport Mode:</Text> {challan.transportMode || 'ROAD'}<br />
              <Text strong>Vehicle Number:</Text> <Tag icon={<CarOutlined />} color="purple">{challan.vehicleNumber || 'MH12AB1234'}</Tag><br />
              <Text strong>E-Way Bill No:</Text> {challan.ewayBillNumber ? <Tag color="success">{challan.ewayBillNumber}</Tag> : <Text type="secondary">Below ₹50,000 threshold</Text>}
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="Consignor (Sender / Buyer Enterprise)" size="small" bordered>
              <Text strong>{challan.consignorName}</Text><br />
              <Text type="secondary">{challan.consignorAddress || 'Plot 42, MIDC Industrial Area, Pune 411018'}</Text><br />
              <Text strong>GSTIN:</Text> <Text code>{challan.consignorGstin || '27AAACE1234E1Z1'}</Text><br />
              <Text strong>State Code:</Text> {challan.consignorStateCode || '27 (Maharashtra)'}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Consignee (Recipient / Supplier)" size="small" bordered>
              <Text strong>{challan.consigneeName}</Text><br />
              <Text type="secondary">{challan.consigneeAddress || 'Supplier Depot / Manufacturing Plant'}</Text><br />
              <Text strong>GSTIN:</Text> <Text code>{challan.consigneeGstin || '27AAAAA0000A1Z5'}</Text><br />
              <Text strong>State Code:</Text> {challan.consigneeStateCode || '27 (Maharashtra)'}
            </Card>
          </Col>
        </Row>

        <Table
          size="small"
          columns={columns}
          dataSource={challan.items || []}
          rowKey={(r, i) => String(r.materialId || i)}
          pagination={false}
          style={{ marginBottom: 16 }}
        />

        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row gutter={16} justify="end">
            <Col span={10}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>Total Taxable Value:</Text>
                <Text strong>₹{challan.totalTaxableAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>CGST Value:</Text>
                <Text>₹{challan.totalCgstAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>SGST Value:</Text>
                <Text>₹{challan.totalSgstAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </div>
              {challan.totalIgstAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>IGST Value:</Text>
                  <Text>₹{challan.totalIgstAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d9d9d9', paddingTop: 6 }}>
                <Title level={5} style={{ margin: 0, color: '#389e0d' }}>Total Challan Value:</Title>
                <Title level={5} style={{ margin: 0, color: '#389e0d' }}>
                  ₹{challan.totalChallanAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Title>
              </div>
            </Col>
          </Row>
        </Card>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 180, borderBottom: '1px dashed #8c8c8c', marginBottom: 4 }}></div>
            <Text type="secondary">Transporter Signature</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 180, borderBottom: '1px dashed #8c8c8c', marginBottom: 4 }}></div>
            <Text type="secondary">Authorized Signatory</Text>
          </div>
        </div>
      </div>
    </Modal>
  )
}
