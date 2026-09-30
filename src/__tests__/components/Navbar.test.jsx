import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
vi.mock('../../context/BrandingContext', () => ({
  useBranding: () => ({
    branding: { logoType: 'icon', logoText: 'KAYAD' },
    loading: false,
    hydrated: true,
  }),
}));
vi.mock('../../api/api', () => ({
  carsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  notifAPI: { list: vi.fn().mockResolvedValue({ notifications: [] }) },
}));
vi.mock('../../utils/helpers', () => ({ initials: () => 'TU' }));
vi.mock('../../utils/authRoutes', () => ({ isSellerRole: () => false }));
vi.mock('../../components/features/common/NotificationCenter', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => children,
}));

describe('Navbar', () => {
  afterEach(() => { cleanup(); });

  const guestProps = {
    user: null, savedCount: 0, activeNav: 'marketplace', onNavClick: vi.fn(),
    selectedCounty: 'All East Africa', onCountyChange: vi.fn(), onOpenAuth: vi.fn(),
    onOpenAlerts: vi.fn(), onLogout: vi.fn(), unreadCount: 0,
  };

  it('renders KAYAD branding', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    expect(screen.getAllByText('KAYAD').length).toBeGreaterThan(0);
  });

  it('renders explicit sign-in and account creation routes for guests', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });

  it('navbar Sign In navigates to the standalone login flow', () => {
    function LocationProbe() {
      const location = useLocation();
      return <span data-testid="location">{location.pathname}</span>;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar {...guestProps} />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(guestProps.onOpenAuth).not.toHaveBeenCalled();
  });

  it('navbar Create Account navigates to the standalone registration flow', () => {
    function LocationProbe() {
      const location = useLocation();
      return <span data-testid="location">{location.pathname}</span>;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar {...guestProps} />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });
});
