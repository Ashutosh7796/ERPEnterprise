import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SupportSessionDto,
  SupportAttendanceDto,
  getMyActiveSession,
  getMyAttendance,
  pauseSupportSession,
  resumeSupportSession,
  endSupportSession,
} from '../api/supportApi';
import { message } from 'antd';

interface SupportState {
  activeSession: SupportSessionDto | null;
  attendance: SupportAttendanceDto | null;
  shiftWorkingSeconds: number;
  isLoading: boolean;
  
  // Actions
  fetchActiveSession: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  setActiveSession: (session: SupportSessionDto | null) => void;
  pauseCurrentSession: () => Promise<boolean>;
  resumeCurrentSession: () => Promise<boolean>;
  endCurrentSession: () => Promise<boolean>;
  incrementWorkingSeconds: () => void;
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      attendance: null,
      shiftWorkingSeconds: 0,
      isLoading: false,

      fetchActiveSession: async () => {
        try {
          set({ isLoading: true });
          const res: any = await getMyActiveSession();
          if (res && res.code === 200 && res.data?.activeSession) {
            set({ activeSession: res.data.activeSession });
          } else {
            set({ activeSession: null });
          }
        } catch (e) {
          // silently handle or keep local
        } finally {
          set({ isLoading: false });
        }
      },

      fetchAttendance: async () => {
        try {
          const res: any = await getMyAttendance();
          if (res && res.code === 200 && res.data?.attendance) {
            const att = res.data.attendance;
            set({
              attendance: att,
              shiftWorkingSeconds: att.workingSeconds || 0,
            });
          }
        } catch (e) {
          // ignore
        }
      },

      setActiveSession: (session) => {
        set({ activeSession: session });
      },

      pauseCurrentSession: async () => {
        const { activeSession } = get();
        if (!activeSession) return false;
        try {
          const res: any = await pauseSupportSession(activeSession.sessionCode || activeSession.supportToken || '');
          if (res && res.code === 200) {
            message.success('Support session paused');
            set({
              activeSession: {
                ...activeSession,
                status: 'PAUSED',
                pausedAt: new Date().toISOString(),
              },
            });
            return true;
          }
        } catch (e: any) {
          message.error(e.message || 'Failed to pause session');
        }
        return false;
      },

      resumeCurrentSession: async () => {
        const { activeSession } = get();
        if (!activeSession) return false;
        try {
          const res: any = await resumeSupportSession(activeSession.sessionCode || activeSession.supportToken || '');
          if (res && res.code === 200) {
            message.success('Support session resumed');
            set({
              activeSession: {
                ...activeSession,
                status: 'ACTIVE',
                resumedAt: new Date().toISOString(),
              },
            });
            return true;
          }
        } catch (e: any) {
          message.error(e.message || 'Failed to resume session');
        }
        return false;
      },

      endCurrentSession: async () => {
        const { activeSession } = get();
        if (!activeSession) return false;
        try {
          const res: any = await endSupportSession(activeSession.sessionCode || activeSession.supportToken || '');
          if (res && res.code === 200) {
            message.success('Support session completed and ended');
            set({ activeSession: null });
            // Refresh attendance
            get().fetchAttendance();
            return true;
          }
        } catch (e: any) {
          message.error(e.message || 'Failed to end session');
        }
        return false;
      },

      incrementWorkingSeconds: () => {
        set((state) => ({ shiftWorkingSeconds: state.shiftWorkingSeconds + 1 }));
      },
    }),
    {
      name: 'erp_support_store',
      partialize: (state) => ({
        activeSession: state.activeSession,
      }),
    }
  )
);
