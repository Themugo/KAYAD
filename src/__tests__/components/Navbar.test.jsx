import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'TestUser', role: 'dealer' },
    isAuth: true,
    isAdmin: false,
    logout: vi.fn(),
  }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ connected: true }),
}));
vi.mock('../../context/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 3 }),
}));
vi.mock('../../api/api', () => ({
  carsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('../../utils/helpers', () => ({ initials: () => 'TU' }));
vi.mock('../../utils/authRoutes', () => ({ isSellerRole: () => false }));
vi.mock('../../components/NotificationCenter', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => children,
}));

describe('Navbar', () => {
  afterEach(() => { cleanup(); });

  it('renders KAYAD branding', () => {
    render(<MemoryRouter><Navbar branding={{}} /></MemoryRouter>);
    expect(screen.getAllByText('KAYAD').length).toBeGreaterThan(0);
  });

  it('renders Gallery link', () => {
    render(<MemoryRouter><Navbar branding={{}} /></MemoryRouter>);
    expect(screen.getAllByText('Gallery').length).toBeGreaterThan(0);
  });
});
