import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { isKnownPath } from '../../utils/knownRoutes';
import { titleForRoute } from '../../utils/pageTitle';
import LegalPage from '../../pages/LegalPage';
import NotFoundPage from '../../pages/NotFoundPage';
import { DealerProfileModal } from '../../features/DealersView/components/DealerProfileModal';
import { INITIAL_DEALER_BUSINESSES } from '../fixtures/data/mockDealersData';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';

afterEach(cleanup);

describe('known routes and 404', () => {
  it.each(['/', '/login', '/register', '/terms', '/privacy', '/auction/abc', '/cars/1', '/admin/cars', '/dealer/auction-operations/9', '/support', '/saved/'])('%s is served', (p) => expect(isKnownPath(p)).toBe(true));
  it.each(['/about', '/contact', '/faq', '/does-not-exist', '/showroom', '/random/deep/path'])('%s is not found', (p) => expect(isKnownPath(p)).toBe(false));
  it('does not advertise the unimplemented showroom path to crawlers', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    expect(robots).not.toMatch(/^Allow:\s*\/showroom\/?\s*$/m);
    expect(isKnownPath('/showroom')).toBe(false);
  });
  it('titles the 404 and the legal pages', () => {
    expect(titleForRoute('/nope', '')).toBe('Page not found | KAYAD');
    expect(titleForRoute('/terms', '')).toBe('Terms of Service | KAYAD');
    expect(titleForRoute('/privacy', '')).toBe('Privacy Policy | KAYAD');
    expect(titleForRoute('/', '')).toMatch(/^KAYAD \|/);
  });
  it('the 404 page does not redirect on its own and offers real destinations', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
    expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull();
    vi.advanceTimersByTime(10000);
    expect(screen.getByTestId('not-found-page')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Live auctions/ }).getAttribute('href')).toBe('/?nav=auctions');
    vi.useRealTimers();
  });
});

describe('legal pages', () => {
  it('terms describe the real commitment, refund and anonymity rules', () => {
    render(<MemoryRouter><LegalPage kind="terms" /></MemoryRouter>);
    const t = screen.getByTestId('legal-terms').textContent || '';
    for (const x of ['anonymous bidder ID', 'Private sellers cannot choose where commitments are paid', 'M-Pesa number on your profile', 'Never pay a bid commitment']) expect(t).toContain(x);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(8);
  });
  it('privacy names the Data Protection Act and the M-Pesa PIN promise', () => {
    render(<MemoryRouter><LegalPage kind="privacy" /></MemoryRouter>);
    const t = screen.getByTestId('legal-privacy').textContent || '';
    expect(t).toContain('Data Protection Act, 2019');
    expect(t).toContain('M-Pesa PIN');
  });
});

describe('sign-up consent and footer', () => {
  it('the registration form links to the terms and privacy pages', () => {
    const src = readFileSync('src/components/OnboardingFlow.tsx', 'utf8');
    expect(src).toContain('data-testid="onboarding-consent"');
    expect(src).toContain('href="/terms"');
    expect(src).toContain('href="/privacy"');
  });
  it('the live footer has legal links and no longer draws a letter tile', () => {
    const src = readFileSync('src/App.tsx', 'utf8');
    expect(src).toContain('<Link to="/terms"');
    expect(src).toContain('<Link to="/privacy"');
    expect(src).not.toMatch(/font-black flex items-center justify-center">\s*K\s*</);
  });
});

describe('no made-up imagery or values on public screens', () => {
  it('dealer profile component carries no stock photography and shows an honest empty gallery state', () => {
    const src = readFileSync('src/features/DealersView/components/DealerProfileModal.tsx', 'utf8');
    expect(src).not.toContain('unsplash');
    const dealer = { ...INITIAL_DEALER_BUSINESSES[0], galleryImages: undefined, coverBanner: undefined } as never;
    render(<DealerProfileModal dealer={dealer} allDealers={INITIAL_DEALER_BUSINESSES} vehicles={INITIAL_VEHICLES} onClose={() => {}} onQuickViewVehicle={() => {}} onStartEscrow={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Showroom Gallery/ }));
    expect(screen.getByTestId('dealer-gallery-empty').textContent).toContain('has not added showroom photos');
  });
  it('compare does not invent 2WD, Used or a star rating', () => {
    const src = readFileSync('src/components/CompareModal.tsx', 'utf8');
    expect(src).not.toContain("|| '2WD'");
    expect(src).not.toContain("|| 'Used'");
    expect(src).not.toContain('Certified Passed');
    expect(src).toContain('No rating yet');
  });
});
