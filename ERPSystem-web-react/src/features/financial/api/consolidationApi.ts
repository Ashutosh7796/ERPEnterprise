import { http } from '@core/api/client'

export interface ConsolidationGroup {
  id: number
  tenantId: number
  groupCode: string
  groupName: string
  parentOrganizationId: number
  parentOrganizationName?: string
  parentOrganizationCode?: string
  reportingCurrency: string
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  description?: string
  creator?: number
  createTime: string
  updateTime?: string
}

export interface ConsolidationGroupMember {
  id: number
  tenantId: number
  groupId: number
  organizationId: number
  organizationName?: string
  organizationCode?: string
  functionalCurrency?: string
  consolidationMethod: 'FULL' | 'PROPORTIONATE' | 'EQUITY'
  equitySharePct: number
  effectiveStartDate: string
  effectiveEndDate?: string
  status: 'ACTIVE' | 'INACTIVE'
  createTime: string
}

export interface IntercompanyRelationship {
  id: number
  tenantId: number
  sourceOrganizationId: number
  sourceOrgName?: string
  counterpartyOrganizationId: number
  counterpartyOrgName?: string
  sourceCustomerId?: number
  customerName?: string
  sourceSupplierId?: number
  supplierName?: string
  defaultReciprocalReceivableAccount?: number
  defaultReciprocalPayableAccount?: number
  status: 'ACTIVE' | 'INACTIVE'
  createTime: string
}

export interface ConsolidationRun {
  id: number
  tenantId: number
  groupId: number
  groupName?: string
  groupCode?: string
  runNumber: string
  asOfDate: string
  periodStartDate: string
  periodEndDate: string
  reportingCurrency: string
  totalGrossAssets: number
  totalEliminatedAssets: number
  totalConsolidatedAssets: number
  totalGrossRevenue: number
  totalEliminatedRevenue: number
  totalConsolidatedRevenue: number
  totalUnmatchedVariance: number
  isBalanced: boolean
  status: 'CREATED' | 'PREVIEW' | 'EXECUTED' | 'FINALIZED' | 'STALE_REOPENED'
  executionTimeMs?: number
  executedBy: number
  executorName?: string
  createTime: string
  updateTime?: string
}

export interface EliminationEntry {
  id?: number
  runId?: number
  groupId?: number
  eliminationType: string
  sourceOrganizationId: number
  sourceOrgName?: string
  counterpartyOrganizationId: number
  counterpartyOrgName?: string
  accountCode: string
  accountName?: string
  debit: number
  credit: number
  eliminationAmount: number
  currencyCode: string
  eliminationReason: string
  sourceDocumentRef?: string
  auditReference?: string
}

export interface ConsolidationException {
  id?: number
  runId?: number
  groupId?: number
  sourceOrganizationId: number
  sourceOrgName?: string
  counterpartyOrganizationId?: number
  counterpartyOrgName?: string
  exceptionType: 'UNMATCHED_RECIPROCAL' | 'AMOUNT_MISMATCH' | 'TIMING_DIFFERENCE' | 'ONE_SIDED' | 'MISSING_RELATIONSHIP'
  sourceAmount: number
  counterpartyAmount: number
  varianceAmount: number
  accountCode?: string
  details?: string
}

export interface ConsolidatedLineItem {
  accountCode: string
  accountName: string
  accountCategory: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  organizationAmounts: Record<number, number>
  grossAmount: number
  eliminationAmount: number
  consolidatedAmount: number
}

export interface ConsolidatedReportResult {
  tenantId: number
  groupId: number
  groupName: string
  runId?: number
  runNumber?: string
  runStatus?: 'CREATED' | 'PREVIEW' | 'EXECUTED' | 'FINALIZED' | 'STALE_REOPENED'
  reportType: 'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS'
  asOfDate: string
  periodStartDate: string
  periodEndDate: string
  reportingCurrency: string
  organizationIds: number[]
  organizationNames: Record<number, string>
  lines: ConsolidatedLineItem[]
  totalGross: number
  totalEliminations: number
  totalConsolidated: number
  isBalanced: boolean
  reconciliationFormula: string
  eliminations?: EliminationEntry[]
  exceptions?: ConsolidationException[]
}

export interface CreateGroupRequest {
  groupCode: string
  groupName: string
  parentOrganizationId: number
  reportingCurrency?: string
  description?: string
}

export interface AddMemberRequest {
  organizationId: number
  consolidationMethod?: 'FULL' | 'PROPORTIONATE' | 'EQUITY'
  equitySharePct?: number
  effectiveStartDate?: string
  effectiveEndDate?: string
}

export interface CreateRelationshipRequest {
  sourceOrganizationId: number
  counterpartyOrganizationId: number
  sourceCustomerId?: number
  sourceSupplierId?: number
  defaultReciprocalReceivableAccount?: number
  defaultReciprocalPayableAccount?: number
}

export interface ConsolidationRunRequest {
  groupId: number
  asOfDate?: string
  periodStartDate?: string
  periodEndDate?: string
  finalizeRun?: boolean
}

export const consolidationApi = {
  createGroup: (data: CreateGroupRequest) =>
    http.post<ConsolidationGroup>('/api/consolidation/groups', data),

  getGroups: () =>
    http.get<ConsolidationGroup[]>('/api/consolidation/groups'),

  getGroupById: (id: number) =>
    http.get<ConsolidationGroup>(`/api/consolidation/groups/${id}`),

  addMember: (groupId: number, data: AddMemberRequest) =>
    http.post<ConsolidationGroupMember>(`/api/consolidation/groups/${groupId}/members`, data),

  removeMember: (groupId: number, orgId: number) =>
    http.delete(`/api/consolidation/groups/${groupId}/members/${orgId}`),

  getGroupMembers: (groupId: number) =>
    http.get<ConsolidationGroupMember[]>(`/api/consolidation/groups/${groupId}/members`),

  createRelationship: (data: CreateRelationshipRequest) =>
    http.post<IntercompanyRelationship>('/api/consolidation/relationships', data),

  getRelationships: () =>
    http.get<IntercompanyRelationship[]>('/api/consolidation/relationships'),

  previewConsolidation: (data: ConsolidationRunRequest) =>
    http.post<ConsolidatedReportResult>('/api/consolidation/runs/preview', data),

  executeConsolidation: (data: ConsolidationRunRequest) =>
    http.post<ConsolidatedReportResult>('/api/consolidation/runs/execute', data),

  regenerateConsolidationRun: (runId: number) =>
    http.post<ConsolidatedReportResult>(`/api/consolidation/runs/${runId}/regenerate`, {}),

  getConsolidationRuns: (groupId: number) =>
    http.get<ConsolidationRun[]>(`/api/consolidation/runs?groupId=${groupId}`),

  getConsolidationRunById: (runId: number) =>
    http.get<ConsolidationRun>(`/api/consolidation/runs/${runId}`),

  getConsolidatedTrialBalance: (params: { groupId?: number; runId?: number; asOfDate?: string }) =>
    http.get<ConsolidatedReportResult>('/api/consolidation/reports/trial-balance', { params }),

  getConsolidatedBalanceSheet: (params: { groupId?: number; runId?: number; asOfDate?: string }) =>
    http.get<ConsolidatedReportResult>('/api/consolidation/reports/balance-sheet', { params }),

  getConsolidatedProfitLoss: (params: { groupId?: number; runId?: number; startDate?: string; endDate?: string }) =>
    http.get<ConsolidatedReportResult>('/api/consolidation/reports/profit-loss', { params }),

  getConsolidationExceptions: (runId: number) =>
    http.get<ConsolidationException[]>(`/api/consolidation/reports/exceptions?runId=${runId}`),
}
