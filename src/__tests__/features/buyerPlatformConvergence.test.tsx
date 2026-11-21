import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BuyerPlatform from '../../features/OwnershipPlatform/pages/BuyerPlatform';

const mocks = vi.hoisted(() => ({
  getFavorites: vi.fn(),
  getOwnershipDashboard: vi.fn(),
  fetchMyBids: vi.fn(),
}));

vi.mock('../../services/favoriteApi', () => ({ getFavorites: mocks.getFavorites }));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: mocks.getOwnershipDashboard }));
vi.mock('../../services/bidApi', () => ({ fetchMyBids: mocks.fetchMyBids }));
vi.mock('../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div data-testid="existing-escrow-desk">Existing escrow desk</div> }));
vi.mock('../../features/InspectionsView', () => ({ default: () => <div data-testid="existing-inspection-workspace">Existing inspection workspace</div> }));
vi.mock('../../features/FinancePlatform/pages/FinanceMarketplace', () => ({ default: () => <div data-testid="existing-finance-workspace">Existing finance workspace</div> }));

const user = { id: 'buyer-1', name: 'Test Buyer', email: 'buyer@example.test', role: 'buyer', isVerified: true, createdAt: '2026-01-01' } as never;

describe('BuyerPlatform convergence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFavorites.mockResolvedValue({ favorites: [{ id: 'fav-1', title: 'Saved vehicle', price: 1200000, images: [] }] });
    mocks.getOwnershipDashboard.mockResolvedValue({ currentVehicles: [] });
    mocks.fetchMyBids.mockResolvedValue({ bids: [{ id: 'bid-1', amount: 2500000, status: 'active', createdAt: '2026-10-01T10:00:00Z', car: { title: 'Auction vehicle' } }] });
  });

  it('shows real buyer activity and reuses the existing escrow and inspection workspaces', async () => {
    render(<BuyerPlatform user={user} onNavigate={vi.fn()} />);
    expect(await screen.findByText('Welcome, Test Buyer')).toBeTruthy();
    expect(await screen.findByText('Auction vehicle')).toBeTruthy();
    expect(screen.getByTestId('existing-escrow-desk')).toBeTruthy();
    expect(screen.getByTestId('existing-inspection-workspace')).toBeTruthy();
    expect(screen.getByTestId('existing-finance-workspace')).toBeTruthy();
  });

  it('navigates to the existing auction discovery surface', async () => {
    const onNavigate = vi.fn();
    render(<BuyerPlatform user={user} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole('button', { name: /live auctions/i }));
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('shows an unavailable state instead of inventing an empty bid history', async () => {
    mocks.fetchMyBids.mockRejectedValue(new Error('network unavailable'));
    render(<BuyerPlatform user={user} onNavigate={vi.fn()} />);
    expect(await screen.findByText(/bid history is temporarily unavailable/i)).toBeTruthy();
    expect(screen.queryByText('No bids recorded yet')).toBeNull();
  });
});
