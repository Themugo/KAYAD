import { getCsrfHeaders } from '../utils/csrf';
/**
 * Real backend phone-verification client - send a real OTP, verify
 * it, and check real verification status, via the real, now-fixed
 * backend (backend/controllers/phoneVerificationController.js,
 * mounted at /api/auth/send-otp, /verify-phone, /phone-status).
 * Following the same fetch-client pattern already established
 * elsewhere in this project.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export type PhoneVerificationErrorKind = 'network' | 'unauthenticated' | 'no_phone' | 'rate_limited' | 'validation' | 'server';

export class PhoneVerificationError extends Error {
  kind: PhoneVerificationErrorKind;
  status?: number;
  constructor(message: string, kind: PhoneVerificationErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function phoneFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getCsrfHeaders(options.method), ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new PhoneVerificationError('Unable to reach KAYAD servers. Please check your connection and try again.', 'network');
  }

  let body: { success: boolean; message?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new PhoneVerificationError('Unexpected response from server.', 'server', res.status);
  }

  if (!res.ok) {
    const kind: PhoneVerificationErrorKind =
      res.status === 401 ? 'unauthenticated' :
      res.status === 429 ? 'rate_limited' :
      res.status === 400 && /no phone number/i.test(body.message || '') ? 'no_phone' :
      res.status === 400 ? 'validation' : 'server';
    throw new PhoneVerificationError(body.message || 'Phone verification request failed.', kind, res.status);
  }

  return body as T;
}

/** POST /api/auth/send-otp - sends a real 4-digit code to the real,
 * signed-in user's phone on file. Rate-limited on the backend
 * (otpLimiter) - a 429 surfaces here as kind: 'rate_limited'. */
export async function sendPhoneOTP(): Promise<void> {
  await phoneFetch('/api/auth/send-otp', { method: 'POST' });
}

/** POST /api/auth/verify-phone - checks a real 4-digit code against
 * the real one just sent. */
export async function verifyPhoneOTP(otp: string): Promise<void> {
  await phoneFetch('/api/auth/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export interface PhoneVerificationStatus {
  phone: string | null;
  verified: boolean;
}

/** GET /api/auth/phone-status - the real, current verification state
 * of the signed-in user's phone. */
export async function getPhoneVerificationStatus(): Promise<PhoneVerificationStatus> {
  const body = await phoneFetch<{ data: PhoneVerificationStatus }>('/api/auth/phone-status');
  return body.data;
}
