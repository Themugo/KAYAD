import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Super Admin completion: pages that used to crash (ErrorBoundary) or invent numbers
 * when an API answered with a partial or failed response. Every assertion checks that
 * the page stays mounted and says "Unavailable" / shows the failure, never a fabricated figure.
 */
const h = vi.hoisted(() => ({
  exec: vi.fn(),
  owner: vi.fn(),
  comm: { communicationTemplates: vi.fn(), communicationAnalytics: vi.fn(), communicationProviderHealth: vi.fn(), communicationHistory: vi.fn(), communicationRollout: vi.fn() },
  support: { getStaffQueue: vi.fn(), getStaffMetrics: vi.fn(), getStaffTeam: vi.fn(), getStaffCase: vi.fn(), staffReplyToCase: vi.fn(), staffUpdateCase: vi.fn() },
  pf: new Proxy({}, { get: () => vi.fn() }),
  ai: { processAICommand: vi.fn() },
  ad: { list: vi.fn() },
}));

vi.mock('../../../services/executiveAnalyticsApi', () => ({ getExecutiveAnalytics: (...a) => h.exec(...a) }));
vi.mock('../../../api/api', async (orig) => {
  const actual = await orig();
  return { ...actual, ownerAPI: { overview: (...a) => h.owner(...a) } };
});
vi.mock('../../../api/api.exports', () => ({ adminAPI: h.comm }));
vi.mock('../../../services/supportApi', () => ({
  ...h.support,
  SupportApiError: class SupportApiError extends Error {},
}));

import ExecutiveIntelligenceCenter from '../../../pages/admin/intelligence/ExecutiveIntelligenceCenter';
import AdminOwnerManagement from '../../../pages/admin/AdminOwnerManagement';
import AdminCommunications from '../../../pages/admin/AdminCommunications';
import AdminSupportWorkspace from '../../../features/AdminSupportWorkspace';

beforeEach(() => { vi.clearAllMocks(); cleanup(); });

describe('partial API responses do not crash admin pages', () => {
  test('Executive Intelligence shows Unavailable for fields the server did not return', async () => {
    h.exec.mockResolvedValue({});
    render(<ExecutiveIntelligenceCenter />);
    expect(await screen.findByText('Executive Intelligence')).toBeTruthy();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5);
    expect(screen.queryByText('KES 0')).toBeNull();
  });

  test('Executive Intelligence keeps a real zero as zero', async () => {
    h.exec.mockResolvedValue({ gmv: { total: 0 }, revenue: { total: 0 }, activity: { activeUsers: 0 } });
    render(<ExecutiveIntelligenceCenter />);
    expect(await screen.findByText('Executive Intelligence')).toBeTruthy();
    expect(screen.getAllByText('KES 0').length).toBeGreaterThan(0);
  });

  test('Owner management refuses an unexpected response instead of guessing', async () => {
    h.owner.mockResolvedValue({ success: true });
    render(<AdminOwnerManagement />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/unexpected response/);
  });

  test('Communications tolerates a rollout response without channel lists', async () => {
    for (const fn of Object.values(h.comm)) fn.mockResolvedValue({ success: true });
    render(<AdminCommunications />);
    await waitFor(() => expect(h.comm.communicationRollout).toHaveBeenCalled());
    expect(await screen.findByText('Kenya SMS')).toBeTruthy();
  });

  test('Support workspace tolerates a queue response without a case list', async () => {
    h.support.getStaffQueue.mockResolvedValue({ success: true });
    h.support.getStaffMetrics.mockResolvedValue({ metrics: null });
    h.support.getStaffTeam.mockResolvedValue({});
    render(<MemoryRouter><AdminSupportWorkspace /></MemoryRouter>);
    await waitFor(() => expect(h.support.getStaffQueue).toHaveBeenCalled());
    expect(await screen.findByText('Open backlog')).toBeTruthy();
  });
});
