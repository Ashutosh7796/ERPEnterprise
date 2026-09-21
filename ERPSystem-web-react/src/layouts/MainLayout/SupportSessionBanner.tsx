import React, { useState, useEffect } from 'react'
import { Alert, Button, Space, Tag, Modal, message } from 'antd'
import {
  SafetyCertificateOutlined,
  LogoutOutlined,
  ClockCircleOutlined,
  LockOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@store/useAppStore'
import { useAuthStore } from '@core/auth/authStore'
import { useNavigate } from 'react-router-dom'
import { http, getToken, setToken } from '@core/api/client'

export const SupportSessionBanner: React.FC = () => {
  const navigate = useNavigate()
  const { userAuth, fetchUserAuth } = useAppStore()
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!userAuth.isSupportSession || !userAuth.supportExpiresAt) {
      setSecondsRemaining(null)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((userAuth.supportExpiresAt! - Date.now()) / 1000))
      setSecondsRemaining(remaining)
      if (remaining <= 0) {
        handleAutoExpire()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [userAuth.isSupportSession, userAuth.supportExpiresAt])

  const handleAutoExpire = () => {
    message.warning('Support session has expired. Restoring originating administrative context...')
    handleExitSession(true)
  }

  const handleExitSession = async (isAutoExpire = false) => {
    setExiting(true)
    try {
      const activeToken = getToken()
      if (activeToken) {
        await http.post('/support/revoke', { supportToken: activeToken })
      }
      message.success('Support session ended. Returned to platform administration.')
    } catch (e) {
      console.warn('Support session revoke request completed with note', e)
    } finally {
      setExiting(false)
      // Restore originating context token if any, or reload authorization
      const originatingDomain = userAuth.originatingAuthorityDomain || 'PLATFORM'
      const baseToken = (getToken() || '').replace(/^SUPPORT_[^_]+_/, '')
      
      await fetchUserAuth()
      if (originatingDomain === 'PLATFORM') {
        navigate('/platform/dashboard', { replace: true })
      } else {
        navigate('/support/dashboard', { replace: true })
      }
    }
  }

  const confirmExit = () => {
    Modal.confirm({
      title: 'Exit Support Session?',
      icon: <LogoutOutlined style={{ color: '#faad14' }} />,
      content: `You will exit tenant #${userAuth.tenantId} (${userAuth.tenantName || 'Customer'}) and return to your ${
        userAuth.originatingAuthorityDomain === 'PLATFORM' ? 'Platform Admin' : 'Support Operations'
      } workspace.`,
      okText: 'Exit Session',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleExitSession(false),
    })
  }

  if (!userAuth.isSupportSession) {
    return null
  }

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}:${s < 10 ? '0' : ''}${s}`
  }

  const isReadOnly = userAuth.supportAccessMode === 'READ_ONLY'

  return (
    <div
      style={{
        background: isReadOnly ? '#fffbe6' : '#fff0f6',
        borderBottom: `2px solid ${isReadOnly ? '#ffe58f' : '#ffadd2'}`,
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 1001,
      }}
    >
      <Space size="middle" wrap>
        <Tag
          icon={<SafetyCertificateOutlined />}
          color={isReadOnly ? 'warning' : 'magenta'}
          style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}
        >
          ACTIVE SUPPORT SESSION
        </Tag>

        <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>
          Assisting Tenant: <Tag color="blue">#{userAuth.tenantId} {userAuth.tenantName || ''}</Tag>
        </span>

        <Tag icon={isReadOnly ? <LockOutlined /> : <ThunderboltOutlined />} color={isReadOnly ? 'gold' : 'purple'}>
          Mode: {userAuth.supportAccessMode || 'READ_ONLY'}
        </Tag>

        {userAuth.supportModuleScope && (
          <Tag color="cyan">Scope: {userAuth.supportModuleScope}</Tag>
        )}

        {secondsRemaining !== null && (
          <Space size={4} style={{ color: secondsRemaining < 300 ? '#cf1322' : '#d48806', fontWeight: 600 }}>
            <ClockCircleOutlined />
            <span>Expires in: {formatCountdown(secondsRemaining)}</span>
          </Space>
        )}
      </Space>

      <Button
        type="primary"
        danger
        icon={<LogoutOutlined />}
        size="small"
        loading={exiting}
        onClick={confirmExit}
        style={{ fontWeight: 500 }}
      >
        Exit Support Session
      </Button>
    </div>
  )
}
