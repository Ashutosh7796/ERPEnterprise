import React, { useEffect } from 'react'
import { Tabs, theme as antdTheme, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { useTabStore } from '@store/useTabStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { CloseOutlined, CloseCircleOutlined } from '@ant-design/icons'

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  // Sales & Billing
  '/sales/orders': 'Sales Orders',
  '/sales/order': 'Sales Orders',
  '/sales/invoices': 'Billing Documents',
  '/sales/billing': 'Billing Documents',
  '/sales/invoices/new': 'New Tax Invoice',
  '/sales/credit_notes': 'Credit & Debit Notes',
  '/sales/credit_notes/new': 'New Credit Note',
  '/sales/debit_notes/new': 'New Debit Note',
  '/sales/outbound': 'Outbound Deliveries',
  '/sales/returns': 'Customer Returns',
  '/sales/return': 'Customer Returns',
  '/sales/einvoice_workspace': 'eDocument Workspace',
  // Procurement
  '/procurement/requisitions': 'Purchase Requisitions',
  '/purchase/apply': 'Purchase Requisitions',
  '/bill/purchase_apply': 'Purchase Requisitions',
  '/procurement/orders': 'Purchase Orders',
  '/purchase/order': 'Purchase Orders',
  '/procurement/inbound': 'Goods Receipts',
  '/purchase/inbound': 'Goods Receipts',
  '/procurement/returns': 'Supplier Returns',
  '/purchase/return': 'Supplier Returns',
  // Inventory & Logistics
  '/inventory/stock_ledger': 'Stock Ledger',
  '/inventory/stocktake': 'Stocktake & Audit',
  '/inventory/transfers': 'Stock Transfers',
  '/inventory/transfer': 'Stock Transfers',
  '/inventory/depots': 'Warehouse Directory',
  '/inventory/depot': 'Warehouse Directory',
  '/inventory/other_in': 'Miscellaneous Stock Receipts',
  '/inventory/other_out': 'Miscellaneous Stock Issues',
  '/inventory/assemble': 'Stock Assembly Vouchers',
  '/inventory/disassemble': 'Stock Disassembly Vouchers',
  // Manufacturing
  '/manufacturing/production_plan': 'Production Planning & MRP',
  '/manufacturing/production_plans': 'Production Planning & MRP',
  '/manufacturing/bom': 'Bill of Materials (BOM)',
  '/manufacturing/work_orders': 'Production Work Orders',
  '/manufacturing/wip_reconciliation': 'WIP Reconciliation',
  '/manufacturing/job_card': 'Job Cards (Shop Floor)',
  '/manufacturing/job_cards': 'Job Cards (Shop Floor)',
  '/manufacturing/shop_floor': 'Shop Floor Terminal',
  '/manufacturing/job_work': 'Job Work Orders & Challans',
  '/manufacturing/section143_aging': 'Job Work Aging & Compliance',
  '/manufacturing/oee_dashboard': 'Overall Equipment Effectiveness (OEE)',
  '/manufacturing/machine_utilization': 'Machine Utilization & Capacity',
  '/manufacturing/downtime_analysis': 'Downtime Pareto Analysis',
  '/manufacturing/plan_vs_actual': 'Production Plan vs Actual Variance',
  // Quality Management
  '/quality/cockpit': 'Quality Dashboard',
  '/quality/inspections': 'Quality Inspections',
  '/quality/templates': 'Inspection Templates',
  '/quality/ncr': 'Non-Conformance Reports (NCR)',
  '/quality/capa': 'Corrective & Preventive Actions',
  // Finance & Accounting
  '/financial/receipts': 'Incoming Payments (AR)',
  '/financial/money_in': 'Incoming Payments (AR)',
  '/financial/payments': 'Outgoing Payments (AP)',
  '/financial/money_out': 'Outgoing Payments (AP)',
  '/financial/advances': 'Customer Advances',
  '/financial/advance_in': 'Customer Advances',
  '/financial/accounts': 'Settlement Accounts',
  '/financial/account': 'Settlement Accounts',
  '/financial/transfers': 'Bank Transfers (Giro)',
  '/financial/giro': 'Bank Transfers (Giro)',
  '/financial/income': 'Income Receipts',
  '/financial/payment': 'Payment Vouchers',
  '/financial/consolidation': 'Inter-Company Consolidation',
  // Master Data
  '/master/products': 'Items & Materials',
  '/material/list': 'Items & Materials',
  '/master/categories': 'Item Categories',
  '/material/category': 'Item Categories',
  '/master/units': 'Units of Measure',
  '/material/unit': 'Units of Measure',
  '/master/attributes': 'Multi-Attributes',
  '/material/attribute': 'Multi-Attributes',
  '/master/customers': 'Customers (with GSTIN)',
  '/system/customer': 'Customers (with GSTIN)',
  '/master/vendors': 'Suppliers',
  '/system/vendor': 'Suppliers',
  '/master/members': 'Members',
  '/system/member': 'Members',
  '/master/staff': 'Handlers & Staff',
  '/system/person': 'Handlers & Staff',
  '/master/in_out_items': 'Income/Expense Items',
  '/system/in_out_item': 'Income/Expense Items',
  // Tax & Compliance
  '/compliance/edocument_cockpit': 'e-Document Center',
  '/gst/einvoice_dashboard': 'e-Document Center',
  '/tax/company_gstin': 'Company GSTINs',
  '/gst/company_gstin': 'Company GSTINs',
  '/tax/hsn_sac': 'HSN / SAC Catalog',
  '/gst/hsn_sac': 'HSN / SAC Catalog',
  '/tax/tax_rates': 'Tax Slabs & Rates',
  '/gst/tax_rates': 'Tax Slabs & Rates',
  '/tax/tax_rules': 'Effective Tax Rules',
  '/gst/tax_rules': 'Effective Tax Rules',
  '/tax/state_codes': 'Indian State Codes (POS)',
  '/gst/state_codes': 'Indian State Codes (POS)',
  '/tax/simulator': 'GST Tax Simulator',
  '/gst/tax_calculator': 'GST Tax Simulator',
  // Administration
  '/admin/financial_years': 'Financial Years & Series',
  '/admin/financial_year': 'Financial Years & Series',
  '/gst/financial_year': 'Financial Years & Series',
  '/system/role': 'Roles & Permissions',
  '/system/user': 'User Management',
  '/system/organization': 'Organizations & Departments',
  '/system/log': 'System Audit Logs',
  '/system/property': 'Properties',
  '/system/config': 'System Configuration',
  '/system/function': 'Menu Management',
  '/system/tenant': 'Tenant Management',
  '/system/plugin': 'Plugin Management',
  '/system/dict': 'Data Dictionaries',
  '/system/platform_config': 'Platform Config',
  // Analytics & Reports
  '/report/stock': 'Stock Valuation',
  '/report/account_report': 'Account Statistics',
  '/report/retail_report': 'Retail Trends',
  '/report/buy_in_report': 'Purchase Trends',
  '/report/sale_out_report': 'Sales Trends',
  '/report/in_detail': 'Inbound Receipt Details',
  '/report/out_detail': 'Outbound Issue Details',
  '/report/allocation_detail': 'Stock Transfer Details',
  '/report/in_material_count': 'Inbound Receipt Summary',
  '/report/out_material_count': 'Outbound Issue Summary',
  '/report/in_out_stock_report': 'Inventory Movement Summary',
  '/report/customer': 'Customer Statements (AR)',
  '/report/vendor': 'Supplier Statements (AP)',
  '/report/stock_warning_report': 'Safety Stock Alerts',
  // Retail
  '/retail/outbound': 'Retail Dispatch',
  '/retail/return': 'Retail Returns',
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
