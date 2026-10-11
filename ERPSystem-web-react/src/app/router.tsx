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
import { DemoDataManagementPage } from '@features/system/pages/DemoDataManagement'
import { VendorListPage } from '@features/system/pages/VendorList'
import { CustomerListPage } from '@features/system/pages/CustomerList'
import { MemberListPage } from '@features/system/pages/MemberList'
import { InOutItemListPage } from '@features/system/pages/InOutItemList'
import { OrganizationListPage } from '@features/system/pages/OrganizationList'
import { LogListPage } from '@features/system/pages/LogList'
import { TenantListPage } from '@features/system/pages/TenantList'
import { PlanManagementPage } from '@features/system/pages/PlanManagement'
import { PlatformAuditListPage } from '@features/system/pages/PlatformAuditList'
import { PersonListPage } from '@features/system/pages/PersonList'
import { DepotListPage } from '@features/inventory/pages/DepotList'
import { StockTransferListPage } from '@features/inventory/pages/StockTransferList'
import { DeliveryChallanPrint } from '@features/inventory/pages/DeliveryChallanPrint'
import { SpecialBillListPage } from '@features/inventory/pages/SpecialBillList'
import { StockLedgerListPage } from '@features/inventory/pages/StockLedgerList'
import { StocktakeListPage } from '@features/inventory/pages/StocktakeList'
import { BomListPage } from '@features/manufacturing/pages/BomListPage'
import { WorkOrderListPage } from '@features/manufacturing/pages/WorkOrderListPage'
import { WipReconciliationPage } from '@features/manufacturing/pages/WipReconciliationPage'
import { ProductionPlanListPage } from '@features/manufacturing/pages/ProductionPlanListPage'
import { JobWorkListPage } from '@features/manufacturing/pages/JobWorkListPage'
import { JobWorkAgingPage } from '@features/manufacturing/pages/JobWorkAgingPage'
import { JobCardListPage } from '@features/manufacturing/pages/JobCardListPage'
import { ShopFloorExecutionPage } from '@features/manufacturing/pages/ShopFloorExecutionPage'
import { OeeDashboardPage } from '@features/manufacturing/pages/OeeDashboardPage'
import { MachineUtilizationPage } from '@features/manufacturing/pages/MachineUtilizationPage'
import { DowntimeParetoPage } from '@features/manufacturing/pages/DowntimeParetoPage'
import { PlanVsActualPage } from '@features/manufacturing/pages/PlanVsActualPage'
import {
  QualityCockpitPage,
  InspectionWorkbenchPage,
  QualityTemplateListPage,
  NcrManagementPage,
  CapaEightDPage,
} from '@/features/quality'
import { AccountListPage } from '@features/financial/pages/AccountList'
import { ChartOfAccountsPage } from '@features/financial/pages/ChartOfAccountsPage'
import { JournalVoucherPage } from '@features/financial/pages/JournalVoucherPage'
import { IncomeReceiptListPage } from '@features/financial/pages/IncomeReceiptList'
import { PaymentVoucherListPage } from '@features/financial/pages/PaymentVoucherList'
import { MoneyInListPage } from '@features/financial/pages/MoneyInList'
import { MoneyOutListPage } from '@features/financial/pages/MoneyOutList'
import { GiroListPage } from '@features/financial/pages/GiroList'
import { AdvanceInListPage } from '@features/financial/pages/AdvanceInList'
import { BankReconciliationListPage } from '@features/financial/pages/BankReconciliationListPage'
import { BankReconciliationWorkspace } from '@features/financial/pages/BankReconciliationWorkspace'
import { PurchaseApplyListPage } from '@features/bill/pages/PurchaseApplyList'
import { PurchaseOrderListPage as BillPurchaseOrderListPage } from '@features/bill/pages/PurchaseOrderList'
import { PurchaseInboundListPage } from '@features/bill/pages/PurchaseInboundList'
import { PurchaseReturnListPage } from '@features/bill/pages/PurchaseReturnList'
import { SaleOrderListPage } from '@features/bill/pages/SaleOrderList'
import { SaleOutboundListPage } from '@features/bill/pages/SaleOutboundList'
import { SaleReturnListPage } from '@features/bill/pages/SaleReturnList'
import { RetailBillListPage } from '@features/bill/pages/RetailBillList'
import { BillingDocumentList } from '@features/sales/pages/BillingDocumentList'
import { QuotationListPage } from '@features/sales'
import { PriceListListPage } from '@features/pricing/pages/PriceListListPage'
import { ExchangeRateListPage } from '@features/pricing/pages/ExchangeRateListPage'
import { Gstr1FilingWorkspacePage } from '@features/gst/pages/Gstr1FilingWorkspacePage'
import { Gstr3bSummaryPage } from '@features/gst/pages/Gstr3bSummaryPage'
import { Gstr2bReconciliationPage } from '@features/gst/pages/Gstr2bReconciliationPage'
import { GstSalesInvoiceForm } from '@features/gst/pages/GstSalesInvoiceForm'
import { GstRule46InvoicePrint } from '@features/gst/pages/GstRule46InvoicePrint'
import { GstCreditDebitNoteForm } from '@features/gst/pages/GstCreditDebitNoteForm'
import { GstRule53NotePrint } from '@features/gst/pages/GstRule53NotePrint'
import { GstEInvoiceDashboard } from '@features/gst/pages/GstEInvoiceDashboard'
import { StockReportPage } from '@features/report/pages/StockReport'
import { VendorStatementPage } from '@features/report/pages/VendorStatement'
import { CustomerStatementPage } from '@features/report/pages/CustomerStatement'
import { AccountStatsReportPage } from '@features/report/pages/AccountStatsReport'
import { TrendReportPage } from '@features/report/pages/TrendReport'
import { InboundOutboundDetailReportPage } from '@features/report/pages/InboundOutboundDetailReport'
import {
  PurchaseOrderListPage as EnterprisePurchaseOrderListPage,
  PurchaseReturnListPage as EnterprisePurchaseReturnListPage,
  SupplierAdvanceListPage,
  TdsRegisterReportPage,
  MsmeAgingReportPage,
  GoodsReceiptListPage,
  PurchaseInvoiceListPage,
  LandedCostVoucherListPage,
} from '@/features/procurement'
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
import { PlatformDashboardPage } from '@features/dashboard/pages/PlatformDashboardPage'
import { SupportDashboardPage } from '@features/dashboard/pages/SupportDashboardPage'
import { SupportCenterPage } from '@features/system/pages/SupportCenter'
import { TrialBalancePage } from '@features/financial/pages/TrialBalancePage'
import { BalanceSheetPage } from '@features/financial/pages/BalanceSheetPage'
import { ProfitLossPage } from '@features/financial/pages/ProfitLossPage'
import { GlAuditTrailPage } from '@features/financial/pages/GlAuditTrailPage'
import { FixedAssetListPage } from '@features/financial/pages/FixedAssetListPage'
import { AssetClassListPage } from '@features/financial/pages/AssetClassListPage'
import { DepreciationRunPage } from '@features/financial/pages/DepreciationRunPage'
import { FixedAssetScheduleIIIReportPage } from '@features/financial/pages/FixedAssetScheduleIIIReportPage'
import { FiscalPeriodListPage } from '@features/financial/pages/FiscalPeriodListPage'
import { YearEndClosingPage } from '@features/financial/pages/YearEndClosingPage'
import { ConsolidationCockpitPage } from '@features/financial/pages/ConsolidationCockpitPage'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore, AuthorityDomain } from '@store/useAppStore'

const LoadingFallback: React.FC = () => (
  <div style={{ height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <Spin size="large" description="Loading View..." />
  </div>
)

const IndexRedirect: React.FC = () => {
  const userAuth = useAppStore((state) => state.userAuth)
  const domain = userAuth.authorityDomain || 'TENANT'

  if (domain === 'PLATFORM') {
    return <Navigate to="/platform/dashboard" replace />
  }
  if (domain === 'SUPPORT_OPERATIONS') {
    return <Navigate to="/support/dashboard" replace />
  }
  return <Navigate to="/dashboard" replace />
}

const AuthorityRouteGuard: React.FC<{
  children: React.ReactNode
  allowedDomains?: AuthorityDomain[]
  disallowedInPlatform?: boolean
  requireSuperAdmin?: boolean
}> = ({ children, allowedDomains, disallowedInPlatform, requireSuperAdmin }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const userAuth = useAppStore((state) => state.userAuth)
  const fetchUserAuth = useAppStore((state) => state.fetchUserAuth)
  const location = useLocation()

  React.useEffect(() => {
    if (isAuthenticated && !userAuth.loaded) {
      fetchUserAuth()
    }
  }, [isAuthenticated, userAuth.loaded, fetchUserAuth])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (userAuth.loaded) {
    const domain = userAuth.authorityDomain || 'TENANT'

    // Domain restrictions
    if (allowedDomains && !allowedDomains.includes(domain)) {
      if (domain === 'PLATFORM') return <Navigate to="/platform/dashboard" replace />
      if (domain === 'SUPPORT_OPERATIONS') return <Navigate to="/support/dashboard" replace />
      return <Navigate to="/dashboard" replace />
    }

    // Direct access to tenant operational paths while in PLATFORM context
    if (disallowedInPlatform && domain === 'PLATFORM') {
      return <Navigate to="/platform/dashboard" replace />
    }

    // Direct access to tenant paths for System Support without active support session
    if (disallowedInPlatform && domain === 'SUPPORT_OPERATIONS') {
      return <Navigate to="/support/dashboard" replace />
    }

    // Platform Super Admin requirement
    if (requireSuperAdmin && !userAuth.isSuperAdmin) {
      return <Navigate to="/dashboard" replace />
    }
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
      <AuthorityRouteGuard>
        <MainLayout />
      </AuthorityRouteGuard>
    ),
    children: [
      {
        index: true,
        element: <IndexRedirect />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AuthorityRouteGuard disallowedInPlatform>
              <DashboardPage />
            </AuthorityRouteGuard>
          </Suspense>
        ),
      },
      {
        path: 'platform/dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
              <PlatformDashboardPage />
            </AuthorityRouteGuard>
          </Suspense>
        ),
      },
      {
        path: 'support/dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AuthorityRouteGuard allowedDomains={['SUPPORT_OPERATIONS', 'PLATFORM']}>
              <SupportDashboardPage />
            </AuthorityRouteGuard>
          </Suspense>
        ),
      },
      {
        path: 'support/center',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AuthorityRouteGuard allowedDomains={['PLATFORM', 'SUPPORT_OPERATIONS']}>
              <SupportCenterPage />
            </AuthorityRouteGuard>
          </Suspense>
        ),
      },

      // ==========================================
      // 1. Sales & Distribution (Order-to-Cash)
      // ==========================================
      {
        path: 'sales/quotations',
        element: <QuotationListPage />,
      },
      {
        path: 'sales/quotation', // Alias
        element: <QuotationListPage />,
      },
      {
        path: 'quotations',
        element: <QuotationListPage />,
      },
      {
        path: 'sales/orders',
        element: <SaleOrderListPage />,
      },
      {
        path: 'sales/order', // Alias
        element: <SaleOrderListPage />,
      },
      {
        path: 'sales/invoices',
        element: <BillingDocumentList />,
      },
      {
        path: 'sales/billing', // Alias
        element: <BillingDocumentList />,
      },
      {
        path: 'sales/invoices/new',
        element: <GstSalesInvoiceForm />,
      },
      {
        path: 'sales/invoices/:id',
        element: <GstSalesInvoiceForm />,
      },
      {
        path: 'sales/invoices/:id/print',
        element: <GstRule46InvoicePrint />,
      },
      // GST Sales Invoice Aliases
      {
        path: 'gst/sales-invoice',
        element: <BillingDocumentList />,
      },
      {
        path: 'gst/sales-invoice/new',
        element: <GstSalesInvoiceForm />,
      },
      {
        path: 'gst/sales-invoice/:id',
        element: <GstSalesInvoiceForm />,
      },
      {
        path: 'gst/sales-invoice/print/:id',
        element: <GstRule46InvoicePrint />,
      },
      {
        path: 'gst/sales-invoice/:id/print',
        element: <GstRule46InvoicePrint />,
      },
      {
        path: 'sales/credit_notes',
        element: <BillingDocumentList />,
      },
      {
        path: 'sales/credit_notes/new',
        element: <GstCreditDebitNoteForm />,
      },
      {
        path: 'sales/credit_notes/:id',
        element: <GstCreditDebitNoteForm />,
      },
      {
        path: 'sales/credit_notes/:id/print',
        element: <GstRule53NotePrint />,
      },
      {
        path: 'sales/debit_notes/new',
        element: <GstCreditDebitNoteForm />,
      },
      {
        path: 'sales/debit_notes/:id',
        element: <GstCreditDebitNoteForm />,
      },
      {
        path: 'sales/debit_notes/:id/print',
        element: <GstRule53NotePrint />,
      },
      {
        path: 'sales/outbound',
        element: <SaleOutboundListPage />,
      },
      {
        path: 'sales/returns',
        element: <SaleReturnListPage />,
      },
      {
        path: 'sales/return', // Alias
        element: <SaleReturnListPage />,
      },
      {
        path: 'sales/einvoice_workspace',
        element: <GstEInvoiceDashboard />,
      },

      // ==========================================
      // 2. Sourcing & Procurement (Procure-to-Pay)
      // ==========================================
      {
        path: 'procurement/requisitions',
        element: <PurchaseApplyListPage />,
      },
      {
        path: 'purchase/apply', // Alias
        element: <PurchaseApplyListPage />,
      },
      {
        path: 'bill/purchase_apply', // Legacy alias
        element: <PurchaseApplyListPage />,
      },
      {
        path: 'procurement/orders',
        element: <EnterprisePurchaseOrderListPage />,
      },
      {
        path: 'purchase/order', // Alias
        element: <EnterprisePurchaseOrderListPage />,
      },
      {
        path: 'procurement/inbound',
        element: <PurchaseInboundListPage />,
      },
      {
        path: 'purchase/inbound', // Alias
        element: <PurchaseInboundListPage />,
      },
      {
        path: 'procurement/receipts',
        element: <GoodsReceiptListPage />,
      },
      {
        path: 'procurement/invoices',
        element: <PurchaseInvoiceListPage />,
      },
      {
        path: 'procurement/landed-costs',
        element: <LandedCostVoucherListPage />,
      },
      {
        path: 'procurement/advances',
        element: <SupplierAdvanceListPage />,
      },
      {
        path: 'procurement/tds-register',
        element: <TdsRegisterReportPage />,
      },
      {
        path: 'procurement/msme-aging',
        element: <MsmeAgingReportPage />,
      },
      {
        path: 'procurement/returns',
        element: <EnterprisePurchaseReturnListPage />,
      },
      {
        path: 'purchase/return', // Alias
        element: <EnterprisePurchaseReturnListPage />,
      },

      // ==========================================
      // 3. Supply Chain & Inventory Management
      // ==========================================
      {
        path: 'inventory/transfers',
        element: <StockTransferListPage />,
      },
      {
        path: 'inventory/transfer', // Alias
        element: <StockTransferListPage />,
      },
      {
        path: 'inventory/transfers/:id/print',
        element: <DeliveryChallanPrint />,
      },
      {
        path: 'inventory/stock_ledger',
        element: <StockLedgerListPage />,
      },
      {
        path: 'inventory/stocktake',
        element: <StocktakeListPage />,
      },
      {
        path: 'inventory/depots',
        element: <DepotListPage />,
      },
      {
        path: 'inventory/depot', // Alias
        element: <DepotListPage />,
      },
      {
        path: 'inventory/other_in',
        element: <SpecialBillListPage type="入库" subType="其它入库" title="Miscellaneous Stock Receipts" />,
      },
      {
        path: 'inventory/other_out',
        element: <SpecialBillListPage type="出库" subType="其它出库" title="Miscellaneous Stock Issues" />,
      },
      {
        path: 'inventory/assemble',
        element: <SpecialBillListPage type="入库" subType="组装单" title="Stock Assembly Vouchers" />,
      },
      {
        path: 'inventory/disassemble',
        element: <SpecialBillListPage type="出库" subType="拆卸单" title="Stock Disassembly Vouchers" />,
      },

      // ==========================================
      // Manufacturing & Discrete Production (MFG-1 & MFG-2)
      // ==========================================
      {
        path: 'manufacturing/production_plan',
        element: <ProductionPlanListPage />,
      },
      {
        path: 'manufacturing/production_plans',
        element: <ProductionPlanListPage />,
      },
      {
        path: 'manufacturing/bom',
        element: <BomListPage />,
      },
      {
        path: 'manufacturing/work_orders',
        element: <WorkOrderListPage />,
      },
      {
        path: 'manufacturing/wip_reconciliation',
        element: <WipReconciliationPage />,
      },
      {
        path: 'manufacturing/job_card',
        element: <JobCardListPage />,
      },
      {
        path: 'manufacturing/job_cards',
        element: <JobCardListPage />,
      },
      {
        path: 'manufacturing/shop_floor',
        element: <ShopFloorExecutionPage />,
      },
      {
        path: 'manufacturing/job_work',
        element: <JobWorkListPage />,
      },
      {
        path: 'manufacturing/section143_aging',
        element: <JobWorkAgingPage />,
      },
      {
        path: 'manufacturing/oee_dashboard',
        element: <OeeDashboardPage />,
      },
      {
        path: 'manufacturing/machine_utilization',
        element: <MachineUtilizationPage />,
      },
      {
        path: 'manufacturing/downtime_analysis',
        element: <DowntimeParetoPage />,
      },
      {
        path: 'manufacturing/plan_vs_actual',
        element: <PlanVsActualPage />,
      },

      // ==========================================
      // Quality Management & Compliance (WP4)
      // ==========================================
      {
        path: 'quality/cockpit',
        element: <QualityCockpitPage />,
      },
      {
        path: 'quality/inspections',
        element: <InspectionWorkbenchPage />,
      },
      {
        path: 'quality/inspection', // Alias
        element: <InspectionWorkbenchPage />,
      },
      {
        path: 'quality/templates',
        element: <QualityTemplateListPage />,
      },
      {
        path: 'quality/template', // Alias
        element: <QualityTemplateListPage />,
      },
      {
        path: 'quality/ncr',
        element: <NcrManagementPage />,
      },
      {
        path: 'quality/capa',
        element: <CapaEightDPage />,
      },
      {
        path: 'quality/8d', // Alias
        element: <CapaEightDPage />,
      },

      // ==========================================
      // 4. Financial Accounting (FI-CO / AR / AP)
      // ==========================================
      {
        path: 'financial/receipts',
        element: <MoneyInListPage />,
      },
      {
        path: 'financial/money_in', // Alias
        element: <MoneyInListPage />,
      },
      {
        path: 'financial/payments',
        element: <MoneyOutListPage />,
      },
      {
        path: 'financial/money_out', // Alias
        element: <MoneyOutListPage />,
      },
      {
        path: 'financial/advances',
        element: <AdvanceInListPage />,
      },
      {
        path: 'financial/advance_in', // Alias
        element: <AdvanceInListPage />,
      },
      {
        path: 'financial/accounts',
        element: <AccountListPage />,
      },
      {
        path: 'financial/account', // Alias
        element: <AccountListPage />,
      },
      {
        path: 'financial/chart_of_accounts',
        element: <ChartOfAccountsPage />,
      },
      {
        path: 'financial/coa', // Alias
        element: <ChartOfAccountsPage />,
      },
      {
        path: 'financial/journal_vouchers',
        element: <JournalVoucherPage />,
      },
      {
        path: 'financial/journal_voucher', // Alias
        element: <JournalVoucherPage />,
      },
      {
        path: 'financial/contra',
        element: <JournalVoucherPage defaultTab="CONTRA" />,
      },
      {
        path: 'financial/transfers',
        element: <JournalVoucherPage defaultTab="CONTRA" />,
      },
      {
        path: 'financial/giro', // Alias
        element: <GiroListPage />,
      },
      {
        path: 'financial/income',
        element: <IncomeReceiptListPage />,
      },
      {
        path: 'financial/payment',
        element: <PaymentVoucherListPage />,
      },
      {
        path: 'financial/bank-reconciliation',
        element: <BankReconciliationListPage />,
      },
      {
        path: 'financial/bank-reconciliation/:id',
        element: <BankReconciliationWorkspace />,
      },
      {
        path: 'financial/bank_reconciliation', // Alias
        element: <BankReconciliationListPage />,
      },
      {
        path: 'financial/reports/trial_balance',
        element: <TrialBalancePage />,
      },
      {
        path: 'financial/reports/trial-balance',
        element: <TrialBalancePage />,
      },
      {
        path: 'financial/reports/balance_sheet',
        element: <BalanceSheetPage />,
      },
      {
        path: 'financial/reports/balance-sheet',
        element: <BalanceSheetPage />,
      },
      {
        path: 'financial/reports/profit_loss',
        element: <ProfitLossPage />,
      },
      {
        path: 'financial/reports/profit-loss',
        element: <ProfitLossPage />,
      },
      {
        path: 'financial/reports/gl_audit_trail',
        element: <GlAuditTrailPage />,
      },
      {
        path: 'financial/reports/gl-audit-trail',
        element: <GlAuditTrailPage />,
      },
      {
        path: 'financial/fixed-assets',
        element: <FixedAssetListPage />,
      },
      {
        path: 'financial/fixed-assets/classes',
        element: <AssetClassListPage />,
      },
      {
        path: 'financial/fixed-assets/depreciation',
        element: <DepreciationRunPage />,
      },
      {
        path: 'financial/fixed-assets/schedule-iii',
        element: <FixedAssetScheduleIIIReportPage />,
      },
      {
        path: 'financial/fiscal-periods',
        element: <FiscalPeriodListPage />,
      },
      {
        path: 'financial/periods',
        element: <FiscalPeriodListPage />,
      },
      {
        path: 'financial/year-end-closing',
        element: <YearEndClosingPage />,
      },
      {
        path: 'financial/year_end_closing',
        element: <YearEndClosingPage />,
      },
      {
        path: 'financial/consolidation',
        element: <ConsolidationCockpitPage />,
      },
      {
        path: 'financial/consolidation/cockpit',
        element: <ConsolidationCockpitPage />,
      },

      // ==========================================
      // 5. Product & Business Partner Master Data
      // ==========================================
      {
        path: 'master/products',
        element: <MaterialListPage />,
      },
      {
        path: 'material/list', // Alias
        element: <MaterialListPage />,
      },
      {
        path: 'master/categories',
        element: <CategoryListPage />,
      },
      {
        path: 'material/category', // Alias
        element: <CategoryListPage />,
      },
      {
        path: 'master/units',
        element: <UnitListPage />,
      },
      {
        path: 'material/unit', // Alias
        element: <UnitListPage />,
      },
      {
        path: 'master/attributes',
        element: <MaterialAttributeListPage />,
      },
      {
        path: 'material/attribute', // Alias
        element: <MaterialAttributeListPage />,
      },
      {
        path: 'master/customers',
        element: <CustomerListPage />,
      },
      {
        path: 'system/customer', // Alias
        element: <CustomerListPage />,
      },
      {
        path: 'master/vendors',
        element: <VendorListPage />,
      },
      {
        path: 'system/vendor', // Alias
        element: <VendorListPage />,
      },
      {
        path: 'master/members',
        element: <MemberListPage />,
      },
      {
        path: 'system/member', // Alias
        element: <MemberListPage />,
      },
      {
        path: 'master/staff',
        element: <PersonListPage />,
      },
      {
        path: 'system/person', // Alias
        element: <PersonListPage />,
      },
      {
        path: 'master/in_out_items',
        element: <InOutItemListPage />,
      },
      {
        path: 'system/in_out_item', // Alias
        element: <InOutItemListPage />,
      },

      // ==========================================
      // 6. Statutory Tax & Compliance Workspace
      // ==========================================
      {
        path: 'compliance/edocument_cockpit',
        element: <GstEInvoiceDashboard />,
      },
      {
        path: 'gst/einvoice_dashboard', // Alias
        element: <GstEInvoiceDashboard />,
      },
      {
        path: 'tax/company_gstin',
        element: <CompanyGstinListPage />,
      },
      {
        path: 'gst/company_gstin', // Alias
        element: <CompanyGstinListPage />,
      },
      {
        path: 'tax/hsn_sac',
        element: <HsnSacListPage />,
      },
      {
        path: 'gst/hsn_sac', // Alias
        element: <HsnSacListPage />,
      },
      {
        path: 'tax/tax_rates',
        element: <TaxRateListPage />,
      },
      {
        path: 'gst/tax_rates', // Alias
        element: <TaxRateListPage />,
      },
      {
        path: 'tax/tax_rules',
        element: <TaxRuleList />,
      },
      {
        path: 'gst/tax_rules', // Alias
        element: <TaxRuleList />,
      },
      {
        path: 'tax/state_codes',
        element: <StateCodeListPage />,
      },
      {
        path: 'gst/state_codes', // Alias
        element: <StateCodeListPage />,
      },
      {
        path: 'tax/simulator',
        element: <GSTTaxCalculatorPage />,
      },
      {
        path: 'gst/tax_calculator', // Alias
        element: <GSTTaxCalculatorPage />,
      },

      // ==========================================
      // 7. Administration & Organization Controls
      // ==========================================
      {
        path: 'admin/financial_years',
        element: <FinancialYearConfigPage />,
      },
      {
        path: 'admin/financial_year', // Alias
        element: <FinancialYearConfigPage />,
      },
      {
        path: 'gst/financial_year', // Alias
        element: <FinancialYearConfigPage />,
      },
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
        path: 'system/tenant',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM', 'SUPPORT_OPERATIONS']}>
            <TenantListPage />
          </AuthorityRouteGuard>
        ),
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
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <FunctionListPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'system/plugin',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <PluginListPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'system/dict',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <DictListPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'system/platform_config',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <PlatformConfigListPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'platform/plans',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <PlanManagementPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'platform/audit',
        element: (
          <AuthorityRouteGuard allowedDomains={['PLATFORM']}>
            <PlatformAuditListPage />
          </AuthorityRouteGuard>
        ),
      },
      {
        path: 'system/demo_data',
        element: <DemoDataManagementPage />,
      },
      {
        path: 'system/demo', // Alias
        element: <DemoDataManagementPage />,
      },

      // ==========================================
      // 8. Analytics & Reporting Domain
      // ==========================================
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
        element: <InboundOutboundDetailReportPage type="入库" title="Inbound Receipt Details" />,
      },
      {
        path: 'report/out_detail',
        element: <InboundOutboundDetailReportPage type="出库" title="Outbound Issue Details" />,
      },
      {
        path: 'report/allocation_detail',
        element: <InboundOutboundDetailReportPage type="调拨" title="Stock Transfer Details" />,
      },
      {
        path: 'report/in_material_count',
        element: <InboundOutboundSummaryReportPage type="入库" title="Inbound Receipt Summary" />,
      },
      {
        path: 'report/out_material_count',
        element: <InboundOutboundSummaryReportPage type="出库" title="Outbound Issue Summary" />,
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

      // Retail Domain (Preserved)
      {
        path: 'retail/outbound',
        element: <RetailBillListPage subType="零售出库" title="Retail Dispatch" />,
      },
      {
        path: 'retail/return',
        element: <RetailBillListPage subType="零售退货" title="Retail Returns" />,
      },

      // Phase 4 & Phase 5: Pricing, FX & Statutory GSTR Workspaces
      {
        path: 'pricing/price-lists',
        element: <PriceListListPage />,
      },
      {
        path: 'pricing',
        element: <PriceListListPage />,
      },
      {
        path: 'pricing/exchange-rates',
        element: <ExchangeRateListPage />,
      },
      {
        path: 'gst/gstr1',
        element: <Gstr1FilingWorkspacePage />,
      },
      {
        path: 'gst/gstr3b',
        element: <Gstr3bSummaryPage />,
      },
      {
        path: 'gst/gstr2b',
        element: <Gstr2bReconciliationPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
