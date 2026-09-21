import { http } from '@core/api/client'

export interface AccountCoaNodeDTO {
  id?: number
  accountCode: string
  accountName: string
  parentId?: number | null
  parentName?: string
  rootType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  accountType: string
  normalBalance: 'DEBIT' | 'CREDIT'
  isGroup: '1' | '0'
  isSystem?: '1' | '0'
  status: 'ACTIVE' | 'INACTIVE'
  sort?: number
  remark?: string
  children?: AccountCoaNodeDTO[]
}

export const accountCoaApi = {
  getTree: (status?: string) =>
    http.get<AccountCoaNodeDTO[]>('/accountCoa/tree', { status }),

  getList: (params: {
    rootType?: string
    accountType?: string
    status?: string
    searchKey?: string
    currentPage?: number
    pageSize?: number
  }) => http.get<{ rows: AccountCoaNodeDTO[]; total: number }>('/accountCoa/list', params),

  getNode: (id: number) => http.get<AccountCoaNodeDTO>('/accountCoa/info', { id }),

  addNode: (node: AccountCoaNodeDTO) => http.post<string>('/accountCoa/add', node),

  updateNode: (node: AccountCoaNodeDTO) => http.put<string>('/accountCoa/update', node),

  deleteNode: (id: number) => http.delete<string>('/accountCoa/delete', { id }),
}
