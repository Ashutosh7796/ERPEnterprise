import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Space,
  Statistic,
  Modal,
  message,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  PieChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { FixedAssetDTO, AssetClassDTO, fixedAssetApi } from '../api/fixedAssetApi'
import { FixedAssetModal } from '../components/FixedAssetModal'
import { AssetDisposalModal } from '../components/AssetDisposalModal'

export const FixedAssetListPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<FixedAssetDTO[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filters
  const [classes, setClasses] = useState<AssetClassDTO[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [searchKey, setSearchKey] = useState('')

  // Modals
  const [assetModalVisible, setAssetModalVisible] = useState(false)
  const [editingAsset, setEditingAsset] = useState<FixedAssetDTO | null>(null)
  const [disposalModalVisible, setDisposalModalVisible] = useState(false)
  const [disposingAsset, setDisposingAsset] = useState<FixedAssetDTO | null>(null)

  // Summary KPIs
  const totalGrossCost = assets.reduce((acc, a) => acc + (Number(a.grossCost) || 0), 0)
  const totalAccumDep = assets.reduce((acc, a) => acc + (Number(a.accumulatedDepreciation) || 0), 0)
  const totalNetBookValue = assets.reduce((acc, a) => acc + (Number(a.netBookValue) || 0), 0)

  const loadClasses = async () => {
    try {
      const res: any = await fixedAssetApi.getAllClasses('ACTIVE')
      const data = Array.isArray(res) ? res : res?.data || []
      setClasses(data)
    } catch (e) {
      console.error('Failed to load asset classes', e)
    }
  }

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true)
      const res: any = await fixedAssetApi.getList({
        assetClassId: selectedClassId,
        status: selectedStatus,
        searchKey: searchKey.trim() || undefined,
        currentPage,
        pageSize,
      })
      const rows = res?.rows || res?.data?.rows || []
      const count = res?.total || res?.data?.total || 0
      setAssets(rows)
      setTotal(count)
    } catch (e: any) {
      message.error(e?.message || 'Failed to load fixed assets')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, selectedStatus, searchKey, currentPage, pageSize])

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    if (selectedClassId) params.append('assetClassId', String(selectedClassId))
    if (selectedStatus) params.append('status', selectedStatus)
    if (searchKey) params.append('searchKey', searchKey)
    window.open(`/api/fixedAsset/report/export-far-csv?${params.toString()}`, '_blank')
  }

  const handleDelete = (asset: FixedAssetDTO) => {
    if (asset.status !== 'DRAFT') {
      message.warning('Only DRAFT assets can be deleted')
      return
    }
    Modal.confirm({
      title: `Delete Draft Asset: ${asset.assetCode}?`,
      content: 'This will remove the uncapitalized draft record permanently.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await fixedAssetApi.delete(asset.id!)
          message.success('Draft asset deleted')
          loadAssets()
        } catch (e: any) {
          message.error(e?.message || 'Delete failed')
        }
      },
    })
  }

  const columns = [
    {
      title: 'Asset Tag',
      dataIndex: 'assetCode',
      key: 'assetCode',
      render: (code: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{code}</span>,
    },
    {
      title: 'Asset Description',
      dataIndex: 'assetName',
      key: 'assetName',
      render: (name: string, record: FixedAssetDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.serialNumber && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>S/N: {record.serialNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'assetClassName',
      key: 'assetClassName',
      render: (className: string, record: FixedAssetDTO) => {
        const cls = classes.find((c) => c.id === record.assetClassId)
        return <Tag color="blue">{cls ? cls.className : className || 'Unassigned'}</Tag>
      },
    },
    {
      title: 'Put to Use',
      dataIndex: 'capitalizationDate',
      key: 'capitalizationDate',
      render: (d: string) => d ? d.substring(0, 10) : <span style={{ color: '#bbb' }}>Pending</span>,
    },
    {
      title: 'Gross Cost (₹)',
      dataIndex: 'grossCost',
      key: 'grossCost',
      align: 'right' as const,
      render: (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Accum. Dep (₹)',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: '#fa8c16' }}>
          {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Net Book Value (₹)',
      dataIndex: 'netBookValue',
      key: 'netBookValue',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: '#52c41a' }}>
          {Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default'
        if (status === 'ACTIVE') color = 'success'
        if (status === 'DRAFT') color = 'processing'
        if (status === 'FULLY_DEPRECIATED') color = 'warning'
        if (status === 'DISPOSED') color = 'error'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string, record: FixedAssetDTO) => (
        <span style={{ fontSize: 12 }}>
          {loc || '-'} {record.department ? `(${record.department})` : ''}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FixedAssetDTO) => (
        <Space orientation="horizontal" size="small">
          <Tooltip title="Edit Asset Metadata">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingAsset(record)
                setAssetModalVisible(true)
              }}
            />
          </Tooltip>
          {record.status === 'ACTIVE' && (
            <Tooltip title="Dispose / Derecognize Asset">
              <Button
                type="text"
                danger
                icon={<DollarOutlined />}
                onClick={() => {
                  setDisposingAsset(record)
                  setDisposalModalVisible(true)
                }}
              />
            </Tooltip>
          )}
          {record.status === 'DRAFT' && (
            <Tooltip title="Delete Draft">
              <Button
                type="text"
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
    <div style={{ padding: 24 }}>
      {/* Top Header Card with Summary KPIs */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col span={6}>
            <Statistic title="Total Fixed Assets" value={total} prefix={<PieChartOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="Gross Cost (Carrying)"
              value={totalGrossCost}
              precision={2}
              prefix="₹"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Accumulated Depreciation"
              value={totalAccumDep}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Net Book Value (PPE)"
              value={totalNetBookValue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Workspace Card */}
      <Card
        title="Fixed Asset Register (FAR)"
        extra={
          <Space>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => navigate('/financial/fixed-assets/depreciation')}
            >
              Depreciation Cockpit
            </Button>
            <Button
              icon={<PieChartOutlined />}
              onClick={() => navigate('/financial/fixed-assets/schedule-iii')}
            >
              Schedule III PPE Report
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              Export FAR CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingAsset(null)
                setAssetModalVisible(true)
              }}
            >
              Register Asset
            </Button>
          </Space>
        }
      >
        {/* Filter Bar */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input
              placeholder="Search Tag, Name, S/N..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={loadAssets}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              allowClear
              placeholder="Filter by Asset Class"
              style={{ width: '100%' }}
              value={selectedClassId}
              onChange={(v) => setSelectedClassId(v)}
            >
              {classes.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.classCode} - {c.className}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              allowClear
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              value={selectedStatus}
              onChange={(v) => setSelectedStatus(v)}
            >
              <Select.Option value="ACTIVE">ACTIVE</Select.Option>
              <Select.Option value="DRAFT">DRAFT</Select.Option>
              <Select.Option value="FULLY_DEPRECIATED">FULLY DEPRECIATED</Select.Option>
              <Select.Option value="DISPOSED">DISPOSED</Select.Option>
            </Select>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadAssets}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={assets}
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

      {/* Asset Create/Edit Modal */}
      <FixedAssetModal
        visible={assetModalVisible}
        editingAsset={editingAsset}
        onClose={() => setAssetModalVisible(false)}
        onSuccess={loadAssets}
      />

      {/* Asset Disposal Dialog */}
      <AssetDisposalModal
        visible={disposalModalVisible}
        asset={disposingAsset}
        onClose={() => setDisposalModalVisible(false)}
        onSuccess={loadAssets}
      />
    </div>
  )
}
