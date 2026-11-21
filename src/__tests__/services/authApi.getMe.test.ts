import { describe, it, expect, vi, beforeEach } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());
vi.mock('../../api/httpRequest', () => ({
  request: requestMock,
  HttpRequestError: class HttpRequestError extends Error { status?: number; constructor(m: string, s?: number) { super(m); this.status = s; } },
}));
const { getMe, AuthApiError } = await import('../../services/authApi');
const { HttpRequestError } = await import('../../api/httpRequest');

describe('getMe(): signed-in / signed-out / unknown are three different outcomes', () => {
  beforeEach(() => { requestMock.mockReset(); });

  it('returns the user for a valid contract', async () => {
    requestMock.mockResolvedValue({ success: true, user: { id: 'u1', email: 'a@x.test', role: 'user' } });
    await expect(getMe()).resolves.toMatchObject({ id: 'u1' });
  });
  it('accepts a legacy _id-only user', async () => {
    requestMock.mockResolvedValue({ success: true, user: { _id: 'u1' } });
    await expect(getMe()).resolves.toMatchObject({ _id: 'u1' });
  });
  it('401 -> null (confirmed signed out)', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('Not authorized', 401));
    await expect(getMe()).resolves.toBeNull();
  });
  it.each([[500], [502], [503], [504], [429], [408]])('HTTP %i -> throws (unknown), never null', async (status) => {
    requestMock.mockRejectedValue(new HttpRequestError('x', status));
    await expect(getMe()).rejects.toBeInstanceOf(AuthApiError);
  });
  it('network failure (no status) -> throws kind=network', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('Unable to reach KAYAD servers.'));
    await expect(getMe()).rejects.toMatchObject({ kind: 'network' });
  });
  it('403 is an authorization failure, not "signed out" and not network', async () => {
    requestMock.mockRejectedValue(new HttpRequestError('Account suspended', 403));
    await expect(getMe()).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
  });
  it.each([['html string', '<html>spa</html>'], ['null', null], ['empty object', {}], ['success without user', { success: true }], ['user without id', { success: true, user: { email: 'a@x.test' } }], ['user not an object', { success: true, user: 'u1' }]])(
    'malformed 200 (%s) -> throws, never "signed in" or "signed out"', async (_n, body) => {
      requestMock.mockResolvedValue(body);
      await expect(getMe()).rejects.toMatchObject({ kind: 'unknown' });
    });
  it('passes the per-attempt timeout through to the transport', async () => {
    requestMock.mockResolvedValue({ success: true, user: { id: 'u1' } });
    await getMe({ timeoutMs: 8000 });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({ timeout: 8000, method: 'GET' }));
  });
});
