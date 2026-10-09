// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  getMe,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  updateProfile as authUpdateProfile,
} from '../services/authApi';
import { setPostHogUser, clearPostHogUser } from '../utils/posthog';
import { clearCSRFToken } from '../utils/csrf';
import { loginPathFor } from '../utils/authIntent';
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
  isBroker: boolean;
  isSeller: boolean;
  isMarketing: boolean;
  isTechSupport: boolean;
  isHR: boolean;
  isAccounts: boolean;
  isEscrowOfficer: boolean;
  isAdManager: boolean;
  permissions: Permission[];
  can: (perm: Permission) => boolean;
  login: {
    (credentials: { email: string; password: string }): Promise<any>;
    (email: string, password: string): Promise<any>;
  };
  register: (body: any) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateProfile: (body: any) => Promise<any>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

// Backend→frontend role mapping contract (locked by
// src/__tests__/context/roleMapping.test.ts, docs/ROLE_MATRIX.md):
// every real backend role keeps its identity; only the backend "user"
// role maps to this frontend's pre-existing "buyer" term; anything
// unrecognized fails closed to "buyer" (least privileged).
const KNOWN_ROLES = [
  'dealer', 'admin', 'superadmin', 'broker', 'individual_seller',
  'ghost_checker', 'moderator', 'ad_manager', 'marketing',
  'escrow_officer', 'technical_support', 'hr', 'accounts',
];

export function mapBackendRoleToFrontend(role: string): string {
  if (role === 'user') return 'buyer';
  if (KNOWN_ROLES.includes(role)) return role;
  return 'buyer';
}

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

  // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: every auth action that
  // can set `user` (the mount-time getMe() bootstrap, login(), logout(), the
  // kayad:auth-expired handler) now bumps this ref first and stamps the
  // request it starts with the value at that moment. Before this fix, the
  // mount effect's getMe() call had no such guard: if it resolved AFTER a
  // newer action already ran - e.g. a user lands on /login already
  // authenticated as account A (mount's getMe() for A in flight), submits
  // credentials for account B before that promise resolves, login() sets
  // user=B, and the stale getMe() for A then resolves and calls
  // setUser(normalizeUser(A)) - the UI would silently revert to the older
  // identity. Symmetrically, logout() setting user=null could be silently
  // undone by an in-flight getMe() resolving afterward with the pre-logout
  // user payload. Each async identity-setting path now only applies its
  // result if no newer one has started since.
  const authActionSeq = useRef(0);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) setPostHogUser(u);
    else   clearPostHogUser();
  };

  // On mount: fetch user via cookie-based auth (HttpOnly token cookie)
  useEffect(() => {
    const handleAuthExpired = () => {
      authActionSeq.current += 1;
      clearCSRFToken(); setUser(null); setLoading(false);
    };
    window.addEventListener('kayad:auth-expired', handleAuthExpired);

    const mySeq = ++authActionSeq.current;
    getMe().then(user => ({ user }))
      .then(data => {
        // A newer auth action (login/logout/another bootstrap) has already
        // run since this request started - its result is stale, discard it.
        if (authActionSeq.current !== mySeq) return;
        setUser(normalizeUser(data.user));
      })
      .catch(() => { /* not authenticated — user stays null */ })
      .finally(() => { if (authActionSeq.current === mySeq) setLoading(false); });

    return () => window.removeEventListener('kayad:auth-expired', handleAuthExpired);
  }, []);

  const login = useCallback(async (credentialsOrEmail: { email: string; password: string } | string, passwordArg?: string) => {
    const email = typeof credentialsOrEmail === 'string' ? credentialsOrEmail : credentialsOrEmail.email;
    const password = typeof credentialsOrEmail === 'string' ? (passwordArg || '') : credentialsOrEmail.password;
    const mySeq = ++authActionSeq.current;
    const user = await authLogin(email, password);
    const data = { success: true, user };
    if (authActionSeq.current === mySeq) {
      setUser(normalizeUser(data.user));
      setLoading(false);
    }
    return data;
  }, []);

  const register = useCallback(async (body: any) => {
    // Registration is intentionally not authentication. The backend creates
    // the account without issuing session cookies; the user must verify email
    // when required and then explicitly sign in. Keep the current auth state
    // untouched so registration cannot silently replace an existing session.
    const user = await authRegister(body);
    return { success: true, user };
  }, []);

  const logout = useCallback(async () => {
    const mySeq = ++authActionSeq.current;
    try { await authLogout(); } catch (error) { console.error('Logout failed:', error); }
    clearCSRFToken();
    if (authActionSeq.current === mySeq) {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (body: any) => {
    const user = await authUpdateProfile(body);
    const data = { success: true, user };
    setUser(normalizeUser(data.user || data));
    return data;
  }, []);

  const isAdmin       = STAFF_ROLES.includes(user?.role as any);
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
  const isEmailVerified = !!user?.emailVerified;

  // Effective permissions = role defaults ∪ granted − revoked (assigned by superadmin)
  const permissions = useMemo(() => getEffectivePermissions(user), [user]);
  const can = useCallback((perm: Permission) => userHasPermission(user, perm), [user]);

  const value = useMemo(() => ({
    user, loading,
    isAuth, isEmailVerified,
    isAdmin, isDealer, isSuperAdmin, isBroker, isSeller,
    isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager,
    permissions, can,
    login, register, logout, setUser, updateProfile,
  }), [user, loading, isAuth, isEmailVerified, isAdmin, isDealer, isSuperAdmin, isBroker, isSeller, isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager, permissions, can, login, register, logout, setUser, updateProfile]);

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

/** Optional auth access for legacy/context boundaries that may also be mounted
 * in isolated tests or unauthenticated shells. It never throws when AuthProvider
 * is absent; authenticated application paths still use useAuth(). */
export const useOptionalAuth = (): AuthContextValue | null => useContext(AuthCtx);

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
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
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isEmailVerified) return <Navigate to={`${loginPathFor(loc)}${loginPathFor(loc).includes("?") ? "&" : "?"}verify=required`} replace />;
  return children;
}

export function RequireAdmin({ children }: RequireAuthProps) {
  const { isAdmin, isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
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
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
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
