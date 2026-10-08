import { jest } from '@jest/globals';

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TEST:
// authController.js::login previously read
// `!userAuth || !(await userAuth.matchPassword(password))` — when
// `userAuth` was null (unknown email), the `||` short-circuited before
// ever calling bcrypt.compare, so an unknown-email login paid no bcrypt
// cost while a known-email/wrong-password login did, creating a
// measurable timing oracle for account enumeration. This proves
// bcrypt.compare is now invoked on the unknown-email path too (via a
// dummy hash), equalizing the work done, while the response itself is
// unchanged (still a generic "Invalid credentials", no enumeration via
// content).

const findOneUser = jest.fn();
const findOneUserAuth = jest.fn();
const bcryptCompare = jest.fn().mockResolvedValue(false);
const bcryptHash = jest.fn().mockResolvedValue('$2a$12$dummyhashdummyhashdummyhashdu');
const recordFailedAttempt = jest.fn();
const recordSuccessfulAttempt = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({ default: { findOne: findOneUser } }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOne: findOneUserAuth } }));
jest.unstable_mockModule('../../models/Dealer.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/PlatformConfig.js', () => ({ default: {} }));
jest.unstable_mockModule('bcryptjs', () => ({ default: { compare: bcryptCompare, hash: bcryptHash } }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/format.js', () => ({ formatPhone: jest.fn() }));
jest.unstable_mockModule('../../services/notification.service.js', () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule('../../services/communicationGateway.service.js', () => ({ deliver: jest.fn() }));
jest.unstable_mockModule('../../services/communicationEvents.service.js', () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule('../../utils/generateToken.js', () => ({ generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() }));
jest.unstable_mockModule('../../middleware/auth.js', () => ({ invalidateUserCache: jest.fn() }));
jest.unstable_mockModule('../../middleware/accountLockout.js', () => ({ recordFailedAttempt, recordSuccessfulAttempt }));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError: jest.fn() }));
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: jest.fn() }));
jest.unstable_mockModule('../../utils/fieldMap.js', () => ({ mapRowIn: jest.fn((x) => x) }));

const { login } = await import('../../controllers/authController.js');

function buildRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  bcryptCompare.mockResolvedValue(false);
  bcryptHash.mockResolvedValue('$2a$12$dummyhashdummyhashdummyhashdu');
});

test('an unknown email still pays the bcrypt.compare cost (no longer short-circuited away)', async () => {
  findOneUser.mockResolvedValue(null);
  const req = { body: { email: 'nobody@example.com', password: 'whatever123' } };
  const res = buildRes();

  await login(req, res);

  // UserAuth.findOne is never reached for an unknown email (user is null),
  // confirming this really is the "unknown account" branch, not some other
  // path that happens to also call compare.
  expect(findOneUserAuth).not.toHaveBeenCalled();
  expect(bcryptCompare).toHaveBeenCalledTimes(1);
  expect(bcryptCompare).toHaveBeenCalledWith('whatever123', expect.any(String));
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Invalid credentials' }));
});

test('every repeated unknown-email attempt still pays the bcrypt.compare cost', async () => {
  findOneUser.mockResolvedValue(null);
  const res1 = buildRes();
  const res2 = buildRes();

  await login({ body: { email: 'a@example.com', password: 'x' } }, res1);
  await login({ body: { email: 'b@example.com', password: 'y' } }, res2);

  // The dummy hash is cached lazily at module scope (built at most once per
  // process, not recomputed every request), but bcrypt.compare - the actual
  // cost being equalized against the known-email path - runs on every
  // unknown-email attempt, not just the first.
  expect(bcryptCompare).toHaveBeenCalledTimes(2);
});
