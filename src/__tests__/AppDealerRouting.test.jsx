import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/api', async () => {
  const actual = await vi.importActual('../api/api');
  return { ...actual, adminAPI: { ...(actual.adminAPI || {}), getConfig: vi.fn().mockResolvedValue({ config: {} }) } };
});
vi.mock('socket.io-client', () => ({ io: () => ({ on() {}, off() {}, emit() {}, close() {}, disconnect() {}, connected: false }) }));
vi.mock('../context/BrandingContext', () => ({
  BrandingProvider: ({ children }) => children,
  useBranding: () => ({ branding: {}, loading: false }),
  useBrandingSafe: () => ({}),
  onBrandLogoError: () => {},
  announceBrandingUpdated: () => {},
}));
const dealer = { id: 'd1', name: 'Eric Kamau', email: 'd@x.test', role: 'dealer', status: 'approved' };
vi.mock('../context/AuthContext', async (orig) => {
  const actual = await orig();
  return { ...actual, AuthProvider: ({ children }) => children, useAuth: () => ({ user: dealer, isAuth: true, isAdmin: false, isDealer: true, loading: false, sessionStatus: 'authenticated', logout: vi.fn(), login: vi.fn(), refreshUser: vi.fn() }) };
});
import App from '../App';

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('a dealer account never lands on a buyer or private-seller workspace', () => {
  it.each(['dashboard', 'buyer-platform', 'seller-dashboard', 'payments', 'profile'])('/?nav=%s opens the dealer workspace', async (nav) => {
    window.history.replaceState({}, '', `/?nav=${nav}`);
    render(<MemoryRouter initialEntries={[`/?nav=${nav}`]}><App /></MemoryRouter>);
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('nav')).toBe('dealer-dashboard'), { timeout: 4000 });
    if (nav === 'profile') expect(new URLSearchParams(window.location.search).get('section')).toBe('settings');
  });
});
