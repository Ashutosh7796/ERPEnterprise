import React from 'react'
import { Pagination } from 'antd'
import type { ErpPaginationConfig } from '../types'

export interface GridPaginationProps {
  pagination?: ErpPaginationConfig
}

export const GridPagination: React.FC<GridPaginationProps> = ({ pagination }) => {
  if (!pagination) return null

  const {
    current = 1,
    pageSize = 10,
    total = 0,
    onChange,
    pageSizeOptions = [10, 20, 30, 50, 100],
  } = pagination

  const startRecord = total === 0 ? 0 : (current - 1) * pageSize + 1
  const endRecord = Math.min(current * pageSize, total)

  return (
    <div className="erp-ag-grid-footer">
      <div className="erp-ag-grid-record-count">
        {total > 0
          ? `${startRecord}-${endRecord} of ${total} records`
          : '0 records'}
      </div>
      <Pagination
        size="small"
        current={current}
        pageSize={pageSize}
        total={total}
        showSizeChanger
        pageSizeOptions={pageSizeOptions.map(String)}
        onChange={onChange}
        showQuickJumper
      />
    </div>
  )
}
