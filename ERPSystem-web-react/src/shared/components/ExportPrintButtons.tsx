import React from 'react'
import { Button, Space, Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import { PrinterOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import { exportToExcel, printTableReport } from '@shared/utils/printAndExport'
import type { ColumnDefinition } from '@shared/utils/printAndExport'

export interface ExportPrintButtonsProps {
  title: string
  companyName?: string
  columns: ColumnDefinition[]
  dataSource: any[]
  summaryItems?: Array<{ label: string; value: string | number }>
  fileName?: string
  sheetName?: string
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
}

export const ExportPrintButtons: React.FC<ExportPrintButtonsProps> = ({
  title,
  companyName = 'ERPSystem',
  columns,
  dataSource,
  summaryItems = [],
  fileName,
  sheetName,
  disabled = false,
  size = 'middle',
}) => {
  const handlePrint = () => {
    if (!dataSource || dataSource.length === 0) {
      message.warning('No data to print.')
      return
    }
    printTableReport({
      title,
      companyName,
      columns,
      dataSource,
      summaryItems,
      orientation: columns.length > 8 ? 'landscape' : 'portrait',
    })
  }

  const handleExport = () => {
    if (!dataSource || dataSource.length === 0) {
      message.warning('No data to export.')
      return
    }
    try {
      exportToExcel({
        title,
        columns,
        dataSource,
        summaryItems,
        fileName: fileName || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: sheetName || title.slice(0, 31),
      })
      message.success('Excel export completed successfully!')
    } catch (err: any) {
      console.error('Export error:', err)
      message.error('Failed to export Excel file.')
    }
  }

  return (
    <Space size="small">
      <Button
        icon={<PrinterOutlined />}
        onClick={handlePrint}
        disabled={disabled}
        size={size}
      >
        Print
      </Button>
      <Button
        icon={<DownloadOutlined />}
        onClick={handleExport}
        disabled={disabled}
        size={size}
      >
        Export
      </Button>
    </Space>
  )
}
