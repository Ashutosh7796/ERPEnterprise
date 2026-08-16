import React, { useState, useEffect } from 'react'
import { Input, Tag, Space, Typography, Tooltip } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { gstApi } from '../api/gstApi'

const { Text } = Typography

interface GSTINInputProps {
  value?: string
  onChange?: (val: string) => void
  onMetadataChange?: (meta: { stateCode?: string; stateName?: string; pan?: string; entityType?: string }) => void
  disabled?: boolean
  placeholder?: string
}

export const GSTINInput: React.FC<GSTINInputProps> = ({
  value = '',
  onChange,
  onMetadataChange,
  disabled = false,
  placeholder = 'e.g. 27AABCU9603R1ZN',
}) => {
  const [loading, setLoading] = useState(false)
  const [valid, setValid] = useState<boolean | null>(null)
  const [meta, setMeta] = useState<{
    stateCode?: string
    stateName?: string
    pan?: string
    entityType?: string
    message?: string
  }>({})

  useEffect(() => {
    if (!value || value.trim().length !== 15) {
      setValid(null)
      setMeta({})
      return
    }

    let isMounted = true
    setLoading(true)

    gstApi
      .validateGstin(value.trim().toUpperCase())
      .then((res) => {
        if (!isMounted) return
        if (res.data) {
          setValid(res.data.valid)
          setMeta(res.data)
          if (res.data.valid && onMetadataChange) {
            onMetadataChange({
              stateCode: res.data.stateCode,
              stateName: res.data.stateName,
              pan: res.data.pan,
              entityType: res.data.entityType,
            })
          }
        }
      })
      .catch(() => {
        if (isMounted) setValid(false)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercase = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '')
    if (uppercase.length <= 15 && onChange) {
      onChange(uppercase)
    }
  }

  return (
    <div>
      <Input
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={15}
        allowClear
        prefix={<SafetyCertificateOutlined style={{ color: '#6366f1' }} />}
        suffix={
          loading ? (
            <LoadingOutlined spin />
          ) : valid === true ? (
            <Tooltip title={`Valid GSTIN (${meta.stateName || 'State ' + meta.stateCode})`}>
              <CheckCircleOutlined style={{ color: '#10b981' }} />
            </Tooltip>
          ) : valid === false ? (
            <Tooltip title={meta.message || 'Invalid GSTIN or Checksum error'}>
              <CloseCircleOutlined style={{ color: '#ef4444' }} />
            </Tooltip>
          ) : null
        }
        style={{ letterSpacing: '0.05em', fontFamily: 'monospace', fontWeight: 600 }}
      />
      {valid === true && (
        <div style={{ marginTop: 4 }}>
          <Space orientation="horizontal" size={4} wrap>
            {meta.stateName && <Tag color="blue">{meta.stateName} ({meta.stateCode})</Tag>}
            {meta.pan && <Tag color="geekblue">PAN: {meta.pan}</Tag>}
            {meta.entityType && <Tag color="purple">{meta.entityType}</Tag>}
          </Space>
        </div>
      )}
      {valid === false && value.length === 15 && (
        <div style={{ marginTop: 2 }}>
          <Text type="danger" style={{ fontSize: 12 }}>
            ⚠️ {meta.message || 'Invalid GSTIN / Checksum verification failed'}
          </Text>
        </div>
      )}
    </div>
  )
}
