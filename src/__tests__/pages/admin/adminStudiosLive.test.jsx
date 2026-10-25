import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

/*
 * Configuration Center feature flags are read from the API and toggled by id; the Enterprise Control
 * Center never substitutes a reassuring status, score or latency target for data it did not receive.
 */
const h = vi.hoisted(() => ({
  cfg: {
    getConfigStats: vi.fn(),
    getFeatureFlags: vi.fn(),
    toggleFeatureFlag: vi.fn(),
  },
  ecp: new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => Promise.reject(new Error('down'))) }),
}));
vi.mock('../../../services/configApi', () => h.cfg);
vi.mock('../../../services/ecpApi', () => h.ecp);

import ConfigurationCenter from '../../../pages/admin/config/ConfigurationCenter';
import EnterpriseControlCenter from '../../../pages/admin/control-center/EnterpriseControlCenter';

beforeEach(() => {
  vi.clearAllMocks();
  h.cfg.getConfigStats.mockResolvedValue({ data: { data: {} } });
});
afterEach(() => cleanup());

const openFlags = async () => {
  render(<ConfigurationCenter />);
  await screen.findAllByRole('button', { name: /Feature Flags/ });
  fireEvent.click(screen.getAllByRole('button', { name: /Feature Flags/ })[0]);
};

describe('Configuration Center feature flags', () => {
  test('a failed request shows an alert and no invented flags', async () => {
    h.cfg.getFeatureFlags.mockRejectedValue(new Error('500'));
    await openFlags();
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    expect(screen.queryByText('Auctions')).toBeNull();
    expect(screen.queryByText('auctions_enabled')).toBeNull();
  });

  test('flags returned by the API are listed and toggled by id', async () => {
    h.cfg.getFeatureFlags.mockResolvedValue({ data: { data: [{ id: 'f1', key: 'live_video', name: 'Live Video Tours', category: 'Experimental', isActive: false, description: 'x' }] } });
    h.cfg.toggleFeatureFlag.mockResolvedValue({});
    await openFlags();
    expect(await screen.findByText('Live Video Tours')).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'Enable Live Video Tours' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => expect(h.cfg.toggleFeatureFlag).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable Live Video Tours' }).getAttribute('aria-pressed')).toBe('true'));
  });

  test('an empty list is reported as empty, and a malformed payload as a failure', async () => {
    h.cfg.getFeatureFlags.mockResolvedValue({ data: { data: [] } });
    await openFlags();
    expect(await screen.findByText(/No feature flags were returned/)).toBeTruthy();
    cleanup();
    h.cfg.getFeatureFlags.mockResolvedValue({ data: { data: 'nope' } });
    await openFlags();
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
  });
});

describe('Enterprise Control Center', () => {
  test('failed sources leave status, score and risk Unavailable rather than secure / 92% / low', async () => {
    render(<EnterpriseControlCenter />);
    await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0));
    expect(document.body.textContent).not.toMatch(/92%/);
    expect(screen.queryByText(/^secure$/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  test('the header never claims "All Systems Operational" without a health score', async () => {
    render(<EnterpriseControlCenter />);
    await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0));
    expect(screen.queryByText(/All Systems Operational/i)).toBeNull();
    expect(screen.getByText('Platform status unavailable')).toBeTruthy();
  });

  test('operational quick actions are disabled because nothing is connected to them', async () => {
    render(<EnterpriseControlCenter />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Self-Healing/ }))[0]);
    const restart = await screen.findByRole('button', { name: /Restart Workers/ });
    expect(restart.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Clear Queues/ }).disabled).toBe(true);
  });
});

import SEOManager from '../../../pages/admin/cms/components/SEOManager';

describe('SEO manager with no connected page records', () => {
  test('renders every tab without throwing and without an invented optimisation figure', () => {
    render(<SEOManager />);
    expect(document.body.textContent).not.toMatch(/4\/6/);
    expect(screen.queryByText('Google Search Preview')).toBeNull();
    for (const tab of ['Social', 'Sitemap', 'Robots']) {
      const btn = screen.queryAllByRole('button').find((b) => new RegExp(tab, 'i').test(b.textContent));
      if (btn) fireEvent.click(btn);
    }
    expect(document.body.textContent).not.toMatch(/undefined/);
  });
});
