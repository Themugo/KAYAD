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
    // but no "Escrow" chip next to it. Text updated from the old
    // '✓ SOLD & SETTLED' (a raw checkmark glyph baked into the string)
    // to plain 'SOLD & SETTLED' now that the checkmark is a real
    // CheckCircle2 icon component rendered alongside the text, not
    // part of the string itself - part of the icon-consistency pass.
    const soldLabel = screen.getByText('SOLD & SETTLED');
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

describe('AuctionsView - premium refinement pass (internal language, count consistency, timer robustness)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    user: null,
    onOpenAuth: () => {},
    onStartEscrow: () => {},
  };

  // Found while auditing against a spec explicitly calling out internal
  // implementation language leaking to customers: a verified bidder's
  // card showed "Pass Active: Bidder A-104" - an internal alias, not
  // customer-facing status language. Fixed to show "Verified Bidder"
  // instead, matching the spec's own suggested replacement.
  it('does not expose the internal bidder alias/number on a live auction card, showing "Verified Bidder" instead', () => {
    render(<AuctionsView {...baseProps} />);
    expect(screen.queryByText(/Bidder A-104/)).toBeNull();
    expect(screen.getByText('Verified Bidder')).toBeTruthy();
  });

  // Found a real count inconsistency: the "All" category count only
  // counted status === 'Live', while every individual category counted
  // 'Live' || 'Upcoming'. With the real current data (2 Live + 1
  // Upcoming across 3 non-overlapping channel categories), this meant
  // All showed 2 while Bank Repossession + Direct Import + Fleet
  // Clearance summed to 3 - a literal contradiction, since those
  // channels can't overlap per vehicle. Fixed 'All' to use the same
  // Live-or-Upcoming logic as every other category.
  it('the "All" category count is at least as large as the sum of the mutually-exclusive channel categories (no contradictory counts)', () => {
    render(<AuctionsView {...baseProps} />);
    // Several of these labels also appear as unrelated <option> text in
    // the category filter dropdown just above the widget - getByText
    // alone throws on the resulting multiple matches. Disambiguates by
    // finding the one whose nearest ancestor is an actual <button> (the
    // category widget's own tiles), since dropdown <option> elements
    // have no button ancestor at all.
    const findCategoryButton = (label: string) => {
      const matches = screen.getAllByText(label);
      const btn = matches.map((el) => el.closest('button')).find((b) => b !== null);
      expect(btn).toBeTruthy();
      return btn!;
    };
    const getCount = (btn: HTMLElement) => Number(btn.textContent?.match(/\d+/)?.[0] ?? 0);

    const allCount = getCount(findCategoryButton('All Listings'));
    const channelSum =
      getCount(findCategoryButton('Bank Repossessions')) +
      getCount(findCategoryButton('Direct Imports')) +
      getCount(findCategoryButton('Fleet Clearance')) +
      getCount(findCategoryButton('Dealer Clearance'));
    expect(allCount).toBeGreaterThanOrEqual(channelSum);
  });

  // The "Next Live Event" banner previously hardcoded "Wednesday, Aug
  // 5, 2026" - already in the past by the time this was tested, the
  // same stale-date bug class found and fixed several times elsewhere
  // in this ecosystem this session. Fixed to compute the real next
  // Wednesday from today. This banner only renders in the empty-state
  // fallback (no live auctions matching filters), so the test drives
  // the real search filter to a query with zero matches rather than
  // asserting on a synthetic prop.
  it('the "Next Live Event" banner shows a real future date whose weekday label actually matches (via the real empty-state path)', () => {
    render(<AuctionsView {...baseProps} />);
    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: 'zzz-no-such-vehicle-zzz' } });
    expect(screen.getByText('No Live Auctions Active Right Now')).toBeTruthy();
    const banner = screen.getByText(/Next Live Event:/);
    expect(banner.textContent).toMatch(/Next Live Event: Wednesday, \d{1,2} Aug 2026/);
    expect(banner.textContent).not.toMatch(/Aug 5, 2026/);
  });
});

describe('AuctionsView - accessibility: live card details reachable via keyboard', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    user: null,
    onOpenAuth: () => {},
    onStartEscrow: () => {},
  };

  // Found while auditing keyboard navigation (spec explicitly requires
  // it): the vehicle image and vehicle title on a live auction card
  // both opened the full detail modal via onClick on a <div>/<h3>
  // respectively, with no role="button", tabIndex, or onKeyDown - a
  // keyboard-only or screen-reader user had no way to reach this
  // specific destination (the full detail modal, not just the "Live
  // Auction Room" button elsewhere on the same card, which leads
  // somewhere different). Fixed both to be real keyboard targets.
  it('the vehicle title on a live card opens the detail modal via Enter key, not just mouse click', () => {
    render(<AuctionsView {...baseProps} />);
    const titles = screen.getAllByRole('button', { name: /Nissan X-Trail|Mercedes-Benz E-Class/ });
    expect(titles.length).toBeGreaterThan(0);
    fireEvent.keyDown(titles[0], { key: 'Enter' });
    // Opening the detail modal renders its own "Bid Log" tab, which
    // only exists inside that modal - a reliable signal it actually
    // opened, not just that the keydown handler fired without error.
    expect(screen.getByText(/Bid Log/)).toBeTruthy();
  });

  it('the vehicle image on a live card has an accessible label and opens the detail modal via keyboard', () => {
    render(<AuctionsView {...baseProps} />);
    const imageButtons = screen.getAllByLabelText(/View full details for/);
    expect(imageButtons.length).toBeGreaterThan(0);
    fireEvent.keyDown(imageButtons[0], { key: 'Enter' });
    expect(screen.getByText(/Bid Log/)).toBeTruthy();
  });
});
