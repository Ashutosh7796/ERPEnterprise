export interface StateCode {
  id: number
  stateCode: string
  stateName: string
  stateType: 'STATE' | 'UNION_TERRITORY' | 'OTHER'
  sort?: number
  enabled?: boolean
}

export interface CompanyGstin {
  id?: number
  tenantId?: number
  gstin: string
  legalName: string
  tradeName?: string
  pan?: string
  tan?: string
  cin?: string
  stateCode: string
  stateName?: string
  taxpayerType: 'REGULAR' | 'COMPOSITION' | 'SEZ_DEVELOPER' | 'SEZ_UNIT' | 'EOU' | 'DEEMED_EXPORTER' | 'ISD' | 'UNREGISTERED'
  principalAddress?: string
  pincode?: string
  email?: string
  phone?: string
  depotIds?: string
  isDefault?: boolean
  isEinvoiceApplicable?: boolean
  isEwaybillApplicable?: boolean
  createTime?: string
  updateTime?: string
}

export interface HsnSac {
  id?: number
  tenantId?: number
  hsnSacCode: string
  type: 'GOODS' | 'SERVICES'
  description: string
  gstRate: number
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
  cessRate?: number
  cessSpecificRate?: number
  isExempt?: boolean
  isNilRated?: boolean
  isNonGst?: boolean
  isRcm?: boolean
  effectiveFrom?: string
  effectiveTo?: string
  createTime?: string
  updateTime?: string
}

export interface TaxRate {
  id?: number
  tenantId?: number
  rateName: string
  gstRate: number
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
  cessRate?: number
  isDefault?: boolean
  description?: string
  enabled?: boolean
}

export interface FySequence {
  id?: number
  tenantId?: number
  companyGstinId?: number
  financialYear: string
  docType: string
  prefix: string
  suffix?: string
  currentVal: number
  paddingZeros: number
  updateTime?: string
}

export interface GSTTaxLineItemInput {
  materialId?: number
  barCode?: string
  name: string
  hsnSacCode?: string
  quantity: number
  unitPrice: number
  discountRate?: number
  discountAmount?: number
  gstRate?: number
  cessRate?: number
  cessSpecificRate?: number
  isExempt?: boolean
}

export interface GSTTaxLineResult {
  materialId?: number
  barCode?: string
  name: string
  hsnSacCode?: string
  quantity: number
  unitPrice: number
  grossAmount: number
  discountAmount: number
  taxableValue: number
  gstRate: number
  cgstRate: number
  cgstAmount: number
  sgstRate: number
  sgstAmount: number
  igstRate: number
  igstAmount: number
  cessRate: number
  cessAmount: number
  cessSpecificAmount: number
  totalTaxAmount: number
  lineTotal: number
  taxInclusiveUnitPrice: number
}

export interface GSTTaxCalculationRequest {
  supplierStateCode?: string
  supplierGstin?: string
  posStateCode?: string
  customerGstin?: string
  customerGstType?: string
  transactionType?: string
  isRcm?: boolean
  items: GSTTaxLineItemInput[]
}

export interface GSTTaxCalculationResult {
  supplyType: 'INTRA_STATE' | 'INTER_STATE'
  supplierStateCode: string
  posStateCode: string
  posStateName: string
  transactionType: string
  isRcm: boolean
  totalGrossAmount: number
  totalDiscountAmount: number
  totalTaxableValue: number
  totalCgstAmount: number
  totalSgstAmount: number
  totalIgstAmount: number
  totalCessAmount: number
  totalTaxAmount: number
  totalInvoiceAmount: number
  roundOffAmount: number
  finalInvoiceTotal: number
  amountInWords: string
  items: GSTTaxLineResult[]
}

export interface FinancialYear {
  id?: number
  tenantId?: number
  name: string
  code: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'LOCKED'
  isCurrent?: boolean
  description?: string
  createTime?: string
  updateTime?: string
}

export interface DocumentNumberSeries {
  id?: number
  tenantId?: number
  companyGstinId?: number
  companyGstin?: string
  branchId?: number
  branchName?: string
  financialYearId: number
  financialYearName?: string
  documentType: string
  seriesCode: string
  prefix: string
  nextNumber: number
  paddingLength: number
  restartFrequency: 'YEARLY' | 'NEVER'
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  description?: string
  createTime?: string
  updateTime?: string
}

export interface DocumentNumberAudit {
  id?: number
  tenantId?: number
  seriesId: number
  documentType: string
  documentId?: number
  docNumber: string
  generatedAt: string
  generatedBy?: number
  status: 'ISSUED' | 'CANCELLED'
  cancelledAt?: string
  cancelledBy?: number
  cancellationReason?: string
}

export interface TaxRule {
  id?: number
  tenantId?: number
  hsnSacId: number
  hsnSacCode?: string
  hsnSacDescription?: string
  hsnType?: 'GOODS' | 'SERVICES'
  taxSlabId: number
  taxSlabName?: string
  gstRate?: number
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
  cessRate?: number
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST'
  effectiveFrom: string
  effectiveTo?: string
  conditionMinAmount?: number
  conditionMaxAmount?: number
  status: 'ACTIVE' | 'INACTIVE'
  remarks?: string
  createTime?: string
  updateTime?: string
}

