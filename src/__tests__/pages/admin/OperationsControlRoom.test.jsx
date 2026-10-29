import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperationsControlRoom from '../../../pages/admin/OperationsControlRoom';

vi.mock('../../../api/api', () => ({
  adminAPI: {
    stats: vi.fn().mockResolvedValue({
      success: true,
      stats: {
        totalUsers: 2847,
        totalDealers: 156,
        totalCars: 1842,
        activeAuctions: 4,
        totalEscrows: 41,
        openEscrows: 34,
        disputedEscrows: 2,
        totalPayments: 89,
        totalBids: 1260,
        pendingDealers: 8,
        pendingCars: 23,
        supportQueue: 12,
        activeListings: 1819,
      },
      unavailable: [],
    }),
    alerts: vi.fn().mockResolvedValue({
      success: true,
      unreadCount: 1,
      alerts: [
        { id: 'alert-1', severity: 'warning', message: 'High escrow volume detected', category: 'Finance', createdAt: '2026-10-22T10:00:00.000Z' },
      ],
    }),
    getAuditLog: vi.fn().mockResolvedValue({
      success: true,
      entries: [
        { id: 'audit-1', action: 'escrow.released', admin: 'Operations Admin', createdAt: '2026-10-22T10:01:00.000Z' },
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    }),
    getInfrastructureHealth: vi.fn().mockResolvedValue({
      success: true,
      data: {
        services: [
          { name: 'database', status: 'healthy', latency: 12 },
          { name: 'payments', status: 'degraded', latency: 25 },
        ],
        summary: { healthy: 1, degraded: 1, down: 0 },
        checkedAt: '2026-10-22T10:00:00.000Z',
      },
    }),
  },
}));

describe('OperationsControlRoom', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders operations control room title', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);
    expect(await screen.findByText('Operations Control Room')).toBeInTheDocument();
  });

  it('loads operations metrics from API', async () => {
    const { adminAPI } = await import('../../../api/api');

    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(adminAPI.stats).toHaveBeenCalled();
      expect(adminAPI.alerts).toHaveBeenCalledWith({ limit: 10 });
      expect(adminAPI.getAuditLog).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  it('displays metric cards with values', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Total Dealers')).toBeInTheDocument();
    });
  });

  it('displays recent alerts panel', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    });
  });

  it('displays recent audit activity', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Recent Audit Activity')).toBeInTheDocument();
    });
  });

  it('shows refresh button', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('renders verified service statuses and measured check durations without synthetic percentages', async () => {
    const { adminAPI } = await import('../../../api/api');
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Check duration: 12 ms')).toBeInTheDocument();
    expect(screen.getByText('Check duration: 25 ms')).toBeInTheDocument();
    expect(adminAPI.getInfrastructureHealth).toHaveBeenCalled();
    expect(screen.getByText('Recent Audit Activity')).toBeInTheDocument();
    expect(screen.getByText('escrow released')).toBeInTheDocument();
    expect(screen.getAllByText('Available Listings').length).toBeGreaterThan(0);
    expect(screen.queryByText('99.2%')).not.toBeInTheDocument();
    expect(screen.queryByText('12.5K')).not.toBeInTheDocument();
  });

  it('shows an explicit unknown/error state when the health request fails', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.getInfrastructureHealth.mockRejectedValueOnce(new Error('private backend detail'));
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('System health could not be checked');
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
  });

  it('marks the last successful result stale when a later health refresh fails', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.getInfrastructureHealth
      .mockResolvedValueOnce({ success: true, data: { health: { services: [{ name: 'database', status: 'healthy', latency: 8 }], checkedAt: '2026-10-22T10:00:00.000Z' } } })
      .mockRejectedValueOnce(new Error('private backend detail'));
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByText('Database')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refresh health/i }));
    expect(await screen.findByText(/Showing the last successful check/)).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('does not render failed or unavailable statistics as zero', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.stats.mockRejectedValueOnce(new Error('private backend detail'));
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Operations metrics are unavailable');
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
  });

  it('distinguishes alert and audit-feed failures from valid empty results', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.alerts.mockRejectedValueOnce(new Error('private alert detail'));
    adminAPI.getAuditLog.mockRejectedValueOnce(new Error('private audit detail'));
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByText(/Recent alerts could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText(/Audit activity could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText('No alert records were returned by the alert service.')).not.toBeInTheDocument();
    expect(screen.queryByText('private alert detail')).not.toBeInTheDocument();
    expect(screen.queryByText('private audit detail')).not.toBeInTheDocument();
  });

  it('keeps an unrecognized service status unknown and does not invent a check timestamp', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.getInfrastructureHealth.mockResolvedValueOnce({ success: true, data: { services: [{ name: 'database', status: 'ok', latency: -4 }] } });
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Check duration unavailable')).toBeInTheDocument();
    expect(screen.getByText('Last checked: time unavailable')).toBeInTheDocument();
  });
  it('accepts the standard nested API data envelope without showing valid metrics as unavailable', async () => {
    const { adminAPI } = await import('../../../api/api');
    adminAPI.stats.mockResolvedValueOnce({ success: true, data: { success: true, stats: { totalUsers: 17, totalDealers: 3, activeListings: 9, openEscrows: 2 }, unavailable: [] } });
    adminAPI.alerts.mockResolvedValueOnce({ success: true, data: { alerts: [] } });
    adminAPI.getAuditLog.mockResolvedValueOnce({ success: true, data: { entries: [] } });
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    expect(await screen.findByText('17')).toBeInTheDocument();
    expect(screen.queryByText('Operations metrics are unavailable')).not.toBeInTheDocument();
  });

  it('refreshes system health independently without refetching metrics, alerts, or audit activity', async () => {
    const { adminAPI } = await import('../../../api/api');
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);
    await screen.findByText('Database');
    const metricsCalls = adminAPI.stats.mock.calls.length;
    const alertCalls = adminAPI.alerts.mock.calls.length;
    const auditCalls = adminAPI.getAuditLog.mock.calls.length;
    const healthCalls = adminAPI.getInfrastructureHealth.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /refresh health/i }));
    await waitFor(() => expect(adminAPI.getInfrastructureHealth).toHaveBeenCalledTimes(healthCalls + 1));
    expect(adminAPI.stats).toHaveBeenCalledTimes(metricsCalls);
    expect(adminAPI.alerts).toHaveBeenCalledTimes(alertCalls);
    expect(adminAPI.getAuditLog).toHaveBeenCalledTimes(auditCalls);
  });

});
