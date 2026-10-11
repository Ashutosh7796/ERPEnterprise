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

export interface ForexRevaluationItem {
  documentType: string
  documentId: number
  documentNumber: string
  partyId?: number
  partyName?: string
  currencyCode: string
  openForeignAmount: number
  originalExchangeRate: number
  originalBaseAmount: number
  currentExchangeRate: number
  currentBaseAmount: number
  forexGainLoss: number
  glAccountCode: string
}

export interface ForexRevaluationResult {
  revaluationPeriod: string
  revaluationDate: string
  organizationId?: number
  revaluationType: string
  voucherNumber?: string
  journalEntryId?: number
  runNumber?: string
  status: string
  totalForexGain: number
  totalForexLoss: number
  netForexAdjustment: number
  reversalVoucherId?: number
  reversalVoucherNumber?: string
  reversalDate?: string
  items?: ForexRevaluationItem[]
}

export interface ForexRevaluationRunRecord {
  id: number
  tenantId: number
  organizationId: number
  runNumber: string
  revaluationPeriod: string
  revaluationDate: string
  closingRateDate: string
  totalOpenForeignAr: number
  totalOpenForeignAp: number
  netForexGainLoss: number
  journalVoucherId: number
  status: string
  reversalVoucherId?: number
  reversalDate?: string
  executedBy?: number
  createTime?: string
}

export interface CurrencyItem {
  id?: number
  currency_code: string
  currency_name: string
  currency_symbol?: string
  decimal_places?: number
  is_base_currency: number
  status: string
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

  listCurrencies: () =>
    http.get<CurrencyItem[]>('/pricing/currencies'),

  registerCurrency: (data: {
    currencyCode: string
    currencyName: string
    currencySymbol?: string
    decimalPlaces?: number
    isBaseCurrency?: boolean
  }) => http.post('/pricing/currencies', data),

  previewForexRevaluation: (params: { organizationId?: number; period: string; closingDate?: string }) => {
    const query = new URLSearchParams()
    if (params.organizationId) query.append('organizationId', String(params.organizationId))
    if (params.period) query.append('period', params.period)
    if (params.closingDate) query.append('closingDate', params.closingDate)
    return http.post<ForexRevaluationResult>(`/pricing/forex/revaluation/preview?${query.toString()}`)
  },

  executeForexRevaluation: (params: { organizationId?: number; period: string; closingDate?: string } | string) => {
    if (typeof params === 'string') {
      return http.post<ForexRevaluationResult>('/pricing/forex/revaluation/execute?period=' + params)
    }
    const query = new URLSearchParams()
    if (params.organizationId) query.append('organizationId', String(params.organizationId))
    if (params.period) query.append('period', params.period)
    if (params.closingDate) query.append('closingDate', params.closingDate)
    return http.post<ForexRevaluationResult>(`/pricing/forex/revaluation/execute?${query.toString()}`)
  },

  executeDay1Reversal: (params: { organizationId?: number; period: string }) => {
    const query = new URLSearchParams()
    if (params.organizationId) query.append('organizationId', String(params.organizationId))
    if (params.period) query.append('period', params.period)
    return http.post<ForexRevaluationResult>(`/pricing/forex/revaluation/reverse?${query.toString()}`)
  },

  listForexRevaluationRuns: (organizationId?: number) => {
    const query = organizationId ? `?organizationId=${organizationId}` : ''
    return http.get<ForexRevaluationRunRecord[]>(`/pricing/forex/revaluation/runs${query}`)
  },
}
