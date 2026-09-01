import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreAuctionInspectionModal } from '../../features/AuctionsView/components/PreAuctionInspectionModal';
import { INITIAL_AUCTION_SESSIONS } from '../fixtures/mockAuctions';

describe('PreAuctionInspectionModal - booking date defaults to the future', () => {
  // Found while continuing the auction ecosystem review: bookingDate
  // defaulted to a hardcoded '2026-07-31', already in the past by the
  // time this was actually tested - the same stale-date bug class found
  // and fixed elsewhere in this ecosystem this session (auctionEndsAt
  // in mockVehicles.ts and mockAuctions.ts). The date input also had no
  // min= constraint, so a user who didn't actively change the field
  // could submit an inspection booking for an already-passed date, and
  // the confirmation message would confidently reference it. Fixed the
  // default to compute 3 days from now, and added a real min=today
  // constraint so the browser's own picker prevents selecting a past
  // date regardless of the default.
  it('the booking date input defaults to a real future date, not a stale hardcoded one', () => {
    render(
      <PreAuctionInspectionModal
        isOpen={true}
        onClose={() => {}}
        session={INITIAL_AUCTION_SESSIONS[0]}
      />
    );
    fireEvent.click(screen.getByText('2. Mechanic Marketplace Booking'));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    const todayIso = new Date().toISOString().split('T')[0];
    expect(dateInput.value >= todayIso).toBe(true);
  });

  it('the date input has a real min= constraint preventing past-date selection', () => {
    render(
      <PreAuctionInspectionModal
        isOpen={true}
        onClose={() => {}}
        session={INITIAL_AUCTION_SESSIONS[0]}
      />
    );
    fireEvent.click(screen.getByText('2. Mechanic Marketplace Booking'));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const todayIso = new Date().toISOString().split('T')[0];
    expect(dateInput.min).toBe(todayIso);
  });
});
