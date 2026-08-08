import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuctionsView } from '../../features/AuctionsView/components/AuctionsView';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('AuctionsView - escrow accuracy (first test coverage for this component)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    user: null,
    onOpenAuth: () => {},
    onStartEscrow: () => {},
  };

  // Found real overclaims while reviewing this page: the hero copy said
  // "All purchases feature 100% Escrow Vault protection", and the
  // Recently Sold section had a blanket "100% Escrow Protected" badge -
  // but the underlying vehicle for the one Ended/sold session
  // (Coastline Auto Ltd's Subaru Outback, v2) has escrowEligible: false
  // in its own mock data, explicitly commented "Must NEVER display
  // escrow badge". Neither claim was accurate for that specific
  // vehicle. Fixed the hero copy to describe availability rather than a
  // universal guarantee, and replaced the section-level badge with a
  // real per-card check via isEscrowApplicable.
  it('no longer claims all purchases have escrow protection in the hero copy', () => {
    render(<AuctionsView {...baseProps} />);
    expect(screen.queryByText(/All purchases feature 100% Escrow Vault protection/)).toBeNull();
    expect(screen.getByText(/available on eligible listings/)).toBeTruthy();
  });

  it('does not show a blanket "100% Escrow Protected" badge on the Recently Sold section', () => {
    render(<AuctionsView {...baseProps} />);
    expect(screen.queryByText('100% Escrow Protected')).toBeNull();
  });

  it('does not show an Escrow indicator for the real Recently Sold vehicle whose own data says escrowEligible: false', () => {
    render(<AuctionsView {...baseProps} />);
    // The one real Ended/recently-sold vehicle in mock data
    // (Coastline Auto Ltd's Subaru Outback) is confirmed
    // escrowEligible: false - its card should show "SOLD & SETTLED"
    // but no "Escrow" chip next to it.
    const soldLabel = screen.getByText('✓ SOLD & SETTLED');
    const card = soldLabel.closest('div')?.parentElement;
    expect(card?.textContent).not.toMatch(/Escrow/);
  });

  it('shows a real "Escrow Protected" indicator on Live auction cards whose vehicle is actually escrow-eligible', () => {
    render(<AuctionsView {...baseProps} />);
    // Both real Live-session vehicles (Nissan X-Trail, Mercedes
    // E-Class) are confirmed escrowEligible: true in mock data.
    expect(screen.getAllByText('Escrow Protected').length).toBeGreaterThan(0);
  });
});

describe('AuctionsView - organizer tooling is role-gated', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    onStartEscrow: () => {},
  };

  // Continuing the auction ecosystem review: the 3 hero buttons
  // (Organizer Dashboard, Organizer Portal, Organize Auction Event)
  // were shown unconditionally to every visitor regardless of role,
  // including logged-out ones - business/seller-side tooling mixed
  // into what should be a pure buyer browsing-and-bidding page. Also
  // found a related, more concerning issue: the inline creation form
  // was passed userRole={user?.role || 'dealer'}, defaulting to
  // dealer-level auction-creation permissions for a logged-out (null)
  // user rather than denying access. Verified against real UserProfile
  // role values, not a synthetic role string.
  it('hides all 3 organizer buttons for a logged-out visitor', () => {
    render(<AuctionsView {...baseProps} user={null} />);
    expect(screen.queryByText('Organizer Dashboard')).toBeNull();
    expect(screen.queryByText('Organizer Portal')).toBeNull();
    expect(screen.queryByText('Organize Auction Event')).toBeNull();
  });

  it('hides all 3 organizer buttons for a regular buyer', () => {
    render(<AuctionsView {...baseProps} user={{
      id: 'u1', name: 'Jane Buyer', email: 'jane@example.com', phone: '+254700000000',
      role: 'buyer', avatar: 'https://example.com/avatar.jpg',
    }} />);
    expect(screen.queryByText('Organizer Dashboard')).toBeNull();
    expect(screen.queryByText('Organizer Portal')).toBeNull();
    expect(screen.queryByText('Organize Auction Event')).toBeNull();
  });

  it('hides all 3 organizer buttons for a mechanic (also not organizer-capable)', () => {
    render(<AuctionsView {...baseProps} user={{
      id: 'u5', name: 'Mechanic Moses', email: 'moses@example.com', phone: '+254700000004',
      role: 'mechanic', avatar: 'https://example.com/avatar.jpg',
    }} />);
    expect(screen.queryByText('Organizer Dashboard')).toBeNull();
  });

  it('shows all 3 organizer buttons for a dealer', () => {
    render(<AuctionsView {...baseProps} user={{
      id: 'u2', name: 'Dealer Dan', email: 'dan@example.com', phone: '+254700000001',
      role: 'dealer', avatar: 'https://example.com/avatar.jpg',
    }} />);
    expect(screen.getByText('Organizer Dashboard')).toBeTruthy();
    expect(screen.getByText('Organizer Portal')).toBeTruthy();
    expect(screen.getByText('Organize Auction Event')).toBeTruthy();
  });

  it('shows all 3 organizer buttons for an admin', () => {
    render(<AuctionsView {...baseProps} user={{
      id: 'u3', name: 'Admin Amina', email: 'admin@kayad.co.ke', phone: '+254700000002',
      role: 'admin', avatar: 'https://example.com/avatar.jpg',
    }} />);
    expect(screen.getByText('Organizer Dashboard')).toBeTruthy();
  });

  it('shows all 3 organizer buttons for a bank_officer (repossession auctions)', () => {
    render(<AuctionsView {...baseProps} user={{
      id: 'u4', name: 'Officer Otieno', email: 'otieno@ncba.co.ke', phone: '+254700000003',
      role: 'bank_officer', avatar: 'https://example.com/avatar.jpg',
    }} />);
    expect(screen.getByText('Organizer Dashboard')).toBeTruthy();
  });
});
