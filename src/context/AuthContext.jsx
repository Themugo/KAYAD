import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Navigate, useLocation } from 'react-router-dom';
import { logSecurityEvent, SecurityEvents, initSessionMonitor } from '../utils/security';

const AuthCtx = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const initialLoadDone = useRef(false);

  // Session timeout monitoring
  useEffect(() => {
    if (!user) return;

    const cleanup = initSessionMonitor(
      () => setSessionWarning(true), // Warning 5 min before timeout
      async () => {
        // Session expired
        logSecurityEvent(SecurityEvents.SESSION_EXPIRED, { userId: user.id });
        await supabase.auth.signOut();
        setUserState(null);
        window.location.href = '/login?reason=session_expired';
      }
    );

    return cleanup;
  }, [user?.id]);

  // Handle auth state changes with security logging
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setUserState(profile);
          logSecurityEvent(SecurityEvents.LOGIN_SUCCESS, { userId: session.user.id });
        }
      }
      initialLoadDone.current = true;
      if (mounted) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (initialLoadDone.current && event === 'INITIAL_SESSION') return;

      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          logSecurityEvent(SecurityEvents.LOGOUT, { userId: user?.id });
          setUserState(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (mounted) setUserState(profile);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Secure login with ban check
  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      logSecurityEvent(SecurityEvents.LOGIN_FAILED, { email, reason: error.message });
      throw { response: { status: 401, data: { message: error.message } } };
    }

    const profile = await fetchProfile(data.user.id);
    
    // Check if account is banned
    if (profile?.is_banned) {
      await supabase.auth.signOut();
      logSecurityEvent(SecurityEvents.LOGIN_FAILED, { 
        email, 
        reason: 'Account suspended',
        userId: data.user.id 
      });
      throw { response: { status: 403, data: { message: 'Your account has been suspended' } } };
    }

    // Check if email is verified
    if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
      throw { response: { status: 403, data: { message: 'Please verify your email before logging in' } } };
    }

    setUserState(profile);
    return { user: profile };
  }, []);

  // Secure registration with validation
  const register = useCallback(async (body) => {
    // Validate input
    if (!body.email || !body.password) {
      throw { response: { status: 400, data: { message: 'Email and password are required' } } };
    }
    
    if (body.password.length < 8) {
      throw { response: { status: 400, data: { message: 'Password must be at least 8 characters' } } };
    }

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name || '',
          role: body.role || 'user',
          phone: body.phone || '',
          location: body.location || '',
          business_name: body.businessName || '',
        },
      },
    });
    
    if (error) {
      logSecurityEvent(SecurityEvents.LOGIN_FAILED, { 
        email: body.email, 
        reason: error.message 
      });
      throw { response: { status: 400, data: { message: error.message } } };
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      setUserState(profile);
      return { user: profile };
    }
    return { user: null };
  }, []);

  // Secure logout
  const logout = useCallback(async () => {
    logSecurityEvent(SecurityEvents.LOGOUT, { userId: user?.id });
    await supabase.auth.signOut();
    setUserState(null);
    setSessionWarning(false);
  }, [user?.id]);

  // Update user state
  const setUser = useCallback((u) => setUserState(u), []);

  // Role checks
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isDealer = user?.role === 'dealer' || user?.role === 'broker' || user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isBroker = user?.role === 'broker';
  const isInspector = user?.role === 'inspector';
  const isSupport = user?.role === 'technical_support' || user?.role === 'support';
  const isAuth = !!user;

  return (
    <AuthCtx.Provider value={{ 
      user, 
      loading, 
      isAuth, 
      isAdmin, 
      isDealer, 
      isSuperAdmin, 
      isBroker,
      isInspector,
      isSupport,
      sessionWarning,
      login, 
      register, 
      logout, 
      setUser 
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children }) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isAuth) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function RequireDealer({ children }) {
  const { isDealer, loading, isAuth } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!isDealer) return <Navigate to="/" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading, isAuth } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    logSecurityEvent(SecurityEvents.PERMISSION_DENIED, { 
      required: 'admin', 
      userRole: useAuth().user?.role 
    });
    return <Navigate to="/" replace />;
  }
  return children;
}

export function RequireRole({ children, roles }) {
  const { user, loading, isAuth } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.role)) {
    logSecurityEvent(SecurityEvents.PERMISSION_DENIED, { 
      required: roles, 
      userRole: user?.role 
    });
    return <Navigate to="/" replace />;
  }
  return children;
}
