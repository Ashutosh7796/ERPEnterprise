import React from 'react'
import { usePermissionStore } from '@core/auth/permissionStore'

interface HasPermissionProps {
  urlPath: string
  btnId: number | string
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Enterprise declarative button permission guard component
 */
export const HasPermission: React.FC<HasPermissionProps> = ({
  urlPath,
  btnId,
  fallback = null,
  children,
}) => {
  const { hasButtonPermission } = usePermissionStore()
  const allowed = hasButtonPermission(urlPath, btnId)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
