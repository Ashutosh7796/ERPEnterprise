import { http } from '@core/api/client'

// ==========================================
// 1. CONFIG & TEMPLATES
// ==========================================
export interface QcConfigDTO {
  id?: number
  tenantId?: number
  defaultAqlStandard?: string
  criticalAqlLimit?: number
  majorAqlLimit?: number
  minorAqlLimit?: number
  containmentSlaHours?: number
  capaSlaDays?: number
  autoHoldOnGrn?: boolean
  quarantineDepotId?: number
  remark?: string
}

export interface QcTemplateItemDTO {
  id?: number
  templateId?: number
  parameterName: string
  parameterType: 'NUMERIC' | 'BOOLEAN' | 'TEXT'
  nominalValue?: number
  lsl?: number
  usl?: number
  unitOfMeasure?: string
  isCritical: boolean
  sampleSizeCode?: string
  sampleCount?: number
  testMethod?: string
  sortOrder?: number
}

export interface QcTemplateDTO {
  id?: number
  templateCode: string
  templateName: string
  inspectionType: 'IQC' | 'IPQC' | 'FQC'
  materialId?: number
  materialName?: string
  materialStandard?: string
  routingOperationSeq?: number
  workCenterType?: string
  versionMajor?: number
  versionMinor?: number
  isActive?: boolean
  effectiveDate?: string
  remark?: string
  items?: QcTemplateItemDTO[]
}

// ==========================================
// 2. INSPECTIONS & SAMPLE READINGS
// ==========================================
export interface QcInspectionItemDTO {
  id?: number
  inspectionId?: number
  templateItemId?: number
  parameterName: string
  parameterType: 'NUMERIC' | 'BOOLEAN' | 'TEXT'
  nominalValue?: number
  lsl?: number
  usl?: number
  unitOfMeasure?: string
  isCritical: boolean
  sampleNumber: number
  measuredValueNumeric?: number
  measuredValueText?: string
  measuredValueBoolean?: boolean
  isConforming: boolean
  deviation?: number
  remark?: string
}

export interface QcInspectionDTO {
  id?: number
  inspectionNumber: string
  inspectionType: 'IQC' | 'IPQC' | 'FQC'
  sourceDocumentType?: string
  sourceDocumentId?: number
  sourceDocumentNumber?: string
  materialId: number
  materialName?: string
  materialStandard?: string
  supplierId?: number
  supplierName?: string
  lotBatchNumber?: string
  batchQuantity: number
  sampleSize: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  decision?: 'PASS' | 'FAIL' | 'CONDITIONAL'
  acceptedQuantity?: number
  rejectedQuantity?: number
  scrappedQuantity?: number
  concessionQuantity?: number
  inspectorUserId?: number
  inspectorName?: string
  inspectionDate?: string
  quarantineBinId?: number
  quarantineBinName?: string
  destinationDepotId?: number
  digitalSignature?: string
  remark?: string
  templateId?: number
  items?: QcInspectionItemDTO[]
}

export interface QcInspectionCreateRequest {
  inspectionType: 'IQC' | 'IPQC' | 'FQC'
  materialId: number
  sourceDocumentType?: string
  sourceDocumentId?: number
  sourceDocumentNumber?: string
  supplierId?: number
  lotBatchNumber?: string
  batchQuantity: number
  sampleSize?: number
  templateId?: number
  routingOperationSeq?: number
  workCenterType?: string
  quarantineBinId?: number
  remark?: string
}

export interface QcReadingDTO {
  templateItemId: number
  parameterName: string
  parameterType: 'NUMERIC' | 'BOOLEAN' | 'TEXT'
  sampleNumber: number
  measuredValueNumeric?: number
  measuredValueText?: string
  measuredValueBoolean?: boolean
  remark?: string
}

export interface QcInspectionSignOffRequest {
  inspectionId: number
  decision: 'PASS' | 'FAIL' | 'CONDITIONAL'
  acceptedQuantity: number
  rejectedQuantity: number
  scrappedQuantity?: number
  concessionQuantity?: number
  destinationDepotId?: number
  quarantineBinId?: number
  sourceDepotId?: number
  remark?: string
}

// ==========================================
// 3. DEFECT ENRICHMENT, NCR & MRB
// ==========================================
export interface QcDefectRecordDTO {
  id?: number
  defectCode: string
  inspectionId?: number
  inspectionNumber?: string
  materialId: number
  materialName?: string
  materialStandard?: string
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  defectCategory: string
  rootCauseHypothesis?: string
  confirmedRootCause?: string
  responsibleDepartment?: string
  quantityAffected: number
  containmentAction?: string
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED_NCR' | 'RESOLVED'
  ncrId?: number
  ncrNumber?: string
  createTime?: string
  creatorName?: string
}

export interface QcMrbApprovalDTO {
  id?: number
  dispositionId: number
  approverRole: 'QUALITY' | 'ENGINEERING' | 'MANUFACTURING' | 'EXECUTIVE'
  approverUserId?: number
  approverName?: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvalTimestamp?: string
  digitalSignature?: string
  comments?: string
}

export interface QcNcrDispositionDTO {
  id?: number
  ncrId: number
  dispositionNumber: string
  dispositionType: 'REWORK' | 'SCRAP' | 'RETURN_TO_VENDOR' | 'USE_AS_IS'
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED'
  dispositionJustification?: string
  reworkInstructions?: string
  assignedReworkWorkOrderId?: number
  reworkWorkOrderNumber?: string
  scrapValueRecovery?: number
  createTime?: string
  creatorName?: string
  approvals?: QcMrbApprovalDTO[]
}

export interface QcNcrDTO {
  id?: number
  ncrNumber: string
  sourceType: 'IQC' | 'IPQC' | 'FQC' | 'CUSTOMER_RETURN' | 'INTERNAL_AUDIT'
  sourceInspectionId?: number
  sourceInspectionNumber?: string
  defectRecordId?: number
  materialId: number
  materialName?: string
  materialStandard?: string
  supplierId?: number
  supplierName?: string
  quantityNonConforming: number
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  status: 'OPEN' | 'CONTAINED' | 'MRB_REVIEW' | 'DISPOSITIONED' | 'CLOSED'
  containmentStatus: 'NONE' | 'QUARANTINED' | 'BLOCKED'
  containmentActions?: string
  quarantineBinId?: number
  assignedEngineerUserId?: number
  assignedEngineerName?: string
  createTime?: string
  creatorName?: string
  dispositions?: QcNcrDispositionDTO[]
}

export interface QcNcrCreateRequest {
  defectRecordId?: number
  sourceInspectionId?: number
  sourceType: 'IQC' | 'IPQC' | 'FQC' | 'CUSTOMER_RETURN' | 'INTERNAL_AUDIT'
  materialId: number
  supplierId?: number
  quantityNonConforming: number
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  containmentActions?: string
  quarantineBinId?: number
  assignedEngineerUserId?: number
  remark?: string
}

export interface QcNcrDispositionRequest {
  ncrId: number
  dispositionType: 'REWORK' | 'SCRAP' | 'RETURN_TO_VENDOR' | 'USE_AS_IS'
  dispositionJustification: string
  reworkInstructions?: string
  scrapValueRecovery?: number
}

export interface QcMrbSignOffRequest {
  mrbApprovalId: number
  approvalStatus: 'APPROVED' | 'REJECTED'
  comments?: string
}

// ==========================================
// 4. CAPA & 8D PROBLEM SOLVING
// ==========================================
export interface QcCapaDTO {
  id?: number
  capaNumber: string
  ncrId?: number
  ncrNumber?: string
  problemStatement: string
  interimContainment?: string
  why1?: string
  why2?: string
  why3?: string
  why4?: string
  why5?: string
  rootCauseConclusion?: string
  correctiveActionPlan?: string
  preventiveActionPlan?: string
  actionOwnerId?: number
  actionOwnerName?: string
  targetCompletionDate?: string
  status: 'INITIATED' | 'ROOT_CAUSE_ANALYSIS' | 'ACTIONS_IMPLEMENTED' | 'EFFECTIVENESS_VERIFIED' | 'REOPENED' | 'CLOSED'
  effectivenessVerificationDays?: number
  effectivenessResult?: 'SUCCESS' | 'RECURRENCE_DETECTED' | 'PENDING'
  effectivenessVerifiedByUserId?: number
  effectivenessVerifiedByName?: string
  effectivenessVerifiedDate?: string
  effectivenessNotes?: string
  recurrenceDetected?: boolean
  createTime?: string
}

export interface QcEightDMemberDTO {
  id?: number
  eightDId: number
  userId: number
  userName?: string
  memberRole: 'CHAMPION' | 'LEADER' | 'FACILITATOR' | 'MEMBER'
  department?: string
}

export interface QcEightDStepDTO {
  id?: number
  eightDId: number
  disciplineCode: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8'
  title?: string
  contentJson?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  completedByUserId?: number
  completedByName?: string
  completedDate?: string
  digitalSignature?: string
}

export interface QcEightDDTO {
  id?: number
  eightDNumber: string
  ncrId?: number
  ncrNumber?: string
  title: string
  status: 'ACTIVE' | 'CLOSED'
  currentDiscipline: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8'
  championUserId?: number
  championName?: string
  leaderUserId?: number
  leaderName?: string
  targetCloseDate?: string
  actualCloseDate?: string
  digitalSignature?: string
  createTime?: string
  members?: QcEightDMemberDTO[]
  steps?: QcEightDStepDTO[]
}

// ==========================================
// 5. QUALITY COCKPIT
// ==========================================
export interface QcCockpitSummaryDTO {
  firstPassYield: number
  overallAcceptanceRate: number
  containmentSlaComplianceRate: number
  pendingInspectionsCount: number
  openNcrCount: number
  activeCapaCount: number
  totalInspections: number
  passedInspections: number
  failedInspections: number
  totalNonConformances: number
}

export interface QcParetoItemDTO {
  defectCategory: string
  count: number
  percentage: number
  cumulativePercentage: number
}

export interface QcSupplierRatingDTO {
  supplierId: number
  supplierName: string
  totalReceivedLots: number
  rejectedLots: number
  totalDefectCount: number
  rejectionRatePercent: number
  qualityScorePpm: number
  ratingGrade: 'A_PREFERRED' | 'B_ACCEPTABLE' | 'C_PROBATION' | 'D_CRITICAL'
}

export interface QcTrendDTO {
  date: string
  inspectionsCount: number
  passRate: number
}

export interface QcCustomerRatingDTO {
  customerId: number
  customerName: string
  totalShipments: number
  totalDispatchedQty: number
  totalReturnedQty: number
  totalReturnedShipments: number
  totalCustomerNcrs: number
  ppmDefectRate: number
  cqrScore: number
  ratingGrade: 'GRADE_A_EXCELLENT' | 'GRADE_B_ACCEPTABLE' | 'GRADE_C_WARNING' | 'GRADE_D_CRITICAL' | 'UNRATED'
}

export interface QcRejectionCostItemDTO {
  defectRecordId: number
  defectNumber: string
  stage: string
  materialId: number
  materialName: string
  materialStandard: string
  workOrderId?: number
  workOrderNumber?: string
  jobCardId?: number
  jobCardNumber?: string
  defectCode: string
  defectCategory: string
  severity: string
  defectQuantity: number
  unitOfMeasure: string
  standardUnitCost: number
  estimatedScrapCost: number
  abnormalScrapAccountingLoss: number
  probableCause?: string
  department?: string
  defectStatus: string
  ncrId?: number
  ncrNumber?: string
  rejectionDate: string
}

export interface QcStageSummaryDTO {
  stageCode: string
  stageName: string
  totalInspections: number
  passedInspections: number
  failedInspections: number
  totalLotQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionRatePct: number
  ncrCount: number
}

// ==========================================
// API CLIENT
// ==========================================
export const qcApi = {
  // Config
  getConfig: () => http.get<QcConfigDTO>('/qc/config/get'),
  updateConfig: (cfg: QcConfigDTO) => http.post<QcConfigDTO>('/qc/config/update', cfg),

  // Templates
  createTemplate: (dto: QcTemplateDTO) => http.post<QcTemplateDTO>('/qc/template/create', dto),
  activateTemplate: (templateId: number) => http.post<QcTemplateDTO>(`/qc/template/activate?templateId=${templateId}`),
  getTemplateById: (id: number) => http.get<QcTemplateDTO>(`/qc/template/getById?id=${id}`),
  resolveTemplate: (params: { inspectionType: string; materialId?: number; routingOperationSeq?: number; workCenterType?: string }) =>
    http.get<QcTemplateDTO>('/qc/template/resolve', params),
  getTemplateList: (params: { inspectionType?: string; materialId?: number; templateCode?: string; templateName?: string; isActive?: boolean; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcTemplateDTO[]; total: number }>('/qc/template/list', params),

  // Inspections
  createInspection: (req: QcInspectionCreateRequest) => http.post<QcInspectionDTO>('/qc/inspection/create', req),
  recordReadings: (inspectionId: number, readings: QcReadingDTO[]) =>
    http.post<QcInspectionDTO>(`/qc/inspection/recordReadings?inspectionId=${inspectionId}`, readings),
  signOffInspection: (req: QcInspectionSignOffRequest) => http.post<QcInspectionDTO>('/qc/inspection/signOff', req),
  getInspectionById: (id: number) => http.get<QcInspectionDTO>(`/qc/inspection/getById?id=${id}`),
  getInspectionList: (params: { inspectionType?: string; materialId?: number; status?: string; decision?: string; inspectionNumber?: string; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcInspectionDTO[]; total: number }>('/qc/inspection/list', params),

  // Defects
  recordDefect: (dto: any) => http.post<QcDefectRecordDTO>('/qc/defect/record', dto),
  updateDefectInvestigation: (params: { defectId: number; confirmedCause?: string; department?: string; status?: string }) =>
    http.post<QcDefectRecordDTO>(`/qc/defect/updateInvestigation?defectId=${params.defectId}`, null, { params }),
  getDefectById: (id: number) => http.get<QcDefectRecordDTO>(`/qc/defect/getById?id=${id}`),
  getDefectList: (params: { materialId?: number; severity?: string; status?: string; defectCode?: string; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcDefectRecordDTO[]; total: number }>('/qc/defect/list', params),

  // NCR & MRB
  createNcr: (req: QcNcrCreateRequest) => http.post<QcNcrDTO>('/qc/ncr/create', req),
  updateContainment: (params: { ncrId: number; containmentActions: string; quarantineBinId?: number }) =>
    http.post<QcNcrDTO>(`/qc/ncr/updateContainment?ncrId=${params.ncrId}&containmentActions=${encodeURIComponent(params.containmentActions)}${params.quarantineBinId ? `&quarantineBinId=${params.quarantineBinId}` : ''}`),
  getNcrById: (id: number) => http.get<QcNcrDTO>(`/qc/ncr/getById?id=${id}`),
  getNcrList: (params: { sourceType?: string; materialId?: number; severity?: string; status?: string; containmentStatus?: string; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcNcrDTO[]; total: number }>('/qc/ncr/list', params),
  proposeDisposition: (req: QcNcrDispositionRequest) => http.post<QcNcrDispositionDTO>('/qc/mrb/proposeDisposition', req),
  signOffMrb: (req: QcMrbSignOffRequest) => http.post<QcNcrDispositionDTO>('/qc/mrb/signOff', req),
  executeDisposition: (dispositionId: number) => http.post<QcNcrDispositionDTO>(`/qc/mrb/execute?dispositionId=${dispositionId}`),
  closeNcr: (ncrId: number, remark?: string) => http.post<QcNcrDTO>(`/qc/ncr/close?ncrId=${ncrId}${remark ? `&remark=${encodeURIComponent(remark)}` : ''}`),

  // CAPA & 8D
  initiateCapa: (req: any) => http.post<QcCapaDTO>('/qc/capa/initiate', req),
  updateCapaRootCause: (params: {
    capaId: number
    why1?: string
    why2?: string
    why3?: string
    why4?: string
    why5?: string
    rootCauseConclusion?: string
    correctiveActionPlan?: string
    preventiveActionPlan?: string
    actionOwnerId?: number
  }) => http.post<QcCapaDTO>(`/qc/capa/updateRootCause?capaId=${params.capaId}`, null, { params }),
  verifyCapaEffectiveness: (req: any) => http.post<QcCapaDTO>('/qc/capa/verifyEffectiveness', req),
  getCapaById: (id: number) => http.get<QcCapaDTO>(`/qc/capa/getById?id=${id}`),
  getCapaList: (params: { status?: string; actionOwnerId?: number; effectivenessResult?: string; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcCapaDTO[]; total: number }>('/qc/capa/list', params),

  initiateEightD: (req: any) => http.post<QcEightDDTO>('/qc/eightD/initiate', req),
  updateEightDDiscipline: (req: any) => http.post<QcEightDDTO>('/qc/eightD/updateDiscipline', req),
  getEightDById: (id: number) => http.get<QcEightDDTO>(`/qc/eightD/getById?id=${id}`),
  getEightDList: (params: { status?: string; currentDiscipline?: string; championUserId?: number; leaderUserId?: number; currentPage?: number; pageSize?: number }) =>
    http.get<{ rows: QcEightDDTO[]; total: number }>('/qc/eightD/list', params),

  // Quality Analytics & Reporting Consolidation (WP-QA)
  getCockpitSummary: () => http.get<QcCockpitSummaryDTO>('/qc/cockpit/summary'),
  getParetoAnalysis: (limit = 10) => http.get<QcParetoItemDTO[]>(`/qc/cockpit/pareto?limit=${limit}`),
  getSupplierQualityRatings: () => http.get<QcSupplierRatingDTO[]>('/qc/cockpit/supplierQuality'),
  getInspectionTrends: () => http.get<QcTrendDTO[]>('/qc/cockpit/trends'),

  getCustomerQualityRatings: (params?: { startDate?: string; endDate?: string; customerId?: number; materialId?: number }) =>
    http.get<QcCustomerRatingDTO[]>('/qc/cockpit/customerQuality', params),

  getRejectionCostReport: (params?: { startDate?: string; endDate?: string; stage?: string; materialId?: number; workOrderId?: number }) =>
    http.get<QcRejectionCostItemDTO[]>('/qc/cockpit/rejectionCostReport', params),

  getStageRejectionSummary: (params?: { startDate?: string; endDate?: string }) =>
    http.get<QcStageSummaryDTO[]>('/qc/cockpit/stageRejectionSummary', params),
}
