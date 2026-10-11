import { http as request } from '@core/api/client'

export interface PoFulfillmentLine {
  id: number
  tenantId: number
  poHeaderId: number
  poItemId: number
  materialId: number
  materialExtendId?: number
  orderedQuantity: number
  receivedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  invoicedQuantity: number
  returnedQuantity: number
  remainingReceiptQuantity: number
  remainingInvoiceQuantity: number
  version: number
  status: string
}

export interface PoApprovalHistoryItem {
  id: number
  tenantId: number
  poHeaderId: number
  action: 'SUBMIT' | 'AUTO_APPROVE' | 'APPROVE' | 'REJECT' | 'CANCEL'
  actorUserId: number
  comment?: string
  orderTotalAmount: number
  createTime: string
}

export interface GrnLineItem {
  poItemId: number
  materialId: number
  materialExtendId?: number
  orderedQuantity: number
  receivedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  unitPrice: number
  rejectionReason?: string
  remarks?: string
}

export interface GrnCreateRequest {
  poHeaderId: number
  depotId: number
  supplierDeliveryNote?: string
  items: GrnLineItem[]
}

export interface GrnResult {
  grnHeaderId: number
  grnNumber: string
  poHeaderId: number
  depotId: number
  supplierDeliveryNote?: string
  totalAcceptedQuantity: number
  totalRejectedQuantity: number
  totalReceiptAmount: number
  status: string
  createdTime: string
}

export interface ThreeWayMatchItemComparison {
  poItemId: number
  materialId: number
  orderedQuantity: number
  acceptedQuantity: number
  invoicedQuantity: number
  poUnitPrice: number
  invoicedUnitPrice: number
  priceVariancePercent: number
  quantityVariance: number
  lineMatchStatus: 'PASS' | 'WARNING' | 'BLOCK'
  lineRemarks?: string
}

export interface ThreeWayMatchResult {
  poHeaderId: number
  grnHeaderId?: number
  matchStatus: 'PASS' | 'WARNING' | 'BLOCK'
  canPostInvoice: boolean
  totalBilledAmount: number
  totalExpectedAmount: number
  totalPriceVarianceAmount: number
  blockReasons: string[]
  warningReasons: string[]
  itemComparisons: ThreeWayMatchItemComparison[]
}

export interface GstPurchaseInvoiceItem {
  poItemId?: number
  grnItemId?: number
  materialId: number
  materialName?: string
  hsnSacCode: string
  quantity: number
  unitPrice: number
  discountRate?: number
  gstRate: number
  itcEligible: boolean
  itcBlockReason?: string
}

export interface GstPurchaseInvoiceCreateRequest {
  invoiceNumber: string
  invoiceDate?: string
  dueDate?: string
  supplierId: number
  supplierGstin?: string
  companyGstin?: string
  placeOfSupply: string
  isRcm?: boolean
  isSez?: boolean
  poHeaderId?: number
  grnHeaderId?: number
  tdsSection?: string
  lowerCertNo?: string
  lowerCertRate?: number
  items: GstPurchaseInvoiceItem[]
}

export interface GstPurchaseInvoiceResponse {
  invoiceId: number
  invoiceNumber: string
  systemInvoiceNumber: string
  supplierId: number
  placeOfSupply: string
  supplyType: 'INTRA_STATE' | 'INTER_STATE' | 'SEZ_SUPPLY'
  isRcm: boolean
  totalTaxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTaxAmount: number
  roundingAdjustment: number
  totalInvoiceAmount: number
  eligibleItcAmount: number
  blockedItcAmount: number
  matchStatus: string
  status: string
}

// P1 / P2 APIs
export const submitPurchaseOrder = (id: number) => {
  return request.post<{ code: number; data: any }>(`/procurement/po/${id}/submit`)
}

export const approvePurchaseOrder = (id: number, comment?: string) => {
  return request.post<{ code: number; data: any }>(`/procurement/po/${id}/approve`, { comment })
}

export const rejectPurchaseOrder = (id: number, reason?: string) => {
  return request.post<{ code: number; data: any }>(`/procurement/po/${id}/reject`, { reason })
}

export const cancelPurchaseOrder = (id: number, reason?: string) => {
  return request.post<{ code: number; data: any }>(`/procurement/po/${id}/cancel`, { reason })
}

export const getPoApprovalHistory = (id: number): Promise<any> => {
  return request.get(`/procurement/po/${id}/history`)
}

export const getPoFulfillmentDetails = (id: number): Promise<any> => {
  return request.get(`/procurement/po/${id}/fulfillment`)
}

// P3 APIs
export const createGoodsReceipt = (payload: GrnCreateRequest): Promise<any> => {
  return request.post(`/procurement/grn/create`, payload)
}

export const evaluateThreeWayMatch = (poHeaderId: number, grnHeaderId?: number, invoiceItems?: any[]): Promise<any> => {
  return request.post(`/procurement/match/evaluate`, {
    poHeaderId,
    grnHeaderId,
    invoiceItems: invoiceItems || [],
  })
}

// P4 APIs
export const getPurchaseInvoices = (params?: any): Promise<any> => {
  return request.get(`/procurement/invoices`, { params })
}

export const createPurchaseInvoice = (payload: GstPurchaseInvoiceCreateRequest): Promise<any> => {
  return request.post(`/procurement/invoices/create`, payload)
}

export const postPurchaseInvoice = (id: number): Promise<any> => {
  return request.post(`/procurement/invoices/${id}/post`)
}

// P5 APIs: Landed Cost Vouchers & GL Accounting
export interface LandedCostGrnAllocationItem {
  grnHeaderId: number
  grnItemId?: number
  materialId: number
  materialName?: string
  depotId: number
  receivedQuantity: number
  taxableValue: number
  weightKg?: number
}

export interface LandedCostVoucherCreateRequest {
  voucherNumber?: string
  vendorId?: number
  vendorName?: string
  costType: 'FREIGHT' | 'CUSTOMS_DUTY' | 'INSURANCE' | 'CLEARING_CHARGES'
  apportionmentMethod: 'VALUE' | 'WEIGHT' | 'QUANTITY'
  totalCostAmount: number
  remark?: string
  grnAllocations: LandedCostGrnAllocationItem[]
}

export interface LandedCostAllocationLine {
  id: number
  grnHeaderId: number
  grnItemId?: number
  materialId: number
  depotId: number
  receivedQuantity: number
  taxableValue: number
  weightKg: number
  allocatedCost: number
  capitalizedAssetPortion: number
  expensedCogsPortion: number
}

export interface LandedCostVoucher {
  id: number
  voucherNumber: string
  voucherDate: string
  vendorId?: number
  vendorName?: string
  costType: string
  apportionmentMethod: string
  totalCostAmount: number
  status: 'DRAFT' | 'POSTED' | 'CANCELLED'
  remark?: string
  allocationLines?: LandedCostAllocationLine[]
}

export const getLandedCostVouchers = (params?: any): Promise<any> => {
  return request.get(`/procurement/landed-cost`, { params })
}

export const createLandedCostVoucher = (payload: LandedCostVoucherCreateRequest): Promise<any> => {
  return request.post(`/procurement/landed-cost/create`, payload)
}

export const postLandedCostVoucher = (id: number): Promise<any> => {
  return request.post(`/procurement/landed-cost/${id}/post`)
}

// P6 Interfaces and APIs
export interface ApPaymentAllocationLine {
  invoiceId: number
  invoiceNumber?: string
  allocationAmount: number
  discountAmount?: number
  tdsAmount?: number
}

export interface ApPaymentAllocationRequest {
  supplierId: number
  supplierName?: string
  bankAccountId?: number
  totalPaymentAmount: number
  totalTdsWithheld?: number
  totalDiscountAmount?: number
  totalGrossSettlement?: number
  paymentNumber?: string
  remarks?: string
  allocations: ApPaymentAllocationLine[]
}

export interface SupplierAdvanceCreateRequest {
  supplierId: number
  grossAdvanceAmount: number
  bankAccountId?: number
  paymentDate?: string
  remark?: string
}

export interface SupplierAdvance {
  id: number
  tenantId: number
  advanceNumber: string
  supplierId: number
  supplierName: string
  bankAccountId: number
  grossAdvanceAmount: number
  tdsWithheldAmount: number
  netDisbursedAmount: number
  allocatedAmount: number
  unallocatedBalance: number
  paymentDate: string
  status: 'ACTIVE' | 'FULLY_SETTLED' | 'CANCELLED'
  remark?: string
}

export interface TdsRegisterItem {
  id: number
  tenantId: number
  lawVersion: 'INCOME_TAX_ACT_1961' | 'INCOME_TAX_ACT_2025'
  provisionRef: string
  provisionDisplayName: string
  penaltyRateRef?: string
  lowerCertSectionRef?: string
  lowerCertNo?: string
  reportingForm: 'FORM_26Q' | 'FORM_140'
  reportingCode: string
  partyId: number
  supplierName: string
  pan?: string
  isPanValid: boolean
  sourceDocumentType: string
  sourceDocumentId: number
  sourceDocumentNumber: string
  transactionDate: string
  taxableBaseAmount: number
  tdsRate: number
  tdsAmount: number
  status: string
  challanBsrCode?: string
  challanDate?: string
  challanSerialNo?: string
  isCorrection: boolean
}

export interface MsmeAgingItem {
  invoiceId: number
  invoiceNumber: string
  supplierId: number
  supplierName: string
  msmeType: 'MICRO' | 'SMALL' | 'MEDIUM' | 'TRADER' | 'NON_MSME'
  udyamRegistrationNumber?: string
  invoiceDate: string
  acceptanceDate: string
  agreedCreditDays: number
  statutoryDueDate: string
  daysOverdue: number
  invoiceGrossAmount: number
  paidAmount: number
  remainingOpenAmount: number
  complianceStatus: 'COMPLIANT_PAID' | 'WITHIN_LIMIT' | 'OVERDUE_AT_RISK' | 'DISALLOWED_43BH'
  penalInterestAccrued: number
}

export const allocateApPayment = (payload: ApPaymentAllocationRequest): Promise<any> => {
  return request.post(`/procurement/payments/allocate`, payload)
}

export const createSupplierAdvance = (payload: SupplierAdvanceCreateRequest): Promise<any> => {
  return request.post(`/procurement/advances/create`, payload)
}

export const settleSupplierAdvance = (advanceId: number, payload: { invoiceId: number; offsetAmount: number }): Promise<any> => {
  return request.post(`/procurement/advances/${advanceId}/settle`, payload)
}

export const getSupplierAdvances = (params?: any): Promise<any> => {
  return request.get(`/procurement/advances`, { params })
}

export const getTdsRegisterRecords = (params?: any): Promise<any> => {
  return request.get(`/procurement/tds/register`, { params })
}

export const evaluateTds = (payload: {
  supplierId: number
  taxableAmount: number
  grossInvoiceAmount?: number
  transactionDate?: string
  section?: string
  tdsSection?: string
  lowerCertNo?: string
  lowerCertRate?: number
}): Promise<any> => {
  return request.post(`/procurement/tds/evaluate`, payload)
}

export const getMsmeAgingReport = (params?: any): Promise<any> => {
  return request.get(`/procurement/msme/aging`, { params })
}

// Phase P7: Purchase Return, Delivery Challan & Credit Note Matching
export interface ProcurementReturnLine {
  materialId: number
  materialName?: string
  originalLineItemId?: number
  depotId?: number
  returnQuantity: number
  unitPrice: number
  gstRate: number
  batchNumber?: string
  remarks?: string
}

export interface ProcurementReturnCreateRequest {
  supplierId: number
  supplierName?: string
  originalInvoiceId?: number
  originalInvoiceNumber?: string
  originalGrnId?: number
  originalGrnNumber?: string
  depotId?: number
  returnType?: 'PHYSICAL_RETURN' | 'COMMERCIAL_ADJUSTMENT' | 'RCM_SELF_CREDIT'
  returnDate?: string
  returnReason?: string
  isItcEligible?: boolean
  deliveryChallanRequired?: boolean
  vehicleNumber?: string
  transporterId?: string
  transporterName?: string
  remarks?: string
  lines: ProcurementReturnLine[]
}

export interface ProcurementReturnItem {
  id: number
  returnHeaderId: number
  materialId: number
  materialName: string
  originalLineItemId?: number
  depotId: number
  returnQuantity: number
  unitPrice: number
  taxableAmount: number
  gstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
  isItcEligible: boolean
  batchNumber?: string
}

export interface ProcurementReturn {
  id: number
  tenantId: number
  returnNumber: string
  returnType: 'PHYSICAL_RETURN' | 'COMMERCIAL_ADJUSTMENT' | 'RCM_SELF_CREDIT'
  returnDate: string
  supplierId: number
  supplierName: string
  originalInvoiceId?: number
  originalInvoiceNumber?: string
  originalGrnId?: number
  originalGrnNumber?: string
  depotId?: number
  deliveryChallanNumber?: string
  ewayBillNumber?: string
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalReturnAmount: number
  isItcEligible: boolean
  itcReversalStatus: 'PENDING_RECONCILIATION' | 'RECONCILED_MATCHED' | 'EXEMPT_BLOCKED'
  supplierCreditNoteNumber?: string
  supplierCreditNoteDate?: string
  returnReason?: string
  status: 'POSTED' | 'CANCELLED'
  glJournalId?: number
  createTime: string
  items?: ProcurementReturnItem[]
}

export interface DeliveryChallanItem {
  materialId: number
  materialName: string
  hsnCode?: string
  quantity: number
  unit?: string
  unitValue: number
  taxableValue: number
  gstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
}

export interface DeliveryChallan {
  challanId: number
  challanNumber: string
  challanDate: string
  challanType: string
  returnId: number
  returnNumber: string
  consignorName: string
  consignorAddress?: string
  consignorGstin?: string
  consignorStateCode?: string
  consigneeId: number
  consigneeName: string
  consigneeAddress?: string
  consigneeGstin?: string
  consigneeStateCode?: string
  transportMode?: string
  vehicleNumber?: string
  transporterId?: string
  transporterName?: string
  ewayBillNumber?: string
  ewayBillPayload?: string
  totalTaxableAmount: number
  totalCgstAmount: number
  totalSgstAmount: number
  totalIgstAmount: number
  totalChallanAmount: number
  reasonForTransport?: string
  items?: DeliveryChallanItem[]
}

export interface SupplierCreditNoteMatchRequest {
  returnId: number
  supplierCreditNoteNumber: string
  supplierCreditNoteDate?: string
  supplierGstin?: string
  gstr2bTaxableValue?: number
  gstr2bCgstAmount?: number
  gstr2bSgstAmount?: number
  gstr2bIgstAmount?: number
  remarks?: string
}

export const createPurchaseReturn = (payload: ProcurementReturnCreateRequest): Promise<any> => {
  return request.post(`/procurement/returns`, payload)
}

export const getPurchaseReturns = (params?: any): Promise<any> => {
  return request.get(`/procurement/returns`, { params })
}

export const getPurchaseReturnDetail = (id: number): Promise<any> => {
  return request.get(`/procurement/returns/${id}`)
}

export const getDeliveryChallan = (returnId: number): Promise<any> => {
  return request.get(`/procurement/returns/${returnId}/challan`)
}

export const reconcileSupplierCreditNote = (returnId: number, payload: SupplierCreditNoteMatchRequest): Promise<any> => {
  return request.post(`/procurement/returns/${returnId}/match-credit-note`, payload)
}

export const cancelPurchaseReturn = (returnId: number): Promise<any> => {
  return request.post(`/procurement/returns/${returnId}/cancel`)
}



