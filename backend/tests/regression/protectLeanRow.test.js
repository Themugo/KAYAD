import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// REGRESSION (D-AUTH-1): protect() read `user._id.toString()` from a .lean() row.
// Lean rows produced by models/_base.js mapRowIn expose `id` (no `_id`), so every
// authenticated request threw a TypeError that the catch-all turned into 401
// "Not authorized". Fixtures here are lean-shaped: `id` only, NO `_id`.

process.env.JWT_SECRET = 'x'.repeat(48);

const leanRow = { id: 'u-1', email: 'a@example.test', role: 'buyer', status: 'approved', isBanned: false, emailVerified: true, name: 'A' };
const chain = (v) => ({ select: () => chain(v), lean: async () => v, then: (r, j) => Promise.resolve(v).then(r, j) });
const findById = jest.fn(() => chain({ ...leanRow }));
const findByIdAndUpdate = jest.fn(() => Promise.resolve());

jest.unstable_mockModule('../../models/User.js', () => ({ default: { findById, findByIdAndUpdate } }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOne: () => chain({ tokenVersion: 0 }) } }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { findActiveSessionById: jest.fn() } }));

const { protect } = await import('../../middleware/auth.js');
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const tok = () => jwt.sign({ id: 'u-1', tokenVersion: 0 }, process.env.JWT_SECRET, { algorithm: 'HS256' });

describe('protect() with lean rows lacking _id', () => {
  beforeEach(() => { process.env.REQUIRE_EMAIL_VERIFICATION = 'false'; });
  test('authenticates and sets req.user.id from row.id', async () => {
    const req = { headers: { authorization: `Bearer ${tok()}` }, cookies: {} };
    const res = mkRes(); const next = jest.fn();
    await protect(req, res, next);
    expect(res.code).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe('u-1');
    expect(findByIdAndUpdate).toHaveBeenCalledWith('u-1', expect.any(Object));
  });
  test('still fails closed with no token', async () => {
    const res = mkRes(); const next = jest.fn();
    await protect({ headers: {}, cookies: {} }, res, next);
    expect(res.code).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
  test('still rejects banned users', async () => {
    findById.mockImplementation(() => chain({ ...leanRow, isBanned: true }));
    const res = mkRes(); const next = jest.fn();
    await protect({ headers: { authorization: `Bearer ${tok()}` }, cookies: {} }, res, next);
    expect(res.code).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
