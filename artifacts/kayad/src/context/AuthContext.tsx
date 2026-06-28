// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api/api';
import { setPostHogUser, clearPostHogUser } from '../utils/posthog';
import { STAFF_ROLES, isSellerRole, type User } from '../utils/authRoutes';
import {
  getEffectivePermissions,
  userHasPermission,
  PAGE_PERMISSIONS,
  SUPERADMIN_ONLY,
  type Permission,
} from '../utils/permissions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuth: boolean;
  isEmailVerified: boolean;
  isAdmin: boolean;
  isDealer: boolean;
  isSuperAdmin: boolean;
  isSeller: boolean;
  isMarketing: boolean;
  isTechSupport: boolean;
  isHR: boolean;
  isAccounts: boolean;
  isEscrowOfficer: boolean;
  isAdManager: boolean;
  permissions: Permission[];
  can: (perm: Permission) => boolean;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (body: any) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

// Normalize user object to always have both _id and id fields
const normalizeUser = (u: any): User | null => {
  if (!u) return null;
  const id = u._id || u.id;
  return { ...u, _id: id, id: id };
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) setPostHogUser(u);
    else   clearPostHogUser();
  };

  // On mount: fetch user via cookie-based auth (HttpOnly token cookie)
  useEffect(() => {
    const handleAuthExpired = () => { setUser(null); setLoading(false); };
    window.addEventListener('kayad:auth-expired', handleAuthExpired);

    authAPI.me()
      .then(data => setUser(normalizeUser(data.user)))
      .catch(() => { /* not authenticated — user stays null */ })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('kayad:auth-expired', handleAuthExpired);
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const data = await authAPI.login({ email, password });
    setUser(normalizeUser(data.user));
    setLoading(false);
    return data;
  }, []);

  const register = useCallback(async (body: any) => {
    const data = await authAPI.register(body);
    setUser(normalizeUser(data.user));
    setLoading(false);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (error) { console.error('Logout failed:', error); }
    setUser(null);
    setLoading(false);
  }, []);

  const isAdmin       = STAFF_ROLES.includes(user?.role as any);
  const isDealer      = user?.role === 'dealer';
  const isSeller      = isSellerRole(user?.role);
  const isSuperAdmin  = user?.role === 'superadmin';
  const isMarketing   = user?.role === 'marketing';
  const isTechSupport = user?.role === 'technical_support';
  const isHR          = user?.role === 'hr';
  const isAccounts    = user?.role === 'accounts';
  const isEscrowOfficer = user?.role === 'escrow_officer';
  const isAdManager   = user?.role === 'ad_manager';
  const isAuth        = !!user;
  const isEmailVerified = !!user?.emailVerified;

  // Effective permissions = role defaults ∪ granted − revoked (assigned by superadmin)
  const permissions = useMemo(() => getEffectivePermissions(user), [user]);
  const can = useCallback((perm: Permission) => userHasPermission(user, perm), [user]);

  const value = useMemo(() => ({
    user, loading,
    isAuth, isEmailVerified,
    isAdmin, isDealer, isSuperAdmin, isSeller,
    isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager,
    permissions, can,
    login, register, logout, setUser,
  }), [user, loading, isAuth, isEmailVerified, isAdmin, isDealer, isSuperAdmin, isSeller, isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager, permissions, can, login, register, logout, setUser]);

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function RequireDealer({ children }: RequireAuthProps) {
  const { isDealer, isAdmin, user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isDealer && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export function RequireSeller({ children }: RequireAuthProps) {
  const { isSeller, user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isSeller) return <Navigate to="/" replace />;
  return children;
}

export function RequireEmailVerified({ children }: RequireAuthProps) {
  const { isEmailVerified, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isEmailVerified) return <Navigate to="/login?verify=required" replace />;
  return children;
}

export function RequireAdmin({ children }: RequireAuthProps) {
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

// Granular admin guard — restricts specific admin pages to allowed roles
const ADMIN_PAGE_ROLES: Record<string, string[]> = {
  '/admin/panic-room':     ['superadmin'],
  '/admin/control-room':   ['superadmin', 'admin'],
  '/admin/webhoist':       ['superadmin'],
  '/admin/staff':          ['superadmin', 'admin', 'hr'],
  '/admin/settings':       ['superadmin', 'admin'],
  '/admin/security-log':   ['superadmin', 'admin'],
  '/admin/users':          ['superadmin', 'admin', 'technical_support', 'hr', 'moderator'],
  '/admin/transactions':   ['superadmin', 'admin', 'accounts', 'escrow_officer'],
  '/admin/escrows':        ['superadmin', 'admin', 'accounts', 'escrow_officer'],
  '/admin/escrow-vault':   ['superadmin', 'admin', 'accounts', 'escrow_officer'],
  '/admin/ads':            ['superadmin', 'admin', 'marketing', 'ad_manager'],
  '/admin/moderation':     ['superadmin', 'admin', 'moderator'],
  '/admin/cars':           ['superadmin', 'admin', 'moderator', 'technical_support'],
  '/admin/sellers':        ['superadmin', 'admin', 'hr'],
  '/admin/auctions':       ['superadmin', 'admin'],
  '/admin/bids':           ['superadmin', 'admin'],
  '/admin/inspections':    ['superadmin', 'admin', 'ghost_checker'],
  '/admin/ntsa-queue':     ['superadmin', 'admin'],
  '/admin/market-data':    ['superadmin', 'admin'],
  '/admin/reviews':        ['superadmin', 'admin', 'moderator'],
  '/admin/referrals':      ['superadmin', 'admin'],
  '/admin/chats':          ['superadmin', 'admin', 'moderator'],
};

interface RequireAdminPageProps extends RequireAuthProps {
  roles?: string[];
}

export function RequireAdminPage({ children, roles }: RequireAdminPageProps) {
  const { user, isAdmin, isAuth, loading, can } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const path = loc.pathname;

  // Superadmin sees everything
  if (user?.role === 'superadmin') return children;

  // Superadmin-only pages are never unlocked by a granted permission
  if (SUPERADMIN_ONLY.has(path)) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
        <div style={{ fontSize:'4rem' }}>🔒</div>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'bold', color:'#fff' }}>Superadmin Only</h1>
        <p style={{ color:'#888', maxWidth:'400px', fontSize: 14 }}>This area is restricted to the platform superadmin.</p>
      </div>
    );
  }

  // Access granted if: the role is in the page's allow-list, OR the user has been
  // assigned the permission that unlocks this page.
  const allowedRoles = roles || ADMIN_PAGE_ROLES[path];
  const requiredPerm = PAGE_PERMISSIONS[path];
  const roleAllows = !allowedRoles || allowedRoles.includes(user?.role || '');
  const permAllows = requiredPerm ? can(requiredPerm) : false;

  if (!roleAllows && !permAllows) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
        <div style={{ fontSize:'4rem' }}>🔒</div>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'bold', color:'#fff' }}>Insufficient Permissions</h1>
        <p style={{ color:'#888', maxWidth:'400px', fontSize: 14 }}>Your role (<strong>{user?.role}</strong>) does not have access to this page. Ask a superadmin to assign you the relevant duty.</p>
      </div>
    );
  }
  return children;
}

// Guard a component/section by a single permission.
interface RequirePermissionProps {
  perm: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ perm, children, fallback = null }: RequirePermissionProps) {
  const { can, loading } = useAuth();
  if (loading) return null;
  return can(perm) ? children : fallback;
}
