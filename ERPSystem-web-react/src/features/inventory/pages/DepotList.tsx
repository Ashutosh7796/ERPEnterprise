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
  Popover,
  Checkbox,
  Divider,
  Tag,
  Popconfirm,
  Modal,
  Tree,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  StopOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import { DepotBinDrawer } from '../components/DepotBinDrawer'

export interface DepotRecord {
  id: number
  name: string
  address?: string
  warehousing?: number
  truckage?: number
  principalName?: string
  principal?: number
  remark?: string
  sort?: number
  isDefault?: boolean | number
  enabled?: boolean | number
}

export const DepotListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<DepotRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DepotRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Assign Users Modal State (DepotUserModal)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [targetDepot, setTargetDepot] = useState<DepotRecord | null>(null)
  const [userTree, setUserTree] = useState<any[]>([])
  const [checkedUserKeys, setCheckedUserKeys] = useState<React.Key[]>([])
  const [userSubmitting, setUserSubmitting] = useState(false)

  // Storage Location Bin Drawer State
  const [binDrawerOpen, setBinDrawerOpen] = useState(false)
  const [binDepot, setBinDepot] = useState<DepotRecord | null>(null)

  const handleOpenManageBins = (record: DepotRecord) => {
    setBinDepot(record)
    setBinDrawerOpen(true)
  }

  const allColumnKeys = [
    'rowIndex',
    'action',
    'name',
    'address',
    'warehousing',
    'truckage',
    'principalName',
    'remark',
    'sort',
    'enabled',
    'isDefault',
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'name',
    'address',
    'warehousing',
    'truckage',
    'principalName',
    'remark',
    'enabled',
    'isDefault',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
        remark: searchValues.remark || '',
      }

      const res = await http.get('/depot/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load depots:', err)
      message.error(err?.message || 'Failed to load warehouse list.')
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
      await http.delete(`/depot/delete?id=${id}`)
      message.success('Warehouse deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete warehouse')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select warehouses first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/depot/deleteBatch?ids=${ids}`)
      message.success('Selected warehouses deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected warehouses')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select warehouses first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/depot/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Warehouses enabled' : 'Warehouses disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update warehouse status')
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await http.post(`/depot/updateIsDefault?id=${id}&isDefault=true`)
      message.success('Default warehouse updated successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to set default warehouse')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: DepotRecord) => {
    setEditingRecord(record)
    modalForm.setFieldsValue({
      name: record.name,
      address: record.address,
      warehousing: record.warehousing || 0,
      truckage: record.truckage || 0,
      sort: record.sort || 1,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        name: values.name,
        address: values.address || '',
        warehousing: values.warehousing || 0,
        truckage: values.truckage || 0,
        sort: values.sort || 1,
        remark: values.remark || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/depot/update', payload)
        message.success('Warehouse updated successfully')
      } else {
        await http.post('/depot/add', payload)
        message.success('Warehouse created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save warehouse')
    } finally {
      setSubmitting(false)
    }
  }

  // Format Checkable Tree Nodes
  const formatCheckTree = (nodes: any[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.id || node.key),
      title: node.title || node.userName || node.name || node.text,
      children: node.children && node.children.length > 0 ? formatCheckTree(node.children) : undefined,
    }))
  }

  // Assign Users Handler
  const handleOpenAssignUser = async (record: DepotRecord) => {
    setTargetDepot(record)
    setUserModalOpen(true)
    try {
      const res: any = await http.get(`/user/findUserDepot?UBType=UserDepot&UBKeyId=${record.id}`)
      const rawTree = Array.isArray(res) ? res : res?.data || []
      setUserTree(formatCheckTree(rawTree))

      const preChecked: string[] = []
      const scanChecked = (items: any[]) => {
        for (const item of items) {
          if (item.checked) preChecked.push(String(item.id || item.key))
          if (item.children) scanChecked(item.children)
        }
      }
      scanChecked(rawTree)
      setCheckedUserKeys(preChecked)
    } catch (err) {
      message.error('Failed to load user assignments')
    }
  }

  const handleSaveAssignUser = async () => {
    if (!targetDepot) return
    setUserSubmitting(true)
    try {
      await http.post('/userBusiness/updateBtnStr', {
        roleId: targetDepot.id,
        btnStr: checkedUserKeys.join(','),
      })
      message.success(`User assignments updated for warehouse: ${targetDepot.name}`)
      setUserModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save user assignments')
    } finally {
      setUserSubmitting(false)
    }
  }

  const columnsConfig: Record<string, any> = {
    rowIndex: {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) =>
        (pagination.current - 1) * pagination.pageSize + idx + 1,
    },
    action: {
      title: 'Action',
      key: 'action',
      width: 360,
      align: 'center' as const,
      render: (_: any, record: DepotRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenManageBins(record)}>Manage Bins</a>
          <a onClick={() => handleOpenAssignUser(record)}>Assign Users</a>
          <Popconfirm title="Set this as default warehouse?" onConfirm={() => handleSetDefault(record.id)}>
            <a>Set Default</a>
          </Popconfirm>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this warehouse?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    name: {
      title: 'Warehouse Name',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    address: {
      title: 'Address / Location',
      dataIndex: 'address',
      key: 'address',
      width: 180,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    warehousing: {
      title: 'Warehousing Fee (₹)',
      dataIndex: 'warehousing',
      key: 'warehousing',
      width: 140,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? Number(v).toFixed(2) : '-'),
    },
    truckage: {
      title: 'Truckage Fee (₹)',
      dataIndex: 'truckage',
      key: 'truckage',
      width: 130,
      align: 'right' as const,
      render: (v: any) => (v !== undefined ? Number(v).toFixed(2) : '-'),
    },
    principalName: {
      title: 'Warehouse Head',
      dataIndex: 'principalName',
      key: 'principalName',
      width: 130,
      render: (v: any) => v || '-',
    },
    remark: {
      title: 'Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    sort: {
      title: 'Sort Order',
      dataIndex: 'sort',
      key: 'sort',
      width: 90,
    },
    enabled: {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 85,
      align: 'center' as const,
      render: (val: any) => {
        const isEnabled = val === true || val === 1 || val === '1'
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
    isDefault: {
      title: 'Is Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 90,
      align: 'center' as const,
      render: (val: any) => {
        const isDef = val === true || val === 1 || val === '1'
        return isDef ? <Tag color="blue">Default</Tag> : '-'
      },
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 340 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Warehouse Column Display Settings</div>
      <Checkbox.Group
        value={visibleColumns}
        onChange={(vals) => setVisibleColumns(vals as string[])}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {allColumnKeys.map((key) => (
            <Col span={12} key={key}>
              <Checkbox value={key} disabled={key === 'rowIndex' || key === 'action' || key === 'name'}>
                {columnsConfig[key]?.title || key}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
      <Divider style={{ margin: '10px 0 6px 0' }} />
      <Button
        type="link"
        size="small"
        onClick={() =>
          setVisibleColumns([
            'rowIndex',
            'action',
            'name',
            'address',
            'warehousing',
            'truckage',
            'principalName',
            'remark',
            'enabled',
            'isDefault',
          ])
        }
      >
        Restore Default Columns
      </Button>
    </div>
  )

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      {/* Search Form */}
      <Form
        form={form}
        onFinish={(vals) => fetchData(1, pagination.pageSize, vals)}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="name"
              label="Warehouse:"
              labelCol={{ flex: '90px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search warehouse name..." allowClear style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="remark"
              label="Remarks:"
              labelCol={{ flex: '70px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search remarks..." allowClear style={{ width: '100%' }} />
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

      {/* Action Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size="small" wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Add New Warehouse
          </Button>
          <Popconfirm
            title="Delete selected warehouses?"
            onConfirm={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              Batch Delete
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
          <ExportPrintButtons
            title="Warehouse Master Directory"
            columns={columns as any}
            dataSource={dataSource}
          />
        </Space>

        <Popover content={columnSettingsContent} trigger="click" placement="bottomRight">
          <Button icon={<SettingOutlined />}>Column Settings</Button>
        </Popover>
      </div>

      {/* Table */}
      <Table
        rowKey="id"
        bordered
        size="middle"
        loading={loading}
        columns={columns as TableColumnsType<any>}
        dataSource={dataSource}
        scroll={{ x: 1350 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...pagination,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} records`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100', '200'],
          onChange: (page, size) => fetchData(page, size, form.getFieldsValue()),
        }}
      />

      {/* Add / Edit Warehouse Modal */}
      <Modal
        title={editingRecord ? 'Edit Warehouse' : 'New Warehouse'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={submitting}
        destroyOnHidden
        width={550}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="name"
            label="Warehouse Name"
            rules={[{ required: true, message: 'Please enter warehouse name' }]}
          >
            <Input placeholder="e.g. Main Central Depot" />
          </Form.Item>

          <Form.Item name="address" label="Warehouse Address">
            <Input placeholder="e.g. Sector 12, Industrial Area" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehousing" label="Warehousing Fee (₹)">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="truckage" label="Truckage / Carriage (₹)">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="sort" label="Display Order" initialValue={1}>
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional warehouse notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Users Modal (DepotUserModal) */}
      <Modal
        title={`Assign Users - Warehouse: ${targetDepot?.name}`}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onOk={handleSaveAssignUser}
        confirmLoading={userSubmitting}
        destroyOnHidden
        width={500}
      >
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {userTree.length > 0 ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedUserKeys}
              onCheck={(keys) => setCheckedUserKeys(keys as React.Key[])}
              treeData={userTree}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>Loading users...</div>
          )}
        </div>
      </Modal>

      {/* Storage Location Bins Drawer */}
      <DepotBinDrawer
        visible={binDrawerOpen}
        depot={binDepot}
        onClose={() => setBinDrawerOpen(false)}
      />
    </Card>
  )
}
