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

  // Home-page/navbar redesign: verifies the actual reduction, not just
  // that the component renders. Previously KAYAD LIVE and Watch Live were
  // each their own permanent top-level button; they should no longer be
  // visible until the chevron on the consolidated "Live Auctions" pill
  // is clicked to open its dropdown.
  it('consolidates KAYAD LIVE and Watch Live behind a dropdown, opened via the chevron button specifically', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getByText('Live Auctions')).toBeTruthy();
    expect(screen.queryByText('KAYAD LIVE')).toBeNull();
    expect(screen.queryByText('Watch Live Broadcast')).toBeNull();

    // "Live Auctions" and its dropdown toggle are 2 separate sibling
    // buttons (not one button with a nested fake-button span, which
    // would be invalid HTML) - the chevron has its own aria-label
    // specifically so this dropdown can be opened without triggering
    // the navigation click next to it.
    fireEvent.click(screen.getByLabelText('More live auction destinations'));
    expect(screen.getByText('KAYAD LIVE')).toBeTruthy();
    expect(screen.getByText('Watch Live Broadcast')).toBeTruthy();
  });

  // Found while working on this exact button: 'auctions' (AuctionsView -
  // the real bidding/browsing page with actual vehicle data, filtering,
  // and escrow integration) had no path to it from navigation at all,
  // separate from the 3 auction-adjacent pages already in the dropdown.
  // Clicking "Live Auctions" itself (not the chevron) must navigate
  // there directly, not just toggle the dropdown menu open.
  it('clicking "Live Auctions" itself navigates to the real auctions page, not just the dropdown toggle', () => {
    const onNavClick = vi.fn();
    render(<Navbar {...baseProps} onNavClick={onNavClick} />);
    fireEvent.click(screen.getByText('Live Auctions'));
    expect(onNavClick).toHaveBeenCalledWith('auctions');
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
