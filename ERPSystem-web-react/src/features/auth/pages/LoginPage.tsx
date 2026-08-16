import React, { useState, useEffect, useCallback } from 'react'
import { Form, Input, Button, App, Typography, Row, Col, Space, Modal } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  SyncOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined,
  MobileOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'
import { useAuthStore } from '@core/auth/authStore'
import { usePermissionStore } from '@core/auth/permissionStore'
import { md5 } from '@shared/utils/md5'
import { LoginHeroIllustration } from '../components/LoginHeroIllustration'

const { Title, Text } = Typography

interface LoginFormValues {
  loginName: string
  password: string
  code: string
  remember?: boolean
}

export const LoginPage: React.FC = () => {
  const { message, notification } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)

  const [loading, setLoading] = useState(false)
  const [captchaImg, setCaptchaImg] = useState<string>('')
  const [uuid, setUuid] = useState<string>('')
  const [hasCaptcha, setHasCaptcha] = useState<boolean>(true)
  const [forgotModalOpen, setForgotModalOpen] = useState(false)

  const [form] = Form.useForm<LoginFormValues>()

  // Screen resolution detection and browser zoom adjustment notification
  useEffect(() => {
    const checkScreen = () => {
      let percentage = '100%'
      const basicWidth = 1920
      const currentWidth = window.screen.width
      const currentHeight = window.screen.height
      const currentRatio = parseFloat(window.devicePixelRatio.toFixed(2))
      let needRatio = 1
      const ratio = currentWidth / basicWidth

      if (ratio > 0.5 && ratio < 0.67) {
        percentage = '50%'
        needRatio = 0.5
      } else if (ratio >= 0.67 && ratio < 0.75) {
        percentage = '67%'
        needRatio = 0.67
      } else if (ratio >= 0.75 && ratio < 0.8) {
        percentage = '75%'
        needRatio = 0.75
      } else if (ratio >= 0.8 && ratio < 0.9) {
        percentage = '80%'
        needRatio = 0.8
      } else if (ratio >= 1.1 && ratio < 1.25) {
        percentage = '110%'
        needRatio = 1.1
      } else if (ratio >= 1.25 && ratio < 1.5) {
        percentage = '125%'
        needRatio = 1.25
      } else if (ratio >= 1.5 && ratio < 1.75) {
        percentage = '150%'
        needRatio = 1.5
      }

      // Check if current display scaling differs from recommended
      if (Math.abs(currentRatio - needRatio) > 0.05) {
        notification.warning({
          message: 'Browser Zoom Adjustment Notice',
          description: `Your monitor resolution was detected as ${currentWidth}*${currentHeight}. For an optimal viewing and operation experience, we recommend setting your browser zoom level to ${percentage}.`,
          placement: 'topRight',
          duration: 10,
        })
      }
    }

    checkScreen()
  }, [notification])

  // Handle CAS Single Sign-On (SSO) ticket if present in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const ticket = searchParams.get('ticket')
    if (ticket) {
      setLoading(true)
      http
        .get<any>('/cas/client/validateLogin', { ticket })
        .then((res) => {
          if (res?.token && res?.user) {
            login(res.token, res.user, true)
            usePermissionStore.getState().fetchButtonPermissions()
            message.success('CAS Single Sign-On successful!')
            navigate('/dashboard', { replace: true })
          } else {
            message.error('CAS authentication failed.')
          }
        })
        .catch((err) => {
          message.error(err?.message || 'CAS SSO validation error')
        })
        .finally(() => setLoading(false))
    }
  }, [location.search, login, navigate, message])

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await http.get<{ uuid: string; base64: string }>(ENDPOINTS.AUTH.RANDOM_IMAGE)
      if (res && res.base64 && res.uuid) {
        setCaptchaImg(res.base64)
        setUuid(res.uuid)
        setHasCaptcha(true)
      } else {
        setHasCaptcha(false)
      }
    } catch {
      setHasCaptcha(false)
    }
  }, [])

  useEffect(() => {
    refreshCaptcha()
  }, [refreshCaptcha])

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      const payload: Record<string, any> = {
        loginName: values.loginName.trim(),
        password: md5(values.password),
        code: values.code ? values.code.trim() : '',
        uuid: uuid,
      }

      const res = await http.post<any>(ENDPOINTS.AUTH.LOGIN, payload)

      if (res && res.msgTip === 'user can login' && res.token) {
        login(res.token, res.user, values.remember ?? true)
        usePermissionStore.getState().fetchButtonPermissions()
        message.success('Welcome back! Login successful.')

        const from = (location.state as any)?.from?.pathname || '/dashboard'
        navigate(from, { replace: true })
      } else {
        const tipMap: Record<string, string> = {
          'user is not exist': 'User does not exist. Please check your username.',
          'user password error': 'Incorrect password. Please try again.',
          'user is black': 'This account has been disabled. Contact your administrator.',
          'tenant is black': 'Your organization has been disabled. Contact support.',
          'tenant is expire': 'Your trial period has expired. Contact support to renew.',
          'access service error': 'Authentication service error. Please try again later.',
        }
        const errMsg = tipMap[res?.msgTip] || res?.msgTip || 'Authentication failed. Please check your credentials.'
        message.error(errMsg)
        refreshCaptcha()
        form.setFieldValue('code', '')
      }
    } catch (err: any) {
      message.error(err.message || 'Login failed')
      refreshCaptcha()
      form.setFieldValue('code', '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 35%, #f0fdf4 70%, #f8fafc 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Decorative Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          top: -100,
          left: -100,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)',
          bottom: -150,
          right: -150,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 48,
          zIndex: 1,
        }}
      >
        {/* Left Side: Value Propositions & Modern UI Graphic */}
        <div style={{ flex: '1 1 540px', minWidth: 320, maxWidth: 620 }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: 1.35,
              color: '#0f172a',
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Dedicated to Providing Small and Medium Enterprises with Efficient and Easy-to-Use ERP Software
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#475569',
              marginBottom: 36,
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            1-Second Order Print, One-Click Sharing, Mobile Inventory & Profit Checking
          </p>

          {/* Vector-Sharp Crisp Hero Illustration */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 580,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
            }}
          >
            <LoginHeroIllustration />
          </div>
        </div>

        {/* Right Side: Modern Glassmorphic Login Card */}
        <div
          style={{
            flex: '0 0 420px',
            width: '100%',
            maxWidth: 440,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9)',
            padding: '40px 36px',
            boxSizing: 'border-box',
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              jshERP Pro <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>v3.6</span>
            </h2>
          </div>

          {/* Login Form */}
          <Form
            form={form}
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={handleSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="loginName"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Enter Email / Phone / Username</span>}
              rules={[{ required: true, message: 'Please enter your username' }]}
              style={{ marginBottom: 18 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                placeholder="admin"
                size="large"
                style={{
                  borderRadius: 8,
                  borderColor: '#cbd5e1',
                  height: 44,
                  fontSize: 14,
                }}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Enter Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 18 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                placeholder="••••••••"
                size="large"
                style={{
                  borderRadius: 8,
                  borderColor: '#cbd5e1',
                  height: 44,
                  fontSize: 14,
                }}
                autoComplete="current-password"
              />
            </Form.Item>

            {hasCaptcha && (
              <Form.Item
                name="code"
                label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Verification Code</span>}
                rules={[{ required: true, message: 'Please enter the captcha code' }]}
                style={{ marginBottom: 14 }}
              >
                <Row gutter={10} align="middle">
                  <Col flex="auto">
                    <Input
                      placeholder="Enter code from image"
                      size="large"
                      style={{
                        borderRadius: 8,
                        borderColor: '#cbd5e1',
                        height: 44,
                        fontSize: 14,
                      }}
                      autoComplete="off"
                    />
                  </Col>
                  <Col flex="115px">
                    <div
                      onClick={refreshCaptcha}
                      style={{
                        height: 44,
                        width: '100%',
                        cursor: 'pointer',
                        borderRadius: 8,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                      }}
                      title="Click to refresh captcha"
                    >
                      {captchaImg ? (
                        <img
                          src={captchaImg}
                          alt="captcha"
                          style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <SyncOutlined spin style={{ color: '#64748b' }} />
                      )}
                    </div>
                  </Col>
                </Row>
              </Form.Item>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              <a
                onClick={() => setForgotModalOpen(true)}
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#2563eb')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#64748b')}
              >
                Forgot your password?
              </a>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              style={{
                height: 46,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #4f5d75 0%, #2d3748 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(45, 55, 72, 0.25)',
              }}
            >
              LOGIN
            </Button>
          </Form>
        </div>
      </div>

      {/* Forgot Password Helper Modal */}
      <Modal
        title="Forgot Password"
        open={forgotModalOpen}
        onOk={() => setForgotModalOpen(false)}
        onCancel={() => setForgotModalOpen(false)}
        okText="Understood"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={440}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
            Please contact your system administrator or organization manager to reset your password.
          </p>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
            Administrators can reset passwords directly via the <strong>System Management &gt; Users</strong> module.
          </p>
        </div>
      </Modal>
    </div>
  )
}
