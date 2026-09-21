import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Typography,
  Descriptions,
  Tabs,
  Alert,
  Tooltip,
} from 'antd'
import {
  QrcodeOutlined,
  SendOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CarOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { gstApi } from '../api/gstApi'
import { GstSignedQrViewer } from '../components/GstSignedQrViewer'
import { formatCurrency, formatIndianDate } from '../../../shared/utils/indianTax'

const { Title, Text } = Typography
const { Option } = Select

export const GstEInvoiceDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [dataList, setDataList] = useState<any[]>([])
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false)
  const [complianceStatus, setComplianceStatus] = useState<any | null>(null)

  // Generate IRN Modal
  const [irnModalVisible, setIrnModalVisible] = useState<boolean>(false)
  const [irnForm] = Form.useForm()

  // Generate Standalone EWB Modal
  const [ewbModalVisible, setEwbModalVisible] = useState<boolean>(false)
  const [ewbForm] = Form.useForm()
  const [calculatedValidity, setCalculatedValidity] = useState<any | null>(null)

  // Cancellation Modals
  const [cancelIrnVisible, setCancelIrnVisible] = useState<boolean>(false)
  const [cancelEwbVisible, setCancelEwbVisible] = useState<boolean>(false)
  const [cancelForm] = Form.useForm()

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

  const fetchRecords = async () => {
    setLoading(true)
    try {
      // Load recent sales invoices & credit/debit notes for dashboard display
      const res = await gstApi.getAdjustableInvoices()
      if (res && res.data) {
        setDataList(res.data)
      }
    } catch (err: any) {
      showErrorModal('Document Retrieval Notice', 'Failed to load document records: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const handleInspectCompliance = async (record: any) => {
    setSelectedDoc(record)
    setLoading(true)
    try {
      const res = await gstApi.getEinvoiceStatus({ documentId: record.id, documentType: 'INV' })
      if (res && res.data) {
        setComplianceStatus(res.data)
        setStatusModalVisible(true)
      } else {
        Modal.info({
          title: 'Statutory Record Status',
          content: 'No statutory e-Invoice record has been generated yet for this document. You can click "IRN" to submit to IRP Gateway.',
          centered: true,
        })
      }
    } catch (err: any) {
      showErrorModal('Compliance Status Error', err.message || 'Error fetching compliance status')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenGenerateIrn = (record: any) => {
    setSelectedDoc(record)
    irnForm.resetFields()
    setIrnModalVisible(true)
  }

  const handleGenerateIrnSubmit = async () => {
    try {
      const values = await irnForm.validateFields()
      setLoading(true)
      const transportDetails = values.transId
        ? {
            transId: values.transId,
            transName: values.transName,
            distance: values.distance,
            transDocNo: values.transDocNo,
            vehNo: values.vehNo,
            vehType: values.vehType || 'R',
            transMode: values.transMode || '1',
          }
        : undefined

      const res = await gstApi.generateIrn(
        { documentId: selectedDoc.id, documentType: 'INV' },
        transportDetails
      )

      if (res && res.data) {
        showSuccessModal('IRN Generated Successfully', `Authoritative IRN: ${res.data.irn || 'Generated'} with Ack No: ${res.data.ackNo || ''}`)
        setIrnModalVisible(false)
        fetchRecords()
      }
    } catch (err: any) {
      showErrorModal('IRN Generation Notice', 'IRN generation rejected: ' + (err.message || 'Statutory rejected'))
    } finally {
      setLoading(false)
    }
  }

  const handleDistanceChange = async (distance: number | null) => {
    if (distance && distance > 0) {
      try {
        const vehicleType = ewbForm.getFieldValue('vehicleType') || 'REGULAR'
        const res = await gstApi.calculateEwbValidity({ distanceKm: distance, vehicleType })
        if (res && res.data) {
          setCalculatedValidity(res.data)
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  const handleOpenGenerateEwb = (record: any) => {
    setSelectedDoc(record)
    ewbForm.resetFields()
    setCalculatedValidity(null)
    setEwbModalVisible(true)
  }

  const handleGenerateEwbSubmit = async () => {
    try {
      const values = await ewbForm.validateFields()
      setLoading(true)
      const res = await gstApi.generateEwb(
        { documentId: selectedDoc.id, documentType: 'INV' },
        {
          docNo: selectedDoc.invoiceNumber || selectedDoc.number,
          docDate: selectedDoc.invoiceDate || selectedDoc.operTime,
          distance: values.distance,
          transporterId: values.transporterId,
          transporterName: values.transporterName,
          transMode: values.transMode || '1',
          vehicleNo: values.vehicleNo,
          vehicleType: values.vehicleType || 'R',
          transDocNo: values.transDocNo,
        }
      )
      if (res && res.data) {
        showSuccessModal('e-Way Bill Generated', `e-Way Bill Number: ${res.data.ewbNo || 'Generated'} successfully!`)
        setEwbModalVisible(false)
        fetchRecords()
      }
    } catch (err: any) {
      showErrorModal('e-Way Bill Failed', err.message || 'e-Way bill generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReconcile = async (record: any) => {
    setLoading(true)
    try {
      const res = await gstApi.reconcileEinvoiceStatus({ documentId: record.id, documentType: 'INV' })
      if (res && res.data) {
        showSuccessModal('IRP Status Reconciled', 'Status and Signed QR have been synchronized with IRP Gateway.')
        fetchRecords()
      }
    } catch (err: any) {
      showErrorModal('Reconciliation Error', err.message || 'Reconciliation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelIrnSubmit = async () => {
    try {
      const values = await cancelForm.validateFields()
      setLoading(true)
      const res = await gstApi.cancelIrn({
        documentId: selectedDoc.id,
        documentType: 'INV',
        reasonCode: values.reasonCode,
        remarks: values.remarks,
      })
      if (res && res.data) {
        showSuccessModal('e-Invoice Cancelled', 'e-Invoice cancelled successfully on IRP.')
        setCancelIrnVisible(false)
        fetchRecords()
      }
    } catch (err: any) {
      showErrorModal('IRP Cancellation Failed', err.message || 'Cancellation failed')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Doc Number',
      key: 'number',
      render: (_: any, row: any) => {
        const docNo = row.invoiceNumber || row.number || `INV-${row.id}`
        const docDate = row.invoiceDate || row.operTime
        return (
          <div>
            <Text strong>{docNo}</Text>
            <div style={{ fontSize: 11, color: '#888' }}>{formatIndianDate(docDate)}</div>
          </div>
        )
      },
    },
    {
      title: 'Customer / GSTIN',
      key: 'customer',
      render: (_: any, row: any) => (
        <div>
          <div>{row.customerName || 'B2B Customer'}</div>
          <Tag color="blue">{row.customerGstin || 'URP'}</Tag>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (_: any, row: any) => {
        const amt = row.originalTotal != null ? row.originalTotal : (row.totalPrice != null ? row.totalPrice : row.remainingTotal || 0)
        return <Text strong>{formatCurrency(amt)}</Text>
      },
    },
    {
      title: 'Statutory Status',
      key: 'status',
      render: (_: any, row: any) => (
        <Space orientation="vertical" size={2}>
          <Tag color={row.status === 'FINALIZED' ? 'green' : 'gold'}>{row.status || 'POSTED'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, row: any) => (
        <Space size="small">
          <Button size="small" icon={<SearchOutlined />} onClick={() => handleInspectCompliance(row)}>
            Inspect
          </Button>
          <Button size="small" type="primary" icon={<QrcodeOutlined />} onClick={() => handleOpenGenerateIrn(row)}>
            IRN
          </Button>
          <Button size="small" icon={<CarOutlined />} onClick={() => handleOpenGenerateEwb(row)}>
            EWB
          </Button>
          <Tooltip title="Recover state if connection timed out">
            <Button size="small" icon={<SyncOutlined />} onClick={() => handleReconcile(row)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            GST Statutory Integration Dashboard
          </Title>
          <Text type="secondary">
            Production-grade IRP e-Invoice (v1.03), Signed QR, and NIC e-Way Bill Integration Layer
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={fetchRecords}>
          Refresh
        </Button>
      </div>

      <Alert
        title="Official Statutory Gateway Active (v1.03)"
        description="Statutory rules applied: Rule 138(10) EWB distance validity (100 km/day Regular, 20 km/day ODC), 24-hour IRP/EWB cancellation window, and 30-day reporting restriction. 2026 held features (Ship-To GSTIN & EWB Closure) are safely disabled."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Card title="GST Sales Invoices & Documents" size="small">
        <Table
          columns={columns}
          dataSource={dataList}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Compliance Inspector Modal */}
      <Modal
        title={`Statutory Compliance Record: ${selectedDoc?.number || ''}`}
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatusModalVisible(false)}>
            Close
          </Button>,
          complianceStatus?.irn && (
            <Button
              key="cancelIrn"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                cancelForm.resetFields()
                setCancelIrnVisible(true)
              }}
            >
              Cancel e-Invoice
            </Button>
          ),
        ]}
        width={700}
      >
        {complianceStatus && (
          <div>
            <GstSignedQrViewer
              signedQrJwt={complianceStatus.signedQRCode}
              irn={complianceStatus.irn}
              ackNo={complianceStatus.ackNo}
              ackDate={complianceStatus.ackDate}
              isVerified={complianceStatus.isQrVerified}
              verificationDetails={complianceStatus.qrVerificationDetails}
            />

            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="e-Invoice Status">
                <Tag color={complianceStatus.einvoiceStatus === 'GENERATED' ? 'success' : 'warning'}>
                  {complianceStatus.einvoiceStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="e-Way Bill Status">
                <Tag color={complianceStatus.ewbStatus === 'GENERATED' ? 'cyan' : 'default'}>
                  {complianceStatus.ewbStatus}
                </Tag>
              </Descriptions.Item>
              {complianceStatus.ewbNumber && (
                <>
                  <Descriptions.Item label="EWB Number">{complianceStatus.ewbNumber}</Descriptions.Item>
                  <Descriptions.Item label="Valid Until">{formatIndianDate(complianceStatus.ewbValidUntil)}</Descriptions.Item>
                  <Descriptions.Item label="Distance / Mode">
                    {complianceStatus.distanceKm} km ({complianceStatus.transportMode})
                  </Descriptions.Item>
                  <Descriptions.Item label="Vehicle No">{complianceStatus.vehicleNo || 'N/A'}</Descriptions.Item>
                </>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Generate IRN Modal */}
      <Modal
        title={`Generate e-Invoice (IRN): ${selectedDoc?.number || ''}`}
        open={irnModalVisible}
        onOk={handleGenerateIrnSubmit}
        onCancel={() => setIrnModalVisible(false)}
        confirmLoading={loading}
        okText="Submit to IRP"
        width={600}
      >
        <Form form={irnForm} layout="vertical">
          <Alert
            title="Optional Part-B e-Way Bill"
            description="If you wish to generate a combined e-Way Bill along with the IRN, provide transport particulars below."
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="transId" label="Transporter GSTIN / ID">
            <Input placeholder="e.g. 27AAACT2727Q1ZW" maxLength={15} />
          </Form.Item>
          <Form.Item name="transName" label="Transporter Name">
            <Input placeholder="e.g. Speed Logistics Ltd" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="distance" label="Distance (KM)">
              <InputNumber style={{ width: '100%' }} placeholder="e.g. 150" min={1} />
            </Form.Item>
            <Form.Item name="vehNo" label="Vehicle Number">
              <Input placeholder="e.g. MH12AB1234" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="vehType" label="Vehicle Type" initialValue="R">
              <Select>
                <Option value="R">Regular Cargo (100 km/day)</Option>
                <Option value="O">Over Dimensional Cargo (20 km/day)</Option>
              </Select>
            </Form.Item>
            <Form.Item name="transMode" label="Transport Mode" initialValue="1">
              <Select>
                <Option value="1">1 - Road</Option>
                <Option value="2">2 - Rail</Option>
                <Option value="3">3 - Air</Option>
                <Option value="4">4 - Ship</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Standalone EWB Modal */}
      <Modal
        title={`Generate Standalone e-Way Bill: ${selectedDoc?.number || ''}`}
        open={ewbModalVisible}
        onOk={handleGenerateEwbSubmit}
        onCancel={() => setEwbModalVisible(false)}
        confirmLoading={loading}
        okText="Generate EWB"
        width={600}
      >
        <Form form={ewbForm} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="distance" label="Distance (KM)" rules={[{ required: true, message: 'Distance is required' }]}>
              <InputNumber style={{ width: '100%' }} min={1} onChange={handleDistanceChange} />
            </Form.Item>
            <Form.Item name="vehicleType" label="Cargo Type" initialValue="REGULAR">
              <Select onChange={() => handleDistanceChange(ewbForm.getFieldValue('distance'))}>
                <Option value="REGULAR">Regular (100 km/day)</Option>
                <Option value="ODC">Over Dimensional Cargo (20 km/day)</Option>
              </Select>
            </Form.Item>
          </div>

          {calculatedValidity && (
            <Alert
              type="success"
              showIcon
              title={`Rule 138(10) Calculated Validity: ${calculatedValidity.validityDays} Day(s)`}
              description={`Valid until: ${new Date(calculatedValidity.validUntil).toLocaleString()} (Midnight 23:59:59)`}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item name="transporterId" label="Transporter GSTIN / TRANSIN">
            <Input placeholder="e.g. 27AAACT2727Q1ZW" />
          </Form.Item>
          <Form.Item name="vehicleNo" label="Vehicle Number" rules={[{ required: true, message: 'Vehicle number required for Road' }]}>
            <Input placeholder="e.g. MH12AB1234" />
          </Form.Item>
          <Form.Item name="transDocNo" label="Transport Doc No (LR/GR)">
            <Input placeholder="e.g. LR-987654" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel IRN Modal */}
      <Modal
        title="Cancel e-Invoice on IRP"
        open={cancelIrnVisible}
        onOk={handleCancelIrnSubmit}
        onCancel={() => setCancelIrnVisible(false)}
        okText="Confirm IRP Cancellation"
        okButtonProps={{ danger: true }}
      >
        <Form form={cancelForm} layout="vertical">
          <Alert
            title="24-Hour Statutory Window"
            description="Cancellation on IRP is strictly allowed within 24 hours of generation. After 24 hours, cancellation is rejected by IRP and a Section 34 Credit Note must be issued."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="reasonCode" label="Statutory Reason Code" initialValue="1" rules={[{ required: true }]}>
            <Select>
              <Option value="1">1 - Duplicate</Option>
              <Option value="2">2 - Data Entry Error</Option>
              <Option value="3">3 - Order Cancelled</Option>
              <Option value="4">4 - Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remarks" label="Cancellation Remarks" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Provide reasons for audit trail" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
export default GstEInvoiceDashboard
