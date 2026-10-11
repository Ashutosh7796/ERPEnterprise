import { http } from '@core/api/client'

export interface StatementUploadRequest {
  bankAccountId: number
  statementNumber?: string
  startDate: string
  endDate: string
  openingBalance: number
  closingBalance?: number
  fileName: string
  csvContent: string
}

export interface StatementUploadResponse {
  statementId: number
  fileName: string
  fileHash: string
  lineCount: number
  totalDebits: number
  totalCredits: number
  openingBalance: number
  closingBalance: number
  status: string
}

export interface BankStatementItem {
  id: number
  statementId: number
  lineNo: number
  transDate: string
  valueDate: string
  refNo: string
  narration: string
  debit: number
  credit: number
  balance: number
  matchStatus: 'UNMATCHED' | 'MATCHED' | 'ADJUSTED' | 'AMBIGUOUS'
}

export interface GlCandidateItem {
  glEntryId: number
  postingDate: string
  transactionDate: string
  voucherType: string
  voucherNo: string
  voucherId: number
  debit: number
  credit: number
  narration: string
  refNo: string
  matched: boolean
}

export interface CreateSessionRequest {
  bankAccountId: number
  statementId?: number
  asOfDate: string
  statementBalance: number
  remark?: string
}

export interface AutoMatchResult {
  exactMatchesCount: number
  ruleMatchesCount: number
  ambiguousCount: number
  remainingUnmatchedCount: number
  totalMatchedAmount: number
}

export interface ManualMatchRequest {
  sessionId: number
  statementLineIds: number[]
  glEntryIds: number[]
}

export interface UnmatchRequest {
  sessionId: number
  matchIds: number[]
}

export interface AdjustmentVoucherRequest {
  sessionId: number
  statementLineId: number
  adjustmentType: 'BANK_CHARGE' | 'INTEREST_INCOME' | 'DIRECT_DEBIT' | 'DIRECT_CREDIT'
  targetAccountCode?: string
  amount: number
  narration?: string
  postingDate?: string
}

export interface ReconciliationSummary {
  sessionId: number
  sessionNumber: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'RECONCILED' | 'FINALIZED' | 'REOPENED'
  asOfDate: string
  bankAccountId: number
  bankAccountName: string
  statementBalance: number
  glBalance: number
  uncreditedDeposits: number
  unpresentedCheques: number
  unrecordedAdjustments: number
  adjustedBankBalance: number
  reconciledDifference: number
  isBalanced: boolean
  matchedCount: number
  unmatchedStatementCount: number
  unmatchedGlCount: number
}

export interface MatchDetailItem {
  matchId: number
  statementLineId: number
  glEntryId: number
  matchType: string
  matchAmount: number
  transDate: string
  stmtRefNo: string
  stmtNarration: string
  stmtDebit: number
  stmtCredit: number
  postingDate: string
  voucherType: string
  voucherNo: string
  glNarration: string
  glDebit: number
  glCredit: number
  matchedBy: number
  matchedTime: string
}

export interface ReopenSessionRequest {
  sessionId: number
  reopenReason: string
}

export const bankReconciliationApi = {
  // Statements
  uploadStatement: (data: StatementUploadRequest) =>
    http.post<StatementUploadResponse>('/financial/bank-reconciliation/statement/upload', data),

  listStatements: (bankAccountId?: number) =>
    http.get<any[]>('/financial/bank-reconciliation/statement/list', {
      params: bankAccountId ? { bankAccountId } : {},
    }),

  // Sessions
  createSession: (data: CreateSessionRequest) =>
    http.post<ReconciliationSummary>('/financial/bank-reconciliation/session/create', data),

  listSessions: (bankAccountId?: number) =>
    http.get<any[]>('/financial/bank-reconciliation/session/list', {
      params: bankAccountId ? { bankAccountId } : {},
    }),

  getSession: (sessionId: number) =>
    http.get<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}`),

  // Workspace
  getGlCandidates: (sessionId: number) =>
    http.get<GlCandidateItem[]>(`/financial/bank-reconciliation/session/${sessionId}/gl-candidates`),

  getStatementLines: (sessionId: number) =>
    http.get<BankStatementItem[]>(`/financial/bank-reconciliation/session/${sessionId}/statement-lines`),

  getMatches: (sessionId: number) =>
    http.get<MatchDetailItem[]>(`/financial/bank-reconciliation/session/${sessionId}/matches`),

  // Matching
  autoMatch: (sessionId: number) =>
    http.post<AutoMatchResult>(`/financial/bank-reconciliation/session/${sessionId}/auto-match`),

  manualMatch: (sessionId: number, data: ManualMatchRequest) =>
    http.post<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}/match`, data),

  unmatch: (sessionId: number, data: UnmatchRequest) =>
    http.post<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}/unmatch`, data),

  postAdjustment: (sessionId: number, data: AdjustmentVoucherRequest) =>
    http.post<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}/adjustment`, data),

  // Finalize & Reopen
  finalizeSession: (sessionId: number) =>
    http.post<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}/finalize`),

  reopenSession: (sessionId: number, data: ReopenSessionRequest) =>
    http.post<ReconciliationSummary>(`/financial/bank-reconciliation/session/${sessionId}/reopen`, data),
}
