import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonalBuyingModule from '../../features/OwnershipPlatform/pages/PersonalBuyingModule';

const mocks = vi.hoisted(() => ({ fetchMyBids: vi.fn() }));
vi.mock('../../services/bidApi', () => ({ fetchMyBids: mocks.fetchMyBids }));
vi.mock('../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div data-testid="existing-escrow-desk">Existing escrow desk</div> }));
vi.mock('../../features/InspectionsView', () => ({ default: () => <div data-testid="existing-inspection-workspace">Existing inspection workspace</div> }));
vi.mock('../../features/FinancePlatform/pages/FinanceMarketplace', () => ({ default: () => <div data-testid="existing-finance-workspace">Existing finance workspace</div> }));

const user = { id: 'personal-1', name: 'Test Member', email: 'member@example.test', role: 'user', isVerified: true, createdAt: '2026-01-01' } as never;
const baseProps = {
  user,
  onNavigate: vi.fn(),
  savedVehicles: [{ id: 'fav-1', title: 'Saved vehicle', price: 1200000, images: [] }] as never[],
  savedVehicleCount: 1,
  savedVehiclesSessionUserId: 'personal-1',
  savedVehiclesLoading: false,
  savedVehiclesError: '',
  savedVehiclesErrorUserId: null,
  ownershipDashboard: null,
  ownershipDashboardLoading: false,
  ownershipDashboardError: false,
};

describe('Personal buying module convergence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMyBids.mockResolvedValue({ bids: [{ id: 'bid-1', amount: 2500000, status: 'active', createdAt: '2026-10-01T10:00:00Z', car: { title: 'Auction vehicle' } }] });
  });

  it('shows personal buying activity and reuses existing escrow and inspection functions', async () => {
    render(<PersonalBuyingModule {...baseProps} />);
    expect(await screen.findByText('My auction activity')).toBeTruthy();
    expect(screen.queryByText('Welcome, Test Member')).toBeNull();
    expect(await screen.findByText('Auction vehicle')).toBeTruthy();
    expect(screen.getByText('Saved vehicle')).toBeTruthy();
    expect(screen.getByTestId('existing-escrow-desk')).toBeTruthy();
    expect(screen.getByTestId('existing-inspection-workspace')).toBeTruthy();
    expect(screen.getByTestId('existing-finance-workspace')).toBeTruthy();
  });

  it('navigates to the existing auction discovery surface', async () => {
    const onNavigate = vi.fn();
    render(<PersonalBuyingModule {...baseProps} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole('button', { name: /open auctions/i }));
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('renders buying functions as a section without auction or deals dashboard content', async () => {
    render(<PersonalBuyingModule {...baseProps} section="buying" />);
    expect(await screen.findByText('Saved Vehicles')).toBeTruthy();
    expect(screen.queryByText('My auction activity')).toBeNull();
    expect(screen.queryByTestId('existing-escrow-desk')).toBeNull();
  });

  it('renders deals and escrow as a section without a second dashboard shell', async () => {
    render(<PersonalBuyingModule {...baseProps} section="deals" />);
    expect(await screen.findByTestId('existing-escrow-desk')).toBeTruthy();
    expect(screen.queryByText('My auction activity')).toBeNull();
    expect(screen.queryByText('Saved Vehicles')).toBeNull();
  });

  it('shows an unavailable state instead of inventing an empty bid history', async () => {
    mocks.fetchMyBids.mockRejectedValue(new Error('network unavailable'));
    render(<PersonalBuyingModule {...baseProps} />);
    expect(await screen.findByText(/bid history is temporarily unavailable/i)).toBeTruthy();
    expect(screen.queryByText('No bids recorded yet')).toBeNull();
  });
});
