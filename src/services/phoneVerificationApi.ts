import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend phone-verification client - send a real OTP, verify
 * it, and check real verification status, via the real, now-fixed
 * backend (backend/controllers/phoneVerificationController.js,
 * mounted at /api/auth/send-otp, /verify-phone, /phone-status).
 * Following the same fetch-client pattern already established
 * elsewhere in this project.
 */


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
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: PhoneVerificationErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 429 ? 'rate_limited' : error.status === 400 && /no phone number/i.test(error.message) ? 'no_phone' : error.status === 400 ? 'validation' : 'server';
    throw new PhoneVerificationError(error.message, kind, error.status);
  }
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
