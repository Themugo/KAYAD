import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const trafficSummary = vi.fn(); const trafficLive = vi.fn(); const trafficExport = vi.fn();
vi.mock('../../../api/api', () => ({ adminAPI: { trafficSummary: (...a) => trafficSummary(...a), trafficLive: (...a) => trafficLive(...a), trafficExport: (...a) => trafficExport(...a) } }));
import AdminTrafficAnalytics from '../../../pages/admin/AdminTrafficAnalytics';

const report = (over = {}) => ({
  success: true,
  totals: { totalVisits: 120, uniqueVisitors: 80, guestVisitors: 60, registeredVisitors: 20, authenticatedSessions: 35, newRegistrations: 7, returningVisitors: 30, newVisitors: 50, convertedVisitors: 8, registrationConversionRate: 10, pageViews: 400, auctionPageViews: 25, auctionPageVisitors: 12 },
  daily: [{ date: '2026-10-30', visits: 50, uniqueVisitors: 40, guestVisitors: 30, registeredVisitors: 10, registrations: 1 }, { date: '2026-10-31', visits: 70, uniqueVisitors: 50, guestVisitors: 35, registeredVisitors: 15, registrations: 2 }],
  topPages: [{ path: '/?nav=marketplace', views: 200, uniqueVisitors: 70 }],
  topListings: [{ listingId: '11111111-1111-4111-8111-111111111111', title: '2019 Toyota Prado', views: 40, uniqueVisitors: 30 }],
  sources: { channels: [{ channel: 'search', visits: 60 }, { channel: 'direct', visits: 60 }], topHosts: [{ channel: 'search', host: 'google.com', visits: 60 }] },
  geography: [{ country: 'KE', visits: 100 }], devices: [{ device: 'mobile', visits: 90 }, { device: 'desktop', visits: 30 }],
  tracking: { begins: '2026-10-30T05:00:00.000Z', partialPeriod: false, hasData: true, note: null }, comparison: { available: true, change: { totalVisits: { current: 120, previous: 100, changePct: 20 }, uniqueVisitors: { current: 80, previous: 0, changePct: null }, pageViews: { current: 400, previous: 400, changePct: 0 } } },
  definitions: { uniqueVisitors: 'Distinct browsers; refresh never adds.' }, ...over,
});
const live = { activeSessions: 4, guestSessions: 3, registeredSessions: 1, windowMinutes: 5, refreshSeconds: 30 };
beforeEach(() => { vi.clearAllMocks(); trafficSummary.mockResolvedValue(report()); trafficLive.mockResolvedValue(live); });

describe('AdminTrafficAnalytics', () => {
  test('renders every real metric from the server and states the live refresh interval', async () => {
    render(<AdminTrafficAnalytics />);
    expect(await screen.findByTestId('summary-cards')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-total-visits')).getByText('120')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-registration-conversion')).getByText('10%')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-total-visits')).getByText(/\+20% vs previous period/)).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-unique-visitors')).getByText(/no prior data/)).toBeInTheDocument();
    expect(screen.getByTestId('top-listings')).toHaveTextContent('2019 Toyota Prado');
    expect(screen.getByTestId('devices')).toHaveTextContent('Mobile');
    expect(screen.getByTestId('geography')).toHaveTextContent('KE');
    expect(await screen.findByTestId('live-count')).toHaveTextContent('4');
    expect(screen.getByTestId('live-refresh')).toHaveTextContent('Refreshes every 30 seconds');
    expect(screen.getByTestId('tracking-begins')).toBeInTheDocument();
  });
  test('range buttons request that range; custom needs both dates', async () => {
    const user = userEvent.setup(); render(<AdminTrafficAnalytics />); await screen.findByTestId('summary-cards');
    expect(trafficSummary).toHaveBeenLastCalledWith({ range: '7d' });
    for (const [label, id] of [['Today', 'today'], ['Yesterday', 'yesterday'], ['Last 30 days', '30d'], ['Last 90 days', '90d']]) { await user.click(screen.getByRole('button', { name: label })); await waitFor(() => expect(trafficSummary).toHaveBeenLastCalledWith({ range: id })); }
    await user.click(screen.getByRole('button', { name: 'Custom range' }));
    expect(await screen.findByText(/Choose a start and end date/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/From/), '2026-10-01'); await user.type(screen.getByLabelText(/To/), '2026-10-10');
    await waitFor(() => expect(trafficSummary).toHaveBeenLastCalledWith({ range: 'custom', from: '2026-10-01', to: '2026-10-10' }));
  });
  test('no data yet: zeros plus the honest notice, no invented history', async () => {
    trafficSummary.mockResolvedValue(report({ totals: { ...report().totals, totalVisits: 0, uniqueVisitors: 0 }, daily: [], topPages: [], topListings: [], sources: { channels: [], topHosts: [] }, geography: [], devices: [], tracking: { begins: null, hasData: false, note: 'No visitor analytics have been collected yet. Numbers will appear once tracking starts; no history is estimated.' }, comparison: { available: false, reason: 'No analytics have been collected yet.' } }));
    render(<AdminTrafficAnalytics />);
    expect(await screen.findByTestId('tracking-note')).toHaveTextContent(/no history is estimated/);
    expect(screen.getByTestId('comparison-note')).toHaveTextContent(/not shown/);
    expect(within(screen.getByTestId('stat-total-visits')).getByText('0')).toBeInTheDocument();
  });
  test('a partial period shows when reliable tracking begins', async () => {
    trafficSummary.mockResolvedValue(report({ tracking: { begins: '2026-10-30T05:00:00.000Z', partialPeriod: true, hasData: true, note: 'Reliable tracking begins 2026-10-30T05:00:00.000Z. Anything before that moment was not collected and is not estimated.' } }));
    render(<AdminTrafficAnalytics />); expect(await screen.findByTestId('tracking-note')).toHaveTextContent(/Reliable tracking begins/);
  });
  test('errors are shown, not hidden', async () => {
    trafficSummary.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });
    render(<AdminTrafficAnalytics />); expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
  });
  test('export asks the server for that report kind with the current range', async () => {
    const user = userEvent.setup(); trafficExport.mockResolvedValue(new Blob(['a'])); global.URL.createObjectURL = vi.fn(() => 'blob:x'); global.URL.revokeObjectURL = vi.fn();
    render(<AdminTrafficAnalytics />); await screen.findByTestId('export');
    await user.click(within(screen.getByTestId('export')).getByRole('button', { name: 'pages' }));
    await waitFor(() => expect(trafficExport).toHaveBeenCalledWith({ range: '7d', kind: 'pages' }));
  });
  test('definitions are available on demand', async () => {
    const user = userEvent.setup(); render(<AdminTrafficAnalytics />); await screen.findByTestId('definitions');
    await user.click(screen.getByRole('button', { name: /how each number is counted/i }));
    expect(screen.getByText(/refresh never adds/)).toBeInTheDocument();
  });
  test('the page never renders identifiers (no hashes / user ids)', async () => {
    render(<AdminTrafficAnalytics />); await screen.findByTestId('summary-cards');
    expect(document.body.textContent).not.toMatch(/visitor_hash|session_hash|user_hash/);
  });
});
