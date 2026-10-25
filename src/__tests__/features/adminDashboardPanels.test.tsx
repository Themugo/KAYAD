import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The dashboard's System Health panel may only show what the existing health contract returned:
 * no service, status, latency or check time is ever assumed.
 */
const h = vi.hoisted(() => ({ health: vi.fn() }));
vi.mock('../../api/api.exports', () => ({ adminAPI: { getInfrastructureHealth: (...a: unknown[]) => h.health(...a) } }));

import AdminSystemHealthPanel from '../../features/AdminSystemHealthPanel';

const view = () => render(<MemoryRouter><AdminSystemHealthPanel /></MemoryRouter>);
beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('AdminSystemHealthPanel', () => {
  test('lists only services the health source returned, with measured latency and the genuine check time', async () => {
    h.health.mockResolvedValue({ data: { health: { checkedAt: '2026-10-25T08:30:00Z', services: [
      { name: 'api', status: 'healthy', latency: 41.4 },
      { name: 'payments_gateway', status: 'degraded' },
      { name: 'storage', status: 'mystery', latency: -3 },
    ] } } });
    view();
    expect(await screen.findByText('Api')).toBeTruthy();
    expect(screen.getByText('Healthy · 41 ms')).toBeTruthy();
    expect(screen.getByText('Payments Gateway')).toBeTruthy();
    expect(screen.getByText('Degraded')).toBeTruthy();
    expect(screen.getByText('Unknown')).toBeTruthy();          // unrecognised status is Unknown, negative latency dropped
    expect(screen.queryByText(/Database/i)).toBeNull();          // never invents a category
    expect(document.body.textContent).toMatch(/Checked .*2026/);
    expect(document.body.textContent).not.toMatch(/uptime|%/i);
  });

  test('no timestamp is claimed when the source gives none', async () => {
    h.health.mockResolvedValue({ services: [{ name: 'api', status: 'healthy' }] });
    view();
    expect(await screen.findByText(/Check time not provided/)).toBeTruthy();
  });

  test('a failed check is "unknown", not healthy; a 403 is an access boundary; an empty answer is unverifiable', async () => {
    h.health.mockRejectedValue(new Error('500'));
    view();
    expect(await screen.findByText(/could not be checked/)).toBeTruthy();
    expect(screen.queryByText('Healthy')).toBeNull();
    cleanup();
    h.health.mockRejectedValue({ response: { status: 403 } });
    view();
    expect(await screen.findByText(/not included in your role/)).toBeTruthy();
    cleanup();
    h.health.mockResolvedValue({ services: [] });
    view();
    await waitFor(() => expect(screen.getByText(/no verifiable service checks/)).toBeTruthy());
  });

  test('always links to the existing operations control room', async () => {
    h.health.mockRejectedValue(new Error('x'));
    view();
    expect((await screen.findByRole('link', { name: /Open system monitoring/ })).getAttribute('href')).toBe('/admin/control-room');
  });
});
