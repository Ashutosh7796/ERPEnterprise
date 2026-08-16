import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface PlatformConfigRecord {
  id: number
  platformKey: string
  platformKeyInfo: string
  platformValue: string
}

export const PlatformConfigListPage: React.FC = () => {
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PlatformConfigRecord[]>([])

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PlatformConfigRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await http.get('/platformConfig/list')
      const rows = Array.isArray(res) ? res : res?.data?.rows || res?.rows || res?.data || []
      setDataSource(rows)
    } catch (err: any) {
      console.error('Failed to load platform config:', err)
      message.error(err?.message || 'Failed to load platform configurations.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenEdit = (record: PlatformConfigRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      platformKeyInfo: record.platformKeyInfo,
      platformValue: record.platformValue,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingRecord) return
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      await http.put('/platformConfig/update', {
        id: editingRecord.id,
        platformKey: editingRecord.platformKey,
        platformKeyInfo: values.platformKeyInfo,
        platformValue: values.platformValue,
      })
      message.success('Platform configuration saved successfully!')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to update configuration')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<PlatformConfigRecord> = [
    {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => <a onClick={() => handleOpenEdit(record)}>Edit</a>,
    },
    {
      title: 'Configuration Name',
      dataIndex: 'platformKeyInfo',
      key: 'platformKeyInfo',
      width: 240,
    },
    {
      title: 'Configuration Value',
      dataIndex: 'platformValue',
      key: 'platformValue',
      width: 500,
      ellipsis: true,
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
          <ExportPrintButtons title="Platform Global Configurations" columns={columns as any} dataSource={dataSource} />
        </Space>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
      />

      <Modal
        title={`Edit ${editingRecord?.platformKeyInfo || 'Configuration'}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={550}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item name="platformKeyInfo" label="Configuration Name">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="platformValue"
            label="Configuration Value"
            rules={[{ required: true, message: 'Please enter configuration value' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter platform configuration value..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
