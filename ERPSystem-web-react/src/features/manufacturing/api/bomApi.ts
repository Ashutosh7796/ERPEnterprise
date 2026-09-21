import { http } from '@core/api/client'

export interface BomItemDTO {
  id?: number
  componentMaterialId: number
  quantity: number
  unitId?: number
  scrapPercent: number
  issueType: 'MANUAL_ISSUE' | 'BACKFLUSH'
  remark?: string
  componentName?: string
  componentStandard?: string
  componentModel?: string
  componentUnit?: string
  barCode?: string
}

export interface BomHeadDTO {
  id?: number
  bomCode: string
  materialId: number
  revisionCode: string
  outputQuantity: number
  unitId?: number
  isDefault: '1' | '0'
  status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE'
  remark?: string
  materialName?: string
  materialStandard?: string
  materialModel?: string
  materialUnit?: string
  barCode?: string
  componentCount?: number
  items?: BomItemDTO[]
}

export interface BomExplosionNode {
  level: number
  materialId: number
  materialName: string
  barCode?: string
  standard?: string
  model?: string
  unit?: string
  bomId?: number
  bomCode?: string
  revisionCode?: string
  unitQuantity?: number
  batchYield?: number
  scrapPercent?: number
  scaledQuantity: number
  issueType?: string
  subAssembly: boolean
  children: BomExplosionNode[]
}

export interface BomListParams {
  currentPage?: number
  pageSize?: number
  materialId?: number
  status?: string
  bomCode?: string
}

export const bomApi = {
  getBomList: (params: BomListParams) => {
    return http.get<{ rows: BomHeadDTO[]; total: number }>('/bom/list', { params })
  },

  getBomById: (id: number) => {
    return http.get<BomHeadDTO>(`/bom/get/${id}`)
  },

  getDefaultByMaterial: (materialId: number) => {
    return http.get<BomHeadDTO>(`/bom/getDefaultByMaterial/${materialId}`)
  },

  createBom: (data: {
    materialId: number
    bomCode?: string
    revisionCode?: string
    outputQuantity: number
    isDefault?: string
    status?: string
    remark?: string
    items: BomItemDTO[]
  }) => {
    return http.post<BomHeadDTO>('/bom/create', data)
  },

  updateBom: (data: {
    id: number
    materialId?: number
    bomCode?: string
    revisionCode?: string
    outputQuantity?: number
    isDefault?: string
    status?: string
    remark?: string
    items: BomItemDTO[]
  }) => {
    return http.put<BomHeadDTO>('/bom/update', data)
  },

  deleteBom: (id: number) => {
    return http.delete('/bom/delete', { params: { id } })
  },

  explodeBom: (id: number, targetQty?: number) => {
    return http.get<BomExplosionNode>(`/bom/explode/${id}`, {
      params: { targetQty },
    })
  },
}
