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


describe('LoginPage: owner second factor (Phase 16)', () => {
  const loginBodies = [];
  beforeEach(() => {
    loginBodies.length = 0; requestMock.mockReset();
    requestMock.mockImplementation(async (path, opts) => {
      if (String(path).includes('/auth/me')) throw new HttpRequestError('Not authorized', 401, {});
      if (String(path).includes('/auth/login')) {
        const b = JSON.parse(opts.body); loginBodies.push(b);
        if (!b.mfaCode) throw new HttpRequestError('Enter the 6-digit code from your authenticator app, or a recovery code.', 401, { success: false, code: 'MFA_REQUIRED', mfaRequired: true });
        if (b.mfaCode === '000000') throw new HttpRequestError('The code is not valid.', 403, { success: false, code: 'OWNER_MFA_INVALID' });
        return { success: true, user: { _id: 'u1', id: 'u1', name: 'Owner', email: b.email, role: 'user', emailVerified: true } };
      }
      throw new Error('unexpected path ' + path);
    });
  });
  afterEach(() => { cleanup(); });
  const fill = () => {
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'owner-disposable@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'disposable-pass-1' } });
  };
  it('does not show a code field until the server asks for one, then does', async () => {
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    expect(screen.queryByLabelText(/authenticator code/i)).toBeNull();
    fill(); fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    await waitFor(() => expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument());
    expect(loginBodies[0]).toEqual({ email: 'owner-disposable@example.test', password: 'disposable-pass-1' });
  });
  it('resubmits the same credentials with the typed code', async () => {
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    fill(); fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    const field = await screen.findByLabelText(/authenticator code/i);
    fireEvent.change(field, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    await waitFor(() => expect(loginBodies.length).toBe(2));
    expect(loginBodies[1]).toEqual({ email: 'owner-disposable@example.test', password: 'disposable-pass-1', mfaCode: '123456' });
  });
  it('an invalid code shows the server message and clears the field', async () => {
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    fill(); fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    const field = await screen.findByLabelText(/authenticator code/i);
    fireEvent.change(field, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to kayad/i }));
    await waitFor(() => expect(screen.getByText(/code is not valid/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/authenticator code/i).value).toBe('');
  });
});
