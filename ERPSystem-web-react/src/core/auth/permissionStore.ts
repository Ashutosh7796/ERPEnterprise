import { create } from 'zustand'
import { http } from '@core/api/client'
import { useAuthStore } from './authStore'

export interface ButtonPermissionEntry {
  url: string
  btnStr: string
}

interface PermissionState {
  btnPermissions: Record<string, string[]>
  isLoading: boolean
  isLoaded: boolean

  fetchButtonPermissions: () => Promise<void>
  hasButtonPermission: (urlPath: string, btnId: number | string) => boolean
  clearPermissions: () => void
}

const WIN_BTN_STORAGE_KEY = 'winBtnStrList'

export const usePermissionStore = create<PermissionState>((set, get) => {
  // Load pre-cached permissions if available
  let initialMap: Record<string, string[]> = {}
  try {
    const raw = localStorage.getItem(WIN_BTN_STORAGE_KEY)
    if (raw) {
      const list: ButtonPermissionEntry[] = JSON.parse(raw)
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item.url && item.btnStr) {
            initialMap[item.url] = item.btnStr.split(',').map((s) => s.trim())
          }
        })
      }
    }
  } catch (_) {}

  return {
    btnPermissions: initialMap,
    isLoading: false,
    isLoaded: Object.keys(initialMap).length > 0,

    fetchButtonPermissions: async () => {
      const user = useAuthStore.getState().user
      // If admin, grant all permissions by default
      if (user?.loginName === 'admin' || user?.userName === 'admin') {
        set({ isLoaded: true })
        return
      }

      set({ isLoading: true })
      try {
        const res = await http.get<any>('/user/getUserBtnByCurrentUser')
        const rawList = res?.data?.userBtn || res?.userBtn || res?.data || []
        const parsedList: ButtonPermissionEntry[] = Array.isArray(rawList)
          ? rawList
          : typeof rawList === 'string'
          ? JSON.parse(rawList)
          : []

        const map: Record<string, string[]> = {}
        parsedList.forEach((item) => {
          if (item.url && item.btnStr) {
            map[item.url] = item.btnStr.split(',').map((s) => s.trim())
          }
        })

        localStorage.setItem(WIN_BTN_STORAGE_KEY, JSON.stringify(parsedList))
        set({ btnPermissions: map, isLoaded: true })
      } catch (err) {
        console.warn('Failed to fetch button permissions:', err)
      } finally {
        set({ isLoading: false })
      }
    },

    hasButtonPermission: (urlPath: string, btnId: number | string) => {
      const user = useAuthStore.getState().user
      if (user?.loginName === 'admin' || user?.userName === 'admin') {
        return true
      }

      const { btnPermissions } = get()
      const allowed = btnPermissions[urlPath]
      if (!allowed || allowed.length === 0) {
        // If no explicit restriction configured for this route, allow action by default
        return true
      }

      return allowed.includes(String(btnId)) || allowed.includes('*')
    },

    clearPermissions: () => {
      localStorage.removeItem(WIN_BTN_STORAGE_KEY)
      set({ btnPermissions: {}, isLoaded: false })
    },
  }
})

/**
 * Enterprise hook to query permission capabilities on a specific route view
 * @param urlPath e.g. '/system/user', '/material/list', '/bill/purchase_order'
 */
export function usePermission(urlPath: string) {
  const { hasButtonPermission } = usePermissionStore()
  const user = useAuthStore.getState().user
  const isAdmin = user?.loginName === 'admin' || user?.userName === 'admin'

  return {
    isAdmin,
    canAdd: isAdmin || hasButtonPermission(urlPath, 1),
    canEdit: isAdmin || hasButtonPermission(urlPath, 2) || hasButtonPermission(urlPath, 1),
    canDelete: isAdmin || hasButtonPermission(urlPath, 1) || hasButtonPermission(urlPath, 2),
    canExport: isAdmin || hasButtonPermission(urlPath, 3),
    canImport: isAdmin || hasButtonPermission(urlPath, 3),
    canAudit: isAdmin || hasButtonPermission(urlPath, 7),
    hasPermission: (btnId: number | string) => hasButtonPermission(urlPath, btnId),
  }
}
