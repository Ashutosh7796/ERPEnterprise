import React, { type ReactNode } from 'react'
import { Card } from 'antd'

interface WidgetCardProps {
  title: ReactNode
  icon?: ReactNode
  extra?: ReactNode
  footer?: ReactNode
  bodyPadding?: string | number
  children: ReactNode
  className?: string
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  extra,
  footer,
  bodyPadding = 16,
  children,
  className,
}) => {
  return (
    <Card
      className={className}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
        background: '#ffffff',
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
          <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{title}</span>
        </div>
      }
      extra={extra}
      styles={{
        header: {
          minHeight: 48,
          padding: '0 16px',
          borderBottom: '1px solid #f1f5f9',
        },
        body: {
          padding: bodyPadding,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        },
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {footer && (
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 10,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{footer}</span>
        </div>
      )}
    </Card>
  )
}