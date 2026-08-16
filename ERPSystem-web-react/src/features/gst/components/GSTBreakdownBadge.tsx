import React from 'react'
import { Tag, Space, Tooltip } from 'antd'

interface GSTBreakdownBadgeProps {
  supplyType?: 'INTRA_STATE' | 'INTER_STATE'
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  cessAmount?: number
  totalTaxAmount?: number
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
}

export const GSTBreakdownBadge: React.FC<GSTBreakdownBadgeProps> = ({
  supplyType = 'INTRA_STATE',
  cgstAmount = 0,
  sgstAmount = 0,
  igstAmount = 0,
  cessAmount = 0,
  totalTaxAmount = 0,
  cgstRate,
  sgstRate,
  igstRate,
}) => {
  const isIntra = supplyType === 'INTRA_STATE'

  return (
    <Space orientation="horizontal" size={4} wrap>
      {isIntra ? (
        <>
          <Tooltip title={`Central GST (${cgstRate ? cgstRate + '%' : ''})`}>
            <Tag color="blue">CGST: ₹{Number(cgstAmount).toFixed(2)}</Tag>
          </Tooltip>
          <Tooltip title={`State / UT GST (${sgstRate ? sgstRate + '%' : ''})`}>
            <Tag color="cyan">SGST: ₹{Number(sgstAmount).toFixed(2)}</Tag>
          </Tooltip>
        </>
      ) : (
        <Tooltip title={`Integrated GST (${igstRate ? igstRate + '%' : ''})`}>
          <Tag color="purple">IGST: ₹{Number(igstAmount).toFixed(2)}</Tag>
        </Tooltip>
      )}

      {Number(cessAmount) > 0 && (
        <Tooltip title="Compensation Cess">
          <Tag color="orange">Cess: ₹{Number(cessAmount).toFixed(2)}</Tag>
        </Tooltip>
      )}

      <Tooltip title="Total Statutory Tax">
        <Tag color="green" style={{ fontWeight: 600 }}>
          Tax: ₹{Number(totalTaxAmount).toFixed(2)}
        </Tag>
      </Tooltip>
    </Space>
  )
}
