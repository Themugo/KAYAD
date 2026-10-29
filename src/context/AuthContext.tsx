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
import { clearAdminViewState } from '../utils/adminViewState';
import { loginPathFor } from '../utils/authIntent';
import { STAFF_ROLES, isSellerRole, type User } from '../utils/authRoutes';
import { ShieldAlert, Lock } from 'lucide-react';
import {
  getEffectivePermissions,
  userHasPermission,
  PAGE_PERMISSIONS,
  SUPERADMIN_ONLY,
  type Permission,
} from '../utils/permissions';

/**
 * The four honest answers to "who is signed in?":
 *  - loading:         the session check has not finished (guards wait, never redirect)
 *  - authenticated:   the server confirmed a valid session
 *  - unauthenticated: the server explicitly said there is none (401) - guards send to login
 *  - error:           we could NOT find out (network/timeout/5xx/CORS/malformed reply).
 *                     No access is granted, but it is NOT "logged out": guards show a
 *                     retryable state instead of redirecting a possibly-valid user.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface SessionError {
  /** Coarse, non-sensitive category for display/diagnosis. */
  kind: 'network' | 'server' | 'rate_limited' | 'csrf' | 'forbidden' | 'unexpected';
  status?: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** See SessionStatus. `loading` is exactly `sessionStatus === 'loading'`. */
  sessionStatus: SessionStatus;
  sessionError: SessionError | null;
  /** Re-run the (bounded) session check, e.g. from the recovery UI. */
  retrySession: () => void;
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
  /** Server-confirmed sign-out. On failure the session is kept and a visible notice explains why. */
  logout: () => Promise<{ ok: boolean; message?: string }>;
  /** Server-confirmed sign-out: only clears the client session when the backend revoked it (or reports it already gone). */
  signOut: () => Promise<{ ok: boolean; message?: string }>;
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

/** Bounded bootstrap policy: 1 try + 2 retries, then settle in `error`. */
export const SESSION_PROBE_RETRY_DELAYS_MS = [600, 1800] as const;
/** Per-attempt cap for the session probe (shorter than the shared 30s client timeout). */
export const SESSION_PROBE_TIMEOUT_MS = 8000;

/** Maps a failed session probe to either a confirmed rejection (the server
 * said no) or an unknown/retryable failure. Duck-typed on purpose. */
export function classifySessionProbeFailure(err: unknown): { confirmed: boolean; error: SessionError } {
  const e = err as { kind?: string; status?: number } | null | undefined;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  if (e?.kind === 'invalid_credentials' || status === 401) return { confirmed: true, error: { kind: 'unexpected', status } };
  if (e?.kind === 'csrf') return { confirmed: false, error: { kind: 'csrf', status } }; // before the generic 403 rule
  // 403 on the probe = the account itself is refused (suspended / unverified): not transient, no access.
  if (e?.kind === 'forbidden' || status === 403) return { confirmed: true, error: { kind: 'forbidden', status } };
  if (e?.kind === 'rate_limited' || status === 429) return { confirmed: false, error: { kind: 'rate_limited', status } };
  if (e?.kind === 'network') return { confirmed: false, error: { kind: 'network' } };
  if (typeof status === 'number' && status >= 500) return { confirmed: false, error: { kind: 'server', status } };
  return { confirmed: false, error: { kind: 'unexpected', status } };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [sessionError, setSessionError] = useState<SessionError | null>(null);
  const loading = sessionStatus === 'loading';

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
    if (u) { setPostHogUser(u); setSessionStatus('authenticated'); setSessionError(null); }
    else   clearPostHogUser();
  };

  /** Settle the session as confirmed-signed-out (never used for transient failures). */
  const settleUnauthenticated = () => { setUserState(null); clearPostHogUser(); setSessionStatus('unauthenticated'); setSessionError(null); };

  // Session bootstrap: ask the server (cookie-based, HttpOnly token) who is signed in.
  // Transient failures are retried a bounded number of times and then settle in
  // `error` - they are never turned into "unauthenticated" and never grant access.
  const probeSession = useCallback(async (mySeq: number) => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const me = await getMe({ timeoutMs: SESSION_PROBE_TIMEOUT_MS });
        // A newer auth action (login/logout/another bootstrap) has already
        // run since this request started - its result is stale, discard it.
        if (authActionSeq.current !== mySeq) return;
        const normalized = normalizeUser(me);
        if (normalized) setUser(normalized); else settleUnauthenticated();
        return;
      } catch (err) {
        if (authActionSeq.current !== mySeq) return;
        const { confirmed, error } = classifySessionProbeFailure(err);
        if (confirmed) { settleUnauthenticated(); return; }
        const delay = SESSION_PROBE_RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          // Out of retries: remain signed-out-for-access but report "could not verify".
          setUserState(null);
          setSessionError(error);
          setSessionStatus('error');
          return;
        }
        await sleep(delay);
        if (authActionSeq.current !== mySeq) return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retrySession = useCallback(() => {
    const mySeq = ++authActionSeq.current;
    setSessionStatus('loading');
    setSessionError(null);
    void probeSession(mySeq);
  }, [probeSession]);

  useEffect(() => {
    const handleAuthExpired = () => {
      authActionSeq.current += 1;
      clearCSRFToken(); settleUnauthenticated();
    };
    window.addEventListener('kayad:auth-expired', handleAuthExpired);
    void probeSession(++authActionSeq.current);
    return () => window.removeEventListener('kayad:auth-expired', handleAuthExpired);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When connectivity returns while we are stuck in `error`, check again once.
  useEffect(() => {
    if (sessionStatus !== 'error') return undefined;
    const onOnline = () => retrySession();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sessionStatus, retrySession]);

  const login = useCallback(async (credentialsOrEmail: { email: string; password: string; mfaCode?: string } | string, passwordArg?: string) => {
    const email = typeof credentialsOrEmail === 'string' ? credentialsOrEmail : credentialsOrEmail.email;
    const password = typeof credentialsOrEmail === 'string' ? (passwordArg || '') : credentialsOrEmail.password;
    const mfaCode = typeof credentialsOrEmail === 'string' ? undefined : credentialsOrEmail.mfaCode;
    const mySeq = ++authActionSeq.current;
    let user;
    try {
      user = await authLogin(email, password, mfaCode);
    } catch (err) {
      // Bumping the sequence discarded any in-flight bootstrap probe; do not
      // leave the app stuck in `loading` when the sign-in attempt itself fails.
      if (authActionSeq.current === mySeq) setSessionStatus((s) => (s === 'loading' ? 'unauthenticated' : s));
      throw err;
    }
    const data = { success: true, user };
    if (authActionSeq.current === mySeq) {
      setUser(normalizeUser(data.user));
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

  const signOut = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    const mySeq = ++authActionSeq.current;
    try {
      await authLogout();
    } catch (error: any) {
      // 401 = the server already considers this session gone; that is a confirmed sign-out.
      if (error?.status !== 401) {
        return { ok: false, message: error?.message || 'Sign-out could not be confirmed by the server. You are still signed in.' };
      }
    }
    clearCSRFToken();
    clearAdminViewState();
    if (authActionSeq.current === mySeq) settleUnauthenticated();
    return { ok: true };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [signOutError, setSignOutError] = useState<string | null>(null);
  // Shared by every sign-out entry point (Navbar, Profile, inspector): a failed sign-out is never silent.
  const logout = useCallback(async () => {
    const result = await signOut();
    setSignOutError(result.ok ? null : (result.message || 'Sign-out could not be confirmed by the server. You are still signed in.'));
    return result;
  }, [signOut]);

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
    user, loading, sessionStatus, sessionError, retrySession,
    isAuth, isEmailVerified,
    isAdmin, isDealer, isSuperAdmin, isBroker, isSeller,
    isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager,
    permissions, can,
    login, register, logout, signOut, setUser, updateProfile,
  }), [user, loading, sessionStatus, sessionError, retrySession, isAuth, isEmailVerified, isAdmin, isDealer, isSuperAdmin, isBroker, isSeller, isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager, permissions, can, login, register, logout, signOut, setUser, updateProfile]);

  return (
    <AuthCtx.Provider value={value}>
      {signOutError && (
        <div
          role="alert"
          data-testid="signout-failure-notice"
          style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, maxWidth: 'min(520px, calc(100vw - 24px))', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#7F1D1D', color: '#FFF', fontSize: 14, lineHeight: 1.4, boxShadow: '0 10px 30px rgba(10,51,64,0.3)' }}
        >
          <span>{signOutError}</span>
          <button type="button" onClick={() => setSignOutError(null)} aria-label="Dismiss sign-out message" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: '#FFF', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}
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

/**
 * Shown by a guard when the session could not be VERIFIED (network/timeout/5xx).
 * It grants nothing and does not redirect: the person may still hold a valid
 * session, so they get an explicit retry (and, as their own choice, sign-in).
 */
export function SessionRecovery() {
  const { sessionError, retrySession } = useAuth();
  const loc = useLocation();
  const detail = sessionError?.kind === 'network'
    ? 'We could not reach the KAYAD servers. Check your connection.'
    : sessionError?.kind === 'server'
      ? `The service is temporarily unavailable${sessionError.status ? ` (error ${sessionError.status})` : ''}.`
      : sessionError?.kind === 'rate_limited'
        ? 'Too many requests right now. Please wait a moment.'
        : sessionError?.kind === 'csrf'
          ? 'Your browser could not complete the security handshake.'
          : 'We received an unexpected reply from the server.';
  return (
    <div data-testid="session-recovery" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '0.75rem', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>We couldn&apos;t verify your session</h1>
      <p style={{ maxWidth: 420, color: '#64748b', fontSize: 14 }}>{detail} You have not been signed out.</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" data-testid="session-retry" onClick={retrySession} style={{ padding: '0.6rem 1.1rem', borderRadius: 10, fontWeight: 700, background: '#0A3340', color: '#fff' }}>Try again</button>
        <a href={loginPathFor(loc)} style={{ padding: '0.6rem 1.1rem', borderRadius: 10, fontWeight: 700, border: '1px solid #BDE5DE' }}>Sign in</a>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuth, loading, sessionStatus } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
  return children;
}

export function RequireDealer({ children }: RequireAuthProps) {
  const { isDealer, isAdmin, user, loading, isAuth, sessionStatus } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isDealer && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export function RequireSeller({ children }: RequireAuthProps) {
  const { isSeller, user, loading, isAuth, sessionStatus } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isSeller) return <Navigate to="/" replace />;
  return children;
}

export function RequireEmailVerified({ children }: RequireAuthProps) {
  const { isEmailVerified, loading, isAuth, sessionStatus } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isEmailVerified) return <Navigate to={`${loginPathFor(loc)}${loginPathFor(loc).includes("?") ? "&" : "?"}verify=required`} replace />;
  return children;
}

export function RequireAdmin({ children }: RequireAuthProps) {
  const { isAdmin, isAuth, loading, sessionStatus } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
  if (!isAdmin) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
      <ShieldAlert size={64} aria-hidden="true" color="#B91C1C" />
      <h1 style={{ fontSize:'2rem', fontWeight:'bold' }}>Access Denied</h1>
      <p style={{ color:'#64748b', maxWidth:'400px' }}>You don't have permission to access this area. Contact your administrator if you believe this is an error.</p>
    </div>
  );
  return children;
}

// Granular admin guard — restricts specific admin pages to allowed roles
const ADMIN_PAGE_ROLES: Record<string, string[]> = {
  '/admin/panic-room':     ['superadmin'],
  '/admin/platform-recovery': [], // no role opens this page; only the explicit platform_recovery permission does (the server decides again)
  '/admin/control-room':   ['superadmin', 'admin'],
  '/admin/webhoist':       ['superadmin'],
  '/admin/staff':          ['superadmin', 'admin', 'hr'],
  '/admin/settings':       ['superadmin', 'admin'],
  '/admin/security-log':   ['superadmin', 'admin'],
  '/admin/users':          ['superadmin', 'admin', 'technical_support', 'hr', 'moderator'],
  '/admin/private-seller-applications': ['superadmin', 'admin', 'technical_support', 'hr'],
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
  const { user, isAdmin, isAuth, loading, can, sessionStatus } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isAuth) return <Navigate to={loginPathFor(loc)} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const path = loc.pathname;

  // Superadmin sees everything
  if (user?.role === 'superadmin') return children;

  // Superadmin-only pages are never unlocked by a granted permission
  if (SUPERADMIN_ONLY.has(path)) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', textAlign:'center', padding:'2rem' }}>
        <Lock size={64} aria-hidden="true" color="#12576D" />
        <h1 style={{ fontSize:'1.5rem', fontWeight:'bold', color:'var(--admin-ink, #fff)' }}>Superadmin Only</h1>
        <p style={{ color:'#64748b', maxWidth:'400px', fontSize: 14 }}>This area is restricted to the platform superadmin.</p>
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
        <Lock size={64} aria-hidden="true" color="#12576D" />
        <h1 style={{ fontSize:'1.5rem', fontWeight:'bold', color:'var(--admin-ink, #fff)' }}>Insufficient Permissions</h1>
        <p style={{ color:'#64748b', maxWidth:'400px', fontSize: 14 }}>Your role (<strong>{user?.role}</strong>) does not have access to this page. Ask a superadmin to assign you the relevant duty.</p>
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
