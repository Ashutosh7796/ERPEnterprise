import React, { useState, useEffect, useCallback } from 'react'
import { Form, Input, Button, App, Row, Col, Modal, Tooltip } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  SyncOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'
import { useAuthStore } from '@core/auth/authStore'
import { usePermissionStore } from '@core/auth/permissionStore'
import { useAppStore } from '@store/useAppStore'
import { md5 } from '@shared/utils/md5'
import { LoginHeroIllustration } from '../components/LoginHeroIllustration'

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
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false)
  const [captchaImg, setCaptchaImg] = useState<string>('')
  const [uuid, setUuid] = useState<string>('')
  const [forgotModalOpen, setForgotModalOpen] = useState(false)

  const [form] = Form.useForm<LoginFormValues>()
  const resolutionCheckedRef = React.useRef(false)

  // Screen resolution detection and browser zoom adjustment notification (triggers once per session)
  useEffect(() => {
    if (resolutionCheckedRef.current || sessionStorage.getItem('resolution_notice_shown')) {
      return
    }
    resolutionCheckedRef.current = true
    sessionStorage.setItem('resolution_notice_shown', '1')

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
          title: 'Browser Zoom Adjustment Notice',
          description: `Your monitor resolution was detected as ${currentWidth}*${currentHeight}. For an optimal viewing and operation experience, we recommend setting your browser zoom level to ${percentage}.`,
          placement: 'topRight',
          duration: 8,
        } as any)
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
    setCaptchaLoading(true)
    try {
      const res = await http.get<any>(ENDPOINTS.AUTH.RANDOM_IMAGE)
      // http client unwraps BaseResponseInfo: res has uuid and base64 at top level
      if (res?.uuid && res?.base64) {
        setCaptchaImg(res.base64)
        setUuid(res.uuid)
      }
    } catch (err) {
      console.warn('Captcha fetch failed:', err)
    } finally {
      setCaptchaLoading(false)
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

        await useAppStore.getState().fetchUserAuth()
        const currentAuth = useAppStore.getState().userAuth
        let targetPath = (location.state as any)?.from?.pathname
        if (!targetPath || targetPath === '/' || targetPath === '/dashboard' || (currentAuth.authorityDomain !== 'PLATFORM' && targetPath.startsWith('/platform'))) {
          if (currentAuth.authorityDomain === 'PLATFORM') {
            targetPath = '/platform/dashboard'
          } else if (currentAuth.authorityDomain === 'SUPPORT_OPERATIONS') {
            targetPath = '/support/dashboard'
          } else {
            targetPath = '/dashboard'
          }
        }
        navigate(targetPath, { replace: true })
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
    <div className="login-page-container">
      {/* Embedded Responsive Styles */}
      <style>{`
        .login-page-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justifyContent: center;
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 35%, #f0fdf4 70%, #f8fafc 100%);
          position: relative;
          overflow-x: hidden;
          padding: clamp(24px, 4vw, 56px) clamp(20px, 5vw, 80px);
          box-sizing: border-box;
        }
        .login-page-wrapper {
          max-width: 1440px;
          width: 100%;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          gap: clamp(32px, 5vw, 80px);
          z-index: 1;
        }
        .login-hero-section {
          flex: 1.2 1 540px;
          min-width: 320px;
          max-width: 780px;
        }
        .login-hero-title {
          font-size: clamp(28px, 2.6vw, 42px);
          font-weight: 800;
          line-height: 1.28;
          color: #0f172a;
          margin-bottom: 18px;
          letter-spacing: -0.025em;
        }
        .login-hero-desc {
          font-size: clamp(15px, 1.1vw, 18px);
          color: #475569;
          margin-bottom: 36px;
          font-weight: 400;
          line-height: 1.6;
        }
        .login-hero-illustration {
          position: relative;
          width: 100%;
          max-width: 620px;
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 8px 0;
        }
        .login-card-section {
          flex: 0 0 450px;
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.9);
          padding: 44px 38px;
          box-sizing: border-box;
        }
        .login-captcha-box {
          height: 44px;
          width: 110px;
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          user-select: none;
        }
        .login-captcha-box:hover {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .login-refresh-btn {
          height: 44px !important;
          width: 44px !important;
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          padding: 0 !important;
          color: #475569 !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .login-refresh-btn:hover {
          border-color: #2563eb !important;
          color: #2563eb !important;
          background: #eff6ff !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1080px) {
          .login-page-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 40px;
          }
          .login-hero-section {
            text-align: center;
            max-width: 600px;
          }
          .login-hero-title {
            font-size: 30px;
            margin-bottom: 12px;
          }
          .login-hero-desc {
            font-size: 15px;
            margin-bottom: 24px;
          }
          .login-hero-illustration {
            max-width: 460px;
            margin: 0 auto;
          }
          .login-card-section {
            flex: 1 1 auto;
            max-width: 440px;
            padding: 36px 30px;
          }
        }

        @media (max-width: 540px) {
          .login-page-container {
            padding: 20px 14px;
          }
          .login-hero-section {
            display: none;
          }
          .login-card-section {
            padding: 28px 20px;
            border-radius: 16px;
            box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.1);
          }
        }
      `}</style>

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

      <div className="login-page-wrapper">
        {/* Left Side: Value Propositions & Modern UI Graphic */}
        <div className="login-hero-section">
          <h1 className="login-hero-title">
            Dedicated to Providing Small and Medium Enterprises with Efficient and Easy-to-Use ERP Software
          </h1>
          <p className="login-hero-desc">
            1-Second Order Print, One-Click Sharing, Mobile Inventory & Profit Checking
          </p>

          {/* Vector-Sharp Crisp Hero Illustration */}
          <div className="login-hero-illustration">
            <LoginHeroIllustration />
          </div>
        </div>

        {/* Right Side: Modern Glassmorphic Login Card */}
        <div className="login-card-section">
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
              htmlFor="loginName"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Username or Mobile Number</span>}
              rules={[{ required: true, message: 'Please enter your username or mobile number' }]}
              style={{ marginBottom: 18 }}
            >
              <Input
                id="loginName"
                name="loginName"
                prefix={<UserOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                placeholder="Username or Mobile Number"
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
              htmlFor="password"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Enter Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 18 }}
            >
              <Input.Password
                id="password"
                name="password"
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

            <Form.Item
              name="code"
              htmlFor="code"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Verification Code</span>}
              rules={[{ required: true, message: 'Please enter the verification code' }]}
              style={{ marginBottom: 14 }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  flexWrap: 'nowrap',
                }}
              >
                <Input
                  id="code"
                  name="code"
                  prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                  placeholder="Enter code"
                  size="large"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 8,
                    borderColor: '#cbd5e1',
                    height: 44,
                    fontSize: 14,
                  }}
                  autoComplete="off"
                />
                <div
                  onClick={refreshCaptcha}
                  title="Click to refresh captcha"
                  className="login-captcha-box"
                >
                  {captchaLoading ? (
                    <SyncOutlined spin style={{ color: '#2563eb', fontSize: 16 }} />
                  ) : captchaImg ? (
                    <img
                      src={captchaImg}
                      alt="captcha"
                      style={{
                        height: '100%',
                        width: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>No image</span>
                  )}
                </div>
                <Tooltip title="Refresh captcha">
                  <Button
                    type="default"
                    icon={<ReloadOutlined spin={captchaLoading} style={{ fontSize: 15 }} />}
                    onClick={refreshCaptcha}
                    className="login-refresh-btn"
                  />
                </Tooltip>
              </div>
            </Form.Item>

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
