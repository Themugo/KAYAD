import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Webhoist overview and Panic Room were drawn for a dark theme (white text, translucent white panels) and
 * were unreadable on the light admin canvas. They must use admin tokens and must not turn a failed or
 * missing source into zeros, "healthy", or "no critical alerts".
 */
const h = vi.hoisted(() => ({ stats: vi.fn(), audit: vi.fn(), health: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const actual = await orig();
  return { ...actual, adminAPI: { ...actual.adminAPI, stats: (...a) => h.stats(...a), getAuditLog: (...a) => h.audit(...a), systemHealth: (...a) => h.health(...a) } };
});
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'superadmin' }, isSuperAdmin: true }) }));

import WebhoistOverview from '../../../pages/admin/WebhoistOverview';
import PanicRoom from '../../../pages/admin/PanicRoom';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('Webhoist overview', () => {
  test('failed sources are reported and figures are Unavailable, not 0', async () => {
    h.stats.mockRejectedValue(new Error('500'));
    h.audit.mockRejectedValue(new Error('500'));
    render(<MemoryRouter><WebhoistOverview /></MemoryRouter>);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5);
    expect(screen.getByText(/unavailable right now/)).toBeTruthy();
    expect(screen.queryByText('No recent activity')).toBeNull();
  });

  test('real figures render, a genuine zero stays 0, and a missing actor is not called "System"', async () => {
    h.stats.mockResolvedValue({ stats: { totalUsers: 120, totalCars: 0, activeAuctions: 3, totalBids: 9, totalEscrows: 2, totalRevenue: 2500000, totalDealers: 10, individualSellers: 5 } });
    h.audit.mockResolvedValue({ entries: [{ _id: 'a1', action: 'car.moderate', createdAt: '2026-10-24T09:00:00Z' }] });
    const { container } = render(<MemoryRouter><WebhoistOverview /></MemoryRouter>);
    await screen.findByText('car.moderate');
    expect(screen.getAllByText('120').length).toBeGreaterThan(0);
    expect(screen.getByText('KES 2.5M')).toBeTruthy();
    expect(screen.getByText('Actor not recorded')).toBeTruthy();
    expect(screen.queryByText('System')).toBeNull();
    expect(container.innerHTML).not.toMatch(/color:\s*(#fff|rgb\(255, 255, 255\))/i);
  });
});

describe('Panic Room health banner', () => {
  test('a response without a status is "unknown" and invents no counts or alert claims', async () => {
    h.health.mockResolvedValue({ success: true });
    render(<PanicRoom />);
    expect(await screen.findByText('System status unknown')).toBeTruthy();
    expect(screen.getByText(/critical alerts unavailable/)).toBeTruthy();
    expect(screen.queryByText(/no critical alerts/)).toBeNull();
    expect(screen.queryByText('System Healthy')).toBeNull();
  });
  test('healthy status with measured counts is reported as given', async () => {
    h.health.mockResolvedValue({ health: { status: 'healthy', users: 12, listings: 4, liveAuctions: 0, criticalAlerts24h: 0 } });
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getByText('System Healthy')).toBeTruthy());
    expect(screen.getByText(/12 users · 4 listings · 0 live auctions · no critical alerts \(24h\)/)).toBeTruthy();
  });
});
