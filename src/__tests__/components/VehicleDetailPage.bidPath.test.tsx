import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VehicleDetailPage } from '../../components/detail/VehicleDetailPage';

// STAGE 11 PHASE F REGRESSION TEST
//
// VehicleDetailPage's own bid form is a second UI entry point to bidding,
// distinct from the live auction room (AuctionLivePage.jsx), but it calls
// the exact same canonical, backend-authoritative placeBid() from
// MarketplaceContext (which itself calls services/bidApi.ts -> POST
// /api/bids/:id/bid) — there is no second bid authority here. Two real
// defects were found and fixed this stage:
//
// 1. handlePlaceBid called that async placeBid() WITHOUT awaiting it, so
//    the returned Promise object was always truthy and the form always
//    reported "Bid placed successfully" immediately, even while the
//    backend request was still pending or had actually been rejected —
//    with no loading state and no protection against a duplicate submit
//    while a request was in flight.
// 2. The whole bid form was gated only on vehicle.listingType (auction
//    CAPABILITY), not vehicle.auctionLifecycle, so a scheduled or ended
//    auction could show an unconditional "Live Auction" badge and an
//    active, submittable bid form.
//
// This test mocks MarketplaceContext/AuthContext directly (this page has
// no prior test harness) rather than rendering real providers, to keep
// the regression test focused on the bid-path state machine itself.

const placeBidMock = vi.fn();
const toggleSaveVehicleMock = vi.fn();
const getPriceAlertForVehicleMock = vi.fn(() => undefined);

let currentVehicle: any;

vi.mock('../../context/MarketplaceContext', () => ({
  useMarketplace: () => ({
    selectedVehicle: currentVehicle,
    placeBid: placeBidMock,
    initiateEscrow: vi.fn(),
    navigateTo: vi.fn(),
    openChat: vi.fn(),
    savedVehicleIds: [],
    toggleSaveVehicle: toggleSaveVehicleMock,
    getPriceAlertForVehicle: getPriceAlertForVehicleMock,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_1', name: 'Test Bidder' } }),
}));

const baseVehicle: any = {
  id: 'veh_1',
  title: '2021 Toyota Prado',
  make: 'Toyota',
  model: 'Prado',
  year: 2021,
  vin: 'VIN123',
  price: 3000000,
  currentBid: 3000000,
  mileage: 40000,
  location: 'Nairobi',
  bodyStyle: 'SUV',
  transmission: 'Automatic',
  fuelType: 'Diesel',
  engine: '3.0L',
  horsepower: 200,
  exteriorColor: 'White',
  interiorColor: 'Black',
  condition: 'Used',
  listingType: 'auction',
  images: ['https://example.com/a.jpg'],
  description: 'A test vehicle.',
  features: [],
  sellerId: 'seller_1',
  sellerName: 'Test Seller',
  sellerRating: 4.5,
  isDealerCertified: false,
  isAuction: true,
  auctionLifecycle: 'live',
  savedCount: 0,
};

describe('VehicleDetailPage bid form (Stage 11 Phase F)', () => {
  beforeEach(() => {
    placeBidMock.mockReset();
    currentVehicle = { ...baseVehicle };
  });

  it('disables the submit button and shows a pending label while the bid request is in flight, and only reports success after the backend actually confirms', async () => {
    let resolvePlaceBid: (value: boolean) => void = () => {};
    placeBidMock.mockImplementation(
      () => new Promise<boolean>((resolve) => { resolvePlaceBid = resolve; })
    );

    render(<VehicleDetailPage />);

    // getByLabelText works here because of the Stage 11 Phase H fix to
    // the shared Input component (added id/htmlFor label association).
    const input = screen.getByLabelText(/Your Bid/i);
    fireEvent.change(input, { target: { value: '3100000' } });

    const submitButton = screen.getByRole('button', { name: /Place Binding Bid/i });
    fireEvent.click(submitButton);

    // While the backend request is still pending, the button must be
    // disabled and show a pending label — not the old behavior, which
    // reported success immediately regardless of the real backend result.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Placing bid/i })).toBeDisabled();
    });
    expect(screen.queryByText(/Bid placed successfully/i)).not.toBeInTheDocument();

    resolvePlaceBid(true);

    await waitFor(() => {
      expect(screen.getByText(/Bid placed successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Place Binding Bid/i })).not.toBeDisabled();
  });

  it('surfaces a real failure instead of a fabricated success when the backend rejects the bid', async () => {
    placeBidMock.mockResolvedValue(false);

    render(<VehicleDetailPage />);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \d/i), { target: { value: '3100000' } });
    fireEvent.click(screen.getByRole('button', { name: /Place Binding Bid/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to record bid/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Bid placed successfully/i)).not.toBeInTheDocument();
  });

  it('does not render a live bid form for a scheduled (draft) auction, even though the vehicle is auction-capable', () => {
    currentVehicle = { ...baseVehicle, auctionLifecycle: 'draft' };

    render(<VehicleDetailPage />);

    expect(screen.queryByRole('button', { name: /Place Binding Bid/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Upcoming Auction/i).length).toBeGreaterThan(0);
  });

  it('does not render a live bid form for an ended auction, even though the vehicle is auction-capable', () => {
    currentVehicle = { ...baseVehicle, auctionLifecycle: 'ended' };

    render(<VehicleDetailPage />);

    expect(screen.queryByRole('button', { name: /Place Binding Bid/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Auction Ended/i).length).toBeGreaterThan(0);
  });
});
