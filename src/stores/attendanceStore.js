import { create } from 'zustand';
import { getTodayAttendance, getAttendanceRecords } from '../services/supabaseService';

export const useAttendanceStore = create((set) => ({
  todayAttendance: null,
  monthlyAttendance: [],
  loading: false,
  error: null,

  fetchTodayAttendance: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getTodayAttendance(userId);
      if (error) throw error;
      set({ todayAttendance: data?.[0] || null });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMonthlyAttendance: async (userId, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getAttendanceRecords(userId, startDate, endDate);
      if (error) throw error;
      set({ monthlyAttendance: data || [] });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    todayAttendance: null,
    monthlyAttendance: [],
    loading: false,
    error: null,
  }),
}));
