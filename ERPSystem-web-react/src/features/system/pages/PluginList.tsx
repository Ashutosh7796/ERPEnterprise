import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Upload,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  UploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { http } from '@core/api/client'
import { ExportPrintButtons } from '@shared/components/ExportPrintButtons'

export interface PluginRecord {
  id: string
  pluginDescriptor?: {
    pluginId: string
    pluginDescription?: string
    version?: string
    provider?: string
  }
  pluginState?: string // STARTED, STOPPED
}

export const PluginListPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PluginRecord[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await http.get('/plugin/list', { currentPage: 1, pageSize: 100 })
      const rows = Array.isArray(res) ? res : res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : [])
      setDataSource(rows)
    } catch (err: any) {
      console.error('Failed to load plugins:', err)
      message.error(err?.message || 'Failed to load plugin list.')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStartPlugin = async (pluginId: string) => {
    try {
      await http.post(`/plugin/start/${pluginId}`)
      message.success(`Plugin ${pluginId} started successfully`)
      fetchData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to start plugin')
    }
  }

  const handleStopPlugin = async (pluginId: string) => {
    try {
      await http.post(`/plugin/stop/${pluginId}`)
      message.success(`Plugin ${pluginId} stopped successfully`)
      fetchData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to stop plugin')
    }
  }

  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      await http.post(`/plugin/uninstall/${pluginId}`)
      message.success(`Plugin ${pluginId} uninstalled`)
      fetchData()
    } catch (err: any) {
      message.error(err?.message || 'Failed to uninstall plugin')
    }
  }

  const columns: TableColumnsType<PluginRecord> = [
    {
      title: '#',
      key: 'rowIndex',
      width: 50,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const pluginId = record.pluginDescriptor?.pluginId || record.id
        const isStarted = record.pluginState === 'STARTED'

        return (
          <Space size="middle">
            {isStarted ? (
              <Popconfirm title="Stop this plugin?" onConfirm={() => handleStopPlugin(pluginId)}>
                <a style={{ color: '#fa8c16' }}>Stop</a>
              </Popconfirm>
            ) : (
              <Popconfirm title="Start this plugin?" onConfirm={() => handleStartPlugin(pluginId)}>
                <a style={{ color: '#52c41a' }}>Start</a>
              </Popconfirm>
            )}
            <Popconfirm title="Uninstall this plugin permanently?" onConfirm={() => handleUninstallPlugin(pluginId)}>
              <a style={{ color: '#ff4d4f' }}>Uninstall</a>
            </Popconfirm>
          </Space>
        )
      },
    },
    {
      title: 'Plugin Name',
      key: 'name',
      width: 180,
      render: (_, record) => {
        const desc = record.pluginDescriptor?.pluginDescription || ''
        return desc.split('|')[0] || record.pluginDescriptor?.pluginId || 'Plugin'
      },
    },
    {
      title: 'Plugin Identifier (ID)',
      key: 'pluginId',
      width: 200,
      render: (_, record) => record.pluginDescriptor?.pluginId || record.id,
    },
    {
      title: 'Version',
      key: 'version',
      width: 100,
      render: (_, record) => record.pluginDescriptor?.version || '1.0.0',
    },
    {
      title: 'Author / Provider',
      key: 'provider',
      width: 140,
      render: (_, record) => record.pluginDescriptor?.provider || 'Enterprise System',
    },
    {
      title: 'Status',
      dataIndex: 'pluginState',
      key: 'pluginState',
      width: 90,
      align: 'center',
      render: (val) => (
        <Tag color={val === 'STARTED' ? 'green' : 'orange'}>{val === 'STARTED' ? 'Running' : 'Stopped'}</Tag>
      ),
    },
  ]

  return (
    <Card variant="borderless" style={{ borderRadius: 6, width: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Upload
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }: any) => {
              const formData = new FormData()
              formData.append('file', file)
              try {
                await http.post('/plugin/uploadInstallPluginJar', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                })
                message.success('Plugin JAR package uploaded and started successfully!')
                onSuccess?.('ok')
                fetchData()
              } catch (err: any) {
                message.error(err?.message || 'Failed to upload plugin')
                onError?.(err)
              }
            }}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              Upload Plugin Package (.jar)
            </Button>
          </Upload>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
        </Space>
        <ExportPrintButtons title="System Installed Plugins" columns={columns as any} dataSource={dataSource} />
      </div>

      <Table
        rowKey={(r) => r.pluginDescriptor?.pluginId || r.id}
        bordered
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
      />
    </Card>
  )
}
