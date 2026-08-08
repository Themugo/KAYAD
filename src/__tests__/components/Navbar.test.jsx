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

  // Second, more aggressive nav reduction, per explicit direction: every
  // one of Live Auctions/Finance's underlying functions (auction bidding,
  // escrow, pre-purchase inspection, financing) is already fully
  // contextual per-vehicle in VehicleDetailModal - confirmed directly
  // before making this change, not assumed (isAuction/isEscrowActive/
  // isInspectionActive/isFinanceActive all gate real UI there). The top
  // nav should show only Marketplace; a car's own rules/functions belong
  // on that car, not as competing global destinations.
  it('reduces the desktop primary nav to just Marketplace - no separate Live Auctions or Finance destinations', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
    expect(screen.queryByText('Live Auctions')).toBeNull();
    expect(screen.queryByText('Finance')).toBeNull();
    expect(screen.queryByText('KAYAD LIVE')).toBeNull();
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
