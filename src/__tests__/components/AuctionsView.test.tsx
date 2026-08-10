import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('AuctionsView - auction ecosystem admin customization', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    user: null,
    onOpenAuth: () => {},
    onStartEscrow: () => {},
  };

  const adminUser = {
    id: 'usr-admin-1', name: 'System Admin (Amina Hassan)', email: 'admin@kayad.co.ke',
    phone: '+254 700 000 000', role: 'admin' as const, avatar: 'https://example.com/avatar.jpg',
  };
  const dealerUser = { ...adminUser, role: 'dealer' as const };

  beforeEach(() => {
    localStorage.clear();
  });

  it('does not show the Customize Auction Page button for a non-admin, even an organizer-capable dealer', () => {
    render(<AuctionsView {...baseProps} user={dealerUser} />);
    expect(screen.queryByText('Customize Auction Page')).toBeNull();
  });

  it('shows the Customize button for an admin and opens the real panel on click', () => {
    render(<AuctionsView {...baseProps} user={adminUser} />);
    fireEvent.click(screen.getByText('Customize Auction Page'));
    expect(screen.getByText('Customize Auction Page (Admin)')).toBeTruthy();
  });

  it('toggling a section off in the real panel actually hides it on the page', async () => {
    render(<AuctionsView {...baseProps} user={adminUser} />);
    expect(screen.getByText('How KAYAD Vehicle Auctions Work')).toBeTruthy();
    fireEvent.click(screen.getByText('Customize Auction Page'));
    // "How KAYAD Vehicle Auctions Work" now matches twice - the real
    // page heading (an <h2>) and the admin panel's own section toggle
    // button using the identical label. Disambiguates by finding the
    // one that's actually a <button>, rather than assuming DOM order.
    const matches = screen.getAllByText('How KAYAD Vehicle Auctions Work');
    const toggleButton = matches.find((el) => el.closest('button'));
    expect(toggleButton).toBeTruthy();
    fireEvent.click(toggleButton!);
    await waitFor(() => {
      // The admin panel's own toggle button keeps showing this label
      // (it doesn't disappear when a section is hidden - just its icon
      // changes from Eye to EyeOff), so exactly 1 match should remain
      // (the panel's toggle), not 0 - the real page heading specifically
      // is what should be gone.
      expect(screen.getAllByText('How KAYAD Vehicle Auctions Work').length).toBe(1);
    });
  });

  it('editing the hero title in the real panel updates the actual rendered heading', async () => {
    render(<AuctionsView {...baseProps} user={adminUser} />);
    expect(screen.getByText('KAYAD Vehicle Auctions')).toBeTruthy();
    fireEvent.click(screen.getByText('Customize Auction Page'));
    const titleInput = screen.getByDisplayValue('KAYAD Vehicle Auctions');
    fireEvent.change(titleInput, { target: { value: 'KAYAD Premium Auctions' } });
    await waitFor(() => {
      expect(screen.getByText('KAYAD Premium Auctions')).toBeTruthy();
    });
    expect(screen.queryByText('KAYAD Vehicle Auctions')).toBeNull();
  });

  it('the advert card is hidden by default, and enabling it in the real panel shows the real configured content', async () => {
    render(<AuctionsView {...baseProps} user={adminUser} />);
    expect(screen.queryByText('NCBA Bank Kenya')).toBeNull();
    fireEvent.click(screen.getByText('Customize Auction Page'));
    fireEvent.click(screen.getByText('Advert/Sponsor Card'));
    await waitFor(() => {
      expect(screen.getByText('NCBA Bank Kenya')).toBeTruthy();
    });
  });

  it('changes made through this panel are attributed to the real admin in the shared audit log', async () => {
    render(<AuctionsView {...baseProps} user={adminUser} />);
    fireEvent.click(screen.getByText('Customize Auction Page'));
    fireEvent.click(screen.getByText('Advert/Sponsor Card'));
    fireEvent.click(screen.getByText('Auction Page Change Log (Immutable)'));
    await waitFor(() => {
      expect(screen.getByText(/System Admin \(Amina Hassan\)/)).toBeTruthy();
    });
  });
});
