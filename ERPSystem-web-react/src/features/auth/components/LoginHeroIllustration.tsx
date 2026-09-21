import React from 'react'
import {
  SyncOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import erpHeroImage from '@assets/erp-hero-3d.jpg'

export const LoginHeroIllustration: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 640,
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
          width: 520,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(59, 130, 246, 0.15) 45%, transparent 75%)',
          filter: 'blur(36px)',
          zIndex: 0,
        }}
      />

      {/* Main 3D Hero Graphic Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(226, 232, 240, 0.6)',
          zIndex: 1,
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <img
          src={erpHeroImage}
          alt="ERP System Dashboard 3D Overview"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: 380,
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Subtle Bottom Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.25) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Floating Pill Badge 1: Top Right (Blue Glassmorphic) */}
      <div
        style={{
          position: 'absolute',
          top: -12,
          right: 20,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(191, 219, 254, 0.8)',
          boxShadow: '0 12px 28px -6px rgba(37, 99, 235, 0.25)',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        <SyncOutlined spin style={{ color: '#2563eb', fontSize: 13 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>Real-Time Supply Chain Sync</span>
      </div>

      {/* Floating Pill Badge 2: Bottom Left (Emerald Glassmorphic) */}
      <div
        style={{
          position: 'absolute',
          bottom: -14,
          left: 20,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(187, 247, 208, 0.8)',
          boxShadow: '0 12px 28px -6px rgba(22, 163, 74, 0.22)',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        <SafetyCertificateOutlined style={{ color: '#16a34a', fontSize: 14 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>
          Enterprise Multi-Store & Warehouse Management
        </span>
      </div>

      {/* Floating Pill Badge 3: Top Left (Amber Accent) */}
      <div
        style={{
          position: 'absolute',
          top: 35,
          left: -16,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '1px solid rgba(253, 230, 138, 0.8)',
          boxShadow: '0 10px 24px -4px rgba(217, 119, 6, 0.2)',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        <ThunderboltOutlined style={{ color: '#d97706', fontSize: 13 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#b45309' }}>1-Click Instant Analytics</span>
      </div>
    </div>
  )
}
