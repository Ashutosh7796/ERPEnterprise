import type { ColDef, GridApi, GridOptions, ICellRendererParams } from 'ag-grid-community'
import React from 'react'

export type ErpColDef<T = any> = ColDef<T> & {
  /** Optional custom title identifier for column chooser */
  menuTitle?: string
}

export interface ErpPaginationConfig {
  current: number
  pageSize: number
  total: number
  onChange?: (page: number, pageSize: number) => void
  pageSizeOptions?: number[]
}

export type GridDensity = 'compact' | 'default' | 'comfortable'

export interface ErpAgGridProps<T = any> {
  /** Grid row data */
  rowData: T[]
  /** Column definitions */
  columnDefs: ErpColDef<T>[]
  /** Loading state */
  loading?: boolean
  /** Unique key extractor for each row (defaults to 'id') */
  rowKey?: keyof T | ((item: T) => string | number)
  /** Row selection mode */
  rowSelection?: 'single' | 'multiple'
  /** Selected row keys */
  selectedRowKeys?: (string | number)[]
  /** Selection change callback */
  onSelectionChange?: (selectedRows: T[], selectedKeys: (string | number)[]) => void
  /** Server-side pagination config. If omitted, standard client-side pagination or full list is used */
  pagination?: ErpPaginationConfig
  /** Whether to show the quick search bar in toolbar */
  showQuickFilter?: boolean
  /** Quick search placeholder text */
  quickFilterPlaceholder?: string
  /** Whether to show column visibility button/drawer */
  showColumnChooser?: boolean
  /** Default filename when exporting to CSV */
  exportFileName?: string
  /** Row density preset */
  density?: GridDensity
  /** Grid container height (defaults to '550px' or auto) */
  height?: string | number
  /** Additional actions to render on the left of toolbar */
  leftToolbar?: React.ReactNode
  /** Additional actions to render on the right of toolbar */
  rightToolbar?: React.ReactNode
  /** Unique identifier for persisting column widths/order/visibility in localStorage */
  persistenceKey?: string
  /** Custom grid options override */
  gridOptions?: GridOptions<T>
  /** Callback fired when grid is ready */
  onGridReady?: (api: GridApi<T>) => void
  /** Empty data custom message */
  emptyText?: string
}

export type CustomCellRendererProps<T = any, V = any> = ICellRendererParams<T, V>
