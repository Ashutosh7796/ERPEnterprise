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
  actualUnitCost: number
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
}

export interface WorkOrderListParams {
  currentPage?: number
  pageSize?: number
  materialId?: number
  depotId?: number
  status?: string
  orderNumber?: string
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
  status: string
  remark?: string
  createTime?: string
}

export interface WorkOrderExecutionVo {
  order: WorkOrderDTO
  snapshotItems: WorkOrderItemDTO[]
  issues: WorkOrderIssueDTO[]
  receipts: WorkOrderReceiptDTO[]
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
}
