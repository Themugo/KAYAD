import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { readEscrowRulesConfig } from '../../features/Admin/hooks/escrowRulesConfig';
import { VehicleMarketplace } from '../../features/VehicleMarketplace/components/VehicleMarketplace';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';

const vehicleApiMocks = vi.hoisted(() => ({ getCars: vi.fn() }));
vi.mock('../../services/vehicleApi', async () => {
  const actual = await vi.importActual('../../services/vehicleApi');
  return { ...actual, getCars: vehicleApiMocks.getCars };
});

// Fixed: mid-grid sponsor cards previously came from MOCK_SPONSOR_CARDS
// (static, always-present placeholder data) - now fetched for real via
// services/adApi.ts's getVisibleAdSlots, which has no real backend to
// reach in this test environment. Mocked here (matching this project's
// own established fetch-mocking pattern elsewhere) so the real
// sponsor-interleaving logic itself can still be verified.
vi.mock('../../services/adApi', async () => {
  const actual = await vi.importActual('../../services/adApi');
  return {
    ...actual,
    getVisibleAdSlots: vi.fn(async (placement: string) =>
      placement === 'mid_grid'
        ? [{ id: 'ad-1', placement: 'mid_grid', title: 'Test Sponsor', tagline: 'A real test ad', backgroundColor: '#1E3063', textColor: '#FFFFFF', opacity: 100, isVisible: true, sortOrder: 0, createdAt: '', updatedAt: '' }]
        : []
    ),
  };
});

describe('VehicleMarketplace - real inventory grid (redesigned layout)', () => {
  beforeEach(() => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: INITIAL_VEHICLES.map((v) => ({
        id: v.id, title: v.title, brand: v.make, model: v.model, year: v.year, price: v.price,
        mileage: v.mileage, fuel: v.fuelType, transmission: v.transmission, body_type: v.bodyStyle,
        location_city: v.location, has_auction: v.isAuction, current_bid: v.currentBid ?? null,
        bids_count: v.bidsCount ?? null, auction_end: v.auctionEndsAt ?? null,
        is_verified_dealer: v.verified ?? false, dealer_id: v.sellerId || null,
      })),
      pagination: { page: 1, limit: 24, total: INITIAL_VEHICLES.length, pages: 1 },
    });
  });

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
    const heading = screen.getByRole('heading', { name: /Vehicle Inventory/i });
    expect(heading).toHaveTextContent(String(INITIAL_VEHICLES.length));
  });

  it('renders empty vehicles list without crashing, showing a real empty state', async () => {
    vehicleApiMocks.getCars.mockResolvedValueOnce({ success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } });
    render(<VehicleMarketplace {...baseProps} vehicles={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/No vehicles match your filters/i)).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('renders the full-width inventory grid using the admin presentation defaults', async () => {
    render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      const inventoryGrid = screen.getByTestId('inventory-grid');
      expect(inventoryGrid.getAttribute('data-view-mode')).toBe('grid');
      expect(inventoryGrid.getAttribute('data-columns')).toBe('5');
      expect(inventoryGrid.className).toMatch(/2xl:grid-cols-5/);
    }, { timeout: 2000 });
  });

  it('interleaves a real sponsor card into the grid without inflating the vehicle count', async () => {
    render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      expect(screen.queryAllByText(/Sponsored|^Partner$|Featured Dealer/).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    expect(INITIAL_VEHICLES.length).toBeGreaterThan(4);
    const heading = screen.getByRole('heading', { name: /Vehicle Inventory/i });
    expect(heading).toHaveTextContent(INITIAL_VEHICLES.length.toString());
  });

  // Fixed: page size is now a real button group (6/12/24 in the
  // redesigned toolbar, matching the uploaded reference layout), not a
  // <select> - defaults to 24 either way, verified via which button
  // carries the "active"-style class instead of getByDisplayValue.
  it('defaults the page-size control to 24, not 12', () => {
    render(<VehicleMarketplace {...baseProps} />);
    const button24 = screen.getByText('24');
    expect(button24.className).toMatch(/bg-\[#0B1D3A\]/);
  });
});

describe('VehicleMarketplace - consolidated Make selector (space audit)', () => {
  beforeEach(() => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: INITIAL_VEHICLES.map((v) => ({
        id: v.id, title: v.title, brand: v.make, model: v.model, year: v.year, price: v.price,
        mileage: v.mileage, fuel: v.fuelType, transmission: v.transmission, body_type: v.bodyStyle,
        location_city: v.location, has_auction: v.isAuction, current_bid: v.currentBid ?? null,
        bids_count: v.bidsCount ?? null, auction_end: v.auctionEndsAt ?? null,
        is_verified_dealer: v.verified ?? false, dealer_id: v.sellerId || null,
      })),
      pagination: { page: 1, limit: 24, total: INITIAL_VEHICLES.length, pages: 1 },
    });
  });

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

  // The inventory defaults to the full-width presentation with the
  // desktop filter sidebar visible, so the catalogue uses the available
  // screen width while keeping filtering immediately accessible.
  it('keeps the inventory full-width by default with the filter sidebar visible', async () => {
    const { container } = render(<VehicleMarketplace {...baseProps} />);
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    const makeSelects = Array.from(container.querySelectorAll('select')).filter((s) =>
      Array.from(s.options).some((o) => o.textContent === 'All Makes')
    );
    expect(makeSelects.length).toBe(2);

    // With the desktop sidebar visible, the bridge's duplicate Make selector
    // is intentionally hidden at lg+ so the left filter panel is the primary
    // desktop filter surface.
    const topCardMakeSelect = makeSelects.find((s) => s.className.includes('lg:hidden'));
    expect(topCardMakeSelect).toBeTruthy();

    // The existing sidebar toggle remains a presentation-only control and
    // still allows the catalogue to expand when a visitor wants more width.
    fireEvent.click(screen.getByTitle('Toggle filter sidebar'));
    await waitFor(() => {
      const selectsAfter = Array.from(container.querySelectorAll('select')).filter((s) =>
        Array.from(s.options).some((o) => o.textContent === 'All Makes')
      );
      expect(selectsAfter.length).toBe(1);
    });
  });

});

// Fixed: this describe block previously tested the trust strip (3
// pillar cards - Escrow Protection/150-Point Inspection/Live
// Auctions) - a real section, but removed per explicit direction
// ("remove this segment and compact the space") along with the Saved
// Searches quick-access row. Both tests, and the entire "trust strip
// accuracy" describe block below (which verified this same removed
// content's copy), were removed rather than kept asserting UI that no
// longer exists. The underlying homeConfig.trustPillars data itself
// was intentionally left in place (unused by this layout, not
// deleted) in case a future design brings back an equivalent section.
//
// Fixed further: per a direct follow-up request, the Saved Searches
// quick-access row itself (kept visible in an earlier pass, after the
// prior merged-card design was retired) was also explicitly removed
// to compact this page's vertical space - so the describe block that
// used to verify it is removed too, rather than kept testing UI that
// no longer exists.

describe('VehicleMarketplace - toolbar controls (redesigned layout)', () => {
  beforeEach(() => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: INITIAL_VEHICLES.map((v) => ({
        id: v.id, title: v.title, brand: v.make, model: v.model, year: v.year, price: v.price,
        mileage: v.mileage, fuel: v.fuelType, transmission: v.transmission, body_type: v.bodyStyle,
        location_city: v.location, has_auction: v.isAuction, current_bid: v.currentBid ?? null,
        bids_count: v.bidsCount ?? null, auction_end: v.auctionEndsAt ?? null,
        is_verified_dealer: v.verified ?? false, dealer_id: v.sellerId || null,
      })),
      pagination: { page: 1, limit: 24, total: INITIAL_VEHICLES.length, pages: 1 },
    });
  });

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

  // The toolbar keeps explicit, readable labels for the existing
  // presentation controls so every control remains understandable.
  it('Show and Sort controls are real and functional in the redesigned toolbar', () => {
    render(<VehicleMarketplace {...baseProps} />);
    expect(screen.getByText('Show')).toBeTruthy();
    const sortControl = screen.getByRole('combobox', { name: 'Sort inventory' });
    expect(sortControl).toHaveValue('newest');
  });
});

describe('VehicleMarketplace - admin home page customization', () => {
  beforeEach(() => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: INITIAL_VEHICLES.map((v) => ({
        id: v.id, title: v.title, brand: v.make, model: v.model, year: v.year, price: v.price,
        mileage: v.mileage, fuel: v.fuelType, transmission: v.transmission, body_type: v.bodyStyle,
        location_city: v.location, has_auction: v.isAuction, current_bid: v.currentBid ?? null,
        bids_count: v.bidsCount ?? null, auction_end: v.auctionEndsAt ?? null,
        is_verified_dealer: v.verified ?? false, dealer_id: v.sellerId || null,
      })),
      pagination: { page: 1, limit: 24, total: INITIAL_VEHICLES.length, pages: 1 },
    });
  });

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

  it('lets an admin change inventory layout without code and persists the presentation settings', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));

    const columns = screen.getByLabelText('Desktop inventory columns') as HTMLSelectElement;
    const density = screen.getByLabelText('Inventory card density') as HTMLSelectElement;
    expect(columns.value).toBe('5');
    expect(density.value).toBe('compact');

    fireEvent.change(columns, { target: { value: '4' } });
    fireEvent.change(density, { target: { value: 'standard' } });
    fireEvent.click(screen.getByText('List view'));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('kayad_home_page_config_v1') || '{}');
      expect(saved.inventoryLayout).toMatchObject({ columns: 4, cardDensity: 'standard', viewMode: 'list' });
    });
  });

  it('toggling a section off in the admin panel actually hides that section on the page', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    // Fixed: previously checked for "Escrow Protection" (the trust
    // strip's own heading) - removed per explicit direction along
    // with the Saved Searches row. "Search & Trust Info Card" still
    // genuinely, visibly toggles the hero + search bridge section
    // (homeConfig.sectionVisibility.searchTrustCard still gates both),
    // verified here via the search input's real placeholder text
    // instead.
    await waitFor(() => expect(screen.getByPlaceholderText(/Make, model or keyword/)).toBeTruthy());
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull();
    });
  });

  // Fixed: this test previously edited a trust-pillar heading
  // (escrow.heading) and confirmed the rendered page updated - the
  // trust strip itself was removed per explicit direction, so
  // homeConfig.trustPillars is no longer rendered anywhere on this
  // page at all. Removed rather than kept asserting a visible effect
  // that no longer exists - the underlying config data and its own
  // admin-panel editing UI are untouched, simply without a current
  // rendering surface.

  it('persists the config to localStorage so a page reload (a fresh render) keeps the admin\'s changes', async () => {
    const { unmount } = render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull());
    unmount();

    // Fresh render, simulating a reload - reads from the same
    // localStorage the first render just wrote to.
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull();
  });

  it('Reset to Defaults in the admin panel restores hidden sections and edited text', async () => {
    render(<VehicleMarketplace {...baseProps} user={adminUser} isHomePage />);
    fireEvent.click(screen.getByText('Customize Home Page'));
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull());

    fireEvent.click(screen.getByText('Reset to Defaults'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Make, model or keyword/)).toBeTruthy();
    });
  });
});

describe('VehicleMarketplace - Escrow Rules & Activation admin UI (end-to-end through the real panel)', () => {
  beforeEach(() => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: INITIAL_VEHICLES.map((v) => ({
        id: v.id, title: v.title, brand: v.make, model: v.model, year: v.year, price: v.price,
        mileage: v.mileage, fuel: v.fuelType, transmission: v.transmission, body_type: v.bodyStyle,
        location_city: v.location, has_auction: v.isAuction, current_bid: v.currentBid ?? null,
        bids_count: v.bidsCount ?? null, auction_end: v.auctionEndsAt ?? null,
        is_verified_dealer: v.verified ?? false, dealer_id: v.sellerId || null,
      })),
      pagination: { page: 1, limit: 24, total: INITIAL_VEHICLES.length, pages: 1 },
    });
  });

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
    const escrowToggle = screen.getByRole('button', { name: /Escrow Live Mode/i });
    expect(escrowToggle).toBeTruthy();
    expect(escrowToggle).toHaveTextContent('OFF');

    fireEvent.click(escrowToggle);
    await waitFor(() => {
      expect(escrowToggle).toHaveTextContent('ON');
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
