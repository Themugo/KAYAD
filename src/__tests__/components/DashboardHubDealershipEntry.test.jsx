import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ getMyWorkspace: vi.fn() }));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => api);
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { list: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({ AuctionExperienceRail: () => <div />, BidderIdentityCard: () => <div /> }));

import DashboardHub from '../../components/DashboardHub';
import { resetMyDealershipCache } from '../../features/DealershipWorkspace/useMyDealership';

beforeEach(() => { resetMyDealershipCache(); });
afterEach(() => cleanup());

describe('personal dashboard offers the dealership workspace only to hired staff', () => {
  it('shows a workspace action for an active member and opens it', async () => {
    api.getMyWorkspace.mockResolvedValue({ membership: { dealershipName: 'Prime Motors Ltd', teamRole: 'sales_agent', permissions: ['canListCars'] }, ambiguous: false });
    const nav = vi.fn();
    render(<DashboardHub user={{ id: 'u1', name: 'Mary', role: 'user' }} vehicles={[]} onNavigate={nav} />);
    fireEvent.click(await screen.findByText('Work for Prime Motors Ltd'));
    expect(nav).toHaveBeenCalledWith('dealership-workspace');
  });
  it('shows nothing for a personal account with no membership', async () => {
    api.getMyWorkspace.mockResolvedValue({ membership: null, ambiguous: false });
    render(<DashboardHub user={{ id: 'u2', name: 'Jo', role: 'user' }} vehicles={[]} onNavigate={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/Work for/)).toBeNull();
  });
});
