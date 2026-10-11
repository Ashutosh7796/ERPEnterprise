import { http } from '@core/api/client'

export interface OeeSummaryDTO {
  overallOeePct: number
  overallAvailabilityPct: number
  overallPerformancePct: number
  overallQualityPct: number
  overallUtilizationPct: number
  totalPlannedProductionMins: number
  totalActualRunMins: number
  totalActualSetupMins: number
  totalDowntimeMins: number
  totalIdleMins: number
  totalOutputQty: number
  goodOutputQty: number
  rejectedOutputQty: number
  activeWorkstationCount: number
  startDate: string
  endDate: string
}

export interface MachineOeeDetailDTO {
  workstationId: number
  workstationCode: string
  workstationName: string
  workCenterType: string
  plannedMins: number
  runMins: number
  setupMins: number
  downtimeMins: number
  idleMins: number
  totalQty: number
  goodQty: number
  rejectedQty: number
  availabilityPct: number
  performancePct: number
  qualityPct: number
  oeePct: number
  utilizationPct: number
  healthStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'NO_RUN' | string
}

export interface OeeTrendDTO {
  metricDate: string
  availabilityPct: number
  performancePct: number
  qualityPct: number
  oeePct: number
  utilizationPct: number
}

export interface OeeDashboardResponse {
  summary: OeeSummaryDTO
  machineDetails: MachineOeeDetailDTO[]
  trends: OeeTrendDTO[]
}

export interface MachineUtilizationDTO {
  workstationId: number
  workstationCode: string
  workstationName: string
  workCenterType: string
  scheduledCapacityMins: number
  runMins: number
  setupMins: number
  downtimeMins: number
  idleMins: number
  operationalUtilizationPct: number
  calendarUtilizationPct: number
}

export interface DowntimeParetoDTO {
  downtimeCategory: string
  reason: string
  durationMinutes: number
  occurrenceCount: number
  percentageOfTotal: number
  cumulativePercentage: number
}

export interface RecalculateOeeParams {
  startDate?: string
  endDate?: string
  workstationId?: number
}

export const oeeAnalyticsApi = {
  getOeeDashboard: async (params?: {
    startDate?: string
    endDate?: string
    workstationId?: number
    shiftCode?: string
  }): Promise<OeeDashboardResponse> => {
    const res = await http.get<{ code: number; data: OeeDashboardResponse }>('/oee_analytics/dashboard', {
      params,
    })
    return res.data
  },

  getMachineUtilization: async (params?: {
    startDate?: string
    endDate?: string
    workCenterType?: string
  }): Promise<MachineUtilizationDTO[]> => {
    const res = await http.get<{ code: number; data: MachineUtilizationDTO[] }>('/oee_analytics/machine_utilization', {
      params,
    })
    return res.data || []
  },

  getDowntimePareto: async (params?: {
    startDate?: string
    endDate?: string
    workstationId?: number
  }): Promise<DowntimeParetoDTO[]> => {
    const res = await http.get<{ code: number; data: DowntimeParetoDTO[] }>('/oee_analytics/downtime_pareto', {
      params,
    })
    return res.data || []
  },

  recalculateMetrics: async (body: RecalculateOeeParams): Promise<{ rowsProcessed: number }> => {
    const res = await http.post<{ code: number; data: { rowsProcessed: number } }>('/oee_analytics/recalculate', body)
    return res.data
  },
}
