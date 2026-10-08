import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
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
vi.mock('../../api/api', async () => {
  const actual = await vi.importActual('../../api/api');
  return {
    ...actual,
    adminAPI: {
      ...(typeof actual.adminAPI === 'object' && actual.adminAPI !== null ? actual.adminAPI : {}),
      getPublicConfig: vi.fn().mockResolvedValue({ config: { heroFeaturedMode: 'all', heroCarIds: [] } }),
      getConfig: vi.fn().mockResolvedValue({ config: {} }),
      updateConfig: vi.fn().mockResolvedValue({ config: {} }),
    },
  };
});

vi.mock('../../services/heroApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/heroApi')>('../../services/heroApi');
  return { ...actual, getVisibleHeroSlides: vi.fn().mockResolvedValue([]) };
});
vi.mock('../../components/FloatingAdRail', () => ({ default: () => null }));

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


type MarketplaceProps = ComponentProps<typeof VehicleMarketplace>;

const renderMarketplace = async (props: MarketplaceProps) => {
  const result = render(<VehicleMarketplace {...props} />);
  await waitFor(() => expect(screen.getByText(/Vehicle Inventory/i)).toBeInTheDocument(), { timeout: 3000 });
  return result;
};

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
        is_verified_dealer: v.verified ?? false, is_promoted: true, dealer_id: v.sellerId || null,
        images: v.image ? [{ url: v.image }] : [], description: v.description,
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


  it('renders without throwing against the real mock dataset', async () => {
    await renderMarketplace({ ...baseProps  });
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
  it('shows the real, current vehicle count in the inventory heading', async () => {
    await renderMarketplace({ ...baseProps  });
    const heading = screen.getByText(/Vehicle Inventory/i);
    expect(heading.textContent).toContain(String(INITIAL_VEHICLES.length));
  });

  it('saved-only mode reuses the canonical marketplace grid without re-querying the full inventory', async () => {
    const result = render(<VehicleMarketplace {...baseProps} savedOnly />);
    await waitFor(() => expect(screen.getByText('Saved Vehicles')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '2021 Toyota Prado' })).toBeInTheDocument();
    // The Saved destination identifies itself and never presents itself as the full inventory.
    expect(screen.queryByText('Vehicle Inventory')).toBeNull();
    expect(vehicleApiMocks.getCars).not.toHaveBeenCalled();
    result.unmount();
  });

  it('renders empty vehicles list without crashing, showing a real empty state', async () => {
    vehicleApiMocks.getCars.mockResolvedValueOnce({ success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } });
    await renderMarketplace({ ...baseProps, vehicles: [] });
    await waitFor(() => {
      expect(screen.getByText(/No vehicles match your filters/i)).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('shows a truthful unavailable state (never "0 vehicles") when the inventory request fails with 502', async () => {
    vehicleApiMocks.getCars.mockReset();
    const { VehicleApiError } = await import('../../services/vehicleApi');
    vehicleApiMocks.getCars.mockRejectedValue(new VehicleApiError('Request failed with status code 502', 'server', 502));
    await renderMarketplace({ ...baseProps, vehicles: [] });
    await waitFor(() => {
      expect(screen.getByText(/Inventory is temporarily unavailable/i)).toBeTruthy();
    }, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Retry inventory/i })).toBeTruthy();
    expect(screen.getByText(/Reference: HTTP 502/i)).toBeTruthy();
    // A failed request must not be presented as a genuinely empty marketplace.
    expect(screen.queryByText(/^0 vehicles$/i)).toBeNull();
    expect(screen.queryByText(/No vehicles match your filters/i)).toBeNull();
    const glance = screen.getByLabelText(/Marketplace at a glance/i);
    expect(glance.textContent).toContain('Inventory unavailable');
    expect(glance.textContent).not.toMatch(/\b0\b/);
  });

  describe('mobile hero carousel (single active vehicle, canonical hero collection)', () => {
    const mobileHero = () => screen.getByLabelText('KAYAD mobile hero');

    it('shows ONE vehicle with the canonical tagline and switches with the arrows, wrapping both ways', async () => {
      // The hero collection is the real featured inventory (all INITIAL_VEHICLES in this fixture); the
      // identity line is "make model" - the same convention the desktop hero card and the image alt use.
      const name = (n: number) => `${INITIAL_VEHICLES[n].make} ${INITIAL_VEHICLES[n].model}`;
      const last = INITIAL_VEHICLES.length - 1;
      await renderMarketplace({ ...baseProps });
      const hero = mobileHero();
      const view = within(hero);
      expect(view.getByText(name(0))).toBeTruthy();
      expect(view.getByText(INITIAL_VEHICLES[0].description)).toBeTruthy();
      // Only the active vehicle is rendered (no second large vehicle on mobile).
      expect(view.queryByText(name(1))).toBeNull();
      expect(view.getAllByRole('img').length).toBe(1);

      fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
      expect(view.getByText(name(1))).toBeTruthy();
      expect(view.getByText(INITIAL_VEHICLES[1].description)).toBeTruthy();
      expect(view.queryByText(name(0))).toBeNull();

      // Back to the first, then backward past the first wraps to the last, and forward from the last wraps to the first.
      fireEvent.click(view.getByRole('button', { name: 'Previous featured vehicle' }));
      expect(view.getByText(name(0))).toBeTruthy();
      fireEvent.click(view.getByRole('button', { name: 'Previous featured vehicle' }));
      expect(view.getByText(name(last))).toBeTruthy();
      fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
      expect(view.getByText(name(0))).toBeTruthy();
    });

    it('keeps dots in sync with the active vehicle and lets a dot jump to a vehicle', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      const dot = (n: number) => view.getByRole('button', { name: `Show featured vehicle ${n}` });
      expect(dot(1).getAttribute('aria-current')).toBe('true');
      expect(dot(2).getAttribute('aria-current')).toBeNull();
      fireEvent.click(dot(2));
      expect(dot(2).getAttribute('aria-current')).toBe('true');
      expect(dot(1).getAttribute('aria-current')).toBeNull();
      expect(view.getByText('Subaru Outback')).toBeTruthy();
    });

    it('changes vehicle on a deliberate horizontal swipe but not on a vertical scroll', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      const stage = view.getByRole('button', { name: /^View Toyota Prado$/ }).parentElement as HTMLElement;
      const touch = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

      fireEvent.touchStart(stage, touch(200, 100));
      fireEvent.touchEnd(stage, touch(205, 190)); // mostly vertical: ignored
      expect(view.getByText('Toyota Prado')).toBeTruthy();

      fireEvent.touchStart(stage, touch(240, 100));
      fireEvent.touchEnd(stage, touch(120, 104)); // swipe left -> next
      expect(view.getByText('Subaru Outback')).toBeTruthy();

      fireEvent.touchStart(stage, touch(100, 100));
      fireEvent.touchEnd(stage, touch(230, 98)); // swipe right -> previous
      expect(view.getByText('Toyota Prado')).toBeTruthy();
    });

    it('uses real featured inventory as the hero source and keeps the selected vehicle consistent across desktop/mobile', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      const img = view.getByRole('img') as HTMLImageElement;
      expect(img.getAttribute('src')).toBe(INITIAL_VEHICLES[0].image);
      expect(img.closest('picture')?.querySelector('source')).toBeNull();

      fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
      const next = within(mobileHero()).getByRole('img') as HTMLImageElement;
      expect(next.getAttribute('src')).toBe(INITIAL_VEHICLES[1].image);
    });

    it('ignores legacy showcase hero configuration and keeps public hero identity on real featured inventory', async () => {
      const { adminAPI } = await import('../../api/api');
      vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce({ config: { heroPresentation: { vehicleSource: 'showcase', showcaseVehicles: [
        { id: 'showcase-land-cruiser', make: 'Toyota', model: 'Land Cruiser 300', year: 2026, image: '/hero/kayad-land-cruiser-cutout.png', enabled: true },
      ] } } } as never);
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      await waitFor(() => expect((view.getByRole('img') as HTMLImageElement).getAttribute('src')).toBe(INITIAL_VEHICLES[0].image));
    });

    describe('admin-controlled hero configuration', () => {
      const slide = (over: Record<string, unknown> = {}) => ({
        id: 'slide-1', eyebrowText: 'ADMIN EYEBROW', headline: 'Find Your Dream Today', subheadline: 'Admin supporting copy.',
        ctaPrimaryText: 'Browse Inventory', ctaPrimaryLink: '/inventory', ctaSecondaryText: 'See How', ctaSecondaryLink: '/how',
        backgroundType: 'color', overlayColor: '#000000', overlayOpacity: 0, displayMode: 'boxed', isVisible: true, sortOrder: 1, ...over,
      });

      it('shows the admin hero slide copy, CTA labels and exact headline on MOBILE (and does not rewrite it)', async () => {
        const { getVisibleHeroSlides } = await import('../../services/heroApi');
        vi.mocked(getVisibleHeroSlides).mockResolvedValueOnce([slide()] as never);
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        await waitFor(() => expect(view.getByText('ADMIN EYEBROW')).toBeTruthy());
        // Exact admin headline: not turned into "Drive Your Dream Today" just because it contains "Dream Today".
        expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Find Your Dream Today');
        expect(view.getByText('Admin supporting copy.')).toBeTruthy();
        expect(view.getByRole('button', { name: /Browse Inventory/ })).toBeTruthy();
        expect(view.getByRole('button', { name: /See How/ })).toBeTruthy();
        expect(view.queryByText('How It Works')).toBeNull();
      });

      it('falls back to the canonical copy when no admin slide exists', async () => {
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Drive Your DreamToday');
        expect(view.getByRole('button', { name: /Explore Vehicles/ })).toBeTruthy();
        expect(view.getByRole('button', { name: /How It Works/ })).toBeTruthy();
      });

      it('applies admin mobile stage height, slide speed and honours an explicit 0 (instant)', async () => {
        const { adminAPI } = await import('../../api/api');
        vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce({ config: { heroPresentation: { mobileStageMinPx: 200, mobileStageMaxPx: 300, mobileTransitionMs: 0, rotationSeconds: 0 } } } as never);
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        const stage = view.getByRole('button', { name: /^View Toyota Prado$/ });
        await waitFor(() => expect((stage.parentElement as HTMLElement).style.height).toBe('clamp(200px, 52vw, 300px)'));
        expect(stage.style.getPropertyValue('--kayad-hero-slide-ms')).toBe('0ms');
      });

      it('clamps unsafe stored values so the stage can never break the layout', async () => {
        const { adminAPI } = await import('../../api/api');
        vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce({ config: { heroPresentation: { mobileStageMinPx: 5, mobileStageMaxPx: 9000, mobileTransitionMs: -50, rotationSeconds: 1 } } } as never);
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        const stage = view.getByRole('button', { name: /^View Toyota Prado$/ });
        await waitFor(() => expect((stage.parentElement as HTMLElement).style.height).toBe('clamp(120px, 52vw, 420px)'));
        expect(stage.style.getPropertyValue('--kayad-hero-slide-ms')).toBe('0ms');
      });
    });

    it('never overlays arrows on the vehicle stage and contains the image', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      const stage = view.getByRole('button', { name: /^View Toyota Prado$/ }).parentElement as HTMLElement;
      // Arrow buttons live in a separate controls row, not inside the vehicle stage.
      expect(within(stage).queryByRole('button', { name: /featured vehicle/i })).toBeNull();
      expect(view.getByRole('img').className).toContain('object-contain');
    });
  });

  it('marks the active category chip and keeps it in sync with the Body Style filter', async () => {
    await renderMarketplace({ ...baseProps });
    const suv = screen.getByRole('button', { name: 'SUV', pressed: false });
    fireEvent.click(suv);
    await waitFor(() => expect(screen.getByRole('button', { name: 'SUV', pressed: true })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'All', pressed: false })).toBeTruthy();
  });

  it('renders the full-width inventory grid using the admin presentation defaults', async () => {
    await renderMarketplace({ ...baseProps  });
    await waitFor(() => {
      const inventoryGrid = screen.getByTestId('inventory-grid');
      expect(inventoryGrid.getAttribute('data-view-mode')).toBe('grid');
      expect(inventoryGrid.getAttribute('data-columns')).toBe('5');
      expect(inventoryGrid.className).toContain('kayad-inventory-grid');
      expect(inventoryGrid.style.getPropertyValue('--kayad-grid-columns')).toBe('5');
    }, { timeout: 2000 });
  });

  it('interleaves a real sponsor card into the grid without inflating the vehicle count', async () => {
    await renderMarketplace({ ...baseProps  });
    await waitFor(() => {
      expect(screen.queryAllByText(/Sponsored|^Partner$|Featured Dealer/).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    expect(INITIAL_VEHICLES.length).toBeGreaterThan(4);
    const heading = screen.getByText(/Vehicle Inventory/i);
    expect(heading.textContent).toContain(INITIAL_VEHICLES.length.toString());
  });

  // Page size is a real button group (12/24/48), not a
  // <select> - defaults to 24 either way, verified via which button
  // carries the "active"-style class instead of getByDisplayValue.
  it('shows and switches the live page-size controls between 12, 24 and 48', async () => {
    await renderMarketplace({ ...baseProps  });
    for (const size of [12, 24, 48]) {
      const button = screen.getByRole('button', { name: String(size) });
      fireEvent.click(button);
      await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
    }
  });

  it('changes the live inventory grid between 3, 4 and 5 columns', async () => {
    await renderMarketplace({ ...baseProps  });
    const grid = await screen.findByTestId('inventory-grid');
    for (const columns of [3, 4, 5]) {
      fireEvent.click(screen.getByRole('button', { name: `${columns}×` }));
      await waitFor(() => {
        expect(grid.getAttribute('data-columns')).toBe(String(columns));
        expect(grid.className).toContain('kayad-inventory-grid');
        expect(grid.style.getPropertyValue('--kayad-grid-columns')).toBe(String(columns));
      });
    }
  });

  // STAGE 10 MARKETPLACE VISUAL CONVERGENCE FIX: this inventory grid card
  // previously had its own, independent, mutually-exclusive badge
  // calculation (a single "ribbon" keyed off v.isAuction, the capability
  // flag) instead of the canonical auctionLifecycle/escrowEligible/
  // inspectionPassed fields already used by VehicleCard.tsx since Stage 8.
  // Two real defects this proves are fixed: (1) a scheduled/ended auction
  // must never render "Live Auction" on this grid, and (2) ESCROW and
  // INSPECTED signals must be able to show independently and in
  // combination, not as a single mutually-exclusive label.
  it('renders lifecycle-aware auction labels and independent escrow/inspection signals on the inventory grid card (not a single mutually-exclusive ribbon)', async () => {
    const scheduledId = 'lifecycle-draft-1';
    const liveId = 'lifecycle-live-1';
    const endedId = 'lifecycle-ended-1';
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: [
        {
          id: scheduledId, title: 'Scheduled Auction Car', brand: 'Toyota', model: 'Prado', year: 2021,
          price: 3000000, mileage: 40000, fuel: 'Petrol', transmission: 'Automatic', body_type: 'SUV',
          location_city: 'Nairobi', has_auction: true, auction_status: 'draft', current_bid: null,
          bids_count: 0, auction_end: null, escrow_enabled: false, inspection_status: 'pending',
          is_verified_dealer: false, is_promoted: false, dealer_id: null, images: [],
        },
        {
          id: liveId, title: 'Live Auction Car', brand: 'Toyota', model: 'Hilux', year: 2020,
          price: 2500000, mileage: 60000, fuel: 'Diesel', transmission: 'Manual', body_type: 'Pickup',
          location_city: 'Mombasa', has_auction: true, auction_status: 'live', current_bid: 2600000,
          bids_count: 4, auction_end: new Date(Date.now() + 3600_000).toISOString(),
          escrow_enabled: true, inspection_status: 'passed',
          is_verified_dealer: true, is_promoted: false, dealer_id: null, images: [],
        },
        {
          id: endedId, title: 'Ended Auction Car', brand: 'Nissan', model: 'X-Trail', year: 2019,
          price: 1800000, mileage: 80000, fuel: 'Petrol', transmission: 'Automatic', body_type: 'SUV',
          location_city: 'Kisumu', has_auction: true, auction_status: 'ended', current_bid: 1900000,
          bids_count: 6, auction_end: new Date(Date.now() - 3600_000).toISOString(),
          escrow_enabled: false, inspection_status: 'pending',
          is_verified_dealer: false, is_promoted: false, dealer_id: null, images: [],
        },
      ],
      pagination: { page: 1, limit: 24, total: 3, pages: 1 },
    });

    await renderMarketplace({ ...baseProps, vehicles: [] });
    const grid = await screen.findByTestId('inventory-grid');

    // The scheduled auction must never show as live or bid-ready.
    // Titles render as "{year} {make} {model}" split across text nodes, so
    // match on the unique model name rather than the fixture's own `title`.
    const scheduledCard = within(grid).getByText(/Prado/).closest('article')!;
    expect(within(scheduledCard).getAllByText(/Upcoming Auction/i).length).toBeGreaterThan(0);
    expect(within(scheduledCard).queryByText(/Live Auction/i)).toBeNull();
    expect(within(scheduledCard).queryByText(/Current bid/i)).toBeNull();

    // The ended auction must never look bid-ready either.
    const endedCard = within(grid).getByText(/X-Trail/).closest('article')!;
    expect(within(endedCard).getAllByText(/Auction Ended/i).length).toBeGreaterThan(0);
    expect(within(endedCard).queryByText(/Live Auction/i)).toBeNull();
    expect(within(endedCard).queryByText(/Current bid/i)).toBeNull();

    // The live auction, which is also escrow-eligible AND inspected, shows
    // all three signals at once rather than only one mutually-exclusive label.
    const liveCard = within(grid).getByText(/Hilux/).closest('article')!;
    expect(within(liveCard).getAllByText(/Live Auction/i).length).toBeGreaterThan(0);
    expect(within(liveCard).getByText(/Escrow/i)).toBeTruthy();
    expect(within(liveCard).getByText(/Inspected/i)).toBeTruthy();
    expect(within(liveCard).getByText(/Current bid/i)).toBeTruthy();
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
        is_verified_dealer: v.verified ?? false, is_promoted: true, dealer_id: v.sellerId || null,
        images: v.image ? [{ url: v.image }] : [],
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

  // The inventory defaults to an edge-to-edge presentation so the
  // The filter panel is a required desktop element; it is visible by default.
  it('keeps the inventory full-width and shows the required sidebar by default', async () => {
    const { container } = await renderMarketplace({ ...baseProps  });
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    // The catalog remains edge-to-edge while the required desktop sidebar is visible.
    const sidebarHeading = screen.getByText('Refine inventory');
    const sidebar = sidebarHeading.closest('aside');
    expect(sidebar).toBeTruthy();
    const sidebarMakeSelect = sidebar?.querySelector('select');
    expect(sidebarMakeSelect).toBeTruthy();
    expect(Array.from(sidebarMakeSelect?.options ?? []).some((o) => o.textContent === 'All Makes')).toBe(true);
    expect(sidebarMakeSelect?.className).not.toMatch(/lg:hidden/);

    expect(screen.getByText('Reset all filters')).toBeTruthy();
    expect(screen.queryByTitle('Toggle filter sidebar')).toBeNull();
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
        is_verified_dealer: v.verified ?? false, is_promoted: true, dealer_id: v.sellerId || null,
        images: v.image ? [{ url: v.image }] : [],
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
  it('Show and Sort controls are real and functional in the redesigned toolbar', async () => {
    await renderMarketplace({ ...baseProps  });
    expect(screen.getByText('Show')).toBeTruthy();
    expect(screen.getByDisplayValue('Newest First')).toBeTruthy();
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
        is_verified_dealer: v.verified ?? false, is_promoted: true, dealer_id: v.sellerId || null,
        images: v.image ? [{ url: v.image }] : [],
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

  it('does not show the Customize button for a non-admin user, even on the real home page', async () => {
    await renderMarketplace({ ...baseProps, user: buyerUser, isHomePage: true });
    expect(screen.queryByText('Customize Home Page')).toBeNull();
  });

  it('does not show the Customize button for an admin user when this is NOT the real home page (the reused "saved vehicles" view)', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: false });
    expect(screen.queryByText('Customize Home Page')).toBeNull();
  });

  it('shows the Customize button only for an admin user on the real home page, and opens the panel on click', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    const button = screen.getByText('Customize Home Page');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByText('Customize Home Page (Admin)')).toBeTruthy();
  });

  it('lets an admin change inventory layout without code and persists the presentation settings', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
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
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
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
    const { unmount } = await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    fireEvent.click(screen.getByText('Customize Home Page'));
    fireEvent.click(screen.getByText('Search & Trust Info Card'));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull());
    unmount();

    // Fresh render, simulating a reload - reads from the same
    // localStorage the first render just wrote to.
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    expect(screen.queryByPlaceholderText(/Make, model or keyword/)).toBeNull();
  });

  it('Reset to Defaults in the admin panel restores hidden sections and edited text', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
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
        is_verified_dealer: v.verified ?? false, is_promoted: true, dealer_id: v.sellerId || null,
        images: v.image ? [{ url: v.image }] : [],
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
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    fireEvent.click(screen.getByText('Customize Home Page'));
    const escrowToggle = screen.getByRole('button', { name: /Escrow Live Mode/i });
    expect(escrowToggle).toBeTruthy();
    expect(escrowToggle).toHaveTextContent('OFF');

    fireEvent.click(escrowToggle);
    await waitFor(() => {
      expect(escrowToggle).toHaveTextContent('ON');
      expect(escrowToggle).not.toHaveTextContent('OFF');
    });

    // Confirms the audit log viewer, once opened, shows a real entry
    // for this exact change - not just that the toggle visually moved.
    fireEvent.click(screen.getByText('Admin Change Log (Immutable)'));
    await waitFor(() => {
      expect(screen.getByText(/Escrow Live Mode: OFF -> ON/)).toBeTruthy();
    });
  });

  it('changing the Private Sellers requirement dropdown in the real panel updates the config that isEscrowApplicable reads', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    fireEvent.click(screen.getByText('Customize Home Page'));

    const dropdown = screen.getByDisplayValue('Mandatory');
    fireEvent.change(dropdown, { target: { value: 'disabled' } });

    await waitFor(() => {
      expect(readEscrowRulesConfig().privateSellerRequirement).toBe('disabled');
    });
  });
});
