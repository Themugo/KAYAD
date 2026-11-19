import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PremiumHero, { type PremiumHeroProps } from '../../components/home/PremiumHero';

const vehicle = { key: 'v1', title: '2021 Toyota Prado', alt: '2021 Toyota Prado', imageSrc: '/img/a.png', isPhoto: true, illustrative: false, eyebrow: 'KAYARD KE SELECT', detail: 'Nairobi', broken: false, ariaLabel: 'View 2021 Toyota Prado' };
const props = (o: Partial<PremiumHeroProps> = {}): PremiumHeroProps => ({
  eyebrow: "KENYA'S VEHICLE MARKETPLACE", headline: 'Drive Your Dream Today', supportCopy: 'Find, compare and buy verified vehicles from trusted sellers across Kenya.',
  primaryLabel: 'Explore Vehicles', primaryAria: 'Explore Vehicles', secondaryLabel: 'Sell Your Vehicle', secondaryAria: 'Sell Your Vehicle',
  onPrimary: vi.fn(), onSecondary: vi.fn(), vehicle, onVehicleSelect: vi.fn(), onVehicleBroken: vi.fn(),
  slideCount: 3, slideIndex: 0, onPrev: vi.fn(), onNext: vi.fn(), onGo: vi.fn(), showArrows: true, showDots: true, autoplay: true, paused: false, onTogglePause: vi.fn(),
  showVehicleInfo: true, environment: 'brand', ...o,
});

describe('PremiumHero (presentation only)', () => {
  it('renders the approved copy, CTAs and trust indicators', () => {
    render(<PremiumHero {...props()} />);
    expect(screen.getByText("KENYA'S VEHICLE MARKETPLACE")).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Drive Your Dream Today');
    for (const t of ['Explore Vehicles', 'Sell Your Vehicle', 'Verified Listings', 'Trusted Sellers', 'Secure Transactions']) expect(screen.getAllByText(t).length).toBeGreaterThan(0);
  });
  it('CTAs and the vehicle call their handlers', () => {
    const p = props(); render(<PremiumHero {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore Vehicles' })); fireEvent.click(screen.getByRole('button', { name: 'Sell Your Vehicle' })); fireEvent.click(screen.getByTestId('hero-vehicle'));
    expect(p.onPrimary).toHaveBeenCalled(); expect(p.onSecondary).toHaveBeenCalled(); expect(p.onVehicleSelect).toHaveBeenCalled();
  });
  it('loads the hero image eagerly (priority) with intrinsic size to avoid layout shift', () => {
    render(<PremiumHero {...props()} />);
    const img = screen.getByTestId('hero-vehicle').querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager'); expect(img.getAttribute('width')).toBeTruthy(); expect(img.getAttribute('height')).toBeTruthy(); expect(img.getAttribute('alt')).toBe('2021 Toyota Prado');
  });
  it('shows controls only for more than one slide and wires them', () => {
    const p = props(); const { rerender } = render(<PremiumHero {...p} />);
    const group = screen.getByRole('group', { name: /featured vehicle controls/i });
    fireEvent.click(within(group).getByRole('button', { name: 'Next featured vehicle' })); fireEvent.click(within(group).getByRole('button', { name: 'Previous featured vehicle' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Show featured vehicle 2 of 3' })); fireEvent.click(within(group).getByRole('button', { name: /Pause automatic/ }));
    expect(p.onNext).toHaveBeenCalled(); expect(p.onPrev).toHaveBeenCalled(); expect(p.onGo).toHaveBeenCalledWith(1); expect(p.onTogglePause).toHaveBeenCalled();
    rerender(<PremiumHero {...props({ slideCount: 1 })} />);
    expect(screen.queryByRole('group', { name: /featured vehicle controls/i })).toBeNull();
  });
  it('with no vehicle keeps the full design with a neutral placeholder and no <img>', () => {
    render(<PremiumHero {...props({ vehicle: undefined, slideCount: 0, emptyNote: 'Featured vehicles appear here as soon as verified sellers list them.' })} />);
    expect(screen.getByTestId('hero-fallback-visual')).toBeTruthy(); expect(screen.getByTestId('hero-empty-note')).toBeTruthy();
    expect(document.querySelector('[data-testid="premium-hero"] img')).toBeNull(); expect(screen.getByRole('button', { name: 'Explore Vehicles' })).toBeTruthy();
  });
  it('a failed image degrades to the placeholder and keeps the label', () => {
    render(<PremiumHero {...props({ vehicle: { ...vehicle, broken: true } })} />);
    expect(screen.getByTestId('hero-desktop-image-fallback')).toBeTruthy(); expect(screen.getByRole('img', { name: /is unavailable/ })).toBeTruthy();
  });
  it('reports an image error to the owner', () => {
    const p = props(); render(<PremiumHero {...p} />); fireEvent.error(screen.getByTestId('hero-vehicle').querySelector('img')!); expect(p.onVehicleBroken).toHaveBeenCalled();
  });
  it('announces the current vehicle politely and never overstates verification for illustrative art', () => {
    render(<PremiumHero {...props({ vehicle: { ...vehicle, illustrative: true, eyebrow: 'ILLUSTRATIVE · NOT A LISTING', ariaLabel: 'Browse vehicles. Prado is illustrative artwork, not a listing' } })} />);
    expect(screen.getByTestId('hero-vehicle').getAttribute('data-illustrative')).toBe('true'); expect(screen.getByText('ILLUSTRATIVE · NOT A LISTING')).toBeTruthy();
  });
});
