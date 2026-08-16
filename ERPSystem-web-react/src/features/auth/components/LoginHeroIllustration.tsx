import React from 'react'
import {
  SyncOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

export const LoginHeroIllustration: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        height: 360,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* Background Soft Ambient Light Halo */}
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(219, 234, 254, 0.8) 0%, rgba(240, 249, 255, 0.4) 60%, transparent 80%)',
          filter: 'blur(24px)',
          zIndex: 0,
        }}
      />

      {/* Main Desktop Window Card */}
      <div
        style={{
          position: 'relative',
          width: 440,
          height: 250,
          background: '#ffffff',
          borderRadius: 18,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          padding: '16px 20px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        {/* Top Window Header */}
        <div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          </div>

          {/* Skeleton Content Bars */}
          <div style={{ width: '68%', height: 14, borderRadius: 7, background: '#e2e8f0', marginBottom: 10 }} />
          <div style={{ width: '45%', height: 10, borderRadius: 5, background: '#f1f5f9' }} />
        </div>

        {/* Floating Mouse Cursor Icon */}
        <div
          style={{
            position: 'absolute',
            top: 75,
            left: 200,
            zIndex: 4,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Bottom Financial Metrics Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 14,
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>Today's Sales</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>$567.15</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#f1f5f9' }} />
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>Today's Cost</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>$120.30</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#f1f5f9' }} />
          <div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>Today's Profit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#059669', letterSpacing: '-0.01em' }}>$366.50</div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Phone Mockup (Bottom Left) */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          bottom: 25,
          width: 82,
          height: 155,
          background: '#ffffff',
          borderRadius: 18,
          border: '2px solid #e2e8f0',
          boxShadow: '0 20px 35px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9)',
          padding: '10px 8px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 3,
        }}
      >
        <div style={{ width: 22, height: 3.5, background: '#cbd5e1', borderRadius: 2 }} />
        <div style={{ width: '100%', height: 52, borderRadius: 10, background: '#eff6ff', marginTop: 4 }} />
        <div style={{ width: '85%', height: 6, background: '#e2e8f0', borderRadius: 3 }} />
        <div style={{ width: '60%', height: 6, background: '#f1f5f9', borderRadius: 3 }} />
      </div>

      {/* Floating Pill Badge 1: Top Center (Blue) */}
      <div
        style={{
          position: 'absolute',
          top: 15,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ffffff',
          border: '1.5px solid #bfdbfe',
          borderRadius: 24,
          padding: '7px 18px',
          fontSize: 13,
          fontWeight: 600,
          color: '#2563eb',
          boxShadow: '0 10px 25px -4px rgba(37, 99, 235, 0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <SyncOutlined style={{ fontSize: 14, color: '#2563eb' }} />
        Multi-device, Multi-connection
      </div>

      {/* Floating Pill Badge 2: Middle Right (Mint Green) */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 105,
          background: '#f0fdf4',
          border: '1.5px solid #86efac',
          borderRadius: 24,
          padding: '7px 18px',
          fontSize: 13,
          fontWeight: 600,
          color: '#15803d',
          boxShadow: '0 10px 25px -4px rgba(22, 163, 74, 0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <SafetyCertificateOutlined style={{ fontSize: 14, color: '#16a34a' }} />
        Multi-batch, Multi-unit, Shelf-life Management
      </div>

      {/* Floating Pill Badge 3: Bottom Left (Golden Amber) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 125,
          background: '#fffbeb',
          border: '1.5px solid #fde047',
          borderRadius: 24,
          padding: '7px 18px',
          fontSize: 13,
          fontWeight: 600,
          color: '#b45309',
          boxShadow: '0 10px 25px -4px rgba(245, 158, 11, 0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <RocketOutlined style={{ fontSize: 14, color: '#d97706' }} />
        Multi-store, Warehouse Easy Management
      </div>
    </div>
  )
}
