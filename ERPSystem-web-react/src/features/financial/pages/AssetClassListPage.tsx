import React, { useEffect, useState, useCallback } from 'react'
import { Table, Button, Card, Row, Col, Input, Select, Tag, Space, Modal, message, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { AssetClassDTO, fixedAssetApi } from '../api/fixedAssetApi'
import { AssetClassModal } from '../components/AssetClassModal'

export const AssetClassListPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<AssetClassDTO[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [searchKey, setSearchKey] = useState('')

  const [modalVisible, setModalVisible] = useState(false)
  const [editingClass, setEditingClass] = useState<AssetClassDTO | null>(null)

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true)
      const res: any = await fixedAssetApi.getClassList({
        status,
        searchKey: searchKey.trim() || undefined,
        currentPage,
        pageSize,
      })
      const rows = res?.rows || res?.data?.rows || []
      const count = res?.total || res?.data?.total || 0
      setClasses(rows)
      setTotal(count)
    } catch (e: any) {
      message.error(e?.message || 'Failed to load asset classes')
    } finally {
      setLoading(false)
    }
  }, [status, searchKey, currentPage, pageSize])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const handleDelete = (cls: AssetClassDTO) => {
    Modal.confirm({
      title: `Delete Asset Class: ${cls.className}?`,
      content: 'This will remove the asset class if no fixed assets are linked to it.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await fixedAssetApi.deleteClass(cls.id!)
          message.success('Asset class deleted')
          loadClasses()
        } catch (e: any) {
          message.error(e?.message || 'Delete failed')
        }
      },
    })
  }

  const columns = [
    {
      title: 'Class Code',
      dataIndex: 'classCode',
      key: 'classCode',
      render: (code: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{code}</span>,
    },
    {
      title: 'Class Name',
      dataIndex: 'className',
      key: 'className',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Schedule II Category',
      dataIndex: 'scheduleIiCategory',
      key: 'scheduleIiCategory',
      render: (cat: string) => <Tag color="geekblue">{cat}</Tag>,
    },
    {
      title: 'Useful Life',
      dataIndex: 'usefulLifeMonths',
      key: 'usefulLifeMonths',
      render: (m: number) => `${m} mos (${(m / 12).toFixed(1)} yrs)`,
    },
    {
      title: 'Default Residual %',
      dataIndex: 'defaultResidualPercentage',
      key: 'defaultResidualPercentage',
      render: (p: number) => `${p || 5}%`,
    },
    {
      title: 'Method',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      render: (m: string) => <Tag color="cyan">{m || 'SLM'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'success' : 'default'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AssetClassDTO) => (
        <Space size="small">
          <Tooltip title="Edit Class">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingClass(record)
                setModalVisible(true)
              }}
            />
          </Tooltip>
          <Tooltip title="Delete Class">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Asset Classes (Schedule II Classification)"
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/financial/fixed-assets')}>
              Back to Register
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingClass(null)
                setModalVisible(true)
              }}
            >
              New Asset Class
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="Search Code or Name..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={loadClasses}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              allowClear
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              value={status}
              onChange={(v) => setStatus(v)}
            >
              <Select.Option value="ACTIVE">ACTIVE</Select.Option>
              <Select.Option value="INACTIVE">INACTIVE</Select.Option>
            </Select>
          </Col>
          <Col span={10} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadClasses}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={classes}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setCurrentPage(p)
              setPageSize(s)
            },
          }}
        />
      </Card>

      <AssetClassModal
        visible={modalVisible}
        editingClass={editingClass}
        onClose={() => setModalVisible(false)}
        onSuccess={loadClasses}
      />
    </div>
  )
}
