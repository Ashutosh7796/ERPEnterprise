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
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface PropertyRecord {
  id: number
  nativeName: string
  anotherName: string
}

export const MaterialPropertyListPage: React.FC = () => {
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PropertyRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res = await http.get('/materialProperty/list', {
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load properties:', err)
      message.error(err?.message || 'Failed to load property list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenEdit = (record: PropertyRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      nativeName: record.nativeName,
      anotherName: record.anotherName,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingRecord) return
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      await http.put('/materialProperty/update', {
        id: editingRecord.id,
        nativeName: values.nativeName,
        anotherName: values.anotherName,
      })
      message.success('Item property alias updated successfully.')
      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      message.error(err?.message || 'Failed to update item property.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<PropertyRecord> = [
    {
      title: '#',
      key: 'rowIndex',
      width: 60,
      align: 'center',
      render: (_, __, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => <a onClick={() => handleOpenEdit(record)}>Edit</a>,
    },
    {
      title: 'Original / Native Property Name',
      dataIndex: 'nativeName',
      key: 'nativeName',
      width: 220,
    },
    {
      title: 'Custom Display Alias',
      dataIndex: 'anotherName',
      key: 'anotherName',
      width: 220,
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(pagination.current, pagination.pageSize)}>
            Refresh
          </Button>
          <ExportPrintButtons title="Item Property Attributes" columns={columns as any} dataSource={dataSource} />
        </Space>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          onChange: (page, size) => fetchData(page, size),
        }}
      />

      <Modal
        title="Edit Property Alias"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={480}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item name="nativeName" label="Original Name">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="anotherName"
            label="Display Alias"
            rules={[{ required: true, message: 'Please enter display alias' }]}
          >
            <Input placeholder="Custom name for this property..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
