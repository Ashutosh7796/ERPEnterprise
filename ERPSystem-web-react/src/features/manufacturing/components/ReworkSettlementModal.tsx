import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Tag,
  Alert,
  Descriptions,
  message,
  Typography,
  Card,
  Spin,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  BranchesOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import {
  workOrderApi,
  WorkOrderDTO,
  ReworkCostSummaryDTO,
  ReworkSettlementRequest,
  ReworkSettlementResultDTO,
} from '../api/workOrderApi'

const { Text } = Typography

interface ReworkSettlementModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  rwo: WorkOrderDTO | null
}

export const ReworkSettlementModal: React.FC<ReworkSettlementModalProps> = ({
  open,
  onClose,
  onSuccess,
  rwo,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState<ReworkCostSummaryDTO | null>(null)
  const [settlementResult, setSettlementResult] = useState<ReworkSettlementResultDTO | null>(null)

  const userAuth = useAppStore((state) => state.userAuth)
  const permissions = useAuthStore((state) => state.permissions)
  const isAuthorized =
    Boolean(userAuth?.isSuperAdmin ||
    userAuth?.isTenantAdmin ||
    userAuth?.authorityDomain === 'PLATFORM' ||
    permissions?.includes('WORK_ORDER_FINANCIAL_POST') ||
    permissions?.includes('FINANCE_ACCOUNT_MANAGE'))

  useEffect(() => {
    if (!open || !rwo?.id) return
    setSettlementResult(null)
    setLoading(true)

    workOrderApi
      .getReworkCostSummary(rwo.id)
      .then((res: any) => {
        const data: ReworkCostSummaryDTO = res?.data || res
        setSummary(data)
        const decision = data?.reinspectionDecision?.toUpperCase()
        form.setFieldsValue({
          settlementType: decision === 'FAIL' ? 'SCRAP' : 'NORMAL',
          postingDate: dayjs(),
          remark: `Rework order settlement for ${rwo.orderNumber}`,
        })
      })
      .catch((err) => {
        console.error('Failed to load rework cost summary', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, rwo, form])

  const handleSubmit = async () => {
    if (!rwo?.id) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload: ReworkSettlementRequest = {
        reworkWorkOrderId: rwo.id,
        settlementType: values.settlementType,
        postingDate: values.postingDate.format('YYYY-MM-DD'),
        remark: values.remark,
      }

      const res: any = await workOrderApi.settleRework(payload)
      const data: ReworkSettlementResultDTO = res?.data || res
      setSettlementResult(data)
      message.success(`Rework Order settled successfully. Voucher: ${data.voucherNo}`)
      onSuccess()
    } catch (err: any) {
      message.error(err?.response?.data?.data || err?.message || 'Rework settlement failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const inspDecision = summary?.reinspectionDecision?.toUpperCase()
  const isPass = inspDecision === 'PASS'
  const isFail = inspDecision === 'FAIL'

  return (
    <Modal
      title={
        <Space>
          <BranchesOutlined style={{ color: '#722ed1' }} />
          <span>Settle Rework Work Order & Post General Ledger</span>
          {rwo && <Tag color="purple">{rwo.orderNumber}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={750}
      footer={[
        <Button key="close" onClick={onClose}>
          {settlementResult ? 'Close' : 'Cancel'}
        </Button>,
        !settlementResult && (
          <Button
            key="submit"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            loading={submitting}
            disabled={!isAuthorized || !summary?.reinspectionDecision}
            onClick={handleSubmit}
          >
            Settle Rework Order
          </Button>
        ),
      ]}
    >
      <Spin spinning={loading}>
        {!isAuthorized && (
          <Alert
            type="warning"
            message="Separation of Duties (SoD) Restriction"
            description="Statutory rework financial settlement requires WORK_ORDER_FINANCIAL_POST or FINANCE_ACCOUNT_MANAGE authorization."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!summary?.reinspectionDecision && !loading && (
          <Alert
            type="error"
            message="Quality Re-Inspection Required"
            description="This Rework Work Order cannot be settled because no definitive quality re-inspection record (PASS or FAIL) was found in the QC module. Please record an inspection first."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {settlementResult ? (
          <Card
            style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Rework Financial Settlement Completed</span>
              </Space>
            }
          >
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Settlement Type">
                <Tag color="geekblue">{settlementResult.settlementType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="GL Voucher Number">
                <Tag color="green" style={{ fontWeight: 700 }}>{settlementResult.voucherNo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Rework Cost Settled (₹)">
                <Text strong style={{ color: '#3f8600' }}>₹{Number(settlementResult.totalCost || 0).toFixed(4)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Parent Work Order">
                {settlementResult.parentOrderNumber || `Order #${settlementResult.parentWorkOrderId}`}
              </Descriptions.Item>
            </Descriptions>

            {settlementResult.journalLines && settlementResult.journalLines.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text strong>Journal Entries Posted:</Text>
                <ul>
                  {settlementResult.journalLines.map((line, idx) => (
                    <li key={idx}><Text code>{line}</Text></li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <>
            {summary && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="Material Cost"
                        value={`$${Number(summary.actualMaterialCost || 0).toFixed(4)}`}
                        prefix={<DollarOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="Labor Cost"
                        value={`$${Number(summary.actualLaborCost || 0).toFixed(4)}`}
                        prefix={<DollarOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="Overhead Cost"
                        value={`$${Number(summary.actualOverheadCost || 0).toFixed(4)}`}
                        prefix={<DollarOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="Total Rework Cost"
                        value={`$${Number(summary.actualTotalCost || 0).toFixed(4)}`}
                        valueStyle={{ color: '#d48806', fontWeight: 700, fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Rework Planned Qty">{summary.plannedQty} units</Descriptions.Item>
                  <Descriptions.Item label="Re-Inspection Decision">
                    {summary.reinspectionDecision ? (
                      <Tag color={isPass ? 'green' : 'red'}>
                        {isPass ? <CheckCircleOutlined /> : <CloseCircleOutlined />} {summary.reinspectionDecision}
                      </Tag>
                    ) : (
                      <Tag color="orange">PENDING RE-INSPECTION</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Form form={form} layout="vertical">
              <Form.Item
                name="settlementType"
                label="Statutory Settlement Branch"
                rules={[{ required: true }]}
                tooltip="Select accounting treatment based on Quality decision"
              >
                <Select>
                  <Select.Option value="NORMAL" disabled={isFail}>
                    NORMAL — Capitalize into Finished Goods & Parent Order WIP (Dr 1212 / Cr 1213)
                  </Select.Option>
                  <Select.Option value="ABNORMAL" disabled={isFail}>
                    ABNORMAL — Expense to P&L Operating Overhead (Dr 4510 / Cr 1213)
                  </Select.Option>
                  <Select.Option value="SCRAP" disabled={isPass}>
                    SCRAP — Terminal Scrap Loss (Dr 5402 / Cr 1213)
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="postingDate"
                label="Posting Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="remark" label="Settlement Remark">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        )}
      </Spin>
    </Modal>
  )
}
