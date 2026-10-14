import { jest } from '@jest/globals';

const revokeAllForUser = jest.fn();
const findOneAndUpdate = jest.fn();
const invalidateUserCache = jest.fn();
const logError = jest.fn();
const errorResponse = jest.fn((res, message, status) => res.status(status).json({ success: false, message }));

jest.unstable_mockModule('../../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/UserAuth.js', () => ({ default: { findOneAndUpdate } }));
jest.unstable_mockModule('../../models/Dealer.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { revokeAllForUser } }));
jest.unstable_mockModule('../../utils/format.js', () => ({ formatPhone: jest.fn() }));
jest.unstable_mockModule('../../utils/response.js', () => ({
  error: errorResponse,
  errorCode: jest.fn(),
  notFound: jest.fn(),
}));
jest.unstable_mockModule('../../models/PlatformConfig.js', () => ({ default: {} }));
jest.unstable_mockModule('../../services/notification.service.js', () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule('../../services/communicationGateway.service.js', () => ({ deliver: jest.fn() }));
jest.unstable_mockModule('../../services/communicationEvents.service.js', () => ({
  emitCommunication: jest.fn(),
  COMMUNICATION_EVENTS: {},
}));
jest.unstable_mockModule('../../utils/generateToken.js', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));
jest.unstable_mockModule('../../middleware/auth.js', () => ({ invalidateUserCache }));
jest.unstable_mockModule('../../middleware/accountLockout.js', () => ({
  recordFailedAttempt: jest.fn(),
  recordSuccessfulAttempt: jest.fn(),
}));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError }));
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: jest.fn() }));
jest.unstable_mockModule('../../utils/fieldMap.js', () => ({ mapRowIn: jest.fn() }));
jest.unstable_mockModule('bcryptjs', () => ({ default: {} }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: {} }));

const { logout } = await import('../../controllers/authController.js');

const makeResponse = () => {
  const res = { statusCode: 200, cookiesCleared: [], body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.clearCookie = (name, options) => { res.cookiesCleared.push({ name, options }); return res; };
  return res;
};

describe('logout behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    revokeAllForUser.mockResolvedValue(undefined);
    findOneAndUpdate.mockResolvedValue({ tokenVersion: 1 });
  });

  test('revokes all sessions, increments tokenVersion, invalidates cache, and clears auth cookies', async () => {
    const res = makeResponse();

    await logout({ user: { id: 'user-logout-1' } }, res);

    expect(revokeAllForUser).toHaveBeenCalledWith('user-logout-1', 'logout');
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { user: 'user-logout-1' },
      { $inc: { tokenVersion: 1 } },
    );
    expect(invalidateUserCache).toHaveBeenCalledWith('user-logout-1');
    expect(res.cookiesCleared).toEqual([
      { name: 'refreshToken', options: { path: '/' } },
      { name: 'token', options: { path: '/' } },
    ]);
    expect(res.body).toEqual({ success: true, message: 'Logged out from all devices' });
  });

  test('does not report successful logout when refresh-token revocation fails', async () => {
    revokeAllForUser.mockRejectedValue(new Error('revocation failed'));
    const res = makeResponse();

    await logout({ user: { id: 'user-logout-2' } }, res);

    expect(errorResponse).toHaveBeenCalledWith(res, 'Logout failed', 500);
    expect(res.body).toEqual({ success: false, message: 'Logout failed' });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});
