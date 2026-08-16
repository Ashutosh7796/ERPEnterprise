import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Popconfirm,
  Modal,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

export interface MaterialAttributeRecord {
  id: number
  attributeName: string
  attributeValue: string
}

export const MaterialAttributeListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<MaterialAttributeRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaterialAttributeRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (page = 1, pageSize = 10, values: any = {}) => {
    setLoading(true)
    try {
      const searchObj = {
        attributeName: values.attributeName || '',
        attributeValue: values.attributeValue || '',
      }
      const res = await http.get('/materialAttribute/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })
      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0
      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load attributes:', err)
      message.error(err?.message || 'Failed to load attributes.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await http.delete(`/materialAttribute/delete?id=${id}`)
      message.success('Attribute deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete attribute')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select attributes first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/materialAttribute/deleteBatch?ids=${ids}`)
      message.success('Selected attributes deleted')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected attributes')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: MaterialAttributeRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      attributeName: record.attributeName,
      attributeValue: record.attributeValue,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        attributeName: values.attributeName,
        attributeValue: values.attributeValue,
      }
      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/materialAttribute/update', payload)
        message.success('Attribute updated successfully')
      } else {
        await http.post('/materialAttribute/add', payload)
        message.success('Attribute added successfully')
      }
      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save attribute')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<MaterialAttributeRecord> = [
    {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center',
      render: (_, __, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1,
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this attribute?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: 'Attribute Name',
      dataIndex: 'attributeName',
      key: 'attributeName',
      width: 180,
    },
    {
      title: 'Attribute Values',
      dataIndex: 'attributeValue',
      key: 'attributeValue',
      render: (val: string) => {
        if (!val) return '-'
        const tags = val.split(/[|,\s]+/).filter(Boolean)
        return (
          <Space wrap size={[4, 4]}>
            {tags.map((t, idx) => (
              <Tag color="blue" key={idx}>
                {t}
              </Tag>
            ))}
          </Space>
        )
      },
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="attributeName"
              label="Attribute Name:"
              labelCol={{ flex: '110px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter attribute name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="attributeValue"
              label="Attribute Value:"
              labelCol={{ flex: '110px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Enter attribute value..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space wrap style={{ paddingLeft: 4 }}>
              <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                Search
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields()
                  fetchData(1, pagination.pageSize)
                }}
              >
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          Add Attribute
        </Button>
        <Popconfirm
          title="Delete selected attributes?"
          onConfirm={handleBatchDelete}
          disabled={selectedRowKeys.length === 0}
        >
          <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
            Batch Delete
          </Button>
        </Popconfirm>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          onChange: (p, s) => fetchData(p, s, form.getFieldsValue()),
        }}
      />

      <Modal
        title={editingRecord ? 'Edit Attribute' : 'New Attribute'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="attributeName"
            label="Attribute Name"
            rules={[{ required: true, message: 'Please enter attribute name' }]}
          >
            <Input placeholder="e.g. Size, Color, Capacity..." />
          </Form.Item>
          <Form.Item
            name="attributeValue"
            label="Attribute Values (Pipe separated)"
            rules={[{ required: true, message: 'Please enter attribute values' }]}
            extra="Separate multiple values with a pipe | (e.g. S|M|L|XL or Red|Blue|Green)"
          >
            <Input placeholder="e.g. S|M|L|XL" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
