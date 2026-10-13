import { jest } from '@jest/globals';

// Refresh-token rotation / replay CONTROLLER contract (mock-based; the SQL function itself is rehearsed on a throwaway
// PostgreSQL by scripts/rehearse-onboarding-migrations-local.sh). Guards: a replayed token must not mint a new session,
// must bump tokenVersion (global session invalidation) and surface AUTH_REFRESH_REUSED; a missing rotation RPC (the
// current production state) must fail CLOSED (no tokens issued, 500 AUTH_REFRESH_FAILED), never bypass rotation.

const findByTokenHash = jest.fn();
const rotate = jest.fn();
const findUserById = jest.fn();
const findOneUserAuth = jest.fn();
const findOneAndUpdateUserAuth = jest.fn();
const jwtVerify = jest.fn();
const invalidateUserCache = jest.fn();
const generateAccessToken = jest.fn(() => 'access-token');
const generateRefreshToken = jest.fn(() => 'new-refresh-token');

const chain = (v) => ({ select: () => Promise.resolve(v) });
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findById: findUserById, findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOne: findOneUserAuth, findOneAndUpdate: findOneAndUpdateUserAuth } }));
jest.unstable_mockModule('../../models/Dealer.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { findByTokenHash, rotate } }));
jest.unstable_mockModule('../../models/PlatformConfig.js', () => ({ default: {} }));
jest.unstable_mockModule('bcryptjs', () => ({ default: { compare: jest.fn(), hash: jest.fn() } }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: { verify: jwtVerify } }));
jest.unstable_mockModule('../../utils/format.js', () => ({ formatPhone: jest.fn() }));
jest.unstable_mockModule('../../services/notification.service.js', () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule('../../services/communicationGateway.service.js', () => ({ deliver: jest.fn() }));
jest.unstable_mockModule('../../services/communicationEvents.service.js', () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule('../../utils/generateToken.js', () => ({ generateAccessToken, generateRefreshToken }));
jest.unstable_mockModule('../../middleware/auth.js', () => ({ invalidateUserCache }));
jest.unstable_mockModule('../../middleware/accountLockout.js', () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: jest.fn() }));
jest.unstable_mockModule('../../utils/fieldMap.js', () => ({ mapRowIn: jest.fn((x) => x) }));

const { refreshToken } = await import('../../controllers/authController.js');

const buildRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), cookie: jest.fn().mockReturnThis(), clearCookie: jest.fn().mockReturnThis() });
const req = (cookie = 'old-refresh-token') => ({ cookies: cookie ? { refreshToken: cookie } : {}, headers: {}, body: {}, ip: '127.0.0.1' });
const user = { _id: 'u1', id: 'u1', email: 'a@example.test', name: 'A', role: 'user', status: 'approved', emailVerified: true };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum-x';
  jwtVerify.mockReturnValue({ id: 'u1', tokenVersion: 0 });
  findByTokenHash.mockResolvedValue({ familyId: 'fam-1', deviceId: 'd', userAgent: 'ua', ipAddress: 'ip' });
  findUserById.mockResolvedValue(user);
  findOneUserAuth.mockReturnValue(chain({ tokenVersion: 0 }));
  rotate.mockResolvedValue({ status: 'rotated', session_id: 'sess-1', family_id: 'fam-1' });
});

test('happy path: rotates once, issues new cookies, session id is preserved into the access token', async () => {
  const res = buildRes();
  await refreshToken(req(), res);
  expect(rotate).toHaveBeenCalledTimes(1);
  expect(rotate).toHaveBeenCalledWith(expect.objectContaining({ oldToken: 'old-refresh-token', newToken: 'new-refresh-token', familyId: 'fam-1', user: 'u1' }));
  expect(generateAccessToken).toHaveBeenCalledWith(user, 0, 'sess-1');
  expect(res.cookie).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('replay (reuse_detected): 403 AUTH_REFRESH_REUSED, tokenVersion bumped, cache invalidated, nothing issued', async () => {
  rotate.mockResolvedValue({ status: 'reuse_detected', family_id: 'fam-1' });
  const res = buildRes();
  await refreshToken(req(), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REFRESH_REUSED' }));
  expect(findOneAndUpdateUserAuth).toHaveBeenCalledWith({ user: 'u1' }, { $inc: { tokenVersion: 1 } });
  expect(invalidateUserCache).toHaveBeenCalledWith('u1');
  expect(generateAccessToken).not.toHaveBeenCalled();
  expect(res.cookie).not.toHaveBeenCalled();
});

test('unknown token hash: 403 AUTH_SESSION_EXPIRED and rotation is never attempted', async () => {
  findByTokenHash.mockResolvedValue(null);
  const res = buildRes();
  await refreshToken(req(), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(rotate).not.toHaveBeenCalled();
  expect(generateAccessToken).not.toHaveBeenCalled();
});

test('rotation RPC reports not_found: 403 AUTH_SESSION_EXPIRED, nothing issued', async () => {
  rotate.mockResolvedValue({ status: 'not_found' });
  const res = buildRes();
  await refreshToken(req(), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_SESSION_EXPIRED' }));
  expect(res.cookie).not.toHaveBeenCalled();
});

test('token-version mismatch in the JWT: 403 before any rotation', async () => {
  jwtVerify.mockReturnValue({ id: 'u1', tokenVersion: 0 });
  findOneUserAuth.mockReturnValue(chain({ tokenVersion: 3 }));
  const res = buildRes();
  await refreshToken(req(), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(rotate).not.toHaveBeenCalled();
});

test('missing cookie: 401 AUTH_SESSION_EXPIRED', async () => {
  const res = buildRes();
  await refreshToken(req(null), res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(findByTokenHash).not.toHaveBeenCalled();
});

test('rotation function missing in the database (production today): fails CLOSED with 500 AUTH_REFRESH_FAILED, no tokens, no bypass', async () => {
  rotate.mockRejectedValue(Object.assign(new Error('Could not find the function public.kayad_rotate_refresh_token'), { code: 'PGRST202' }));
  const res = buildRes();
  await refreshToken(req(), res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REFRESH_FAILED' }));
  expect(generateAccessToken).not.toHaveBeenCalled();
  expect(res.cookie).not.toHaveBeenCalled();
});
