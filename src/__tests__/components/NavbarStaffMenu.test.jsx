import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuth: true, isAdmin: false, logout: vi.fn() }) }));
vi.mock('../../context/SocketContext', () => ({ useSocket: () => ({ connected: true }) }));
vi.mock('../../context/NotificationContext', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../../context/BrandingContext', () => ({ useBranding: () => ({ branding: { logoType: 'icon', logoText: 'KAYAD' }, loading: false, hydrated: true }) }));
vi.mock('../../api/api', () => ({ carsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) }, notifAPI: { list: vi.fn().mockResolvedValue({ notifications: [] }) } }));
vi.mock('../../utils/helpers', () => ({ initials: () => 'JM' }));
vi.mock('../../utils/authRoutes', async (orig) => ({ ...(await orig()), isSellerRole: () => false }));
vi.mock('../../components/features/common/NotificationCenter', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> }, AnimatePresence: ({ children }) => children }));

const props = { savedCount: 0, activeNav: 'dashboard', onNavClick: vi.fn(), selectedCounty: 'All Kenya', onCountyChange: vi.fn(), onOpenAuth: vi.fn(), onOpenAlerts: vi.fn(), onLogout: vi.fn(), unreadCount: 0 };
const renderNav = (role, extra = {}) => render(<MemoryRouter initialEntries={['/']}><Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role }} {...extra} /></MemoryRouter>);
afterEach(() => cleanup());

// The legacy account dropdown was retired: the avatar is an account DESTINATION and the hamburger drawer is the
// only full navigation menu. These tests make sure the duplicate panel cannot come back.
describe('profile control and the retired account dropdown', () => {
  it.each(['user', 'dealer', 'admin', 'superadmin'])('%s: the avatar navigates to the account page and never opens a second menu', (role) => {
    props.onNavClick.mockClear();
    renderNav(role);
    const avatar = document.getElementById('user-profile-menu-button');
    expect(avatar).toBeTruthy();
    expect(avatar.getAttribute('aria-label')).toMatch(/open account profile/i);
    expect(avatar.hasAttribute('aria-expanded')).toBe(false);
    expect(avatar.hasAttribute('aria-controls')).toBe(false);
    fireEvent.click(avatar);
    expect(props.onNavClick).toHaveBeenCalledWith('profile');
    expect(document.getElementById('kayad-account-panel')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(0);
  });
  it('uses initials instead of leaving a broken profile image when the source fails', () => {
    render(<MemoryRouter><Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role: 'superadmin', avatar: 'https://invalid.example/avatar.png' }} /></MemoryRouter>);
    const avatar = document.querySelector('img[src="https://invalid.example/avatar.png"]');
    expect(avatar).toBeTruthy();
    fireEvent.error(avatar);
    expect(screen.getAllByText('JM').length).toBeGreaterThan(0);
  });
});

describe('unified drawer: one menu for every role', () => {
  const LocationProbe = () => { const l = useLocation(); return <output data-testid="route-location">{l.pathname}{l.search}</output>; };
  const openDrawer = (role) => {
    render(<MemoryRouter initialEntries={['/']}><Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role }} /><LocationProbe /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    return screen.getByRole('dialog');
  };
  it.each(['superadmin', 'admin', 'moderator', 'marketing', 'accounts'])('%s drawer carries identity, staff workspaces, Sign out and no buyer/seller shortcuts', (role) => {
    const text = openDrawer(role).textContent;
    expect(text).toContain('James Mugo');
    expect(text).toContain('owner@example.test');
    expect(text).toContain('Admin Console');
    expect(text).toMatch(/Account Settings|Settings/);
    expect(text).toMatch(/Sign out|Log out/i);
    for (const leaked of ['Private Seller Dashboard', 'Buyer Command Center', 'Sell Vehicle', 'My Garage', 'Payment History', 'Vehicle Financing']) expect(text).not.toContain(leaked);
  });
  it('superadmin is labelled Super Admin', () => {
    expect(openDrawer('superadmin').textContent).toContain('Super Admin');
  });
  it.each(['user', 'individual_seller'])('%s drawer keeps buying and selling together and has no admin section', (role) => {
    const text = openDrawer(role).textContent;
    expect(text).not.toMatch(/Admin Console|System Administration/);
    expect(text).not.toMatch(/Buyer Command Center|Private Seller Dashboard/);
    expect(text).toContain('Messages');
    expect(text).toContain('Notifications');
  });
  it('dealer drawer is dealer-only and its items open the matching workspace section', () => {
    const drawer = openDrawer('dealer');
    const text = drawer.textContent;
    for (const item of ['Dealer workspace', 'Inventory', 'Leads', 'Analytics', 'Add Vehicle', 'Messages', 'Notifications']) expect(text).toContain(item);
    for (const leaked of ['Buyer Command Center', 'Private Seller Dashboard', 'My Garage', 'Payment History', 'Vehicle Financing', 'Admin Console']) expect(text).not.toContain(leaked);
    props.onNavClick.mockClear();
    fireEvent.click([...drawer.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Leads'));
    expect(props.onNavClick).toHaveBeenCalledWith('dealer:leads');
  });
  it('the Admin Console entry opens the existing /admin command centre', () => {
    const drawer = openDrawer('superadmin');
    fireEvent.click([...drawer.querySelectorAll('button, a')].find((b) => b.textContent.trim().startsWith('Admin Console')));
    expect(screen.getByTestId('route-location').textContent).toBe('/admin');
  });
});

describe('role-aware mobile drawer navigation', () => {
  const renderMobileMenu = (role) => {
    render(<MemoryRouter initialEntries={['/']}>
      <Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role }} />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    return screen.getByRole('dialog');
  };

  it('superadmin sees staff tools but not buyer-only saved, payment, escrow or personal request links', () => {
    const drawer = renderMobileMenu('superadmin');
    const text = drawer.textContent;
    expect(text).toContain('Admin Console');
    expect(text).toContain('Messages');
    expect(text).toContain('Notifications');
    for (const hidden of ['Saved vehicles', 'Saved for you', 'Payment History', 'My requests and reports', 'My escrow deals', 'Sell Vehicle']) {
      expect(text).not.toContain(hidden);
    }
  });

  it('dealer sees one dealer workspace list without buyer-only shortcuts', () => {
    const drawer = renderMobileMenu('dealer');
    const text = drawer.textContent;
    for (const item of ['Dealer workspace', 'Dashboard', 'Inventory', 'Leads', 'Analytics', 'Settings', 'Add Vehicle']) expect(text).toContain(item);
    for (const hidden of ['Saved vehicles', 'Saved for you', 'Payment History', 'My requests and reports', 'My escrow deals', 'Sell Vehicle']) expect(text).not.toContain(hidden);
    expect((text.match(/Dashboard/g) || []).length).toBe(1);
  });
});

describe('mobile drawer keeps what the person expanded while account data finishes loading', () => {
  it('a group opened by the user is not collapsed when activeNav/navigation re-render underneath it', () => {
    const user = { id: 'u1', name: 'James Mugo', email: 'owner@example.test', role: 'user' };
    const ui = (activeNav) => (<MemoryRouter initialEntries={['/']}><Navbar {...props} activeNav={activeNav} user={user} /></MemoryRouter>);
    const { rerender } = render(ui('dashboard'));
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByRole('dialog');
    const toggle = [...drawer.querySelectorAll('button[aria-expanded="false"]')].find((b) => /^Expand .* links$/.test(b.getAttribute('aria-label') || ''));
    expect(toggle).toBeTruthy();
    const name = toggle.getAttribute('aria-label').replace(/^Expand /, '');
    fireEvent.click(toggle);
    const isOpen = () => !!screen.getByRole('dialog').querySelector(`button[aria-label="Collapse ${name}"][aria-expanded="true"]`);
    expect(isOpen()).toBe(true);
    // The account finishes loading and the shell re-renders with a different active destination.
    rerender(ui('marketplace'));
    rerender(ui('dashboard'));
    expect(isOpen()).toBe(true);
  });
});
