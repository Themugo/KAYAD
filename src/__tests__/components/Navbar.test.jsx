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

  // Approved product contract (Stage 4 -> present): the signed-out header exposes ONE combined
  // "Sign In / Sign Up" entry that routes to the standalone /login surface, and /login itself carries
  // the "Create your KAYAD account" link to /register (asserted in pages/LoginPage.test.jsx and
  // validate-explicit-auth-flows). There is deliberately no second header control for registration.
  it('renders a single combined Sign In / Sign Up entry for guests (registration is reached through /login)', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    const entry = screen.getByRole('button', { name: /sign in \/ sign up/i });
    expect(entry).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /sign (in|up)/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^create account$/i })).toBeNull();
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

  it('the mobile drawer offers the same single Sign In / Sign Up entry and it opens the standalone login flow', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const entries = Array.from(drawer.querySelectorAll('button')).filter((b) => /sign in \/ sign up/i.test(b.textContent || ''));
    expect(entries).toHaveLength(1);
    expect(Array.from(drawer.querySelectorAll('button')).some((b) => /^create account$/i.test((b.textContent || '').trim()))).toBe(false);
    fireEvent.click(entries[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TEST: while the
  // authoritative session check is in flight, `user` is always null
  // regardless of whether the visitor is actually signed in. Before this
  // fix, Navbar rendered straight off `user`, so an already-authenticated
  // customer saw the signed-out "Sign In / Sign Up" button flash on every
  // reload. With `authLoading` true, neither the signed-in nor the
  // signed-out control should render.
  it('renders neither the signed-in menu nor the sign-in button while the session check is still in flight', () => {
    render(<MemoryRouter><Navbar {...guestProps} authLoading={true} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /create account/i })).toBeNull();
    expect(screen.queryByText(/sign in \/ sign up/i)).toBeNull();
  });

  it('renders the signed-out sign-in control once the session check resolves to unauthenticated', () => {
    render(<MemoryRouter><Navbar {...guestProps} authLoading={false} /></MemoryRouter>);
    expect(screen.getByText(/sign in \/ sign up/i)).toBeTruthy();
  });
});
