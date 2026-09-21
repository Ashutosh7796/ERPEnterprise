import { http } from '@core/api/client'

export interface FiscalPeriodDTO {
  id: number
  tenantId?: number
  financialYearId: number
  periodNumber: number
  periodName: string
  startDate: string
  endDate: string
  status: 'UPCOMING' | 'ACTIVE' | 'LOCKED' | 'CLOSED'
  lockedBy?: number
  lockedTime?: string
  lockReason?: string
}

export interface PeriodCloseReadinessDto {
  periodName: string
  financialYearId: number
  periodNumber: number
  currentStatus: string
  isLocked: boolean
  isPrecedingPeriodClosed: boolean
  precedingPeriodName?: string
  precedingPeriodStatus?: string
  reconciliationStatus?: string
  totalVariance?: number
  isBalanced: boolean
  periodCloseReady: boolean
  unreadyReasons: string[]
}

export interface FinancialYearOption {
  id: number
  name: string
  code: string
  startDate: string
  endDate: string
  status: string
}

export const fiscalPeriodApi = {
  getPeriods: (financialYearId?: number) =>
    http.get<FiscalPeriodDTO[]>('/financialPeriod/list', { financialYearId }),

  getPeriodInfo: (periodName: string) =>
    http.get<FiscalPeriodDTO>('/financialPeriod/info', { periodName }),

  checkCloseReadiness: (periodName: string) =>
    http.get<PeriodCloseReadinessDto>('/financialPeriod/checkCloseReadiness', { periodName }),

  lockPeriod: (periodName: string, reason: string) =>
    http.post<FiscalPeriodDTO>('/financialPeriod/lock', { periodName, reason }),

  unlockPeriod: (periodName: string, reason: string) =>
    http.post<FiscalPeriodDTO>('/financialPeriod/unlock', { periodName, reason }),

  closePeriod: (periodName: string, reason: string) =>
    http.post<FiscalPeriodDTO>('/financialPeriod/close', { periodName, reason }),

  getFinancialYears: () =>
    http.get<{ list: FinancialYearOption[] }>('/financialYear/all'),
}
