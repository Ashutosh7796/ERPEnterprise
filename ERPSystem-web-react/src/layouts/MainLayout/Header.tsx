import React from 'react'
import { Layout, Button, Dropdown, Space, Avatar, Tooltip, theme as antdTheme } from 'antd'
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
} from '@ant-design/icons'
import { useAppStore } from '@store/useAppStore'
import { useAuthStore } from '@core/auth/authStore'
import { useNavigate } from 'react-router-dom'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'

const { Header: AntHeader } = Layout

export const Header: React.FC = () => {
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
  } = useAppStore()

  const { user, logout } = useAuthStore()

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

  const displayName = user?.userName || user?.loginName || 'Test User'

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
      {/* Left Section: Menu Toggle + System Title */}
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
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginLeft: 8 }}>
          Acme Enterprise
        </span>
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
