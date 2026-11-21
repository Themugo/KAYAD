import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// REGRESSION (D-AUTH-2 / Messages redirect): protect() turned ANY thrown error (database/PostgREST outage,
// unexpected exception) into 401 "Not authorized". The SPA treats 401 as "session over" and sends the user
// to login. An infrastructure failure is not an authentication verdict: it must stay fail-closed (request
// rejected, no req.user, next() never called) but answer a retryable 503 with a distinct code.

process.env.JWT_SECRET = 'x'.repeat(48);
const chain = (v) => ({ select: () => chain(v), lean: async () => v, then: (r, j) => Promise.resolve(v).then(r, j) });
const row = { id: 'u-1', email: 'a@example.test', role: 'buyer', status: 'approved', isBanned: false, emailVerified: true, name: 'A' };
const findById = jest.fn();
const findOne = jest.fn();
const findActiveSessionById = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findById, findByIdAndUpdate: jest.fn(() => Promise.resolve()) } }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOne } }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { findActiveSessionById } }));

const { protect } = await import('../../middleware/auth.js');
const mkRes = () => { const r = { code: 200, headers: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.set = (k, v) => { r.headers[k] = v; return r; }; return r; };
const tok = (extra = {}) => jwt.sign({ id: 'u-1', tokenVersion: 0, ...extra }, process.env.JWT_SECRET, { algorithm: 'HS256' });
const run = async (req) => { const res = mkRes(); const next = jest.fn(); await protect(req, res, next); return { res, next }; };

describe('protect(): infrastructure errors are not authentication verdicts', () => {
  beforeEach(() => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    findById.mockImplementation(() => chain({ ...row }));
    findOne.mockImplementation(() => chain({ tokenVersion: 0 }));
    findActiveSessionById.mockResolvedValue({ id: 's' });
  });
  const req = (extra) => ({ headers: { authorization: `Bearer ${tok(extra)}` }, cookies: {} });

  test('database failure while loading the user -> 503 AUTH_TEMPORARILY_UNAVAILABLE, fail-closed', async () => {
    findById.mockImplementation(() => { throw new Error('PGRST connection refused'); });
    const { res, next } = await run(req());
    expect(res.code).toBe(503);
    expect(res.body).toMatchObject({ success: false, code: 'AUTH_TEMPORARILY_UNAVAILABLE', retryable: true });
    expect(res.headers['Retry-After']).toBeDefined();
    expect(next).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toMatch(/PGRST|refused/); // no internals leaked
  });

  test('session-store failure -> 503, never next()', async () => {
    findActiveSessionById.mockRejectedValue(new Error('timeout'));
    const { res, next } = await run(req({ sessionId: 'sess-1' }));
    expect(res.code).toBe(503); expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ['missing token', { headers: {}, cookies: {} }, 401],
    ['garbage token', { headers: { authorization: 'Bearer nope' }, cookies: {} }, 401],
    ['expired token', { headers: { authorization: `Bearer ${jwt.sign({ id: 'u-1' }, process.env.JWT_SECRET, { expiresIn: -10 })}` }, cookies: {} }, 401],
  ])('genuine authentication failure (%s) is still a 401', async (_n, r, code) => {
    const { res, next } = await run(r);
    expect(res.code).toBe(code); expect(res.body.code).not.toBe('AUTH_TEMPORARILY_UNAVAILABLE'); expect(next).not.toHaveBeenCalled();
  });

  test('revoked session and token-version mismatch are still 401 AUTH_SESSION_EXPIRED', async () => {
    findActiveSessionById.mockResolvedValue(null);
    let o = await run(req({ sessionId: 's' }));
    expect(o.res.code).toBe(401); expect(o.res.body.code).toBe('AUTH_SESSION_EXPIRED');
    findActiveSessionById.mockResolvedValue({ id: 's' }); findOne.mockImplementation(() => chain({ tokenVersion: 5 }));
    o = await run(req());
    expect(o.res.code).toBe(401); expect(o.res.body.code).toBe('AUTH_SESSION_EXPIRED');
  });

  test('unknown user is still a 401, banned still 403', async () => {
    findById.mockImplementation(() => chain(null));
    expect((await run(req())).res.code).toBe(401);
    findById.mockImplementation(() => chain({ ...row, isBanned: true }));
    expect((await run(req())).res.code).toBe(403);
  });
});
