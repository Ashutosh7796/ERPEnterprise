import React from 'react'
import { Layout, Button, Dropdown, Space, Avatar, Tooltip, Tag, theme as antdTheme, App } from 'antd'
import type { MenuProps } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  KeyOutlined,
  GlobalOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownCircleOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { Popover, Badge, List, Card } from 'antd'
import { getTenantPendingRequests, approveSupportSession, rejectSupportSession } from '@features/support/api/supportApi'
import { useSSE } from '@features/support/hooks/useSSE'
import { useAppStore } from '@store/useAppStore'
import { useAuthStore } from '@core/auth/authStore'
import { useNavigate } from 'react-router-dom'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'

const { Header: AntHeader } = Layout

export const Header: React.FC = () => {
  const { message, notification } = App.useApp()
  const { token } = antdTheme.useToken()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const {
    collapsed,
    toggleCollapsed,
    platformName,
    themeSettings,
    updateThemeSettings,
    setSettingDrawerVisible,
    setChangePasswordVisible,
    userAuth,
  } = useAppStore()

  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [loadingConsent, setLoadingConsent] = React.useState(false)

  const isTenant = Boolean(userAuth.tenantId && userAuth.tenantId > 0)

  const fetchPendingRequests = async () => {
    try {
      const res: any = await getTenantPendingRequests()
      if (res && res.code === 200) {
        setNotifications(res.data?.requests || [])
      }
    } catch {
      // ignore
    }
  }

  // Real-Time SSE Stream for Customer Tenant
  useSSE({
    url: '/ERPSystem-boot/support/sse/tenant-stream',
    enabled: isTenant,
    onEvent: (eventType, data) => {
      if (eventType === 'SUPPORT_REQUEST' && data?.sessionCode) {
        setNotifications((prev) => {
          if (prev.some((n) => n.sessionCode === data.sessionCode)) return prev
          return [data, ...prev]
        })
        notification.info({
          key: `support_req_${data.sessionCode}`,
          message: 'Support Access Authorization Requested',
          description: (
            <div style={{ marginTop: 4 }}>
              <div><strong>Specialist:</strong> {data.operatorName || 'System Specialist'}</div>
              <div><strong>Scope:</strong> {data.moduleScope || 'ALL_MODULES'} ({data.accessMode || 'APPROVED_WRITE'})</div>
              <div><strong>Justification:</strong> {data.justification}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => {
                    notification.destroy(`support_req_${data.sessionCode}`)
                    handleApproveAccess(data.sessionCode)
                  }}
                >
                  Approve Access
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    notification.destroy(`support_req_${data.sessionCode}`)
                    handleRejectAccess(data.sessionCode)
                  }}
                >
                  Deny
                </Button>
              </div>
            </div>
          ),
          duration: 0,
        })
      } else if (
        eventType === 'SESSION_REVOKED' ||
        eventType === 'SESSION_REJECTED' ||
        eventType === 'SESSION_APPROVED' ||
        eventType === 'SESSION_EXPIRED' ||
        eventType === 'SUPPORT_SESSION_ENDED'
      ) {
        if (data?.sessionCode) {
          notification.destroy(`support_req_${data.sessionCode}`)
          setNotifications((prev) => prev.filter((n) => n.sessionCode !== data.sessionCode))
        }
      }
    },
    onReconnectSync: async () => {
      await fetchPendingRequests()
    },
  })

  // Initial mount load (zero periodic polling)
  React.useEffect(() => {
    if (isTenant) {
      fetchPendingRequests()
    }
  }, [isTenant])

  const handleApproveAccess = async (sessionCode: string) => {
    try {
      setLoadingConsent(true)
      const res: any = await approveSupportSession(sessionCode)
      if (res && res.code === 200) {
        message.success('Support access request approved! Specialist can now access diagnostic workspace.')
        setNotifications((prev) => prev.filter((n) => n.sessionCode !== sessionCode))
        await fetchPendingRequests()
      } else {
        message.error(res?.msgTip || 'Failed to approve support access request')
      }
    } catch (e: any) {
      message.error(e?.message || 'Error approving support session')
    } finally {
      setLoadingConsent(false)
    }
  }

  const handleRejectAccess = async (sessionCode: string) => {
    try {
      setLoadingConsent(true)
      const res: any = await rejectSupportSession(sessionCode, 'Declined by tenant administrator')
      if (res && res.code === 200) {
        message.info('Support access request declined.')
        setNotifications((prev) => prev.filter((n) => n.sessionCode !== sessionCode))
        await fetchPendingRequests()
      } else {
        message.error(res?.msgTip || 'Failed to decline request')
      }
    } catch (e: any) {
      message.error(e?.message || 'Error declining support session')
    } finally {
      setLoadingConsent(false)
    }
  }

  const handleLogout = async () => {
    try {
      await http.get(ENDPOINTS.AUTH.LOGOUT)
    } catch {
      // ignore
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const langMenuItems: MenuProps['items'] = [
    {
      key: 'english',
      label: '🇬🇧 English',
      onClick: () => updateThemeSettings({ language: 'english' }),
    },
    {
      key: 'chinese_simplified',
      label: '🇨🇳 简体中文 (Chinese)',
      onClick: () => updateThemeSettings({ language: 'chinese_simplified' }),
    },
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Interface Settings',
      onClick: () => setSettingDrawerVisible(true),
    },
    {
      key: 'changePwd',
      icon: <KeyOutlined />,
      label: 'Change Password',
      onClick: () => setChangePasswordVisible(true),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Sign Out',
      onClick: handleLogout,
    },
  ]

  const displayName = userAuth.userName || userAuth.loginName || user?.userName || user?.loginName || 'User'
  const domain = userAuth.authorityDomain || 'TENANT'

  return (
    <AntHeader
      style={{
        padding: '0 20px',
        background: themeSettings.primaryColor || '#1890ff',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        lineHeight: '52px',
        position: themeSettings.fixedHeader ? 'sticky' : 'relative',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
      }}
    >
      {/* Left Section: Menu Toggle + Domain Badge + System Title */}
      <Space size="middle" align="center">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{ fontSize: '16px', color: '#fff', width: 36, height: 36 }}
        />
        <span style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: 0.5 }}>
          {platformName}
        </span>

        {domain === 'PLATFORM' && (
          <Tag color="purple" style={{ margin: 0, fontWeight: 600, border: 'none' }}>
            PLATFORM ADMIN
          </Tag>
        )}
        {domain === 'SUPPORT_OPERATIONS' && (
          <Tag color="cyan" style={{ margin: 0, fontWeight: 600, border: 'none' }}>
            SYSTEM SUPPORT
          </Tag>
        )}
        {domain === 'SUPPORT_SESSION' && (
          <Tag color="gold" style={{ margin: 0, fontWeight: 600, border: 'none' }}>
            SUPPORT: TENANT #{userAuth.tenantId}
          </Tag>
        )}
        {domain === 'TENANT' && userAuth.tenantId && (
          <Tag color="geekblue" style={{ margin: 0, fontWeight: 600, border: 'none' }}>
            Tenant #{userAuth.tenantId}
          </Tag>
        )}
      </Space>

      {/* Right Section: Action Icons, Language, User Dropdown */}
      <Space size="middle" align="center">
        {/* Fullscreen Toggle */}
        <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            style={{ color: '#fff', fontSize: 16, width: 36, height: 36 }}
          />
        </Tooltip>

        {/* Language Switcher */}
        <Dropdown menu={{ items: langMenuItems }} placement="bottomRight">
          <Button
            type="text"
            style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <GlobalOutlined style={{ fontSize: 16 }} />
            <span>{themeSettings.language === 'english' ? 'English' : '简体中文'}</span>
          </Button>
        </Dropdown>

        {/* Notification Bell & Consent Center */}
        <Popover
          placement="bottomRight"
          trigger="click"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Notifications & Support Requests</span>
              <Tag color="blue">{notifications.length} Pending</Tag>
            </div>
          }
          content={
            <div style={{ width: 340, maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#8c8c8c' }}>
                  <BellOutlined style={{ fontSize: 24, marginBottom: 8, color: '#bfbfbf' }} />
                  <div>No pending support access requests or alerts.</div>
                </div>
              ) : (
                <div>
                  {notifications.map((item) => (
                    <Card
                      key={item.sessionCode || Math.random().toString()}
                      size="small"
                      style={{ marginBottom: 8, borderColor: '#ffbb96', background: '#fff7e6' }}
                      title={
                        <Space>
                          <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {item.operatorName || 'Support Specialist'}
                          </span>
                        </Space>
                      }
                      extra={<Tag color="orange">{item.accessMode || 'READ_ONLY'}</Tag>}
                    >
                      <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#595959' }}>
                        <strong>Reason:</strong> {item.justification}
                      </p>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 8 }}>
                        Scope: {item.moduleScope} &bull; Duration: {item.durationMinutes}m
                      </div>
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleRejectAccess(item.sessionCode)}
                          loading={loadingConsent}
                        >
                          Deny
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleApproveAccess(item.sessionCode)}
                          loading={loadingConsent}
                          style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                          Approve Access
                        </Button>
                      </Space>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          }
          onOpenChange={(open) => {
            if (open) fetchPendingRequests()
          }}
        >
          <Tooltip title="Notifications & Access Requests">
            <Badge count={notifications.length} offset={[-4, 4]} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ color: '#fff', fontSize: 18 }} />}
                style={{ width: 36, height: 36 }}
              />
            </Badge>
          </Tooltip>
        </Popover>

        {/* Settings Drawer Quick Trigger */}
        <Tooltip title="Interface Settings">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setSettingDrawerVisible(true)}
            style={{ color: '#fff', fontSize: 16, width: 36, height: 36 }}
          />
        </Tooltip>

        {/* User Account Menu */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: 'pointer', color: '#fff', padding: '0 4px' }}>
            <DownCircleOutlined style={{ fontSize: 16 }} />
            <span style={{ fontWeight: 500 }}>Welcome, {displayName}</span>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  )
}
