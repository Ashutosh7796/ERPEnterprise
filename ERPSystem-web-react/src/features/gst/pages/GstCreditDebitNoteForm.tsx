import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Table, Space, Tag, InputNumber, Row, Col, Typography, message, Modal, Switch, Divider, Steps, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, PrinterOutlined, CheckCircleOutlined, CloseCircleOutlined, CalculatorOutlined, ArrowLeftOutlined, ThunderboltOutlined, SendOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import type { GSTTaxCalculationResult } from '../types'
import { formatCurrency, formatIndianDate } from '@shared/utils/indianTax'

const { Option } = Select
const { Title, Text } = Typography

interface NoteLineItem {
  key: string
  originalDepotItemId?: number
  materialId?: number
  materialName?: string
  hsnSacCode?: string
  unit?: string
  originalQuantity?: number
  alreadyAdjustedQuantity?: number
  remainingQuantity?: number
  adjustedQuantity: number
  originalUnitPrice?: number
  adjustedUnitPrice: number
  adjustedTaxableValue?: number
}

export const GstCreditDebitNoteForm: React.FC<{
  noteId?: number
  onBack?: () => void
  onPrint?: (id: number) => void
}> = ({
  noteId: propNoteId,
  onBack: propOnBack,
  onPrint: propOnPrint,
}) => {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const routeNoteId = params.id ? Number(params.id) : undefined
  const queryInvoiceId = searchParams.get('invoiceId') ? Number(searchParams.get('invoiceId')) : undefined
  const noteId = propNoteId || routeNoteId

  const [form] = Form.useForm()
  const [activeNoteId, setActiveNoteId] = useState<number | undefined>(noteId)
  const [noteType, setNoteType] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE'>('CREDIT_NOTE')
  const [isPhysicalReturn, setIsPhysicalReturn] = useState<boolean>(true)
  const [items, setItems] = useState<NoteLineItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [taxPreview, setTaxPreview] = useState<GSTTaxCalculationResult | null>(null)
  const [currentPostingStatus, setCurrentPostingStatus] = useState<string>('DRAFT')
  const [docNumber, setDocNumber] = useState<string>('')
  const [invoices, setInvoices] = useState<any[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)

  const showErrorModal = (title: string, content: string) => {
    Modal.error({
      title,
      content,
      centered: true,
      okText: 'Understood',
      width: 480,
    })
  }

  const showSuccessModal = (title: string, content: string) => {
    Modal.success({
      title,
      content,
      centered: true,
      okText: 'OK',
      width: 480,
    })
  }

  const getStepCurrent = () => {
    switch (currentPostingStatus) {
      case 'DRAFT': return 0
      case 'VALIDATED': return 1
      case 'APPROVED': return 1
      case 'POSTED': return 2
      case 'TAX_VALIDATED': return 2
      case 'FINALIZED': return 3
      case 'CANCELLED': return -1
      default: return 0
    }
  }

  const handleDirectPostAndFinalize = async () => {
    let currentId = activeNoteId || noteId
    try {
      if (!currentId) {
        // Automatically save draft first
        const values = await form.validateFields()
        const payload = {
          tenantId: undefined,
          id: undefined,
          noteType,
          originalInvoiceId: values.originalInvoiceId,
          customerId: values.customerId,
          posStateCode: values.posStateCode || '27',
          reasonCode: values.reasonCode,
          isPhysicalReturn,
          remark: values.remark,
          items: items.map((it) => ({
            originalDepotItemId: it.originalDepotItemId,
            materialId: it.materialId,
            materialName: it.materialName,
            hsnSacCode: it.hsnSacCode || '841370',
            adjustedQuantity: it.adjustedQuantity,
            adjustedUnitPrice: it.adjustedUnitPrice,
            adjustedTaxableValue: it.adjustedQuantity * it.adjustedUnitPrice,
            unit: it.unit || 'NOS',
          })),
        }
        const saveRes = await gstApi.createOrUpdateNote(payload)
        if (saveRes.code === 200 && saveRes.data) {
          currentId = saveRes.data.id
          setActiveNoteId(currentId)
          setDocNumber(saveRes.data.number)
        } else {
          showErrorModal('Save Required', 'Failed to generate note record before posting.')
          return
        }
      }

      Modal.confirm({
        title: 'Approve, Post & Finalize Note?',
        centered: true,
        content: `This will execute statutory Rule 53 validation, persist immutable tax ledger snapshots, and finalize Note [${docNumber || currentId}].`,
        okText: 'Post & Finalize',
        onOk: async () => {
          try {
            const validId = currentId as number
            setLoading(true)
            await gstApi.transitionNote({ noteId: validId, targetStatus: 'VALIDATED', reason: 'Statutory validation' }).catch(() => null)
            await gstApi.transitionNote({ noteId: validId, targetStatus: 'APPROVED', reason: 'Management approval' }).catch(() => null)
            await gstApi.transitionNote({ noteId: validId, targetStatus: 'POSTED', reason: 'Stock & tax ledger posting' }).catch(() => null)
            await gstApi.transitionNote({ noteId: validId, targetStatus: 'TAX_VALIDATED', reason: 'Snapshot verification' }).catch(() => null)
            const finalRes = await gstApi.transitionNote({ noteId: validId, targetStatus: 'FINALIZED', reason: 'Statutory lock' })

            if (finalRes.code === 200) {
              showSuccessModal('Note Finalized & Immutable', `Note [${docNumber || validId}] has been successfully approved, posted, and finalized.`)
              loadNoteDetails(validId)
            }
          } catch (err: any) {
            showErrorModal('Posting Process Notice', err?.message || 'Status transition notice.')
            if (currentId) loadNoteDetails(currentId)
          } finally {
            setLoading(false)
          }
        },
      })
    } catch (e: any) {
      showErrorModal('Validation Error', e?.message || 'Please fill in all required statutory fields.')
    }
  }
  const [eligibleInvoices, setEligibleInvoices] = useState<any[]>([])

  useEffect(() => {
    loadEligibleInvoices()
    const target = activeNoteId || noteId
    if (target) {
      loadNoteDetails(target)
    }
  }, [noteId])

  useEffect(() => {
    if (queryInvoiceId && !noteId && !form.getFieldValue('originalInvoiceId')) {
      form.setFieldsValue({ originalInvoiceId: queryInvoiceId })
      handleInvoiceSelect(queryInvoiceId)
    }
  }, [queryInvoiceId, noteId, eligibleInvoices])

  const loadEligibleInvoices = async () => {
    try {
      const res = await gstApi.getAdjustableInvoices()
      if (res.code === 200 && res.data) {
        setEligibleInvoices(res.data)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  const loadNoteDetails = async (id: number) => {
    setLoading(true)
    try {
      const res = await gstApi.getRule53Note(id)
      if (res.code === 200 && res.data) {
        const d = res.data
        setActiveNoteId(id)
        setDocNumber(d.noteNumber)
        setCurrentPostingStatus(d.postingStatus || 'DRAFT')
        setNoteType(d.noteType || 'CREDIT_NOTE')
        setIsPhysicalReturn(d.isPhysicalReturn !== false)
        form.setFieldsValue({
          noteType: d.noteType,
          originalInvoiceId: d.originalInvoiceId,
          originalInvoiceNumber: d.originalInvoiceNumber,
          customerId: d.customerId,
          posStateCode: d.posStateCode,
          reasonCode: d.reasonCode,
          isPhysicalReturn: d.isPhysicalReturn,
          remark: d.remark,
        })
        if (d.items) {
          setItems(
            d.items.map((it: any, idx: number) => ({
              key: `line_${idx}`,
              originalDepotItemId: it.originalDepotItemId,
              materialId: it.materialId,
              materialName: it.materialName,
              hsnSacCode: it.hsnSacCode,
              unit: it.unit || 'NOS',
              originalQuantity: it.originalQuantity,
              adjustedQuantity: it.adjustedQuantity,
              originalUnitPrice: it.originalUnitPrice,
              adjustedUnitPrice: it.adjustedUnitPrice,
              adjustedTaxableValue: it.taxableValue,
            }))
          )
        }
      }
    } catch (e: any) {
      showErrorModal('Failed to Load Note', e?.message || 'Note details could not be retrieved.')
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceSelect = async (invoiceId: number) => {
    const selectedInv = eligibleInvoices.find((inv) => inv.id === invoiceId)
    if (selectedInv) {
      form.setFieldsValue({
        originalInvoiceNumber: selectedInv.invoiceNumber,
        customerId: selectedInv.customerId,
        posStateCode: selectedInv.posStateCode || '27',
      })
      try {
        const res = await gstApi.getAdjustableLines({ originalInvoiceId: invoiceId, excludeNoteId: activeNoteId || noteId })
        if (res.code === 200 && res.data) {
          const loadedLines: NoteLineItem[] = res.data.map((l: any, idx: number) => ({
            key: `line_${idx}`,
            originalDepotItemId: l.depotItemId,
            materialId: l.materialId,
            materialName: l.materialName,
            hsnSacCode: l.hsnSacCode,
            unit: l.unit || 'NOS',
            originalQuantity: l.originalQuantity,
            alreadyAdjustedQuantity: l.alreadyAdjustedQuantity,
            remainingQuantity: l.remainingQuantity,
            adjustedQuantity: l.remainingQuantity > 0 ? l.remainingQuantity : 0,
            originalUnitPrice: l.unitPrice,
            adjustedUnitPrice: l.unitPrice,
            adjustedTaxableValue: l.remainingTaxableValue,
          }))
          setItems(loadedLines)
        }
      } catch (e: any) {
        showErrorModal('Line Items Error', 'Failed to load invoice line items.')
      }
    }
  }

  const handleCalculatePreview = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        tenantId: 63,
        id: activeNoteId || noteId,
        noteType,
        originalInvoiceId: values.originalInvoiceId,
        customerId: values.customerId,
        posStateCode: values.posStateCode || '27',
        reasonCode: values.reasonCode,
        isPhysicalReturn,
        remark: values.remark,
        items: items.map((it) => ({
          originalDepotItemId: it.originalDepotItemId,
          materialId: it.materialId,
          materialName: it.materialName,
          hsnSacCode: it.hsnSacCode || '841370',
          adjustedQuantity: it.adjustedQuantity,
          adjustedUnitPrice: it.adjustedUnitPrice,
          adjustedTaxableValue: it.adjustedQuantity * it.adjustedUnitPrice,
          unit: it.unit || 'NOS',
        })),
      }
      const res = await gstApi.previewNoteTax(payload)
      if (res.code === 200 && res.data) {
        setTaxPreview(res.data)
        showSuccessModal('Tax Preview Calculated', 'Live statutory GST calculation breakdown has been computed successfully.')
      }
    } catch (e: any) {
      showErrorModal('Tax Preview Notice', e?.message || 'Tax calculation could not be completed.')
    }
  }

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        tenantId: 63,
        id: activeNoteId || noteId,
        noteType,
        originalInvoiceId: values.originalInvoiceId,
        customerId: values.customerId,
        posStateCode: values.posStateCode || '27',
        reasonCode: values.reasonCode,
        isPhysicalReturn,
        remark: values.remark,
        items: items.map((it) => ({
          originalDepotItemId: it.originalDepotItemId,
          materialId: it.materialId,
          materialName: it.materialName,
          hsnSacCode: it.hsnSacCode || '841370',
          adjustedQuantity: it.adjustedQuantity,
          adjustedUnitPrice: it.adjustedUnitPrice,
          adjustedTaxableValue: it.adjustedQuantity * it.adjustedUnitPrice,
          unit: it.unit || 'NOS',
        })),
      }
      const res = await gstApi.createOrUpdateNote(payload)
      if (res.code === 200 && res.data) {
        const savedId = res.data.id
        setActiveNoteId(savedId)
        setDocNumber(res.data.number)
        setCurrentPostingStatus(res.data.postingStatus || 'DRAFT')
        showSuccessModal('Draft Saved Successfully', `GST Credit / Debit Note [${res.data.number || savedId}] has been saved in DRAFT status. You can now Validate or Post.`)
        if (savedId) {
          loadNoteDetails(savedId)
        }
      }
    } catch (e: any) {
      showErrorModal('Save Failed', e?.message || 'Failed to save note draft.')
    }
  }

  const handleStateTransition = async (targetStatus: string, actionLabel: string) => {
    const currentId = activeNoteId || noteId
    if (!currentId) {
      showErrorModal('Action Required', 'Please click "Save Draft" first before executing workflow transitions.')
      return
    }
    Modal.confirm({
      title: `Execute ${actionLabel}?`,
      centered: true,
      content: `Transition ${docNumber || 'Note'} to status [${targetStatus}]?`,
      onOk: async () => {
        try {
          const res = await gstApi.transitionNote({ noteId: currentId, targetStatus, reason: `Action: ${actionLabel}` })
          if (res.code === 200) {
            showSuccessModal('Status Updated', `Note transitioned to [${targetStatus}] successfully!`)
            loadNoteDetails(currentId)
          }
        } catch (e: any) {
          showErrorModal('Transition Failed', e?.message || 'Status transition failed.')
        }
      },
    })
  }

  const isLocked = ['POSTED', 'TAX_VALIDATED', 'FINALIZED', 'CANCELLED'].includes(currentPostingStatus)

  const columns = [
    {
      title: 'Item / Material',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (text: string, record: NoteLineItem) => (
        <div>
          <Text strong>{text || 'Item'}</Text>
          <div style={{ fontSize: 12, color: '#888' }}>HSN: {record.hsnSacCode || '841370'}</div>
        </div>
      ),
    },
    {
      title: 'Original Qty',
      dataIndex: 'originalQuantity',
      key: 'originalQuantity',
      render: (val: number) => val || '-',
    },
    {
      title: 'Remaining Qty',
      dataIndex: 'remainingQuantity',
      key: 'remainingQuantity',
      render: (val: number) => <Tag color={val > 0 ? 'green' : 'orange'}>{val !== undefined ? val : '-'}</Tag>,
    },
    {
      title: 'Adjusted Qty',
      dataIndex: 'adjustedQuantity',
      key: 'adjustedQuantity',
      render: (val: number, record: NoteLineItem) => (
        <InputNumber
          disabled={isLocked}
          min={0.01}
          max={record.remainingQuantity || 999999}
          value={val}
          onChange={(v) => {
            setItems(items.map((it) => (it.key === record.key ? { ...it, adjustedQuantity: v || 0 } : it)))
          }}
        />
      ),
    },
    {
      title: 'Unit Price (₹)',
      dataIndex: 'adjustedUnitPrice',
      key: 'adjustedUnitPrice',
      render: (val: number, record: NoteLineItem) => (
        <InputNumber
          disabled={isLocked}
          min={0}
          value={val}
          onChange={(v) => {
            setItems(items.map((it) => (it.key === record.key ? { ...it, adjustedUnitPrice: v || 0 } : it)))
          }}
        />
      ),
    },
    {
      title: 'Taxable Value (₹)',
      key: 'taxableValue',
      render: (_: any, record: NoteLineItem) => formatCurrency(record.adjustedQuantity * record.adjustedUnitPrice),
    },
  ]

  const handleBack = () => {
    if (propOnBack) {
      propOnBack()
    } else {
      navigate('/sales/invoices')
    }
  }

  const handlePrint = (id: number) => {
    if (propOnPrint) {
      propOnPrint(id)
    } else {
      navigate(`/sales/${noteType === 'DEBIT_NOTE' ? 'debit_notes' : 'credit_notes'}/${id}/print`)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {noteType === 'CREDIT_NOTE' ? 'GST Credit Note (Section 34 & Rule 53)' : 'GST Debit Note (Section 34 & Rule 53)'}
          </Title>
          {docNumber && <Tag color="blue">{docNumber}</Tag>}
          <Tag color={currentPostingStatus === 'POSTED' ? 'green' : currentPostingStatus === 'CANCELLED' ? 'red' : 'gold'}>
            {currentPostingStatus}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          {(activeNoteId || noteId) && (
            <Button icon={<PrinterOutlined />} onClick={() => handlePrint((activeNoteId || noteId)!)}>
              Print Rule 53 Note
            </Button>
          )}
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ noteType: 'CREDIT_NOTE', isPhysicalReturn: true }}>
        <Steps
          current={getStepCurrent()}
          size="small"
          style={{ marginBottom: 20, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}
          items={[
            { title: 'Draft Note', description: 'Adjustment Entry' },
            { title: 'Validation & Approval', description: 'Rule 53 Pre-Checks' },
            { title: 'Tax & Ledger Post', description: 'Immutable Snapshot' },
            { title: 'Finalized', description: 'Audit Ready' },
          ]}
        />

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="noteType" label="Note Type" rules={[{ required: true }]}>
              <Select
                disabled={isLocked || !!noteId}
                onChange={(val: 'CREDIT_NOTE' | 'DEBIT_NOTE') => setNoteType(val)}
              >
                <Option value="CREDIT_NOTE">Credit Note (Value / Tax Reduction)</Option>
                <Option value="DEBIT_NOTE">Debit Note (Value / Tax Addition)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="originalInvoiceId" label="Original Sales Invoice Linkage" rules={[{ required: true }]}>
              <Select
                disabled={isLocked || !!noteId}
                placeholder="Search posted sales invoice..."
                showSearch
                optionFilterProp="children"
                onChange={handleInvoiceSelect}
              >
                {eligibleInvoices.map((inv) => (
                  <Option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.customerName} ({formatCurrency(inv.remainingTotal)} eligible)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="reasonCode" label="Statutory Reason Code (Section 34)" rules={[{ required: true }]}>
              <Select disabled={isLocked}>
                <Option value="01_SALES_RETURN">01 - Sales Return / Goods Return</Option>
                <Option value="02_POST_SALE_DISCOUNT">02 - Post Sale Discount</Option>
                <Option value="03_DEFICIENCY_IN_SERVICE">03 - Deficiency in Services</Option>
                <Option value="04_CORRECTION_IN_INVOICE">04 - Correction in Invoice / Price Reduction</Option>
                <Option value="05_CHANGE_IN_POS">05 - Change in Place of Supply (POS)</Option>
                <Option value="06_PROVISIONAL_ASSESSMENT">06 - Finalization of Provisional Assessment</Option>
                <Option value="07_OTHER">07 - Other Statutory Adjustment</Option>
                <Option value="08_PRICE_INCREASE">08 - Increase in Price / Rate (Debit Note)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Physical Goods Return (Restore Stock)" valuePropName="checked">
              <Switch
                disabled={isLocked}
                checked={isPhysicalReturn}
                onChange={(checked) => setIsPhysicalReturn(checked)}
              />
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item name="remark" label="Adjustment Remarks / Statutory Description">
              <Input disabled={isLocked} placeholder="Specify adjustment particulars..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Adjustment Line Items</Divider>

        <Table dataSource={items} columns={columns} pagination={false} rowKey="key" size="small" />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button icon={<CalculatorOutlined />} onClick={handleCalculatePreview} type="dashed">
              Live Statutory Tax Preview
            </Button>
            {!isLocked && (
              <>
                <Button onClick={handleSaveDraft} loading={loading}>
                  Save Draft
                </Button>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  style={{ background: '#722ed1' }}
                  onClick={handleDirectPostAndFinalize}
                  loading={loading}
                >
                  Post & Finalize Note
                </Button>
              </>
            )}
          </Space>
        </div>

        {taxPreview && (
          <Card size="small" title="Statutory GST Calculation Breakdown" style={{ marginTop: 16, background: '#fafafa' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Text type="secondary">Taxable Value:</Text>
                <div>
                  <Text strong>{formatCurrency(taxPreview.totalTaxableValue)}</Text>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary">CGST + SGST / IGST:</Text>
                <div>
                  <Text strong>{formatCurrency(taxPreview.totalTaxAmount)}</Text>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Supply Classification:</Text>
                <div>
                  <Tag color="blue">{taxPreview.supplyType}</Tag>
                  <Tag>{taxPreview.posStateName} ({taxPreview.posStateCode})</Tag>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Final Adjustment Total:</Text>
                <div>
                  <Title level={4} style={{ color: '#1677ff', margin: 0 }}>
                    {formatCurrency(taxPreview.finalInvoiceTotal)}
                  </Title>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary">Document Lifecycle Status:</Text>
            <Tag style={{ marginLeft: 8 }} color={currentPostingStatus === 'FINALIZED' ? 'green' : currentPostingStatus === 'POSTED' ? 'blue' : 'purple'}>
              {currentPostingStatus}
            </Tag>
          </div>
          <Space>
            {currentPostingStatus === 'DRAFT' && (
              <Button icon={<SendOutlined />} onClick={() => handleStateTransition('VALIDATED', 'Submit for Approval')}>
                Submit for Approval
              </Button>
            )}
            {currentPostingStatus === 'VALIDATED' && (
              <>
                <Button onClick={() => handleStateTransition('DRAFT', 'Revert to Draft')}>
                  Revert to Draft
                </Button>
                <Button type="primary" icon={<ThunderboltOutlined />} style={{ background: '#52c41a' }} onClick={handleDirectPostAndFinalize}>
                  Approve & Post Note
                </Button>
              </>
            )}
            {currentPostingStatus === 'APPROVED' && (
              <Button type="primary" style={{ background: '#52c41a' }} onClick={() => handleStateTransition('POSTED', 'Post Note')}>
                Post & Persist Snapshot
              </Button>
            )}
            {(currentPostingStatus === 'POSTED' || currentPostingStatus === 'TAX_VALIDATED') && (
              <Button type="primary" style={{ background: '#1677ff' }} onClick={() => handleStateTransition('FINALIZED', 'Finalize')}>
                Finalize Note
              </Button>
            )}
            {!isLocked && (
              <Button danger onClick={() => handleStateTransition('CANCELLED', 'Cancel Note')}>
                Cancel Note
              </Button>
            )}
          </Space>
        </div>
      </Form>
    </Card>
  )
}
