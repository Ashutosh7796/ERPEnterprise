import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type GridApi,
  type GridReadyEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community'
import { Spin, theme as antdTheme } from 'antd'
import { GridToolbar } from './toolbars/GridToolbar'
import { GridPagination } from './toolbars/GridPagination'
import { useGridStatePersistence } from './hooks/useGridStatePersistence'
import type { ErpAgGridProps, GridDensity, ErpColDef } from './types'
import './ErpAgGrid.css'

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule])

export function ErpAgGrid<T = any>({
  rowData,
  columnDefs,
  loading = false,
  rowKey = 'id' as any,
  rowSelection,
  selectedRowKeys = [],
  onSelectionChange,
  pagination,
  showQuickFilter = true,
  quickFilterPlaceholder,
  showColumnChooser = true,
  exportFileName = 'data_export',
  density: initialDensity = 'default',
  height = '520px',
  leftToolbar,
  rightToolbar,
  persistenceKey,
  gridOptions,
  onGridReady: onGridReadyProp,
}: ErpAgGridProps<T>) {
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null)
  const [density, setDensity] = useState<GridDensity>(initialDensity)
  const { saveState, restoreState, resetState } = useGridStatePersistence(persistenceKey)
  const { token } = antdTheme.useToken()

  // Row height based on density preset
  const rowHeight = useMemo(() => {
    if (density === 'compact') return 36
    if (density === 'comfortable') return 52
    return 42
  }, [density])

  const headerHeight = useMemo(() => {
    if (density === 'compact') return 38
    if (density === 'comfortable') return 48
    return 42
  }, [density])

  // Custom AG Grid Theme bridged to Ant Design tokens
  const gridTheme = useMemo(() => {
    try {
      return themeQuartz.withParams({
        accentColor: token.colorPrimary || '#1677ff',
        backgroundColor: token.colorBgContainer || '#ffffff',
        borderColor: token.colorBorderSecondary || '#f0f0f0',
        foregroundColor: token.colorText || '#262626',
        headerBackgroundColor: '#fafafa',
        headerTextColor: '#595959',
        rowHoverColor: '#f5f7fa',
        selectedRowBackgroundColor: '#e6f4ff',
        fontSize: 13,
        wrapperBorderRadius: 0,
        borderRadius: 4,
        spacing: density === 'compact' ? 4 : density === 'comfortable' ? 8 : 6,
      })
    } catch {
      return themeQuartz
    }
  }, [token, density])

  // Extract ID from row
  const getRowId = useCallback(
    (item: T): string => {
      if (typeof rowKey === 'function') {
        return String(rowKey(item))
      }
      return String((item as any)[rowKey] || '')
    },
    [rowKey]
  )

  // Configure native Selection Column Def
  const selectionColumnDef = useMemo(() => {
    if (rowSelection !== 'multiple') return undefined
    return {
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      pinned: 'left' as const,
      lockPinned: true,
      suppressHeaderMenuButton: true,
      resizable: false,
      sortable: false,
      filter: false,
    }
  }, [rowSelection])

  // Process column definitions with defaults
  const finalColumnDefs = useMemo<ErpColDef<T>[]>(() => {
    return columnDefs.map((col) => {
      // Pin action column to left
      if (col.colId === 'action' || col.field === 'action') {
        return {
          pinned: 'left',
          lockPinned: true,
          suppressHeaderMenuButton: true,
          sortable: false,
          filter: false,
          resizable: true,
          minWidth: 120,
          ...col,
        }
      }

      return {
        minWidth: 110,
        resizable: true,
        tooltipValueGetter: (p: any) => {
          if (p.value !== undefined && p.value !== null && typeof p.value !== 'object') {
            return String(p.value)
          }
          return undefined
        },
        ...col,
      }
    })
  }, [columnDefs])

  // Handle Grid Ready
  const onGridReady = useCallback(
    (params: GridReadyEvent<T>) => {
      setGridApi(params.api)
      restoreState(params.api)
      // Auto-fit column widths to content
      setTimeout(() => {
        if (params.api) {
          params.api.autoSizeAllColumns(false)
        }
      }, 60)
      onGridReadyProp?.(params.api)
    },
    [restoreState, onGridReadyProp]
  )

  // Save column state on column moved, resized, or visibility changed
  const onColumnEvent = useCallback(() => {
    if (gridApi) {
      saveState(gridApi)
    }
  }, [gridApi, saveState])

  // Sync selection from parent prop
  useEffect(() => {
    if (!gridApi) return
    gridApi.forEachNode((node) => {
      if (!node.data) return
      const id = getRowId(node.data)
      const shouldSelect = selectedRowKeys.includes(id) || selectedRowKeys.includes(Number(id))
      if (node.isSelected() !== shouldSelect) {
        node.setSelected(shouldSelect, false)
      }
    })
  }, [gridApi, selectedRowKeys, getRowId])

  // Handle Selection Change from AG Grid
  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent<T>) => {
      if (!onSelectionChange) return
      const selectedNodes = event.api.getSelectedNodes()
      const selectedData = selectedNodes.map((n) => n.data).filter(Boolean) as T[]
      const selectedKeys = selectedData.map(getRowId)
      onSelectionChange(selectedData, selectedKeys)
    },
    [onSelectionChange, getRowId]
  )

  const computedHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <div className="erp-ag-grid-container">
      {/* Grid Toolbar */}
      <GridToolbar
        api={gridApi}
        leftContent={leftToolbar}
        rightContent={rightToolbar}
        showQuickFilter={showQuickFilter}
        quickFilterPlaceholder={quickFilterPlaceholder}
        showColumnChooser={showColumnChooser}
        exportFileName={exportFileName}
        density={density}
        onDensityChange={setDensity}
        columnDefs={finalColumnDefs}
        onResetColumns={() => {
          if (gridApi) {
            resetState(gridApi)
            gridApi.autoSizeAllColumns(false)
          }
        }}
      />

      {/* Grid Canvas */}
      <div
        className="erp-ag-grid-wrapper"
        style={{
          height: computedHeight,
          minHeight: '400px',
        }}
      >
        <Spin spinning={loading} tip="Loading data..." style={{ height: '100%', width: '100%' }}>
          <div style={{ height: '100%', width: '100%' }}>
            <AgGridReact<T>
              theme={gridTheme}
              rowData={rowData}
              columnDefs={finalColumnDefs}
              selectionColumnDef={selectionColumnDef}
              rowSelection={
                rowSelection === 'multiple'
                  ? { mode: 'multiRow', selectAll: 'all' }
                  : rowSelection === 'single'
                  ? { mode: 'singleRow' }
                  : undefined
              }
              rowHeight={rowHeight}
              headerHeight={headerHeight}
              onGridReady={onGridReady}
              onFirstDataRendered={(params) => params.api.autoSizeAllColumns(false)}
              onSelectionChanged={onSelectionChanged}
              onColumnResized={onColumnEvent}
              onColumnMoved={onColumnEvent}
              onColumnVisible={onColumnEvent}
              animateRows={true}
              enableCellTextSelection={true}
              suppressCellFocus={false}
              suppressDragLeaveHidesColumns={true}
              getRowId={(params) => getRowId(params.data)}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                minWidth: 100,
                flex: 0,
              }}
              {...gridOptions}
            />
          </div>
        </Spin>
      </div>

      {/* Pagination Footer */}
      <GridPagination pagination={pagination} />
    </div>
  )
}
