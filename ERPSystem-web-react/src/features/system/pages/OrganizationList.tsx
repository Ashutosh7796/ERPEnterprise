import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  App,
  Button,
  Popconfirm,
  Card,
  Tree,
  Row,
  Col,
  Typography,
  Tag,
  Divider,
  Breadcrumb,
  Empty,
} from 'antd'
import type { TreeDataNode } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ApartmentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'

const { Title, Text, Paragraph } = Typography

export interface OrgNode {
  id: number
  key: number
  title: string
  orgAbr?: string
  parentId?: number
  sort?: number
  children?: OrgNode[]
}

export const OrganizationListPage: React.FC = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [inspectorForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [rawOrgs, setRawOrgs] = useState<any[]>([])
  const [treeData, setTreeData] = useState<TreeDataNode[]>([])
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [searchKey, setSearchKey] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('New Department')
  const [submitting, setSubmitting] = useState(false)
  const [editingRecord, setEditingRecord] = useState<OrgNode | null>(null)
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>(undefined)

  const formatTreeNodes = (nodes: any[]): TreeDataNode[] => {
    return nodes.map((node) => ({
      key: node.id || node.key,
      title: node.orgAbr || node.title || node.name,
      icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
      raw: node,
      children: node.children && node.children.length > 0 ? formatTreeNodes(node.children) : undefined,
    }))
  }

  const fetchOrgTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<any>(`${ENDPOINTS.USER.LIST.replace('/user/list', '/organization/getOrganizationTree')}`)
      if (res) {
        const orgs = Array.isArray(res) ? res : res.data || []
        setRawOrgs(orgs)
        const formatted = formatTreeNodes(orgs)
        setTreeData(formatted)
        if (formatted.length > 0 && !selectedNode) {
          setSelectedNode(formatted[0])
          inspectorForm.setFieldsValue({
            orgAbr: (formatted[0] as any).raw?.orgAbr || formatted[0].title,
            sort: (formatted[0] as any).raw?.sort || 1,
          })
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch organization tree')
    } finally {
      setLoading(false)
    }
  }, [message, selectedNode, inspectorForm])

  useEffect(() => {
    fetchOrgTree()
  }, [fetchOrgTree])

  const handleOpenAdd = (parentId?: number) => {
    setEditingRecord(null)
    setSelectedParentId(parentId)
    setModalTitle(parentId ? 'New Sub-Department' : 'New Parent Organization')
    form.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (record: OrgNode) => {
    setEditingRecord(record)
    setModalTitle('Edit Department')
    form.setFieldsValue({
      orgAbr: record.orgAbr || record.title,
      sort: record.sort || 1,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await http.delete(`${ENDPOINTS.USER.LIST.replace('/user/list', '/organization/delete')}?id=${id}`)
      message.success('Department deleted successfully')
      if (selectedNode?.key === id) {
        setSelectedNode(null)
      }
      fetchOrgTree()
    } catch (err: any) {
      message.error(err.message || 'Failed to delete department')
    }
  }

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload = {
        ...values,
        parentId: selectedParentId || 0,
        id: editingRecord?.id,
      }

      if (editingRecord?.id) {
        await http.put(`${ENDPOINTS.USER.LIST.replace('/user/list', '/organization/update')}`, payload)
        message.success('Department updated successfully')
      } else {
        await http.post(`${ENDPOINTS.USER.LIST.replace('/user/list', '/organization/add')}`, payload)
        message.success('Department created successfully')
      }

      setModalOpen(false)
      fetchOrgTree()
    } catch (err: any) {
      if (err.errorFields) return
      message.error(err.message || 'Failed to save department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInspectorSave = async () => {
    if (!selectedNode) return
    try {
      const values = await inspectorForm.validateFields()
      setSubmitting(true)
      const payload = {
        ...values,
        id: selectedNode.key,
        parentId: selectedNode.raw?.parentId || 0,
      }
      await http.put(`${ENDPOINTS.USER.LIST.replace('/user/list', '/organization/update')}`, payload)
      message.success('Department details updated successfully')
      fetchOrgTree()
    } catch (err: any) {
      if (err.errorFields) return
      message.error(err.message || 'Failed to update department')
    } finally {
      setSubmitting(false)
    }
  }

  const onSelectNode = (selectedKeys: React.Key[], info: any) => {
    if (info.node) {
      setSelectedNode(info.node)
      inspectorForm.setFieldsValue({
        orgAbr: info.node.raw?.orgAbr || info.node.title,
        sort: info.node.raw?.sort || 1,
      })
    }
  }

  const renderTreeTitle = (node: any) => {
    const isSelected = selectedNode?.key === node.key
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderRadius: 6,
          background: isSelected ? '#f0f5ff' : 'transparent',
        }}
      >
        <Space size="small">
          <Text strong style={{ color: isSelected ? '#1677ff' : 'inherit' }}>
            {node.title}
          </Text>
          {node.children && node.children.length > 0 && (
            <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, padding: '0 6px' }}>
              {node.children.length} sub-units
            </Tag>
          )}
        </Space>
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined style={{ color: '#52c41a' }} />}
            onClick={() => handleOpenAdd(node.key)}
            title="Add Sub-Department"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#1677ff' }} />}
            onClick={() => handleOpenEdit({ id: node.key, key: node.key, title: node.title, orgAbr: node.title })}
            title="Edit Department"
          />
          <Popconfirm
            title="Delete Department"
            description="Are you sure you want to delete this department node?"
            onConfirm={() => handleDelete(node.key)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger type="text" size="small" icon={<DeleteOutlined />} title="Delete" />
          </Popconfirm>
        </Space>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Banner */}
      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,21,41,0.04)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 22,
                }}
              >
                <BranchesOutlined />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Organization & Department Hierarchy
                </Title>
                <Text type="secondary">
                  Manage parent-child corporate structures, multi-level business units, and department trees.
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchOrgTree()} loading={loading}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenAdd(0)}>
                New Root Organization
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Split View Content */}
      <Row gutter={16}>
        {/* Left Tree Explorer */}
        <Col xs={24} lg={10}>
          <Card
            title="Department Tree Explorer"
            variant="borderless"
            style={{ borderRadius: 8, height: '100%', boxShadow: '0 1px 4px rgba(0,21,41,0.04)' }}
            extra={
              <Input.Search
                placeholder="Search units..."
                size="small"
                allowClear
                style={{ width: 140 }}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
              />
            }
          >
            {loading ? (
              <div style={{ padding: 36, textAlign: 'center' }}>Loading Corporate Structure...</div>
            ) : treeData.length > 0 ? (
              <Tree
                showLine={{ showLeafIcon: false }}
                defaultExpandAll
                treeData={treeData}
                titleRender={renderTreeTitle}
                onSelect={onSelectNode}
                selectedKeys={selectedNode ? [selectedNode.key] : []}
                style={{ background: 'transparent' }}
              />
            ) : (
              <Empty description="No departments defined yet. Click 'New Root Organization' to create one." />
            )}
          </Card>
        </Col>

        {/* Right Inspector & Node Editor */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <span>Department Details & Settings</span>
              </Space>
            }
            variant="borderless"
            style={{ borderRadius: 8, height: '100%', boxShadow: '0 1px 4px rgba(0,21,41,0.04)' }}
          >
            {selectedNode ? (
              <div>
                <Breadcrumb
                  items={[
                    { title: 'Corporate Root' },
                    { title: selectedNode.raw?.parentName || 'Parent Org' },
                    { title: <strong>{selectedNode.title}</strong> },
                  ]}
                  style={{ marginBottom: 20 }}
                />

                <Form form={inspectorForm} layout="vertical" onFinish={handleInspectorSave}>
                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item
                        name="orgAbr"
                        label="Department / Unit Name"
                        rules={[{ required: true, message: 'Please enter department name' }]}
                      >
                        <Input size="large" placeholder="e.g. Sales & Distribution Division" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="sort" label="Display Order">
                        <InputNumber size="large" min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '16px 0' }} />

                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space size="middle">
                        <Tag color="blue">Node ID: {selectedNode.key}</Tag>
                        <Tag color="cyan">
                          Children: {selectedNode.children ? selectedNode.children.length : 0} units
                        </Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => handleOpenAdd(selectedNode.key)}
                        >
                          Add Child Unit
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                          Save Changes
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Form>
              </div>
            ) : (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Empty description="Select a department unit from the left tree to inspect and edit details." />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal Dialog */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleModalSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={440}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="orgAbr"
            label="Department / Org Name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="e.g. Sales Department, Finance Team, R&D" />
          </Form.Item>

          <Form.Item name="sort" label="Display Order / Sort Index" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
