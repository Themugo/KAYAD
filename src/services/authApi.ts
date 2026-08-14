/**
 * Real backend authentication API client. Built for KAYAD Fusion Phase 3
 * ("Replace all demo/local frontend authentication with ONE real
 * authentication system backed by the existing backend").
 *
 * Every function here calls the actual, already-built backend endpoints
 * documented in docs/fusion/05-auth-map.md - it does not invent a second
 * auth system. The backend sets the access token as an httpOnly cookie
 * (confirmed directly in backend/controllers/authController.js's own
 * comment: "Do NOT include the access token in the JSON response body...
 * makes it readable by any JavaScript on the page, defeating httpOnly
 * protection") - so every request here uses `credentials: 'include'`
 * to send/receive that cookie, and this client never reads, stores, or
 * exposes a token itself. That is deliberate, not an oversight: doing
 * otherwise would defeat the backend's own security design.
 *
 * IMPORTANT, STATED HONESTLY: this client has not been exercised against
 * a live backend. No Supabase project is currently provisioned for this
 * backend (confirmed in docs/fusion/01 and 04), so there is nothing
 * running at VITE_API_URL to test this against in this environment. The
 * request/response shapes below were read directly from the backend's
 * own controller code (backend/controllers/authController.js), not
 * guessed - but "matches the code" and "verified working end-to-end
 * against a live server" are different claims, and only the first one
 * can be made here.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface BackendUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  status?: string;
  isBanned?: boolean;
  approved?: boolean;
  location?: string;
  dealerRating?: number;
  bio?: string;
  businessName?: string;
  businessType?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  verificationStatus?: string;
  isOwner?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: BackendUser;
  message?: string;
}

/** Every known distinct failure mode a caller needs to distinguish
 * between, rather than a single generic "it failed" - a login attempt
 * needs to tell "wrong password" apart from "server unreachable" to
 * show the right message. */
export type AuthErrorKind = 'invalid_credentials' | 'network' | 'server' | 'unknown';

export class AuthApiError extends Error {
  kind: AuthErrorKind;
  status?: number;
  constructor(message: string, kind: AuthErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function authFetch(path: string, options: RequestInit = {}): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    // A thrown fetch (as opposed to a non-2xx response) means the
    // request never reached a server at all - no backend deployed at
    // API_BASE, DNS failure, offline, CORS rejection, etc. This is the
    // single most likely failure mode in this project's actual current
    // state (no live backend confirmed provisioned), so it gets its
    // own distinct, honest error kind rather than being lumped in with
    // "server returned an error."
    throw new AuthApiError(
      'Unable to reach KAYAD servers. Please check your connection and try again.',
      'network'
    );
  }

  let body: AuthResponse;
  try {
    body = await res.json();
  } catch {
    throw new AuthApiError('Unexpected response from server.', 'server', res.status);
  }

  if (!res.ok || !body.success) {
    const kind: AuthErrorKind = res.status === 401 || res.status === 403 ? 'invalid_credentials' : 'server';
    throw new AuthApiError(body.message || 'Request failed.', kind, res.status);
  }

  return body;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}): Promise<BackendUser> {
  const res = await authFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.user) throw new AuthApiError('Registration succeeded but no user was returned.', 'unknown');
  return res.user;
}

export async function login(email: string, password: string): Promise<BackendUser> {
  const res = await authFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.user) throw new AuthApiError('Login succeeded but no user was returned.', 'unknown');
  return res.user;
}

/** Calls the backend's own real demo-login endpoint (confirmed to exist
 * in backend/controllers/authController.js's DEMO_ACCOUNTS/demoLogin -
 * this is not a new mechanism invented here). Per this phase's explicit
 * instruction, demo accounts must be backend-seed-configured, not a
 * frontend-local list - this function's entire job is to defer that
 * decision to the backend rather than deciding it here. If the backend
 * hasn't been seeded (backend/seed.js never run against a real
 * database), this will fail with the backend's own real "Demo account
 * not found. Run seed first." message - surfaced to the caller
 * unmodified, not papered over.
 *
 * IMPORTANT MISMATCH, DOCUMENTED RATHER THAN SILENTLY RESOLVED: the
 * backend's DEMO_ACCOUNTS only defines 3 roles (dealer, seller/
 * individual_seller, buyer) - not the 4 the frontend's old demo modal
 * offered (buyer, dealer, mechanic, admin). See phase-03-auth.md for
 * how this is handled in the UI - not fixed by inventing a 4th backend
 * demo account unilaterally in this pass. */
export async function demoLogin(role: string): Promise<BackendUser> {
  const res = await authFetch('/api/v1/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  if (!res.user) throw new AuthApiError('Demo login succeeded but no user was returned.', 'unknown');
  return res.user;
}

/** Session restoration - called on app mount. Relies entirely on the
 * httpOnly refresh/access token cookies already being present in the
 * browser from a prior login; there is nothing else for the frontend
 * to check. A 401 here is the normal, expected "not logged in" case,
 * not an error to alarm the user about - the caller is expected to
 * treat a thrown AuthApiError here as "render the logged-out UI",
 * not surface it as a visible error message. */
export async function getMe(): Promise<BackendUser | null> {
  try {
    const res = await authFetch('/api/v1/auth/me', { method: 'GET' });
    return res.user ?? null;
  } catch (err) {
    if (err instanceof AuthApiError && (err.kind === 'invalid_credentials' || err.status === 401)) {
      return null;
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await authFetch('/api/v1/auth/logout', { method: 'POST' });
}

/** True only when the app is explicitly configured to allow demo
 * access, per this phase's own requirement to preserve demo accounts
 * "only if explicitly moved into development/test seed configuration" -
 * gated on a real, previously-declared-but-unused env var
 * (VITE_ENABLE_DEMO, already present in vite-env.d.ts before this
 * phase) rather than always-on, so a production deployment can turn
 * this off entirely without a code change. */
export function isDemoModeEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DEMO === 'true';
}
