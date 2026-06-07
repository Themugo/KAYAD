import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from '../../pages/LoginPage';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  authAPI: { login: vi.fn(), me: vi.fn().mockRejectedValue({}) },
  isDemoMode: () => false,
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
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText(/sign in to your kayad account/i)).toBeInTheDocument();
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
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('has sign in button', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has forgot password and register links', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    expect(screen.getByText(/join free/i)).toBeInTheDocument();
  });
});
