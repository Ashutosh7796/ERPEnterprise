import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Spin, message, Tag } from 'antd'
import { PrinterOutlined, ArrowLeftOutlined, LockOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import { formatINR, numberToIndianWords } from '@shared/utils/indianTax'
import { GstSignedQrViewer } from '../components/GstSignedQrViewer'

export const GstRule46InvoicePrint: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<any>(null)
  const [einvoiceStatus, setEinvoiceStatus] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadInvoice(Number(id))
      loadEinvoiceStatus(Number(id))
    }
  }, [id])

  const loadEinvoiceStatus = async (invoiceId: number) => {
    try {
      const res = await gstApi.getEinvoiceStatus({ documentId: invoiceId, documentType: 'INV' })
      if (res && res.data) {
        setEinvoiceStatus(res.data)
      }
    } catch (ignored) {}
  }

  const loadInvoice = async (invoiceId: number) => {
    setLoading(true)
    try {
      const res = await gstApi.getRule46Invoice(invoiceId)
      if (res.code === 200) {
        setInvoice(res.data)
      } else {
        message.error('Failed to load invoice')
      }
    } catch (err: any) {
      message.error(err.message || 'Error loading invoice')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Normalized Item and Summary Calculations
  const calculatedData = useMemo(() => {
    if (!invoice || !invoice.items) {
      return {
        normalizedItems: [],
        totalTaxable: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalUtgst: 0,
        totalIgst: 0,
        totalCess: 0,
        totalTax: 0,
        finalTotal: 0,
        amountInWords: '',
      }
    }

    let sumTaxable = 0
    let sumCgst = 0
    let sumSgst = 0
    let sumUtgst = 0
    let sumIgst = 0
    let sumCess = 0

    const normalizedItems = invoice.items.map((item: any) => {
      const qty = Number(item.quantity || 0)
      const rate = Number(item.unitPrice || 0)
      const discount = Number(item.discountAmount || 0)

      // Base Taxable = (Qty * Rate) - Discount
      let taxable = qty > 0 && rate > 0 ? qty * rate - discount : Number(item.taxableValue || 0)

      const isIntra = invoice.supplyType === 'INTRA_STATE'
      const gstRate = Number(item.gstRate || (isIntra ? (Number(item.cgstRate || 0) + Number(item.sgstRate || 0)) : Number(item.igstRate || 0)))

      let cgst = Number(item.cgstAmount || 0)
      let sgst = Number(item.sgstAmount || 0)
      let utgst = Number(item.utgstAmount || 0)
      let igst = Number(item.igstAmount || 0)
      let cess = Number(item.cessAmount || 0)

      // If item taxes are zero but gstRate exists, compute precisely
      if (cgst === 0 && sgst === 0 && igst === 0 && gstRate > 0) {
        const lineTax = (taxable * gstRate) / 100
        if (isIntra) {
          if (invoice.isUtgst) {
            utgst = Number((lineTax / 2).toFixed(2))
          } else {
            sgst = Number((lineTax / 2).toFixed(2))
          }
          cgst = Number((lineTax / 2).toFixed(2))
        } else {
          igst = Number(lineTax.toFixed(2))
        }
      }

      const totalItemTax = cgst + sgst + utgst + igst + cess
      const lineTotal = Number((taxable + totalItemTax).toFixed(2))

      sumTaxable += taxable
      sumCgst += cgst
      sumSgst += sgst
      sumUtgst += utgst
      sumIgst += igst
      sumCess += cess

      const isNumericUnit = !item.unit || /^\d+$/.test(String(item.unit).trim())
      const displayUnit = isNumericUnit ? '' : ` ${item.unit}`

      return {
        ...item,
        quantityFormatted: `${qty.toFixed(2)}${displayUnit}`,
        taxableValue: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        utgstAmount: utgst,
        igstAmount: igst,
        cessAmount: cess,
        lineTotal,
      }
    })

    const totalTax = sumCgst + sumSgst + sumUtgst + sumIgst + sumCess
    const roundOff = Number(invoice.roundOffAmount || 0)
    const finalTotal = Number((sumTaxable + totalTax + roundOff).toFixed(2))
    const amountInWords = numberToIndianWords(finalTotal)

    return {
      normalizedItems,
      totalTaxable: sumTaxable,
      totalCgst: sumCgst,
      totalSgst: sumSgst,
      totalUtgst: sumUtgst,
      totalIgst: sumIgst,
      totalCess: sumCess,
      totalTax,
      finalTotal,
      amountInWords,
    }
  }, [invoice])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" description="Loading Statutory Tax Invoice..." />
      </div>
    )
  }

  if (!invoice) {
    return <div style={{ padding: 40 }}>Invoice not found.</div>
  }

  return (
    <div className="printable-document" style={{ padding: 24, maxWidth: 1020, margin: '0 auto' }}>
      <style>{`
        @media print {
          @page {
            margin: 8mm 10mm;
            size: portrait;
          }
          .no-print {
            display: none !important;
          }
          .printable-document {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .ant-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .ant-card-body {
            padding: 0 !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        .gst-invoice-table th, .gst-invoice-table td {
          border: 1px solid #d9d9d9;
          font-variant-numeric: tabular-nums;
        }
        .gst-nowrap {
          white-space: nowrap !important;
        }
      `}</style>

      {/* Action Bar (Hidden during print) */}
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {invoice.isImmutableSnapshot && (
            <Tag color="green" icon={<LockOutlined />}>
              Immutable Tax Snapshot Verified
            </Tag>
          )}
          <Tag color="blue">{invoice.postingStatus || 'DRAFT'}</Tag>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Tax Invoice
          </Button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <Card
        bordered
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          borderRadius: 8,
          background: '#fff',
          padding: '20px 24px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header Title */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1890ff', paddingBottom: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#002766', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 22, fontWeight: 700 }}>
            TAX INVOICE
          </h2>
          <div style={{ fontSize: 11.5, color: '#595959', marginTop: 2 }}>
            (Issued under Rule 46 of the Central Goods and Services Tax Rules, 2017)
          </div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 6 }}>
            <Tag color="cyan" style={{ fontSize: 11 }}>Original for Recipient</Tag>
            <Tag style={{ fontSize: 11 }}>Duplicate for Transporter</Tag>
            <Tag style={{ fontSize: 11 }}>Triplicate for Supplier</Tag>
          </div>
        </div>

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

        {/* Top Grid: Supplier & Invoice Particulars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
          {/* Supplier (Issuer) Details */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, background: '#fafafa' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1f1f1f', marginBottom: 3 }}>
              {invoice.supplierTradeName || invoice.supplierLegalName || 'SUPPLIER NAME'}
            </div>
            {invoice.supplierTradeName && invoice.supplierLegalName !== invoice.supplierTradeName && (
              <div style={{ fontSize: 11.5, color: '#8c8c8c' }}>Legal: {invoice.supplierLegalName}</div>
            )}
            <div style={{ fontSize: 11.5, color: '#595959', marginTop: 3 }}>{invoice.supplierAddress || 'Address'}</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>
              <strong>GSTIN:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{invoice.supplierGstin || 'N/A'}</span>
            </div>
            <div style={{ fontSize: 11.5 }}>
              <strong>State & Code:</strong> {invoice.supplierStateName || 'Maharashtra'} ({invoice.supplierStateCode || '27'})
            </div>
            {invoice.supplierPan && (
              <div style={{ fontSize: 11.5 }}>
                <strong>PAN:</strong> {invoice.supplierPan}
              </div>
            )}
          </div>

          {/* Invoice Particulars */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c' }}>Invoice Number:</span>
              <strong style={{ fontSize: 13, color: '#1677ff', fontFamily: 'monospace' }}>
                {invoice.invoiceNumber || 'DRAFT'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c' }}>Invoice Date:</span>
              <strong>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c' }}>Place of Supply (POS):</span>
              <strong>
                {invoice.posStateName || 'Maharashtra'} ({invoice.posStateCode || '27'})
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c' }}>Supply Type:</span>
              <strong>{invoice.supplyType || 'INTRA_STATE'} {invoice.isUtgst ? '(UTGST)' : ''}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c' }}>Reverse Charge (RCM):</span>
              <strong>{invoice.isRcm ? 'YES (Recipient liable to pay tax)' : 'NO'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#8c8c8c' }}>Classification:</span>
              <Tag color="blue" style={{ margin: 0 }}>{invoice.transactionClassification || 'B2B'}</Tag>
            </div>
          </div>
        </div>

        {/* Middle Grid: Bill To & Ship To Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Bill To */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: '#002766', borderBottom: '1px solid #f0f0f0', paddingBottom: 4, marginBottom: 6 }}>
              Details of Receiver / Billed To:
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.customerTradeName || invoice.customerLegalName || 'Cash Customer'}</div>
            <div style={{ fontSize: 11.5, color: '#595959', marginTop: 2 }}>{invoice.billingAddress || 'N/A'}</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>
              <strong>GSTIN / UIN:</strong>{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{invoice.customerGstin || 'UNREGISTERED'}</span>
            </div>
            <div style={{ fontSize: 11.5 }}>
              <strong>State & Code:</strong> {invoice.customerStateName || invoice.posStateName || 'Maharashtra'} ({invoice.customerStateCode || invoice.posStateCode || '27'})
            </div>
          </div>

          {/* Ship To */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: '#002766', borderBottom: '1px solid #f0f0f0', paddingBottom: 4, marginBottom: 6 }}>
              Details of Consignee / Shipped To:
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.customerTradeName || invoice.customerLegalName || 'Same as Billed To'}</div>
            <div style={{ fontSize: 11.5, color: '#595959', marginTop: 2 }}>{invoice.shippingAddress || invoice.billingAddress || 'N/A'}</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>
              <strong>Delivery State:</strong> {invoice.posStateName || 'Maharashtra'} ({invoice.posStateCode || '27'})
            </div>
          </div>
        </div>

        {/* Special Export / SEZ Declarations */}
        {invoice.statutoryDeclaration && (
          <div
            style={{
              padding: '6px 12px',
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              color: '#d46b08',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            {invoice.statutoryDeclaration}
          </div>
        )}

        {/* Itemized Table */}
        <table className="gst-invoice-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px 4px', textAlign: 'center', width: 32 }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Description</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', width: 75 }} className="gst-nowrap">HSN/SAC</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', width: 70 }} className="gst-nowrap">Qty</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', width: 85 }} className="gst-nowrap">Rate (₹)</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', width: 100 }} className="gst-nowrap">Taxable (₹)</th>
              {invoice.supplyType === 'INTRA_STATE' ? (
                <>
                  <th style={{ padding: '6px 6px', textAlign: 'right', width: 90 }} className="gst-nowrap">CGST (₹)</th>
                  <th style={{ padding: '6px 6px', textAlign: 'right', width: 90 }} className="gst-nowrap">
                    {invoice.isUtgst ? 'UTGST (₹)' : 'SGST (₹)'}
                  </th>
                </>
              ) : (
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 95 }} className="gst-nowrap">IGST (₹)</th>
              )}
              {Number(calculatedData.totalCess) > 0 && (
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 75 }} className="gst-nowrap">Cess (₹)</th>
              )}
              <th style={{ padding: '6px 8px', textAlign: 'right', width: 105 }} className="gst-nowrap">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {calculatedData.normalizedItems.map((item: any, idx: number) => {
              return (
                <tr key={idx} style={{ background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{item.serialNumber || idx + 1}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <strong style={{ color: '#262626' }}>{item.materialName || 'Item'}</strong>
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }} className="gst-nowrap">
                    {item.hsnSacCode || '-'}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                    {item.quantityFormatted}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                    {formatINR(item.unitPrice)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 500 }} className="gst-nowrap">
                    {formatINR(item.taxableValue)}
                  </td>
                  {invoice.supplyType === 'INTRA_STATE' ? (
                    <>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                        <div>{formatINR(item.cgstAmount)}</div>
                        <div style={{ fontSize: 9.5, color: '#8c8c8c' }}>@{Number(item.cgstRate || 0)}%</div>
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                        <div>{formatINR(invoice.isUtgst ? item.utgstAmount : item.sgstAmount)}</div>
                        <div style={{ fontSize: 9.5, color: '#8c8c8c' }}>
                          @{Number(invoice.isUtgst ? item.utgstRate : item.sgstRate || 0)}%
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                      <div>{formatINR(item.igstAmount)}</div>
                      <div style={{ fontSize: 9.5, color: '#8c8c8c' }}>@{Number(item.igstRate || 0)}%</div>
                    </td>
                  )}
                  {Number(calculatedData.totalCess) > 0 && (
                    <td style={{ padding: '5px 6px', textAlign: 'right' }} className="gst-nowrap">
                      {formatINR(item.cessAmount)}
                    </td>
                  )}
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }} className="gst-nowrap">
                    {formatINR(item.lineTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals & Summary Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Amount in Words & Notes */}
          <div>
            <div style={{ fontSize: 11.5, color: '#8c8c8c', marginBottom: 4 }}>Total Amount in Words:</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#002766', padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
              {calculatedData.amountInWords}
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: '#8c8c8c', lineHeight: 1.5 }}>
              <strong>Statutory Terms:</strong>
              <div>1. Goods once sold will not be taken back or exchanged.</div>
              <div>2. Certified that the particulars given above are true and correct.</div>
            </div>
          </div>

          {/* Numerical Totals */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span>Total Taxable Value:</span>
              <strong className="gst-nowrap">{formatINR(calculatedData.totalTaxable)}</strong>
            </div>
            {invoice.supplyType === 'INTRA_STATE' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Total CGST:</span>
                  <span className="gst-nowrap">{formatINR(calculatedData.totalCgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{invoice.isUtgst ? 'Total UTGST:' : 'Total SGST:'}</span>
                  <span className="gst-nowrap">{formatINR(invoice.isUtgst ? calculatedData.totalUtgst : calculatedData.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Total IGST:</span>
                <span className="gst-nowrap">{formatINR(calculatedData.totalIgst)}</span>
              </div>
            )}
            {Number(calculatedData.totalCess) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Total Cess:</span>
                <span className="gst-nowrap">{formatINR(calculatedData.totalCess)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, borderTop: '1px dashed #d9d9d9', paddingTop: 4 }}>
              <span>Total Tax:</span>
              <strong className="gst-nowrap">{formatINR(calculatedData.totalTax)}</strong>
            </div>
            {Number(invoice.roundOffAmount) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span>Section 170 Round-off:</span>
                <span className="gst-nowrap">{formatINR(invoice.roundOffAmount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#002766',
                borderTop: '2px solid #1890ff',
                paddingTop: 6,
              }}
            >
              <span>Invoice Total:</span>
              <span className="gst-nowrap">{formatINR(calculatedData.finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer: Signatory Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            <div>This is a computer-generated tax invoice.</div>
            {invoice.isImmutableSnapshot && invoice.deterministicCalculationId && (
              <div style={{ fontSize: 10, color: '#52c41a', marginTop: 2 }}>
                ✓ Verified Statutory Tax Calculation Record
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', width: 220 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 36 }}>
              For {invoice.supplierTradeName || invoice.supplierLegalName || 'Company'}
            </div>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 11.5, fontWeight: 500 }}>
              Authorized Signatory
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
