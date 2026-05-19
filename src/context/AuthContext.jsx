// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api/api';
import { setSentryUser, clearSentryUser } from '../utils/sentry';
import { STAFF_ROLES, isSellerRole } from '../utils/authRoutes';

const AuthCtx = createContext(null);

// Decode JWT payload (no validate — just read the claims)
const decodeToken = (t) => {
  try { return JSON.parse(atob(t.split('.')[1])); }
  catch { return null; }
};

// Normalize user object to always have both _id and id fields
const normalizeUser = (u) => {
  if (!u) return null;
  const id = u._id || u.id;
  return { ...u, _id: id, id: id };
};

export function AuthProvider({ children }) {
  const [user, setUserState]  = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('kayad_token'));
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const setUser = (u) => {
    setUserState(u);
    if (u) setSentryUser(u);   // track user in Sentry
    else   clearSentryUser();
  };

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('kayad_token');
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // Proactive token refresh — decode exp and refresh before it expires
  const scheduleRefresh = useCallback((t) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const payload = decodeToken(t);
    if (!payload?.exp) return;
    const expiresInMs = payload.exp * 1000 - Date.now();
    const refreshAt = Math.max(expiresInMs - 5 * 60 * 1000, 10000); // 5 min before expiry, min 10s
    refreshTimer.current = setTimeout(async () => {
      try {
        const data = await authAPI.refresh();
        if (data?.token) {
          localStorage.setItem('kayad_token', data.token);
          setToken(data.token);
        }
      } catch { /* refresh will be retried via Axios interceptor on next 401 */ }
    }, refreshAt);
  }, []);

  // On mount: validate token and fetch user profile
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    const handleAuthExpired = () => clearAuthState();
    window.addEventListener('kayad:auth-expired', handleAuthExpired);

    if (token) {
      authAPI.me()
        .then(data => setUser(normalizeUser(data.user)))
        .catch(() => clearAuthState())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    initialLoadDone.current = true;

    return () => {
      window.removeEventListener('kayad:auth-expired', handleAuthExpired);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [clearAuthState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch token changes to schedule proactive refresh
  useEffect(() => {
    if (token) scheduleRefresh(token);
  }, [token, scheduleRefresh]);

  const login = useCallback(async ({ email, password }) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem('kayad_token', data.token);
    setToken(data.token);
    setUser(normalizeUser(data.user));
    return data;
  }, []);

  const register = useCallback(async (body) => {
    const data = await authAPI.register(body);
    localStorage.setItem('kayad_token', data.token);
    setToken(data.token);
    setUser(normalizeUser(data.user));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    clearAuthState();
  }, [clearAuthState]);

  const isAdmin       = STAFF_ROLES.includes(user?.role);
  const isDealer      = user?.role === 'dealer';
  const isBroker      = user?.role === 'broker';
  const isSeller      = isSellerRole(user?.role);
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

export function RequireAuth({ children }) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function RequireDealer({ children }) {
  const { isDealer, isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isDealer && !isAdmin) return <Navigate to="/" replace />;
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
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
      <div style={{ fontSize:'4rem' }}>🚫</div>
      <h1 style={{ fontSize:'2rem', fontWeight:'bold' }}>Access Denied</h1>
      <p style={{ color:'#888', maxWidth:'400px' }}>You don't have permission to access this area. Contact your administrator if you believe this is an error.</p>
    </div>
  );
  return children;
}
