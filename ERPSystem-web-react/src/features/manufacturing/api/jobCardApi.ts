import { http } from '@core/api/client'

export interface JobCardTimeLogDTO {
  id?: number
  jobCardId: number
  workOrderId: number
  operatorId?: number
  operatorName?: string
  shiftCode: 'MORNING' | 'EVENING' | 'NIGHT' | 'GENERAL' | string
  logType: 'SETUP' | 'RUN' | 'PAUSE' | string
  startTime: string
  endTime?: string
  durationMinutes: number
  completedQty: number
  rejectedQty: number
  remark?: string
}

export interface JobCardRejectionDTO {
  id?: number
  jobCardId: number
  workOrderId: number
  workOrderOperationId: number
  rejectionReasonCode: string
  rejectionReasonDesc?: string
  rejectedQty: number
  operatorId?: number
  operatorName?: string
  loggedTime?: string
  remark?: string
}

export interface MachineDowntimeDTO {
  id?: number
  workstationId: number
  workstationName?: string
  jobCardId?: number
  downtimeCategory: string
  reason: string
  startTime: string
  endTime?: string
  durationMinutes?: number
  operatorId?: number
  operatorName?: string
  shiftCode?: string
  status: 'OPEN' | 'RESOLVED'
  remark?: string
}

export interface JobCardDTO {
  id?: number
  jobCardNumber: string
  workOrderId: number
  workOrderOperationId: number
  operationSeq: number
  operationName: string
  workstationId?: number
  workstationName?: string
  operatorId?: number
  operatorName?: string
  plannedQty: number
  completedQty: number
  rejectedQty: number
  toolMoldReference?: string
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startTime?: string
  endTime?: string
  totalActualRunMins: number
  totalActualSetupMins: number
  totalActualDowntimeMins: number
  remark?: string
  workOrderNumber?: string
  materialName?: string
  timeLogs?: JobCardTimeLogDTO[]
  rejections?: JobCardRejectionDTO[]
}

export const REJECTION_REASONS = [
  { code: 'DIMENSIONAL_DEFECT', label: 'Dimensional Defect (Out of tolerance)' },
  { code: 'POROSITY', label: 'Porosity (Casting/Molding air voids)' },
  { code: 'SURFACE_DEFECT', label: 'Surface Defect (Scratches/Dents)' },
  { code: 'BURR_FLASH', label: 'Burr / Flash (Excess parting line material)' },
  { code: 'TOOL_WEAR', label: 'Tool Wear (Blunt tool/Chatter marks)' },
  { code: 'MATERIAL_DEFECT', label: 'Raw Material Defect (Impurities/Flaws)' },
  { code: 'SETUP_SCRAP', label: 'Setup Scrap (Trial/Calibration units)' },
  { code: 'OPERATOR_ERROR', label: 'Operator Handling Error' },
  { code: 'OTHER', label: 'Other / Unspecified Scrap' },
]

export const DOWNTIME_CATEGORIES = [
  { code: 'MACHINE_BREAKDOWN', label: 'Machine Breakdown (Mechanical/Electrical failure)' },
  { code: 'TOOL_CHANGE_MAINTENANCE', label: 'Tool Change / Sharpening / Die swap' },
  { code: 'POWER_OUTAGE', label: 'Power Cut / Electrical Interruption' },
  { code: 'MATERIAL_STARVATION', label: 'Material Starvation (Waiting on staging/WIP)' },
  { code: 'OPERATOR_UNAVAILABLE', label: 'Operator Absence / Handover' },
  { code: 'PREVENTIVE_MAINTENANCE', label: 'Scheduled Cleaning / Lubrication' },
  { code: 'OTHER', label: 'Other Operational Stoppage' },
]

export const SHIFT_OPTIONS = [
  { code: 'MORNING', label: 'Morning Shift (06:00 - 14:00)' },
  { code: 'EVENING', label: 'Evening Shift (14:00 - 22:00)' },
  { code: 'NIGHT', label: 'Night Shift (22:00 - 06:00)' },
  { code: 'GENERAL', label: 'General Day Shift (09:00 - 17:30)' },
]

export const jobCardApi = {
  list: (params: {
    workOrderId?: number
    jobCardNumber?: string
    workstationId?: number
    operatorId?: number
    status?: string
    currentPage?: number
    pageSize?: number
  }) => {
    return http.get('/jobCard/list', { params })
  },

  getById: (id: number) => {
    return http.get('/jobCard/getById', { params: { id } })
  },

  byWorkOrder: (workOrderId: number) => {
    return http.get('/jobCard/byWorkOrder', { params: { workOrderId } })
  },

  generate: (workOrderId: number) => {
    return http.post('/jobCard/generate', { workOrderId })
  },

  assign: (data: {
    jobCardId: number
    workstationId?: number
    operatorId?: number
    toolMoldReference?: string
  }) => {
    return http.post('/jobCard/assign', data)
  },

  start: (data: { jobCardId: number; shiftCode?: string }) => {
    return http.post('/jobCard/start', data)
  },

  pause: (data: {
    jobCardId: number
    reason?: string
    downtimeCategory?: string
  }) => {
    return http.post('/jobCard/pause', data)
  },

  resume: (data: { jobCardId: number; shiftCode?: string }) => {
    return http.post('/jobCard/resume', data)
  },

  complete: (data: {
    jobCardId: number
    completedQty?: number
    rejectedQty?: number
    remark?: string
  }) => {
    return http.post('/jobCard/complete', data)
  },

  recordRejection: (data: {
    jobCardId: number
    rejectionReasonCode: string
    rejectionReasonDesc?: string
    rejectedQty: number
    remark?: string
  }) => {
    return http.post('/jobCard/rejection/add', data)
  },

  startDowntime: (data: {
    workstationId: number
    jobCardId?: number
    downtimeCategory: string
    reason: string
    shiftCode?: string
  }) => {
    return http.post('/jobCard/downtime/start', data)
  },

  resolveDowntime: (data: { downtimeId: number }) => {
    return http.post('/jobCard/downtime/resolve', data)
  },
}
