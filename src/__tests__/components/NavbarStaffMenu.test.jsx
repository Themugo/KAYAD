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
const open = (role) => {
  render(<MemoryRouter><Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role }} /></MemoryRouter>);
  const panelToggle = document.querySelector('[aria-controls="kayad-account-panel"]');
  fireEvent.click(panelToggle);
  return document.getElementById('kayad-account-panel');
};
afterEach(() => cleanup());

describe('account dropdown by role', () => {
  it.each(['superadmin', 'admin', 'moderator', 'marketing', 'accounts'])('%s gets the administration menu and no buyer/seller shortcuts', (role) => {
    const panel = open(role);
    expect(panel).toBeTruthy();
    const text = panel.textContent;
    expect(text).toContain('System Administration');
    expect(text).toContain('Operations Dashboard');
    expect(text).not.toContain('Admin Panel');
    for (const leaked of ['Private Seller / Buyer', 'Buyer Command Center', 'Private Seller Dashboard', 'Sell Vehicle', 'Saved Cars', 'My Garage', 'Payment History', 'Vehicle Financing', 'KAYAD Live']) {
      expect(text).not.toContain(leaked);
    }
    expect(text).toContain('Account Settings');
    expect(text).toContain('Log Out');
  });
  it('superadmin is labelled Super Admin', () => {
    expect(open('superadmin').textContent).toContain('Super Admin');
  });
  it.each(['user', 'individual_seller'])('%s keeps the one personal-account menu (buying and selling) and gets no admin section', (role) => {
    const text = open(role).textContent;
    expect(text).toContain('My Account');
    expect(text).not.toMatch(/Buyer Command Center|Private Seller Dashboard/);
    expect(text).toContain('Sell Vehicle');
    expect(text).not.toContain('System Administration');
  });
  // A dealer account lives in the Dealer workspace only: buyer and private-seller pages are not offered.
  it('dealer gets a dealer-only menu: no buyer / private-seller / garage / financing links, no admin section', () => {
    const panel = open('dealer');
    const text = panel.textContent;
    for (const dealerItem of ['Dealer Management', 'Dealer Dashboard', 'Inventory', 'Add Vehicle', 'Leads', 'Analytics', 'Dealer Settings', 'Notifications', 'Messages', 'Log Out']) {
      expect(text).toContain(dealerItem);
    }
    for (const leaked of ['Buyer Command Center', 'Private Seller Dashboard', 'Sell Vehicle', 'Saved Cars', 'My Garage', 'Payment History', 'Vehicle Financing', 'KAYAD Live', 'Account Settings', 'System Administration']) {
      expect(text).not.toContain(leaked);
    }
  });
  it('dealer menu items open the matching dealer workspace section', () => {
    props.onNavClick.mockClear();
    const expected = { 'Dealer Dashboard': 'dealer:overview', Inventory: 'dealer:inventory', 'Add Vehicle': 'dealer:inventory:new', Leads: 'dealer:leads', Analytics: 'dealer:analytics', 'Dealer Settings': 'dealer:settings' };
    for (const [label, id] of Object.entries(expected)) {
      cleanup();
      props.onNavClick.mockClear();
      const panel = open('dealer'); // the menu closes after each choice, so open it afresh
      fireEvent.click([...panel.querySelectorAll('button')].find((b) => b.textContent.trim() === label));
      expect(props.onNavClick).toHaveBeenCalledWith(id);
    }
  });
});


describe('canonical admin destinations', () => {
  const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid="route-location">{location.pathname}{location.search}</output>;
  };
  const renderStaffMenu = (role = 'superadmin') => {
    render(<MemoryRouter initialEntries={['/']}>
      <Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role }} />
      <LocationProbe />
    </MemoryRouter>);
    fireEvent.click(document.querySelector('[aria-controls="kayad-account-panel"]'));
  };

  it('opens the existing AdminView command centre from the single Operations Dashboard entry', () => {
    renderStaffMenu('superadmin');
    expect(screen.queryByText('Admin Panel')).toBeNull();
    fireEvent.click(screen.getByText('Operations Dashboard'));
    expect(screen.getByTestId('route-location').textContent).toBe('/admin');
  });

  it('gives System Management its distinct existing settings destination', () => {
    renderStaffMenu('admin');
    fireEvent.click(screen.getByText('System Management'));
    expect(screen.getByTestId('route-location').textContent).toBe('/admin/settings');
  });

  it('uses initials instead of leaving a broken profile image when the source fails', () => {
    render(<MemoryRouter><Navbar {...props} user={{ id: 'u1', name: 'James Mugo', email: 'owner@example.test', role: 'superadmin', avatar: 'https://invalid.example/avatar.png' }} /></MemoryRouter>);
    const avatar = document.querySelector('img[src="https://invalid.example/avatar.png"]');
    expect(avatar).toBeTruthy();
    fireEvent.error(avatar);
    expect(screen.getAllByText('JM').length).toBeGreaterThan(0);
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
