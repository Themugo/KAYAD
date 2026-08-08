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
  // visible until the consolidated "Live Auctions" dropdown is opened.
  it('consolidates KAYAD LIVE and Watch Live behind a Live Auctions dropdown instead of showing them as separate permanent buttons', () => {
    render(<Navbar {...baseProps} />);
    expect(screen.getByText('Live Auctions')).toBeTruthy();
    expect(screen.queryByText('KAYAD LIVE')).toBeNull();
    expect(screen.queryByText('Watch Live')).toBeNull();

    fireEvent.click(screen.getByText('Live Auctions'));
    expect(screen.getByText('KAYAD LIVE')).toBeTruthy();
    expect(screen.getByText('Watch Live Broadcast')).toBeTruthy();
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
