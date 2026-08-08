import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostAuctionCompletionModal } from '../../features/AuctionsView/components/PostAuctionCompletionModal';
import { INITIAL_AUCTION_SESSIONS } from '../../data/mockAuctions';

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
});
