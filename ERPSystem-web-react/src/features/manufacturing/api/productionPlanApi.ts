import { http } from '@core/api/client'
import { WorkOrderDTO } from './workOrderApi'

export interface ProductionPlanItemDTO {
  id?: number
  planId?: number
  materialId: number
  bomId: number
  bomRevisionCode: string
  salesOrderId?: number
  salesOrderItemId?: number
  demandSourceType: 'SALES_ORDER' | 'FORECAST' | 'MANUAL'
  isSubAssembly: string
  parentMaterialId?: number
  bomLevel: number
  grossDemandQty: number
  availableQty: number
  netPlannedQty: number
  targetDepotId: number
  targetBinId?: number
  workOrderId?: number
  status: string
  materialName?: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  bomCode?: string
  targetDepotName?: string
  targetBinName?: string
  salesOrderNumber?: string
  workOrderNumber?: string
}

export interface ProductionPlanMaterialDTO {
  id?: number
  planId?: number
  materialId: number
  unitId?: number
  grossRequiredQty: number
  currentStockQty: number
  allocatedStockQty: number
  availableStockQty: number
  openPurchaseQty: number
  openProductionQty: number
  safetyStockQty: number
  netShortageQty: number
  actionType: 'NONE' | 'RECOMMEND_PURCHASE' | 'RECOMMEND_TRANSFER' | 'PURCHASE_CREATED' | 'TRANSFER_CREATED'
  sourceDepotId?: number
  procurementReferenceId?: number
  status: string
  materialName?: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  sourceDepotName?: string
  procurementVoucherNo?: string
}

export interface ProductionPlanDTO {
  id?: number
  planNumber: string
  planTitle: string
  postingDate: string
  plannedStartDate: string
  plannedEndDate: string
  demandSource: 'SALES_ORDER' | 'FORECAST' | 'MANUAL'
  status: 'DRAFT' | 'CALCULATED' | 'REVIEW' | 'APPROVED' | 'RELEASED' | 'COMPLETED' | 'CANCELLED'
  totalItems: number
  remark?: string
  items?: ProductionPlanItemDTO[]
  materials?: ProductionPlanMaterialDTO[]
}

export interface PlanItemRequest {
  materialId: number
  bomId?: number
  salesOrderId?: number
  salesOrderItemId?: number
  demandSourceType?: string
  plannedQty: number
  targetDepotId: number
  targetBinId?: number
}

export interface PlanCreateRequest {
  planNumber?: string
  planTitle: string
  postingDate?: string
  plannedStartDate?: string
  plannedEndDate?: string
  demandSource?: string
  remark?: string
  items: PlanItemRequest[]
}

export interface PlanUpdateRequest {
  id: number
  planTitle?: string
  plannedStartDate?: string
  plannedEndDate?: string
  remark?: string
  items?: PlanItemRequest[]
}

export interface MrpCalculationResultDTO {
  planId: number
  planNumber: string
  planStatus: string
  items: ProductionPlanItemDTO[]
  materials: ProductionPlanMaterialDTO[]
  totalShortageCount: number
}

export interface ProcurementActionRequest {
  planId: number
  materialIds?: number[]
  actionType: 'PURCHASE' | 'TRANSFER'
  sourceDepotId?: number
  targetDepotId?: number
  remark?: string
}

export interface ProductionPlanListParams {
  currentPage?: number
  pageSize?: number
  planNumber?: string
  status?: string
  demandSource?: string
  startDate?: string
  endDate?: string
}

export const productionPlanApi = {
  getPlanList: (params?: ProductionPlanListParams) => {
    return http.get<{ rows: ProductionPlanDTO[]; total: number }>('/productionPlan/list', { params })
  },

  getPlanById: (id: number) => {
    return http.get<ProductionPlanDTO>(`/productionPlan/get/${id}`)
  },

  createPlan: (data: PlanCreateRequest) => {
    return http.post<ProductionPlanDTO>('/productionPlan/create', data)
  },

  updatePlan: (data: PlanUpdateRequest) => {
    return http.put<ProductionPlanDTO>('/productionPlan/update', data)
  },

  calculateMrp: (id: number) => {
    return http.post<MrpCalculationResultDTO>(`/productionPlan/calculateMrp/${id}`)
  },

  submitPlan: (id: number) => {
    return http.post<ProductionPlanDTO>(`/productionPlan/submit/${id}`)
  },

  approvePlan: (id: number) => {
    return http.post<ProductionPlanDTO>(`/productionPlan/approve/${id}`)
  },

  releasePlan: (id: number) => {
    return http.post<WorkOrderDTO[]>(`/productionPlan/release/${id}`)
  },

  createPurchaseRequisition: (data: ProcurementActionRequest) => {
    return http.post<any>('/productionPlan/createPurchaseRequisition', data)
  },

  createStockTransfer: (data: ProcurementActionRequest) => {
    return http.post<any>('/productionPlan/createStockTransfer', data)
  },

  cancelPlan: (id: number, reason?: string) => {
    return http.post<ProductionPlanDTO>(`/productionPlan/cancel/${id}`, null, { params: { reason } })
  },
}
