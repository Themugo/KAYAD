import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mySellerEnquiries: vi.fn(),
  myNegotiations: vi.fn(),
  offers: vi.fn(),
  fetchMyBids: vi.fn(),
}));
vi.mock('../../services/leadApi', () => ({ default: { mySellerEnquiries: mocks.mySellerEnquiries, myNegotiations: mocks.myNegotiations, offers: mocks.offers } }));
vi.mock('../../services/bidApi', () => ({ fetchMyBids: mocks.fetchMyBids }));

import PersonalActivityTimeline from '../../features/OwnershipPlatform/pages/PersonalActivityTimeline';

const baseProps = {
  userId: 'personal-1',
  role: 'user',
  listings: [{ id: 'car-1', title: '2022 Toyota Harrier', brand: 'Toyota', model: 'Harrier', year: 2022, price: 3500000, status: 'available', createdAt: '2026-11-10T10:00:00.000Z' }] as any,
  listingsLoading: false,
  escrows: [{ id: 'escrow-1', buyer: { id: 'personal-1', name: 'Member' }, seller: { id: 'seller-1', name: 'Seller' }, car: { id: 'car-1', title: 'Toyota Harrier' }, amount: 3500000, status: 'funded', createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-13T10:00:00.000Z' }] as any,
  escrowsLoading: false,
  onNavigate: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mySellerEnquiries.mockResolvedValue({ enquiries: [{ id: 'seller-lead-1', listing: { title: '2022 Toyota Harrier' }, stage: 'contacted', createdAt: '2026-11-14T10:00:00.000Z', lastActivityAt: '2026-11-15T10:00:00.000Z' }] });
  mocks.myNegotiations.mockResolvedValue({ leads: [{ id: 'buyer-lead-1', vehicle: 'car-2', stage: 'new', created_at: '2026-11-14T11:00:00.000Z' }] });
  // Offer events are conversation-scoped: each lead returns its own distinct event.
  mocks.offers.mockImplementation(async (leadId: string) => ({ offers: [], events: [{ id: `offer-event-${leadId}`, event_type: 'submitted', amount: leadId === 'seller-lead-1' ? 3100000 : 2900000, created_at: leadId === 'seller-lead-1' ? '2026-11-15T12:00:00.000Z' : '2026-11-15T13:00:00.000Z' }] }));
  mocks.fetchMyBids.mockResolvedValue({ bids: [{ id: 'bid-1', amount: 2100000, status: 'active', createdAt: '2026-11-13T12:00:00.000Z', car: { title: 'Auction vehicle' } }] });
});

describe('Personal activity timeline', () => {
  it('combines confirmed listing, enquiry, offer, bid and escrow records', async () => {
    render(<PersonalActivityTimeline {...baseProps} />);
    // One offer event per conversation (seller + buyer), not duplicated.
    expect((await screen.findAllByText('Offer submitted')).length).toBe(2);
    expect(screen.getByText('Personal listing created')).toBeTruthy();
    expect(screen.getByText('Seller enquiry activity')).toBeTruthy();
    expect(screen.getByText('Buyer enquiry opened')).toBeTruthy();
    expect(screen.getByText('Auction bid placed')).toBeTruthy();
    expect(screen.getByText('Escrow transaction opened')).toBeTruthy();
    expect(mocks.offers).toHaveBeenCalledWith('seller-lead-1');
    expect(mocks.offers).toHaveBeenCalledWith('buyer-lead-1');
  });

  it('filters the timeline by activity category', async () => {
    render(<PersonalActivityTimeline {...baseProps} />);
    await screen.findAllByText('Offer submitted');
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByText('Escrow transaction opened')).toBeTruthy();
    expect(screen.queryByText('Personal listing created')).toBeNull();
  });

  it('does not duplicate a conversation that appears in both buyer and seller sources', async () => {
    mocks.myNegotiations.mockResolvedValue({ leads: [{ id: 'seller-lead-1', stage: 'new', created_at: '2026-11-14T11:00:00.000Z' }] });
    render(<PersonalActivityTimeline {...baseProps} />);
    expect((await screen.findAllByText('Offer submitted')).length).toBe(1);
    expect(mocks.offers).toHaveBeenCalledTimes(1);
  });

  it('shows another conversation\'s offers only through the participant-scoped API call', async () => {
    mocks.offers.mockRejectedValue(new Error('403'));
    render(<PersonalActivityTimeline {...baseProps} />);
    await screen.findByText(/Some activity sources are unavailable/);
    expect(screen.getByText(/Some offer details are temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByText('Offer submitted')).toBeNull();
  });

  it('does not call the seller inbox for a legacy buyer role', async () => {
    render(<PersonalActivityTimeline {...baseProps} role="buyer" />);
    await screen.findByText('Buyer enquiry opened');
    expect(mocks.mySellerEnquiries).not.toHaveBeenCalled();
  });

  it('reports unavailable sources instead of displaying false zero counts', async () => {
    mocks.mySellerEnquiries.mockRejectedValue(new Error('offline'));
    mocks.myNegotiations.mockRejectedValue(new Error('offline'));
    mocks.fetchMyBids.mockRejectedValue(new Error('offline'));
    mocks.offers.mockResolvedValue({ events: [] });
    render(<PersonalActivityTimeline {...baseProps} listings={[]} escrows={[]} />);
    await waitFor(() => expect(screen.getAllByText('Unavailable', { selector: 'span' }).length).toBeGreaterThan(0));
    expect(screen.getByText(/Some activity sources are unavailable/)).toBeTruthy();
    expect(screen.queryByText('No recorded activity in this view yet')).toBeNull();
  });

  it('refreshes the participant-scoped activity sources', async () => {
    render(<PersonalActivityTimeline {...baseProps} />);
    await screen.findAllByText('Offer submitted');
    fireEvent.click(screen.getByRole('button', { name: /refresh activity/i }));
    await waitFor(() => expect(mocks.myNegotiations).toHaveBeenCalledTimes(2));
  });
});
