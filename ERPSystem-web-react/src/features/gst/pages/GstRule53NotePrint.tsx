import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Typography, Row, Col, Divider, Spin, message, Button } from 'antd'
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { gstApi } from '../api/gstApi'
import { formatCurrency, formatIndianDate } from '@shared/utils/indianTax'
import { GstSignedQrViewer } from '../components/GstSignedQrViewer'

const { Title, Text } = Typography

export const GstRule53NotePrint: React.FC<{ noteId?: number }> = ({ noteId: propNoteId }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const noteId = propNoteId || Number(id)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [einvoiceStatus, setEinvoiceStatus] = useState<any>(null)

  useEffect(() => {
    if (noteId) {
      loadData()
    }
  }, [noteId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await gstApi.getRule53Note(noteId)
      if (res.code === 200 && res.data) {
        setData(res.data)
      }
      try {
        const einvRes = await gstApi.getEinvoiceStatus({ documentId: noteId, documentType: 'CRN' })
        if (einvRes && einvRes.data) {
          setEinvoiceStatus(einvRes.data)
        }
      } catch (ignored) {}
    } catch (e: any) {
      message.error(e?.message || 'Failed to load Note for print')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <Spin tip="Loading GST Rule 53 Document..." />
  }

  const isCreditNote = data.noteType === 'CREDIT_NOTE'

  const columns = [
    {
      title: '#',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 40,
    },
    {
      title: 'Item / Description',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (text: string, r: any) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 11, color: '#666' }}>HSN/SAC: {r.hsnSacCode}</div>
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'adjustedQuantity',
      key: 'adjustedQuantity',
      align: 'right' as const,
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'adjustedUnitPrice',
      key: 'adjustedUnitPrice',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Taxable Value (₹)',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'GST Rate',
      dataIndex: 'gstRate',
      key: 'gstRate',
      align: 'center' as const,
      render: (val: number) => `${val}%`,
    },
    {
      title: 'CGST (₹)',
      dataIndex: 'cgstAmount',
      key: 'cgstAmount',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'SGST (₹)',
      dataIndex: 'sgstAmount',
      key: 'sgstAmount',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'IGST (₹)',
      dataIndex: 'igstAmount',
      key: 'igstAmount',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Total (₹)',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
  ]

  return (
    <div className="printable-document" style={{ width: '100%', padding: '16px 0' }}>
      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button icon={<PrinterOutlined />} type="primary" onClick={() => window.print()}>
          Print Document
        </Button>
      </div>
      <Card
        className="print-document-card"
        style={{ maxWidth: 900, margin: '0 auto', padding: 24, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
      >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Tag color={isCreditNote ? 'red' : 'blue'} style={{ fontSize: 14, padding: '4px 12px' }}>
          {isCreditNote ? 'GST CREDIT NOTE (SECTION 34 / RULE 53)' : 'GST DEBIT NOTE (SECTION 34 / RULE 53)'}
        </Tag>
        <Title level={3} style={{ margin: '8px 0 2px 0' }}>
          {data.supplierTradeName || data.supplierLegalName || 'Company Trade Name'}
        </Title>
        <Text type="secondary">{data.supplierAddress}</Text>
        <div>
          <Text strong>GSTIN: {data.supplierGstin}</Text> | State: {data.supplierStateName} ({data.supplierStateCode})
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {einvoiceStatus && einvoiceStatus.irn && (
        <GstSignedQrViewer
          signedQrJwt={einvoiceStatus.signedQRCode}
          irn={einvoiceStatus.irn}
          ackNo={einvoiceStatus.ackNo}
          ackDate={einvoiceStatus.ackDate ? new Date(einvoiceStatus.ackDate).toLocaleString('en-IN') : undefined}
          isVerified={einvoiceStatus.isQrVerified}
          verificationDetails={einvoiceStatus.qrVerificationDetails}
        />
      )}

      {/* Note & Original Invoice References */}
      <Row gutter={24}>
        <Col span={12}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <div>
              <Text strong>{isCreditNote ? 'Credit Note No:' : 'Debit Note No:'} </Text>
              <Text strong style={{ color: '#1677ff' }}>
                {data.noteNumber}
              </Text>
            </div>
            <div>
              <Text type="secondary">Note Date: </Text>
              <Text>{data.noteDate ? formatIndianDate(data.noteDate) : '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Reason: </Text>
              <Tag color="purple">{data.reasonCode}</Tag>
            </div>
            <div>
              <Text type="secondary">Goods Return: </Text>
              <Tag color={data.isPhysicalReturn ? 'green' : 'default'}>
                {data.isPhysicalReturn ? 'Yes (Stock Restored)' : 'No (Financial Adjustment)'}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <div>
              <Text strong>Original Invoice No: </Text>
              <Text strong style={{ color: '#52c41a' }}>
                {data.originalInvoiceNumber || '-'}
              </Text>
            </div>
            <div>
              <Text type="secondary">Original Invoice Date: </Text>
              <Text>{data.originalInvoiceDate ? formatIndianDate(data.originalInvoiceDate) : '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Place of Supply (POS): </Text>
              <Text strong>
                {data.posStateName} ({data.posStateCode})
              </Text>
            </div>
            <div>
              <Text type="secondary">Supply Type: </Text>
              <Tag color="blue">{data.supplyType}</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* Recipient / Customer */}
      <Card size="small" title="Recipient (Customer Details)" style={{ marginBottom: 16 }}>
        <Row>
          <Col span={12}>
            <div>
              <Text strong>{data.customerLegalName || data.customerTradeName || 'Customer Name'}</Text>
            </div>
            <div>{data.billingAddress || data.shippingAddress}</div>
          </Col>
          <Col span={12}>
            <div>
              <Text strong>GSTIN: </Text>
              <Text>{data.customerGstin || 'URP (Unregistered)'}</Text>
            </div>
            <div>
              <Text strong>State: </Text>
              <Text>
                {data.customerStateName} ({data.customerStateCode})
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Itemized Table */}
      <Table
        dataSource={data.items || []}
        columns={columns}
        pagination={false}
        rowKey="serialNumber"
        size="small"
        bordered
      />

      {/* Totals */}
      <Row gutter={24} style={{ marginTop: 16 }}>
        <Col span={14}>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>Amount in Words:</Text>
            <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>
              {data.amountInWords || 'Indian Rupees Only'}
            </div>
            {data.isImmutableSnapshot && (
              <div style={{ marginTop: 12, fontSize: 11, color: '#888' }}>
                <div>Verified Statutory Immutable Snapshot</div>
                <div>Hash/ID: {data.deterministicCalculationId}</div>
              </div>
            )}
          </div>
        </Col>
        <Col span={10}>
          <div style={{ textAlign: 'right', padding: 8 }}>
            <div>
              <Text type="secondary">Total Taxable Value: </Text>
              <Text strong>{formatCurrency(data.totalTaxableValue)}</Text>
            </div>
            {data.totalCgstAmount > 0 && (
              <div>
                <Text type="secondary">Total CGST: </Text>
                <Text>{formatCurrency(data.totalCgstAmount)}</Text>
              </div>
            )}
            {data.totalSgstAmount > 0 && (
              <div>
                <Text type="secondary">Total SGST: </Text>
                <Text>{formatCurrency(data.totalSgstAmount)}</Text>
              </div>
            )}
            {data.totalIgstAmount > 0 && (
              <div>
                <Text type="secondary">Total IGST: </Text>
                <Text>{formatCurrency(data.totalIgstAmount)}</Text>
              </div>
            )}
            {data.totalCessAmount > 0 && (
              <div>
                <Text type="secondary">Total Cess: </Text>
                <Text>{formatCurrency(data.totalCessAmount)}</Text>
              </div>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Title level={4} style={{ margin: 0, color: isCreditNote ? '#cf1322' : '#1677ff' }}>
                Total Adjustment: {formatCurrency(data.finalNoteTotal)}
              </Title>
            </div>
          </div>
        </Col>
      </Row>

      <Divider style={{ margin: '24px 0 12px 0' }} />

      {/* Footer Signatory */}
      <Row justify="space-between" align="bottom" style={{ marginTop: 32 }}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            This is a computer generated document issued in accordance with Section 34 of the CGST Act, 2017.
          </Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: 4 }}>
            <Text strong>Authorised Signatory</Text>
          </div>
        </Col>
      </Row>
    </Card>
  </div>
  )
}
