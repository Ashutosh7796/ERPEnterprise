import { http } from '@core/api/client'

export interface StockLedgerRecord {
  id: number
  tenantId: number
  materialId: number
  materialName?: string
  barCode?: string
  standard?: string
  model?: string
  unitName?: string
  depotId?: number
  depotName?: string
  binId?: number
  binCode?: string
  batchNumber?: string
  voucherType: string
  voucherId?: number
  voucherNo: string
  postingTime: string
  actualQty: number
  qtyAfterTransaction: number
  incomingRate?: number
  valuationRate?: number
  stockValue?: number
  stockValueDifference?: number
  remark?: string
  createTime?: string
}

export interface StockLedgerQueryParams {
  currentPage?: number
  pageSize?: number
  materialId?: number
  depotId?: number
  binId?: number
  voucherType?: string
  voucherNo?: string
  materialParam?: string
  startDate?: string
  endDate?: string
}

export interface StockLedgerListResponse {
  rows: StockLedgerRecord[]
  total: number
}

export const getStockLedgerList = async (
  params?: StockLedgerQueryParams
): Promise<StockLedgerListResponse> => {
  const res = await http.get('/stockLedger/list', params)
  return res?.data || { rows: [], total: 0 }
}
