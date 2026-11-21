import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// STAGE 5E: a correct password for an UNVERIFIED designated-owner address is refused by the backend with 403 OWNER_IDENTITY_UNVERIFIED
// and a message that tells the owner to use "Resend verification email". The login screen must actually render that action,
// keep the owner-specific explanation visible, and call the (generic, enumeration-safe) resend endpoint. Real authApi + real
// AuthContext; only the HTTP transport is stubbed. No network, no provider.
const requestMock = vi.hoisted(() => vi.fn());
vi.mock('../../api/httpRequest', () => ({
  request: requestMock,
  HttpRequestError: class HttpRequestError extends Error {
    status; responseData;
    constructor(m, s, d) { super(m); this.status = s; this.responseData = d; }
  },
}));
vi.mock('../../utils/posthog', () => ({ setPostHogUser: () => {}, clearPostHogUser: () => {} }));
vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../context/SocketContext', () => ({ SocketProvider: ({ children }) => children, useSocket: () => ({ on: () => () => {} }) }));
vi.mock('../../context/NotificationContext', () => ({ NotificationProvider: ({ children }) => children, useNotifications: () => ({ notifications: [], unreadCount: 0 }) }));
vi.mock('../../context/CompareContext', () => ({ CompareProvider: ({ children }) => children, useCompare: () => ({ compareIds: [], compareCount: 0, addCar: () => {}, removeCar: () => {}, isComparing: () => false }) }));
vi.mock('../../context/ToastContext', () => ({ ToastProvider: ({ children }) => children, useToast: () => ({ toast: vi.fn() }) }));

const { HttpRequestError } = await import('../../api/httpRequest');
const { AuthProvider } = await import('../../context/AuthContext');
const { default: LoginPage } = await import('../../pages/LoginPage');

const OWNER_MSG = 'The platform-owner account is not verified. Use "Resend verification email" for the owner address and open the link, or follow the approved owner-recovery runbook (runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md); then sign in again.';

describe('LoginPage: owner identity unverified', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (path) => {
      if (String(path).includes('/auth/me')) throw new HttpRequestError('Not authorized', 401, {});
      if (String(path).includes('/auth/login')) throw new HttpRequestError(OWNER_MSG, 403, { success: false, code: 'OWNER_IDENTITY_UNVERIFIED' });
      if (String(path).includes('/auth/resend-verification')) return { success: true, message: 'generic' };
      throw new Error('unexpected path ' + path);
    });
  });
  afterEach(() => { cleanup(); });

  it('shows the owner explanation AND a working Resend verification email action', async () => {
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'owner-disposable@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'disposable-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));

    await waitFor(() => expect(screen.getByText(/platform-owner account is not verified/i)).toBeInTheDocument());
    const resend = screen.getByRole('button', { name: /resend verification email/i });
    expect(resend).toBeEnabled();

    fireEvent.click(resend);
    await waitFor(() => expect(requestMock.mock.calls.some(([p]) => String(p).includes('/auth/resend-verification'))).toBe(true));
    const call = requestMock.mock.calls.find(([p]) => String(p).includes('/auth/resend-verification'));
    expect(JSON.parse(call[1].body)).toEqual({ email: 'owner-disposable@example.test' });
  });

  it('a plain 403 with the same wording but no code does NOT render the resend action', async () => {
    requestMock.mockImplementation(async (path) => {
      if (String(path).includes('/auth/me')) throw new HttpRequestError('Not authorized', 401, {});
      throw new HttpRequestError(OWNER_MSG, 403, {});
    });
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'x-disposable@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'disposable-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    await waitFor(() => expect(screen.getByText(/platform-owner account is not verified/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /resend verification email/i })).toBeNull();
  });
});
