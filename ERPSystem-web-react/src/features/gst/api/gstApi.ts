import { request } from '@core/api/client'
import type {
  StateCode,
  CompanyGstin,
  HsnSac,
  TaxRate,
  FySequence,
  GSTTaxCalculationRequest,
  GSTTaxCalculationResult,
} from '../types'

export const gstApi = {
  // State Code APIs
  getAllStateCodes: () =>
    request<{ code: number; data: { list: StateCode[] } }>('/stateCode/all'),

  getStateList: (params?: { search?: string }) =>
    request<{ code: number; data: { rows: StateCode[]; total: number } }>('/stateCode/list', { params }),

  getStateByCode: (stateCode: string) =>
    request<{ code: number; data: { info: StateCode } }>('/stateCode/info', { params: { stateCode } }),

  // Company GSTIN APIs
  getCompanyGstinList: (params?: { search?: string; pageSize?: number; currentPage?: number }) =>
    request<{ code: number; data: { rows: CompanyGstin[]; total: number } }>('/companyGstin/list', { params }),

  getAllCompanyGstins: () =>
    request<{ code: number; data: { list: CompanyGstin[] } }>('/companyGstin/all'),

  getDefaultCompanyGstin: () =>
    request<{ code: number; data: { info: CompanyGstin } }>('/companyGstin/default'),

  addCompanyGstin: (data: Partial<CompanyGstin>) =>
    request<{ code: number; data: any }>('/companyGstin/add', { method: 'POST', body: data }),

  updateCompanyGstin: (data: Partial<CompanyGstin>) =>
    request<{ code: number; data: any }>('/companyGstin/update', { method: 'PUT', body: data }),

  deleteCompanyGstin: (id: number) =>
    request<{ code: number; data: any }>('/companyGstin/delete', { method: 'DELETE', params: { id } }),

  setDefaultCompanyGstin: (id: number) =>
    request<{ code: number; data: any }>('/companyGstin/setDefault', { method: 'POST', params: { id } }),

  // HSN / SAC Code APIs
  getHsnSacList: (params?: { search?: string; pageSize?: number; currentPage?: number }) =>
    request<{ code: number; data: { rows: HsnSac[]; total: number } }>('/hsnSac/list', { params }),

  searchHsnSac: (keyword: string, limit = 20) =>
    request<{ code: number; data: { list: HsnSac[] } }>('/hsnSac/search', { params: { keyword, limit } }),

  getHsnSacByCode: (code: string) =>
    request<{ code: number; data: { info: HsnSac } }>('/hsnSac/byCode', { params: { code } }),

  addHsnSac: (data: Partial<HsnSac>) =>
    request<{ code: number; data: any }>('/hsnSac/add', { method: 'POST', body: data }),

  updateHsnSac: (data: Partial<HsnSac>) =>
    request<{ code: number; data: any }>('/hsnSac/update', { method: 'PUT', body: data }),

  deleteHsnSac: (id: number) =>
    request<{ code: number; data: any }>('/hsnSac/delete', { method: 'DELETE', params: { id } }),

  // Tax Rate Slabs APIs
  getAllTaxRates: () =>
    request<{ code: number; data: { list: TaxRate[] } }>('/taxRate/all'),

  getTaxRateList: (params?: { search?: string; pageSize?: number; currentPage?: number }) =>
    request<{ code: number; data: { rows: TaxRate[]; total: number } }>('/taxRate/list', { params }),

  addTaxRate: (data: Partial<TaxRate>) =>
    request<{ code: number; data: any }>('/taxRate/add', { method: 'POST', body: data }),

  updateTaxRate: (data: Partial<TaxRate>) =>
    request<{ code: number; data: any }>('/taxRate/update', { method: 'PUT', body: data }),

  deleteTaxRate: (id: number) =>
    request<{ code: number; data: any }>('/taxRate/delete', { method: 'DELETE', params: { id } }),

  // Calculation & Validation APIs
  calculateTax: (data: GSTTaxCalculationRequest) =>
    request<{ code: number; data: { result: GSTTaxCalculationResult } }>('/gst/calculateTax', {
      method: 'POST',
      body: data,
    }),

  validateGstin: (gstin: string) =>
    request<{
      code: number
      data: {
        valid: boolean
        gstin: string
        stateCode?: string
        stateName?: string
        pan?: string
        entityType?: string
        message?: string
      }
    }>('/gst/validateGstin', { params: { gstin } }),

  getGstMeta: () =>
    request<{
      code: number
      data: {
        defaultGstin: CompanyGstin
        taxRates: TaxRate[]
        stateCodes: StateCode[]
        financialYear: string
        financialYearShort: string
      }
    }>('/gst/meta'),

  // Financial Year & Sequence APIs
  getCurrentFinancialYear: () =>
    request<{ code: number; data: { financialYear: string; financialYearShort: string } }>('/financialYear/current'),

  getAllFinancialYears: () =>
    request<{ code: number; data: { list: import('../types').FinancialYear[] } }>('/financialYear/all'),

  getNextDocNumber: (docType: string) =>
    request<{ code: number; data: { docNumber: string; docType: string } }>('/financialYear/nextDocNumber', {
      params: { docType },
    }),

  getSequences: (financialYear?: string) =>
    request<{ code: number; data: { list: FySequence[] } }>('/financialYear/sequences', {
      params: { financialYear },
    }),

  configureSequence: (data: Partial<FySequence>) =>
    request<{ code: number; data: any }>('/financialYear/configureSequence', {
      method: 'POST',
      body: data,
    }),

  // Enterprise Document Numbering & Audit APIs
  getSeriesList: (params?: { financialYearId?: number; documentType?: string }) =>
    request<{ code: number; data: { list: import('../types').DocumentNumberSeries[] } }>('/docNumber/seriesList', { params }),

  configureSeriesConfig: (data: Partial<import('../types').DocumentNumberSeries>) =>
    request<{ code: number; data: any }>('/docNumber/configureSeries', { method: 'POST', body: data }),

  generateDocumentNumber: (params: {
    companyGstinId?: number
    branchId?: number
    transactionDate?: string
    docType?: string
    documentId?: number
  }) =>
    request<{ code: number; data: { docNumber: string } }>('/docNumber/generate', { params }),

  cancelDocumentNumber: (data: { docNumber: string; reason: string }) =>
    request<{ code: number; data: { success: boolean } }>('/docNumber/cancel', { method: 'POST', body: data }),

  getDocumentAuditList: (params?: { seriesId?: number; documentType?: string; status?: string; search?: string }) =>
    request<{ code: number; data: { rows: import('../types').DocumentNumberAudit[]; total: number } }>(
      '/docNumber/auditList',
      { params }
    ),

  // Effective-Dated Tax Rule APIs
  getTaxRuleList: (params?: { hsnSacId?: number; taxSlabId?: number; status?: string; search?: string }) =>
    request<{ code: number; data: { rows: import('../types').TaxRule[]; total: number } }>('/taxRule/list', { params }),

  resolveTaxRule: (params: { hsnSacId: number; transactionDate?: string }) =>
    request<{ code: number; data: { rule: import('../types').TaxRule } }>('/taxRule/resolve', { params }),

  addTaxRule: (data: Partial<import('../types').TaxRule>) =>
    request<{ code: number; data: any }>('/taxRule/add', { method: 'POST', body: data }),

  updateTaxRule: (data: Partial<import('../types').TaxRule>) =>
    request<{ code: number; data: any }>('/taxRule/update', { method: 'POST', body: data }),

  deleteTaxRule: (id: number) =>
    request<{ code: number; data: any }>('/taxRule/delete', { method: 'POST', params: { id } }),
}

