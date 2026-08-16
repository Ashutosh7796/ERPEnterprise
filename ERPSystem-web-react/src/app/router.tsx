import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { MainLayout } from '@layouts/MainLayout'
import { LoginPage } from '@features/auth/pages/LoginPage'
import { DashboardPage } from '@features/dashboard/pages/DashboardPage'
import { UnitListPage } from '@features/material/pages/UnitList'
import { MaterialListPage } from '@features/material/pages/MaterialList'
import { CategoryListPage } from '@features/material/pages/CategoryList'
import { MaterialAttributeListPage } from '@features/material/pages/MaterialAttributeList'
import { UserListPage } from '@features/system/pages/UserList'
import { SystemConfigListPage } from '@features/system/pages/SystemConfigList'
import { RoleListPage } from '@features/system/pages/RoleList'
import { MaterialPropertyListPage } from '@features/system/pages/MaterialPropertyList'
import { FunctionListPage } from '@features/system/pages/FunctionList'
import { PluginListPage } from '@features/system/pages/PluginList'
import { DictListPage } from '@features/system/pages/DictList'
import { PlatformConfigListPage } from '@features/system/pages/PlatformConfigList'
import { VendorListPage } from '@features/system/pages/VendorList'
import { CustomerListPage } from '@features/system/pages/CustomerList'
import { MemberListPage } from '@features/system/pages/MemberList'
import { InOutItemListPage } from '@features/system/pages/InOutItemList'
import { OrganizationListPage } from '@features/system/pages/OrganizationList'
import { LogListPage } from '@features/system/pages/LogList'
import { TenantListPage } from '@features/system/pages/TenantList'
import { PersonListPage } from '@features/system/pages/PersonList'
import { DepotListPage } from '@features/inventory/pages/DepotList'
import { StockTransferListPage } from '@features/inventory/pages/StockTransferList'
import { SpecialBillListPage } from '@features/inventory/pages/SpecialBillList'
import { AccountListPage } from '@features/financial/pages/AccountList'
import { IncomeReceiptListPage } from '@features/financial/pages/IncomeReceiptList'
import { PaymentVoucherListPage } from '@features/financial/pages/PaymentVoucherList'
import { MoneyInListPage } from '@features/financial/pages/MoneyInList'
import { MoneyOutListPage } from '@features/financial/pages/MoneyOutList'
import { GiroListPage } from '@features/financial/pages/GiroList'
import { AdvanceInListPage } from '@features/financial/pages/AdvanceInList'
import { PurchaseApplyListPage } from '@features/bill/pages/PurchaseApplyList'
import { PurchaseOrderListPage } from '@features/bill/pages/PurchaseOrderList'
import { PurchaseInboundListPage } from '@features/bill/pages/PurchaseInboundList'
import { PurchaseReturnListPage } from '@features/bill/pages/PurchaseReturnList'
import { SaleOrderListPage } from '@features/bill/pages/SaleOrderList'
import { SaleOutboundListPage } from '@features/bill/pages/SaleOutboundList'
import { SaleReturnListPage } from '@features/bill/pages/SaleReturnList'
import { RetailBillListPage } from '@features/bill/pages/RetailBillList'
import { StockReportPage } from '@features/report/pages/StockReport'
import { VendorStatementPage } from '@features/report/pages/VendorStatement'
import { CustomerStatementPage } from '@features/report/pages/CustomerStatement'
import { AccountStatsReportPage } from '@features/report/pages/AccountStatsReport'
import { TrendReportPage } from '@features/report/pages/TrendReport'
import { InboundOutboundDetailReportPage } from '@features/report/pages/InboundOutboundDetailReport'
import { InboundOutboundSummaryReportPage } from '@features/report/pages/InboundOutboundSummaryReport'
import { InOutStockReportPage } from '@features/report/pages/InOutStockReport'
import { StockWarningReportPage } from '@features/report/pages/StockWarningReport'
import { CompanyGstinListPage } from '@features/gst/pages/CompanyGstinList'
import { StateCodeListPage } from '@features/gst/pages/StateCodeList'
import { HsnSacListPage } from '@features/gst/pages/HsnSacList'
import { TaxRateListPage } from '@features/gst/pages/TaxRateList'
import { FinancialYearConfigPage } from '@features/gst/pages/FinancialYearConfig'
import { GSTTaxCalculatorPage } from '@features/gst/pages/GSTTaxCalculatorPage'
import { TaxRuleList } from '@features/gst/pages/TaxRuleList'
import { useAuthStore } from '@core/auth/authStore'

const LoadingFallback: React.FC = () => (
  <div style={{ height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <Spin size="large" description="Loading View..." />
  </div>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      // Retail Domain
      {
        path: 'retail/outbound',
        element: <RetailBillListPage subType="零售出库" title="Retail Dispatch" />,
      },
      {
        path: 'retail/return',
        element: <RetailBillListPage subType="零售退货" title="Retail Returns" />,
      },
      // Products Domain
      {
        path: 'material/list',
        element: <MaterialListPage />,
      },
      {
        path: 'material/category',
        element: <CategoryListPage />,
      },
      {
        path: 'material/unit',
        element: <UnitListPage />,
      },
      {
        path: 'material/attribute',
        element: <MaterialAttributeListPage />,
      },
      // Purchase Domain
      {
        path: 'purchase/apply',
        element: <PurchaseApplyListPage />,
      },
      {
        path: 'bill/purchase_apply',
        element: <PurchaseApplyListPage />,
      },
      {
        path: 'purchase/order',
        element: <PurchaseOrderListPage />,
      },
      {
        path: 'purchase/inbound',
        element: <PurchaseInboundListPage />,
      },
      {
        path: 'purchase/return',
        element: <PurchaseReturnListPage />,
      },
      // Sales Domain
      {
        path: 'sales/order',
        element: <SaleOrderListPage />,
      },
      {
        path: 'sales/outbound',
        element: <SaleOutboundListPage />,
      },
      {
        path: 'sales/return',
        element: <SaleReturnListPage />,
      },
      // Inventory Domain
      {
        path: 'inventory/transfer',
        element: <StockTransferListPage />,
      },
      {
        path: 'inventory/depot',
        element: <DepotListPage />,
      },
      {
        path: 'inventory/other_in',
        element: <SpecialBillListPage type="入库" subType="其它入库" title="Other Inbound" />,
      },
      {
        path: 'inventory/other_out',
        element: <SpecialBillListPage type="出库" subType="其它出库" title="Other Outbound" />,
      },
      {
        path: 'inventory/assemble',
        element: <SpecialBillListPage type="入库" subType="组装单" title="Assembly Bills" />,
      },
      {
        path: 'inventory/disassemble',
        element: <SpecialBillListPage type="出库" subType="拆卸单" title="Disassembly Bills" />,
      },
      // Financial Domain
      {
        path: 'financial/income',
        element: <IncomeReceiptListPage />,
      },
      {
        path: 'financial/payment',
        element: <PaymentVoucherListPage />,
      },
      {
        path: 'financial/money_in',
        element: <MoneyInListPage />,
      },
      {
        path: 'financial/money_out',
        element: <MoneyOutListPage />,
      },
      {
        path: 'financial/giro',
        element: <GiroListPage />,
      },
      {
        path: 'financial/advance_in',
        element: <AdvanceInListPage />,
      },
      {
        path: 'financial/account',
        element: <AccountListPage />,
      },
      // Reports Domain
      {
        path: 'report/stock',
        element: <StockReportPage />,
      },
      {
        path: 'report/account_report',
        element: <AccountStatsReportPage />,
      },
      {
        path: 'report/retail_report',
        element: <TrendReportPage type="retail" title="Retail Trends" />,
      },
      {
        path: 'report/buy_in_report',
        element: <TrendReportPage type="purchase" title="Purchase Trends" />,
      },
      {
        path: 'report/sale_out_report',
        element: <TrendReportPage type="sale" title="Sales Trends" />,
      },
      {
        path: 'report/in_detail',
        element: <InboundOutboundDetailReportPage type="入库" title="Inbound Details" />,
      },
      {
        path: 'report/out_detail',
        element: <InboundOutboundDetailReportPage type="出库" title="Outbound Details" />,
      },
      {
        path: 'report/allocation_detail',
        element: <InboundOutboundDetailReportPage type="调拨" title="Transfer Details" />,
      },
      {
        path: 'report/in_material_count',
        element: <InboundOutboundSummaryReportPage type="入库" title="Inbound Summary" />,
      },
      {
        path: 'report/out_material_count',
        element: <InboundOutboundSummaryReportPage type="出库" title="Outbound Summary" />,
      },
      {
        path: 'report/in_out_stock_report',
        element: <InOutStockReportPage />,
      },
      {
        path: 'report/customer',
        element: <CustomerStatementPage />,
      },
      {
        path: 'report/vendor',
        element: <VendorStatementPage />,
      },
      {
        path: 'report/stock_warning_report',
        element: <StockWarningReportPage />,
      },
      // Master Data & System Domain
      {
        path: 'system/role',
        element: <RoleListPage />,
      },
      {
        path: 'system/user',
        element: <UserListPage />,
      },
      {
        path: 'system/organization',
        element: <OrganizationListPage />,
      },
      {
        path: 'system/log',
        element: <LogListPage />,
      },
      {
        path: 'system/property',
        element: <MaterialPropertyListPage />,
      },
      {
        path: 'system/config',
        element: <SystemConfigListPage />,
      },
      {
        path: 'system/function',
        element: <FunctionListPage />,
      },
      {
        path: 'system/tenant',
        element: <TenantListPage />,
      },
      {
        path: 'system/plugin',
        element: <PluginListPage />,
      },
      {
        path: 'system/dict',
        element: <DictListPage />,
      },
      {
        path: 'system/platform_config',
        element: <PlatformConfigListPage />,
      },
      {
        path: 'system/person',
        element: <PersonListPage />,
      },
      {
        path: 'system/vendor',
        element: <VendorListPage />,
      },
      {
        path: 'system/customer',
        element: <CustomerListPage />,
      },
      {
        path: 'system/member',
        element: <MemberListPage />,
      },
      {
        path: 'system/in_out_item',
        element: <InOutItemListPage />,
      },
      {
        path: 'system/log',
        element: <LogListPage />,
      },
      // Indian GST & Compliance Domain
      {
        path: 'gst/company_gstin',
        element: <CompanyGstinListPage />,
      },
      {
        path: 'gst/hsn_sac',
        element: <HsnSacListPage />,
      },
      {
        path: 'gst/tax_rates',
        element: <TaxRateListPage />,
      },
      {
        path: 'gst/state_codes',
        element: <StateCodeListPage />,
      },
      {
        path: 'gst/tax_rules',
        element: <TaxRuleList />,
      },
      {
        path: 'gst/financial_year',
        element: <FinancialYearConfigPage />,
      },
      {
        path: 'gst/tax_calculator',
        element: <GSTTaxCalculatorPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
