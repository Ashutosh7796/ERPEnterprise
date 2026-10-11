/**
 * Comprehensive Chinese-to-English translation mapping for ERP Menu & Permission Tree
 */
export const MENU_NAME_MAP: Record<string, string> = {
  // Top Categories
  '功能列表': 'Function List',
  'Function List': 'Function List',
  '零售管理': 'Retail Management',
  '采购管理': 'Purchase Management',
  '销售管理': 'Sales Management',
  '仓库管理': 'Warehouse Management',
  '财务管理': 'Financial Management',
  '报表查询': 'Reports & Analytics',
  '商品管理': 'Item Management',
  '基本资料': 'Master Data',
  '系统管理': 'System Management',

  // Retail Domain
  '零售出库': 'Retail Outbound',
  '零售退货': 'Retail Returns',

  // Purchase Domain
  '请购单': 'Purchase Requisitions',
  '采购订单': 'Purchase Orders',
  '采购入库': 'Goods Receipts (GRN)',
  '采购退货': 'Purchase Returns',

  // Sales Domain
  '销售订单': 'Sales Orders',
  '销售出库': 'Sales Dispatch',
  '销售退货': 'Sales Returns',

  // Warehouse Domain
  '其它入库': 'Miscellaneous Stock Receipts',
  '其它出库': 'Miscellaneous Stock Issues',
  '调拨出库': 'Stock Transfer',
  '组装单': 'Stock Assembly Vouchers',
  '拆卸单': 'Stock Disassembly Vouchers',

  // Financial Domain
  '收入单': 'Income Receipts',
  '支出单': 'Payment Vouchers',
  '收款单': 'Collection Notes',
  '付款单': 'Payment Notes',
  '转账单': 'Transfer Notes',
  '收预付款': 'Advance Receipts',

  // Reports Domain
  '商品库存': 'Stock Valuation',
  '结算账户': 'Account Stats',
  '零售统计': 'Retail Trends',
  '采购统计': 'Purchase Trends',
  '销售统计': 'Sales Trends',
  '入库明细': 'Inbound Receipt Details',
  '出库明细': 'Outbound Issue Details',
  '调拨明细': 'Stock Transfer Details',
  '入库汇总': 'Inbound Receipt Summary',
  '出库汇总': 'Outbound Issue Summary',
  '进销存统计': 'Inventory Movement Summary',
  '客户对账': 'Customer Statements',
  '供应商对账': 'Supplier Statements',
  '库存预警': 'Safety Stock Alerts',

  // Item & Material Domain
  '商品信息': 'Item Master List',
  '商品类别': 'Item Categories',
  '计量单位': 'Units of Measure',
  '多属性': 'Multi-Attributes',
  '商品属性': 'Item Attributes',

  // Master Data Domain
  '仓库信息': 'Warehouses',
  '经手人管理': 'Handlers',
  '供应商信息': 'Suppliers',
  '客户信息': 'Customer Info',
  '会员信息': 'Member Info',
  '收支项目': 'Income/Expense Items',

  // System Domain
  '角色管理': 'Roles',
  '用户管理': 'Users',
  '机构管理': 'Departments',
  '部门管理': 'Departments',
  '日志管理': 'Logs',
  '系统配置': 'System Config',
  '菜单管理': 'Menu Management',
  '功能管理': 'Menu Management',
  '租户管理': 'Tenants',
  '插件管理': 'Plugin Management',
  '字典管理': 'Dictionaries',
  '平台配置': 'Platform Config',
  '序列号': 'Serial Numbers',
  '批号': 'Batch Numbers',

  // Action Buttons & Sub-functions
  '新增': 'Create',
  '编辑': 'Edit',
  '删除': 'Delete',
  '批量删除': 'Delete Selected',
  '导入': 'Import',
  '导出': 'Export',
  '打印': 'Print',
  '审核': 'Approve',
  '反审核': 'Unapprove',
  '启用': 'Enable',
  '禁用': 'Disable',
  '分配仓库': 'Assign Warehouse',
  '分配客户': 'Assign Customer',
  '分配菜单': 'Assign Menu',
  '分配按钮': 'Assign Buttons',
  '重置密码': 'Reset Password',
  '设为默认': 'Set Default',
}

/**
 * Translates Chinese menu and button permission names to English
 */
export function translateMenuTitle(title?: string): string {
  if (!title) return ''
  const trimmed = title.trim()

  // 1. Direct dictionary match
  if (MENU_NAME_MAP[trimmed]) {
    return MENU_NAME_MAP[trimmed]
  }

  // 2. Split compound titles like "采购订单-新增" or "销售出库 - 导出"
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-')
    return parts.map((p) => translateMenuTitle(p)).join(' - ')
  }

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    return parts.map((p) => translateMenuTitle(p)).join(' / ')
  }

  // 3. Fallback: replace any known keywords inside title
  let translated = trimmed
  for (const [cn, en] of Object.entries(MENU_NAME_MAP)) {
    if (translated.includes(cn)) {
      translated = translated.replaceAll(cn, en)
    }
  }

  return translated
}
