import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

/*
 * These pages used to present invented figures or sample rows (a hard-coded product list on a failed
 * request, a fixed version history, fake job and change logs, missing counters shown as 0).
 * They must now show the failure or an honest empty state.
 */
const h = vi.hoisted(() => ({
  ads: { list: vi.fn() },
  pf: new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : (...a) => h.pfImpl(k, ...a)) }),
  pfImpl: vi.fn(),
  cfg: new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => Promise.reject(new Error('down'))) }),
  auto: new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => Promise.reject(new Error('down'))) }),
}));
vi.mock('../../../services/platformFactoryApi', () => h.pf);
vi.mock('../../../services/configApi', () => h.cfg);
vi.mock('../../../services/automationApi', () => h.auto);
vi.mock('../../../api/api', async (orig) => {
  const actual = await orig();
  return { ...actual, adsAPI: { adminList: (...a) => h.ads.list(...a), list: (...a) => h.ads.list(...a), getAll: (...a) => h.ads.list(...a) } };
});

import PlatformFactory from '../../../pages/admin/platform-factory/PlatformFactory';
import ConfigurationCenter from '../../../pages/admin/config/ConfigurationCenter';
import AutomationStudio from '../../../pages/admin/automation/AutomationStudio';

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('no fabricated data on admin studios', () => {
  test('Platform Factory shows the failure and leaves figures Unavailable, not invented', async () => {
    h.pfImpl.mockRejectedValue(new Error('down'));
    render(<PlatformFactory />);
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.queryByText('KAYAD Cars')).toBeNull();
    expect(screen.queryByText('123.5M')).toBeNull();
  });

  test('Configuration Center shows no invented change history', async () => {
    render(<ConfigurationCenter />);
    await waitFor(() => expect(screen.getByText('Recent Changes')).toBeTruthy());
    expect(screen.queryByText('Auction Duration Settings')).toBeNull();
    expect(screen.queryByText('New Region: Nakuru')).toBeNull();
    expect(screen.getByText(/No change history is connected/)).toBeTruthy();
  });

  test('Automation Studio shows no invented executions', async () => {
    render(<AutomationStudio />);
    await waitFor(() => expect(screen.getByText('Recent Executions')).toBeTruthy());
    expect(screen.queryByText('Subscription Renewal')).toBeNull();
    expect(screen.queryByText('Finance Approval')).toBeNull();
    expect(screen.getByText(/No recent executions are connected/)).toBeTruthy();
  });
});

import AdManager from '../../../pages/admin/AdManager';

describe('Ad manager', () => {
  test('a failed load is reported as a failure, not as an empty campaign list', async () => {
    h.ads.list.mockRejectedValue(new Error('500'));
    render(<AdManager />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    expect(screen.queryByText('No ad campaigns yet')).toBeNull();
  });
  test('campaigns without counters show a dash, not 0', async () => {
    h.ads.list.mockResolvedValue({ ads: [{ _id: 'a1', clientName: 'Acme Motors', placement: 'bid_modal', isActive: true }, { _id: 'a2', clientName: 'Zero Co', placement: 'bid_modal', isActive: false, viewCount: 0, clickCount: 0 }] });
    render(<AdManager />);
    expect(await screen.findByText('Acme Motors')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBe(2);
    expect(screen.getAllByText('0').length).toBe(2);
  });
});
