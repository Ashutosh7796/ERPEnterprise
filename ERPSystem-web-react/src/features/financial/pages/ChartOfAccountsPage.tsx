import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  message,
  Tooltip,
  Typography,
  Badge,
  Radio,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { accountCoaApi, AccountCoaNodeDTO } from '../api/accountCoaApi'
import { AccountCoaModal } from '../components/AccountCoaModal'

const { Title, Text } = Typography

const ROOT_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  ASSET: { color: 'blue', label: '1. Asset' },
  LIABILITY: { color: 'orange', label: '2. Liability' },
  EQUITY: { color: 'purple', label: '3. Equity' },
  INCOME: { color: 'green', label: '4. Revenue' },
  EXPENSE: { color: 'magenta', label: '5. Expense' },
}

export const ChartOfAccountsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [treeData, setTreeData] = useState<AccountCoaNodeDTO[]>([])
  const [flatData, setFlatData] = useState<AccountCoaNodeDTO[]>([])
  const [searchKey, setSearchKey] = useState<string>('')
  const [selectedRootType, setSelectedRootType] = useState<string>('ALL')
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([])

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false)
  const [editingNode, setEditingNode] = useState<Partial<AccountCoaNodeDTO> | null>(null)

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true)
      const data: any = await accountCoaApi.getTree()
      const treeList: AccountCoaNodeDTO[] = Array.isArray(data) ? data : data?.data || []
      setTreeData(treeList)

      // Flatten tree for select dropdowns & stats
      const flat: AccountCoaNodeDTO[] = []
      const flatten = (nodes: AccountCoaNodeDTO[]) => {
        for (const node of nodes) {
          flat.push(node)
          if (node.children && node.children.length > 0) {
            flatten(node.children)
          }
        }
      }
      flatten(treeList)
      setFlatData(flat)

      // Expand root groups by default
      const rootKeys = treeList.map((n) => n.id as number).filter(Boolean)
      setExpandedRowKeys(rootKeys)
    } catch (err: any) {
      message.error(err?.message || 'Network error fetching Chart of Accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  // Filtered Tree View
  const filteredTreeData = useMemo(() => {
    let result = treeData

    if (selectedRootType !== 'ALL') {
      result = result.filter((node) => node.rootType === selectedRootType)
    }

    if (searchKey.trim()) {
      const q = searchKey.trim().toLowerCase()
      const filterNode = (node: AccountCoaNodeDTO): AccountCoaNodeDTO | null => {
        const match =
          node.accountCode.toLowerCase().includes(q) ||
          node.accountName.toLowerCase().includes(q) ||
          node.accountType.toLowerCase().includes(q)

        let matchingChildren: AccountCoaNodeDTO[] = []
        if (node.children && node.children.length > 0) {
          matchingChildren = node.children
            .map(filterNode)
            .filter((c): c is AccountCoaNodeDTO => c !== null)
        }

        if (match || matchingChildren.length > 0) {
          return {
            ...node,
            children: matchingChildren.length > 0 ? matchingChildren : node.children,
          }
        }
        return null
      }

      result = result.map(filterNode).filter((n): n is AccountCoaNodeDTO => n !== null)
    }

    return result
  }, [treeData, selectedRootType, searchKey])

  const handleExpandAll = () => {
    const allKeys = flatData.filter((n) => n.isGroup === '1').map((n) => n.id as number).filter(Boolean)
    setExpandedRowKeys(allKeys)
  }

  const handleCollapseAll = () => {
    setExpandedRowKeys([])
  }

  const handleAdd = (parentNode?: AccountCoaNodeDTO) => {
    setEditingNode({
      parentId: parentNode ? parentNode.id : null,
      rootType: parentNode ? parentNode.rootType : 'ASSET',
      isGroup: '0',
      status: 'ACTIVE',
    })
    setModalVisible(true)
  }

  const handleEdit = (node: AccountCoaNodeDTO) => {
    setEditingNode(node)
    setModalVisible(true)
  }

  const handleDelete = (node: AccountCoaNodeDTO) => {
    Modal.confirm({
      title: `Delete Account [${node.accountCode}]?`,
      content: `Are you sure you want to delete "${node.accountName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          if (node.id) {
            await accountCoaApi.deleteNode(node.id)
            message.success('Account deleted successfully')
            fetchTree()
          }
        } catch (err: any) {
          message.error(err?.message || 'Delete operation failed')
        }
      },
    })
  }

  const parentOptions = useMemo(() => {
    return flatData
      .filter((n) => n.isGroup === '1' && n.id != null)
      .map((n) => ({
        id: n.id as number,
        accountCode: n.accountCode,
        accountName: n.accountName,
        rootType: n.rootType,
      }))
  }, [flatData])

  const columns: ColumnsType<AccountCoaNodeDTO> = [
    {
      title: 'Account Code & Title',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 380,
      render: (_, record) => {
        const isGrp = record.isGroup === '1'
        return (
          <Space size="small">
            {isGrp ? (
              <FolderOutlined style={{ color: '#1677ff', fontSize: '15px' }} />
            ) : (
              <FileTextOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
            )}
            <Text
              strong={isGrp}
              style={{
                fontSize: isGrp ? '14px' : '13px',
                color: isGrp ? '#1f1f1f' : '#434343',
              }}
            >
              <span style={{ fontFamily: 'monospace', color: '#0958d9', marginRight: '8px' }}>
                [{record.accountCode}]
              </span>
              {record.accountName}
            </Text>
            {record.isSystem === '1' && (
              <Tooltip title="Statutory Schedule III System Account (Protected)">
                <Tag color="default" style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px' }}>
                  Statutory
                </Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Classification',
      dataIndex: 'rootType',
      key: 'rootType',
      width: 140,
      render: (val: string) => {
        const conf = ROOT_TYPE_CONFIG[val] || { color: 'default', label: val }
        return <Tag color={conf.color}>{conf.label}</Tag>
      },
    },
    {
      title: 'Account Type',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 180,
      render: (val: string) => (
        <span style={{ fontSize: '12px', color: '#595959', fontFamily: 'monospace' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Normal Balance',
      dataIndex: 'normalBalance',
      key: 'normalBalance',
      width: 130,
      render: (val: string) => (
        <Tag color={val === 'DEBIT' ? 'blue' : 'gold'}>
          {val === 'DEBIT' ? 'Dr (Debit)' : 'Cr (Credit)'}
        </Tag>
      ),
    },
    {
      title: 'Posting Nature',
      dataIndex: 'isGroup',
      key: 'isGroup',
      width: 140,
      render: (val: string) =>
        val === '1' ? (
          <Badge status="processing" text="Group / Folder" />
        ) : (
          <Badge status="success" text="Leaf Ledger" />
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: string) =>
        val === 'ACTIVE' ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Active
          </Tag>
        ) : (
          <Tag icon={<StopOutlined />} color="error">
            Inactive
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          {record.isGroup === '1' && (
            <Tooltip title="Add Sub-Account under this group">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined style={{ color: '#1677ff' }} />}
                onClick={() => handleAdd(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit Account">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#fa8c16' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.isSystem !== '1' && (
            <Tooltip title="Delete Account">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px' }}>
      <Card
        title={
          <Space align="center" size="middle">
            <ApartmentOutlined style={{ fontSize: '20px', color: '#1677ff' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Chart of Accounts (Schedule III)
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Indian Companies Act 2013 Hierarchical General Ledger Master
              </Text>
            </div>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={handleExpandAll}>Expand All</Button>
            <Button onClick={handleCollapseAll}>Collapse All</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchTree}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd()}>
              Add Account
            </Button>
          </Space>
        }
      >
        {/* Filters & Search Toolbar */}
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Radio.Group
            value={selectedRootType}
            onChange={(e) => setSelectedRootType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="ALL">All Heads ({flatData.length})</Radio.Button>
            <Radio.Button value="ASSET">
              1. Assets ({flatData.filter((n) => n.rootType === 'ASSET').length})
            </Radio.Button>
            <Radio.Button value="LIABILITY">
              2. Liabilities ({flatData.filter((n) => n.rootType === 'LIABILITY').length})
            </Radio.Button>
            <Radio.Button value="EQUITY">
              3. Equity ({flatData.filter((n) => n.rootType === 'EQUITY').length})
            </Radio.Button>
            <Radio.Button value="INCOME">
              4. Revenue ({flatData.filter((n) => n.rootType === 'INCOME').length})
            </Radio.Button>
            <Radio.Button value="EXPENSE">
              5. Expenses ({flatData.filter((n) => n.rootType === 'EXPENSE').length})
            </Radio.Button>
          </Radio.Group>

          <Input
            placeholder="Search code or account title..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            style={{ width: 280 }}
          />
        </div>

        {/* Tree Table */}
        <Table<AccountCoaNodeDTO>
          rowKey="id"
          columns={columns}
          dataSource={filteredTreeData}
          loading={loading}
          pagination={false}
          size="middle"
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
            rowExpandable: (record) => !!record.children && record.children.length > 0,
          }}
          bordered
        />
      </Card>

      {/* Add / Edit Modal */}
      <AccountCoaModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false)
          fetchTree()
        }}
        initialValues={editingNode}
        parentOptions={parentOptions}
      />
    </div>
  )
}
