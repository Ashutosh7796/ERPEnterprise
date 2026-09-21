import { http } from '@core/api/client'

export type BinType = 'STORAGE' | 'WIP' | 'QUARANTINE' | 'TRANSIT' | 'JOB_WORK'

export interface DepotBinRecord {
  id?: number
  tenantId?: number
  depotId: number
  binCode: string
  binName?: string
  binType: BinType
  isDefault?: boolean
  deleteFlag?: string
  createTime?: string
}

export const getDepotBins = async (depotId: number): Promise<DepotBinRecord[]> => {
  const res = await http.get('/depotBin/list', { depotId })
  return res?.data?.rows || []
}

export const createDepotBin = async (bin: DepotBinRecord): Promise<void> => {
  await http.post('/depotBin/add', bin)
}

export const updateDepotBin = async (bin: DepotBinRecord): Promise<void> => {
  await http.post('/depotBin/update', bin)
}

export const deleteDepotBin = async (id: number): Promise<void> => {
  await http.post('/depotBin/delete', { id })
}
