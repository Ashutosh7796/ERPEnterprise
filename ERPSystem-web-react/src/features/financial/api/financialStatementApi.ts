import { http } from '@core/api/client'

// =========================================================================
// 1. TRIAL BALANCE TYPES
// =========================================================================

export interface TrialBalanceItem {
  accountId: number
  accountCode: string
  accountName: string
  rootType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  accountType: string
  normalBalance: 'DEBIT' | 'CREDIT'
  isGroup: '0' | '1'
  parentId?: number
  level?: number
  openingDebit: number
  openingCredit: number
  openingNet: number
  periodDebit: number
  periodCredit: number
  closingDebit: number
  closingCredit: number
  closingNet: number
}

export interface TrialBalanceReport {
  startDate: string
  endDate: string
  items: TrialBalanceItem[]
  totalOpeningDebit: number
  totalOpeningCredit: number
  totalPeriodDebit: number
  totalPeriodCredit: number
  totalClosingDebit: number
  totalClosingCredit: number
  difference: number
  isBalanced: boolean
}

// =========================================================================
// 2. BALANCE SHEET TYPES
// =========================================================================

export interface BalanceSheetItem {
  scheduleCode: string
  scheduleName: string
  accountCode: string
  accountName: string
  amount: number
  notes?: string
}

export interface BalanceSheetSection {
  sectionCode: string
  sectionName: string
  totalAmount: number
  items: BalanceSheetItem[]
  subSections?: BalanceSheetSection[]
}

export interface BalanceSheetReport {
  asOfDate: string
  equityAndLiabilities: BalanceSheetSection[]
  totalEquityAndLiabilities: number
  assets: BalanceSheetSection[]
  totalAssets: number
  currentPeriodProfitLoss: number
  difference: number
  isBalanced: boolean
}

// =========================================================================
// 3. PROFIT & LOSS TYPES
// =========================================================================

export interface ProfitLossItem {
  itemCode: string
  itemName: string
  accountCode: string
  accountName: string
  amount: number
  notes?: string
}

export interface ProfitLossSection {
  sectionName: string
  totalAmount: number
  items: ProfitLossItem[]
}

export interface ProfitLossReport {
  startDate: string
  endDate: string
  revenue: ProfitLossSection
  otherIncome: ProfitLossSection
  totalRevenue: number
  expenses: ProfitLossSection
  totalExpenses: number
  profitBeforeTax: number
  netProfit: number
}

// =========================================================================
// 4. GENERAL LEDGER AUDIT TRAIL TYPES
// =========================================================================

export interface GlAuditTrailItem {
  id: number
  postingDate: string
  transactionDate?: string
  voucherType: string
  voucherId?: number
  voucherNo: string
  lineNo?: number
  narration?: string
  partyType?: string
  partyId?: number
  partyName?: string
  costCenter?: string
  debit: number
  credit: number
  netMovement: number
  runningBalance: number
  reversalOfId?: number
}

export interface GlAuditTrailReport {
  accountId?: number
  accountCode?: string
  accountName?: string
  normalBalance?: string
  startDate: string
  endDate: string
  openingBalance: number
  totalDebit: number
  totalCredit: number
  closingBalance: number
  totalCount: number
  currentPage: number
  pageSize: number
  entries: GlAuditTrailItem[]
}

// =========================================================================
// API CLIENT
// =========================================================================

export const financialStatementApi = {
  getTrialBalance: (params?: {
    startDate?: string
    endDate?: string
    hideZeroBalance?: boolean
  }) =>
    http.get<TrialBalanceReport>('/financial/reports/trial-balance', { params }),

  getBalanceSheet: (params?: {
    asOfDate?: string
  }) =>
    http.get<BalanceSheetReport>('/financial/reports/balance-sheet', { params }),

  getProfitLoss: (params?: {
    startDate?: string
    endDate?: string
  }) =>
    http.get<ProfitLossReport>('/financial/reports/profit-loss', { params }),

  getGlAuditTrail: (params?: {
    accountId?: number
    accountCode?: string
    partyType?: string
    partyId?: number
    voucherType?: string
    voucherNumber?: string
    startDate?: string
    endDate?: string
    currentPage?: number
    pageSize?: number
  }) =>
    http.get<GlAuditTrailReport>('/financial/reports/general-ledger', { params }),
}
