import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleDetailModal } from '../../components/VehicleDetailModal';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('VehicleDetailModal', () => {
  it('renders without throwing when given a real vehicle from mock data', () => {
    const vehicle = INITIAL_VEHICLES[0];
    render(
      <VehicleDetailModal
        vehicle={vehicle}
        notFoundId={null}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(screen.getByText(vehicle.title)).toBeTruthy();
  });

  it('renders every vehicle in INITIAL_VEHICLES without throwing', () => {
    for (const vehicle of INITIAL_VEHICLES) {
      const { unmount } = render(
        <VehicleDetailModal
          vehicle={vehicle}
          notFoundId={null}
          allVehicles={INITIAL_VEHICLES}
          onClose={() => {}}
          onStartEscrow={() => {}}
          onContactSeller={() => {}}
          onRequestInspection={() => {}}
          isSaved={false}
          onToggleSave={() => {}}
          onSelectVehicle={() => {}}
        />
      );
      unmount();
    }
  });

  it('renders a "not found" state without throwing when the id has no match', () => {
    render(
      <VehicleDetailModal
        vehicle={null}
        notFoundId="some-id-that-does-not-exist"
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(screen.getByText(/unavailable/i)).toBeTruthy();
  });

  it('renders nothing when both vehicle and notFoundId are absent (closed state)', () => {
    const { container } = render(
      <VehicleDetailModal
        vehicle={null}
        notFoundId={null}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('opens correctly when re-rendered from closed to open on the same instance (the real click path)', () => {
    // This is the actual sequence that happens in the live app:
    // VehicleDetailModal is always mounted by App.tsx (its open/closed
    // state is controlled entirely via the `vehicle` prop going from
    // null to a real value), so clicking a car re-renders the SAME
    // component instance rather than mounting a fresh one. The other
    // tests in this file each call render() once with fixed props,
    // which creates a new instance every time and can never catch a
    // Rules-of-Hooks violation - React only throws "rendered more
    // hooks than during the previous render" when an existing
    // instance's hook count changes between renders. Regression test
    // for exactly that bug: a useMemo was previously positioned after
    // this component's early-return guards, so going from closed (10
    // hooks reached) to open (11 hooks reached) crashed with a
    // minified React error #310 on the very first real click.
    const vehicle = INITIAL_VEHICLES[0];
    const props = {
      allVehicles: INITIAL_VEHICLES,
      onClose: () => {},
      onStartEscrow: () => {},
      onContactSeller: () => {},
      onRequestInspection: () => {},
      isSaved: false,
      onToggleSave: () => {},
      onSelectVehicle: () => {},
    };

    const { rerender } = render(
      <VehicleDetailModal vehicle={null} notFoundId={null} {...props} />
    );

    expect(() => {
      rerender(<VehicleDetailModal vehicle={vehicle} notFoundId={null} {...props} />);
    }).not.toThrow();

    expect(screen.getByText(vehicle.title)).toBeTruthy();

    // And closing it again (open -> closed on the same instance) must
    // also not throw, for the same reason in reverse.
    expect(() => {
      rerender(<VehicleDetailModal vehicle={null} notFoundId={null} {...props} />);
    }).not.toThrow();
  });

  // The navbar was reduced to just "Marketplace" on the explicit premise
  // that auction bidding, escrow, and inspection (financing has its own
  // coverage below) are already fully contextual per-vehicle here, not
  // separate destinations a visitor needs a global nav item for. This is
  // the test that actually grounds that premise in real mock data rather
  // than just trusting the grep that found isAuction/isEscrowActive
  // gates in the source - confirms the auction CTA appears for a real
  // vehicle with isAuction: true, and does NOT appear for a real vehicle
  // without it.
  it('shows the auction bidding CTA only for vehicles that are actually mid-auction', () => {
    const auctionVehicle = INITIAL_VEHICLES.find((v) => v.isAuction === true);
    const nonAuctionVehicle = INITIAL_VEHICLES.find((v) => !v.isAuction);
    expect(auctionVehicle).toBeTruthy();
    expect(nonAuctionVehicle).toBeTruthy();

    const baseProps = {
      allVehicles: INITIAL_VEHICLES,
      onClose: () => {},
      onStartEscrow: () => {},
      onContactSeller: () => {},
      onRequestInspection: () => {},
      isSaved: false,
      onToggleSave: () => {},
      onSelectVehicle: () => {},
      notFoundId: null,
    };

    const { unmount } = render(<VehicleDetailModal vehicle={auctionVehicle!} {...baseProps} />);
    expect(screen.getByText(/Place Bid|Submit Auction Offer/)).toBeTruthy();
    unmount();

    render(<VehicleDetailModal vehicle={nonAuctionVehicle!} {...baseProps} />);
    expect(screen.queryByText(/Place Bid|Submit Auction Offer/)).toBeNull();
  });

  // Found a real, confirmed bug while auditing cross-page navigation:
  // clicking "Place Bid / Submit Auction Offer" called onContactSeller
  // (opening a chat with the seller) - the button's own label promised
  // bidding, but its actual action opened chat instead, with no route
  // to the auction lot at all. Added onViewAuctionLot specifically for
  // this button; confirms it's actually used when provided, and that
  // the old onContactSeller behavior only remains as a fallback for
  // any caller that hasn't been updated to pass the new prop.
  it('clicking "Place Bid" calls onViewAuctionLot when provided, not onContactSeller', () => {
    const auctionVehicle = INITIAL_VEHICLES.find((v) => v.isAuction === true)!;
    const onViewAuctionLot = vi.fn();
    const onContactSeller = vi.fn();
    render(
      <VehicleDetailModal
        vehicle={auctionVehicle}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={onContactSeller}
        onViewAuctionLot={onViewAuctionLot}
        isSaved={false}
        onToggleSave={() => {}}
        notFoundId={null}
      />
    );
    fireEvent.click(screen.getByText(/Place Bid|Submit Auction Offer/));
    expect(onViewAuctionLot).toHaveBeenCalledWith(auctionVehicle);
    expect(onContactSeller).not.toHaveBeenCalled();
  });

  it('falls back to onContactSeller only when onViewAuctionLot is not provided at all', () => {
    const auctionVehicle = INITIAL_VEHICLES.find((v) => v.isAuction === true)!;
    const onContactSeller = vi.fn();
    render(
      <VehicleDetailModal
        vehicle={auctionVehicle}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={onContactSeller}
        isSaved={false}
        onToggleSave={() => {}}
        notFoundId={null}
      />
    );
    fireEvent.click(screen.getByText(/Place Bid|Submit Auction Offer/));
    expect(onContactSeller).toHaveBeenCalledWith(auctionVehicle);
  });

  // Found while verifying the Place Bid fix above: the exact same
  // wrong-action bug existed on 2 more buttons in this file -
  // "Book Inspection & Reserve" and "Compare Bank Rates for this
  // Vehicle" both called onContactSeller (opening chat) despite their
  // labels promising something else entirely. "Book Inspection &
  // Reserve" only renders for the non-auction/non-private-seller/
  // non-escrow-active fallback case, so picks a real vehicle matching
  // that specifically rather than assuming any vehicle works.
  it('clicking "Book Inspection & Reserve" calls onRequestInspection, not onContactSeller', () => {
    const dealerVehicleNoEscrow = INITIAL_VEHICLES.find(
      (v) => !v.isAuction && v.sellerType !== 'Private Seller' && !v.escrowEligible
    );
    expect(dealerVehicleNoEscrow).toBeTruthy();
    const onRequestInspection = vi.fn();
    const onContactSeller = vi.fn();
    render(
      <VehicleDetailModal
        vehicle={dealerVehicleNoEscrow!}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={onContactSeller}
        onRequestInspection={onRequestInspection}
        isSaved={false}
        onToggleSave={() => {}}
        notFoundId={null}
      />
    );
    fireEvent.click(screen.getByText('Book Inspection & Reserve'));
    expect(onRequestInspection).toHaveBeenCalledWith(dealerVehicleNoEscrow);
    expect(onContactSeller).not.toHaveBeenCalled();
  });

  it('clicking "Compare Bank Rates for this Vehicle" calls onNavigateToFinancing, not onContactSeller', () => {
    const anyVehicle = INITIAL_VEHICLES[0];
    const onNavigateToFinancing = vi.fn();
    const onContactSeller = vi.fn();
    render(
      <VehicleDetailModal
        vehicle={anyVehicle}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={onContactSeller}
        onNavigateToFinancing={onNavigateToFinancing}
        isSaved={false}
        onToggleSave={() => {}}
        notFoundId={null}
      />
    );
    fireEvent.click(screen.getByText('Compare Bank Rates for this Vehicle'));
    expect(onNavigateToFinancing).toHaveBeenCalled();
    expect(onContactSeller).not.toHaveBeenCalled();
  });

  it('clicking "View Showroom" calls onViewShowroom with the real seller name, not onContactSeller', () => {
    const anyVehicle = INITIAL_VEHICLES[0];
    const onViewShowroom = vi.fn();
    const onContactSeller = vi.fn();
    render(
      <VehicleDetailModal
        vehicle={anyVehicle}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={onContactSeller}
        onViewShowroom={onViewShowroom}
        isSaved={false}
        onToggleSave={() => {}}
        notFoundId={null}
      />
    );
    fireEvent.click(screen.getByText('View Showroom'));
    expect(onViewShowroom).toHaveBeenCalledWith(anyVehicle.sellerName);
    expect(onContactSeller).not.toHaveBeenCalled();
  });
});
