import { http } from '@core/api/client'

export interface FinancialYearOption {
  id: number
  name: string
  code: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'CLOSED' | 'FINALIZED' | string
  closedAt?: string
  closedBy?: number
  finalizedReason?: string
}

export interface YearEndReadinessDto {
  tenantId: number
  financialYearId: number
  financialYearName: string
  financialYearStatus: string
  isFiscalYearActive: boolean

  // Gate 1: 12 Fiscal Periods Gate
  periodsCount: number
  areAllPeriodsClosed: boolean

  // Gate 2: Subledger Reconciliation Gate
  isReconciliationBalanced: boolean
  reconciliationTotalVariance: number
  reconciliationStatus: string

  // Gate 3: Trial Balance Gate
  isTrialBalanceBalanced: boolean
  trialBalanceTotalDebit: number
  trialBalanceTotalCredit: number

  // Gate 4: Pending Operational Documents Gate
  pendingDepotHeadCount: number
  pendingAccountHeadCount: number
  pendingJournalEntryCount: number
  noPendingDocuments: boolean

  // Net Result
  estimatedNetProfit: number
  eligibleNominalAccountsCount: number

  // Synthesis
  readyForClose: boolean
  blockingReasons: string[]
}

export interface YearEndClosingResultDto {
  tenantId: number
  financialYearId: number
  financialYearName: string
  status: string // FINALIZED
  netProfit: number
  entriesCount: number
  voucherNumber: string
  closedAt: string
  closedBy: number
  finalizedReason: string
}

export interface TenantOption {
  id?: number
  tenantId: number
  loginName: string
  remark?: string
  userNumLimit?: number
  billsNumLimit?: number
}

export const yearEndClosingApi = {
  getTenants: () =>
    http.get<{ list: TenantOption[] }>('/yearEndClosing/tenants'),

  getFiscalYears: (tenantId?: number) =>
    http.get<{ list: FinancialYearOption[]; tenantId?: number }>('/yearEndClosing/fiscalYears', tenantId ? { tenantId } : undefined),

  checkReadiness: (fiscalYearId: number, tenantId?: number) =>
    http.get<YearEndReadinessDto>('/yearEndClosing/readiness', { fiscalYearId, ...(tenantId ? { tenantId } : {}) }),

  closeFiscalYear: (fiscalYearId: number, tenantId?: number) =>
    http.post<YearEndClosingResultDto>(
      '/yearEndClosing/close',
      { fiscalYearId, ...(tenantId ? { tenantId } : {}) },
      tenantId ? { params: { tenantId } } : undefined
    ),
}

