import React from 'react'
import { Drawer, Switch, List, Select, Divider, Tooltip, Space } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useAppStore } from '@store/useAppStore'

const COLOR_PALETTES = [
  { key: 'dustRed', color: '#f5222d', title: 'Dust Red' },
  { key: 'volcano', color: '#fa541c', title: 'Volcano' },
  { key: 'sunsetOrange', color: '#faad14', title: 'Sunset Orange' },
  { key: 'cyan', color: '#13c2c2', title: 'Cyan' },
  { key: 'green', color: '#52c41a', title: 'Aurora Green' },
  { key: 'daybreakBlue', color: '#1890ff', title: 'Daybreak Blue (Default)' },
  { key: 'geekBlue', color: '#2f54eb', title: 'Geek Blue' },
  { key: 'goldenPurple', color: '#722ed1', title: 'Golden Purple' },
]

export const SettingDrawer: React.FC = () => {
  const { settingDrawerVisible, setSettingDrawerVisible, themeSettings, updateThemeSettings } = useAppStore()

  return (
    <Drawer
      title="Interface Settings"
      placement="right"
      size="default"
      styles={{ wrapper: { width: 300 } }}
      onClose={() => setSettingDrawerVisible(false)}
      open={settingDrawerVisible}
    >
      {/* Sider Theme Style */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Theme Style</h4>
        <Space size="large">
          {/* Dark Sider */}
          <Tooltip title="Dark Menu Style">
            <div
              onClick={() => updateThemeSettings({ siderTheme: 'dark' })}
              style={{
                width: 48,
                height: 40,
                borderRadius: 4,
                cursor: 'pointer',
                background: '#f0f2f5',
                position: 'relative',
                boxShadow: themeSettings.siderTheme === 'dark' ? '0 0 0 2px #1890ff' : '0 1px 3px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: 16, height: '100%', background: '#001529', position: 'absolute', left: 0, top: 0 }} />
              <div style={{ width: 32, height: 10, background: '#fff', position: 'absolute', right: 0, top: 0 }} />
              {themeSettings.siderTheme === 'dark' && (
                <CheckOutlined style={{ position: 'absolute', right: 8, bottom: 6, color: '#1890ff', fontSize: 14 }} />
              )}
            </div>
          </Tooltip>

          {/* Light Sider */}
          <Tooltip title="Light Menu Style">
            <div
              onClick={() => updateThemeSettings({ siderTheme: 'light' })}
              style={{
                width: 48,
                height: 40,
                borderRadius: 4,
                cursor: 'pointer',
                background: '#f0f2f5',
                position: 'relative',
                boxShadow: themeSettings.siderTheme === 'light' ? '0 0 0 2px #1890ff' : '0 1px 3px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: 16, height: '100%', background: '#fff', position: 'absolute', left: 0, top: 0 }} />
              <div style={{ width: 32, height: 10, background: '#fff', position: 'absolute', right: 0, top: 0 }} />
              {themeSettings.siderTheme === 'light' && (
                <CheckOutlined style={{ position: 'absolute', right: 8, bottom: 6, color: '#1890ff', fontSize: 14 }} />
              )}
            </div>
          </Tooltip>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Primary Accent Color */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Theme Color</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COLOR_PALETTES.map((item) => (
            <Tooltip key={item.key} title={item.title}>
              <div
                onClick={() => updateThemeSettings({ primaryColor: item.color })}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 3,
                  backgroundColor: item.color,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                {themeSettings.primaryColor === item.color && <CheckOutlined style={{ fontSize: 12 }} />}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Navigation & Layout Settings */}
      <List size="small" split={false}>
        <List.Item
          actions={[
            <Switch
              key="fixedHeader"
              size="small"
              checked={themeSettings.fixedHeader}
              onChange={(checked) => updateThemeSettings({ fixedHeader: checked })}
            />,
          ]}
        >
          <span>Fixed Header</span>
        </List.Item>

        <List.Item
          actions={[
            <Switch
              key="autoHideHeader"
              size="small"
              checked={themeSettings.autoHideHeader}
              onChange={(checked) => updateThemeSettings({ autoHideHeader: checked })}
            />,
          ]}
        >
          <span>Hide Header on Scroll</span>
        </List.Item>

        <List.Item
          actions={[
            <Switch
              key="fixedSidebar"
              size="small"
              checked={themeSettings.fixedSidebar}
              onChange={(checked) => updateThemeSettings({ fixedSidebar: checked })}
            />,
          ]}
        >
          <span>Fixed Sidebar</span>
        </List.Item>

        <List.Item
          actions={[
            <Switch
              key="multipage"
              size="small"
              checked={themeSettings.multipage}
              onChange={(checked) => updateThemeSettings({ multipage: checked })}
            />,
          ]}
        >
          <span>Multi-Tab Bar</span>
        </List.Item>
      </List>

      <Divider style={{ margin: '16px 0' }} />

      {/* Language Settings */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 10, fontWeight: 600, fontSize: 14 }}>Language</h4>
        <Select
          style={{ width: '100%' }}
          value={themeSettings.language}
          onChange={(val) => updateThemeSettings({ language: val })}
          options={[
            { value: 'english', label: '🇬🇧 English' },
            { value: 'chinese_simplified', label: '🇨🇳 简体中文 (Chinese)' },
          ]}
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Other Settings */}
      <List size="small" split={false}>
        <List.Item
          actions={[
            <Switch
              key="colorWeak"
              size="small"
              checked={themeSettings.colorWeak}
              onChange={(checked) => updateThemeSettings({ colorWeak: checked })}
            />,
          ]}
        >
          <span>Color Weak Mode</span>
        </List.Item>
      </List>
    </Drawer>
  )
}
