import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Table,
  InputNumber,
  Row,
  Col,
  Tag,
  Space,
  Modal,
  Alert,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  CalculatorOutlined,
  PrinterOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { gstApi } from '../api/gstApi'
import { formatINR } from '@shared/utils/indianTax'

interface InvoiceItem {
  key: number
  materialId?: number | null
  materialName: string
  hsnSacCode: string
  quantity: number
  unit: string
  unitPrice: number
  discountRate: number
  gstRate: number
  taxableValue?: number
  gstAmount?: number
  lineTotal?: number
}

export const GstSalesInvoiceForm: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [currentId, setCurrentId] = useState<number | undefined>(id ? Number(id) : undefined)
  const [loading, setLoading] = useState(false)
  const [companyGstins, setCompanyGstins] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stateCodes, setStateCodes] = useState<any[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      key: 1,
      materialId: null,
      materialName: '',
      hsnSacCode: '847330',
      quantity: 1,
      unitPrice: 0,
      discountRate: 0,
      gstRate: 18,
      unit: 'NOS',
    },
  ])
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [invoiceStatus, setInvoiceStatus] = useState<string>('DRAFT')

  // Centered Alert Dialog Helpers
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
      okText: 'Great',
      width: 480,
    })
  }

  useEffect(() => {
    loadMeta()
    if (id) {
      loadExistingInvoice(Number(id))
    }
  }, [id])

  const loadMeta = async () => {
    try {
      const [metaRes, statesRes, gstinsRes, custRes, matRes] = await Promise.all([
        gstApi.getGstMeta().catch(() => null),
        gstApi.getAllStateCodes().catch(() => null),
        gstApi.getAllCompanyGstins().catch(() => null),
        http.get<any>('/supplier/findBySelect_cus').catch(() => null),
        http.get<any>('/material/findBySelect', { params: { page: 1, rows: 200 } }).catch(() => null),
      ])

      if (statesRes?.code === 200) {
        setStateCodes(statesRes.data.list || [])
      }
      if (gstinsRes?.code === 200) {
        const rawList = gstinsRes.data.list || []
        const uniqueGstins = Array.from(
          new Map(rawList.map((g: any) => [g.gstin, g])).values()
        )
        setCompanyGstins(uniqueGstins)
        const defaultG = uniqueGstins.find((g: any) => g.isDefault) || uniqueGstins[0]
        if (defaultG && !form.getFieldValue('companyGstinId')) {
          form.setFieldsValue({ companyGstinId: defaultG.id })
        }
      }
      if (custRes) {
        let custList = Array.isArray(custRes) ? custRes : custRes?.data || []
        // Add walk-in option if not present
        if (!custList.some((c: any) => c.supplier?.toLowerCase().includes('walk-in'))) {
          custList = [
            { id: 999999, supplier: 'Walk-in Retail Counter (Unregistered B2C)', taxNum: '', address: 'Counter Retail Sale' },
            ...custList,
          ]
        }
        setCustomers(custList)
      }
      if (matRes) {
        let matList: any[] = []
        if (Array.isArray(matRes)) matList = matRes
        else if (Array.isArray(matRes?.data?.rows)) matList = matRes.data.rows
        else if (Array.isArray(matRes?.data)) matList = matRes.data
        setProducts(matList)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  const loadExistingInvoice = async (invoiceId: number) => {
    setLoading(true)
    try {
      const res = await gstApi.getRule46Invoice(invoiceId)
      if (res.code === 200 && res.data) {
        const inv = res.data
        setCurrentId(invoiceId)
        setInvoiceStatus(inv.postingStatus || 'DRAFT')
        form.setFieldsValue({
          companyGstinId: inv.companyGstinId,
          customerId: inv.customerId,
          customerGstin: inv.customerGstin,
          posStateCode: inv.posStateCode,
          invoiceDate: inv.invoiceDate ? dayjs(inv.invoiceDate) : dayjs(),
          exportType: inv.exportType || 'N_A',
          lutBondNumber: inv.lutBondNumber,
          isRcm: inv.isRcm || false,
          remark: inv.remark,
        })
        if (inv.items && inv.items.length > 0) {
          const loadedItems = inv.items.map((it: any, index: number) => ({
            key: index + 1,
            materialId: it.materialId,
            materialName: it.materialName,
            hsnSacCode: it.hsnSacCode || '847330',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountRate: it.discountRate || 0,
            gstRate: it.gstRate !== undefined ? Number(it.gstRate) : 18,
            unit: it.unit || 'NOS',
          }))
          setItems(loadedItems)
          handleCalculatePreview(loadedItems, {
            companyGstinId: inv.companyGstinId,
            customerId: inv.customerId,
            customerGstin: inv.customerGstin,
            posStateCode: inv.posStateCode,
            exportType: inv.exportType,
            lutBondNumber: inv.lutBondNumber,
            isRcm: inv.isRcm,
          })
        }
      }
    } catch (err: any) {
      showErrorModal('Failed to Load Invoice', err.message || 'Invoice record could not be fetched.')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSelect = (customerId: number) => {
    const selected = customers.find((c) => c.id === customerId)
    if (selected) {
      const gstin = (selected.taxNum || '').toUpperCase().trim()
      let pos = form.getFieldValue('posStateCode')
      if (gstin && gstin.length >= 2) {
        const stateCode = gstin.substring(0, 2)
        if (stateCodes.some((s) => s.stateCode === stateCode)) {
          pos = stateCode
        }
      } else {
        // Default to Supplier State (e.g. 27 Maharashtra) for Walk-in B2C
        const selGstin = companyGstins.find((g) => g.id === form.getFieldValue('companyGstinId'))
        pos = selGstin?.stateCode || '27'
      }
      form.setFieldsValue({
        customerId,
        customerGstin: gstin,
        posStateCode: pos,
      })
      handleCalculatePreview(items, { customerId, customerGstin: gstin, posStateCode: pos })
    }
  }

  const handleAddItem = () => {
    const newKey = items.length > 0 ? Math.max(...items.map((i) => i.key)) + 1 : 1
    const updated: InvoiceItem[] = [
      ...items,
      {
        key: newKey,
        materialId: null,
        materialName: '',
        hsnSacCode: '847330',
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        gstRate: 18,
        unit: 'NOS',
      },
    ]
    setItems(updated)
    handleCalculatePreview(updated)
  }

  const handleRemoveItem = (key: number) => {
    if (items.length === 1) {
      showErrorModal('Validation Warning', 'An invoice must contain at least one line item under GST Rule 46(g).')
      return
    }
    const updated = items.filter((i) => i.key !== key)
    setItems(updated)
    handleCalculatePreview(updated)
  }

  const handleItemChange = (key: number, field: keyof InvoiceItem, value: any) => {
    const updated = items.map((item) => {
      if (item.key === key) {
        if (field === 'materialId') {
          const prod = products.find((p) => p.id === value || p.meId === value)
          if (prod) {
            // Determine smart HSN based on product name
            let hsn = prod.otherField1 || item.hsnSacCode || '847330'
            const nameLower = (prod.name || '').toLowerCase()
            if (nameLower.includes('laptop') || nameLower.includes('workstation')) {
              hsn = '847130'
            } else if (nameLower.includes('ram') || nameLower.includes('memory') || nameLower.includes('motherboard')) {
              hsn = '847330'
            }

            return {
              ...item,
              materialId: prod.id || value,
              materialName: prod.name || item.materialName,
              hsnSacCode: hsn,
              unitPrice: prod.presetPriceOne || prod.purchaseDecimal || item.unitPrice || 0,
              unit: prod.unit || item.unit || 'NOS',
              gstRate: item.gstRate || 18,
            }
          }
        }
        return { ...item, [field]: value }
      }
      return item
    })
    setItems(updated)
    handleCalculatePreview(updated)
  }

  const handleCalculatePreview = async (customItems?: InvoiceItem[], customCustomerValues?: any) => {
    const currentItems = customItems || items
    const values = form.getFieldsValue()
    const customerId = customCustomerValues?.customerId !== undefined ? customCustomerValues.customerId : values.customerId
    const customerGstin = customCustomerValues?.customerGstin !== undefined ? customCustomerValues.customerGstin : values.customerGstin
    const posStateCode = customCustomerValues?.posStateCode !== undefined ? customCustomerValues.posStateCode : (values.posStateCode || '27')
    const exportType = customCustomerValues?.exportType !== undefined ? customCustomerValues.exportType : (values.exportType || 'N_A')
    const lutBondNumber = customCustomerValues?.lutBondNumber !== undefined ? customCustomerValues.lutBondNumber : values.lutBondNumber
    const isRcm = customCustomerValues?.isRcm !== undefined ? customCustomerValues.isRcm : (values.isRcm || false)

    const payload = {
      customerId: customerId === 999999 ? null : customerId,
      customerGstin,
      posStateCode,
      exportType,
      lutBondNumber,
      isRcm,
      invoiceDate: values.invoiceDate ? values.invoiceDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      items: currentItems.map((it) => ({
        materialId: it.materialId,
        materialName: it.materialName || 'Item',
        hsnSacCode: it.hsnSacCode || '847330',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discountRate: it.discountRate || 0,
        gstRate: it.gstRate !== undefined ? it.gstRate : 18,
        unit: it.unit || 'NOS',
      })),
    }

    try {
      const res = await gstApi.previewSalesInvoiceTax(payload)
      if (res.code === 200 && res.data) {
        setPreviewResult(res.data)
      }
    } catch (err: any) {
      console.warn('Tax preview recalculation notice', err)
    }
  }

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        id: currentId,
        companyGstinId: values.companyGstinId,
        customerId: values.customerId === 999999 ? null : values.customerId,
        customerGstin: values.customerGstin,
        posStateCode: values.posStateCode || '27',
        exportType: values.exportType || 'N_A',
        lutBondNumber: values.lutBondNumber,
        isRcm: values.isRcm || false,
        remark: values.remark,
        invoiceDate: values.invoiceDate ? values.invoiceDate.toDate() : new Date(),
        items: items.map((it) => ({
          materialId: it.materialId,
          materialName: it.materialName || 'Line Item',
          hsnSacCode: it.hsnSacCode || '847330',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          discountRate: it.discountRate || 0,
          gstRate: it.gstRate !== undefined ? it.gstRate : 18,
          unit: it.unit || 'NOS',
        })),
      }

      setLoading(true)
      const res = await gstApi.createOrUpdateSalesInvoice(payload)
      if (res.code === 200 && res.data) {
        const saved = res.data
        setCurrentId(saved.id)
        setInvoiceStatus(saved.postingStatus || 'DRAFT')
        showSuccessModal('Draft Saved Successfully', `GST Tax Invoice [${saved.number || saved.id}] has been saved in DRAFT status. You can now preview tax or post & freeze.`)
        handleCalculatePreview()
      } else {
        showErrorModal('Save Failed', res.data || 'Failed to save sales invoice draft.')
      }
    } catch (err: any) {
      showErrorModal('Validation Error', err.message || 'Please check required fields and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePostInvoice = async () => {
    const invoiceIdToPost = currentId || (id ? Number(id) : undefined)
    if (!invoiceIdToPost) {
      showErrorModal('Action Required', 'Please click "Save Draft" first before posting and freezing.')
      return
    }
    Modal.confirm({
      title: 'Confirm GST Tax Invoice Posting',
      centered: true,
      content: 'Posting this invoice will finalize and freeze an immutable statutory tax snapshot. Master data edits will no longer alter this document.',
      okText: 'Post & Freeze Document',
      okType: 'primary',
      onOk: async () => {
        try {
          setLoading(true)
          await gstApi.transitionSalesInvoice({ invoiceId: invoiceIdToPost, targetStatus: 'VALIDATED' })
          await gstApi.transitionSalesInvoice({ invoiceId: invoiceIdToPost, targetStatus: 'TAX_VALIDATED' })
          const res = await gstApi.transitionSalesInvoice({ invoiceId: invoiceIdToPost, targetStatus: 'POSTED' })
          if (res.code === 200) {
            showSuccessModal('Invoice Posted & Frozen', 'Invoice is now successfully POSTED with authoritative statutory tax snapshot!')
            setInvoiceStatus('POSTED')
          }
        } catch (err: any) {
          showErrorModal('Posting Failed', err.message || 'Invoice posting failed.')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const currentExportType = Form.useWatch('exportType', form) || 'N_A'
  const isZeroRated = currentExportType === 'SEZ_WITHOUT_PAYMENT' || currentExportType === 'EXPORT_WITHOUT_PAYMENT'
  const isImmutable = invoiceStatus === 'POSTED' || invoiceStatus === 'LOCKED'

  // Determine supply type locally for live table display
  const supplierGstinId = Form.useWatch('companyGstinId', form)
  const posStateCode = Form.useWatch('posStateCode', form) || '27'
  const supplierState = useMemo(() => {
    const found = companyGstins.find((g) => g.id === supplierGstinId)
    return found?.stateCode || '27'
  }, [supplierGstinId, companyGstins])

  const isIntraState = supplierState === posStateCode && !isZeroRated && currentExportType === 'N_A'

  const columns = [
    {
      title: '#',
      dataIndex: 'key',
      width: 45,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: 'Item / Material Description',
      dataIndex: 'materialName',
      width: 260,
      render: (text: string, record: InvoiceItem) => (
        <Space.Compact style={{ width: '100%' }}>
          {products.length > 0 && (
            <Select
              style={{ width: 140 }}
              placeholder="Pick Item"
              showSearch
              allowClear
              optionFilterProp="label"
              value={record.materialId}
              onChange={(val) => handleItemChange(record.key, 'materialId', val)}
              options={products.map((p) => ({
                label: `${p.name} ${p.mBarCode || p.barCode ? '(' + (p.mBarCode || p.barCode) + ')' : ''}`,
                value: p.id || p.meId,
              }))}
            />
          )}
          <Input
            value={text}
            placeholder="e.g. RAM DDR5 32GB 5600MHz"
            onChange={(e) => handleItemChange(record.key, 'materialName', e.target.value)}
          />
        </Space.Compact>
      ),
    },
    {
      title: 'HSN / SAC',
      dataIndex: 'hsnSacCode',
      width: 110,
      render: (text: string, record: InvoiceItem) => (
        <Input
          value={text}
          placeholder="847330"
          onChange={(e) => handleItemChange(record.key, 'hsnSacCode', e.target.value)}
        />
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 90,
      render: (value: number, record: InvoiceItem) => (
        <InputNumber
          min={0.01}
          value={value}
          onChange={(val) => handleItemChange(record.key, 'quantity', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      width: 85,
      render: (value: string, record: InvoiceItem) => (
        <Select
          value={value || 'NOS'}
          onChange={(val) => handleItemChange(record.key, 'unit', val)}
          options={[
            { label: 'NOS', value: 'NOS' },
            { label: 'PCS', value: 'PCS' },
            { label: 'SET', value: 'SET' },
            { label: 'BOX', value: 'BOX' },
            { label: 'KGS', value: 'KGS' },
            { label: 'MTR', value: 'MTR' },
          ]}
        />
      ),
    },
    {
      title: 'Unit Price (₹)',
      dataIndex: 'unitPrice',
      width: 120,
      render: (value: number, record: InvoiceItem) => (
        <InputNumber
          min={0}
          step={100}
          value={value}
          onChange={(val) => handleItemChange(record.key, 'unitPrice', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Disc %',
      dataIndex: 'discountRate',
      width: 80,
      render: (value: number, record: InvoiceItem) => (
        <InputNumber
          min={0}
          max={100}
          value={value}
          onChange={(val) => handleItemChange(record.key, 'discountRate', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Taxable Val (₹)',
      key: 'taxableVal',
      width: 130,
      render: (_: any, record: InvoiceItem) => {
        const gross = (record.quantity || 0) * (record.unitPrice || 0)
        const disc = gross * ((record.discountRate || 0) / 100)
        const taxable = Math.max(0, gross - disc)
        return <span style={{ fontWeight: 600 }}>₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      },
    },
    {
      title: (
        <span>
          GST Rate{' '}
          <Tooltip title="Line-level GST Rate (18%, 12%, 5%, 28% or 0% for Exempt/LUT)">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'gstRate',
      width: 130,
      render: (value: number, record: InvoiceItem) => {
        if (isZeroRated) {
          return <Tag color="orange">0% (Zero-Rated LUT)</Tag>
        }
        return (
          <Select
            value={value !== undefined ? value : 18}
            onChange={(val) => handleItemChange(record.key, 'gstRate', val)}
            style={{ width: '100%' }}
            options={[
              { label: '18% Standard', value: 18 },
              { label: '12% Merits', value: 12 },
              { label: '5% Essential', value: 5 },
              { label: '28% Demerit', value: 28 },
              { label: '0% Nil/Exempt', value: 0 },
            ]}
          />
        )
      },
    },
    {
      title: isIntraState ? 'CGST + SGST (₹)' : 'IGST (₹)',
      key: 'taxBreakup',
      width: 140,
      render: (_: any, record: InvoiceItem) => {
        const gross = (record.quantity || 0) * (record.unitPrice || 0)
        const disc = gross * ((record.discountRate || 0) / 100)
        const taxable = Math.max(0, gross - disc)
        const rate = isZeroRated ? 0 : (record.gstRate !== undefined ? record.gstRate : 18)
        const totalTax = taxable * (rate / 100)

        if (isZeroRated) {
          return <span style={{ color: '#8c8c8c' }}>₹0.00 (LUT)</span>
        }

        if (isIntraState) {
          const halfTax = totalTax / 2
          return (
            <div style={{ fontSize: 11, lineHeight: 1.3 }}>
              <div>C: ₹{halfTax.toFixed(2)} ({rate / 2}%)</div>
              <div>S: ₹{halfTax.toFixed(2)} ({rate / 2}%)</div>
            </div>
          )
        }

        return <span style={{ color: '#1d39c4', fontWeight: 600 }}>₹{totalTax.toFixed(2)} ({rate}%)</span>
      },
    },
    {
      title: 'Total (₹)',
      key: 'lineTotal',
      width: 130,
      render: (_: any, record: InvoiceItem) => {
        const gross = (record.quantity || 0) * (record.unitPrice || 0)
        const disc = gross * ((record.discountRate || 0) / 100)
        const taxable = Math.max(0, gross - disc)
        const rate = isZeroRated ? 0 : (record.gstRate !== undefined ? record.gstRate : 18)
        const totalTax = taxable * (rate / 100)
        const total = taxable + totalTax
        return (
          <span style={{ fontWeight: 700, color: '#0958d9' }}>
            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: any, record: InvoiceItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.key)}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/invoices')}>
            Back to Invoices
          </Button>
          <h2 style={{ margin: 0 }}>
            {currentId ? `Edit GST Tax Invoice #${currentId}` : 'Create Rule 46 Statutory Tax Invoice'}
          </h2>
          <Tag color={invoiceStatus === 'POSTED' ? 'green' : 'orange'} style={{ fontSize: 13, padding: '2px 10px' }}>
            {invoiceStatus}
          </Tag>
        </Space>
        <Space>
          <Button icon={<CalculatorOutlined />} onClick={() => handleCalculatePreview()}>
            Preview Tax Breakdown
          </Button>
          {!isImmutable && (
            <Button type="default" icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
              Save Draft
            </Button>
          )}
          {(currentId || id) && !isImmutable && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handlePostInvoice} loading={loading}>
              Post & Freeze Invoice
            </Button>
          )}
          {(currentId || id) && (
            <Button icon={<PrinterOutlined />} onClick={() => navigate(`/sales/invoices/${currentId || id}/print`)}>
              Print Rule 46 View
            </Button>
          )}
        </Space>
      </div>

      {isImmutable && (
        <Alert
          message="Immutable Statutory Tax Invoice"
          description="This invoice has been posted and frozen with an authoritative statutory snapshot. Master data changes will not alter this document."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isZeroRated && (
        <Alert
          message="Zero-Rated Supply Under LUT (Letter of Undertaking)"
          description={`Supply under Rule 96A / Section 16(3)(a) of IGST Act without payment of Integrated Tax. LUT Reference: ${form.getFieldValue('lutBondNumber') || 'LUT/2026/001'}. GST Rate is legally 0% with full ITC eligibility.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        disabled={isImmutable}
        onValuesChange={(_, allValues) => {
          handleCalculatePreview(items, allValues)
        }}
      >
        {/* Header Details */}
        <Card title="1. Statutory Parties & Place of Supply (Rule 46 Particulars)" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="companyGstinId"
                label="Supplier (Company) GSTIN"
                rules={[{ required: true, message: 'Please select issuer GSTIN' }]}
              >
                <Select
                  placeholder="Select company GSTIN"
                  options={companyGstins.map((g) => ({
                    label: `${g.gstin} - ${g.tradeName || g.legalName} (${g.stateName})`,
                    value: g.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="customerId"
                label="Customer / Buyer"
                rules={[{ required: true, message: 'Customer selection is mandatory under Rule 46(c)' }]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select registered customer or walk-in"
                  optionFilterProp="label"
                  onChange={handleCustomerSelect}
                  options={customers.map((c) => ({
                    label: `${c.supplier} ${c.taxNum ? '(' + c.taxNum + ')' : ''}`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="customerGstin"
                label="Customer GSTIN (15-digit B2B)"
                rules={[{ len: 15, message: 'GSTIN must be exactly 15 characters' }]}
              >
                <Input
                  placeholder="Leave blank for Walk-in B2C"
                  maxLength={15}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().trim()
                    form.setFieldsValue({ customerGstin: val })
                    if (val.length >= 2) {
                      const stateCode = val.substring(0, 2)
                      if (stateCodes.some((s) => s.stateCode === stateCode)) {
                        form.setFieldsValue({ posStateCode: stateCode })
                      }
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="posStateCode"
                label="Place of Supply (POS State)"
                rules={[{ required: true, message: 'Place of Supply is mandatory under Rule 46' }]}
              >
                <Select
                  showSearch
                  placeholder="Select Place of Supply"
                  options={stateCodes.map((s) => ({
                    label: `${s.stateCode} - ${s.stateName} ${s.isUt ? '(UT)' : ''}`,
                    value: s.stateCode,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="invoiceDate" label="Invoice Date" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="exportType" label="Export / SEZ Supply Category" initialValue="N_A">
                <Select
                  options={[
                    { label: 'Domestic / Standard', value: 'N_A' },
                    { label: 'Export without Payment (LUT)', value: 'EXPORT_WITHOUT_PAYMENT' },
                    { label: 'Export with Payment of IGST', value: 'EXPORT_WITH_PAYMENT' },
                    { label: 'SEZ without Payment (LUT)', value: 'SEZ_WITHOUT_PAYMENT' },
                    { label: 'SEZ with Payment of IGST', value: 'SEZ_WITH_PAYMENT' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="lutBondNumber" label="LUT / Bond Number (if applicable)" initialValue="LUT/2026/001">
                <Input placeholder="e.g. LUT/2026/001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="isRcm" label="Reverse Charge (Sec 9(3))" initialValue={false}>
                <Select
                  options={[
                    { label: 'No (Supplier pays statutory tax)', value: false },
                    { label: 'Yes (Recipient pays statutory tax via RCM)', value: true },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Item Particulars */}
        <Card
          title="2. Invoice Line Items with Item-Level GST Breakdown"
          extra={
            !isImmutable && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>
                Add Item
              </Button>
            )
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={items}
            columns={columns as any}
            pagination={false}
            rowKey="key"
            size="small"
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Live Calculation Preview Breakdown */}
        {previewResult && (
          <Card
            title="3. Statutory GST Breakup & Whole-Rupee Totals (Rule 46 Compliant)"
            style={{ marginBottom: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div style={{ fontSize: 13, lineHeight: 2.2 }}>
                  <div>
                    <strong>Supply Type:</strong>{' '}
                    <Tag color={previewResult.supplyType === 'INTRA_STATE' ? 'green' : 'blue'}>
                      {previewResult.supplyType} {previewResult.isUtgst ? '(UTGST)' : ''}
                    </Tag>
                  </div>
                  <div>
                    <strong>Statutory Classification:</strong>{' '}
                    <Tag color="geekblue">{previewResult.transactionType || (form.getFieldValue('customerGstin') ? 'B2B' : 'B2CS')}</Tag>
                  </div>
                  <div>
                    <strong>Place of Supply (POS):</strong>{' '}
                    <span style={{ fontWeight: 600 }}>{previewResult.posStateCode} - {previewResult.posStateName}</span>
                  </div>
                  {isZeroRated && (
                    <div>
                      <strong>Zero-Rated Category:</strong>{' '}
                      <Tag color="orange">LUT / Bond: {previewResult.lutBondNumber || form.getFieldValue('lutBondNumber') || 'LUT/2026/001'}</Tag>
                    </div>
                  )}
                  <div>
                    <strong>Amount in Words:</strong>{' '}
                    <span style={{ color: '#002766', fontWeight: 600 }}>{previewResult.amountInWords}</span>
                  </div>
                  <div>
                    <strong>Calculation Hash:</strong>{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#595959' }}>
                      {previewResult.deterministicCalculationId}
                    </span>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Total Taxable Value:</span>
                    <strong>{formatINR(previewResult.totalTaxableValue)}</strong>
                  </div>
                  {previewResult.supplyType === 'INTRA_STATE' && !isZeroRated ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                        <span>Central GST (CGST):</span>
                        <span>{formatINR(previewResult.totalCgstAmount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                        <span>{previewResult.isUtgst ? 'Union Territory GST (UTGST):' : 'State GST (SGST):'}</span>
                        <span>{formatINR(previewResult.isUtgst ? previewResult.totalUtgstAmount : previewResult.totalSgstAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                      <span>Integrated GST (IGST):</span>
                      <span>{isZeroRated ? '₹0.00 (Zero-Rated LUT)' : formatINR(previewResult.totalIgstAmount)}</span>
                    </div>
                  )}
                  {Number(previewResult.totalCessAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                      <span>Compensation Cess:</span>
                      <span>{formatINR(previewResult.totalCessAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginBottom: 8 }}>
                    <span>Total Statutory Tax:</span>
                    <strong>{isZeroRated ? '₹0.00 (LUT)' : formatINR(previewResult.totalTaxAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#64748b' }}>
                    <span>Section 170 Round-off:</span>
                    <span>{formatINR(previewResult.roundOffAmount)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '2px solid #2563eb',
                      paddingTop: 10,
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#1e3a8a',
                    }}
                  >
                    <span>Final Invoice Grand Total:</span>
                    <span>{formatINR(previewResult.finalInvoiceTotal)}</span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Form>
    </div>
  )
}
