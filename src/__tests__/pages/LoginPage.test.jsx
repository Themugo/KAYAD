import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from '../../pages/LoginPage';

vi.mock('../../utils/posthog', () => ({ setPostHogUser: () => {}, clearPostHogUser: () => {} }));
vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  authAPI: { login: vi.fn(), me: vi.fn().mockRejectedValue({}) },
}));
vi.mock('../../context/SocketContext', () => ({
  SocketProvider: ({ children }) => children,
  useSocket: () => ({ on: () => () => {} }),
}));
vi.mock('../../context/NotificationContext', () => ({
  NotificationProvider: ({ children }) => children,
  useNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));
vi.mock('../../context/CompareContext', () => ({
  CompareProvider: ({ children }) => children,
  useCompare: () => ({ compareIds: [], compareCount: 0, addCar: () => {}, removeCar: () => {}, isComparing: () => false }),
}));
vi.mock('../../context/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ toast: vi.fn() }),
}));

describe('LoginPage', () => {
  afterEach(() => { cleanup(); });

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Welcome back.')).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your KAYAD account and continue/i)).toBeInTheDocument();
  });

  it('has email and password fields', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('has sign in button', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /continue to KAYAD/i })).toBeInTheDocument();
  });

  it('has register link', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Create your KAYAD account/i)).toBeInTheDocument();
  });

  it('carries a validated next/intent to the register link', () => {
    render(
      <MemoryRouter initialEntries={['/login?next=%2Fauctions%2F42&intent=seller']}>
        <AuthProvider><LoginPage /></AuthProvider>
      </MemoryRouter>
    );
    const link = screen.getByText(/Create your KAYAD account/i).closest('a');
    expect(link.getAttribute('href')).toBe('/register?next=%2Fauctions%2F42&intent=seller');
  });

  it('drops an open-redirect next from the register link', () => {
    render(
      <MemoryRouter initialEntries={['/login?next=https%3A%2F%2Fevil.example%2F']}>
        <AuthProvider><LoginPage /></AuthProvider>
      </MemoryRouter>
    );
    const link = screen.getByText(/Create your KAYAD account/i).closest('a');
    expect(link.getAttribute('href')).toBe('/register');
  });

  it('shows the verification banner when redirected with verify=required', () => {
    render(
      <MemoryRouter initialEntries={['/login?verify=required']}>
        <AuthProvider><LoginPage /></AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Email verification required/i)).toBeInTheDocument();
  });
});
