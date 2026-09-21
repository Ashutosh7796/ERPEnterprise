import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Tag,
  Row,
  Col,
  message,
  Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  EyeOutlined,
  DiffOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { http } from '@core/api/client'
import { GoodsReceiptCreateModal } from '../components/GoodsReceiptCreateModal'
import { ThreeWayMatchViewerModal } from '../components/ThreeWayMatchViewerModal'
import { DocumentFlowModal } from '@/features/bill/components/DocumentFlowModal'

const { RangePicker } = DatePicker

export const GoodsReceiptListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [selectedPoForMatch, setSelectedPoForMatch] = useState<{ id: number; number: string; grnId?: number } | null>(null)

  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [flowDoc, setFlowDoc] = useState<{ id: number; type: string; number: string } | null>(null)

  const fetchGoodsReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: any = {
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
        type: '入库',
        subType: '采购入库',
      }

      if (values.number) params.number = values.number
      if (values.dateRange && values.dateRange.length === 2) {
        params.beginTime = dayjs(values.dateRange[0]).format('YYYY-MM-DD 00:00:00')
        params.endTime = dayjs(values.dateRange[1]).format('YYYY-MM-DD 23:59:59')
      }

      const res: any = await http.get('/depotHead/list', { params })
      if (res && res.code === 200) {
        setDataSource(res.data?.rows || [])
        setPagination((prev) => ({ ...prev, total: res.data?.total || 0 }))
      } else {
        setDataSource([])
      }
    } catch (err: any) {
      message.error('Failed to load goods receipts: ' + (err.message || 'Server error'))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, form])

  useEffect(() => {
    fetchGoodsReceipts()
  }, [fetchGoodsReceipts])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchGoodsReceipts()
  }

  const handleReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchGoodsReceipts()
  }

  const columns: TableColumnsType<any> = [
    {
      title: 'GRN Number',
      dataIndex: 'number',
      key: 'number',
      render: (num: string, record: any) => (
        <a
          onClick={() => {
            setFlowDoc({ id: record.id, type: 'PURCHASE_INBOUND', number: num })
            setFlowModalOpen(true)
          }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'PO Reference',
      dataIndex: 'linkNumber',
      key: 'linkNumber',
      render: (linkNum: string) => (linkNum ? <Tag color="blue">{linkNum}</Tag> : '-'),
    },
    {
      title: 'Supplier',
      dataIndex: 'organName',
      key: 'organName',
    },
    {
      title: 'Depot / Warehouse',
      dataIndex: 'depotName',
      key: 'depotName',
      render: (name: string) => name || 'Main Warehouse',
    },
    {
      title: 'Receipt Date',
      dataIndex: 'operTime',
      key: 'operTime',
      render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Total Receipt Value',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      render: (amt: number) => `₹${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'QC & Inward Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          POSTED & STOCKED
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 200,
      render: (_, record: any) => {
        return (
          <Space size="small">
            {/* 3-Way Match Viewer */}
            <Tooltip title="Evaluate Three-Way Match (PO vs GRN vs Invoice)">
              <Button
                size="small"
                type="primary"
                icon={<DiffOutlined />}
                onClick={() => {
                  setSelectedPoForMatch({
                    id: record.linkId || record.id,
                    number: record.linkNumber || record.number,
                    grnId: record.id,
                  })
                  setMatchModalOpen(true)
                }}
              >
                3-Way Match
              </Button>
            </Tooltip>

            {/* Document Flow / Lineage DAG */}
            <Tooltip title="View Upstream & Downstream Flow">
              <Button
                size="small"
                icon={<BranchesOutlined />}
                onClick={() => {
                  setFlowDoc({ id: record.id, type: 'PURCHASE_INBOUND', number: record.number })
                  setFlowModalOpen(true)
                }}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 16 }}>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="number" label="GRN Number" style={{ width: '100%', margin: 0 }}>
                <Input placeholder="Enter GRN Number..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item name="dateRange" label="Date Range" style={{ width: '100%', margin: 0 }}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create GRN from PO
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Total ${total} Goods Receipts`,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total })
            },
          }}
        />
      </Card>

      {/* Create GRN Modal */}
      <GoodsReceiptCreateModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          fetchGoodsReceipts()
        }}
      />

      {/* Three-Way Match Viewer Modal */}
      <ThreeWayMatchViewerModal
        visible={matchModalOpen}
        poId={selectedPoForMatch?.id || null}
        poNumber={selectedPoForMatch?.number || ''}
        grnId={selectedPoForMatch?.grnId}
        onClose={() => {
          setMatchModalOpen(false)
          setSelectedPoForMatch(null)
        }}
      />

      {/* Document Flow DAG Modal */}
      {flowDoc && (
        <DocumentFlowModal
          open={flowModalOpen}
          docType={flowDoc.type}
          docId={flowDoc.id}
          docNumber={flowDoc.number}
          onClose={() => {
            setFlowModalOpen(false)
            setFlowDoc(null)
          }}
        />
      )}
    </div>
  )
}
