import React, { type ReactNode } from 'react'
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from '@store/useAppStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  const darkMode = useAppStore((state) => state.darkMode)
  const themeSettings = useAppStore((state) => state.themeSettings)

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={themeSettings.language === 'chinese_simplified' ? zhCN : enUS}
        theme={{
          algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: themeSettings.primaryColor || '#1890ff',
            borderRadius: 4,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
