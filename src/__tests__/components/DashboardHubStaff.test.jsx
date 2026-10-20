import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DashboardHub from '../../components/DashboardHub';

vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => ({}));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { list: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({
  AuctionExperienceRail: () => <div data-testid="auction-rail">Your auction journey</div>,
  BidderIdentityCard: () => <div data-testid="bidder-card">Bidder profile</div>,
}));

afterEach(() => cleanup());
const mount = (role) => render(<DashboardHub user={{ id: 'u1', name: 'James Mugo', role }} vehicles={[]} onNavigate={() => {}} />);

describe('DashboardHub buyer widgets', () => {
  it.each(['superadmin', 'admin', 'moderator', 'accounts'])('%s sees the operations dashboard without the buyer auction journey or bidder card', (role) => {
    mount(role);
    expect(screen.getByText('Platform Operations Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('auction-rail')).toBeNull();
    expect(screen.queryByTestId('bidder-card')).toBeNull();
  });
  it.each(['buyer', 'user', 'dealer'])('%s still sees the auction journey and bidder card', (role) => {
    mount(role);
    expect(screen.getByTestId('auction-rail')).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
});
