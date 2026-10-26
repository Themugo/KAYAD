// P0 regression: a transient session-check failure must never be treated as "signed out".
// Distinguishes: confirmed 401 (unauthenticated) vs network / 5xx / 429 / CSRF / malformed (error, retryable, no access, no redirect).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, RequireAuth, classifySessionProbeFailure, SESSION_PROBE_RETRY_DELAYS_MS, useAuth } from '../../context/AuthContext';

const authMocks = vi.hoisted(() => ({ getMe: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined), updateProfile: vi.fn() }));
vi.mock('../../services/authApi', () => authMocks);
vi.mock('../../utils/posthog', () => ({ setPostHogUser: vi.fn(), clearPostHogUser: vi.fn() }));

const err = (kind: string, status?: number) => Object.assign(new Error(kind), { kind, status });
const USER = { id: 'u1', name: 'Alice', email: 'a@example.test', role: 'user' };

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname}{l.search}</div>; }
function Status() { const a = useAuth(); return <div data-testid="status">{a.sessionStatus}|{String(a.isAuth)}</div>; }
function App({ at = '/chat' }: { at?: string }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <Status /><Where />
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route path="/chat" element={<RequireAuth><div>MESSAGES UI</div></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe('classifySessionProbeFailure', () => {
  it.each([
    [err('invalid_credentials', 401), true],
    [err('forbidden', 403), true],
    [err('server', 500), false],
    [err('server', 503), false],
    [err('network'), false],
    [err('rate_limited', 429), false],
    [err('csrf', 403), false],
    [err('unknown', 200), false],
    [new TypeError('boom'), false],
  ])('%j -> confirmed=%s', (e, confirmed) => { expect(classifySessionProbeFailure(e).confirmed).toBe(confirmed); });
});

describe('AuthProvider session states', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stays in loading (spinner, no redirect) while the probe is unresolved', async () => {
    authMocks.getMe.mockReturnValue(new Promise(() => {}));
    render(<App />); await flush(5000);
    expect(screen.getByTestId('status').textContent).toBe('loading|false');
    expect(screen.getByTestId('where').textContent).toBe('/chat');
    expect(screen.queryByText('LOGIN PAGE')).toBeNull(); expect(screen.queryByText('MESSAGES UI')).toBeNull();
  });

  it('authenticated: renders the protected route', async () => {
    authMocks.getMe.mockResolvedValue(USER);
    render(<App />); await flush();
    expect(screen.getByText('MESSAGES UI')).toBeTruthy(); expect(screen.getByTestId('status').textContent).toBe('authenticated|true');
  });

  it('confirmed 401 (getMe -> null): unauthenticated and redirected to login carrying next', async () => {
    authMocks.getMe.mockResolvedValue(null);
    render(<App />); await flush();
    expect(screen.getByText('LOGIN PAGE')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toContain('/login');
    expect(screen.getByTestId('where').textContent).toContain('next=');
    expect(authMocks.getMe).toHaveBeenCalledTimes(1); // a real 401 is not retried
  });

  it.each([['500', err('server', 500)], ['503', err('server', 503)], ['network/timeout', err('network')], ['malformed 200', err('unknown', 200)]])(
    'transient %s: bounded retries, then recovery UI - NOT login, NO access', async (_n, e) => {
      authMocks.getMe.mockRejectedValue(e);
      render(<App />); await flush();
      expect(screen.getByTestId('status').textContent).toBe('loading|false'); // first failure: still waiting, not logged out
      await flush(SESSION_PROBE_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0) + 50);
      expect(authMocks.getMe).toHaveBeenCalledTimes(1 + SESSION_PROBE_RETRY_DELAYS_MS.length); // bounded
      expect(screen.getByTestId('status').textContent).toBe('error|false');
      expect(screen.getByTestId('session-recovery')).toBeTruthy();
      expect(screen.queryByText('LOGIN PAGE')).toBeNull(); expect(screen.queryByText('MESSAGES UI')).toBeNull();
      expect(screen.getByTestId('where').textContent).toBe('/chat');
      await flush(60_000); expect(authMocks.getMe).toHaveBeenCalledTimes(1 + SESSION_PROBE_RETRY_DELAYS_MS.length); // no endless retries
    });

  it('transient failure that clears within the retry budget ends authenticated', async () => {
    authMocks.getMe.mockRejectedValueOnce(err('server', 503)).mockResolvedValue(USER);
    render(<App />); await flush(SESSION_PROBE_RETRY_DELAYS_MS[0] + 50);
    expect(screen.getByText('MESSAGES UI')).toBeTruthy(); expect(authMocks.getMe).toHaveBeenCalledTimes(2);
  });

  it('"Try again" re-checks and reaches the protected route once the server recovers', async () => {
    authMocks.getMe.mockRejectedValue(err('server', 503));
    render(<App />); await flush(10_000);
    expect(screen.getByTestId('session-recovery')).toBeTruthy();
    authMocks.getMe.mockResolvedValue(USER);
    await act(async () => { fireEvent.click(screen.getByTestId('session-retry')); }); await flush();
    expect(screen.getByText('MESSAGES UI')).toBeTruthy();
  });

  it('"Try again" that finds the session really expired goes to login (confirmed 401)', async () => {
    authMocks.getMe.mockRejectedValue(err('network'));
    render(<App />); await flush(10_000);
    authMocks.getMe.mockResolvedValue(null);
    await act(async () => { fireEvent.click(screen.getByTestId('session-retry')); }); await flush();
    expect(screen.getByText('LOGIN PAGE')).toBeTruthy();
  });

  it('coming back online while in error re-checks once', async () => {
    authMocks.getMe.mockRejectedValue(err('network'));
    render(<App />); await flush(10_000);
    const calls = authMocks.getMe.mock.calls.length; authMocks.getMe.mockResolvedValue(USER);
    await act(async () => { window.dispatchEvent(new Event('online')); }); await flush();
    expect(authMocks.getMe.mock.calls.length).toBe(calls + 1); expect(screen.getByText('MESSAGES UI')).toBeTruthy();
  });

  it('kayad:auth-expired (definitive refresh rejection) -> unauthenticated -> login', async () => {
    authMocks.getMe.mockResolvedValue(USER);
    render(<App />); await flush();
    await act(async () => { window.dispatchEvent(new Event('kayad:auth-expired')); }); await flush();
    expect(screen.getByText('LOGIN PAGE')).toBeTruthy();
  });

  it('a failed sign-in while the bootstrap was in flight does not leave the app stuck in loading', async () => {
    authMocks.getMe.mockReturnValue(new Promise(() => {})); authMocks.login.mockRejectedValue(err('invalid_credentials', 401));
    const sink = vi.fn<(a: ReturnType<typeof useAuth>) => void>();
    const current = () => sink.mock.calls[sink.mock.calls.length - 1][0];
    function Grab() { sink(useAuth()); return null; }
    render(<MemoryRouter><AuthProvider><Grab /></AuthProvider></MemoryRouter>); await flush();
    await act(async () => { await current().login('a@example.test', 'x').catch(() => undefined); });
    expect(current().sessionStatus).toBe('unauthenticated');
  });
});
