import React, { useMemo } from 'react'
import { Layout, Menu, theme as antdTheme } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  SyncOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  DollarCircleOutlined,
  PieChartOutlined,
  AppstoreOutlined,
  ClusterOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  ToolOutlined,
  BuildOutlined,
  ExperimentOutlined,
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
  const { collapsed, themeSettings, userAuth, fetchUserAuth } = useAppStore()
  const addTab = useTabStore((state) => state.addTab)

  React.useEffect(() => {
    if (!userAuth.loaded) {
      fetchUserAuth()
    }
  }, [userAuth.loaded, fetchUserAuth])

  const menuItems: MenuItem[] = useMemo(() => {
    const domain = userAuth.authorityDomain || 'TENANT'

    // ==========================================
    // 1. PLATFORM SUPER ADMIN MENU PROJECTION
    // ==========================================
    if (domain === 'PLATFORM') {
      return [
        {
          key: '/platform/dashboard',
          icon: <DashboardOutlined />,
          label: 'Platform Dashboard',
        },
        {
          key: '/system/tenant',
          icon: <ClusterOutlined />,
          label: 'Tenants Management',
        },
        {
          key: '/support/center',
          icon: <SafetyCertificateOutlined />,
          label: 'Support Access Center',
        },
        {
          key: '/system/platform_config',
          icon: <SettingOutlined />,
          label: 'Platform Config',
        },
        {
          key: '/system/plugin',
          icon: <AppstoreOutlined />,
          label: 'Plugin Manager',
        },
        {
          key: '/platform_access_group',
          icon: <FileProtectOutlined />,
          label: 'Access & Governance',
          children: [
            { key: '/system/user', label: 'Platform Users' },
            { key: '/system/role', label: 'Platform Roles' },
            { key: '/system/organization', label: 'Organizations' },
          ],
        },
        {
          key: '/platform_system_group',
          icon: <ToolOutlined />,
          label: 'System Governance',
          children: [
            { key: '/system/dict', label: 'Dictionaries' },
            { key: '/system/function', label: 'Menu Management' },
            { key: '/system/log', label: 'Platform Audit Logs' },
            { key: '/tax/state_codes', label: 'State Codes Catalog' },
          ],
        },
      ]
    }

    if (domain === 'SUPPORT_OPERATIONS') {
      const isSupportManager = userAuth.roleName?.includes('Manager') || userAuth.roleType?.includes('Manager')
      const items: any[] = [
        {
          key: '/support/dashboard',
          icon: <DashboardOutlined />,
          label: 'Support Operations Dashboard',
        },
      ]

      if (isSupportManager) {
        items.push({
          key: '/support/center',
          icon: <SafetyCertificateOutlined />,
          label: 'Tenant Support Center',
        })
      }

      return items
    }

    // ==========================================
    // 3. SUPPORT SESSION PROJECTION (DELEGATED)
    // ==========================================
    if (domain === 'SUPPORT_SESSION') {
      const scope = userAuth.supportModuleScope || 'ALL_DIAGNOSTICS'
      const items: any[] = [
        {
          key: '/dashboard',
          icon: <HomeOutlined />,
          label: `${userAuth.tenantName || 'Workspace'} Overview`,
        },
      ]

      if (scope === 'ALL_DIAGNOSTICS' || scope === 'SALES') {
        items.push({
          key: '/sales_domain',
          icon: <ShoppingCartOutlined />,
          label: 'Sales & Billing',
          children: [
            { key: '/sales/orders', label: 'Sales Orders' },
            { key: '/sales/invoices', label: 'Billing Documents' },
            { key: '/sales/outbound', label: 'Outbound Deliveries' },
            { key: '/sales/returns', label: 'Customer Returns' },
            { key: '/retail/outbound', label: 'Retail Outbound' },
            { key: '/retail/return', label: 'Retail Returns' },
          ],
        })
      }

      if (scope === 'ALL_DIAGNOSTICS' || scope === 'PROCUREMENT') {
        items.push({
          key: '/procurement_domain',
          icon: <SyncOutlined />,
          label: 'Procurement',
          children: [
            { key: '/procurement/requisitions', label: 'Purchase Requisitions' },
            { key: '/procurement/orders', label: 'Purchase Orders' },
            { key: '/procurement/inbound', label: 'Goods Receipts' },
            { key: '/procurement/returns', label: 'Supplier Returns' },
          ],
        })
      }

      if (scope === 'ALL_DIAGNOSTICS' || scope === 'INVENTORY') {
        items.push({
          key: '/inventory_domain',
          icon: <DatabaseOutlined />,
          label: 'Inventory & Logistics',
          children: [
            { key: '/inventory/depots', label: 'Warehouse Directory' },
            { key: '/inventory/stock_ledger', label: 'Stock Ledger' },
            { key: '/inventory/transfers', label: 'Stock Transfers' },
            { key: '/inventory/other_in', label: 'Goods Inbound (Other)' },
            { key: '/inventory/other_out', label: 'Goods Outbound (Other)' },
          ],
        })
      }

      if (scope === 'ALL_DIAGNOSTICS' || scope === 'FINANCE') {
        items.push({
          key: '/financial_domain',
          icon: <DollarCircleOutlined />,
          label: 'Finance & Accounting',
          children: [
            { key: '/financial/receipts', label: 'Incoming Payments' },
            { key: '/financial/payments', label: 'Outgoing Payments' },
            { key: '/financial/advances', label: 'Customer Advances' },
            { key: '/financial/accounts', label: 'Settlement Accounts' },
            { key: '/financial/transfers', label: 'Bank Transfers' },
            { key: '/financial/bank-reconciliation', label: 'Bank Reconciliation (BRS)' },
            { key: '/financial/consolidation', label: 'Inter-Company Consolidation' },
          ],
        })
      }

      if (scope === 'ALL_DIAGNOSTICS') {
        items.push({
          key: '/tax_domain',
          icon: <SafetyCertificateOutlined />,
          label: 'Tax & Compliance',
          children: [
            { key: '/compliance/edocument_cockpit', label: 'e-Document Center' },
            { key: '/tax/company_gstin', label: 'Company GSTINs' },
            { key: '/tax/tax_rules', label: 'Tax Rules' },
          ],
        })
        items.push({
          key: '/report_domain',
          icon: <PieChartOutlined />,
          label: 'Reports & Diagnostics',
          children: [
            { key: '/report/stock', label: 'Stock Valuation' },
            { key: '/report/in_out_stock_report', label: 'Inventory Movement Summary' },
            { key: '/report/customer', label: 'Customer Statements' },
            { key: '/report/vendor', label: 'Supplier Statements' },
            { key: '/report/account_report', label: 'Account Statements' },
          ],
        })
      }

      return items
    }

    // ==========================================
    // 4. TENANT USER / TENANT ADMIN PROJECTION
    // ==========================================
    const rawItems: any[] = [
      {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/sales_domain',
        icon: <ShoppingCartOutlined />,
        label: 'Sales & Billing',
        children: [
          { key: '/sales/quotations', label: 'Sales Quotations' },
          { key: '/sales/orders', label: 'Sales Orders' },
          { key: '/sales/invoices', label: 'Tax Invoices' },
          { key: '/sales/outbound', label: 'Outbound Deliveries' },
          { key: '/sales/returns', label: 'Customer Returns' },
          { key: '/retail/outbound', label: 'Retail Sales' },
          { key: '/retail/return', label: 'Retail Returns' },
        ],
      },
      {
        key: '/procurement_domain',
        icon: <SyncOutlined />,
        label: 'Procurement',
        children: [
          { key: '/procurement/requisitions', label: 'Purchase Requisitions' },
          { key: '/procurement/orders', label: 'Purchase Orders' },
          { key: '/procurement/inbound', label: 'Goods Receipts (GRN)' },
          { key: '/procurement/invoices', label: 'Purchase Invoices' },
          { key: '/procurement/landed-costs', label: 'Landed Cost Vouchers' },
          { key: '/procurement/advances', label: 'Supplier Advances' },
          { key: '/procurement/tds-register', label: 'TDS Deductions Register' },
          { key: '/procurement/msme-aging', label: 'MSME Supplier Aging' },
          { key: '/procurement/returns', label: 'Purchase Returns & Debit Notes' },
        ],
      },
      {
        key: '/inventory_domain',
        icon: <DatabaseOutlined />,
        label: 'Inventory & Logistics',
        children: [
          { key: '/inventory/depots', label: 'Warehouse Directory' },
          { key: '/inventory/stock_ledger', label: 'Stock Ledger' },
          { key: '/inventory/stocktake', label: 'Stocktake & Audit' },
          { key: '/inventory/transfers', label: 'Stock Transfers' },
          { key: '/inventory/other_in', label: 'Miscellaneous Stock Receipts' },
          { key: '/inventory/other_out', label: 'Miscellaneous Stock Issues' },
          { key: '/inventory/assemble', label: 'Stock Assembly Vouchers' },
          { key: '/inventory/disassemble', label: 'Stock Disassembly Vouchers' },
        ],
      },
      {
        key: '/manufacturing_domain',
        icon: <BuildOutlined />,
        label: 'Manufacturing',
        children: [
          { key: '/manufacturing/production_plan', label: 'Production Planning & MRP' },
          { key: '/manufacturing/bom', label: 'Bill of Materials (BOM)' },
          { key: '/manufacturing/work_orders', label: 'Production Work Orders' },
          { key: '/manufacturing/wip_reconciliation', label: 'WIP Reconciliation' },
          { key: '/manufacturing/job_card', label: 'Job Cards (Shop Floor)' },
          { key: '/manufacturing/shop_floor', label: 'Shop Floor Terminal' },
          { key: '/manufacturing/job_work', label: 'Job Work Orders & Challans' },
          { key: '/manufacturing/section143_aging', label: 'Job Work Aging & Compliance' },
          { key: '/manufacturing/oee_dashboard', label: 'Overall Equipment Effectiveness (OEE)' },
          { key: '/manufacturing/machine_utilization', label: 'Machine Utilization & Capacity' },
          { key: '/manufacturing/downtime_analysis', label: 'Downtime Pareto Analysis' },
          { key: '/manufacturing/plan_vs_actual', label: 'Production Plan vs Actual Variance' },
        ],
      },
      {
        key: '/quality_domain',
        icon: <ExperimentOutlined />,
        label: 'Quality Management',
        children: [
          { key: '/quality/cockpit', label: 'Quality Dashboard' },
          { key: '/quality/inspections', label: 'Quality Inspections' },
          { key: '/quality/templates', label: 'Inspection Templates' },
          { key: '/quality/ncr', label: 'Non-Conformance Reports (NCR)' },
          { key: '/quality/capa', label: 'Corrective & Preventive Actions' },
        ],
      },
      {
        key: '/financial_domain',
        icon: <DollarCircleOutlined />,
        label: 'Finance & Accounting',
        children: [
          { key: '/financial/receipts', label: 'Incoming Receipts (AR)' },
          { key: '/financial/payments', label: 'Outgoing Payments (AP)' },
          { key: '/financial/advances', label: 'Customer Advances' },
          { key: '/financial/journal_vouchers', label: 'Journal Vouchers' },
          { key: '/financial/transfers', label: 'Contra Transfers' },
          { key: '/financial/fixed-assets', label: 'Fixed Asset Register' },
          { key: '/financial/fixed-assets/classes', label: 'Asset Classes' },
          { key: '/financial/fixed-assets/depreciation', label: 'Depreciation Runs' },
          { key: '/financial/fixed-assets/schedule-iii', label: 'Schedule III PPE Report' },
          { key: '/financial/reports/trial_balance', label: 'Trial Balance' },
          { key: '/financial/reports/balance_sheet', label: 'Balance Sheet (Schedule III)' },
          { key: '/financial/reports/profit_loss', label: 'Profit & Loss (Schedule III)' },
          { key: '/financial/reports/gl_audit_trail', label: 'General Ledger Audit Trail' },
          { key: '/financial/fiscal-periods', label: 'Fiscal Period Closing' },
          { key: '/financial/year-end-closing', label: 'Year-End Fiscal Closing' },
          { key: '/financial/accounts', label: 'Settlement Accounts' },
          { key: '/financial/chart_of_accounts', label: 'Chart of Accounts' },
          { key: '/financial/income', label: 'Income Receipts' },
          { key: '/financial/payment', label: 'Payment Vouchers' },
          { key: '/financial/consolidation', label: 'Inter-Company Consolidation' },
        ],
      },
      {
        key: '/master_data_domain',
        icon: <AppstoreOutlined />,
        label: 'Master Data',
        children: [
          { key: '/master/products', label: 'Items & Materials' },
          { key: '/master/categories', label: 'Item Categories' },
          { key: '/master/units', label: 'Units of Measure' },
          { key: '/master/attributes', label: 'Multi-Attributes' },
          { key: '/master/customers', label: 'Customers (GSTIN)' },
          { key: '/master/vendors', label: 'Suppliers' },
          { key: '/master/members', label: 'Members' },
          { key: '/master/staff', label: 'Staff & Handlers' },
          { key: '/master/in_out_items', label: 'Income/Expense Heads' },
        ],
      },
      {
        key: '/tax_domain',
        icon: <SafetyCertificateOutlined />,
        label: 'Tax & Compliance',
        children: [
          { key: '/compliance/edocument_cockpit', label: 'e-Document Center' },
          { key: '/tax/company_gstin', label: 'Company GSTINs' },
          { key: '/tax/hsn_sac', label: 'HSN / SAC Catalog' },
          { key: '/tax/tax_rates', label: 'Tax Slabs & Rates' },
          { key: '/tax/tax_rules', label: 'Effective Tax Rules' },
          { key: '/tax/state_codes', label: 'Indian State Codes' },
          { key: '/tax/simulator', label: 'GST Tax Simulator' },
        ],
      },
      {
        key: '/report_domain',
        icon: <PieChartOutlined />,
        label: 'Analytics & Reports',
        children: [
          { key: '/report/stock', label: 'Stock Valuation' },
          { key: '/report/in_out_stock_report', label: 'Inventory Movement Summary' },
          { key: '/report/customer', label: 'Customer Statements' },
          { key: '/report/vendor', label: 'Supplier Statements' },
          { key: '/report/account_report', label: 'Account Statements' },
          { key: '/report/sale_out_report', label: 'Sales Trends' },
          { key: '/report/buy_in_report', label: 'Purchase Trends' },
          { key: '/report/retail_report', label: 'Retail Trends' },
          { key: '/report/in_detail', label: 'Inbound Receipt Details' },
          { key: '/report/out_detail', label: 'Outbound Issue Details' },
          { key: '/report/allocation_detail', label: 'Stock Transfer Details' },
          { key: '/report/in_material_count', label: 'Inbound Receipt Summary' },
          { key: '/report/out_material_count', label: 'Outbound Issue Summary' },
          { key: '/report/stock_warning_report', label: 'Safety Stock Alerts' },
        ],
      },
      {
        key: '/system_domain',
        icon: <SettingOutlined />,
        label: 'Administration',
        children: [
          { key: '/admin/financial_years', label: 'Financial Years & Series' },
          { key: '/system/role', label: 'Roles & Permissions' },
          { key: '/system/user', label: 'User Management' },
          { key: '/system/organization', label: 'Organizations & Departments' },
          { key: '/system/log', label: 'System Audit Logs' },
          { key: '/system/config', label: 'System Configuration' },
          { key: '/system/demo_data', label: 'Demo Data Management' },
        ],
      },
    ]

    // If Tenant Admin, show full business modules
    if (userAuth.isTenantAdmin) {
      return rawItems
    }

    const ROUTE_TO_FUNCTION_URL: Record<string, string[]> = {
      '/sales/quotations': ['/bill/quotation', '/sales/quotations'],
      '/sales/orders': ['/bill/sale_order', '/sales/orders'],
      '/sales/invoices': ['/bill/sale_out', '/sales/invoices'],
      '/sales/credit_notes': ['/bill/sale_back', '/sales/credit_notes'],
      '/sales/debit_notes': ['/bill/sale_out', '/sales/debit_notes'],
      '/sales/outbound': ['/bill/sale_out', '/sales/outbound'],
      '/sales/returns': ['/bill/sale_back', '/sales/returns'],
      '/sales/einvoice_workspace': ['/compliance/edocument_cockpit', '/sales/einvoice_workspace'],
      '/procurement/requisitions': ['/bill/purchase_apply', '/procurement/requisitions'],
      '/procurement/orders': ['/bill/purchase_order', '/procurement/orders'],
      '/procurement/inbound': ['/bill/purchase_in', '/procurement/inbound'],
      '/procurement/receipts': ['/bill/purchase_in', '/procurement/receipts'],
      '/procurement/invoices': ['/bill/purchase_in', '/procurement/invoices'],
      '/procurement/landed-costs': ['/bill/purchase_in', '/procurement/landed-costs'],
      '/procurement/advances': ['/financial/money_out', '/procurement/advances'],
      '/procurement/tds-register': ['/report/account_report', '/procurement/tds-register'],
      '/procurement/msme-aging': ['/report/vendor', '/procurement/msme-aging'],
      '/procurement/returns': ['/bill/purchase_back', '/procurement/returns'],
      '/inventory/transfers': ['/bill/allocation_out', '/inventory/transfers'],
      '/inventory/stock_ledger': ['/report/stock', '/inventory/stock_ledger'],
      '/inventory/stocktake': ['/bill/stocktake', '/inventory/stocktake'],
      '/inventory/depots': ['/system/depot', '/inventory/depots'],
      '/inventory/other_in': ['/bill/other_in', '/inventory/other_in'],
      '/inventory/other_out': ['/bill/other_out', '/inventory/other_out'],
      '/inventory/assemble': ['/bill/assemble', '/inventory/assemble'],
      '/inventory/disassemble': ['/bill/disassemble', '/inventory/disassemble'],
      '/manufacturing/production_plan': ['/manufacturing/production_plan', '/manufacturing/work_orders', '/bill/assemble', '/inventory/depots'],
      '/manufacturing/bom': ['/manufacturing/bom', '/bill/assemble', '/master/products'],
      '/manufacturing/work_orders': ['/manufacturing/work_orders', '/bill/assemble', '/inventory/depots'],
      '/manufacturing/job_card': ['/manufacturing/job_card', '/manufacturing/work_orders', '/bill/assemble'],
      '/manufacturing/shop_floor': ['/manufacturing/shop_floor', '/manufacturing/job_card', '/manufacturing/work_orders', '/bill/assemble'],
      '/manufacturing/job_work': ['/manufacturing/job_work', '/bill/assemble', '/inventory/depots'],
      '/manufacturing/section143_aging': ['/manufacturing/section143_aging', '/bill/assemble', '/report/stock'],
      '/financial/receipts': ['/financial/money_in', '/financial/receipts'],
      '/financial/payments': ['/financial/money_out', '/financial/payments'],
      '/financial/advances': ['/financial/advance_in', '/financial/advances'],
      '/financial/journal_vouchers': ['/financial/journal_vouchers', '/financial/journal_voucher', '/financial/money_in'],
      '/financial/reports/trial_balance': ['/financial/reports/trial_balance', '/report/account_report', '/financial/chart_of_accounts'],
      '/financial/reports/balance_sheet': ['/financial/reports/balance_sheet', '/report/account_report', '/financial/chart_of_accounts'],
      '/financial/reports/profit_loss': ['/financial/reports/profit_loss', '/report/account_report', '/financial/chart_of_accounts'],
      '/financial/reports/gl_audit_trail': ['/financial/reports/gl_audit_trail', '/report/account_report', '/financial/chart_of_accounts'],
      '/financial/accounts': ['/system/account', '/financial/accounts'],
      '/financial/chart_of_accounts': ['/system/account', '/financial/chart_of_accounts', '/financial/accounts'],
      '/financial/transfers': ['/financial/giro', '/financial/transfers', '/financial/contra'],
      '/financial/contra': ['/financial/giro', '/financial/transfers', '/financial/contra'],
      '/financial/income': ['/financial/item_in', '/financial/income'],
      '/financial/payment': ['/financial/item_out', '/financial/payment'],
      '/financial/consolidation': ['/financial/consolidation', '/financial/consolidation/cockpit'],
      '/master/products': ['/material/material', '/master/products'],
      '/master/categories': ['/material/material_category', '/master/categories'],
      '/master/units': ['/system/unit', '/master/units'],
      '/master/attributes': ['/material/material_attribute', '/master/attributes'],
      '/master/customers': ['/system/customer', '/master/customers'],
      '/master/vendors': ['/system/vendor', '/master/vendors'],
      '/master/members': ['/system/member', '/master/members'],
      '/master/staff': ['/system/person', '/master/staff'],
      '/master/in_out_items': ['/system/in_out_item', '/master/in_out_items'],
      '/compliance/edocument_cockpit': ['/compliance/edocument_cockpit'],
      '/tax/company_gstin': ['/tax/company_gstin'],
      '/tax/hsn_sac': ['/tax/hsn_sac'],
      '/tax/tax_rates': ['/tax/tax_rates'],
      '/tax/tax_rules': ['/tax/tax_rules'],
      '/tax/state_codes': ['/tax/state_codes'],
      '/tax/simulator': ['/tax/simulator'],
      '/report/stock': ['/report/stock', '/report/material_stock'],
      '/report/in_out_stock_report': ['/report/in_out_stock_report'],
      '/report/customer': ['/report/customer', '/report/customer_account'],
      '/report/vendor': ['/report/vendor', '/report/vendor_account'],
      '/report/account_report': ['/report/account_report'],
      '/report/sale_out_report': ['/report/sale_out_report'],
      '/report/buy_in_report': ['/report/buy_in_report'],
      '/report/retail_report': ['/report/retail_report', '/report/retail_out_report'],
      '/report/in_detail': ['/report/in_detail'],
      '/report/out_detail': ['/report/out_detail'],
      '/report/allocation_detail': ['/report/allocation_detail'],
      '/report/stock_warning_report': ['/report/stock_warning_report'],
      '/admin/financial_years': ['/admin/financial_years'],
      '/system/role': ['/system/role'],
      '/system/user': ['/system/user'],
      '/system/organization': ['/system/organization'],
      '/system/log': ['/system/log'],
      '/system/config': ['/system/config'],
      '/system/demo_data': ['/system/demo_data'],
    }

    const permitted = userAuth.permittedPaths || []

    const filterGroup = (items: any[]): any[] => {
      return items
        .map((item) => {
          if (item.children) {
            const filteredChildren = filterGroup(item.children)
            if (filteredChildren.length > 0) {
              return { ...item, children: filteredChildren }
            }
            return null
          }

          if (item.key === '/dashboard') return item

          const candidateUrls = ROUTE_TO_FUNCTION_URL[item.key] || [item.key]
          const isAllowed = candidateUrls.some((url) => permitted.includes(url))
          return isAllowed ? item : null
        })
        .filter(Boolean)
    }

    return filterGroup(rawItems)
  }, [userAuth])

  const selectedKeys = useMemo(() => {
    return [location.pathname]
  }, [location.pathname])

  const openKeys = useMemo(() => {
    const segments = location.pathname.split('/')
    if (segments.length >= 2) {
      return [`/${segments[1]}_domain`]
    }
    return []
  }, [location.pathname])

  const findLabelByKey = (items: MenuItem[], key: string): string => {
    for (const item of items) {
      if (!item) continue
      if (item.key === key) {
        return (item as any).label as string
      }
      if ((item as any).children) {
        const found = findLabelByKey((item as any).children, key)
        if (found) return found
      }
    }
    return ''
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const title = findLabelByKey(menuItems, key) || 'Tab'
    addTab({
      key,
      title,
      path: key,
      closable: key !== '/dashboard' && key !== '/platform/dashboard' && key !== '/support/dashboard',
    })
    navigate(key)
  }

  const siderTheme = themeSettings.siderTheme

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={260}
      collapsedWidth={64}
      theme={siderTheme}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: themeSettings.fixedSidebar ? 'fixed' : 'relative',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow:
          siderTheme === 'light'
            ? '2px 0 8px 0 rgba(29,35,41,.05)'
            : '2px 0 8px 0 rgba(0,0,0,.25)',
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 16px',
          background: siderTheme === 'dark' ? '#001529' : token.colorBgContainer,
          borderBottom: `1px solid ${siderTheme === 'dark' ? 'rgba(255,255,255,0.08)' : token.colorBorderSecondary}`,
          transition: 'all 0.2s',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background:
              userAuth.authorityDomain === 'PLATFORM'
                ? 'linear-gradient(135deg, #722ed1 0%, #13c2c2 100%)'
                : userAuth.authorityDomain === 'SUPPORT_OPERATIONS'
                  ? 'linear-gradient(135deg, #fa8c16 0%, #eb2f96 100%)'
                  : 'linear-gradient(135deg, #1677ff 0%, #52c41a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 800,
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            flexShrink: 0,
            marginRight: collapsed ? 0 : 12,
          }}
        >
          {userAuth.authorityDomain === 'PLATFORM' ? 'P' : userAuth.authorityDomain === 'SUPPORT_OPERATIONS' ? 'S' : 'E'}
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: siderTheme === 'dark' ? '#fff' : token.colorTextHeading,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.2px',
              }}
            >
              {userAuth.authorityDomain === 'PLATFORM'
                ? 'Platform Dashboard'
                : userAuth.authorityDomain === 'SUPPORT_OPERATIONS'
                  ? 'Support Center'
                  : userAuth.authorityDomain === 'SUPPORT_SESSION'
                    ? `Support Session`
                    : 'ERP Enterprise'}
            </span>
            <span style={{ fontSize: 11, color: siderTheme === 'dark' ? 'rgba(255,255,255,0.45)' : token.colorTextSecondary }}>
              {userAuth.tenantName ? `${userAuth.tenantName} • GST Ready` : userAuth.tenantId ? 'Enterprise Workspace • GST Ready' : 'Super Administration'}
            </span>
          </div>
        )}
      </div>

      <Menu
        theme={siderTheme}
        mode="inline"
        inlineIndent={16}
        selectedKeys={selectedKeys}
        defaultOpenKeys={openKeys}
        items={menuItems}
        onClick={handleMenuClick}
        className="enterprise-sidebar"
        style={{ borderRight: 0, marginTop: 8 }}
      />
    </Sider>
  )
}
