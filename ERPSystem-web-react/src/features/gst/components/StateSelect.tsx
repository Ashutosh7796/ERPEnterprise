import React, { useState, useEffect } from 'react'
import { Select } from 'antd'
import { gstApi } from '../api/gstApi'
import type { StateCode } from '../types'

interface StateSelectProps {
  value?: string
  onChange?: (stateCode: string, stateName?: string) => void
  disabled?: boolean
  placeholder?: string
  style?: React.CSSProperties
  allowClear?: boolean
}

export const StateSelect: React.FC<StateSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select Indian State / UT',
  style = { width: '100%' },
  allowClear = true,
}) => {
  const [states, setStates] = useState<StateCode[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    gstApi
      .getAllStateCodes()
      .then((res: any) => {
        const list = res?.data?.list || res?.list || (Array.isArray(res?.data) ? res.data : [])
        if (list && Array.isArray(list)) {
          setStates(list)
        }
      })
      .catch((err) => console.error('Failed to load state codes', err))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (val: string) => {
    const selected = states.find((s) => s.stateCode === val)
    if (onChange) {
      onChange(val, selected?.stateName)
    }
  }

  return (
    <Select
      showSearch
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      loading={loading}
      style={style}
      allowClear={allowClear}
      optionFilterProp="label"
      options={states.map((s) => ({
        value: s.stateCode,
        label: `${s.stateCode} - ${s.stateName} ${s.stateType === 'UNION_TERRITORY' ? '(UT)' : ''}`,
      }))}
    />
  )
}
