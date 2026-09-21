import { http } from '@core/api/client'

export interface JobWorkItem {
  id?: number
  tenantId?: number
  jobWorkOrderId?: number
  materialId: number
  dispatchedQty: number
  receivedQty?: number
  consumedQty?: number
  scrappedQty?: number
  pendingQty?: number
  unitCost?: number
  totalCost?: number
  remark?: string
  materialName?: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
}

export interface JobWorkOrder {
  id: number
  tenantId: number
  orderNumber: string
  workOrderId?: number
  supplierId: number
  goodsType: 'INPUT' | 'SEMI_FINISHED' | 'CAPITAL_GOODS'
  orderDate: string
  expectedReturnDate: string
  statutoryDueDate: string
  depotId: number
  jwBinId?: number
  status: 'DRAFT' | 'APPROVED' | 'DISPATCHED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED'
  totalDispatchedQty: number
  totalReceivedQty: number
  totalPendingQty: number
  totalCost: number
  remark?: string
  supplierName?: string
  supplierGstin?: string
  depotName?: string
  jwBinName?: string
  workOrderNumber?: string
  createTime?: string
}

export interface JobWorkChallan {
  id: number
  tenantId: number
  jobWorkOrderId: number
  challanNumber: string
  challanDate: string
  challanType: string
  consignorName: string
  consignorGstin: string
  consigneeId: number
  consigneeName: string
  consigneeGstin: string
  statutoryDueDate: string
  goodsType: string
  transportMode: string
  vehicleNumber?: string
  transporterName?: string
  ewayBillNumber?: string
  ewayBillPayload?: string
  totalTaxableAmount: number
  totalCgstAmount: number
  totalSgstAmount: number
  totalChallanAmount: number
  reasonForTransport: string
  status: string
}

export interface JobWorkReceipt {
  id: number
  tenantId: number
  jobWorkOrderId: number
  receiptNumber: string
  receiptDate: string
  supplierChallanNumber?: string
  processedMaterialId: number
  receivedQty: number
  consumedRawMaterialId: number
  consumedQty: number
  scrappedQty?: number
  shortageQty?: number
  targetDepotId: number
  targetBinId?: number
  jobWorkCharges: number
  sacCode: string
  absorbedUnitCost: number
  totalAbsorbedCost: number
  remark?: string
  status: string
  processedMaterialName?: string
  consumedRawMaterialName?: string
  targetDepotName?: string
  targetBinName?: string
  createTime?: string
}

export interface JobWorkDetailVo {
  order: JobWorkOrder
  items: JobWorkItem[]
  challans: JobWorkChallan[]
  receipts: JobWorkReceipt[]
}

export interface AgingItem {
  jobWorkOrderId: number
  orderNumber: string
  challanNumber: string
  dispatchDate: string
  statutoryDueDate: string
  workOrderId?: number
  workOrderNumber?: string
  supplierId: number
  supplierName: string
  supplierGstin: string
  materialId: number
  materialName: string
  materialModel?: string
  materialUnit?: string
  dispatchedQty: number
  receivedQty: number
  consumedQty: number
  scrappedQty: number
  pendingQty: number
  unitCost: number
  pendingValue: number
  daysElapsed: number
  daysRemaining: number
  complianceStatus: 'COMPLIANT' | 'APPROACHING_DUE' | 'OVERDUE' | 'COMPLETED'
  agingBucket: '0-90 DAYS' | '91-180 DAYS' | '181-270 DAYS' | '271-365 DAYS' | '> 365 DAYS'
}

export interface Section143AgingVo {
  totalOpenOrders: number
  totalPendingQuantity: number
  totalPendingValue: number
  totalCompliantCount: number
  totalApproachingDueCount: number
  totalOverdueCount: number
  bucket0to90Value: number
  bucket91to180Value: number
  bucket181to270Value: number
  bucket271to365Value: number
  bucketOver365Value: number
  rows: AgingItem[]
  total: number
}

export interface JobWorkOrderRequest {
  id?: number
  orderNumber?: string
  workOrderId?: number
  supplierId: number
  goodsType: 'INPUT' | 'SEMI_FINISHED' | 'CAPITAL_GOODS'
  orderDate?: string
  expectedReturnDate?: string
  depotId: number
  jwBinId?: number
  remark?: string
  items: Array<{
    materialId: number
    dispatchedQty: number
    remark?: string
  }>
}

export interface JobWorkDispatchDto {
  jobWorkOrderId: number
  challanNumber?: string
  challanDate?: string
  sourceDepotId?: number
  sourceBinId?: number
  transportMode?: string
  vehicleNumber?: string
  transporterId?: string
  transporterName?: string
  remark?: string
}

export interface JobWorkReceiptRequest {
  jobWorkOrderId: number
  receiptNumber?: string
  receiptDate?: string
  supplierChallanNumber?: string
  processedMaterialId: number
  receivedQty: number
  consumedRawMaterialId: number
  consumedQty: number
  scrappedQty?: number
  shortageQty?: number
  targetDepotId?: number
  targetBinId?: number
  jobWorkCharges?: number
  sacCode?: string
  remark?: string
}

export const jobWorkApi = {
  getOrderList: (params: {
    supplierId?: number
    workOrderId?: number
    status?: string
    goodsType?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: JobWorkOrder[]; total: number }>('/jobWork/list', { params }),

  getOrderDetail: (id: number) => http.get<JobWorkDetailVo>(`/jobWork/get/${id}`),

  createOrder: (data: JobWorkOrderRequest) => http.post<JobWorkOrder>('/jobWork/create', data),

  dispatchMaterial: (data: JobWorkDispatchDto) => http.post<JobWorkChallan>('/jobWork/dispatch', data),

  receiveProcessedGoods: (data: JobWorkReceiptRequest) => http.post<JobWorkReceipt>('/jobWork/receive', data),

  getSection143Aging: (params?: {
    supplierId?: number
    workOrderId?: number
    statusFilter?: string
  }) => http.get<Section143AgingVo>('/jobWork/section143Aging', { params }),

  recordStatutoryExtension: (data: {
    jobWorkOrderId: number
    extendedDueDate: string
    extensionOrderRef: string
    extensionReason?: string
  }) => http.post<JobWorkOrder>('/jobWork/statutoryExtension', data),

  cancelOrder: (id: number) => http.post<string>(`/jobWork/cancel/${id}`),
}
