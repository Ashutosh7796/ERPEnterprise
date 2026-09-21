import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  Typography,
  Table,
  Modal,
  Input,
  Alert,
  Spin,
  Divider,
  Statistic,
  App,
  Descriptions,
} from 'antd'
import {
  DatabaseOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

const { Title, Text, Paragraph } = Typography

export const DemoDataManagementPage: React.FC = () => {
  const { message, notification } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [dataStatus, setDataStatus] = useState<any>(null)

  // Purge Modal State
  const [purgeModalOpen, setPurgeModalOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [purgePreview, setPurgePreview] = useState<any>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [purging, setPurging] = useState(false)

  // Load Action State
  const [loadingDemo, setLoadingDemo] = useState(false)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await http.get<any>('/demoData/status')
      const data = res?.data || res
      setDataStatus(data)
    } catch (err: any) {
      console.error('Failed to load demo data status:', err)
      message.error(err?.message || 'Failed to fetch demo dataset status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      const res = await http.post<any>('/demoData/load')
      const data = res?.data || res
      if (data?.code === 200 || res?.code === 200) {
        message.success('Standard Demo Dataset loaded successfully!')
        fetchStatus()
      } else {
        message.warning(data?.message || 'Notice during demo load')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to load demo dataset')
    } finally {
      setLoadingDemo(false)
    }
  }

  const handleOpenPurgeModal = async () => {
    setPurgeModalOpen(true)
    setPreviewLoading(true)
    setConfirmInput('')
    try {
      const res = await http.get<any>('/demoData/preview')
      const data = res?.data || res
      setPurgePreview(data)
    } catch (err: any) {
      message.error(err?.message || 'Failed to generate purge preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmPurge = async () => {
    if (confirmInput.trim() !== 'DELETE DEMO DATA') {
      message.error('Please type "DELETE DEMO DATA" exactly to confirm.')
      return
    }

    setPurging(true)
    try {
      const res = await http.delete<any>('/demoData/purge')
      const data = res?.data || res
      setPurgeModalOpen(false)

      if (data?.status === 'PURGE_PARTIAL') {
        notification.warning({
          message: 'Demo Dataset Purged with Partial Retention',
          description: `${data?.deletedCount || 0} demo records deleted. ${data?.retainedCount || 0} records were retained because they are actively referenced in real invoices or transactions.`,
          duration: 8,
        })
      } else {
        notification.success({
          message: 'Demo Dataset Purged Successfully',
          description: `All ${data?.deletedCount || 0} demo records were safely deleted in reverse-dependency order. Real enterprise records remain untouched.`,
          duration: 6,
        })
      }
      fetchStatus()
    } catch (err: any) {
      message.error(err?.message || 'Failed to purge demo data')
    } finally {
      setPurging(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOADED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Demo Dataset Active</Tag>
      case 'PURGE_PARTIAL':
        return <Tag color="warning" icon={<WarningOutlined />}>Partially Purged (Real Reference Lock)</Tag>
      case 'PURGED':
        return <Tag color="default">Purged (No Active Demo Data)</Tag>
      case 'LOADING':
        return <Tag color="processing">Loading In Progress...</Tag>
      default:
        return <Tag color="default">No Demo Data Loaded</Tag>
    }
  }

  const isLoaded = dataStatus?.hasDemoData

  return (
    <Card variant="borderless" style={{ borderRadius: 8 }} styles={{ body: { padding: '24px 28px' } }}>
      <Spin spinning={loading}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Title level={4} style={{ margin: 0 }}>Tenant Demo & Sample Business Data Management</Title>
              {dataStatus?.status && getStatusBadge(dataStatus.status)}
            </div>
            <Text type="secondary">
              Provision a complete, realistic manufacturing & retail ERP business dataset for testing, or safely purge it with automatic real-data reference protection.
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchStatus}>Refresh Status</Button>
            {!isLoaded ? (
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                loading={loadingDemo}
                onClick={handleLoadDemo}
              >
                Load Standard Demo Dataset
              </Button>
            ) : (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleOpenPurgeModal}
              >
                Purge Demo Dataset
              </Button>
            )}
          </Space>
        </div>

        <Alert
          title="Multi-Tenant Safety & Real-Data Protection Guarantee"
          description="Demo datasets are strictly registered in an isolated batch registry. Purging calculates the minimal required retention set and deletes unreferenced demo records in 31-level reverse-dependency order. If any demo product, warehouse, or account is referenced by a real invoice, that entity is safely preserved."
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 6 }}
        />

        {/* Batch Overview */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Statistic
                title="Active Batch Code"
                value={dataStatus?.batch?.batchCode || 'None'}
                styles={{ content: { fontSize: 16, fontWeight: 600 } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Statistic
                title="Total Registered Demo Records"
                value={dataStatus?.batch?.totalRecords || 0}
                styles={{ content: { fontSize: 20, color: '#1677ff' } }}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Statistic
                title="Dataset Template"
                value={dataStatus?.batch?.datasetCode || 'STANDARD'}
                styles={{ content: { fontSize: 16 } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Statistic
                title="Status"
                value={dataStatus?.status || 'NOT_LOADED'}
                styles={{ content: { fontSize: 16, color: isLoaded ? '#52c41a' : '#8c8c8c' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Dataset Inventory Breakdown */}
        {isLoaded && dataStatus?.stats && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>Itemized Demo Entity Registry</Title>
            <Table
              dataSource={dataStatus.stats}
              rowKey="table_name"
              pagination={false}
              size="small"
              bordered
              columns={[
                {
                  title: 'Database Entity / Table',
                  dataIndex: 'table_name',
                  key: 'table_name',
                  render: (text) => <Text code>{text}</Text>,
                },
                {
                  title: 'Total Generated',
                  dataIndex: 'cnt',
                  key: 'cnt',
                  align: 'center',
                },
                {
                  title: 'Purged',
                  dataIndex: 'purged_cnt',
                  key: 'purged_cnt',
                  align: 'center',
                  render: (val) => <Tag color={val > 0 ? 'default' : 'blue'}>{val || 0}</Tag>,
                },
                {
                  title: 'Retained (Real Ref Lock)',
                  dataIndex: 'retained_cnt',
                  key: 'retained_cnt',
                  align: 'center',
                  render: (val) => val > 0 ? <Tag color="warning">{val}</Tag> : <Text type="secondary">0</Text>,
                },
              ]}
            />
          </div>
        )}

        {/* Purge Safety Preview Modal */}
        <Modal
          title="Safe Demo Dataset Purge Verification"
          open={purgeModalOpen}
          onCancel={() => setPurgeModalOpen(false)}
          onOk={handleConfirmPurge}
          confirmLoading={purging}
          okText="Confirm & Purge Demo Data"
          okButtonProps={{ danger: true, disabled: confirmInput.trim() !== 'DELETE DEMO DATA' }}
          width={650}
        >
          <Spin spinning={previewLoading}>
            <div style={{ marginTop: 12 }}>
              <Alert
                message="Authoritative Registry Deletion Invariant"
                description="Only records registered in the demo log for this active batch will be processed. Real customer transactions, invoices, products, and configurations entered manually are 100% immune from deletion."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Total Demo Records in Batch">
                  <Text strong>{purgePreview?.totalEligible || 0}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Unreferenced Records to Purge">
                  <Text strong style={{ color: '#52c41a' }}>{purgePreview?.purgeableCount || 0}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Retained (Real Reference Lock)" span={2}>
                  <Text strong style={{ color: (purgePreview?.blockedCount || 0) > 0 ? '#fa8c16' : '#8c8c8c' }}>
                    {purgePreview?.blockedCount || 0}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {purgePreview?.blockedRecords && purgePreview.blockedRecords.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong type="warning" style={{ display: 'block', marginBottom: 6 }}>
                    Retained Entities (Referenced by Real Invoices / Transactions):
                  </Text>
                  <div style={{ maxHeight: 120, overflowY: 'auto', background: '#fffbe6', padding: '8px 12px', borderRadius: 4, border: '1px solid #ffe58f' }}>
                    {purgePreview.blockedRecords.map((item: any, idx: number) => (
                      <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                        <Text strong>[{item.table}]</Text> Record ID: {item.recordId} — <Text type="secondary">{item.reason}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Divider style={{ margin: '16px 0' }} />

              <div>
                <Paragraph style={{ margin: 0, marginBottom: 8 }}>
                  To confirm deletion of unreferenced demo data, please type <Text strong copyable>DELETE DEMO DATA</Text> below:
                </Paragraph>
                <Input
                  placeholder="Type DELETE DEMO DATA to confirm..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  style={{ borderRadius: 6 }}
                />
              </div>
            </div>
          </Spin>
        </Modal>
      </Spin>
    </Card>
  )
}
