import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  App,
  Row,
  Col,
  Descriptions,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  AuditOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

export interface AuditRecord {
  id: number
  correlationId: string
  eventType: string
  operatorId: number
  operatorName: string
  targetTenantId: number
  action: string
  reason: string
  beforeState: string
  afterState: string
  clientIp: string
  createTime: string
}

export const PlatformAuditListPage: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<AuditRecord[]>([])
  const [targetTenantId, setTargetTenantId] = useState<string>('')
  const [eventType, setEventType] = useState<string>('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let url = '/platform/audit/list'
      const params: string[] = []
      if (targetTenantId) params.push(`targetTenantId=${targetTenantId}`)
      if (eventType) params.push(`eventType=${eventType}`)
      if (params.length > 0) {
        url += '?' + params.join('&')
      }

      const res: any = await http.get(url)
      if (res && res.code === 200) {
        setDataSource(res.data?.rows || [])
      } else {
        message.error(res?.msg || 'Failed to load audit logs')
      }
    } catch (e: any) {
      message.error(e?.message || 'Error fetching audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const columns: TableColumnsType<AuditRecord> = [
    {
      title: 'Timestamp',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 160,
      render: (type) => {
        let color = 'blue'
        if (type.includes('SUSPEND') || type.includes('DELETE')) color = 'red'
        else if (type.includes('ASSIGN') || type.includes('CREATE')) color = 'green'
        else if (type.includes('OVERRIDE')) color = 'gold'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: 'Target Tenant',
      dataIndex: 'targetTenantId',
      key: 'targetTenantId',
      width: 120,
      render: (tid) => (tid ? `Tenant #${tid}` : 'Platform (Global)'),
    },
    {
      title: 'Operator',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 150,
      render: (name, r) => (
        <span>
          {name || 'System'} <span style={{ color: '#888', fontSize: 11 }}>(ID: {r.operatorId})</span>
        </span>
      ),
    },
    {
      title: 'Action & Summary',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (r) => r || '-',
    },
    {
      title: 'IP Address',
      dataIndex: 'clientIp',
      key: 'clientIp',
      width: 130,
      render: (ip) => ip || '127.0.0.1',
    },
    {
      title: 'Details',
      key: 'view',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedRecord(record)
            setDetailModalOpen(true)
          }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: '#722ed1' }} />
            <span>Platform Governance Audit Log (Append-Only)</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Target Tenant ID"
              value={targetTenantId}
              onChange={(e) => setTargetTenantId(e.target.value)}
              style={{ width: 160 }}
              allowClear
            />
            <Select
              placeholder="Event Type"
              value={eventType || undefined}
              onChange={(val) => setEventType(val || '')}
              style={{ width: 180 }}
              allowClear
              options={[
                { label: 'PLAN_CREATE', value: 'PLAN_CREATE' },
                { label: 'PLAN_UPDATE', value: 'PLAN_UPDATE' },
                { label: 'PLAN_ASSIGN', value: 'PLAN_ASSIGN' },
                { label: 'QUOTA_OVERRIDE', value: 'QUOTA_OVERRIDE' },
                { label: 'TENANT_SUSPEND', value: 'TENANT_SUSPEND' },
                { label: 'TENANT_ACTIVATE', value: 'TENANT_ACTIVATE' },
              ]}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchLogs}>
              Search
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={`Audit Event: ${selectedRecord?.eventType || ''}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={750}
      >
        {selectedRecord && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Correlation ID" span={2}>
              <code>{selectedRecord.correlationId}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {selectedRecord.createTime}
            </Descriptions.Item>
            <Descriptions.Item label="Client IP">
              {selectedRecord.clientIp || '127.0.0.1'}
            </Descriptions.Item>
            <Descriptions.Item label="Operator">
              {selectedRecord.operatorName} (ID: {selectedRecord.operatorId})
            </Descriptions.Item>
            <Descriptions.Item label="Target Tenant">
              {selectedRecord.targetTenantId ? `Tenant #${selectedRecord.targetTenantId}` : 'Platform'}
            </Descriptions.Item>
            <Descriptions.Item label="Action Summary" span={2}>
              {selectedRecord.action}
            </Descriptions.Item>
            <Descriptions.Item label="Operator Reason" span={2}>
              {selectedRecord.reason || 'None provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Before State" span={2}>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {selectedRecord.beforeState
                  ? JSON.stringify(JSON.parse(selectedRecord.beforeState), null, 2)
                  : 'N/A'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="After State" span={2}>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {selectedRecord.afterState
                  ? JSON.stringify(JSON.parse(selectedRecord.afterState), null, 2)
                  : 'N/A'}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
