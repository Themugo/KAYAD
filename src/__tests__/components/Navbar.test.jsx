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
  DEFAULT_LOGO_URL: '/branding/kayard-ke-logo.png',
  DEFAULT_LOGO_DARK_URL: '/branding/kayard-ke-logo-dark.png',
  onBrandLogoError: () => {},
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
vi.mock('../../utils/authRoutes', async (importOriginal) => ({ ...(await importOriginal()), isSellerRole: () => false }));
vi.mock('../../components/features/common/NotificationCenter', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => children,
}));

describe('Navbar', () => {
  afterEach(() => { cleanup(); });

  const guestProps = {
    user: null, savedCount: 0, activeNav: 'marketplace', onNavClick: vi.fn(),
    selectedCounty: 'All Kenya', onCountyChange: vi.fn(), onOpenAuth: vi.fn(),
    onOpenAlerts: vi.fn(), onLogout: vi.fn(), unreadCount: 0,
  };

  it('renders KAYAD branding', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    expect(screen.getAllByText('KAYAD').length).toBeGreaterThan(0);
  });

  it('places the mobile menu as the final header control after the brand and utility actions', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    const headerBar = document.querySelector('.kayad-header__bar');
    const brand = headerBar?.querySelector(':scope > .kayad-brand');
    const utilities = headerBar?.querySelector(':scope > .kayad-utilities');
    const menu = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(headerBar).toBeTruthy();
    expect(brand).toBeTruthy();
    expect(utilities).toBeTruthy();
    expect(menu.parentElement).toBe(headerBar);
    // Approved mobile order: brand (left), utilities, search, then the menu as the extreme-right, final control.
    const kids = Array.from(headerBar.children);
    const search = screen.getByRole('button', { name: 'Search vehicles' });
    expect(search.parentElement).toBe(headerBar);
    expect(kids.indexOf(search)).toBe(kids.indexOf(utilities) + 1);
    expect(kids.indexOf(menu)).toBe(kids.length - 1);
    expect(kids.indexOf(menu)).toBe(kids.indexOf(search) + 1);
    expect(utilities.contains(menu)).toBe(false);
  });

  it('draws a wide admin-managed logo alone at its natural ratio and keeps square marks with the live wordmark', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    const img = document.querySelector('.kayad-brand__image');
    expect(img).toBeTruthy();
    Object.defineProperty(img, 'naturalWidth', { value: 1200, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 403, configurable: true });
    fireEvent.load(img);
    expect(document.querySelector('.kayad-brand--lockup')).toBeTruthy();
    expect(document.querySelector('.kayad-header--lockup')).toBeTruthy();
    expect(img.getAttribute('alt')).toMatch(/KAYA/);
    Object.defineProperty(img, 'naturalWidth', { value: 512, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 512, configurable: true });
    fireEvent.load(img);
    expect(document.querySelector('.kayad-brand--lockup')).toBeNull();
  });

  it('uses the supplied authoritative unread count for the Messages badge', () => {
    render(<MemoryRouter><Navbar {...guestProps} user={{ id: 'u1', name: 'Test User', role: 'buyer' }} unreadCount={4} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Messages, 4 unread' })).toBeInTheDocument();
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
  it('a returning member sees neither the signed-in menu nor the sign-in button while the session check is still in flight', () => {
    window.localStorage.setItem('kayad_session_hint', '1');
    try {
      render(<MemoryRouter><Navbar {...guestProps} authLoading={true} /></MemoryRouter>);
      expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /create account/i })).toBeNull();
      expect(screen.queryByText(/sign in \/ sign up/i)).toBeNull();
    } finally { window.localStorage.removeItem('kayad_session_hint'); }
  });

  it('a first-time or signed-out visitor gets a working Sign In immediately, without waiting for the session check', () => {
    window.localStorage.removeItem('kayad_session_hint');
    render(<MemoryRouter><Navbar {...guestProps} authLoading={true} /></MemoryRouter>);
    expect(screen.getByText(/sign in \/ sign up/i)).toBeTruthy();
  });

  it('renders the signed-out sign-in control once the session check resolves to unauthenticated', () => {
    render(<MemoryRouter><Navbar {...guestProps} authLoading={false} /></MemoryRouter>);
    expect(screen.getByText(/sign in \/ sign up/i)).toBeTruthy();
  });

  it('mobile drawer: Price Alerts appears once, shortcut tiles use the readable tile style and the current child link is flagged', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar {...guestProps} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const alerts = Array.from(drawer.querySelectorAll('button')).filter((b) => /^price alerts$/i.test((b.textContent || '').trim()));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].className).toContain('kayad-drawer-tile');
  });

  it('keeps Price Alerts in its own Quick access section instead of mixing it into account workspace links', () => {
    render(<MemoryRouter initialEntries={['/']}>
      <Navbar {...guestProps} />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const quickAccess = drawer.querySelector('#kayad-drawer-quick-access')?.parentElement;
    expect(quickAccess).toBeTruthy();
    expect(quickAccess.textContent).toContain('Price Alerts');
    expect(drawer.querySelector('#kayad-drawer-workspace')).toBeNull();
  });

  it('keeps signed-in role workspace separate from Quick access', () => {
    const buyer = { ...guestProps, user: { id: 'buyer-1', name: 'Buyer', email: 'buyer@example.test', role: 'buyer' } };
    render(<MemoryRouter><Navbar {...buyer} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const workspace = drawer.querySelector('#kayad-drawer-workspace')?.parentElement;
    const quickAccess = drawer.querySelector('#kayad-drawer-quick-access')?.parentElement;
    expect(workspace).toBeTruthy();
    expect(quickAccess).toBeTruthy();
    expect(workspace.textContent).not.toContain('Price Alerts');
    expect(quickAccess.textContent).toContain('Price Alerts');
  });

  it('mobile menu is a single readable list with an always-visible close control', () => {
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeTruthy();
    expect(drawer.querySelector('.kayad-mobile-menu__topbar')).toBeTruthy();
    expect(drawer.querySelector('.kayad-mobile-drawer-primary')).toBeTruthy();
  });


  it('does not show a signed-out prompt while a returning member session is still being checked', () => {
    localStorage.setItem('kayad_session_hint', '1');
    render(<MemoryRouter><Navbar {...guestProps} authLoading /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    expect(screen.getByRole('status', { name: /checking your account/i })).toBeTruthy();
    expect(drawer.querySelector('button')?.textContent).not.toMatch(/sign in|sign up/i);
    expect(screen.queryByText('Welcome to KAYAD')).toBeNull();
    localStorage.removeItem('kayad_session_hint');
  });

  it('locks background page scrolling while the mobile drawer is open and restores prior styles', () => {
    document.body.style.overflow = 'clip';
    document.documentElement.style.overflow = 'auto';
    render(<MemoryRouter><Navbar {...guestProps} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(document.body.style.overflow).toBe('clip');
    expect(document.documentElement.style.overflow).toBe('auto');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  it('mobile menu keeps categories compact with accessible expandable child lists', () => {
    render(<MemoryRouter initialEntries={['/']}>
      <Navbar {...guestProps} activeNav="marketplace" />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const marketplaceToggle = screen.getByRole('button', { name: /collapse marketplace links/i });
    expect(marketplaceToggle.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.querySelector('#kayad-drawer-links-marketplace')).toBeTruthy();

    const auctionToggle = screen.getByRole('button', { name: /expand auctions links/i });
    expect(auctionToggle.getAttribute('aria-expanded')).toBe('false');
    expect(drawer.querySelector('#kayad-drawer-links-auction')?.hasAttribute('hidden')).toBe(true);
    fireEvent.click(auctionToggle);
    expect(screen.getByRole('button', { name: /collapse auctions links/i }).getAttribute('aria-expanded')).toBe('true');
    expect(drawer.querySelector('#kayad-drawer-links-auction')?.hasAttribute('hidden')).toBe(false);
  });

  it('keeps Price Alerts and Compare Vehicles together in Quick Access without role-specific duplicates', () => {
    const onOpenCompare = vi.fn();
    const buyer = { ...guestProps, user: { id: 'buyer-1', name: 'Buyer', email: 'buyer@example.test', role: 'buyer' }, onOpenCompare };
    render(<MemoryRouter><Navbar {...buyer} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const quickAccess = drawer.querySelector('#kayad-drawer-quick-access')?.parentElement;
    expect(quickAccess).toBeTruthy();
    const compareButtons = Array.from(drawer.querySelectorAll('button')).filter((b) => (b.textContent || '').trim() === 'Compare Vehicles');
    expect(compareButtons).toHaveLength(1);
    expect(quickAccess?.contains(compareButtons[0])).toBe(true);
    fireEvent.click(compareButtons[0]);
    expect(onOpenCompare).toHaveBeenCalledTimes(1);
  });

  it('signed-in buyer sees Saved Vehicles only once in the unified menu list', () => {
    const buyer = { ...guestProps, user: { id: 'buyer-1', name: 'Buyer', email: 'buyer@example.test', role: 'buyer' } };
    render(<MemoryRouter><Navbar {...buyer} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const savedLinks = Array.from(drawer.querySelectorAll('a')).filter((a) => (a.textContent || '').trim() === 'Saved vehicles');
    expect(savedLinks).toHaveLength(1);
  });

});
