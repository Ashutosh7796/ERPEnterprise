import { http } from '@core/api/client'

export interface JournalVoucherLineItem {
  id?: number
  lineNo?: number
  accountId?: number
  accountCode?: string
  accountName?: string
  partyType?: string
  partyId?: number
  costCenter?: string
  debit: number
  credit: number
  narration?: string
}

export interface JournalVoucherDTO {
  id?: number
  voucherNumber?: string
  voucherDate: string
  voucherType?: string
  totalDebit?: number
  totalCredit?: number
  status?: string
  remark?: string
  attachment?: string
  lines: JournalVoucherLineItem[]
}

export interface ContraVoucherDTO {
  id?: number
  voucherNumber?: string
  voucherDate: string
  sourceAccountId: number
  destinationAccountId: number
  amount: number
  remark?: string
  attachment?: string
  status?: string
}

export interface AccountCoaSummary {
  id: number
  accountCode: string
  accountName: string
  rootType: string
  accountType: string
  normalBalance: string
  isGroup: string
  status: string
}

export const journalVoucherApi = {
  saveAndPostJV: (data: JournalVoucherDTO) =>
    http.post<JournalVoucherDTO>('/financial/journalVoucher/saveAndPost', data),

  saveAndPostContra: (data: ContraVoucherDTO) =>
    http.post<ContraVoucherDTO>('/financial/journalVoucher/saveAndPostContra', data),

  getList: (params: {
    voucherType?: string
    voucherNumber?: string
    status?: string
    startDate?: string
    endDate?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<JournalVoucherDTO[]>('/financial/journalVoucher/list', params),

  getDetail: (id: number, voucherType?: string) =>
    http.get<JournalVoucherDTO>('/financial/journalVoucher/detail', { id, voucherType }),

  reverseVoucher: (id: number, voucherType?: string, reason?: string) =>
    http.post<string>('/financial/journalVoucher/reverse', null, {
      params: { id, voucherType, reason },
    }),

  searchAccounts: (keyword?: string) =>
    http.get<AccountCoaSummary[]>('/financial/journalVoucher/searchAccounts', { keyword }),
}
