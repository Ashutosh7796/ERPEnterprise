import { http } from '@core/api/client'

export interface WorkstationDTO {
  id?: number
  workstationCode: string
  workstationName: string
  workCenterType: 'CASTING' | 'MACHINING' | 'FINISHING' | 'ASSEMBLY' | 'PACKING' | string
  depotId?: number
  wipBinId?: number
  hourRateLabor?: number
  hourRateOverhead?: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  description?: string
  depotName?: string
  wipBinName?: string
}

export const workstationApi = {
  list: (params: {
    search?: string
    code?: string
    name?: string
    type?: string
    status?: string
    currentPage?: number
    pageSize?: number
  }) => {
    return http.get('/workstation/list', { params })
  },

  allActive: () => {
    return http.get('/workstation/allActive')
  },

  getById: (id: number) => {
    return http.get('/workstation/getById', { params: { id } })
  },

  create: (data: Partial<WorkstationDTO>) => {
    return http.post('/workstation/create', data)
  },

  update: (data: Partial<WorkstationDTO>) => {
    return http.post('/workstation/update', data)
  },

  delete: (id: number) => {
    return http.post('/workstation/delete', null, { params: { id } })
  },
}
