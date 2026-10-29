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
  it.each(['buyer', 'user', 'individual_seller', 'dealer'])('%s keeps the buyer/seller menu and gets no admin section', (role) => {
    const text = open(role).textContent;
    expect(text).toContain('Buyer Command Center');
    expect(text).toContain('Sell Vehicle');
    expect(text).not.toContain('System Administration');
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
