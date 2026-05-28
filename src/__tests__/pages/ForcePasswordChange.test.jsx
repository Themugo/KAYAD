import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForcePasswordChange from '../../pages/ForcePasswordChange';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  authAPI: { changePassword: vi.fn() },
  isDemoMode: () => false,
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', email: 'superadmin@kayad.demo', mustChangePassword: true, role: 'admin' },
    loading: false,
    setUser: vi.fn(),
    login: vi.fn(),
    isAdmin: true,
  }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ForcePasswordChange', () => {
  afterEach(() => { cleanup(); });

  it('renders password change form', () => {
    render(
      <MemoryRouter>
        <ForcePasswordChange />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/claim system ownership/i).length).toBeGreaterThan(0);
  });
});
