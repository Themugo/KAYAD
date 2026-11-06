import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { VehicleDetailModal } from '../../components/VehicleDetailModal';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';

const nav = vi.fn();
const toggle = vi.fn();
let saved: string[] = [];
vi.mock('../../context/MarketplaceContext', () => ({
  useMarketplace: () => ({ savedVehicleIds: saved, toggleSaveVehicle: toggle, navigateTo: nav }),
}));
import { VehicleCard as GalleryCard } from '../../components/gallery/VehicleCard';

const base = { ...INITIAL_VEHICLES[0], id: 'v1', title: '2016 Toyota Land Cruiser V8', year: 2016, make: 'Toyota', model: 'Land Cruiser', price: 3500000, images: ['/a.jpg', '/b.jpg'], status: 'active' as const };

describe('gallery listing card shows only what the vehicle record supports', () => {
  it('has no "150-PT AUDITED" claim and no made-up mileage, transmission or location', () => {
    const v = { ...base, mileage: 0, transmission: '' as never, fuelType: '' as never, location: '', verified: false, listingType: 'sale' as never, auctionLifecycle: 'none' as const };
    const { container } = render(<GalleryCard vehicle={v} />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/AUDITED/i);
    expect(text).not.toContain('18,000');
    expect(text).not.toContain('Automatic');
    expect(text).not.toContain('Nairobi');
    expect(text).not.toContain('Verified listing');
    expect(text).toContain('Ksh 3,500,000');
  });
  it('shows a verified badge, real specs and availability when the data says so', () => {
    const v = { ...base, mileage: 165000, transmission: 'Automatic' as never, fuelType: 'Petrol' as never, location: 'Nairobi, Kenya', verified: true, listingType: 'sale' as never, auctionLifecycle: 'none' as const };
    const { container } = render(<GalleryCard vehicle={v} />);
    const text = container.textContent || '';
    for (const t of ['Verified listing', '165,000 km', 'Petrol', 'Automatic', 'Nairobi', 'Available']) expect(text).toContain(t);
  });
  it('never substitutes unrelated stock photography when a vehicle has no photo', () => {
    const { container, getByTestId } = render(<GalleryCard vehicle={{ ...base, images: [], image: undefined }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(getByTestId('gallery-card-no-photo').textContent).toContain('Photo not available');
  });
  it('has labelled photo arrows, an accessible save button and opens details from the card and its button', () => {
    saved = [];
    render(<GalleryCard vehicle={base} />);
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Save 2016 Toyota Land Cruiser V8/ }));
    expect(toggle).toHaveBeenCalledWith('v1');
    fireEvent.click(screen.getByRole('button', { name: /View vehicle details/ }));
    expect(nav).toHaveBeenCalledWith('vehicle_detail', 'v1');
  });
  it('does not call an auction "live" unless the lifecycle says so', () => {
    const v = { ...base, listingType: 'auction' as never, auctionLifecycle: 'draft' as const };
    const { container } = render(<GalleryCard vehicle={v} />);
    expect(container.textContent).toContain('Upcoming auction');
    expect(container.textContent).not.toMatch(/live/i);
  });
});

describe('vehicle details page presentation', () => {
  const renderModal = (vehicle = base) => render(
    <VehicleDetailModal vehicle={vehicle} notFoundId={null} allVehicles={INITIAL_VEHICLES} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} onRequestInspection={() => {}} isSaved={false} onToggleSave={() => {}} onSelectVehicle={() => {}} />,
  );
  it('keeps exactly one mobile price/contact bar (the duplicate fixed bar is gone)', () => {
    renderModal();
    expect(screen.getAllByTestId('mobile-action-bar')).toHaveLength(1);
    expect(document.body.querySelectorAll('div.fixed.bottom-0')).toHaveLength(0);
  });
  it('gives the gallery labelled controls, keyboard navigation and a stable aspect ratio', () => {
    renderModal();
    const main = screen.getByTestId('vehicle-gallery-main');
    expect(main.className).toContain('aspect-[4/3]');
    expect(main.getAttribute('aria-roledescription')).toBe('carousel');
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View photos fullscreen' })).toBeTruthy();
    const thumb2 = screen.getByRole('button', { name: /Show photo 2 of/ });
    expect(thumb2.getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(main, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /Show photo 2 of/ }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('logo assets', () => {
  const files = ['public/branding/kayad-road-mark.svg', 'public/favicon.svg', 'public/icons/icon-192.svg', 'public/icons/icon-512.svg', 'public/icons/badge-72.svg'];
  it.each(files)('%s is a symbol with no lettering and no gradients or filters', (f) => {
    const svg = readFileSync(f, 'utf8');
    expect(svg).not.toMatch(/<text|<tspan|font-family/i);
    expect(svg).not.toMatch(/linearGradient|radialGradient|<filter/i);
    expect(svg).toMatch(/#0A3340/);
    expect(svg).toMatch(/#13B8A6/);
  });
});
