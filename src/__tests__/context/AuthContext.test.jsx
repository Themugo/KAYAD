import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const mockAuthAPI = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    post: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    put: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    delete: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    patch: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: {} },
  };
  return { default: mockAxios };
});

vi.mock('../../api/api', () => ({
  authAPI: mockAuthAPI,
}));

vi.mock('../../utils/sentry', () => ({
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
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
    localStorage.clear();
  });

  it('provides initial state with no user when me() returns 401', () => {
    mockAuthAPI.me.mockRejectedValue({ response: { status: 401 } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuth).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('resolves loading to false after me() settles', async () => {
    mockAuthAPI.me.mockRejectedValue({ response: { status: 401 } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.loading).toBe(false);
  });

  it('sets user when me() succeeds (session cookie present)', async () => {
    mockAuthAPI.me.mockResolvedValue({ user: { _id: '1', name: 'John', email: 'a@b.com', role: 'user', emailVerified: true } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.user?.name).toBe('John');
    expect(result.current.isAuth).toBe(true);
    expect(result.current.isEmailVerified).toBe(true);
  });

  it('computes isAdmin correctly', async () => {
    mockAuthAPI.me.mockResolvedValue({ user: { _id: '2', name: 'Admin', email: 'admin@kayad.com', role: 'superadmin', emailVerified: true } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isDealer).toBe(false);
  });

  it('computes isDealer correctly', async () => {
    mockAuthAPI.me.mockResolvedValue({ user: { _id: '3', name: 'Dealer', email: 'd@kayad.com', role: 'dealer', emailVerified: true, approved: true } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.isDealer).toBe(true);
    expect(result.current.isSeller).toBe(true);
  });

  it('login sets user (token stored in HttpOnly cookie by backend)', async () => {
    mockAuthAPI.me.mockRejectedValue({ response: { status: 401 } });
    mockAuthAPI.login.mockResolvedValue({ token: 'ignored', user: { _id: '4', name: 'LoggedIn', email: 'l@b.com', role: 'user' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => result.current.login({ email: 'a@b.com', password: 'x' }));
    expect(result.current.token).toBeUndefined();
    expect(result.current.user?.name).toBe('LoggedIn');
    expect(localStorage.getItem('kayad_token')).toBeNull();
  });

  it('logout clears auth state', async () => {
    mockAuthAPI.me.mockResolvedValue({ user: { _id: '5', name: 'Temp', email: 't@b.com', role: 'user' } });
    mockAuthAPI.logout.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => result.current.logout());
    expect(result.current.token).toBeUndefined();
    expect(result.current.user).toBeNull();
  });

  it('handles me() network error gracefully', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.isAuth).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});

describe('useAuth', () => {
  it('returns context within provider', () => {
    mockAuthAPI.me.mockRejectedValue({ response: { status: 401 } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.isAuth).toBe(false);
  });
});
