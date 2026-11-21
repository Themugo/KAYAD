import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { readEscrowRulesConfig } from '../../features/Admin/hooks/escrowRulesConfig';
import { VehicleMarketplace } from '../../features/VehicleMarketplace/components/VehicleMarketplace';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';

const vehicleApiMocks = vi.hoisted(() => ({ getCars: vi.fn(), campaignIds: vi.fn(), getCarById: vi.fn() }));
vi.mock('../../services/vehicleApi', async () => {
  const actual = await vi.importActual('../../services/vehicleApi');
  return { ...actual, getCars: vehicleApiMocks.getCars, getCurrentFeaturedCampaignCarIds: vehicleApiMocks.campaignIds, getCarById: vehicleApiMocks.getCarById };
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
    window.history.replaceState({}, '', '/'); // catalogue state is URL-backed; isolate tests
    vehicleApiMocks.campaignIds.mockReset(); vehicleApiMocks.campaignIds.mockResolvedValue([]); vehicleApiMocks.getCarById.mockReset();
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
    selectedCounty: 'All Kenya',
    onCountyChange: () => {},
    searchQuery: '',
    onSearchChange: () => {},
    onOpenCompareModal: () => {},
  };

  it('uses Kenya-only marketplace scope and accessible inventory controls', async () => {
    await renderMarketplace({ ...baseProps });
    expect(screen.getByText('All Kenya')).toBeInTheDocument();
    expect(screen.queryByText(/East Africa/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sort inventory')).toHaveValue('newest');
    expect(screen.getByRole('button', { name: /^Open inventory filters/ })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search vehicles by make, model or keyword' })).toBeInTheDocument();
  });

  it('keeps the mobile toolbar controls grouped for responsive layout', async () => {
    await renderMarketplace({ ...baseProps });
    expect(document.querySelector('.kayad-market-toolbar-controls')).toBeInTheDocument();
    expect(document.querySelector('.kayad-inventory-search-row')).toBeInTheDocument();
  });


  it('catalogue cards carry no inspection banner or booking CTA (inspection lives on vehicle details)', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');
    expect(document.querySelector('.kayad-vc-inspection')).toBeNull();
    const grid = screen.getByTestId('inventory-grid');
    expect(grid.textContent).not.toMatch(/No inspection report yet/i);
    expect(within(grid).queryByRole('button', { name: /^Request/ })).toBeNull();
  });

  it('shows a Reserved badge only for vehicles the server marks reserved, and no verified-listing claim', async () => {
    const first = INITIAL_VEHICLES[0];
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: [
        { id: first.id, title: first.title, brand: first.make, model: first.model, year: first.year, price: first.price, images: [], reservation: { reserved: true }, is_verified_dealer: true },
        { id: 'other', title: 'Other', brand: 'Mazda', model: 'CX-5', year: 2020, price: 3150000, images: [], is_verified_dealer: false },
      ],
      pagination: { page: 1, limit: 24, total: 2, pages: 1 },
    });
    await renderMarketplace({ ...baseProps });
    await waitFor(() => expect(screen.getAllByTestId('reserved-badge')).toHaveLength(1));
    expect(screen.getByTestId('inventory-grid').textContent).not.toContain('Verified listing');
  });

  it('list mode is a distinct row layout hook (not just a column change) and grid restores columns', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');
    expect(document.querySelector('.kayad-vehicle-card')?.getAttribute('data-layout')).toBe('grid');
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    await waitFor(() => expect(document.querySelector('.kayad-vehicle-card')?.getAttribute('data-layout')).toBe('list'));
    expect(screen.getByTestId('inventory-grid').hasAttribute('data-columns')).toBe(false);
    expect(screen.queryByRole('group', { name: 'Desktop grid columns' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    await waitFor(() => expect(screen.getByTestId('inventory-grid').getAttribute('data-columns')).toBe('4'));
  });

  it('filters, sort and layout are written to the URL and restored from a shared link', async () => {
    const { unmount } = await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');
    fireEvent.change(screen.getByLabelText('Sort inventory'), { target: { value: 'price-asc' } });
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    await waitFor(() => {
      expect(window.location.search).toContain('sort=price-asc');
      expect(window.location.search).toContain('view=list');
    });
    unmount();
    await renderMarketplace({ ...baseProps });
    expect(screen.getByLabelText('Sort inventory')).toHaveValue('price-asc');
    await waitFor(() => expect(screen.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'list'));
  });

  it('phone inventory scaling: every card carries the compact-layout hooks and omits blank specs', async () => {
    vehicleApiMocks.getCars.mockResolvedValue({
      success: true,
      data: [{ id: 'c1', title: 'Blanky', brand: 'Toyota', model: 'V8', year: 2016, price: 3500000, mileage: 0, fuel: '', transmission: '', location_city: 'Nairobi', images: [] }],
      pagination: { page: 1, limit: 24, total: 1, pages: 1 },
    });
    await renderMarketplace({ ...baseProps, vehicles: [] });
    await waitFor(() => expect(document.querySelectorAll('.kayad-vehicle-card').length).toBe(1));
    const card = document.querySelector('.kayad-vehicle-card') as HTMLElement;
    ['kayad-vc-media', 'kayad-vc-body', 'kayad-vc-price', 'kayad-vc-specs', 'kayad-vc-cta'].forEach((c) => expect(card.querySelector('.' + c)).toBeTruthy());
    expect(card.textContent).not.toMatch(/\b0 km\b/);
    expect(card.querySelector('.kayad-vc-specs')?.textContent).toContain('Nairobi');
    expect(document.querySelector('.kayad-toolbar-blurb')).toBeInTheDocument();
  });

  it('a dealer showroom queries that dealer only and shows a clearable Dealer chip', async () => {
    const onClearDealerScope = vi.fn();
    await renderMarketplace({ ...baseProps, dealerScope: { id: 'd-1', name: 'MAKENA DEALERS' }, onClearDealerScope } as any);
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenCalledWith(expect.objectContaining({ dealer: 'd-1' })));
    const chip = await screen.findByText('Dealer: MAKENA DEALERS');
    expect(chip).toBeInTheDocument();
  });

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
      expect(screen.getByText(/No vehicles are listed right now/i)).toBeTruthy();
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
    // The inventory heading's count chip carries the same truthful status (the former "at a glance" pill was retired).
    const heading = screen.getByRole('heading', { name: /Vehicle Inventory/i });
    expect(heading.textContent).toContain('Inventory unavailable');
    expect(heading.textContent).not.toMatch(/\b0\b/);
  });

  it('names a maintenance pause (HTTP 503 + maintenance body) instead of calling it a brief outage, and the retry control recovers', async () => {
    vehicleApiMocks.getCars.mockReset();
    const { VehicleApiError } = await import('../../services/vehicleApi');
    const emptyPage = { success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } };
    let maintenance = true;
    // The featured-vehicle request is separate from the inventory request; only the latter is paused.
    vehicleApiMocks.getCars.mockImplementation((params?: { featured?: boolean }) => (
      maintenance && !params?.featured
        ? Promise.reject(new VehicleApiError('System under scheduled maintenance.', 'server', 503, { code: 'MAINTENANCE', maintenance: true, scope: 'global' }))
        : Promise.resolve(emptyPage)
    ));
    await renderMarketplace({ ...baseProps, vehicles: [] });
    await waitFor(() => expect(screen.getByText(/Inventory is paused for maintenance/i)).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByText(/usually brief/i)).toBeNull();
    expect(screen.getByText(/Reference: HTTP 503/i)).toBeTruthy();
    const heading = screen.getByRole('heading', { name: /Vehicle Inventory/i });
    expect(heading.textContent).toContain('Inventory paused');
    // Recovery: the unavailable panel offers a retry control (the former status-pill retry was retired).
    maintenance = false;
    fireEvent.click(screen.getByRole('button', { name: /Retry inventory/i }));
    await waitFor(() => expect(screen.queryByText(/Inventory is paused for maintenance/i)).toBeNull(), { timeout: 3000 });
  });

  it('a successful empty response with no filters is "no vehicles listed", not an outage and not a filter miss', async () => {
    vehicleApiMocks.getCars.mockReset();
    vehicleApiMocks.getCars.mockResolvedValue({ success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } });
    await renderMarketplace({ ...baseProps, vehicles: [] });
    await waitFor(() => expect(screen.getByText(/No vehicles are listed right now/i)).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
    expect(screen.queryByText(/No vehicles match your filters/i)).toBeNull();
  });

  it('a running Super Admin campaign takes over the hero, in the scheduled order (one vehicle per slide)', async () => {
    const car = (id: string, brand: string, model: string) => ({ id, title: `${brand} ${model}`, brand, model, year: 2022, price: 5000000, status: 'available', images: [{ url: `/img/${id}.png` }], location_city: 'Nairobi' });
    vehicleApiMocks.campaignIds.mockResolvedValue(['camp-a', 'camp-b']);
    vehicleApiMocks.getCarById.mockImplementation(async (id: string) => (id === 'camp-a' ? car('camp-a', 'Campaign', 'Alpha') : car('camp-b', 'Campaign', 'Bravo')));
    await renderMarketplace({ ...baseProps });
    const view = within(screen.getByTestId('premium-hero'));
    await waitFor(() => expect(view.getAllByText(/Campaign Alpha/)[0]).toBeTruthy());
    expect(view.queryByText(/Campaign Bravo/)).toBeNull();          // compact hero: the second campaign vehicle is the next slide
    await waitFor(() => expect(view.getAllByRole('button', { name: /^Show featured vehicle \d+ of 2$/ }).length).toBe(2));
    fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
    expect(view.getAllByText(/Campaign Bravo/)[0]).toBeTruthy();
    expect(view.queryByText(/Campaign Alpha/)).toBeNull();
    expect(view.queryByText(new RegExp(`${INITIAL_VEHICLES[0].make} ${INITIAL_VEHICLES[0].model}`))).toBeNull();
  });

  it('with no running campaign the hero keeps its normal featured selection', async () => {
    await renderMarketplace({ ...baseProps });
    const view = within(screen.getByTestId('premium-hero'));
    expect(view.getAllByText(new RegExp(`${INITIAL_VEHICLES[0].make} ${INITIAL_VEHICLES[0].model}`))[0]).toBeTruthy();
  });

  it('the hero vehicle is eager-loaded, contained and its controls sit outside the vehicle button', async () => {
    await renderMarketplace({ ...baseProps });
    const stage = screen.getByTestId('hero-stage');
    const vehicle = within(stage).getByTestId('hero-vehicle');
    const img = vehicle.querySelector('img');
    expect(img?.getAttribute('loading')).toBe('eager');
    expect(img?.className).toMatch(/kk-hero__img/);
    expect(within(vehicle).queryByRole('button')).toBeNull();
  });

  // The hero no longer carries its own year/price/make inputs (approved 2026-11-19 composition: shortcut rail in the hero).
  // The same Super Admin search settings and typeable inputs now live in the unified inventory filter panel.
  const sidebar = () => within(screen.getByTestId('sidebar-filter-panel'));
  const quickPrices = () => within(sidebar().getByRole('group', { name: 'Quick maximum price' })).getAllByRole('button').map((b) => b.textContent);

  it('year and price choices come from the Super Admin search settings, not fixed values', async () => {
    window.localStorage.setItem('kayad_home_page_config_v1', JSON.stringify({ filterOptions: { priceSteps: [1500000, 3000000, 12000000], yearFrom: 2012 } }));
    try {
      await renderMarketplace({ ...baseProps });
      expect((sidebar().getByLabelText('From year') as HTMLInputElement).placeholder).toBe('2012');
      expect(quickPrices()).toEqual(['< 1.5M', '< 3M', '< 12M', 'Any']);
    } finally {
      window.localStorage.removeItem('kayad_home_page_config_v1');
    }
  });

  it('without settings the search keeps the standard 2005 start and default price steps', async () => {
    await renderMarketplace({ ...baseProps });
    expect((sidebar().getByLabelText('From year') as HTMLInputElement).placeholder).toBe('2005');
    expect(quickPrices()).toEqual(['< 2.5M', '< 4M', '< 7M', '< 10M', 'Any']);
  });

  it('make, price, year and body style are typeable inputs; make and body style are backed by suggestion lists', async () => {
    await renderMarketplace({ ...baseProps });
    for (const name of ['Make filter', 'Body style filter']) {
      const el = sidebar().getByLabelText(name) as HTMLInputElement;
      expect(el.tagName).toBe('INPUT');
      expect(el.getAttribute('list')).toBeTruthy();
    }
    for (const name of ['Max price', 'From year']) {
      const el = sidebar().getByLabelText(name) as HTMLInputElement;
      expect(el.tagName).toBe('INPUT');
      expect(el.getAttribute('inputmode')).toBe('numeric');
    }
  });
  it('a typed price is applied on Enter, formatted with thousands separators', async () => {
    await renderMarketplace({ ...baseProps });
    const price = sidebar().getByLabelText('Max price') as HTMLInputElement;
    fireEvent.change(price, { target: { value: '3250000' } });
    fireEvent.keyDown(price, { key: 'Enter' });
    await waitFor(() => expect(price.value).toBe('3,250,000'));
  });

  it('a featured card whose image fails keeps its label over a neutral placeholder (no broken-image icon)', async () => {
    await renderMarketplace({ ...baseProps });
    const pair = within(screen.getByTestId('premium-hero'));
    const name = `${INITIAL_VEHICLES[0].make} ${INITIAL_VEHICLES[0].model}`;
    fireEvent.error(pair.getByRole('img', { name: new RegExp(name) }));
    await waitFor(() => expect(pair.getByRole('img', { name: new RegExp(`Photo of .*${name}.* is unavailable`) })).toBeTruthy());
    expect(pair.getAllByText(new RegExp(name))[0]).toBeTruthy();
  });

  describe('mobile hero composition (canonical hero collection, one vehicle per slide)', () => {
    const mobileHero = () => screen.getByTestId('premium-hero');

    it('shows one featured vehicle per slide and changes slide using the existing controls', async () => {
      const name = (n: number) => `${INITIAL_VEHICLES[n].make} ${INITIAL_VEHICLES[n].model}`;
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      expect(view.getAllByText(new RegExp(name(0)))[0]).toBeTruthy();
      expect(view.queryByText(new RegExp(name(1)))).toBeNull();
      expect(view.getAllByRole('img').length).toBe(1);
      expect(view.getByRole('img', { name: new RegExp(name(0)) })).toBeTruthy();

      if (INITIAL_VEHICLES.length > 1) {
        await waitFor(() => expect(view.getAllByRole('button', { name: /^Show featured vehicle \d+ of \d+$/ }).length).toBe(INITIAL_VEHICLES.length));
        fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
        expect(view.getAllByText(new RegExp(name(1)))[0]).toBeTruthy();
        expect(view.queryByText(new RegExp(name(0)))).toBeNull();
        fireEvent.click(view.getByRole('button', { name: 'Previous featured vehicle' }));
        expect(view.getAllByText(new RegExp(name(0)))[0]).toBeTruthy();
      }
    });

    it('keeps the vehicle image contained inside one stage with the controls beside it, not on the image', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      const stage = view.getByTestId('hero-stage');
      expect(stage.querySelectorAll('[data-testid="hero-vehicle"]').length).toBe(1);
      expect(within(view.getByTestId('hero-vehicle')).queryByRole('button', { name: /featured vehicle/i })).toBeNull();
      expect(view.getByRole('group', { name: /featured vehicle controls/i })).toBeTruthy();
    });

    it('uses real featured inventory, one vehicle per slide, in order', async () => {
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      expect(view.getAllByRole('img').map((img) => img.getAttribute('src'))).toContain(INITIAL_VEHICLES[0].image);
      if (INITIAL_VEHICLES.length > 1) {
        await waitFor(() => expect(view.getAllByRole('button', { name: /^Show featured vehicle \d+ of \d+$/ }).length).toBe(INITIAL_VEHICLES.length));
        fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
        expect(view.getAllByRole('img').map((img) => img.getAttribute('src'))).toContain(INITIAL_VEHICLES[1].image);
      }
    });

    const showcaseConfig = () => ({ config: { heroPresentation: { vehicleSource: 'showcase', showcaseFallbackEnabled: true, showcaseVehicles: [
      { id: 'showcase-land-cruiser', make: 'Toyota', model: 'Land Cruiser 300', year: 0, image: '/hero/kayad-land-cruiser-cutout.png', mobileImage: '/hero/kayad-land-cruiser-mobile.webp', tagline: 'Premium SUV · 4WD · Automatic', enabled: true },
      { id: 'showcase-mercedes-gle', make: 'Mercedes-Benz', model: 'GLE', year: 0, image: '/hero/kayad-mercedes-gle-cutout.png', mobileImage: '/hero/kayad-mercedes-gle-mobile.webp', tagline: 'Luxury SUV · Automatic', enabled: true },
    ] } } });

    // Approved policy (15 Nov 2026): showcase artwork is used ONLY when there is no real eligible vehicle, is labelled illustrative, and never shows a price.
    it('uses admin-persisted showcase artwork only when there is no real vehicle, labelled as not a listing', async () => {
      const { adminAPI } = await import('../../api/api');
      vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce(showcaseConfig() as never);
      vehicleApiMocks.getCars.mockResolvedValue({ success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } });
      await renderMarketplace({ ...baseProps, vehicles: [] });
      const view = within(mobileHero());
      await waitFor(() => expect(view.getByText('Toyota Land Cruiser 300')).toBeTruthy());
      expect(view.getAllByText(/ILLUSTRATIVE · NOT A LISTING/i).length).toBe(1);
      expect(view.queryByText(/Ksh\s+[\d,]+/i)).toBeNull();
      await waitFor(() => expect(view.getAllByRole('button', { name: /^Show featured vehicle \d+ of 2$/ }).length).toBe(2));
      fireEvent.click(view.getByRole('button', { name: 'Next featured vehicle' }));
      expect(view.getByText('Mercedes-Benz GLE')).toBeTruthy();
      expect(view.getAllByText(/ILLUSTRATIVE · NOT A LISTING/i).length).toBe(1);
      expect(view.queryByText(/Ksh\s+[\d,]+/i)).toBeNull();
    });

    it('never lets showcase artwork replace real inventory, even when the legacy showcase source is configured', async () => {
      const { adminAPI } = await import('../../api/api');
      vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce(showcaseConfig() as never);
      await renderMarketplace({ ...baseProps });
      const view = within(mobileHero());
      await waitFor(() => expect(view.queryByText(/Visual showcase · not a listing/)).toBeNull());
      expect(view.queryByText('Toyota Land Cruiser 300')).toBeNull();
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
        expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Find Your Dream Today');
        expect(view.getByText('Admin supporting copy.')).toBeTruthy();
        // Approved 2026-11-19 composition: the hero carries the four functional shortcuts instead of two CTA buttons, so the
        // admin CTA labels are not rendered here (tracked as a Super Admin control gap, see the failure register).
        const shortcuts = view.getByRole('navigation', { name: 'Marketplace shortcuts' });
        expect(within(shortcuts).getAllByRole('button')).toHaveLength(4);
        expect(view.queryByText('How It Works')).toBeNull();
      });

      it('falls back to the canonical copy when no admin slide exists', async () => {
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Drive Your Dream Today');
        const shortcuts = within(view.getByRole('navigation', { name: 'Marketplace shortcuts' }));
        for (const label of [/Find a car/, /Sell a car/, /^Auctions/, /Verified vehicles/]) expect(shortcuts.getByRole('button', { name: label })).toBeTruthy();
      });

      it('rotation can be disabled by the administrator (no autoplay control, no timer)', async () => {
        const { adminAPI } = await import('../../api/api');
        vi.spyOn(adminAPI, 'getPublicConfig').mockResolvedValueOnce({ config: { heroPresentation: { rotationSeconds: 0 } } } as never);
        await renderMarketplace({ ...baseProps });
        const view = within(mobileHero());
        expect(view.queryByRole('button', { name: /automatic vehicle rotation/i })).toBeNull();
      });
    });
  });

  it('marks the active category chip and keeps it in sync with the Body Style filter', async () => {
    await renderMarketplace({ ...baseProps });
    const suv = screen.getByRole('button', { name: 'SUV category', pressed: false });
    fireEvent.click(suv);
    await waitFor(() => expect(screen.getByRole('button', { name: 'SUV category', pressed: true })).toBeTruthy());
    expect(screen.getByRole('button', { name: /^All vehicle categories/, pressed: false })).toBeTruthy();
  });

  it('renders the full-width inventory grid using the admin presentation defaults', async () => {
    await renderMarketplace({ ...baseProps  });
    await waitFor(() => {
      const inventoryGrid = screen.getByTestId('inventory-grid');
      expect(inventoryGrid.getAttribute('data-view-mode')).toBe('grid');
      expect(inventoryGrid.getAttribute('data-columns')).toBe('4');
      expect(inventoryGrid.className).toContain('kayad-inventory-grid');
      expect(inventoryGrid.style.getPropertyValue('--kayad-grid-columns')).toBe('4');
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

  it('manual entry: a typed make that is not a listed option is sent as a contains-match, never dropped', async () => {
    await renderMarketplace({ ...baseProps });
    const sidebar = screen.getByText('Refine inventory').closest('aside') as HTMLElement;
    const make = sidebar.querySelector('input[aria-label="Make filter"]') as HTMLInputElement;
    fireEvent.change(make, { target: { value: 'Subaru' } });
    fireEvent.keyDown(make, { key: 'Enter' });
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenCalledWith(expect.objectContaining({ brandLike: 'Subaru' })));
    expect(vehicleApiMocks.getCars).not.toHaveBeenCalledWith(expect.objectContaining({ brand: 'Subaru' }));
    const price = sidebar.querySelector('input[aria-label="Max price"]') as HTMLInputElement;
    fireEvent.change(price, { target: { value: '2,500,000' } });
    fireEvent.keyDown(price, { key: 'Enter' });
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenCalledWith(expect.objectContaining({ maxPrice: 2500000, brandLike: 'Subaru' })));
  });

  it('phones get a compact search row with a Filters button that opens the same panel', async () => {
    await renderMarketplace({ ...baseProps });
    expect(screen.getByTestId('mobile-search-row')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Open inventory filters/ }));
    const sheet = await screen.findByRole('dialog', { name: /Refine inventory/i });
    expect(sheet.querySelector('input[aria-label="Make filter"]')).toBeTruthy();
    expect(sheet.querySelector('input[aria-label="Colour filter"]')).toBeTruthy();
  });

  it('uses one canonical keyword search in the responsive inventory controls and removes duplicate upper quick filters', async () => {
    const onSearchChange = vi.fn();
    await renderMarketplace({ ...baseProps, onSearchChange, isHomePage: true });
    const search = screen.getByRole('searchbox', { name: /Search vehicles by make, model or keyword/i });
    const row = screen.getByTestId('mobile-search-row');
    const toolbar = screen.getByRole('heading', { name: /Vehicle Inventory/i }).closest('.kayad-market-toolbar');
    expect(toolbar).toBeTruthy();
    expect(row.compareDocumentPosition(toolbar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.parentElement).toHaveClass('kayad-inventory-controls-stack');
    expect(row.contains(search)).toBe(true);
    fireEvent.change(search, { target: { value: 'Mazda' } });
    expect(onSearchChange).toHaveBeenCalledWith('Mazda');
    expect(screen.queryByLabelText('Hero maximum price filter')).toBeNull();
    expect(screen.queryByLabelText('Hero year filter')).toBeNull();
    expect(screen.queryByLabelText('Hero body style filter')).toBeNull();
    expect(screen.queryByLabelText('Hero make filter')).toBeNull();
  });

  it('changes the live inventory grid between 3, 4 and 5 columns', async () => {
    await renderMarketplace({ ...baseProps  });
    await screen.findByTestId('inventory-grid');
    // The Super Admin layout default arrives asynchronously and is applied once; let it settle so the visitor's own choice is what is measured.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
    for (const columns of [3, 4, 5]) {
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${columns} columns`) }));
        const grid = screen.getByTestId('inventory-grid');
        expect(grid.getAttribute('data-columns')).toBe(String(columns));
        expect(grid.className).toContain('kayad-inventory-grid');
        expect(grid.style.getPropertyValue('--kayad-grid-columns')).toBe(String(columns));
        expect(screen.getByRole('button', { name: new RegExp(`^${columns} columns`) }).getAttribute('aria-pressed')).toBe('true');
      });
    }
  });

  it('resets server pagination atomically when sorting or changing page size from a later page', async () => {
    vehicleApiMocks.getCars.mockImplementation(async (params: Record<string, unknown> = {}) => ({
      success: true,
      data: INITIAL_VEHICLES.slice(0, Number(params.limit ?? 24)),
      pagination: {
        page: Number(params.page ?? 1),
        limit: Number(params.limit ?? 24),
        total: 50,
        pages: Math.ceil(50 / Number(params.limit ?? 24)),
      },
    }));

    await renderMarketplace({ ...baseProps });
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 1, limit: 24 })));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 2, limit: 24 })));

    const beforeSort = vehicleApiMocks.getCars.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Sort inventory'), { target: { value: 'price-asc' } });
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 1, limit: 24, sort: 'price_asc' })));
    const sortCalls = vehicleApiMocks.getCars.mock.calls.slice(beforeSort).map(([query]) => query as Record<string, unknown>);
    expect(sortCalls.some((query) => query.page === 2 && query.sort === 'price_asc')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 2, limit: 24, sort: 'price_asc' })));

    const beforePageSize = vehicleApiMocks.getCars.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '48' }));
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 1, limit: 48, sort: 'price_asc' })));
    const pageSizeCalls = vehicleApiMocks.getCars.mock.calls.slice(beforePageSize).map(([query]) => query as Record<string, unknown>);
    expect(pageSizeCalls.some((query) => query.page === 2 && query.limit === 48)).toBe(false);
  });

  it('shows an accurate result range and supports direct page-number navigation', async () => {
    vehicleApiMocks.getCars.mockImplementation(async (params: Record<string, unknown> = {}) => ({
      success: true,
      data: INITIAL_VEHICLES.slice(0, Number(params.limit ?? 24)),
      pagination: {
        page: Number(params.page ?? 1),
        limit: Number(params.limit ?? 24),
        total: 240,
        pages: Math.ceil(240 / Number(params.limit ?? 24)),
      },
    }));

    await renderMarketplace({ ...baseProps });
    await waitFor(() => expect(screen.getByTestId('pagination-summary').textContent).toContain('Showing 1–24 of 240 vehicles'));
    expect(screen.getByRole('navigation', { name: 'Inventory pagination' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    await waitFor(() => expect(vehicleApiMocks.getCars.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ page: 3, limit: 24 })));
    await waitFor(() => expect(screen.getByTestId('pagination-summary').textContent).toContain('Showing 49–72 of 240 vehicles'));
    expect(screen.getByRole('button', { name: 'Go to page 3' }).getAttribute('aria-current')).toBe('page');
  });

  it('category shortcuts replace the previous body-style or fuel category instead of leaving a hidden combined filter', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');

    fireEvent.click(screen.getByRole('button', { name: 'SUV category' }));
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenLastCalledWith(expect.objectContaining({ body: 'SUV' })));

    fireEvent.click(screen.getByRole('button', { name: 'Electric category' }));
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenLastCalledWith(expect.objectContaining({ fuel: 'Electric' })));
    const electricQuery = vehicleApiMocks.getCars.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    expect(electricQuery?.body).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Sedan category' }));
    await waitFor(() => expect(vehicleApiMocks.getCars).toHaveBeenLastCalledWith(expect.objectContaining({ body: 'Sedan' })));
    const sedanQuery = vehicleApiMocks.getCars.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    expect(sedanQuery?.fuel).toBeUndefined();
  });

  it('keeps mobile grid and list controls accessible and switches the canonical inventory view in both directions', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

    const gridButton = screen.getByRole('button', { name: 'Grid view' });
    const listButton = screen.getByRole('button', { name: 'List view' });
    expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    expect(listButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(listButton);
    await waitFor(() => {
      expect(screen.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'list');
      expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    await waitFor(() => {
      expect(screen.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'grid');
      expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('keeps the same listing actions connected in both phone view modes', async () => {
    const onToggleSave = vi.fn();
    const onQuickView = vi.fn();
    await renderMarketplace({ ...baseProps, onToggleSave, onQuickView });
    await screen.findByTestId('inventory-grid');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

    const firstVehicle = INITIAL_VEHICLES[0];
    const assertCardActions = () => {
      const card = document.querySelector('.kayad-vehicle-card');
      expect(card).toBeTruthy();
      expect(card?.querySelector('.kayad-vc-media')).toBeTruthy();
      expect(card?.querySelector('.kayad-vc-body')).toBeTruthy();
      expect(within(card as HTMLElement).getByRole('button', { name: new RegExp(`Save ${firstVehicle.title}`) })).toBeInTheDocument();
      expect(within(card as HTMLElement).getByRole('button', { name: /View vehicle details/i })).toBeInTheDocument();
      expect(within(card as HTMLElement).getByRole('button', { name: new RegExp(`Contact seller about ${firstVehicle.title}`) })).toBeInTheDocument();
    };

    assertCardActions();
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    await waitFor(() => expect(screen.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'list'));
    assertCardActions();

    const card = document.querySelector('.kayad-vehicle-card') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: new RegExp(`Save ${firstVehicle.title}`) }));
    expect(onToggleSave).toHaveBeenCalledWith(firstVehicle.id);
    fireEvent.click(within(card).getByRole('button', { name: /View vehicle details/i }));
    expect(onQuickView).toHaveBeenCalledWith(expect.objectContaining({ id: firstVehicle.id }));
    fireEvent.click(within(card).getByRole('button', { name: new RegExp(`Contact seller about ${firstVehicle.title}`) }));
    expect(await screen.findByRole('dialog', { name: /Contact seller/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    await waitFor(() => expect(screen.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'grid'));
    assertCardActions();
  });

  it('mobile filter drawer reuses the shared filter state and preserves values when closed and reopened', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');

    fireEvent.click(screen.getByRole('button', { name: /^Open inventory filters/i }));
    const dialog = screen.getByRole('dialog', { name: /Refine inventory/i });
    const mobileMake = within(dialog).getByLabelText('Make filter');
    fireEvent.change(mobileMake, { target: { value: 'Mazda' } });
    fireEvent.keyDown(mobileMake, { key: 'Enter' });

    await waitFor(() => {
      const desktopMake = document.querySelector('aside input[aria-label="Make filter"]') as HTMLInputElement | null;
      expect(desktopMake?.value).toBe('Mazda');
    });

    fireEvent.click(within(dialog).getByRole('button', { name: /Show .* vehicles/i }));
    expect(screen.queryByRole('dialog', { name: /Refine inventory/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Open inventory filters/i }));
    const reopened = screen.getByRole('dialog', { name: /Refine inventory/i });
    expect((within(reopened).getByLabelText('Make filter') as HTMLInputElement).value).toBe('Mazda');
  });

  it('retains the selected four-column preference when switching to list and back to grid', async () => {
    await renderMarketplace({ ...baseProps });
    await screen.findByTestId('inventory-grid');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

    fireEvent.click(screen.getByRole('button', { name: /^4 columns/ }));
    await waitFor(() => expect(screen.getByTestId('inventory-grid').getAttribute('data-columns')).toBe('4'));

    fireEvent.click(screen.getByRole('button', { name: /List view/i }));
    await waitFor(() => expect(screen.getByTestId('inventory-grid').getAttribute('data-view-mode')).toBe('list'));
    expect(screen.getByTestId('inventory-grid').hasAttribute('data-columns')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Grid view/i }));
    await waitFor(() => {
      const grid = screen.getByTestId('inventory-grid');
      expect(grid.getAttribute('data-view-mode')).toBe('grid');
      expect(grid.getAttribute('data-columns')).toBe('4');
      expect(grid.style.getPropertyValue('--kayad-grid-columns')).toBe('4');
    });

    fireEvent.change(screen.getByRole('combobox', { name: /Sort inventory/i }), { target: { value: 'price-asc' } });
    await waitFor(() => {
      expect(screen.getByTestId('inventory-grid').getAttribute('data-columns')).toBe('4');
      expect(screen.getByRole('button', { name: /^4 columns/ }).getAttribute('aria-pressed')).toBe('true');
    });
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
    selectedCounty: 'All Kenya',
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
    // One shared panel: Make accepts typed entry AND offers the live inventory's makes as suggestions.
    const makeInput = sidebar?.querySelector('input[aria-label="Make filter"]') as HTMLInputElement | null;
    expect(makeInput).toBeTruthy();
    expect(makeInput?.getAttribute('list')).toBeTruthy();
    expect(makeInput?.getAttribute('placeholder')).toMatch(/pick or type/i);
    const options = Array.from(sidebar?.querySelectorAll(`datalist[id="${makeInput?.getAttribute('list')}"] option`) ?? []).map((o) => (o as HTMLOptionElement).value);
    expect(options.length).toBeGreaterThan(0);
    expect(options).not.toContain('All');

    expect(screen.getByText('Reset all')).toBeTruthy();
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
    selectedCounty: 'All Kenya',
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
    selectedCounty: 'All Kenya',
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

  const buyerUser = { ...adminUser, role: 'user' as const };

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
    expect(columns.value).toBe('4'); // approved default: four columns
    expect(density.value).toBe('compact');

    fireEvent.change(columns, { target: { value: '3' } });
    fireEvent.change(density, { target: { value: 'standard' } });
    fireEvent.click(screen.getByText('List view'));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('kayad_home_page_config_v1') || '{}');
      expect(saved.inventoryLayout).toMatchObject({ columns: 3, cardDensity: 'standard', viewMode: 'list' });
    });
  });

  it('toggling a section off in the admin panel actually hides that section on the page', async () => {
    await renderMarketplace({ ...baseProps, user: adminUser, isHomePage: true });
    fireEvent.click(screen.getByText('Customize Home Page'));
    // Fixed: previously checked for "Escrow Protection" (the trust
    // strip's own heading) - removed per explicit direction along
    // with the Saved Searches row. "Search & Trust Info Card" still
    // genuinely, visibly toggles the hero + consolidated inventory search
    // (homeConfig.sectionVisibility.searchTrustCard still gates the hero and consolidated inventory search),
    // verified here via the search input's real placeholder text
    // instead.
    await waitFor(() => expect(screen.getByPlaceholderText(/Make, model or keyword/)).toBeTruthy());
    fireEvent.click(screen.getByText('Hero & Search Discovery'));
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
    fireEvent.click(screen.getByText('Hero & Search Discovery'));
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
    fireEvent.click(screen.getByText('Hero & Search Discovery'));
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
    selectedCounty: 'All Kenya',
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
