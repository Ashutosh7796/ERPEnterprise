import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
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
  CheckOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

export interface UnitRecord {
  id: number
  name?: string
  basicUnit: string
  otherUnit?: string
  otherUnitTwo?: string
  otherUnitThree?: string
  ratio?: number
  ratioTwo?: number
  ratioThree?: number
  enabled?: boolean | number
}

export const UnitListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<UnitRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<UnitRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (page = 1, pageSize = 10, searchName = '') => {
    setLoading(true)
    try {
      const searchParam = JSON.stringify({ name: searchName })
      const res = await http.get('/unit/list', {
        search: searchParam,
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to fetch units:', err)
      message.error(err?.message || 'Failed to fetch units')
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
      await http.delete(`/unit/delete?id=${id}`)
      message.success('Unit deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldValue('name'))
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete unit')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one unit')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/unit/deleteBatch?ids=${ids}`)
      message.success('Selected units deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldValue('name'))
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected units')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one unit')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/unit/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Units enabled' : 'Units disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldValue('name'))
    } catch (err: any) {
      message.error(err?.message || 'Failed to update unit status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: UnitRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      basicUnit: record.basicUnit,
      otherUnit: record.otherUnit,
      ratio: record.ratio,
      otherUnitTwo: record.otherUnitTwo,
      ratioTwo: record.ratioTwo,
      otherUnitThree: record.otherUnitThree,
      ratioThree: record.ratioThree,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)

      const payload: any = {
        basicUnit: values.basicUnit,
        otherUnit: values.otherUnit || '',
        ratio: values.ratio || '',
        otherUnitTwo: values.otherUnitTwo || '',
        ratioTwo: values.ratioTwo || '',
        otherUnitThree: values.otherUnitThree || '',
        ratioThree: values.ratioThree || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/unit/update', payload)
        message.success('Unit updated successfully')
      } else {
        await http.post('/unit/add', payload)
        message.success('Unit added successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldValue('name'))
    } catch (err: any) {
      message.error(err?.message || 'Failed to save unit')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumnsType<UnitRecord> = [
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
            title="Delete this unit?"
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
      title: 'UnitName',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (val: string, r: UnitRecord) => {
        if (val) return val
        let str = r.basicUnit || ''
        if (r.otherUnit && r.ratio) {
          str += `/(${r.otherUnit}=${r.ratio}${r.basicUnit})`
        }
        return str || '-'
      },
    },
    {
      title: 'Base Unit',
      dataIndex: 'basicUnit',
      key: 'basicUnit',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: 'Alt Unit',
      dataIndex: 'otherUnit',
      key: 'otherUnit',
      width: 160,
      render: (val: string, r: UnitRecord) => {
        if (!val) return '-'
        if (r.ratio) {
          return `${val} = ${r.ratio}${r.basicUnit || ''}`
        }
        return val
      },
    },
    {
      title: 'Alt Unit2',
      dataIndex: 'otherUnitTwo',
      key: 'otherUnitTwo',
      width: 160,
      render: (val: string, r: UnitRecord) => {
        if (!val) return '-'
        if (r.ratioTwo) {
          return `${val} = ${r.ratioTwo}${r.basicUnit || ''}`
        }
        return val
      },
    },
    {
      title: 'Alt Unit3',
      dataIndex: 'otherUnitThree',
      key: 'otherUnitThree',
      width: 160,
      render: (val: string, r: UnitRecord) => {
        if (!val) return '-'
        if (r.ratioThree) {
          return `${val} = ${r.ratioThree}${r.basicUnit || ''}`
        }
        return val
      },
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      align: 'center',
      render: (val: any) => {
        const isEnabled = val === true || val === 1 || val === '1'
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals.name)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="name"
              label="Unit Name:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Please enter UnitName search..." allowClear style={{ width: '100%' }} />
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
                  fetchData(1, pagination.pageSize, '')
                }}
              >
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* Action Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          Add New
        </Button>
        <Popconfirm
          title="Delete selected units?"
          onConfirm={handleBatchDelete}
          disabled={selectedRowKeys.length === 0}
        >
          <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
            Delete
          </Button>
        </Popconfirm>
        <Button
          icon={<CheckOutlined />}
          onClick={() => handleBatchStatus(true)}
          disabled={selectedRowKeys.length === 0}
        >
          Enable
        </Button>
        <Button
          icon={<StopOutlined />}
          onClick={() => handleBatchStatus(false)}
          disabled={selectedRowKeys.length === 0}
        >
          Disable
        </Button>
      </div>

      {/* Table */}
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
          showTotal: (tot, range) => `${range[0]}-${range[1]} total ${tot} items`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          onChange: (page, size) => fetchData(page, size, form.getFieldValue('name')),
        }}
      />

      {/* Unit Modal */}
      <Modal
        title={editingRecord ? 'Edit Unit of Measure' : 'Add Unit of Measure'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={650}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="basicUnit"
            label="Base Unit"
            rules={[{ required: true, message: 'Please enter base unit' }]}
          >
            <Input placeholder="e.g. Bottle, Piece, Box..." />
          </Form.Item>

          <Row gutter={12} align="middle">
            <Col span={11}>
              <Form.Item name="otherUnit" label="Alt Unit 1">
                <Input placeholder="e.g. Box, Carton..." />
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center', paddingTop: 10, fontWeight: 'bold' }}>
              =
            </Col>
            <Col span={11}>
              <Form.Item name="ratio" label="Ratio (Base Units)">
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 12" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12} align="middle">
            <Col span={11}>
              <Form.Item name="otherUnitTwo" label="Alt Unit 2">
                <Input placeholder="e.g. Case, Pack..." />
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center', paddingTop: 10, fontWeight: 'bold' }}>
              =
            </Col>
            <Col span={11}>
              <Form.Item name="ratioTwo" label="Ratio 2 (Base Units)">
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 24" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12} align="middle">
            <Col span={11}>
              <Form.Item name="otherUnitThree" label="Alt Unit 3">
                <Input placeholder="e.g. Pallet..." />
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center', paddingTop: 10, fontWeight: 'bold' }}>
              =
            </Col>
            <Col span={11}>
              <Form.Item name="ratioThree" label="Ratio 3 (Base Units)">
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 100" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  )
}
