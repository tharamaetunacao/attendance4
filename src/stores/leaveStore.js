import { create } from 'zustand';
import { getLeaveRequests, getLeaveBalance, requestLeave, updateLeaveRequest, deleteLeaveRequest } from '../services/supabaseService';

export const useLeaveStore = create((set) => ({
  leaveRequests: [],
  leaveBalance: null,
  loading: false,
  error: null,

  fetchLeaveRequests: async (userId, role) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getLeaveRequests(userId, role);
      if (error) throw error;
      set({ leaveRequests: data || [] });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchLeaveBalance: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await getLeaveBalance(userId);
      if (error) throw error;
      set({ leaveBalance: data || [] });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  submitLeaveRequest: async (leaveData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await requestLeave(leaveData);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      set({ error: error.message });
      return { data: null, error };
    } finally {
      set({ loading: false });
    }
  },

  updateLeaveRequest: async (leaveRequestId, updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await updateLeaveRequest(leaveRequestId, updates);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      set({ error: error.message });
      return { data: null, error };
    } finally {
      set({ loading: false });
    }
  },

  deleteLeaveRequest: async (leaveRequestId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await deleteLeaveRequest(leaveRequestId);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      set({ error: error.message });
      return { data: null, error };
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    leaveRequests: [],
    leaveBalance: null,
    loading: false,
    error: null,
  }),
}));
