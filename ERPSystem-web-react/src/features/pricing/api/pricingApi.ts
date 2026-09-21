import { http } from '@core/api/client'

export interface PriceResolutionRequest {
  customerId?: number
  materialId?: number
  materialExtendId?: number
  quantity: number
  transactionDate?: string
  currencyCode?: string
}

export interface PriceResolutionResult {
  materialId: number
  materialExtendId?: number
  baseUnitPrice: number
  discountRate: number
  discountAmount: number
  finalUnitPrice: number
  currencyCode: string
  matchedRuleType: string
  priceListId?: number
  priceListName?: string
  priceRuleDescription?: string
}

export interface PriceListItem {
  id?: number
  materialId: number
  materialName?: string
  materialStandard?: string
  minQuantity: number
  maxQuantity: number
  baseUnitPrice: number
  discountRate: number
  remark?: string
}

export interface PriceList {
  id?: number
  name: string
  code: string
  currencyCode: string
  listType: string
  startDate?: string
  endDate?: string
  status: string
  remark?: string
  itemCount?: number
  customerCount?: number
  items?: PriceListItem[]
  assignedCustomerIds?: number[]
}

export interface ExchangeRate {
  id?: number
  fromCurrency: string
  toCurrency: string
  exchangeRate: number
  effectiveDate: string
  rateType: string
  remark?: string
}

export const pricingApi = {
  resolvePrice: (params: PriceResolutionRequest) =>
    http.post<PriceResolutionResult>('/pricing/resolve', params),

  listPriceLists: () =>
    http.get<PriceList[]>('/pricing/price-lists'),

  createPriceList: (data: PriceList) =>
    http.post('/pricing/price-lists', data),

  listExchangeRates: () =>
    http.get<ExchangeRate[]>('/pricing/exchange-rates'),

  setExchangeRate: (data: ExchangeRate) =>
    http.post('/pricing/exchange-rates', data),

  executeForexRevaluation: (period: string) =>
    http.post('/pricing/forex/revaluation?period=' + period),
}
