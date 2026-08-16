import React, { useEffect } from 'react'
import { Tabs, theme as antdTheme, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { useTabStore } from '@store/useTabStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { CloseOutlined, CloseCircleOutlined } from '@ant-design/icons'

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/retail/outbound': 'Retail Dispatch',
  '/retail/return': 'Retail Returns',
  '/purchase/apply': 'Purchase Requisitions',
  '/bill/purchase_apply': 'Purchase Requisitions',
  '/purchase/order': 'Purchase Orders',
  '/purchase/inbound': 'Purchase Receipt',
  '/purchase/return': 'Purchase Returns',
  '/sales/order': 'Sales Orders',
  '/sales/outbound': 'Sales Dispatch',
  '/sales/return': 'Sales Returns',
  '/inventory/other_in': 'Other Inbound',
  '/inventory/other_out': 'Other Outbound',
  '/inventory/transfer': 'Stock Allocation',
  '/inventory/assemble': 'Assembly Bills',
  '/inventory/disassemble': 'Disassembly Bills',
  '/inventory/depot': 'Warehouse Master',
  '/financial/income': 'Income Receipts',
  '/financial/payment': 'Payment Vouchers',
  '/financial/money_in': 'Collection Notes',
  '/financial/money_out': 'Payment Notes',
  '/financial/giro': 'Transfer Notes',
  '/financial/advance_in': 'Advance Receipts',
  '/financial/account': 'Financial Accounts',
  '/report/stock': 'Stock Valuation',
  '/report/account_report': 'Account Stats',
  '/report/retail_report': 'Retail Trends',
  '/report/buy_in_report': 'Purchase Trends',
  '/report/sale_out_report': 'Sales Trends',
  '/report/in_detail': 'Inbound Details',
  '/report/out_detail': 'Outbound Details',
  '/report/allocation_detail': 'Transfer Details',
  '/report/in_material_count': 'Inbound Summary',
  '/report/out_material_count': 'Outbound Summary',
  '/report/in_out_stock_report': 'Inventory Flow',
  '/report/customer': 'Customer Statements',
  '/report/vendor': 'Vendor Statements',
  '/report/stock_warning_report': 'Stock Warning',
  '/material/list': 'Product List',
  '/material/category': 'Category Master',
  '/material/unit': 'Units of Measure',
  '/material/attribute': 'Multi-Attributes',
  '/system/person': 'Handlers',
  '/system/vendor': 'Vendor Info',
  '/system/customer': 'Customer Info',
  '/system/member': 'Member Info',
  '/system/in_out_item': 'Income/Expense Items',
  '/system/role': 'Roles',
  '/system/user': 'Users',
  '/system/organization': 'Departments',
  '/system/log': 'Logs',
  '/system/property': 'Properties',
  '/system/config': 'System Config',
  '/system/function': 'Menu Management',
  '/system/tenant': 'Tenants',
  '/system/plugin': 'Plugin Management',
  '/system/dict': 'Dictionaries',
  '/system/platform_config': 'Platform Config',
}

export const TabBar: React.FC = () => {
  const { token } = antdTheme.useToken()
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs, activeKey, removeTab, setActiveKey, addTab, closeOtherTabs, closeAllTabs } =
    useTabStore()

  // Keep active route tab in sync with correct human title
  useEffect(() => {
    const currentPath = location.pathname
    if (currentPath && currentPath !== '/') {
      const title = ROUTE_TITLE_MAP[currentPath] || 'Workspace'
      addTab({ key: currentPath, title, path: currentPath })
    }
  }, [location.pathname, addTab])

  const handleEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      const nextKey = removeTab(targetKey)
      if (location.pathname === targetKey) {
        navigate(nextKey)
      }
    }
  }

  const handleChange = (newKey: string) => {
    setActiveKey(newKey)
    navigate(newKey)
  }

  const getContextMenu = (tabKey: string): MenuProps['items'] => [
    {
      key: 'closeOther',
      icon: <CloseOutlined />,
      label: 'Close Other Tabs',
      onClick: () => closeOtherTabs(tabKey),
    },
    {
      key: 'closeAll',
      icon: <CloseCircleOutlined />,
      label: 'Close All Tabs',
      onClick: () => {
        closeAllTabs()
        navigate('/dashboard')
      },
    },
  ]

  const tabItems = tabs.map((tab) => ({
    key: tab.key,
    closable: tab.closable,
    label: (
      <Dropdown menu={{ items: getContextMenu(tab.key) }} trigger={['contextMenu']}>
        <span>{ROUTE_TITLE_MAP[tab.key] || tab.title}</span>
      </Dropdown>
    ),
  }))

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '0 16px',
      }}
    >
      <Tabs
        type="editable-card"
        hideAdd
        activeKey={activeKey}
        onChange={handleChange}
        onEdit={handleEdit}
        items={tabItems}
        size="small"
        style={{ marginBottom: 0 }}
      />
    </div>
  )
}
