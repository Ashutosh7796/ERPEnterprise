import { http } from '@core/api/client'

export interface PlanVsActualSummaryDTO {
  totalPlannedQty: number
  totalActualGoodQty: number
  quantityVariance: number
  fulfillmentRatePct: number
  totalPlannedScrapQty: number
  totalActualScrapQty: number
  scrapVariance: number
  scrapRatePct: number
  totalStandardRunMins: number
  totalActualRunMins: number
  runTimeVarianceMins: number
  totalStandardSetupMins: number
  totalActualSetupMins: number
  setupTimeVarianceMins: number
  totalWorkOrdersCount: number
  completedWorkOrdersCount: number
  inProgressWorkOrdersCount: number
  delayedWorkOrdersCount: number
  onTimeDeliveryRatePct: number
  startDate: string
  endDate: string
}

export interface WorkOrderVarianceDTO {
  workOrderId: number
  orderNumber: string
  productionPlanId?: number
  productionPlanNumber?: string
  materialId: number
  materialName: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  depotId?: number
  depotName?: string
  plannedQty: number
  completedQty: number
  quantityVariance: number
  fulfillmentPct: number
  plannedScrapQty: number
  actualScrapQty: number
  scrapVariance: number
  standardSetupMins: number
  actualSetupMins: number
  setupVarianceMins: number
  standardRunMins: number
  actualRunMins: number
  runTimeVarianceMins: number
  plannedStartDate?: string
  plannedDueDate?: string
  actualStartDate?: string
  actualCompletionDate?: string
  delayDays: number
  isDelayed: boolean
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED' | string
  operationCount: number
}

export interface OperationVarianceDTO {
  operationId: number
  workOrderId: number
  orderNumber: string
  operationSeq: number
  operationName: string
  workCenterType: string
  workstationId?: number
  workstationCode?: string
  workstationName?: string
  plannedQty: number
  completedQty: number
  rejectedQty: number
  quantityVariance: number
  standardCycleTimeMins: number
  actualCycleTimeMins: number
  cycleTimeVarianceMins: number
  standardSetupMins: number
  actualSetupMins: number
  setupVarianceMins: number
  plannedTotalMins: number
  actualTotalMins: number
  totalTimeVarianceMins: number
  isBottleneck: boolean
  bottleneckPacingLossMins: number
  status: string
}

export interface ShiftVarianceDTO {
  shiftCode: string
  shiftName: string
  shiftWindow: string
  scheduledMinutes: number
  plannedOutputQty?: number | null
  actualOutputQty: number
  actualGoodQty: number
  actualRejectedQty: number
  rejectionRatePct: number
  actualRunMins: number
  actualSetupMins: number
  logCount: number
}

export interface PlanVsActualDashboardResponse {
  summary: PlanVsActualSummaryDTO
  workOrderVariances: WorkOrderVarianceDTO[]
  operationVariances: OperationVarianceDTO[]
  shiftVariances: ShiftVarianceDTO[]
  bottlenecks: OperationVarianceDTO[]
}

export interface JobCardVarianceDTO {
  jobCardId: number
  jobCardNumber: string
  operationSeq: number
  operationName: string
  workstationCode?: string
  workstationName?: string
  operatorName?: string
  plannedQty: number
  completedQty: number
  rejectedQty: number
  totalActualRunMins: number
  totalActualSetupMins: number
  totalActualDowntimeMins: number
  startTime?: string
  endTime?: string
  status: string
}

export interface MaterialVarianceDTO {
  materialId: number
  materialName: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  standardRequiredQty: number
  actualIssuedQty: number
  actualConsumedQty: number
  actualScrappedQty: number
  usageVariance: number
}

export interface WorkOrderDetailVarianceDTO {
  workOrder: WorkOrderVarianceDTO
  operations: OperationVarianceDTO[]
  jobCards: JobCardVarianceDTO[]
  materials: MaterialVarianceDTO[]
}

export interface PlanVsActualFilterParams {
  startDate?: string
  endDate?: string
  depotId?: number
  workstationId?: number
  shiftCode?: string
  status?: string
  planId?: number
}

export const planVsActualApi = {
  getDashboard: async (params?: PlanVsActualFilterParams): Promise<PlanVsActualDashboardResponse> => {
    const res = await http.get<{ code: number; data: PlanVsActualDashboardResponse }>(
      '/manufacturing/analytics/plan-vs-actual/dashboard',
      { params }
    )
    return res.data
  },

  getWorkOrderDetail: async (workOrderId: number): Promise<WorkOrderDetailVarianceDTO> => {
    const res = await http.get<{ code: number; data: WorkOrderDetailVarianceDTO }>(
      `/manufacturing/analytics/plan-vs-actual/wo/${workOrderId}`
    )
    return res.data
  },

  getOperations: async (params?: {
    startDate?: string
    endDate?: string
    workstationId?: number
  }): Promise<OperationVarianceDTO[]> => {
    const res = await http.get<{ code: number; data: OperationVarianceDTO[] }>(
      '/manufacturing/analytics/plan-vs-actual/operations',
      { params }
    )
    return res.data
  },

  getShifts: async (params?: {
    startDate?: string
    endDate?: string
  }): Promise<ShiftVarianceDTO[]> => {
    const res = await http.get<{ code: number; data: ShiftVarianceDTO[] }>(
      '/manufacturing/analytics/plan-vs-actual/shifts',
      { params }
    )
    return res.data
  },
}
