import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Button,
  Space,
  Row,
  Col,
  Popover,
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
  SafetyCertificateOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'
import { translateMenuTitle } from '@shared/utils/menuTranslations'

export interface RoleRecord {
  id: number
  name: string
  type?: string
  priceLimit?: string
  sort?: number
  description?: string
  enabled?: boolean
}

export interface PushBtnRow {
  id: number
  text: string
  url: string
  pushBtn: string
  btnStr: string
}

export const RoleListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [modalForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<RoleRecord[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Role Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RoleRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Menu Permissions Modal
  const [permModalOpen, setPermModalOpen] = useState(false)
  const [permRole, setPermRole] = useState<RoleRecord | null>(null)
  const [functionTree, setFunctionTree] = useState<any[]>([])
  const [checkedFunctionKeys, setCheckedFunctionKeys] = useState<React.Key[]>([])
  const [permSubmitting, setPermSubmitting] = useState(false)

  // Action Buttons Modal (RolePushBtnModal)
  const [pushBtnModalOpen, setPushBtnModalOpen] = useState(false)
  const [pushBtnRole, setPushBtnRole] = useState<RoleRecord | null>(null)
  const [pushBtnRows, setPushBtnRows] = useState<PushBtnRow[]>([])
  const [pushBtnLoading, setPushBtnLoading] = useState(false)
  const [pushBtnSubmitting, setPushBtnSubmitting] = useState(false)

  const allColumnKeys = ['rowIndex', 'action', 'name', 'type', 'priceLimit', 'sort', 'description', 'enabled']

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rowIndex',
    'action',
    'name',
    'type',
    'priceLimit',
    'sort',
    'description',
    'enabled',
  ])

  const fetchData = async (page = 1, pageSize = 10, searchValues: any = {}) => {
    setLoading(true)
    try {
      const searchObj: Record<string, any> = {
        name: searchValues.name || '',
      }

      const res = await http.get('/role/list', {
        search: JSON.stringify(searchObj),
        currentPage: page,
        pageSize,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      const total = res?.total !== undefined ? res.total : res?.data?.total || 0

      setDataSource(rows)
      setPagination({ current: page, pageSize, total })
    } catch (err: any) {
      console.error('Failed to load roles:', err)
      message.error(err?.message || 'Failed to load roles list.')
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
      await http.delete(`/role/delete?id=${id}`)
      message.success('Role deleted successfully')
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete role')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select roles first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.delete(`/role/deleteBatch?ids=${ids}`)
      message.success('Selected roles deleted successfully')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete selected roles')
    }
  }

  const handleBatchStatus = async (status: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select roles first')
      return
    }
    try {
      const ids = selectedRowKeys.join(',')
      await http.post(`/role/batchSetStatus?status=${status}&ids=${ids}`)
      message.success(status ? 'Roles enabled' : 'Roles disabled')
      setSelectedRowKeys([])
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to update role status')
    }
  }

  const handleOpenAdd = () => {
    setEditingRecord(null)
    modalForm.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: RoleRecord) => {
    setEditingRecord(record)
    const priceLimits = record.priceLimit ? record.priceLimit.split(',') : []
    modalForm.setFieldsValue({
      name: record.name,
      type: record.type || '全部数据',
      priceLimit: priceLimits,
      sort: record.sort || 1,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields()
      setSubmitting(true)
      const priceLimitStr = values.priceLimit && values.priceLimit.length > 0 ? values.priceLimit.join(',') : ''
      const payload: any = {
        name: values.name,
        type: values.type || '全部数据',
        priceLimit: priceLimitStr,
        sort: values.sort || 1,
        description: values.description || '',
      }

      if (editingRecord) {
        payload.id = editingRecord.id
        await http.put('/role/update', payload)
        message.success('Role updated successfully')
      } else {
        await http.post('/role/add', payload)
        message.success('Role created successfully')
      }

      setModalOpen(false)
      fetchData(pagination.current, pagination.pageSize, form.getFieldsValue())
    } catch (err: any) {
      message.error(err?.message || 'Failed to save role')
    } finally {
      setSubmitting(false)
    }
  }

  // Format function menu tree
  const formatFunctionTree = (nodes: any[]): any[] => {
    return nodes.map((node) => {
      const rawTitle = node.text || node.title || node.name || ''
      const translatedTitle = translateMenuTitle(rawTitle)
      return {
        key: String(node.id || node.key),
        title: translatedTitle,
        children: node.children && node.children.length > 0 ? formatFunctionTree(node.children) : undefined,
      }
    })
  }

  const handleOpenPermissions = async (record: RoleRecord) => {
    setPermRole(record)
    setPermModalOpen(true)
    try {
      const res: any = await http.get('/function/findRoleFunction?UBType=RoleFunctions&UBKeyId=' + record.id)
      const rawTree = Array.isArray(res) ? res : res?.data || []
      const formatted = formatFunctionTree(rawTree)
      setFunctionTree(formatted)

      // Collect pre-checked keys
      const preChecked: string[] = []
      const scanChecked = (items: any[]) => {
        for (const item of items) {
          if (item.checked) preChecked.push(String(item.id || item.key))
          if (item.children) scanChecked(item.children)
        }
      }
      scanChecked(rawTree)
      setCheckedFunctionKeys(preChecked)
    } catch (err: any) {
      console.error('Failed to load role permissions:', err)
      message.error('Failed to load menu permissions tree')
    }
  }

  const handleSavePermissions = async () => {
    if (!permRole) return
    try {
      setPermSubmitting(true)
      await http.post('/userBusiness/updateBtnStr', {
        roleId: permRole.id,
        btnStr: checkedFunctionKeys.join(','),
      })
      message.success(`Permissions saved for role: ${permRole.name}`)
      setPermModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save permissions')
    } finally {
      setPermSubmitting(false)
    }
  }

  // Action Buttons Modal (RolePushBtnModal)
  const handleOpenPushBtn = async (record: RoleRecord) => {
    setPushBtnRole(record)
    setPushBtnModalOpen(true)
    setPushBtnLoading(true)
    try {
      const res: any = await http.get('/function/findRoleFunction?UBType=RoleFunctions&UBKeyId=' + record.id)
      const rawList = Array.isArray(res) ? res : res?.data || []

      const flatRows: PushBtnRow[] = []
      const extractPushBtnRows = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.pushBtn && node.pushBtn.trim() !== '') {
            flatRows.push({
              id: node.id,
              text: node.text || node.title || node.name || '',
              url: node.url || '',
              pushBtn: node.pushBtn,
              btnStr: node.btnStr || '',
            })
          }
          if (node.children && node.children.length > 0) {
            extractPushBtnRows(node.children)
          }
        }
      }
      extractPushBtnRows(rawList)
      setPushBtnRows(flatRows)
    } catch (err) {
      message.error('Failed to load action buttons list')
    } finally {
      setPushBtnLoading(false)
    }
  }

  const handleToggleBtn = (rowId: number, btnCode: string, checked: boolean) => {
    setPushBtnRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        const currentCodes = row.btnStr ? row.btnStr.split(',').filter(Boolean) : []
        let nextCodes: string[]
        if (checked) {
          nextCodes = Array.from(new Set([...currentCodes, btnCode]))
        } else {
          nextCodes = currentCodes.filter((c) => c !== btnCode)
        }
        return { ...row, btnStr: nextCodes.join(',') }
      })
    )
  }

  const handleBatchToggleBtn = (btnCode: string, enableAll: boolean) => {
    setPushBtnRows((prev) =>
      prev.map((row) => {
        if (!row.pushBtn.includes(btnCode)) return row
        const currentCodes = row.btnStr ? row.btnStr.split(',').filter(Boolean) : []
        let nextCodes: string[]
        if (enableAll) {
          nextCodes = Array.from(new Set([...currentCodes, btnCode]))
        } else {
          nextCodes = currentCodes.filter((c) => c !== btnCode)
        }
        return { ...row, btnStr: nextCodes.join(',') }
      })
    )
  }

  const handleSavePushBtn = async () => {
    if (!pushBtnRole) return
    setPushBtnSubmitting(true)
    try {
      const payload = pushBtnRows.map((r) => ({
        id: r.id,
        btnStr: r.btnStr,
        url: r.url,
      }))
      await http.post('/userBusiness/updateBtnStrByRoleId', {
        roleId: pushBtnRole.id,
        btnStr: JSON.stringify(payload),
      })
      message.success(`Action buttons permissions saved for ${pushBtnRole.name}`)
      setPushBtnModalOpen(false)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save button permissions')
    } finally {
      setPushBtnSubmitting(false)
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
      width: 280,
      align: 'center' as const,
      render: (_: any, record: RoleRecord) => (
        <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />} size={0}>
          <a onClick={() => handleOpenPermissions(record)}>Assign Menus</a>
          <a onClick={() => handleOpenPushBtn(record)}>Assign Buttons</a>
          <a onClick={() => handleOpenEdit(record)}>Edit</a>
          <Popconfirm title="Delete this role?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
    name: {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    type: {
      title: 'Data Scope Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (v: any) => v || '全部数据',
    },
    priceLimit: {
      title: 'Price Shielding / Limits',
      dataIndex: 'priceLimit',
      key: 'priceLimit',
      width: 200,
      ellipsis: true,
      render: (v: string) => {
        if (!v) return <Tag color="default">None</Tag>
        const parts = v.split(',')
        const labels: Record<string, string> = {
          '1': 'Purchase Price',
          '2': 'Retail Price',
          '3': 'Sales Price',
          '4': 'Lowest Price',
        }
        return (
          <Space size={[0, 4]} wrap>
            {parts.map((p) => (
              <Tag key={p} color="purple">
                {labels[p] || p}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    sort: {
      title: 'Sort Order',
      dataIndex: 'sort',
      key: 'sort',
      width: 90,
    },
    description: {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
      render: (v: any) => v || '-',
    },
    enabled: {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 85,
      align: 'center' as const,
      render: (val: any) => {
        const isEnabled = val !== false
        return <Tag color={isEnabled ? 'green' : 'orange'}>{isEnabled ? 'Active' : 'Disabled'}</Tag>
      },
    },
  }

  const columns = visibleColumns.map((key) => columnsConfig[key]).filter(Boolean)

  const columnSettingsContent = (
    <div style={{ width: 320 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Role Column Display Settings</div>
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
            'type',
            'priceLimit',
            'sort',
            'description',
            'enabled',
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
              label="Role Name:"
              labelCol={{ flex: '85px' }}
              wrapperCol={{ flex: 'auto' }}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Search role name..." allowClear style={{ width: '100%' }} />
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
            Add New Role
          </Button>
          <Popconfirm
            title="Delete selected roles?"
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
            title="Role Management Directory"
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
        scroll={{ x: 1200 }}
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

      {/* Add / Edit Role Modal */}
      <Modal
        title={editingRecord ? 'Edit Role' : 'New Role'}
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
            label="Role Name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input placeholder="e.g. Sales Manager" />
          </Form.Item>

          <Form.Item name="type" label="Data Scope Type" initialValue="全部数据">
            <Select>
              <Select.Option value="全部数据">All Data Scope (Enterprise wide)</Select.Option>
              <Select.Option value="本机构数据">Department & Sub-departments</Select.Option>
              <Select.Option value="个人数据">Personal User Data Scope</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="priceLimit" label="Price Shielding / Masking Rules">
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Checkbox value="1">Shield Purchase Price</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="2">Shield Retail Price</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="3">Shield Sales Price</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="4">Shield Lowest Price</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="sort" label="Display Order" initialValue={1}>
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="Remarks / Description">
            <Input.TextArea rows={2} placeholder="Optional role notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Menu Permissions Tree Modal */}
      <Modal
        title={`Assign Menu Permissions - ${permRole?.name}`}
        open={permModalOpen}
        onCancel={() => setPermModalOpen(false)}
        onOk={handleSavePermissions}
        confirmLoading={permSubmitting}
        destroyOnHidden
        width={650}
      >
        <div style={{ maxHeight: 450, overflowY: 'auto' }}>
          {functionTree.length > 0 ? (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedFunctionKeys}
              onCheck={(keys) => setCheckedFunctionKeys(keys as React.Key[])}
              treeData={functionTree}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>Loading permissions tree...</div>
          )}
        </div>
      </Modal>

      {/* Assign Action Buttons Modal (RolePushBtnModal) */}
      <Modal
        title={`Assign Action Buttons - ${pushBtnRole?.name}`}
        open={pushBtnModalOpen}
        onCancel={() => setPushBtnModalOpen(false)}
        onOk={handleSavePushBtn}
        confirmLoading={pushBtnSubmitting}
        destroyOnHidden
        width={850}
      >
        <div style={{ marginBottom: 12 }}>
          <Space wrap size="small">
            <Button size="small" onClick={() => handleBatchToggleBtn('1', true)}>
              Check All Edit
            </Button>
            <Button size="small" onClick={() => handleBatchToggleBtn('2', true)}>
              Check All Audit
            </Button>
            <Button size="small" onClick={() => handleBatchToggleBtn('7', true)}>
              Check All Unaudit
            </Button>
            <Button size="small" onClick={() => handleBatchToggleBtn('3', true)}>
              Check All Export
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          bordered
          size="small"
          loading={pushBtnLoading}
          pagination={false}
          dataSource={pushBtnRows}
          scroll={{ y: 380 }}
          columns={[
            {
              title: '#',
              width: 50,
              align: 'center',
              render: (_: any, __: any, idx: number) => idx + 1,
            },
            {
              title: 'Menu / Module Page',
              dataIndex: 'text',
              width: 200,
              render: (v: string) => translateMenuTitle(v),
            },
            {
              title: 'Permitted Actions',
              key: 'actions',
              render: (_: any, row: PushBtnRow) => {
                const supported = row.pushBtn || ''
                const current = row.btnStr || ''
                return (
                  <Space size="middle" wrap>
                    {supported.includes('1') && (
                      <Checkbox
                        checked={current.includes('1')}
                        onChange={(e) => handleToggleBtn(row.id, '1', e.target.checked)}
                      >
                        Edit
                      </Checkbox>
                    )}
                    {supported.includes('2') && (
                      <Checkbox
                        checked={current.includes('2')}
                        onChange={(e) => handleToggleBtn(row.id, '2', e.target.checked)}
                      >
                        Approve / Audit
                      </Checkbox>
                    )}
                    {supported.includes('7') && (
                      <Checkbox
                        checked={current.includes('7')}
                        onChange={(e) => handleToggleBtn(row.id, '7', e.target.checked)}
                      >
                        Unapprove
                      </Checkbox>
                    )}
                    {supported.includes('3') && (
                      <Checkbox
                        checked={current.includes('3')}
                        onChange={(e) => handleToggleBtn(row.id, '3', e.target.checked)}
                      >
                        Export
                      </Checkbox>
                    )}
                    {supported.includes('4') && (
                      <Checkbox
                        checked={current.includes('4')}
                        onChange={(e) => handleToggleBtn(row.id, '4', e.target.checked)}
                      >
                        Enable/Disable
                      </Checkbox>
                    )}
                    {supported.includes('5') && (
                      <Checkbox
                        checked={current.includes('5')}
                        onChange={(e) => handleToggleBtn(row.id, '5', e.target.checked)}
                      >
                        Print
                      </Checkbox>
                    )}
                    {supported.includes('6') && (
                      <Checkbox
                        checked={current.includes('6')}
                        onChange={(e) => handleToggleBtn(row.id, '6', e.target.checked)}
                      >
                        Void
                      </Checkbox>
                    )}
                  </Space>
                )
              },
            },
          ]}
        />
      </Modal>
    </Card>
  )
}
