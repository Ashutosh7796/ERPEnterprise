import React, { useMemo } from 'react'
import { Layout, Menu, theme as antdTheme } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  GiftOutlined,
  SyncOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  DollarCircleOutlined,
  PieChartOutlined,
  AppstoreOutlined,
  ClusterOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@store/useAppStore'
import { useTabStore } from '@store/useTabStore'

const { Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

export const Sidebar: React.FC = () => {
  const { token } = antdTheme.useToken()
  const navigate = useNavigate()
  const location = useLocation()
  const { collapsed, themeSettings } = useAppStore()
  const addTab = useTabStore((state) => state.addTab)

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/retail',
        icon: <GiftOutlined />,
        label: 'Retail',
        children: [
          { key: '/retail/outbound', label: 'Retail Dispatch' },
          { key: '/retail/return', label: 'Retail Returns' },
        ],
      },
      {
        key: '/purchase',
        icon: <SyncOutlined />,
        label: 'Purchasing',
        children: [
          { key: '/purchase/apply', label: 'Purchase Requisitions' },
          { key: '/purchase/order', label: 'Purchase Orders' },
          { key: '/purchase/inbound', label: 'Purchase Receipt' },
          { key: '/purchase/return', label: 'Purchase Returns' },
        ],
      },
      {
        key: '/sales',
        icon: <ShoppingCartOutlined />,
        label: 'Sales',
        children: [
          { key: '/sales/order', label: 'Sales Orders' },
          { key: '/sales/outbound', label: 'Sales Dispatch' },
          { key: '/sales/return', label: 'Sales Returns' },
        ],
      },
      {
        key: '/inventory',
        icon: <DatabaseOutlined />,
        label: 'Inventory',
        children: [
          { key: '/inventory/other_in', label: 'Other Inbound' },
          { key: '/inventory/other_out', label: 'Other Outbound' },
          { key: '/inventory/transfer', label: 'Stock Allocation' },
          { key: '/inventory/assemble', label: 'Assembly Bills' },
          { key: '/inventory/disassemble', label: 'Disassembly Bills' },
        ],
      },
      {
        key: '/financial',
        icon: <DollarCircleOutlined />,
        label: 'Finance',
        children: [
          { key: '/financial/income', label: 'Income Receipts' },
          { key: '/financial/payment', label: 'Payment Vouchers' },
          { key: '/financial/money_in', label: 'Collection Notes' },
          { key: '/financial/money_out', label: 'Payment Notes' },
          { key: '/financial/giro', label: 'Transfer Notes' },
          { key: '/financial/advance_in', label: 'Advance Receipts' },
        ],
      },
      {
        key: '/report',
        icon: <PieChartOutlined />,
        label: 'Reports',
        children: [
          { key: '/report/stock', label: 'Stock Valuation' },
          { key: '/report/account_report', label: 'Account Stats' },
          { key: '/report/retail_report', label: 'Retail Trends' },
          { key: '/report/buy_in_report', label: 'Purchase Trends' },
          { key: '/report/sale_out_report', label: 'Sales Trends' },
          { key: '/report/in_detail', label: 'Inbound Details' },
          { key: '/report/out_detail', label: 'Outbound Details' },
          { key: '/report/allocation_detail', label: 'Transfer Details' },
          { key: '/report/in_material_count', label: 'Inbound Summary' },
          { key: '/report/out_material_count', label: 'Outbound Summary' },
          { key: '/report/in_out_stock_report', label: 'Inventory Flow' },
          { key: '/report/customer', label: 'Customer Statements' },
          { key: '/report/vendor', label: 'Vendor Statements' },
          { key: '/report/stock_warning_report', label: 'Stock Warning' },
        ],
      },
      {
        key: '/material',
        icon: <AppstoreOutlined />,
        label: 'Products',
        children: [
          { key: '/material/list', label: 'Product List' },
          { key: '/material/category', label: 'Category Master' },
          { key: '/material/unit', label: 'Units of Measure' },
          { key: '/material/attribute', label: 'Multi-Attributes' },
        ],
      },
      {
        key: '/master_data',
        icon: <ClusterOutlined />,
        label: 'Master Data',
        children: [
          { key: '/inventory/depot', label: 'Warehouse Info' },
          { key: '/financial/account', label: 'Settlement Accounts' },
          { key: '/system/person', label: 'Handlers' },
          { key: '/system/vendor', label: 'Vendor Info' },
          { key: '/system/customer', label: 'Customer Info' },
          { key: '/system/member', label: 'Member Info' },
          { key: '/system/in_out_item', label: 'Income/Expense Items' },
        ],
      },
      {
        key: '/gst',
        icon: <SafetyCertificateOutlined />,
        label: 'GST & Compliance',
        children: [
          { key: '/gst/company_gstin', label: 'Company GSTINs' },
          { key: '/gst/hsn_sac', label: 'HSN / SAC Catalog' },
          { key: '/gst/tax_rates', label: 'Tax Slabs & Rates' },
          { key: '/gst/tax_rules', label: 'Effective Tax Rules' },
          { key: '/gst/state_codes', label: 'Indian State Codes' },
          { key: '/gst/financial_year', label: 'Financial Year & Sequences' },
          { key: '/gst/tax_calculator', label: 'GST Tax Calculator' },
        ],
      },
      {
        key: '/system',
        icon: <SettingOutlined />,
        label: 'System',
        children: [
          { key: '/system/role', label: 'Roles' },
          { key: '/system/user', label: 'Users' },
          { key: '/system/organization', label: 'Departments' },
          { key: '/system/log', label: 'Logs' },
          { key: '/system/property', label: 'Properties' },
          { key: '/system/config', label: 'System Config' },
          { key: '/system/function', label: 'Menu Management' },
          { key: '/system/tenant', label: 'Tenants' },
          { key: '/system/plugin', label: 'Plugin Management' },
          { key: '/system/dict', label: 'Dictionaries' },
          { key: '/system/platform_config', label: 'Platform Config' },
        ],
      },
    ],
    []
  )

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key)
    const findLabel = (items: MenuItem[], targetKey: string): string => {
      for (const item of items) {
        if (!item) continue
        if ('key' in item && item.key === targetKey && 'label' in item) {
          return String(item.label)
        }
        if ('children' in item && item.children) {
          const res = findLabel(item.children, targetKey)
          if (res) return res
        }
      }
      return 'Page'
    }

    const title = findLabel(menuItems, e.key)
    addTab({ key: e.key, title, path: e.key })
  }

  const selectedKeys = [location.pathname]
  const openKeys = useMemo(() => {
    const segments = location.pathname.split('/')
    if (segments.length > 2) {
      return [`/${segments[1]}`]
    }
    return []
  }, [location.pathname])

  const isDark = themeSettings.siderTheme === 'dark'

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={220}
      theme={isDark ? 'dark' : 'light'}
      style={{
        height: '100vh',
        position: themeSettings.fixedSidebar ? 'sticky' : 'relative',
        top: 0,
        left: 0,
        zIndex: 101,
        boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
      }}
    >
      {/* Brand logo header */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 18,
          color: isDark ? '#fff' : token.colorPrimary,
          background: isDark ? '#001529' : '#fff',
          borderBottom: isDark ? '1px solid #102336' : `1px solid ${token.colorBorderSecondary}`,
          transition: 'all 0.3s',
        }}
      >
        {collapsed ? 'ERP' : 'ERPSystem Pro'}
      </div>
      <div style={{ height: 'calc(100vh - 52px)', overflowY: 'auto' }}>
        <Menu
          mode="inline"
          theme={isDark ? 'dark' : 'light'}
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </div>
    </Sider>
  )
}
