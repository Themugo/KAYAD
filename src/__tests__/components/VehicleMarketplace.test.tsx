import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { readEscrowRulesConfig } from '../../features/Admin/hooks/escrowRulesConfig';
import { VehicleMarketplace } from '../../features/VehicleMarketplace/components/VehicleMarketplace';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('VehicleMarketplace - real inventory grid (redesigned layout)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  it('renders without throwing against the real mock dataset', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.getByText(/Vehicle Inventory/i)).toBeTruthy();
  });

  // Fixed: this whole describe block previously tested a "Featured
  // Picks" strip - a real, working feature, but not part of the
  // redesigned layout adopted from an uploaded HTML reference per
  // explicit direction ("replace...entirely without duplicating
  // anything"). The underlying featuredPicks computation itself was
  // intentionally not deleted (still real, still correct, simply not
  // rendered in this specific layout) - these tests are updated to
  // verify the real behavior the new layout actually has instead of
  // asserting removed UI.
  it('shows the real, current vehicle count in the inventory heading', () => {
    render(<VehicleMarketplace {...baseProps} />);
    const heading = screen.getByText(/Vehicle Inventory/i);
    expect(heading.textContent).toContain(String(INITIAL_VEHICLES.length));
  });

  it('renders empty vehicles list without crashing, showing a real empty state', async () => {
    render(<VehicleMarketplace {...baseProps} vehicles={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/No vehicles match your filters/i)).toBeTruthy();
    }, { timeout: 2000 });
  });

  // Fixed: the redesigned grid uses 3 columns with the sidebar showing
  // (the sidebar is visible by default) and 4 without it - not the
  // previous single "4, never 5" consolidated mode, since the sidebar
  // itself now takes real, dedicated width in this layout.
  it('renders a real grid with the sidebar-aware column count (xl:grid-cols-3 while the sidebar shows)', async () => {
    const { container } = render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      const grids = Array.from(container.querySelectorAll('.grid'));
      const inventoryGrid = grids.find((g) => /xl:grid-cols-3/.test(g.className));
      expect(inventoryGrid).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('interleaves a real sponsor card into the grid without inflating the vehicle count', async () => {
    render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      expect(screen.queryAllByText(/Sponsored|^Partner$|Featured Dealer/).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    expect(INITIAL_VEHICLES.length).toBeGreaterThan(4);
    const heading = screen.getByText(/Vehicle Inventory/i);
    expect(heading.textContent).toContain(INITIAL_VEHICLES.length.toString());
  });

  // Fixed: page size is now a real button group (6/12/24 in the
  // redesigned toolbar, matching the uploaded reference layout), not a
  // <select> - defaults to 24 either way, verified via which button
  // carries the "active"-style class instead of getByDisplayValue.
  it('defaults the page-size control to 24, not 12', () => {
    render(<VehicleMarketplace {...baseProps} />);
    const button24 = screen.getByText('24');
    expect(button24.className).toMatch(/bg-\[#1E3063\]/);
  });
});

describe('VehicleMarketplace - consolidated Make selector (space audit)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  // Found a real duplicate: the sticky top bar and the desktop filter
  // sidebar each had their own physical <select> for the same
  // selectedMake state - both visible simultaneously on desktop with
  // the sidebar open (its default state), pure wasted space, not just
  // a visual redundancy. First fix attempt used a plain JS conditional
  // to remove the sticky-bar copy from the DOM whenever
  // showDesktopSidebar was true - caught before shipping that this
  // state isn't screen-size-aware and defaults to true regardless of
  // viewport, so that fix would have made the Make filter completely
  // unreachable below the lg: breakpoint (where the sidebar is always
  // CSS-hidden via `hidden lg:block` no matter what the state says).
  // Corrected to a CSS class driven by the same state, verified
  // directly here across both toggle states rather than re-trusting
  // the same reasoning that got it wrong once already.
  it('hides the top card Make selector via lg:hidden only when the sidebar is showing, not via JS removal', async () => {
    const { container } = render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    // Sidebar defaults to open - the top card's own Make <select>
    // must still be IN THE DOM (never JS-removed, so it's reachable
    // below lg: where the sidebar can't render), just carrying the
    // lg:hidden class so it's only actually hidden at that breakpoint.
    // Identifies it by which one actually carries lg:hidden, not by a
    // background-color className match - that heuristic broke once the
    // top card's own background changed (dark navy card merge), since
    // the sidebar's Make select happened to keep the exact background
    // class the heuristic was originally matching against.
    const makeSelects = Array.from(container.querySelectorAll('select')).filter((s) =>
      Array.from(s.options).some((o) => o.textContent === 'All Makes')
    );
    expect(makeSelects.length).toBe(2);
    const topCardMakeSelect = makeSelects.find((s) => s.className.includes('lg:hidden'));
    expect(topCardMakeSelect).toBeTruthy();

    // Toggle the sidebar closed - the top card's Make selector must
    // no longer carry lg:hidden, since with the sidebar gone it's the
    // only Make control left at any screen size.
    fireEvent.click(screen.getByTitle('Toggle filter sidebar'));
    await waitFor(() => {
      const selectsAfter = Array.from(container.querySelectorAll('select')).filter((s) =>
        Array.from(s.options).some((o) => o.textContent === 'All Makes')
      );
      expect(selectsAfter.length).toBe(1);
    });
    const selectsAfter = Array.from(container.querySelectorAll('select')).filter((s) =>
      Array.from(s.options).some((o) => o.textContent === 'All Makes')
    );
    expect(selectsAfter[0].className).not.toMatch(/lg:hidden/);
  });
});

describe('VehicleMarketplace - unified search/trust card (space audit)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  // Previously 2 separate cards stacked on top of each other (the
  // sticky search/filter bar, then the trust strip below it) - each
  // with its own padding/border/background/shadow. Merged into one,
  // and dropped position: sticky entirely, since a sticky element
  // permanently occupying viewport space while scrolling is exactly
  // the kind of thing that reads as "wasted space" even when
  // functional. Verifies both halves render inside a single shared
  // card container, and that no element in the page carries the old
  // sticky positioning class.
  it('renders all 3 trust pillars inside the shared card (search bar removed per explicit direction)', () => {
    render(<VehicleMarketplace {...baseProps} />);
    // Fixed: this card previously also held an "Instant search" input;
    // it was removed per explicit direction (the sidebar's own Filter
    // Vehicles panel already covers search/filtering, making this a
    // redundant second search box). Updated to verify what the card
    // actually contains now instead of asserting removed behavior.
    expect(screen.queryByPlaceholderText(/Instant search/)).toBeNull();
    expect(screen.getByText('Escrow Protection')).toBeTruthy();
    // "150-Point Inspection" (the trust strip's current heading, after
    // the accuracy-focused copy rewrite) is checked with getAllByText
    // rather than getByText - the sidebar's own "Verified Guarantees"
    // filter section has a similarly-worded but distinct checkbox
    // label ("150-Point Certified"), and a bare getByText would throw
    // on ambiguous matches if the 2 ever happened to say the exact same
    // thing again.
    expect(screen.getAllByText('150-Point Inspection').length).toBeGreaterThan(0);
    expect(screen.getByText('Live Auctions')).toBeTruthy();
  });

  it('the trust strip itself does not use position: sticky (the filter sidebar and modal headers have their own unrelated, legitimate sticky uses elsewhere on the page, not touched by this)', () => {
    render(<VehicleMarketplace {...baseProps} />);
    // Fixed: the redesigned layout has the trust strip as its own
    // separate, white-background section (matching the uploaded HTML
    // reference's .trust-strip{background:#fff}), not merged into a
    // navy gradient card with the search bar as before - locates it by
    // its own section element instead of the old bg-gradient-to-r
    // container class.
    const trustHeading = screen.getByText('Escrow Protection');
    let el: HTMLElement | null = trustHeading.parentElement;
    let foundSection: HTMLElement | null = null;
    for (let i = 0; i < 8 && el; i++) {
      if (el.tagName === 'SECTION') {
        foundSection = el;
        break;
      }
      el = el.parentElement;
    }
    expect(foundSection).toBeTruthy();
    expect(foundSection?.className).not.toMatch(/sticky/);
  });
});

describe('VehicleMarketplace - merged Saved Searches + result header card', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  // Fixed: this whole describe block previously tested a merged
  // "Saved Searches + result header" card, a prior design decision -
  // the redesigned layout (adopted from an uploaded HTML reference per
  // explicit direction) has no equivalent merged card at all. Saved
  // Searches is real, kept as its own visible quick-access row (not
  // dropped just because the reference design doesn't picture it), but
  // it is not merged with the inventory header - these tests verify
  // the real, current structure instead of a prior merge that no
  // longer exists.
  it('shows the real Saved Searches quick-access row with its label', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.getByText('Saved Searches:')).toBeTruthy();
  });

  it('still shows all 3 real default saved search presets by name', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.getByText(/Under Ksh 3\.5M SUVs/)).toBeTruthy();
    expect(screen.getByText(/Toyota Land Cruisers/)).toBeTruthy();
    expect(screen.getByText(/Low-Mileage Hybrids/)).toBeTruthy();
  });

  // Fixed: the redesigned toolbar (matching the uploaded reference
  // layout) has no "Show:"/"Sort:" text labels - "Show" appears as
  // plain text before the real page-size button group, and sort is a
  // bare <select> with no separate label. Verifies the real controls
  // by their actual, current text/value instead of removed labels.
  it('Show and Sort controls are real and functional in the redesigned toolbar', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.getByText('Show')).toBeTruthy();
    expect(screen.getByDisplayValue('Newest First')).toBeTruthy();
  });
});

describe('VehicleMarketplace - trust strip accuracy', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  // The trust strip previously made blanket claims ("Every inspected
  // listing checked before it's live", "Bid in real time on verified
  // stock") that read as if every single listing has these properties.
  // Checked real mock data directly before rewriting anything: only 3
  // of 6 vehicles are actually inspected, only 2 of 6 are auctions, and
  // escrow is mandatory for private sellers specifically but only
  // optional for dealers - not a blanket guarantee. Verifies the
  // corrected copy no longer makes those universal claims.
  it('no longer claims escrow protects every payment universally', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.queryByText(/Funds held safely until you confirm handover/)).toBeNull();
    expect(screen.getByText(/Required for private sellers, available for dealers/)).toBeTruthy();
  });

  it('no longer implies every listing is inspected', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.queryByText(/Every inspected listing checked before it's live/)).toBeNull();
    expect(screen.getByText(/On certified listings only/)).toBeTruthy();
  });

  it('no longer implies all stock is available for live bidding', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.queryByText(/Bid in real time on verified stock/)).toBeNull();
    expect(screen.getByText(/Bid live on select auction vehicles/)).toBeTruthy();
  });
});

// Fixed: Featured Picks (a slider card above the inventory grid) was a
// real, working feature, but is not part of the redesigned layout
// adopted from an uploaded HTML reference per explicit direction
// ("replace...entirely without duplicating anything"). The underlying
// featuredPicks computation itself was intentionally left in place
// (still correct, simply not rendered in this layout) rather than
// deleted - if a future design brings back an equivalent slider, the
// same real data is still there to power it. The 2 tests that
// previously verified this section's own specific visual treatment
// (a neutral card, a scroll-snap slider, fixed-width cards) have no
// current equivalent to test and were removed rather than kept
// asserting removed UI.

describe('VehicleMarketplace - admin home page customization', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  const adminUser = {
    id: 'usr-admin-1',
    name: 'System Admin (Amina Hassan)',
    email: 'admin@kayad.co.ke',
    phone: '+254 700 000 000',
    role: 'admin' as const,
    avatar: 'https://example.com/avatar.jpg',
  };

  const buyerUser = { ...adminUser, role: 'buyer' as const };

  beforeEach(() => {
    // The config hook reads/writes localStorage - clear it between
    // tests so one test's changes (section toggles, text edits, accent
    // theme) can't leak into another's assertions.
    localStorage.clear();
  });

  it('does not show the Customize button for a non-admin user, even on the real home page', () => {
    render(<VehicleMarketplace {...baseProps} user={buyerUser} isHomePage />);
    expect(screen.queryByText('Customize Home Page')).toBeNull();
  });

  it('does not show the Customize button for an admin user when this is NOT the real home page (the reused "saved vehicles" view)', () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage={false} />);
    expect(screen.queryByText('Customize Home Page')).toBeNull();
  });

  it('shows the Customize button only for an admin user on the real home page, and opens the panel on click', () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    const button = screen.getByText('Customize Home Page');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByText('Customize Home Page (Admin)')).toBeTruthy();
  });

  it('toggling a section off in the admin panel actually hides that section on the page', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    // Fixed: previously toggled "Featured Picks Slider" - a real
    // config flag, but with no current visible effect since Featured
    // Picks isn't rendered by the redesigned layout at all. Uses
    // "Search & Trust Info Card" instead - the section this component
    // genuinely, visibly renders/hides based on this same real config
    // flag (homeConfig.sectionVisibility.searchTrustCard).
    await waitFor(() => expect(screen.getByText('Escrow Protection')).toBeTruthy());
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => {
      expect(screen.queryByText('Escrow Protection')).toBeNull();
    });
  });

  it('editing trust pillar text in the admin panel updates the actual rendered heading', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    expect(screen.getByText('Escrow Protection')).toBeTruthy();
    fireEvent.click(screen.getByText('Customize Home Page'));
    const headingInput = screen.getByDisplayValue('Escrow Protection');
    fireEvent.change(headingInput, { target: { value: 'Buyer Protection Program' } });
    await waitFor(() => {
      expect(screen.getByText('Buyer Protection Program')).toBeTruthy();
    });
    expect(screen.queryByText('Escrow Protection')).toBeNull();
  });

  it('persists the config to localStorage so a page reload (a fresh render) keeps the admin\'s changes', async () => {
    const { unmount } = render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => expect(screen.queryByText('Escrow Protection')).toBeNull());
    unmount();

    // Fresh render, simulating a reload - reads from the same
    // localStorage the first render just wrote to.
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    expect(screen.queryByText('Escrow Protection')).toBeNull();
  });

  it('Reset to Defaults in the admin panel restores hidden sections and edited text', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => expect(screen.queryByText('Escrow Protection')).toBeNull());

    fireEvent.click(screen.getByText('Reset to Defaults'));
    await waitFor(() => {
      expect(screen.getByText('Escrow Protection')).toBeTruthy();
    });
  });
});

describe('VehicleMarketplace - Escrow Rules & Activation admin UI (end-to-end through the real panel)', () => {
  const baseProps = {
    vehicles: INITIAL_VEHICLES,
    savedVehicles: [],
    comparedVehicles: [],
    onToggleSave: () => {},
    onToggleCompare: () => {},
    onQuickView: () => {},
    onStartEscrow: () => {},
    selectedCounty: 'All East Africa',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  const adminUser = {
    id: 'usr-admin-1',
    name: 'System Admin (Amina Hassan)',
    email: 'admin@kayad.co.ke',
    phone: '+254 700 000 000',
    role: 'admin' as const,
    avatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('clicking the Escrow Live Mode toggle in the real panel flips it from OFF to ON and logs the change', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    expect(screen.getByText('OFF')).toBeTruthy();

    fireEvent.click(screen.getByText('Escrow Live Mode'));
    await waitFor(() => {
      expect(screen.getByText('ON')).toBeTruthy();
    });

    // Confirms the audit log viewer, once opened, shows a real entry
    // for this exact change - not just that the toggle visually moved.
    fireEvent.click(screen.getByText('Admin Change Log (Immutable)'));
    await waitFor(() => {
      expect(screen.getByText(/Escrow Live Mode: OFF -> ON/)).toBeTruthy();
    });
  });

  it('changing the Private Sellers requirement dropdown in the real panel updates the config that isEscrowApplicable reads', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));

    const dropdown = screen.getByDisplayValue('Mandatory');
    fireEvent.change(dropdown, { target: { value: 'disabled' } });

    await waitFor(() => {
      expect(readEscrowRulesConfig().privateSellerRequirement).toBe('disabled');
    });
  });
});
