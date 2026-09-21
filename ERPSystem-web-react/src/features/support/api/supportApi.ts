import { http } from '@core/api/client';

export interface SupportSessionDto {
  id?: number;
  sessionCode: string;
  supportToken?: string;
  tenantId: number;
  tenantName: string;
  operatorUserId?: number;
  operatorName?: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'PAUSED' | 'ESCALATED' | 'TRANSFERRED' | 'ENDED' | 'TIMED_OUT';
  accessMode: 'READ_ONLY' | 'APPROVED_WRITE';
  moduleScope: string;
  depotId?: number | null;
  orgId?: number | null;
  category?: string;
  priority?: string;
  ticketId?: string;
  justification: string;
  durationMinutes: number;
  remainingSeconds?: number;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  endedAt?: string;
  activeSeconds?: number;
}

export interface SupportAttendanceDto {
  userId: number;
  loginName: string;
  workDate?: string;
  clockInTime?: string;
  clockInTimestamp?: number;
  clockOutTime?: string;
  sessionsHandledToday: number;
  shiftStatus: 'ONLINE' | 'ON_SUPPORT' | 'ON_BREAK' | 'OFFLINE';
  workingSeconds: number;
  formattedWorkingHours: string;
}

export interface OperatorDto {
  id: number;
  loginName: string;
  userName: string;
  email?: string;
  phoneNum?: string;
  status: number;
  isSuperAdmin: boolean;
  isSystemSupport: boolean;
  roleName: string;
  attendance: SupportAttendanceDto;
}

export interface SupportPolicyMap {
  [key: string]: string;
}

export interface SupportAnalyticsDto {
  activeSessionsCount: number;
  totalOperatorsCount: number;
  operatorsOnlineCount: number;
  totalSessionsToday: number;
  avgResolutionMinutes: number;
  healthScorePercent: number;
}

// 1. Session Lifecycle APIs
export const startSupportSession = (params: {
  targetTenantId: number;
  justification: string;
  moduleScope?: string;
  dataScopeDepotId?: number;
  dataScopeOrgId?: number;
  accessMode?: string;
  durationMinutes?: number;
  category?: string;
  priority?: string;
  ticketId?: string;
}) => {
  return http.post<{ supportSession: SupportSessionDto }>('/support/session/start', params);
};

export const pauseSupportSession = (sessionCode: string) => {
  return http.post<{ success: boolean }>('/support/session/pause', { sessionCode });
};

export const resumeSupportSession = (sessionCode: string) => {
  return http.post<{ success: boolean }>('/support/session/resume', { sessionCode });
};

export const endSupportSession = (sessionCode: string) => {
  return http.post<{ success: boolean }>('/support/session/end', { sessionCode });
};

export const transferSupportSession = (sessionCode: string, targetUserId: number, reason: string) => {
  return http.post<{ success: boolean }>('/support/session/transfer', { sessionCode, targetUserId, reason });
};

export const escalateSupportSession = (sessionCode: string, escalationTeam: string, notes: string) => {
  return http.post<{ success: boolean }>('/support/session/escalate', { sessionCode, escalationTeam, notes });
};

export const getMyActiveSession = () => {
  return http.get<{ activeSession: SupportSessionDto | null }>('/support/session/my-active');
};

export const getActiveSessions = () => {
  return http.get<{ sessions: SupportSessionDto[] }>('/support/session/active');
};

export const getSessionHistory = (params?: { tenantId?: number; operatorUserId?: number; status?: string; page?: number; size?: number }) => {
  return http.get<{ rows: SupportSessionDto[]; total: number }>('/support/session/history', { params });
};

// 2. Operators & Workforce Directory
export const getOperatorsList = () => {
  return http.get<{ staff: OperatorDto[] }>('/support/operators');
};

export const getOperatorDossier = (operatorId: number) => {
  return http.get<{ dossier: { profile: any; attendance: SupportAttendanceDto; activeSession: SupportSessionDto | null; recentSessions: SupportSessionDto[] } }>(`/support/operators/${operatorId}/dossier`);
};

export const registerSupportStaff = (data: { loginName: string; userName: string; password: string; email?: string; phoneNum?: string; roleType: string }) => {
  return http.post<{ user: any }>('/support/registerStaff', data);
};

// 3. Attendance & Policies
export const getMyAttendance = (userId?: number) => {
  return http.get<{ attendance: SupportAttendanceDto }>('/support/attendance/my', { params: { userId } });
};

export const getAttendanceRoster = () => {
  return http.get<{ roster: SupportAttendanceDto[] }>('/support/attendance/roster');
};

export const getSupportPolicies = () => {
  return http.get<{ policies: SupportPolicyMap }>('/support/policies');
};

export const updateSupportPolicy = (key: string, value: string) => {
  return http.post<{ success: boolean }>('/support/policies/update', { key, value });
};

// 4. Analytics & Diagnostics
export const getSupportAnalytics = () => {
  return http.get<{ analytics: SupportAnalyticsDto }>('/support/analytics');
};

export const runDiagnostics = (targetTenantId?: number, subsystem?: string) => {
  return http.post<{ report: any }>('/support/diagnostics/run', { targetTenantId, subsystem });
};

export const executeDataRepair = (targetTenantId: number, repairAction: string) => {
  return http.post<{ result: any }>('/support/diagnostics/repair', { targetTenantId, repairAction });
};

export const approveSupportSession = (sessionCode: string) => {
  return http.post<{ success: boolean }>('/support/session/approve', { sessionCode });
};

export const rejectSupportSession = (sessionCode: string, reason?: string) => {
  return http.post<{ success: boolean }>('/support/session/reject', { sessionCode, reason });
};

export const getTenantPendingRequests = (tenantId?: number) => {
  return http.get<{ requests: any[] }>('/support/tenant/pending-requests', { params: { tenantId } });
};

export const getTenantList = (params?: any) => {
  return http.get<{ rows: any[]; total: number }>('/tenant/list', { params });
};
