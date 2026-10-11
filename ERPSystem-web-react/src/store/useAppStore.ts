import { create } from 'zustand'

export interface ThemeSettings {
  siderTheme: 'dark' | 'light'
  primaryColor: string
  fixedHeader: boolean
  autoHideHeader: boolean
  fixedSidebar: boolean
  multipage: boolean
  colorWeak: boolean
  language: 'english' | 'chinese_simplified'
}

const DEFAULT_THEME: ThemeSettings = {
  siderTheme: 'light',
  primaryColor: '#1890ff',
  fixedHeader: true,
  autoHideHeader: false,
  fixedSidebar: true,
  multipage: true,
  colorWeak: false,
  language: 'english',
}

const loadSavedTheme = (): ThemeSettings => {
  try {
    const saved = localStorage.getItem('erp_react_theme_settings') || localStorage.getItem('jsh_react_theme_settings')
    if (saved) {
      return { ...DEFAULT_THEME, ...JSON.parse(saved), language: 'english' }
    }
  } catch {
    // fallback
  }
  return DEFAULT_THEME
}

const saveTheme = (settings: ThemeSettings) => {
  try {
    localStorage.setItem('erp_react_theme_settings', JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export type AuthorityDomain = 'PLATFORM' | 'SUPPORT_OPERATIONS' | 'TENANT' | 'SUPPORT_SESSION'

export interface UserAuth {
  authorityDomain: AuthorityDomain
  isSuperAdmin: boolean
  isSystemSupport: boolean
  isTenantAdmin: boolean
  isSupportSession: boolean
  supportAccessMode: 'READ_ONLY' | 'APPROVED_WRITE' | null
  supportModuleScope: string | null
  supportExpiresAt: number | null
  originatingAuthorityDomain: AuthorityDomain | null
  tenantId: number | null
  tenantName: string | null
  userId: number | null
  loginName: string
  userName: string
  roleId: number | null
  roleName: string
  roleType: string
  permissions: string[]
  permittedPaths: string[]
  loaded: boolean
}

const DEFAULT_AUTH: UserAuth = {
  authorityDomain: 'TENANT',
  isSuperAdmin: false,
  isSystemSupport: false,
  isTenantAdmin: false,
  isSupportSession: false,
  supportAccessMode: null,
  supportModuleScope: null,
  supportExpiresAt: null,
  originatingAuthorityDomain: null,
  tenantId: null,
  tenantName: null,
  userId: null,
  loginName: '',
  userName: '',
  roleId: null,
  roleName: '',
  roleType: 'User',
  permissions: [],
  permittedPaths: [],
  loaded: false,
}

interface AppState {
  collapsed: boolean
  darkMode: boolean
  activeTenantId: number | null
  platformName: string
  themeSettings: ThemeSettings
  settingDrawerVisible: boolean
  changePasswordVisible: boolean
  userAuth: UserAuth

  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  setDarkMode: (darkMode: boolean) => void
  toggleDarkMode: () => void
  setActiveTenantId: (tenantId: number | null) => void
  setPlatformName: (name: string) => void
  updateThemeSettings: (partial: Partial<ThemeSettings>) => void
  setSettingDrawerVisible: (visible: boolean) => void
  setChangePasswordVisible: (visible: boolean) => void
  setUserAuth: (auth: Partial<UserAuth>) => void
  resetUserAuth: () => void
  fetchUserAuth: () => Promise<void>
}

const initialTheme = loadSavedTheme()

export const useAppStore = create<AppState>((set, get) => ({
  collapsed: false,
  darkMode: false,
  activeTenantId: null,
  platformName: 'ERPSystem',
  themeSettings: initialTheme,
  settingDrawerVisible: false,
  changePasswordVisible: false,
  userAuth: DEFAULT_AUTH,

  setUserAuth: (auth) =>
    set((state) => ({ userAuth: { ...state.userAuth, ...auth } })),

  resetUserAuth: () => set({ userAuth: DEFAULT_AUTH }),

  fetchUserAuth: async () => {
    try {
      const { http } = await import('@core/api/client')
      const res: any = await http.get('/function/findUserAuthorization')
      if (res) {
        const authObj = res.data && typeof res.data === 'object' ? res.data : res
        
        let domain: AuthorityDomain = (authObj.authorityDomain || res.authorityDomain || 'TENANT') as AuthorityDomain
        const isSuperAdmin = Boolean(authObj.isSuperAdmin ?? res.isSuperAdmin)
        const isSystemSupport = Boolean(authObj.isSystemSupport ?? res.isSystemSupport)
        const isTenantAdmin = Boolean(authObj.isTenantAdmin ?? res.isTenantAdmin)
        const isSupportSession = Boolean(authObj.isSupportSession ?? res.isSupportSession)

        if (isSupportSession) {
          domain = 'SUPPORT_SESSION'
        } else if (isSuperAdmin && (!authObj.tenantId || authObj.tenantId === 0)) {
          domain = 'PLATFORM'
        } else if (isSystemSupport && (!authObj.tenantId || authObj.tenantId === 0)) {
          domain = 'SUPPORT_OPERATIONS'
        }

        set({
          userAuth: {
            ...authObj,
            authorityDomain: domain,
            isSuperAdmin,
            isSystemSupport,
            isTenantAdmin,
            isSupportSession,
            supportAccessMode: authObj.supportAccessMode || res.supportAccessMode || null,
            supportModuleScope: authObj.supportModuleScope || res.supportModuleScope || null,
            supportExpiresAt: authObj.supportExpiresAt || res.supportExpiresAt || null,
            originatingAuthorityDomain: authObj.originatingAuthorityDomain || res.originatingAuthorityDomain || (isSuperAdmin ? 'PLATFORM' : 'SUPPORT_OPERATIONS'),
            permittedPaths: authObj.permittedPaths || res.permittedPaths || [],
            permissions: authObj.permissions || res.permissions || [],
            loginName: authObj.loginName || res.loginName || '',
            userName: authObj.userName || res.userName || '',
            roleId: authObj.roleId ?? res.roleId ?? null,
            roleName: authObj.roleName || res.roleName || '',
            roleType: authObj.roleType || res.roleType || 'User',
            tenantId: authObj.tenantId ?? res.tenantId ?? null,
            tenantName: authObj.tenantName || res.tenantName || null,
            loaded: true,
          },
        })
      }
    } catch (e) {
      console.warn('Failed to fetch user authorization state', e)
    }
  },

  setCollapsed: (collapsed) => set({ collapsed }),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setActiveTenantId: (activeTenantId) => set({ activeTenantId }),
  setPlatformName: (platformName) => set({ platformName }),

  updateThemeSettings: (partial) =>
    set((state) => {
      const updated = { ...state.themeSettings, ...partial }
      saveTheme(updated)

      // Apply color-weak mode directly to HTML body
      if ('colorWeak' in partial) {
        if (partial.colorWeak) {
          document.body.classList.add('colorWeak')
        } else {
          document.body.classList.remove('colorWeak')
        }
      }

      return { themeSettings: updated }
    }),

  setSettingDrawerVisible: (settingDrawerVisible) => set({ settingDrawerVisible }),
  setChangePasswordVisible: (changePasswordVisible) => set({ changePasswordVisible }),
}))
