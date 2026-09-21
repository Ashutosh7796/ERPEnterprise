import { http } from '@core/api/client'

export interface StocktakeSession {
  id: number
  tenantId: number
  sessionNumber: string
  depotId: number
  depotName?: string
  sessionDate: string
  status: 'DRAFT' | 'COUNTING' | 'APPROVED' | 'CANCELLED'
  totalItems: number
  totalVarianceQty: number
  totalVarianceValue: number
  remark?: string
  creator?: number
  creatorName?: string
  createTime?: string
  approver?: number
  approverName?: string
  approveTime?: string
}

export interface StocktakeItem {
  id: number
  tenantId: number
  stocktakeId: number
  materialId: number
  materialName?: string
  barCode?: string
  standard?: string
  model?: string
  unitName?: string
  binId?: number
  binCode?: string
  batchNumber?: string
  bookQty: number
  countedQty: number
  varianceQty: number
  unitPrice: number
  varianceValue: number
  remark?: string
}

export interface StocktakeListParams {
  currentPage?: number
  pageSize?: number
  depotId?: number
  status?: string
  sessionNumber?: string
  startDate?: string
  endDate?: string
}

export const stocktakeApi = {
  createStocktake: (params: { depotId: number; remark?: string; itemIds?: number[] }) => {
    return http.post('/stocktake/create', params)
  },

  recordCount: (stocktakeId: number, items: { id: number; countedQty: number; remark?: string }[]) => {
    return http.post('/stocktake/recordCount', { stocktakeId, items })
  },

  approveStocktake: (stocktakeId: number) => {
    return http.post('/stocktake/approve', { stocktakeId })
  },

  getStocktakeList: (params: StocktakeListParams) => {
    return http.get('/stocktake/list', params)
  },

  getStocktakeDetail: (id: number) => {
    return http.get(`/stocktake/detail/${id}`)
  },
}
