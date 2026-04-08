import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { supabase } from '../config/supabase';

export const useAuth = () => {
  const { user, loading, error, setUser, setUserProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    let timeout;

    const initAuth = async () => {
      try {
        console.log('useAuth: Starting initialization');
        
        // Set a timeout to force loading to false after 3 seconds
        timeout = setTimeout(() => {
          if (mounted) {
            console.log('useAuth: Timeout reached, forcing loading to false');
            setLoading(false);
          }
        }, 3000);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('useAuth: Session retrieved', { hasSession: !!session, error: sessionError });
        
        if (mounted) {
          clearTimeout(timeout);
          setUser(session?.user || null);
          
          if (session?.user) {
            // Use auth metadata directly
            const role = session.user.user_metadata?.role || 'employee';
            setUserProfile({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              role: role,
              organization_id: session.user.user_metadata?.organization_id || null,
              manager_id: session.user.user_metadata?.manager_id || null,
              department_id: session.user.user_metadata?.department_id || null,
            });
          } else {
            setUserProfile(null);
          }
          
          console.log('useAuth: Setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        console.error('useAuth: Initialization error:', err);
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('useAuth: Auth state changed', { event: _event, hasSession: !!session });
        if (mounted) {
          setUser(session?.user || null);
          
          if (session?.user) {
            const role = session.user.user_metadata?.role || 'employee';
            setUserProfile({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              role: role,
              organization_id: session.user.user_metadata?.organization_id || null,
              manager_id: session.user.user_metadata?.manager_id || null,
              department_id: session.user.user_metadata?.department_id || null,
            });
          } else {
            setUserProfile(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [setUser, setUserProfile, setLoading]);

  return { user, loading, error, isAuthenticated: !!user };
};
