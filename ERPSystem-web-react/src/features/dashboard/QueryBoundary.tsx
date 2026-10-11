import type { ReactNode } from 'react'
import { Alert, Button, Empty, Skeleton } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UseQueryResult } from '@tanstack/react-query'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  isEmpty?: (data: T) => boolean
  emptyText?: ReactNode
  errorText?: string
  skeletonLines?: number
  children: (data: T) => ReactNode
}

export function QueryBoundary<T>({
  query,
  isEmpty,
  emptyText = 'No data available',
  errorText = 'Unable to load data',
  skeletonLines = 4,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return (
      <div data-testid="dashboard-loading">
        <Skeleton active title={false} paragraph={{ rows: skeletonLines }} />
      </div>
    )
  }

  if (query.isError) {
    const description = query.error instanceof Error ? query.error.message : undefined
    return (
      <Alert
        type="error"
        showIcon
        title={errorText}
        description={description}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void query.refetch()}>
            Retry
          </Button>
        }
      />
    )
  }

  const data = query.data
  if (!data) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }

  if (isEmpty && isEmpty(data)) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }

  return <>{children(data)}</>
}