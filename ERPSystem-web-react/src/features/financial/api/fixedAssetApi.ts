import { http } from '@core/api/client'

export interface FixedAssetDTO {
  id?: number
  tenantId?: number
  assetCode?: string
  assetName: string
  assetClassId: number
  assetClassName?: string
  serialNumber?: string
  location?: string
  department?: string
  custodianUserId?: number
  acquisitionDate?: string
  capitalizationDate?: string
  depreciationStartDate?: string
  grossCost: number
  residualPercentage?: number
  salvageValue?: number
  depreciableBase?: number
  usefulLifeMonths: number
  remainingLifeMonths?: number
  accumulatedDepreciation?: number
  netBookValue?: number
  lastDepreciationDate?: string
  status?: 'DRAFT' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED'
  glCostAccountId?: number
  glCostAccountName?: string
  glAccumDepAccountId?: number
  glAccumDepAccountName?: string
  glDepExpenseAccountId?: number
  glDepExpenseAccountName?: string
  createTime?: string
  updateTime?: string
}

export interface AssetClassDTO {
  id?: number
  tenantId?: number
  classCode: string
  className: string
  scheduleIiCategory: string
  usefulLifeMonths: number
  depreciationMethod?: string
  defaultResidualPercentage?: number
  assetAccountId?: number
  assetAccountName?: string
  accumulatedDepAccountId?: number
  accumulatedDepAccountName?: string
  depreciationExpenseAccountId?: number
  depreciationExpenseAccountName?: string
  gainOnDisposalAccountId?: number
  lossOnDisposalAccountId?: number
  status?: 'ACTIVE' | 'INACTIVE'
  createTime?: string
  updateTime?: string
}

export interface AssetDepreciationRunDTO {
  id?: number
  tenantId?: number
  runNumber: string
  fiscalYearId?: number
  runYear: number
  runMonth: number
  runDate: string
  totalAssets: number
  totalDepreciationAmount: number
  glEntryId?: number
  status: 'POSTED' | 'REVERSED'
  reversalGlEntryId?: number
  reverseReason?: string
  createTime?: string
}

export interface AssetDepreciationItemDTO {
  id?: number
  runId?: number
  assetId: number
  assetCode: string
  assetName: string
  assetClassId?: number
  assetClassName?: string
  acquisitionCost: number
  accumulatedDepBefore: number
  periodDepreciation: number
  accumulatedDepAfter: number
  netBookValueAfter: number
  daysCalculated?: number
}

export interface AssetDisposalVo {
  assetId: number
  disposalDate: string
  disposalType: 'SALE' | 'SCRAP' | 'WRITE_OFF'
  saleProceeds?: number
  settlementAccountId?: number
  customerId?: number
  notes?: string
}

export interface AssetDisposalDTO {
  id?: number
  tenantId?: number
  assetId: number
  assetCode: string
  assetName: string
  disposalDate: string
  disposalType: string
  saleProceeds: number
  carryingGrossCost: number
  carryingAccumDep: number
  finalDepreciationAmount: number
  netBookValueAtDisposal: number
  gainLossAmount: number
  glEntryId?: number
  status?: string
  notes?: string
  createTime?: string
}

export interface ScheduleIIPpeClassRowDTO {
  classId?: number
  classCode: string
  className: string
  scheduleIICategory: string
  openingGrossBlock: number
  additions: number
  deductions: number
  closingGrossBlock: number
  openingAccumulatedDep: number
  periodDepreciation: number
  deductionsOnDisposal: number
  closingAccumulatedDep: number
  openingNetBlock: number
  closingNetBlock: number
}

export interface ScheduleIIPpeReportDTO {
  periodStartDate: string
  periodEndDate: string
  financialYearName: string
  rows: ScheduleIIPpeClassRowDTO[]
  totals: ScheduleIIPpeClassRowDTO
  balanceSheetGrossPpe: number
  balanceSheetAccumDep: number
  balanceSheetNetPpe: number
  grossVariance: number
  accumDepVariance: number
  netVariance: number
  reconciliationStatus: 'RECONCILED' | 'VARIANCE_DETECTED'
}

export const fixedAssetApi = {
  // Asset Master
  getList: (params: {
    assetClassId?: number
    status?: string
    searchKey?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: FixedAssetDTO[]; total: number }>('/fixedAsset/list', params),

  getById: (id: number) => http.get<FixedAssetDTO>(`/fixedAsset/${id}`),

  create: (data: Partial<FixedAssetDTO>) => http.post<FixedAssetDTO>('/fixedAsset/create', data),

  update: (data: Partial<FixedAssetDTO>) => http.put<FixedAssetDTO>('/fixedAsset/update', data),

  delete: (id: number) => http.delete<string>(`/fixedAsset/${id}`),

  // Asset Classes
  getAllClasses: (status?: string) => http.get<AssetClassDTO[]>('/fixedAsset/class/all', { status }),

  getClassList: (params: {
    status?: string
    searchKey?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: AssetClassDTO[]; total: number }>('/fixedAsset/class/list', params),

  getClassById: (id: number) => http.get<AssetClassDTO>(`/fixedAsset/class/${id}`),

  createClass: (data: Partial<AssetClassDTO>) => http.post<AssetClassDTO>('/fixedAsset/class/create', data),

  updateClass: (data: Partial<AssetClassDTO>) => http.put<AssetClassDTO>('/fixedAsset/class/update', data),

  deleteClass: (id: number) => http.delete<string>(`/fixedAsset/class/${id}`),

  // Depreciation Cockpit
  previewDepreciation: (year: number, month: number) =>
    http.get<AssetDepreciationItemDTO[]>('/fixedAsset/depreciation/preview', { year, month }),

  executeDepreciation: (year: number, month: number) =>
    http.post<AssetDepreciationRunDTO>('/fixedAsset/depreciation/execute', { year, month }),

  reverseDepreciation: (runId: number, reason: string) =>
    http.post<string>('/fixedAsset/depreciation/reverse', { runId, reason }),

  listDepreciationRuns: (params: {
    fiscalYearId?: number
    status?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: AssetDepreciationRunDTO[]; total: number }>('/fixedAsset/depreciation/runs', params),

  getDepreciationRunItems: (runId: number) =>
    http.get<AssetDepreciationItemDTO[]>(`/fixedAsset/depreciation/runs/${runId}/items`),

  // Disposal Workflow
  previewDisposal: (data: AssetDisposalVo) =>
    http.post<AssetDisposalDTO>('/fixedAsset/disposal/preview', data),

  executeDisposal: (data: AssetDisposalVo) =>
    http.post<AssetDisposalDTO>('/fixedAsset/disposal/execute', data),

  listDisposals: (params: {
    disposalType?: string
    status?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: AssetDisposalDTO[]; total: number }>('/fixedAsset/disposal/list', params),

  // Reports
  getScheduleIIPpe: (startDate?: string, endDate?: string) =>
    http.get<ScheduleIIPpeReportDTO>('/fixedAsset/report/schedule-iii', { startDate, endDate }),

  getRegistry: (params: { assetClassId?: number; status?: string; searchKey?: string }) =>
    http.get<FixedAssetDTO[]>('/fixedAsset/report/registry', params),
}
