import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardHub from '../../components/DashboardHub';

vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => ({ getMyWorkspace: vi.fn().mockResolvedValue({ membership: null, ambiguous: false }) }));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { list: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({
  AuctionExperienceRail: () => <div data-testid="auction-rail">Your auction journey</div>,
  BidderIdentityCard: () => <div data-testid="bidder-card">Bidder profile</div>,
}));

afterEach(() => cleanup());
const mount = (role) => render(<MemoryRouter><DashboardHub user={{ id: 'u1', name: 'James Mugo', role }} vehicles={[]} onNavigate={() => {}} /></MemoryRouter>);

describe('DashboardHub buyer widgets', () => {
  it.each(['superadmin', 'admin', 'moderator', 'accounts'])('%s sees the operations dashboard without the buyer auction journey or bidder card', (role) => {
    mount(role);
    expect(screen.getByText('Platform Operations Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('auction-rail')).toBeNull();
    expect(screen.queryByTestId('bidder-card')).toBeNull();
  });
  // The unified personal dashboard shows the bidder card in its Auctions section (one personal identity, buying and selling in
  // the same shell) and no longer repeats the wallet journey rail on every page; the dealer dashboard still shows both at the top.
  it.each(['buyer', 'user'])('%s sees the bidder card in the personal Auctions section and not on the overview', async (role) => {
    const { unmount } = render(<MemoryRouter><DashboardHub user={{ id: 'u1', name: 'James Mugo', role }} vehicles={[]} onNavigate={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId('bidder-card')).toBeNull();
    unmount();
    render(<MemoryRouter><DashboardHub user={{ id: 'u1', name: 'James Mugo', role }} vehicles={[]} initialSection="auctions" onNavigate={() => {}} /></MemoryRouter>);
    // The Auctions section is lazy-loaded; findBy default 1s timeout raced the chunk load under CPU contention.
    expect(await screen.findByTestId('bidder-card', {}, { timeout: 8000 })).toBeTruthy();
  }, 15000);
  it('dealer still sees the auction journey and bidder card', () => {
    mount('dealer');
    expect(screen.getByTestId('auction-rail')).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
});
