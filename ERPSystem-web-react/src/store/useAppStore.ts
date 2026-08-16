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
    const saved = localStorage.getItem('jsh_react_theme_settings')
    if (saved) {
      return { ...DEFAULT_THEME, ...JSON.parse(saved) }
    }
  } catch {
    // fallback
  }
  return DEFAULT_THEME
}

const saveTheme = (settings: ThemeSettings) => {
  try {
    localStorage.setItem('jsh_react_theme_settings', JSON.stringify(settings))
  } catch {
    // ignore
  }
}

interface AppState {
  collapsed: boolean
  darkMode: boolean
  activeTenantId: number | null
  platformName: string
  themeSettings: ThemeSettings
  settingDrawerVisible: boolean
  changePasswordVisible: boolean

  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  setDarkMode: (darkMode: boolean) => void
  toggleDarkMode: () => void
  setActiveTenantId: (tenantId: number | null) => void
  setPlatformName: (name: string) => void
  updateThemeSettings: (partial: Partial<ThemeSettings>) => void
  setSettingDrawerVisible: (visible: boolean) => void
  setChangePasswordVisible: (visible: boolean) => void
}

const initialTheme = loadSavedTheme()

export const useAppStore = create<AppState>((set) => ({
  collapsed: false,
  darkMode: false,
  activeTenantId: null,
  platformName: 'jshERP Pro',
  themeSettings: initialTheme,
  settingDrawerVisible: false,
  changePasswordVisible: false,

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
