import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import ForcePasswordChange from '../../pages/ForcePasswordChange';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  authAPI: { changePassword: vi.fn() },
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
  useCompare: () => ({ compareIds: [], compareCount: 0 }),
}));
vi.mock('../../context/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ForcePasswordChange', () => {
  afterEach(() => { cleanup(); });

  it('renders password change form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ForcePasswordChange />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
  });
});
