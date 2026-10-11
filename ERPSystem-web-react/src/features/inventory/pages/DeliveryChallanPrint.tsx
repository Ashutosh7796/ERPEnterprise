import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Table, Typography, Row, Col, Divider, Space, Tag, Spin, message } from 'antd'
import { PrinterOutlined, ArrowLeftOutlined, QrcodeOutlined, CarOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'
import { gstApi } from '@features/gst/api/gstApi'
import { formatCurrency, formatIndianDate } from '@shared/utils/indianTax'

const { Title, Text } = Typography

export const DeliveryChallanPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [challanData, setChallanData] = useState<any>(null)
  const [ewbData, setEwbData] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      loadChallan(Number(id))
    }
  }, [id])

  const loadChallan = async (docId: number) => {
    setLoading(true)
    try {
      const [headRes, ewbRes]: any = await Promise.all([
        http.get('/depotHead/getDetailByNumber', { params: { id: docId } }),
        gstApi.getEinvoiceStatus({ documentId: docId, documentType: 'Transfer' }).catch(() => null),
      ])

      if (headRes && (headRes.code === 200 || headRes.data)) {
        setChallanData(headRes.data || headRes)
      }
      if (ewbRes && ewbRes.code === 200 && ewbRes.data) {
        setEwbData(ewbRes.data)
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load Delivery Challan')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!challanData) {
    return (
      <Card style={{ margin: 20 }}>
        <Text type="danger">Delivery Challan details not found for document ID {id}</Text>
        <div style={{ marginTop: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </Card>
    )
  }

  const items = challanData.materialsList || challanData.items || []

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Control Bar (Hidden during print) */}
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back to Transfers
        </Button>
        <Space>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Delivery Challan
          </Button>
        </Space>
      </div>

      {/* Printable Sheet */}
      <Card
        ref={printRef}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 24,
          background: '#ffffff',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0, textTransform: 'uppercase' }}>
            Delivery Challan
          </Title>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
            (Issued under Rule 55 of the Central Goods and Services Tax Rules, 2017)
          </Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="purple" style={{ fontSize: 11 }}>
              PURPOSE OF TRANSPORTATION: SUPPLY OF GOODS ON CONSIGNMENT / INTER-BRANCH STOCK TRANSFER
            </Tag>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Header Grid */}
        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small" title="Consignor (Dispatching Location)" style={{ height: '100%' }}>
              <div><strong>Name:</strong> Central Logistics Warehouse</div>
              <div><strong>Address:</strong> Plot No 42, MIDC Industrial Area, Pune</div>
              <div><strong>State & POS Code:</strong> 27 - Maharashtra</div>
              <div><strong>GSTIN:</strong> 27AAACT2727Q1ZW</div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Consignee (Receiving Location)" style={{ height: '100%' }}>
              <div><strong>Name:</strong> Regional Warehouse & Distribution Centre</div>
              <div><strong>Address:</strong> Warehouse 10B, GIDC Logistics Hub, Ahmedabad</div>
              <div><strong>State & POS Code:</strong> 24 - Gujarat</div>
              <div><strong>GSTIN:</strong> 24AAACT2727Q1Z5 (Same Legal Entity)</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <div><strong>Challan Number:</strong> {challanData.number || `DC-TR-${id}`}</div>
            <div><strong>Challan Date:</strong> {formatIndianDate(challanData.operTime || new Date())}</div>
          </Col>
          <Col span={12}>
            {ewbData && ewbData.ewbNumber && (
              <div>
                <div><strong>e-Way Bill No:</strong> <Tag color="blue">{ewbData.ewbNumber}</Tag></div>
                <div><strong>EWB Valid Until:</strong> {ewbData.validUntil || 'Active'}</div>
              </div>
            )}
            <div><strong>Mode of Transport:</strong> Road Transport</div>
          </Col>
        </Row>

        {/* Item Table */}
        <Table
          dataSource={items}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          columns={[
            { title: '#', render: (_: any, __: any, index: number) => index + 1, width: 50, align: 'center' },
            { title: 'Description of Goods', dataIndex: 'name', key: 'name' },
            { title: 'HSN Code', dataIndex: 'hsnCode', key: 'hsnCode', width: 110, render: (val) => val || '841370' },
            { title: 'Quantity', dataIndex: 'operNumber', key: 'operNumber', width: 90, align: 'right' },
            { title: 'UOM', dataIndex: 'unit', key: 'unit', width: 80, align: 'center', render: (val) => val || 'NOS' },
            { title: 'Rate (₹)', dataIndex: 'unitPrice', key: 'unitPrice', width: 110, align: 'right', render: (val) => formatCurrency(val || 0) },
            { title: 'Taxable Value (₹)', dataIndex: 'allPrice', key: 'allPrice', width: 130, align: 'right', render: (val) => formatCurrency(val || 0) },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* Declaration */}
        <div style={{ marginTop: 24, fontSize: 11, color: '#666', borderTop: '1px solid #eee', paddingTop: 12 }}>
          <p>
            <strong>Statutory Declaration:</strong> This Delivery Challan is issued in accordance with Rule 55 of the CGST / SGST Rules, 2017 for the movement of goods not by way of outward taxable sale (e.g. transfer to branch / job work / exhibition). No tax invoice is issued for this transportation.
          </p>
        </div>

        {/* Signatures */}
        <Row gutter={48} style={{ marginTop: 40, textAlign: 'center' }}>
          <Col span={12}>
            <div style={{ borderTop: '1px dashed #999', paddingTop: 8, width: 180, margin: '0 auto' }}>
              <strong>Prepared By / Dispatcher</strong>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ borderTop: '1px dashed #999', paddingTop: 8, width: 180, margin: '0 auto' }}>
              <strong>Authorized Signatory</strong>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
