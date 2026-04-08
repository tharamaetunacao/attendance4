import { create } from 'zustand';
import { supabase } from '../config/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ user: data.user, isAuthenticated: true, error: null });
      
      // Try to fetch user profile from users table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (!profileError && profileData) {
          set({ userProfile: profileData });
        } else {
          // Fallback to auth metadata if users table query fails
          const role = data.user.user_metadata?.role || 'employee';
          set({ 
            userProfile: {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || '',
              role: role,
              organization_id: data.user.user_metadata?.organization_id || null,
              manager_id: data.user.user_metadata?.manager_id || null,
              department_id: data.user.user_metadata?.department_id || null,
            }
          });
        }
      } catch (err) {
        // Fallback to auth metadata on error
        const role = data.user.user_metadata?.role || 'employee';
        set({ 
          userProfile: {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || '',
            role: role,
            organization_id: data.user.user_metadata?.organization_id || null,
            manager_id: data.user.user_metadata?.manager_id || null,
            department_id: data.user.user_metadata?.department_id || null,
          }
        });
      }
      
      return data.user;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, userProfile: null, isAuthenticated: false });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  signup: async (email, password, fullName, organizationId, managerId = null, departmentId = null, role = 'employee') => {
    set({ loading: true, error: null });
    try {
      console.log('Auth signup starting...', { email, fullName, organizationId, role });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login-portal`,
          data: {
            full_name: fullName,
            organization_id: organizationId,
            manager_id: managerId,
            department_id: departmentId,
            role: role,
          },
        },
      });
      
      if (error) {
        console.error('Auth signup error:', error);
        throw error;
      }
      
      console.log('Auth signup successful, user ID:', data.user?.id);
      console.log('Email confirmation required - user should receive verification email');
      
      // User is created in auth, profile data will be synced on first login
      // The auth metadata contains role, organization_id, manager_id, department_id
      console.log('User registered with role:', role);
      
      set({ user: data.user, isAuthenticated: !!data.user, error: null });
      return data.user;
    } catch (error) {
      console.error('Signup exception:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      set({ error: null });
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updatePassword: async (newPassword) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
