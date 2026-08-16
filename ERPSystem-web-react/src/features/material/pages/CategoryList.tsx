import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Tree,
  TreeSelect,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Dropdown,
  Alert,
  Empty,
  Modal,
  Popconfirm,
  message,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'

export const CategoryListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [addModalForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [categoryTree, setCategoryTree] = useState<any[]>([])
  const [allTreeKeys, setAllTreeKeys] = useState<React.Key[]>([])
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [autoExpandParent, setAutoExpandParent] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])
  const [checkStrictly, setCheckStrictly] = useState(true)
  const [currSelected, setCurrSelected] = useState<any | null>(null)

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addingSubmitting, setAddingSubmitting] = useState(false)
  const [savingRightForm, setSavingRightForm] = useState(false)

  // Recursively collect all keys
  const collectKeys = (nodes: any[], keys: React.Key[] = []): React.Key[] => {
    for (const node of nodes) {
      keys.push(node.key || node.id)
      if (node.children && node.children.length > 0) {
        collectKeys(node.children, keys)
      }
    }
    return keys
  }

  // Format nodes for Tree and TreeSelect
  const formatTreeData = (nodes: any[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.key || node.id),
      value: node.id || node.key,
      title: node.title || node.name,
      label: node.title || node.name,
      id: node.id,
      serialNo: node.serialNo,
      parentId: node.parentId,
      sort: node.sort,
      remark: node.remark,
      children: node.children && node.children.length > 0 ? formatTreeData(node.children) : undefined,
    }))
  }

  const selectNode = async (node: any) => {
    const nodeKey = String(node.key || node.id)
    setSelectedKeys([nodeKey])

    try {
      const res = await http.get<any>('/materialCategory/findById', { id: node.id || node.key })
      const data = res?.data || res
      if (data) {
        const item = {
          id: data.id,
          key: String(data.id),
          title: data.name,
          name: data.name,
          serialNo: data.serialNo || '',
          parentId: data.parentId !== 1 && data.parentId !== 0 ? data.parentId : undefined,
          sort: data.sort !== undefined ? data.sort : '',
          remark: data.remark || '',
        }
        setCurrSelected(item)
        form.setFieldsValue({
          name: item.name,
          serialNo: item.serialNo,
          parentId: item.parentId,
          sort: item.sort,
          remark: item.remark,
        })
      }
    } catch (err: any) {
      console.error('Failed to load category details:', err)
    }
  }

  const loadTree = useCallback(async (autoSelectId?: any) => {
    setLoading(true)
    try {
      const res = await http.get<any>('/materialCategory/getMaterialCategoryTree')
      let rawList = Array.isArray(res) ? res : res?.data || []

      // If tree is empty, fallback to getAllList to construct tree
      if (!rawList || rawList.length === 0) {
        try {
          const fallbackRes = await http.get<any>('/materialCategory/getAllList', { parentId: -1 })
          const flatList = Array.isArray(fallbackRes) ? fallbackRes : fallbackRes?.data || []
          if (flatList.length > 0) {
            rawList = flatList.map((item: any) => ({
              id: item.id,
              key: item.id,
              value: item.id,
              title: item.name,
              serialNo: item.serialNo,
              parentId: item.parentId,
              sort: item.sort,
              remark: item.remark,
            }))
          }
        } catch (_) {}
      }

      const formatted = formatTreeData(rawList)
      setCategoryTree(formatted)
      const allKeys = collectKeys(formatted)
      setAllTreeKeys(allKeys)
      setExpandedKeys(allKeys)

      if (formatted.length > 0) {
        const hasValidId = typeof autoSelectId === 'string' || typeof autoSelectId === 'number'
        const targetNode = hasValidId
          ? formatted.find((n) => String(n.id) === String(autoSelectId)) || formatted[0]
          : formatted[0]
        selectNode(targetNode)
      } else {
        handleClearSelected()
      }
    } catch (err: any) {
      console.error('Failed to load category tree:', err)
      message.error(err?.message || 'Failed to load category tree')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  // When clicking a node in the tree
  const handleSelect = async (keys: React.Key[], info: any) => {
    if (keys.length === 0) {
      handleClearSelected()
      return
    }
    selectNode(info.node)
  }

  const handleCheck = (checked: any) => {
    if (checkStrictly) {
      setCheckedKeys(checked.checked || checked)
    } else {
      setCheckedKeys(checked)
    }
  }

  const handleClearSelected = () => {
    setSelectedKeys([])
    setCurrSelected(null)
    form.resetFields()
  }

  // Save changes from the right form
  const handleSaveRightForm = async () => {
    if (!currSelected || !currSelected.id) {
      message.warning('Please select a category first!')
      return
    }
    try {
      const values = await form.validateFields()
      setSavingRightForm(true)
      const payload: any = {
        id: currSelected.id,
        name: values.name,
        serialNo: values.serialNo,
        parentId: values.parentId || undefined,
        sort: values.sort,
        remark: values.remark || '',
      }

      await http.put('/materialCategory/update', payload)
      message.success('Category updated successfully!')
      loadTree(currSelected.id)
    } catch (err: any) {
      message.error(err?.message || 'Failed to update category')
    } finally {
      setSavingRightForm(false)
    }
  }

  // Reset right form to current selected
  const handleResetRightForm = () => {
    if (currSelected) {
      form.setFieldsValue({
        name: currSelected.name,
        serialNo: currSelected.serialNo,
        parentId: currSelected.parentId,
        sort: currSelected.sort,
        remark: currSelected.remark,
      })
    } else {
      form.resetFields()
    }
  }

  // Batch delete checked categories
  const handleBatchDelete = async () => {
    if (checkedKeys.length === 0) {
      message.warning('Please select at least one category!')
      return
    }
    try {
      const ids = checkedKeys.join(',')
      await http.delete(`/materialCategory/deleteBatch?ids=${ids}`)
      message.success('Selected categories deleted successfully!')
      setCheckedKeys([])
      handleClearSelected()
      loadTree()
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete categories')
    }
  }

  // Add Category Modal save
  const handleAddCategory = async () => {
    try {
      const values = await addModalForm.validateFields()
      setAddingSubmitting(true)
      const payload: any = {
        name: values.name,
        serialNo: values.serialNo,
        parentId: values.parentId || undefined,
        sort: values.sort || 1,
        remark: values.remark || '',
      }

      await http.post('/materialCategory/add', payload)
      message.success('Category created successfully!')
      setAddModalOpen(false)
      addModalForm.resetFields()
      loadTree()
    } catch (err: any) {
      message.error(err?.message || 'Failed to create category')
    } finally {
      setAddingSubmitting(false)
    }
  }

  // Tree Action Menu
  const handleTreeAction: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case '1':
        setCheckStrictly(false)
        message.info('Cascade selection enabled (Parent-Child linked)')
        break
      case '2':
        setCheckStrictly(true)
        message.info('Independent selection enabled')
        break
      case '3':
        setCheckedKeys(allTreeKeys)
        break
      case '4':
        setCheckedKeys([])
        break
      case '5':
        setExpandedKeys(allTreeKeys)
        break
      case '6':
        setExpandedKeys([])
        break
    }
  }

  const treeActionMenu: MenuProps = {
    items: [
      {
        key: '1',
        label: 'Cascade Check (Linked)',
      },
      {
        key: '2',
        label: 'Independent Check (Unlinked)',
      },
      { type: 'divider' },
      {
        key: '3',
        label: 'Check All',
      },
      {
        key: '4',
        label: 'Uncheck All',
      },
      { type: 'divider' },
      {
        key: '5',
        label: 'Expand All',
      },
      {
        key: '6',
        label: 'Collapse All',
      },
    ],
    onClick: handleTreeAction,
  }

  return (
    <Row gutter={16} style={{ width: '100%' }}>
      {/* Left Column: Category Tree */}
      <Col xs={24} md={12}>
        <Card variant="borderless" style={{ borderRadius: 6, minHeight: 600 }}>
          {/* Action Toolbar */}
          <Space wrap style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                addModalForm.resetFields()
                if (currSelected && currSelected.id) {
                  addModalForm.setFieldsValue({ parentId: currSelected.id })
                }
                setAddModalOpen(true)
              }}
            >
              Add Category
            </Button>
            <Popconfirm
              title="Delete selected categories?"
              onConfirm={handleBatchDelete}
              disabled={checkedKeys.length === 0}
            >
              <Button icon={<DeleteOutlined />} danger disabled={checkedKeys.length === 0}>
                Batch Delete
              </Button>
            </Popconfirm>
            <Button icon={<ReloadOutlined />} onClick={() => loadTree()}>
              Refresh
            </Button>
            <Dropdown menu={treeActionMenu} trigger={['click']}>
              <Button>
                Tree Action <DownOutlined />
              </Button>
            </Dropdown>
          </Space>

          {/* Current Selection Indicator */}
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={
              <div>
                Current Selection:{' '}
                {currSelected ? (
                  <span>
                    <strong>{currSelected.title || currSelected.name}</strong>
                    <Button
                      type="link"
                      size="small"
                      onClick={handleClearSelected}
                      style={{ marginLeft: 8 }}
                    >
                      Cancel Selection
                    </Button>
                  </span>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>None</span>
                )}
              </div>
            }
          />

          {/* Category Tree */}
          <div style={{ maxHeight: 500, overflowY: 'auto', paddingLeft: 4 }}>
            {categoryTree.length > 0 ? (
              <Tree
                checkable
                checkStrictly={checkStrictly}
                treeData={categoryTree}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                onExpand={(keys) => {
                  setExpandedKeys(keys)
                  setAutoExpandParent(false)
                }}
                selectedKeys={selectedKeys}
                checkedKeys={checkedKeys}
                onSelect={handleSelect}
                onCheck={handleCheck}
              />
            ) : (
              <Empty description="No Categories" style={{ margin: '40px 0' }} />
            )}
          </div>
        </Card>
      </Col>

      {/* Right Column: Category Edit Form */}
      <Col xs={24} md={12}>
        <Card variant="borderless" style={{ borderRadius: 6, minHeight: 600 }}>
          {currSelected ? (
            <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>
                Category Details: {currSelected.title || currSelected.name}
              </div>

              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Please enter category name' }]}
              >
                <Input placeholder="Enter category name..." />
              </Form.Item>

              <Form.Item
                name="serialNo"
                label="Code"
                rules={[{ required: true, message: 'Please enter category code' }]}
              >
                <Input placeholder="Enter category code..." />
              </Form.Item>

              <Form.Item name="parentId" label="Parent Category">
                <TreeSelect
                  style={{ width: '100%' }}
                  styles={{ popup: { root: { maxHeight: 300, overflow: 'auto' } } }}
                  treeData={categoryTree}
                  placeholder="Select parent category (Root if empty)"
                  allowClear
                  treeDefaultExpandAll
                />
              </Form.Item>

              <Form.Item name="sort" label="Order / Sort">
                <InputNumber style={{ width: '100%' }} placeholder="Order number..." />
              </Form.Item>

              <Form.Item name="remark" label="Remarks">
                <Input.TextArea rows={3} placeholder="Category description..." />
              </Form.Item>

              <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
                <Space>
                  <Button icon={<UndoOutlined />} onClick={handleResetRightForm}>
                    Reset
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={savingRightForm}
                    onClick={handleSaveRightForm}
                  >
                    Save
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          ) : (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <Empty description="Please select a category from the tree on the left!" />
            </div>
          )}
        </Card>
      </Col>

      {/* Add Category Modal */}
      <Modal
        title="Add New Category"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAddCategory}
        confirmLoading={addingSubmitting}
        destroyOnHidden
      >
        <Form form={addModalForm} layout="vertical">
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g. Electronics, Clothing..." />
          </Form.Item>

          <Form.Item
            name="serialNo"
            label="Category Code"
            rules={[{ required: true, message: 'Please enter category code' }]}
          >
            <Input placeholder="e.g. CAT-001..." />
          </Form.Item>

          <Form.Item name="parentId" label="Parent Category">
            <TreeSelect
              style={{ width: '100%' }}
              styles={{ popup: { root: { maxHeight: 300, overflow: 'auto' } } }}
              treeData={categoryTree}
              placeholder="Select parent category (Root if empty)"
              allowClear
              treeDefaultExpandAll
            />
          </Form.Item>

          <Form.Item name="sort" label="Sort Order">
            <InputNumber style={{ width: '100%' }} defaultValue={1} />
          </Form.Item>

          <Form.Item name="remark" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  )
}
