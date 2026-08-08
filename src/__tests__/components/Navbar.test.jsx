import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Navbar } from '../../components/Navbar';

describe('Navbar', () => {
  afterEach(() => { cleanup(); });

  const baseProps = {
    user: null,
    savedCount: 0,
    activeNav: 'marketplace',
    onNavClick: vi.fn(),
    selectedCounty: 'All East Africa',
    onCountyChange: vi.fn(),
    onOpenAuth: vi.fn(),
    onOpenAlerts: vi.fn(),
    onLogout: vi.fn(),
    unreadCount: 0,
  };

  // This test file previously used a completely different prop shape
  // (currentPage/authUser/onSignOut, mocked AuthContext/SocketContext/etc.)
  // that doesn't match this component's real props at all - confirmed via
  // Navbar.tsx directly. It "passed" only because React silently ignores
  // unknown props and fills missing ones with defaults, so it happened to
  // render the logged-out state by accident rather than actually exercising
  // real behavior. Rewritten against the real NavbarProps interface.

  it('renders KAYAD branding', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getAllByText('KAYAD').length).toBeGreaterThan(0);
  });

  it('renders the Marketplace nav link', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
  });

  // Revised nav structure per explicit direction, after an intermediate
  // "just Marketplace" pass (previous commit) that was itself a direct
  // instruction, not a judgment call being overridden. Escrow and
  // Finance still stay contextual-only (VehicleDetailModal), matching
  // both requests - these 4 are specifically the ones asked for as
  // their own nav destinations.
  it('shows exactly 4 desktop nav destinations: Marketplace, Auction, Pre-Purchase Inspection, Support', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
    expect(screen.getByText('Auction')).toBeTruthy();
    expect(screen.getByText('Pre-Purchase Inspection')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
    // Escrow and Finance are deliberately absent as nav destinations -
    // not requested as their own items either time this nav was revised.
    expect(screen.queryByText('Finance')).toBeNull();
    expect(screen.queryByText('Escrow')).toBeNull();
  });

  it('clicking Auction navigates to the real auctions page (\'auctions\', not \'discovery\')', () => {
    const onNavClick = vi.fn();
    render(<Navbar {...baseProps} onNavClick={onNavClick} />);
    fireEvent.click(screen.getByText('Auction'));
    expect(onNavClick).toHaveBeenCalledWith('auctions');
  });

  it('clicking Pre-Purchase Inspection navigates to \'inspections\'', () => {
    const onNavClick = vi.fn();
    render(<Navbar {...baseProps} onNavClick={onNavClick} />);
    fireEvent.click(screen.getByText('Pre-Purchase Inspection'));
    expect(onNavClick).toHaveBeenCalledWith('inspections');
  });

  // The top utility bar (rotating trust messages, region selector, "Price
  // Alerts | Sign In") was removed as redundant chrome - region selection
  // already lives on the marketplace page itself, and "Sign In" was
  // duplicated between this bar and the main nav's own auth button.
  it('does not render the removed top utility bar region selector', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.queryByText(/Region:/)).toBeNull();
  });

  it('shows Sign In exactly once for a logged-out visitor, not duplicated', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getAllByText('Sign In').length).toBe(1);
  });
});

describe('Navbar - color consistency with the footer', () => {
  const baseProps = {
    user: null,
    savedCount: 0,
    activeNav: 'marketplace',
    onNavClick: vi.fn(),
    selectedCounty: 'All East Africa',
    onCountyChange: vi.fn(),
    onOpenAuth: vi.fn(),
    onOpenAlerts: vi.fn(),
    onLogout: vi.fn(),
    unreadCount: 0,
  };

  // The footer (App.tsx) uses bg-amber-400 text-[#17244B] as its accent
  // throughout. The navbar's own primary CTA previously used a
  // different, competing color (#C85A32, a muted terracotta, per its
  // own removed comment) - a real, visible header-vs-footer
  // inconsistency, not just a subjective preference. Verifies the CTA
  // now uses the same amber accent the footer already established,
  // rather than trusting the source edit alone.
  it('the Sell Vehicle CTA uses the footer\'s amber accent, not the old competing terracotta', () => {
    const { container } = render(<Navbar {...baseProps} />);
    const cta = container.querySelector('#cta-sell-car');
    expect(cta).toBeTruthy();
    expect(cta?.className).toMatch(/amber-400/);
    expect(cta?.className).not.toMatch(/C85A32/);
  });
});
