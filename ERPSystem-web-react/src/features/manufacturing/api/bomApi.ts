import { http } from '@core/api/client'

export interface BomItemDTO {
  id?: number
  componentMaterialId: number
  quantity: number
  unitId?: number
  scrapPercent: number
  issueType: 'MANUAL_ISSUE' | 'BACKFLUSH'
  rate?: number
  amount?: number
  sourceDepotId?: number
  operationSequence?: number
  remark?: string
  componentName?: string
  componentStandard?: string
  componentModel?: string
  componentUnit?: string
  barCode?: string
}

export interface BomOperationDTO {
  id?: number
  bomId?: number
  operationSequence: number
  operationName: string
  workstationName?: string
  setupTimeMinutes?: number
  setupTimeMins?: number
  targetDepotId?: number
  targetDepotName?: string
  runTimeMinutes?: number
  description?: string
  isOutsource?: number | boolean
  defaultSupplierId?: number
  defaultSupplierName?: string
  createTime?: string
}

export interface BomCostWarningDTO {
  warningCode: string
  workCenterType?: string
  operationSeq?: number
  operationName?: string
  componentMaterialId?: number
  componentName?: string
  affectedCostBuckets?: string[]
  message?: string
}

export interface BomHeadDTO {
  id?: number
  bomCode: string
  materialId: number
  revisionCode: string
  outputQuantity: number
  unitId?: number
  materialCost?: number
  laborCost?: number
  overheadCost?: number
  totalCost?: number
  costingMethod?: string
  costCompleteness?: 'VALID_STANDARD_COST' | 'INCOMPLETE_COST_BASIS'
  costWarnings?: BomCostWarningDTO[]
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
  operations?: BomOperationDTO[]
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

  getOperations: (bomId: number) => {
    return http.get<BomOperationDTO[]>(`/bom/getOperations/${bomId}`)
  },

  saveOperations: (bomId: number, operations: BomOperationDTO[]) => {
    return http.post('/bom/saveOperations', { bomId, operations })
  },

  calculateCost: (bomId: number) => {
    return http.post<BomHeadDTO>(`/bom/calculateCost/${bomId}`)
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
    operations?: BomOperationDTO[]
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
    operations?: BomOperationDTO[]
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
