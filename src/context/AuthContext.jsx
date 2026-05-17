// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/api';
import { setSentryUser, clearSentryUser } from '../utils/sentry';

const AuthCtx = createContext(null);
export const STAFF_ROLES = ["admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"];

export function AuthProvider({ children }) {
  const [user, setUserState]  = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('kayad_token'));
  const [loading, setLoading] = useState(true);

  const setUser = (u) => {
    setUserState(u);
    if (u) setSentryUser(u);   // track user in Sentry
    else   clearSentryUser();
  };

  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(data => setUser(data.user))
        .catch(() => { localStorage.removeItem('kayad_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem('kayad_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (body) => {
    const data = await authAPI.register(body);
    localStorage.setItem('kayad_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('kayad_token');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin       = STAFF_ROLES.includes(user?.role);
  const isDealer      = user?.role === 'dealer';
  const isBroker      = user?.role === 'broker';
  const isSeller      = user?.role === 'dealer' || user?.role === 'broker';
  const isSuperAdmin  = user?.role === 'superadmin';
  const isMarketing   = user?.role === 'marketing';
  const isTechSupport = user?.role === 'technical_support';
  const isHR          = user?.role === 'hr';
  const isAccounts    = user?.role === 'accounts';
  const isEscrowOfficer = user?.role === 'escrow_officer';
  const isAdManager   = user?.role === 'ad_manager';
  const isAuth        = !!user;

  return (
    <AuthCtx.Provider value={{ user, token, loading, isAuth, isAdmin, isDealer, isSuperAdmin, isBroker, isSeller, isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager, login, register, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth({ children }) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function RequireDealer({ children }) {
  const { isDealer, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isDealer) return <Navigate to="/" replace />;
  return children;
}

export function RequireSeller({ children }) {
  const { isSeller, user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isSeller) return <Navigate to="/" replace />;
  // Unapproved dealer/broker → send to waiting room in register page
  if (!user?.approved) return <Navigate to="/register" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, isAuth, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  // Not logged in → send to login
  if (!isAuth) return <Navigate to="/login" replace />;
  // Logged in but not admin → show 403 instead of silent redirect
  if (!isAdmin) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
      <div style={{ fontSize:'4rem' }}>🚫</div>
      <h1 style={{ fontSize:'2rem', fontWeight:'bold' }}>Access Denied</h1>
      <p style={{ color:'#888', maxWidth:'400px' }}>You don't have permission to access this area. Contact your administrator if you believe this is an error.</p>
      <Navigate to="/" replace />
    </div>
  );
  return children;
}
