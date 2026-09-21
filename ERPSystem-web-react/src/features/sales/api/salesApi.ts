import { http } from '@core/api/client'

export interface QuotationItemDto {
  id?: number
  materialId: number
  materialExtendId?: number
  materialName?: string
  materialUnit?: string
  quantity: number
  unitPrice: number
  discountRate?: number
  discountAmount?: number
  taxRate?: number
  taxAmount?: number
  totalAmount: number
  hsnCode?: string
  remark?: string
}

export interface QuotationDto {
  id?: number
  quotationNumber?: string
  revisionNumber?: number
  customerId: number
  customerName?: string
  quotationDate?: string
  validUntilDate?: string
  salespersonId?: number
  organizationId?: number
  currency?: string
  placeOfSupply?: string
  isInterState?: boolean
  totalTaxableAmount?: number
  totalTaxAmount?: number
  discountRate?: number
  discountAmount?: number
  grandTotal?: number
  paymentTerms?: string
  deliveryTerms?: string
  status?: string
  convertedSoId?: number
  remark?: string
  items?: QuotationItemDto[]
}

export interface CustomerCreditExposureDto {
  customerId: number
  customerName: string
  creditLimit: number
  creditDays: number
  overdueGraceDays: number
  openReceivables: number
  unbilledApprovedOrders: number
  eligibleAdvances: number
  eligibleCreditNotes: number
  currentOrderValue: number
  effectiveCreditExposure: number
  availableCredit: number
  maxOverdueDays: number
  overdueInvoiceCount: number
  overdueAmount: number
  creditLimitBreached: boolean
  hasOverdueInvoices: boolean
  recommendedAction: string
}

export interface PaymentAllocationLine {
  invoiceId: number
  allocationAmount: number
}

export interface PaymentAllocationRequestDto {
  customerId: number
  bankAccountId: number
  totalPaymentAmount: number
  allocations: PaymentAllocationLine[]
  receiptNumber?: string
  remarks?: string
}

export const salesApi = {
  // Quotations
  fetchQuotations: (params: { status?: string; customerId?: number; page?: number; rows?: number }) =>
    http.get<{ code: number; data: { total: number; rows: QuotationDto[] } }>('/sales/quotations/list', { params }),

  fetchQuotation: (id: number) =>
    http.get<{ code: number; data: QuotationDto }>(`/sales/quotations/${id}`),

  createQuotation: (data: QuotationDto) =>
    http.post<{ code: number; data: number }>('/sales/quotations/create', data),

  updateQuotation: (data: QuotationDto) =>
    http.post<{ code: number; data: string }>('/sales/quotations/update', data),

  submitQuotation: (id: number) =>
    http.post<{ code: number; data: string }>(`/sales/quotations/${id}/submit`),

  createRevision: (id: number) =>
    http.post<{ code: number; data: number }>(`/sales/quotations/${id}/revision`),

  acceptQuotation: (id: number) =>
    http.post<{ code: number; data: string }>(`/sales/quotations/${id}/accept`),

  convertToSalesOrder: (id: number) =>
    http.post<{ code: number; data: number }>(`/sales/quotations/${id}/convert-to-so`),

  // Order Approvals & Credit Exposure
  fetchCustomerCreditExposure: (customerId: number, currentOrderValue?: number) =>
    http.get<{ code: number; data: CustomerCreditExposureDto }>(`/sales/customers/${customerId}/credit-exposure`, {
      params: { currentOrderValue },
    }),

  submitOrderApproval: (soHeaderId: number) =>
    http.post<{ code: number; data: string }>(`/sales/orders/${soHeaderId}/submit-approval`),

  approveSalesOrder: (soHeaderId: number, remarks?: string) =>
    http.post<{ code: number; data: string }>(`/sales/orders/${soHeaderId}/approve`, { remarks }),

  rejectSalesOrder: (soHeaderId: number, reason?: string) =>
    http.post<{ code: number; data: string }>(`/sales/orders/${soHeaderId}/reject`, { reason }),

  cancelSalesOrder: (soHeaderId: number, reason?: string) =>
    http.post<{ code: number; data: string }>(`/sales/orders/${soHeaderId}/cancel`, { reason }),

  fetchOrderFulfillment: (soHeaderId: number) =>
    http.get<{ code: number; data: any[] }>(`/sales/orders/${soHeaderId}/fulfillment`),

  // Payment Allocations
  allocatePayment: (data: PaymentAllocationRequestDto) =>
    http.post<{ code: number; data: number }>('/sales/payments/allocate', data),

  fetchInvoiceAllocations: (invoiceId: number) =>
    http.get<{ code: number; data: any[] }>(`/sales/invoices/${invoiceId}/allocations`),

  fetchCustomerOpenInvoices: (customerId: number) =>
    http.get<{ code: number; data: any[] }>(`/sales/customers/${customerId}/open-invoices`),
}
