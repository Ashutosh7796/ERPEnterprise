import React, { useState, useEffect } from 'react'
import {
  Input,
  Button,
  Popover,
  Checkbox,
  Divider,
  Dropdown,
  Tooltip,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  SearchOutlined,
  SettingOutlined,
  DownloadOutlined,
  ColumnHeightOutlined,
  ReloadOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons'
import type { GridApi } from 'ag-grid-community'
import type { GridDensity, ErpColDef } from '../types'

export interface GridToolbarProps {
  api: GridApi | null
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showQuickFilter?: boolean
  quickFilterPlaceholder?: string
  showColumnChooser?: boolean
  exportFileName?: string
  density: GridDensity
  onDensityChange: (density: GridDensity) => void
  columnDefs: ErpColDef[]
  onResetColumns?: () => void
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
  api,
  leftContent,
  rightContent,
  showQuickFilter = true,
  quickFilterPlaceholder = 'Quick search...',
  showColumnChooser = true,
  exportFileName = 'export',
  density,
  onDensityChange,
  columnDefs,
  onResetColumns,
}) => {
  const [quickFilterText, setQuickFilterText] = useState('')
  const [columnStates, setColumnStates] = useState<{ colId: string; headerName: string; hide: boolean }[]>([])

  // Sync column states when grid or columnDefs change
  useEffect(() => {
    if (!api) return
    const cols = api.getColumnState()
    if (cols && cols.length > 0) {
      const mapped = cols
        .filter((c) => c.colId !== 'ag-Grid-AutoColumn' && c.colId !== '__select__' && c.colId !== 'ag-Grid-SelectionColumn')
        .map((c) => {
          const matchedDef = columnDefs.find(
            (def) => def.field === c.colId || def.colId === c.colId
          )
          const headerName =
            (matchedDef?.headerName as string) ||
            matchedDef?.menuTitle ||
            c.colId ||
            ''
          return {
            colId: c.colId,
            headerName: headerName || c.colId,
            hide: !!c.hide,
          }
        })
      setColumnStates(mapped)
    }
  }, [api, columnDefs])

  const handleQuickFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuickFilterText(val)
    api?.setGridOption('quickFilterText', val)
  }

  const handleColumnToggle = (colId: string, visible: boolean) => {
    if (!api) return
    api.setColumnsVisible([colId], visible)
    setColumnStates((prev) =>
      prev.map((c) => (c.colId === colId ? { ...c, hide: !visible } : c))
    )
  }

  const handleExportCsv = () => {
    if (!api) return
    api.exportDataAsCsv({
      fileName: `${exportFileName}_${Date.now()}.csv`,
    })
  }

  const densityMenuItems: MenuProps['items'] = [
    { key: 'compact', label: 'Compact', onClick: () => onDensityChange('compact') },
    { key: 'default', label: 'Default', onClick: () => onDensityChange('default') },
    { key: 'comfortable', label: 'Comfortable', onClick: () => onDensityChange('comfortable') },
  ]

  const columnChooserContent = (
    <div style={{ width: 280, maxHeight: 380, overflowY: 'auto' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Column Display Settings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {columnStates.map((col) => (
          <Checkbox
            key={col.colId}
            checked={!col.hide}
            disabled={col.colId === 'action' || col.colId === 'number' || col.colId === 'billNo'}
            onChange={(e) => handleColumnToggle(col.colId, e.target.checked)}
          >
            {col.headerName}
          </Checkbox>
        ))}
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <Button
        type="link"
        size="small"
        icon={<ReloadOutlined />}
        onClick={() => {
          api?.resetColumnState()
          onResetColumns?.()
        }}
      >
        Restore Default Columns
      </Button>
    </div>
  )

  return (
    <div className="erp-ag-grid-toolbar">
      <div className="erp-ag-grid-toolbar-left">
        {leftContent}
      </div>

      <div className="erp-ag-grid-toolbar-right">
        {showQuickFilter && (
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder={quickFilterPlaceholder}
            value={quickFilterText}
            onChange={handleQuickFilterChange}
            allowClear
            style={{ width: 200 }}
            size="middle"
          />
        )}

        {rightContent}

        <Tooltip title="Auto-fit Column Widths">
          <Button
            icon={<ColumnWidthOutlined />}
            onClick={() => {
              if (api) {
                api.autoSizeAllColumns(false)
              }
            }}
          />
        </Tooltip>

        <Dropdown menu={{ items: densityMenuItems, selectedKeys: [density] }} trigger={['click']}>
          <Tooltip title="Table Row Density">
            <Button icon={<ColumnHeightOutlined />} />
          </Tooltip>
        </Dropdown>

        {showColumnChooser && (
          <Popover content={columnChooserContent} trigger="click" placement="bottomRight">
            <Tooltip title="Column Settings">
              <Button icon={<SettingOutlined />} />
            </Tooltip>
          </Popover>
        )}

        <Tooltip title="Export to CSV">
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv} />
        </Tooltip>
      </div>
    </div>
  )
}
