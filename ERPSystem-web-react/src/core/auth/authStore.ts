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
      set({
        token,
        user,
        isAuthenticated: true,
      })
    },

    logout: () => {
      removeToken()
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
