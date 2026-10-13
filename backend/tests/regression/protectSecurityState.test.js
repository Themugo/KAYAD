import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Contract for protect() against the security columns added by 20261011090000 (deactivated_at, granted_permissions,
// revoked_permissions) and the session-id check backed by refresh_tokens.session_id (20260930110000).
// Until those columns exist in the database every protected request fails; this test pins the application side of the contract.

process.env.JWT_SECRET = 'x'.repeat(48);

let row;
let selected = [];
let authRow;
const base = { id: 'u-2', email: 'b@example.test', role: 'dealer', status: 'approved', isBanned: false, emailVerified: true, name: 'B', grantedPermissions: [], revokedPermissions: [] };
const chain = (get) => ({ select: (s) => { selected.push(s); return chain(get); }, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) });
const findById = jest.fn(() => chain(() => row));
const findByIdAndUpdate = jest.fn(() => Promise.resolve());
const findActiveSessionById = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({ default: { findById, findByIdAndUpdate } }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOne: () => chain(() => authRow) } }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { findActiveSessionById } }));

const { protect } = await import('../../middleware/auth.js');
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const tok = (extra = {}) => jwt.sign({ id: 'u-2', tokenVersion: 0, ...extra }, process.env.JWT_SECRET, { algorithm: 'HS256' });
const run = async (extra) => { const res = mkRes(); const next = jest.fn(); const req = { headers: { authorization: `Bearer ${tok(extra)}` }, cookies: {} }; await protect(req, res, next); return { res, next, req }; };

describe('protect() security-state contract', () => {
  beforeEach(() => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    row = { ...base }; authRow = { tokenVersion: 0 }; selected = [];
    findActiveSessionById.mockReset(); findActiveSessionById.mockResolvedValue({ id: 's-1' });
  });

  test('reads the new security columns fresh on every request', async () => {
    await run();
    expect(selected.some((s) => /deactivatedAt/.test(s) && /grantedPermissions/.test(s) && /revokedPermissions/.test(s))).toBe(true);
  });
  test('a deactivated account is refused with 403 and never reaches the handler', async () => {
    row = { ...base, deactivatedAt: new Date().toISOString() };
    const { res, next } = await run();
    expect(res.code).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
    expect(next).not.toHaveBeenCalled();
  });
  test('a revoked or unknown session id is refused with 401 AUTH_SESSION_EXPIRED', async () => {
    findActiveSessionById.mockResolvedValue(null);
    const { res, next } = await run({ sessionId: 's-gone' });
    expect(res.code).toBe(401);
    expect(res.body.code).toBe('AUTH_SESSION_EXPIRED');
    expect(findActiveSessionById).toHaveBeenCalledWith('s-gone', 'u-2');
    expect(next).not.toHaveBeenCalled();
  });
  test('a token-version mismatch (password change / revoke-all) is refused with 401', async () => {
    authRow = { tokenVersion: 3 };
    const { res, next } = await run();
    expect(res.code).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
  test('granted and revoked permissions are carried onto req.user', async () => {
    row = { ...base, grantedPermissions: ['listings.review'], revokedPermissions: ['payments.refund'] };
    const { res, next, req } = await run();
    expect(res.code).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.grantedPermissions).toEqual(['listings.review']);
    expect(req.user.revokedPermissions).toEqual(['payments.refund']);
  });
  test('an active session id passes and the user is attached', async () => {
    const { res, next, req } = await run({ sessionId: 's-1' });
    expect(res.code).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe('u-2');
  });
});
