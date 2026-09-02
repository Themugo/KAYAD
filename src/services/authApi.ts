import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend authentication API client. Built for KAYAD Fusion Phase 3
 * Authentication uses the backend as the single source of truth.
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
  try {
    return await request<AuthResponse>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: AuthErrorKind = error.status === 401 || error.status === 403 ? 'invalid_credentials' : error.status ? 'server' : 'network';
    throw new AuthApiError(error.message, kind, error.status);
  }
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



/** Generic authenticated auth request for the remaining v1 auth endpoints. */
async function authMessageRequest(path: string, method: string, body?: Record<string, unknown>) {
  return authFetch(path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function changePassword(body: { currentPassword: string; newPassword: string }): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/change-password', 'PUT', body);
}

export async function forgotPassword(body: { email: string }): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/forgot-password', 'POST', body);
}

export async function resetPassword(body: { token: string; password: string }): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/reset-password', 'POST', body);
}

export async function verifyEmail(token: string): Promise<AuthResponse> {
  return authMessageRequest(`/api/v1/auth/verify-email/${encodeURIComponent(token)}`, 'GET');
}

export async function resendVerification(body: { email: string }): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/resend-verification', 'POST', body);
}

export async function sendOTP(): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/send-otp', 'POST');
}

export async function verifyPhone(otp: string): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/verify-phone', 'POST', { otp });
}

export async function phoneStatus(): Promise<AuthResponse> {
  return authMessageRequest('/api/v1/auth/phone-status', 'GET');
}
