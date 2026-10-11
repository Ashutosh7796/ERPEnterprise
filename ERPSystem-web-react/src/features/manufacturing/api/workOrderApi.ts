import { http } from '@core/api/client'

export interface WorkOrderItemDTO {
  id?: number
  workOrderId?: number
  componentMaterialId: number
  requiredQty: number
  issuedQty: number
  consumedQty: number
  scrappedQty: number
  unitId?: number
  componentName?: string
  componentStandard?: string
  componentModel?: string
  componentUnit?: string
  barCode?: string
}

export interface WorkOrderDTO {
  id?: number
  orderNumber: string
  bomId: number
  materialId: number
  depotId: number
  wipBinId: number
  plannedQty: number
  completedQty: number
  scrappedQty: number
  startDate: string
  dueDate: string
  salesOrderId?: number
  productionPlanId?: number
  productionPlanNumber?: string
  parentWorkOrderId?: number
  parentOrderNumber?: string
  bomRevisionCode?: string
  targetDepotId?: number
  targetDepotName?: string
  targetBinId?: number
  targetBinName?: string
  canRelease?: string
  actualUnitCost: number
  actualMaterialCost?: number
  actualLaborCost?: number
  actualOverheadCost?: number
  actualTotalCost?: number
  isRework?: boolean
  financialStatus?: string
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'
  remark?: string
  materialName?: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  barCode?: string
  bomCode?: string
  bomRevision?: string
  depotName?: string
  wipBinName?: string
  wipBinCode?: string
  items?: WorkOrderItemDTO[]
  operations?: WorkOrderOperationDTO[]
}

export interface WorkOrderOperationDTO {
  id?: number
  workOrderId?: number
  operationSeq: number
  operationName: string
  workCenterType: string
  standardCycleTimeMins: number
  setupTimeMins: number
  totalPlannedTimeMins: number
  targetDepotId?: number
  targetDepotName?: string
  targetBinId?: number
  targetBinName?: string
  wipDepotId?: number
  wipDepotName?: string
  wipBinId?: number
  wipBinName?: string
  isOutsource?: number
  supplierId?: number
  supplierName?: string
  completedQty?: number
  rejectedQty?: number
  activeJobWorkOrderId?: number
  activeJobWorkOrderNumber?: string
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  remark?: string
}

export interface WorkOrderListParams {
  currentPage?: number
  pageSize?: number
  materialId?: number
  depotId?: number
  status?: string
  orderNumber?: string
  isRework?: boolean
}

export interface MaterialIssueItemRequest {
  workOrderItemId?: number
  componentMaterialId: number
  sourceDepotId?: number
  sourceBinId?: number
  issueQty: number
  remark?: string
}

export interface MaterialIssueRequest {
  workOrderId: number
  issueNumber?: string
  issueDate?: string
  remark?: string
  items: MaterialIssueItemRequest[]
}

export interface WorkOrderIssueItemDTO {
  id?: number
  issueId?: number
  workOrderId?: number
  workOrderItemId?: number
  componentMaterialId: number
  componentMaterialName?: string
  componentMaterialModel?: string
  sourceDepotId: number
  sourceDepotName?: string
  sourceBinId?: number
  sourceBinName?: string
  wipBinId: number
  wipBinName?: string
  issueQty: number
  unitCost: number
  totalCost: number
  remark?: string
  createTime?: string
}

export interface WorkOrderIssueDTO {
  id?: number
  workOrderId: number
  issueNumber: string
  issueDate: string
  totalLines: number
  totalCost: number
  status: string
  remark?: string
  createTime?: string
  items?: WorkOrderIssueItemDTO[]
}

export interface ProductionReceiptRequest {
  workOrderId: number
  receiptNumber?: string
  receiptDate?: string
  receivedQty: number
  scrappedQty?: number
  targetDepotId?: number
  targetBinId?: number
  remark?: string
}

export interface WorkOrderReceiptDTO {
  id?: number
  workOrderId: number
  receiptNumber: string
  receiptDate: string
  receivedQty: number
  scrappedQty: number
  targetDepotId: number
  targetDepotName?: string
  targetBinId?: number
  targetBinName?: string
  unitCost: number
  totalCost: number
  materialCost?: number
  laborCost?: number
  overheadCost?: number
  status: string
  financialStatus?: string
  glVoucherNo?: string
  remark?: string
  createTime?: string
}

export interface WorkOrderExecutionVo {
  order: WorkOrderDTO
  snapshotItems: WorkOrderItemDTO[]
  issues: WorkOrderIssueDTO[]
  receipts: WorkOrderReceiptDTO[]
}

// =========================================================================
// WP5 Slice 3 Phase H: Discrete Manufacturing Costing, Rework & Reconciliation
// =========================================================================

export interface TimeLogAllocationItem {
  timeLogId: number
  allocatedMinutes: number
  laborHourlyRateOverride?: number
  overheadHourlyRateOverride?: number
}

export interface ReceiptCostCalculationRequest {
  receiptId: number
  timeAllocations?: TimeLogAllocationItem[]
  materialCostOverride?: number
  expectedScrapPctOverride?: number
  isRework?: boolean
  reworkType?: 'NORMAL' | 'ABNORMAL'
  remark?: string
}

export interface WorkOrderCostAbsorptionDTO {
  id?: number
  tenantId?: number
  workOrderId?: number
  receiptId?: number
  timeLogId?: number
  allocatedMinutes?: number
  hourlyRateSnapshot?: number
  rateType?: 'LABOR' | 'MACHINE'
  absorbedCost?: number
  allocationStatus?: string
  deleteFlag?: string
}

export interface ReceiptCostBreakdownDTO {
  receiptId: number
  receiptNumber: string
  workOrderId: number
  orderNumber: string
  receivedQty: number
  scrappedQty: number
  materialCost: number
  laborCost: number
  overheadCost: number
  totalIncurredCost: number
  expectedScrapPct: number
  normalScrapAllowanceQty: number
  abnormalScrapQty: number
  abnormalScrapLoss: number
  fgCapitalization: number
  fgUnitCost: number
  financialStatus: string
  isRework?: boolean
  reworkType?: string
  allocations: WorkOrderCostAbsorptionDTO[]
}

export interface WorkOrderCostSummaryDTO {
  workOrderId: number
  orderNumber: string
  orderStatus: string
  financialStatus: string
  plannedQty: number
  completedQty: number
  scrappedQty: number
  actualMaterialCost: number
  actualLaborCost: number
  actualOverheadCost: number
  actualTotalCost: number
  actualUnitCost: number
  receiptCount: number
}

export interface ReceiptFinancialPostingRequest {
  receiptId: number
  postingDate?: string
  remark?: string
}

export interface JournalLineSummaryDTO {
  lineNo: number
  accountCode: string
  accountName: string
  entryType: 'DEBIT' | 'CREDIT'
  amount: number
  narration: string
}

export interface ReceiptFinancialPostingResultDTO {
  receiptId: number
  receiptNumber: string
  workOrderId: number
  glVoucherNo: string
  voucherType: string
  financialStatus: string
  postingDate: string
  totalDebit: number
  totalCredit: number
  linesPosted: number
  journalLines: JournalLineSummaryDTO[]
}

export interface ReworkOrderCreationRequest {
  ncrDispositionId: number
  stagingBinId?: number
  remark?: string
}

export interface ReworkCostAbsorptionRequest {
  reworkWorkOrderId: number
  allocations: TimeLogAllocationItem[]
}

export interface ReworkSettlementRequest {
  reworkWorkOrderId: number
  settlementType: 'NORMAL' | 'ABNORMAL' | 'SCRAP'
  postingDate?: string
  remark?: string
}

export interface ReworkSettlementResultDTO {
  reworkWorkOrderId: number
  reworkOrderNumber: string
  parentWorkOrderId?: number
  parentOrderNumber?: string
  settlementType: 'NORMAL' | 'ABNORMAL' | 'SCRAP'
  materialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  voucherType: string
  voucherNo: string
  glVoucherId?: number
  journalLines: string[]
  message: string
}

export interface ReworkCostSummaryDTO {
  reworkWorkOrderId: number
  orderNumber: string
  parentWorkOrderId?: number
  reworkNcrId?: number
  plannedQty: number
  status: string
  financialStatus: string
  actualMaterialCost: number
  actualLaborCost: number
  actualOverheadCost: number
  actualTotalCost: number
  reinspectionDecision?: string
  glVoucherNo?: string
}

export interface WipReconciliationExceptionDTO {
  exceptionType: string
  workOrderId?: number
  orderNumber?: string
  sourceDocumentType?: string
  sourceDocumentId?: number
  sourceDocumentNumber?: string
  expectedAmount: number
  actualAmount: number
  varianceAmount: number
  description: string
}

export interface WorkOrderWipSummaryDTO {
  workOrderId: number
  orderNumber: string
  orderStatus: string
  financialStatus: string
  isRework?: boolean
  parentWorkOrderId?: number
  plannedQty: number
  completedQty: number
  materialIssued: number
  materialRelieved: number
  netWipBalance: number
  pendingReceiptCount: number
  pendingReceiptAmount: number
  issueCount: number
  receiptCount: number
}

export interface WipReconciliationResultDTO {
  tenantId: number
  periodName?: string
  asOfDate?: string
  accountCode: string
  accountName: string
  glBalance: number
  maintainedSubledgerBalance: number
  granularReconstructedBalance: number
  glVsSubledgerDifference: number
  granularVsSubledgerDifference: number
  reconciliationStatus: 'BALANCED' | 'WARNING_PENDING_POSTING' | 'GRANULARITY_DISCREPANCY' | 'GL_SUBLEDGER_DISCREPANCY'
  pendingPostingCount: number
  pendingPostingAmount: number
  exceptionCount: number
  exceptionDetails: WipReconciliationExceptionDTO[]
  orderSummaries: WorkOrderWipSummaryDTO[]
  openingWipBalance?: number
  periodMaterialIssues?: number
  periodMaterialRelieved?: number
  periodReworkRelief?: number
  closingWipBalance?: number
}

export interface IssueDetailDTO {
  issueId: number
  issueNumber: string
  issueDate: string
  totalCost: number
  status: string
}

export interface ReceiptDetailDTO {
  receiptId: number
  receiptNumber: string
  receiptDate: string
  receivedQty: number
  scrappedQty: number
  materialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  financialStatus: string
  glVoucherNo?: string
}

export interface AbsorptionDetailDTO {
  absorptionId: number
  receiptId: number
  costType: string
  allocatedMinutes: number
  rateSnapshot: number
  absorbedCost: number
  allocationStatus: string
}

export interface GlEntryDetailDTO {
  glEntryId: number
  voucherType: string
  voucherNo: string
  postingDate: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  narration: string
}

export interface WipReconciliationDrilldownDTO {
  workOrderId: number
  orderNumber: string
  orderStatus: string
  financialStatus: string
  isRework?: boolean
  parentWorkOrderId?: number
  materialIssuedTotal: number
  materialRelievedTotal: number
  netWipBalance: number
  issues: IssueDetailDTO[]
  receipts: ReceiptDetailDTO[]
  absorptions: AbsorptionDetailDTO[]
  glEntries: GlEntryDetailDTO[]
}

export const workOrderApi = {
  getWorkOrderList: (params: WorkOrderListParams) => {
    return http.get<{ rows: WorkOrderDTO[]; total: number }>('/workOrder/list', { params })
  },

  getWorkOrderById: (id: number) => {
    return http.get<WorkOrderDTO>(`/workOrder/get/${id}`)
  },

  createWorkOrder: (data: Partial<WorkOrderDTO>) => {
    return http.post<WorkOrderDTO>('/workOrder/create', data)
  },

  updateWorkOrder: (data: Partial<WorkOrderDTO>) => {
    return http.put<WorkOrderDTO>('/workOrder/update', data)
  },

  confirmWorkOrder: (id: number) => {
    return http.post<WorkOrderDTO>(`/workOrder/confirm/${id}`)
  },

  cancelWorkOrder: (id: number) => {
    return http.post<WorkOrderDTO>(`/workOrder/cancel/${id}`)
  },

  deleteWorkOrder: (id: number) => {
    return http.delete('/workOrder/delete', { params: { id } })
  },

  issueMaterial: (data: MaterialIssueRequest) => {
    return http.post<WorkOrderIssueDTO>('/workOrder/issueMaterial', data)
  },

  receiveProduction: (data: ProductionReceiptRequest) => {
    return http.post<WorkOrderReceiptDTO>('/workOrder/receiveProduction', data)
  },

  getExecutionHistory: (id: number) => {
    return http.get<WorkOrderExecutionVo>(`/workOrder/executionHistory/${id}`)
  },

  getOperations: (id: number) => {
    return http.get<WorkOrderOperationDTO[]>(`/workOrder/operations/${id}`)
  },

  listByPlan: (planId: number) => {
    return http.get<WorkOrderDTO[]>(`/workOrder/listByPlan?planId=${planId}`)
  },

  // --- Phase H Discrete Costing Endpoints ---
  calculateReceiptCost: (data: ReceiptCostCalculationRequest) => {
    return http.post<ReceiptCostBreakdownDTO>('/workOrder/costing/calculate-receipt-cost', data)
  },

  reverseCostAllocation: (receiptId: number) => {
    return http.post<string>('/workOrder/costing/reverse-allocation', null, { params: { receiptId } })
  },

  getReceiptBreakdown: (receiptId: number) => {
    return http.get<ReceiptCostBreakdownDTO>(`/workOrder/costing/receipt-breakdown/${receiptId}`)
  },

  getOrderCostSummary: (workOrderId: number) => {
    return http.get<WorkOrderCostSummaryDTO>(`/workOrder/costing/order-summary/${workOrderId}`)
  },

  postReceiptGl: (data: ReceiptFinancialPostingRequest) => {
    return http.post<ReceiptFinancialPostingResultDTO>('/workOrder/costing/post-receipt-gl', data)
  },

  reverseReceiptGl: (receiptId: number, reason?: string) => {
    return http.post<string>('/workOrder/costing/reverse-receipt-gl', null, { params: { receiptId, reason } })
  },

  // --- Phase H Dedicated Rework Endpoints ---
  createReworkWorkOrder: (data: ReworkOrderCreationRequest) => {
    return http.post<WorkOrderDTO>('/workOrder/rework/create', data)
  },

  issueReworkMaterial: (rwoId: number, materialId: number, issueQty: number, sourceDepotId?: number, sourceBinId?: number) => {
    return http.post<number>('/workOrder/rework/issue-material', null, {
      params: { rwoId, materialId, issueQty, sourceDepotId, sourceBinId },
    })
  },

  absorbReworkCost: (data: ReworkCostAbsorptionRequest) => {
    return http.post<number>('/workOrder/rework/absorb-cost', data)
  },

  settleRework: (data: ReworkSettlementRequest) => {
    return http.post<ReworkSettlementResultDTO>('/workOrder/rework/settle', data)
  },

  getReworkCostSummary: (rwoId: number) => {
    return http.get<ReworkCostSummaryDTO>(`/workOrder/rework/summary/${rwoId}`)
  },

  // --- Phase H WIP Reconciliation Endpoints ---
  reconcileWip: (asOfDate?: string) => {
    return http.get<WipReconciliationResultDTO>('/workOrder/wip/reconcile', {
      params: asOfDate ? { asOfDate } : {},
    })
  },

  reconcileWipPeriod: (periodName: string) => {
    return http.get<WipReconciliationResultDTO>('/workOrder/wip/reconcile-period', {
      params: { periodName },
    })
  },

  getWipDrilldown: (workOrderId: number, asOfDate?: string) => {
    return http.get<WipReconciliationDrilldownDTO>(`/workOrder/wip/drilldown/${workOrderId}`, {
      params: asOfDate ? { asOfDate } : {},
    })
  },
}
