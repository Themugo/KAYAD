import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const authMocks = vi.hoisted(() => ({
  getMe: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateProfile: vi.fn(),
}));
vi.mock('../../services/authApi', () => authMocks);
vi.mock('../../utils/posthog', () => ({ setPostHogUser: vi.fn(), clearPostHogUser: vi.fn() }));

import { AuthProvider, useAuth } from '../../context/AuthContext';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('signOut is server-confirmed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getMe.mockResolvedValue({ id: 'a', email: 'a@x.test', role: 'superadmin', name: 'A' });
  });

  it('keeps the session and reports failure when the backend cannot confirm revocation', async () => {
    authMocks.logout.mockRejectedValue(Object.assign(new Error('Network Error'), { status: undefined }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    let outcome: any;
    await act(async () => { outcome = await result.current.signOut(); });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toMatch(/Network Error/);
    expect(result.current.user).not.toBeNull();
  });

  it('clears the session on success and on 401 (already revoked)', async () => {
    authMocks.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    window.sessionStorage.setItem('kayad.admin.command-centre.view.v1', '{"search":"x"}');
    await act(async () => { expect((await result.current.signOut()).ok).toBe(true); });
    expect(result.current.user).toBeNull();
    expect(window.sessionStorage.getItem('kayad.admin.command-centre.view.v1')).toBeNull();
  });

  it('treats 401 as a confirmed sign-out', async () => {
    authMocks.logout.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    await act(async () => { expect((await result.current.signOut()).ok).toBe(true); });
    expect(result.current.user).toBeNull();
  });

  it('logout() (Navbar/Profile/inspector path) reports failure with a visible alert and keeps the session', async () => {
    authMocks.logout.mockRejectedValue(Object.assign(new Error('Network Error'), { status: undefined }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    let outcome: any;
    await act(async () => { outcome = await result.current.logout(); });
    expect(outcome.ok).toBe(false);
    expect(result.current.user).not.toBeNull();
    expect((await screen.findByTestId('signout-failure-notice')).textContent).toMatch(/Network Error/);
  });

  it('logout() success clears the session and shows no alert', async () => {
    authMocks.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    await act(async () => { expect((await result.current.logout()).ok).toBe(true); });
    expect(result.current.user).toBeNull();
    expect(screen.queryByTestId('signout-failure-notice')).toBeNull();
  });
});
