import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
