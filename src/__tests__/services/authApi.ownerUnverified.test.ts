import { describe, it, expect, vi, beforeEach } from 'vitest';

// STAGE 5E: the owner-identity gate (backend/config/owners.js) answers 403 { code: 'OWNER_IDENTITY_UNVERIFIED' }. The client
// must classify it by that machine code, never by message wording, so the UI can offer the "Resend verification email" action.
const requestMock = vi.hoisted(() => vi.fn());
vi.mock('../../api/httpRequest', () => ({
  request: requestMock,
  HttpRequestError: class HttpRequestError extends Error {
    status?: number; responseData?: unknown;
    constructor(m: string, s?: number, d?: unknown) { super(m); this.status = s; this.responseData = d; }
  },
}));
const { login, AuthApiError } = await import('../../services/authApi');
const { HttpRequestError } = await import('../../api/httpRequest');

describe('login(): owner-identity-unverified is its own error kind', () => {
  beforeEach(() => { requestMock.mockReset(); });

  it('classifies 403 + code OWNER_IDENTITY_UNVERIFIED as owner_identity_unverified and keeps the server message', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('The platform-owner account is not verified. Use "Resend verification email" ...', 403, { code: 'OWNER_IDENTITY_UNVERIFIED' }));
    const err = await login('o@x.test', 'pw').catch((e) => e);
    expect(err).toBeInstanceOf(AuthApiError);
    expect(err.kind).toBe('owner_identity_unverified');
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/platform-owner account is not verified/);
  });
  it('is keyed on the code, not the wording', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('totally different words', 403, { code: 'OWNER_IDENTITY_UNVERIFIED' }));
    const err = await login('o@x.test', 'pw').catch((e) => e);
    expect(err.kind).toBe('owner_identity_unverified');
  });
  it('does NOT classify the same wording without the code (no wording-based privilege or UI path)', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('The platform-owner account is not verified.', 403, {}));
    const err = await login('o@x.test', 'pw').catch((e) => e);
    expect(err.kind).toBe('forbidden');
  });
  it('does not widen: a different 403 code, a 401 and a 500 keep their existing kinds', async () => {
    requestMock.mockRejectedValueOnce(new HttpRequestError('Account suspended', 403, { code: 'AUTH_FORBIDDEN' }));
    expect((await login('a@x.test', 'pw').catch((e) => e)).kind).toBe('forbidden');
    requestMock.mockRejectedValueOnce(new HttpRequestError('Invalid credentials', 401, { code: 'OWNER_IDENTITY_UNVERIFIED' }));
    expect((await login('a@x.test', 'pw').catch((e) => e)).kind).toBe('invalid_credentials');
    requestMock.mockRejectedValueOnce(new HttpRequestError('boom', 500, {}));
    expect((await login('a@x.test', 'pw').catch((e) => e)).kind).toBe('server');
  });
});
