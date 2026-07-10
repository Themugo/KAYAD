// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Navigate, useLocation } from 'react-router-dom';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (mounted) setUserState(profile);
      }
      if (mounted) setLoading(false);
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          setUserState(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
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

  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { status: 401, data: { message: error.message } } };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      throw { response: { status: 403, data: { message: 'Your account has been suspended' } } };
    }

    setUserState(profile);
    return { user: profile };
  }, []);

  const register = useCallback(async (body) => {
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name,
          role: body.role || 'user',
          phone: body.phone || '',
          location: body.location || '',
          business_name: body.businessName || '',
        },
      },
    });
    if (error) throw { response: { status: 400, data: { message: error.message } } };

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      setUserState(profile);
      return { user: profile };
    }
    return { user: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUserState(null);
  }, []);

  const setUser = useCallback((u) => setUserState(u), []);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isDealer = user?.role === 'dealer' || user?.role === 'broker' || user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isBroker = user?.role === 'broker';
  const isAuth = !!user;

  return (
    <AuthCtx.Provider value={{ user, loading, isAuth, isAdmin, isDealer, isSuperAdmin, isBroker, login, register, logout, setUser }}>
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
  const { isDealer, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isDealer) return <Navigate to="/" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
