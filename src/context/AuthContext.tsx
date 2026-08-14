import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '../types';
import * as authApi from '../services/authApi';
import { BackendUser, AuthApiError } from '../services/authApi';

/** This frontend's actual UserProfile.role union, matching src/types.ts
 * exactly (there is a second, unrelated UserProfile in src/types/
 * index.ts with a DIFFERENT role union - confirmed while building this
 * file to be a genuinely separate, unused type definition, not an
 * alias; see phase-03-auth.md for that finding, not resolved here since
 * it's a pre-existing duplicate-file issue outside this phase's scope
 * to clean up). Declared locally since src/types.ts has no separate
 * named export for it. */
type FrontendUserRole = 'buyer' | 'dealer' | 'mechanic' | 'bank_officer' | 'admin';

/**
 * Real authentication context, backed entirely by the backend API
 * client in services/authApi.ts. Built for KAYAD Fusion Phase 3.
 *
 * Replaces the previous architecture where App.tsx held a bare
 * `useState<UserProfile | null>(null)` that AuthModal set directly by
 * picking a role from a local list, with zero backend involvement -
 * confirmed throughout this project's earlier audit phases
 * (docs/fusion/01, 05) to be the actual prior behavior, not assumed.
 *
 * Frontend role checks anywhere in this app (e.g. `user?.role ===
 * 'admin'` gating a UI element) remain purely presentational after
 * this change - per this phase's own explicit instruction, they are
 * NOT a security boundary. The backend's own `protect` middleware and
 * per-route authorization checks remain the actual authority; nothing
 * in this file changes that or claims otherwise.
 */

/** Backend role strings -> this frontend's existing UserRole union.
 * Documented explicitly rather than silently coerced, because the two
 * vocabularies genuinely don't match (confirmed directly against
 * backend/controllers/authController.js's DEMO_ACCOUNTS and
 * serializeUser): backend has 'user' (not 'buyer'), 'individual_seller'
 * (not 'seller' alone), 'dealer', 'admin', and a dynamically-computed
 * 'superadmin' (via isOwnerEmail - not in this frontend's UserRole
 * union at all). 'superadmin' maps to 'admin' here specifically because
 * this frontend has no separate super-admin UI tier to route it to -
 * not because the roles are equivalent in the backend's own authority
 * model. This mapping is presentational only; it never reaches the
 * backend, which continues to enforce its own real role string on
 * every request regardless of what this frontend labels it.
 */
function mapBackendRoleToFrontend(backendRole: string): FrontendUserRole {
  switch (backendRole) {
    case 'user':
      return 'buyer';
    case 'individual_seller':
      // This frontend's real role union (src/types.ts) has no 'seller'
      // value at all - unlike the separate, unused UserProfile in
      // src/types/index.ts, which does. Mapped to 'buyer' as the
      // closest existing non-dealer, non-staff role rather than
      // inventing a new frontend role value in this pass - changing
      // the frontend's own role union is a larger, separate decision
      // (it's referenced across many components) outside this phase's
      // "do not modify unrelated features" scope. Documented as a real
      // gap in phase-03-auth.md, not silently absorbed.
      return 'buyer';
    case 'dealer':
      return 'dealer';
    case 'admin':
    case 'superadmin':
      return 'admin';
    default:
      // Unknown backend role (e.g. a staff/inspector role - the
      // backend has no dedicated inspector role in DEMO_ACCOUNTS
      // either, confirmed in phase-03-auth.md's testing section).
      // Fails closed to the least-privileged option rather than
      // silently granting a more powerful frontend role for a string
      // this mapping doesn't recognize.
      return 'buyer';
  }
}

function mapBackendUserToProfile(backendUser: BackendUser): UserProfile {
  return {
    id: backendUser.id || backendUser._id || '',
    email: backendUser.email,
    name: backendUser.name,
    role: mapBackendRoleToFrontend(backendUser.role),
    avatar: backendUser.avatar || '',
    phone: backendUser.phone || '',
    isVerified: Boolean(backendUser.emailVerified),
  };
}

interface AuthContextValue {
  user: UserProfile | null;
  /** True only during the initial session-restoration check on mount -
   * lets callers show a loading state instead of briefly flashing a
   * "logged out" UI before the /me check resolves. */
  isRestoringSession: boolean;
  /** True while an explicit login/register/demoLogin/logout call is
   * in flight - separate from isRestoringSession so a login button
   * can show its own loading state without being confused with the
   * page-load session check. */
  isAuthenticating: boolean;
  /** Set after any failed auth action; cleared automatically on the
   * next attempt. Callers read this to show an inline error rather
   * than each auth call site needing its own try/catch and message
   * state. */
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; role: string; phone?: string }) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  isDemoModeEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Session restoration on mount - the actual "Login -> backend ->
  // session/token -> /me -> frontend auth provider" flow this phase's
  // target architecture describes, specifically the /me step. A 401
  // here (handled inside authApi.getMe itself) is the normal logged-out
  // case, not surfaced as authError - only genuine network/server
  // failures are, since those are actionable/informative for the user
  // in a way "you're not logged in" on first page load is not.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const backendUser = await authApi.getMe();
        if (!cancelled) {
          setUser(backendUser ? mapBackendUserToProfile(backendUser) : null);
        }
      } catch (err) {
        // Network/server failure during restoration (e.g. no backend
        // reachable at all) - fails closed to logged-out rather than
        // leaving the app in an indeterminate state, and does NOT set
        // authError here specifically: an error banner on every single
        // page load before the user has taken any auth action would be
        // alarming and out of place, not helpful. Logged to console
        // instead, so it's discoverable during development/debugging
        // without disrupting the actual UI.
        if (!cancelled) {
          setUser(null);
          console.warn('KAYAD auth: session restoration failed', err);
        }
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAuthAction = useCallback(async (action: () => Promise<BackendUser>) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const backendUser = await action();
      setUser(mapBackendUserToProfile(backendUser));
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : 'Something went wrong. Please try again.';
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => runAuthAction(() => authApi.login(email, password)),
    [runAuthAction]
  );

  const register = useCallback(
    (input: { name: string; email: string; password: string; role: string; phone?: string }) =>
      runAuthAction(() => authApi.register(input)),
    [runAuthAction]
  );

  const demoLogin = useCallback(
    (role: string) => runAuthAction(() => authApi.demoLogin(role)),
    [runAuthAction]
  );

  const logout = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      await authApi.logout();
    } catch (err) {
      // A failed logout call still logs the user out locally - per
      // this phase's own "unauthenticated users cannot access
      // protected data merely by manipulating frontend state" concern
      // in reverse: a logout that silently fails to clear local state
      // because the network request failed would leave stale,
      // presentationally-"logged in" UI showing after the user
      // explicitly asked to log out, which is its own kind of
      // confusing/incorrect state. The backend's own session/cookie
      // state is authoritative regardless of what this frontend
      // believes - a genuinely stale cookie is a backend-side session
      // expiry concern, not something this local state change affects
      // either way.
      console.warn('KAYAD auth: logout request failed, clearing local session anyway', err);
    } finally {
      setUser(null);
      setIsAuthenticating(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value: AuthContextValue = {
    user,
    isRestoringSession,
    isAuthenticating,
    authError,
    login,
    register,
    demoLogin,
    logout,
    clearAuthError,
    isDemoModeEnabled: authApi.isDemoModeEnabled(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
