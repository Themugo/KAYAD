import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleDetailModal } from '../../components/VehicleDetailModal';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';
import { INITIAL_AUCTION_SESSIONS } from '../fixtures/mockAuctions';

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
  // "Request an Inspection" and "Compare Bank Rates for this
  // Vehicle" both called onContactSeller (opening chat) despite their
  // labels promising something else entirely. "Book Inspection &
  // Reserve" only renders for the non-auction/non-private-seller/
  // non-escrow-active fallback case, so picks a real vehicle matching
  // that specifically rather than assuming any vehicle works.
  it('clicking "Request an Inspection" calls onRequestInspection, not onContactSeller', () => {
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
    fireEvent.click(screen.getByText('Request an Inspection'));
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

describe('VehicleDetailModal - price consistency with the real, live auction session (Phase 4 data-consistency audit)', () => {
  const baseProps = {
    allVehicles: INITIAL_VEHICLES,
    onClose: () => {},
    onStartEscrow: () => {},
    onContactSeller: () => {},
    isSaved: false,
    onToggleSave: () => {},
    notFoundId: null,
  };

  // Same fix and reasoning as VehicleCard's own price display (see that
  // file's test comment): this panel labels its number "Current
  // Highest Bid" for auction vehicles but was displaying vehicle.price
  // directly - a stale field that visibly disagreed with the real
  // auction page's own currentBid for the exact same vehicle. Fixed
  // both the desktop price panel and the separate mobile sticky
  // purchase bar (which had its own copy of this same bug, plus a
  // second bug: a hardcoded "Listed Price" label that never switched
  // to "Current Highest Bid" for auction vehicles at all).
  it('shows the real, live auction currentBid, not the stale vehicle.price, for a vehicle with an actual auction session', () => {
    const nissan = INITIAL_VEHICLES.find((v) => v.id === 'v4')!;
    const session = INITIAL_AUCTION_SESSIONS.find((s) => s.vehicleId === 'v4')!;
    expect(session.currentBid).not.toBe(nissan.price);

    render(<VehicleDetailModal vehicle={nissan} {...baseProps} />);
    // Both the desktop panel and the mobile sticky bar render the same
    // live value - getAllByText confirms it appears (at least once)
    // rather than assuming exactly one location shows it.
    expect(screen.getAllByText(`Ksh ${session.currentBid.toLocaleString()}`).length).toBeGreaterThan(0);
    expect(screen.queryByText(`Ksh ${nissan.price.toLocaleString()}`)).toBeNull();
  });

  it('the mobile sticky bar label switches to "Current Highest Bid" for an auction vehicle, not hardcoded "Listed Price"', () => {
    const nissan = INITIAL_VEHICLES.find((v) => v.id === 'v4')!;
    render(<VehicleDetailModal vehicle={nissan} {...baseProps} />);
    expect(screen.getAllByText('Current Highest Bid').length).toBeGreaterThan(0);
  });

  it('non-auction vehicles still correctly show "Listed Price" and vehicle.price directly', () => {
    const nonAuction = INITIAL_VEHICLES.find((v) => !v.isAuction)!;
    render(<VehicleDetailModal vehicle={nonAuction} {...baseProps} />);
    expect(screen.getAllByText('Listed Price').length).toBeGreaterThan(0);
    expect(screen.getAllByText(`Ksh ${nonAuction.price.toLocaleString()}`).length).toBeGreaterThan(0);
  });
});

describe('VehicleDetailModal inspection entry point on every vehicle type', () => {
  it('auction and private-seller vehicles also offer "Request an Inspection" with the vehicle', () => {
    const vehicles = [
      INITIAL_VEHICLES.find((v) => v.isAuction),
      INITIAL_VEHICLES.find((v) => !v.isAuction && v.sellerType === 'Private Seller'),
    ];
    for (const v of vehicles) {
      expect(v).toBeTruthy();
      const onRequestInspection = vi.fn();
      const { unmount } = render(
        <VehicleDetailModal
          vehicle={v!}
          allVehicles={INITIAL_VEHICLES}
          onClose={() => {}}
          onStartEscrow={() => {}}
          onContactSeller={() => {}}
          onRequestInspection={onRequestInspection}
          isSaved={false}
          onToggleSave={() => {}}
          notFoundId={null}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Request an Inspection/ }));
      expect(onRequestInspection).toHaveBeenCalledWith(v);
      unmount();
    }
  });
});

describe('VehicleDetailModal shows only what the seller entered', () => {
  const bare: any = { id: 'x1', title: '2016 LANDCRUISER V8', make: 'Toyota', model: 'Land Cruiser', year: 2016, price: 3500000, mileage: 165000, location: 'Nairobi', fuelType: 'Petrol', transmission: 'Automatic', description: '', features: [], image: 'https://x.test/a.jpg', additionalImages: [], sellerName: 'MAKENA DEALERS' };
  const mount = (v: any) => render(
    <VehicleDetailModal vehicle={v} notFoundId={null} allVehicles={[]} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} isSaved={false} onToggleSave={() => {}} />
  );

  it('invents no description, history, condition ratings, features, engine or drive', () => {
    mount(bare);
    const text = document.body.textContent || '';
    for (const fake of ['Pristine', 'Maintenance History', 'Ownership History', 'Why This Vehicle Stands Out', 'Excellent (100%)', 'Grade A Clean', 'EyeSight', 'Lane Keep', 'Heated Front Seats', 'Apple CarPlay', '2500 cc', 'AWD / 4WD', 'Foreign Used']) {
      expect(text).not.toContain(fake);
    }
    expect(screen.queryByTestId('vehicle-features')).toBeNull();
    expect(screen.getByTestId('no-description')).toBeTruthy();
  });

  it('shows the seller description, real features and real engine/drive when provided', () => {
    mount({ ...bare, description: 'Clean unit, one owner.', features: ['Sunroof', 'Reverse camera'], engineSize: '4500 cc', driveType: '4WD', condition: 'Locally Used' });
    const text = document.body.textContent || '';
    expect(text).toContain('Clean unit, one owner.');
    expect(text).toContain('Sunroof');
    expect(text).toContain('4500 cc');
    expect(text).toContain('4WD');
    expect(text).toContain('Locally Used');
  });
});

describe('VehicleDetailModal navigation and role tools', () => {
  const list: any[] = INITIAL_VEHICLES.slice(0, 3);
  const mount = (extra: Record<string, unknown> = {}, v: any = list[1]) => render(
    <VehicleDetailModal vehicle={v} notFoundId={null} allVehicles={list} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} isSaved={false} onToggleSave={() => {}} onSelectVehicle={() => {}} {...(extra as object)} />
  );

  it('everyone gets Back to results and previous/next through the list they came from', () => {
    const onSelectVehicle = vi.fn(); const onClose = vi.fn();
    mount({ onSelectVehicle, onClose });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous vehicle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next vehicle' }));
    expect(onSelectVehicle).toHaveBeenNthCalledWith(1, list[0]);
    expect(onSelectVehicle).toHaveBeenNthCalledWith(2, list[2]);
    fireEvent.click(screen.getByRole('button', { name: /Back to results/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it('visitors and customers see no admin or owner tools', () => {
    mount({ viewer: null });
    expect(screen.queryByTestId('role-tools')).toBeNull();
    mount({ viewer: { id: 'someone-else', role: 'buyer' }, onManageListing: vi.fn(), onEditListing: vi.fn() });
    expect(screen.queryByTestId('role-tools')).toBeNull();
  });

  it('an admin or owner can open the listing in Listing Management', () => {
    const onManageListing = vi.fn();
    mount({ viewer: { id: 'a1', role: 'admin', isStaff: true }, onManageListing });
    fireEvent.click(screen.getByRole('button', { name: /Manage in Listing Management/ }));
    expect(onManageListing).toHaveBeenCalledWith(list[1]);
  });

  it("the listing's own dealer can edit it; another dealer cannot", () => {
    const onEditListing = vi.fn();
    mount({ viewer: { id: list[1].sellerId, role: 'dealer' }, onEditListing });
    fireEvent.click(screen.getByRole('button', { name: 'Edit listing' }));
    expect(onEditListing).toHaveBeenCalledWith(list[1]);
  });

  it('shows a phone action bar with the price and the primary action', () => {
    mount();
    expect(screen.getByTestId('mobile-action-bar').textContent).toContain('Ksh');
  });
});

describe('VehicleDetailModal gallery and status honesty', () => {
  const base: any = { ...INITIAL_VEHICLES[0], image: 'a.jpg', additionalImages: undefined, images: ['a.jpg', 'b.jpg', 'c.jpg'], county: '' };
  it('shows every photo delivered in images (not only the first)', () => {
    render(<VehicleDetailModal vehicle={base} notFoundId={null} allVehicles={[]} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} isSaved={false} onToggleSave={() => {}} />);
    expect(document.body.textContent).toContain('1 / 3');
  });
  it('makes no "Available Today / Ready for Viewing" claim and no dangling comma in the location', () => {
    render(<VehicleDetailModal vehicle={{ ...base, isAuction: false, sellerType: 'Verified Dealer' }} notFoundId={null} allVehicles={[]} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} isSaved={false} onToggleSave={() => {}} />);
    const text = document.body.textContent || '';
    expect(text).not.toContain('Ready for Viewing');
    expect(text).not.toMatch(/,\s*$/m);
  });
});
