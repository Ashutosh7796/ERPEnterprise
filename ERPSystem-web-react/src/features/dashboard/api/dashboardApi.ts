import { useQuery } from '@tanstack/react-query'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'
import type {
  DashboardActivity,
  DashboardContext,
  DashboardFinancial,
  DashboardPosition,
  DashboardSummary,
} from './dashboardTypes'

export interface DashboardDateRange {
  startDate: string
  endDate: string
}

type DashboardResponse<T> = T & { code?: number; data?: T; msg?: string }

export const fetchDashboardContext = () =>
  http.get<DashboardResponse<DashboardContext>>(ENDPOINTS.DASHBOARD.CONTEXT)

export const fetchDashboardSummary = (range: DashboardDateRange) =>
  http.get<DashboardResponse<DashboardSummary>>(ENDPOINTS.DASHBOARD.SUMMARY, { params: range })

export const fetchDashboardFinancial = (range: DashboardDateRange) =>
  http.get<DashboardResponse<DashboardFinancial>>(ENDPOINTS.DASHBOARD.FINANCIAL, { params: range })

export const fetchDashboardPosition = (range: DashboardDateRange) =>
  http.get<DashboardResponse<DashboardPosition>>(ENDPOINTS.DASHBOARD.POSITION, { params: range })

export const fetchDashboardActivity = (range: DashboardDateRange, limit?: number) =>
  http.get<DashboardResponse<DashboardActivity>>(ENDPOINTS.DASHBOARD.ACTIVITY, {
    params: { ...range, limit },
  })

export const dashboardQueryKeys = {
  context: ['dashboard', 'context'] as const,
  summary: (range: DashboardDateRange) => ['dashboard', 'summary', range] as const,
  financial: (range: DashboardDateRange) => ['dashboard', 'financial', range] as const,
  position: (range: DashboardDateRange) => ['dashboard', 'position', range] as const,
  activity: (range: DashboardDateRange, limit?: number) =>
    ['dashboard', 'activity', range, limit] as const,
}

export function useDashboardContext() {
  return useQuery({
    queryKey: dashboardQueryKeys.context,
    queryFn: fetchDashboardContext,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboardSummary(range: DashboardDateRange) {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(range),
    queryFn: () => fetchDashboardSummary(range),
  })
}

export function useDashboardFinancial(range: DashboardDateRange) {
  return useQuery({
    queryKey: dashboardQueryKeys.financial(range),
    queryFn: () => fetchDashboardFinancial(range),
  })
}

export function useDashboardPosition(range: DashboardDateRange) {
  return useQuery({
    queryKey: dashboardQueryKeys.position(range),
    queryFn: () => fetchDashboardPosition(range),
  })
}

export function useDashboardActivity(range: DashboardDateRange, limit = 10) {
  return useQuery({
    queryKey: dashboardQueryKeys.activity(range, limit),
    queryFn: () => fetchDashboardActivity(range, limit),
  })
}