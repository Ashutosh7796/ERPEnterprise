import { create } from 'zustand'
import { getToken, setToken, removeToken } from '../api/client'
import type { UserSessionDTO, MenuFunctionDTO } from '../api/types'

interface AuthState {
  token: string | null
  user: UserSessionDTO | null
  permissions: string[]
  menuTree: MenuFunctionDTO[]
  isAuthenticated: boolean
  isInitialized: boolean

  login: (token: string, user: UserSessionDTO, remember?: boolean) => void
  switchTenant: (newToken: string, newTenantId: number) => void
  logout: () => void
  setUser: (user: UserSessionDTO | null) => void
  setPermissions: (permissions: string[]) => void
  setMenuTree: (menuTree: MenuFunctionDTO[]) => void
  setInitialized: (val: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getToken()

  return {
    token: initialToken,
    user: null,
    permissions: [],
    menuTree: [],
    isAuthenticated: !!initialToken,
    isInitialized: false,

    login: (token, user, remember = true) => {
      setToken(token, remember)
      import('@store/useTabStore').then(({ useTabStore }) => useTabStore.getState().closeAllTabs())
      import('@store/useAppStore').then(({ useAppStore }) => {
        useAppStore.getState().resetUserAuth()
        useAppStore.getState().fetchUserAuth()
      })
      set({
        token,
        user,
        isAuthenticated: true,
      })
    },

    switchTenant: (newToken, newTenantId) => {
      setToken(newToken, true)
      import('@store/useTabStore').then(({ useTabStore }) => useTabStore.getState().closeAllTabs())
      import('@store/useAppStore').then(({ useAppStore }) => {
        useAppStore.getState().resetUserAuth()
        useAppStore.getState().fetchUserAuth()
      })
      set((state) => ({
        token: newToken,
        user: state.user ? { ...state.user, tenantId: newTenantId } : null,
      }))
    },

    logout: () => {
      removeToken()
      import('@store/useTabStore').then(({ useTabStore }) => useTabStore.getState().closeAllTabs())
      import('@store/useAppStore').then(({ useAppStore }) => {
        useAppStore.getState().resetUserAuth()
      })
      set({
        token: null,
        user: null,
        permissions: [],
        menuTree: [],
        isAuthenticated: false,
      })
    },

    setUser: (user) => set({ user }),
    setPermissions: (permissions) => set({ permissions }),
    setMenuTree: (menuTree) => set({ menuTree }),
    setInitialized: (isInitialized) => set({ isInitialized }),
  }
})
