import { create } from 'zustand'

export interface TabItem {
  key: string
  title: string
  path: string
  closable?: boolean
}

interface TabState {
  tabs: TabItem[]
  activeKey: string
  addTab: (tab: TabItem) => void
  removeTab: (targetKey: string) => string
  setActiveKey: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
}

const DEFAULT_TAB: TabItem = {
  key: '/dashboard',
  title: 'Dashboard',
  path: '/dashboard',
  closable: false,
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [DEFAULT_TAB],
  activeKey: '/dashboard',

  addTab: (newTab) => {
    const { tabs } = get()
    const exists = tabs.some((t) => t.key === newTab.key)
    if (!exists) {
      set({ tabs: [...tabs, { ...newTab, closable: newTab.closable ?? true }], activeKey: newTab.key })
    } else {
      set({ activeKey: newTab.key })
    }
  },

  removeTab: (targetKey) => {
    const { tabs, activeKey } = get()
    const targetIndex = tabs.findIndex((t) => t.key === targetKey)
    const newTabs = tabs.filter((t) => t.key !== targetKey)
    let nextActiveKey = activeKey

    if (activeKey === targetKey) {
      if (newTabs.length > 0) {
        nextActiveKey = newTabs[Math.max(0, targetIndex - 1)].key
      } else {
        nextActiveKey = DEFAULT_TAB.key
        newTabs.push(DEFAULT_TAB)
      }
    }

    set({ tabs: newTabs, activeKey: nextActiveKey })
    return nextActiveKey
  },

  setActiveKey: (activeKey) => set({ activeKey }),

  closeOtherTabs: (key) => {
    const { tabs } = get()
    const newTabs = tabs.filter((t) => !t.closable || t.key === key)
    set({ tabs: newTabs, activeKey: key })
  },

  closeAllTabs: () => {
    set({ tabs: [DEFAULT_TAB], activeKey: DEFAULT_TAB.key })
  },
}))
