import React, { useEffect } from 'react'
import { Layout, theme as antdTheme, Spin } from 'antd'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TabBar } from './TabBar'
import { SettingDrawer } from './SettingDrawer'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ErrorBoundary } from '@core/error/ErrorBoundary'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'

const { Content, Footer } = Layout

export const MainLayout: React.FC = () => {
  const { token } = antdTheme.useToken()
  const { user, setUser, isInitialized, setInitialized } = useAuthStore()
  const { themeSettings } = useAppStore()

  useEffect(() => {
    const fetchSession = async () => {
      try {
        if (!user) {
          const sessionData = await http.get(ENDPOINTS.AUTH.USER_SESSION)
          if (sessionData && typeof sessionData === 'object' && sessionData.user) {
            setUser(sessionData.user)
          } else if (sessionData) {
            setUser(sessionData)
          }
        }
      } catch (err) {
        console.error('Failed to fetch session user info:', err)
      } finally {
        setInitialized(true)
      }
    }

    fetchSession()
  }, [user, setUser, setInitialized])

  if (!isInitialized) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" description="Initializing Workspace..." />
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        {themeSettings.multipage && <TabBar />}
        <Content
          style={{
            margin: '12px 16px',
            padding: '0',
            minHeight: 280,
            overflowY: 'auto',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
        <Footer style={{ textAlign: 'center', padding: '8px 24px', fontSize: 12, color: token.colorTextSecondary }}>
          © 2015-2030 jshERP Pro V3.6 · Indian Enterprise Edition
        </Footer>
      </Layout>

      {/* Interface Settings Drawer */}
      <SettingDrawer />

      {/* Change Password Modal */}
      <ChangePasswordModal />
    </Layout>
  )
}
