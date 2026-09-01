import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostAuctionCompletionModal } from '../../features/AuctionsView/components/PostAuctionCompletionModal';
import { INITIAL_AUCTION_SESSIONS } from '../fixtures/mockAuctions';

describe('PostAuctionCompletionModal - escrow payment path (6-step process gap fix)', () => {
  // Found while checking the app's own advertised "How KAYAD Vehicle
  // Auctions Work" process (step 4: "Escrow Payment - Funds secured in
  // Escrow Vault") against what this modal actually offered: only ever
  // direct-bank-wire-to-organizer instructions, with copy explicitly
  // stating "KAYAD... does not receive bid security deposits or
  // vehicle purchase payments" - a direct contradiction of the
  // advertised step, for every single won auction regardless of the
  // underlying vehicle's real escrow eligibility.
  it('shows a real Escrow Vault payment option for a won auction whose vehicle is actually escrow-eligible', () => {
    const escrowEligibleSession = INITIAL_AUCTION_SESSIONS.find((s) => s.vehicle.escrowEligible || s.sellerType === 'Private Seller');
    expect(escrowEligibleSession).toBeTruthy();
    const onStartEscrow = vi.fn();

    render(
      <PostAuctionCompletionModal
        isOpen={true}
        onClose={() => {}}
        session={escrowEligibleSession!}
        onStartEscrow={onStartEscrow}
      />
    );

    fireEvent.click(screen.getByText('2. Payment Instructions'));
    expect(screen.getByText('Secure Payment via Escrow Vault')).toBeTruthy();
    fireEvent.click(screen.getByText('Secure Payment via Escrow Vault'));
    expect(onStartEscrow).toHaveBeenCalledWith(escrowEligibleSession!.vehicle);
  });

  it('does not show an escrow option for a won auction whose vehicle is not actually escrow-eligible, and keeps the direct-payment-only disclaimer', () => {
    const nonEligibleSession = INITIAL_AUCTION_SESSIONS.find(
      (s) => s.sellerType === 'Verified Dealer' && !s.vehicle.escrowEligible
    );
    expect(nonEligibleSession).toBeTruthy();

    render(
      <PostAuctionCompletionModal
        isOpen={true}
        onClose={() => {}}
        session={nonEligibleSession!}
        onStartEscrow={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('2. Payment Instructions'));
    expect(screen.queryByText('Secure Payment via Escrow Vault')).toBeNull();
    expect(screen.getByText('Direct Organizer Vehicle Payment Requirement')).toBeTruthy();
  });

  // Found a real, critical bug while auditing the auction-to-escrow
  // handoff (this phase's own "winning amount must be preserved"
  // requirement): session.vehicle.price is never updated when a bid is
  // placed - executeBid only sets .currentBid on the nested vehicle
  // copy, confirmed directly in AuctionsView.tsx - so the vehicle
  // object being handed to escrow still carried the vehicle's original,
  // stale listing price, not the amount the auction was actually won
  // for. Fixed by using the separately-and-correctly-passed
  // winningAmount prop to correct vehicle.price before the handoff.
  it('hands off the real winning amount to escrow, not the stale original vehicle.price', () => {
    const escrowEligibleSession = INITIAL_AUCTION_SESSIONS.find((s) => s.vehicle.escrowEligible || s.sellerType === 'Private Seller');
    expect(escrowEligibleSession).toBeTruthy();
    // Confirms this test is actually meaningful - would be worthless
    // if the winning amount happened to already equal vehicle.price.
    const realWinningAmount = escrowEligibleSession!.currentBid;
    expect(realWinningAmount).not.toBe(escrowEligibleSession!.vehicle.price);

    const onStartEscrow = vi.fn();
    render(
      <PostAuctionCompletionModal
        isOpen={true}
        onClose={() => {}}
        session={escrowEligibleSession!}
        winningAmount={realWinningAmount}
        onStartEscrow={onStartEscrow}
      />
    );

    fireEvent.click(screen.getByText('2. Payment Instructions'));
    fireEvent.click(screen.getByText('Secure Payment via Escrow Vault'));
    expect(onStartEscrow).toHaveBeenCalledWith(
      expect.objectContaining({ price: realWinningAmount })
    );
    const passedVehicle = onStartEscrow.mock.calls[0][0];
    expect(passedVehicle.price).not.toBe(escrowEligibleSession!.vehicle.price);
  });
});
