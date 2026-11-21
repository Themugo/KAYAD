import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DealerProfileModal } from '../../../features/DealersView/components/DealerProfileModal';
import { INITIAL_DEALER_BUSINESSES } from '../../fixtures/data/mockDealersData';
import { INITIAL_VEHICLES } from '../../fixtures/mockVehicles';

const props = { allDealers: INITIAL_DEALER_BUSINESSES, vehicles: INITIAL_VEHICLES, onClose: () => {}, onQuickViewVehicle: () => {}, onStartEscrow: () => {} };

describe('Dealer profile shows only real reviews', () => {
  it('a dealer with no reviews shows an honest empty state, never invented "verified purchase" reviews', () => {
    const dealer = { ...INITIAL_DEALER_BUSINESSES[0], reviews: undefined };
    render(<DealerProfileModal dealer={dealer} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Buyer Reviews \(0\)/ }));
    expect(screen.getByText('No reviews yet.')).toBeTruthy();
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/Peter Njuguna|Mary Atieno|Cleanest yard/);
  });
  it('real reviews are still listed', () => {
    const reviews = [{ id: 'x1', buyerName: 'Real Buyer', rating: 4, date: '2026-09-01', vehicleTitle: 'Fit', comment: 'Smooth.', verifiedPurchase: false }];
    render(<DealerProfileModal dealer={{ ...INITIAL_DEALER_BUSINESSES[0], reviews } as never} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Buyer Reviews \(1\)/ }));
    expect(screen.getByText('Real Buyer')).toBeTruthy();
  });
});
