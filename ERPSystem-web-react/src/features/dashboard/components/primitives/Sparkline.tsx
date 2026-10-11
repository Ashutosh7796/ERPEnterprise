import React from 'react'

interface SparklineProps {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
  color?: string
  ariaLabel?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  labels: _labels,
  width = 110,
  height = 32,
  color = '#2563eb',
  ariaLabel = 'Trend',
}) => {
  if (!data || data.length < 2) {
    return null
  }

  const numeric = data.map((v) => Number(v)).filter((v) => !Number.isNaN(v))
  if (numeric.length < 2) {
    return null
  }

  const pad = 2
  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const range = max - min || 1
  const stepX = (width - pad * 2) / (numeric.length - 1)
  const points = numeric.map((v, i) => {
    const x = pad + i * stepX
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const SparklineSeries: React.FC<{ data: number[]; labels?: string[] }> = (props) => {
  return <Sparkline {...props} />
}