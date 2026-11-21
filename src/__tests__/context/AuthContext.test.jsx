import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const authMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn(),
}));

vi.mock('../../services/authApi', () => authMocks);

vi.mock('../../utils/posthog', () => ({
  setPostHogUser: vi.fn(),
  clearPostHogUser: vi.fn(),
}));

function wrapper({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getMe.mockResolvedValue(null);
    localStorage.clear();
  });

  it('provides initial state with no user when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    expect(result.current.isAuth).toBe(false);
  });

  it('resolves loading to false after initialization', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    expect(result.current.loading).toBe(false);
  });
});

describe('useAuth', () => {
  it('returns context within provider', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    expect(result.current).toBeDefined();
    expect(result.current.isAuth).toBeDefined();
  });
});

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TESTS: the mount
// effect's getMe() call previously had no guard against resolving after a
// newer auth action (login/logout) had already run, so a slow/stale
// bootstrap response could silently overwrite a fresher login or
// resurrect a just-logged-out user.
describe('AuthProvider auth-state race conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('a stale mount-time getMe() does not overwrite a newer login()', async () => {
    let resolveGetMe;
    authMocks.getMe.mockReturnValue(new Promise((resolve) => { resolveGetMe = resolve; }));
    authMocks.login.mockResolvedValue({ id: 'b', email: 'b@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // The mount's getMe() for account A is still in flight when the user
    // logs in as account B.
    await act(async () => {
      await result.current.login('b@example.com', 'pw');
    });
    expect(result.current.user?.email).toBe('b@example.com');

    // The stale bootstrap now resolves with account A's payload - it must
    // be discarded, not silently reinstated over B.
    await act(async () => {
      resolveGetMe({ user: { id: 'a', email: 'a@example.com' } });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.user?.email).toBe('b@example.com');
  });

  it('an in-flight getMe() resolving after logout() does not re-authenticate the UI', async () => {
    let resolveGetMe;
    authMocks.getMe.mockReturnValue(new Promise((resolve) => { resolveGetMe = resolve; }));
    authMocks.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();

    // The mount's getMe() resolves afterward with a pre-logout user payload.
    await act(async () => {
      resolveGetMe({ user: { id: 'a', email: 'a@example.com' } });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.user).toBeNull();
  });
});
