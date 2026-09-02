import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCars, getCarById, mapBackendCarToVehicle, VehicleApiError, BackendCar } from '../../services/vehicleApi';
import { HttpRequestError, request } from '../../api/httpRequest';

vi.mock('../../api/httpRequest', async () => {
  const actual = await vi.importActual<typeof import('../../api/httpRequest')>('../../api/httpRequest');
  return { ...actual, request: vi.fn() };
});

const requestMock = vi.mocked(request);

/**
 * KAYAD Fusion Phase 4/5 tests. Updated in Phase 5 to match the
 * corrected real schema (brand not make, fuel not fuel_type,
 * location_city not location, images as JSONB objects not URL
 * strings, and real denormalized auction fields on the car row) -
 * see vehicleApi.ts's file header for the full correction story.
 */


describe('vehicleApi.getCars - real request shape', () => {
  afterEach(() => { vi.restoreAllMocks(); requestMock.mockReset(); });

  it('calls GET /api/cars with credentials included', async () => {
    requestMock.mockResolvedValueOnce({ success: true, data: [], pagination: { page: 1, limit: 12, total: 0 } });

    await getCars();

    expect(requestMock).toHaveBeenCalledWith('/api/cars', { method: 'GET' });
  });

  it('encodes real query params matching the backend controller\'s actual req.query fields', async () => {
    requestMock.mockResolvedValueOnce({ success: true, data: [], pagination: { page: 2, limit: 24, total: 0 } });

    await getCars({ page: 2, limit: 24, brand: 'Toyota', minPrice: 500000 });

    expect(requestMock.mock.calls[0][0]).toBe('/api/cars?page=2&limit=24&brand=Toyota&minPrice=500000');
  });

  it('a network failure throws a clear, honest VehicleApiError, not a silent failure', async () => {
    requestMock.mockRejectedValueOnce(new HttpRequestError('Unable to reach KAYAD servers. Please check your connection and try again.'));

    let caughtError: unknown;
    try {
      await getCars();
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeInstanceOf(VehicleApiError);
    expect((caughtError as VehicleApiError).message).toContain('Unable to reach KAYAD servers');
    expect((caughtError as VehicleApiError).kind).toBe('network');
  });
});

describe('vehicleApi.getCarById', () => {
  afterEach(() => { vi.restoreAllMocks(); requestMock.mockReset(); });

  it('calls the correct real endpoint for a specific ID', async () => {
    requestMock.mockResolvedValueOnce({ success: true, data: { id: 'car-1', title: 'Test', brand: 'Toyota', model: 'Corolla', year: 2020, price: 1000000 } });

    await getCarById('car-1');
    expect(requestMock).toHaveBeenCalledWith('/api/cars/car-1', { method: 'GET' });
  });

  it('returns null (not a thrown error) for a genuine 404 - a normal, expected case', async () => {
    requestMock.mockRejectedValueOnce(new HttpRequestError('Car not found', 404, { success: false, message: 'Car not found' }));
    const result = await getCarById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('mapBackendCarToVehicle - matches the real, corrected schema (Phase 5)', () => {
  const realCar: BackendCar = {
    id: 'car-42',
    dealer_id: 'dealer-7',
    title: '2021 Toyota Land Cruiser Prado',
    brand: 'Toyota', // real column name - NOT "make"
    model: 'Land Cruiser Prado',
    year: 2021,
    price: 8500000,
    mileage: 45000,
    fuel: 'Diesel', // real column name - NOT "fuel_type"
    transmission: 'Automatic',
    body_type: 'SUV',
    condition: 'Foreign Used',
    images: [{ url: 'https://example.com/1.jpg' }, { url: 'https://example.com/2.jpg' }], // real shape - JSONB objects, not plain strings
    location_city: 'Nairobi', // real column name - NOT "location"
    vin: 'JT3HP10V5X7123456',
    features: ['Sunroof', 'Leather Seats'],
    has_auction: true,
    // Real, denormalized auction fields - corrected in Phase 5 to
    // actually exist and be mapped, not defaulted to undefined.
    current_bid: 8200000,
    bids_count: 14,
    auction_end: '2026-09-01T12:00:00Z',
    is_verified_dealer: true,
  };

  it('correctly maps every field that genuinely exists on the backend car row, using the real column names', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    expect(mapped.id).toBe('car-42');
    expect(mapped.title).toBe('2021 Toyota Land Cruiser Prado');
    expect(mapped.make).toBe('Toyota'); // mapped from the real "brand" column
    expect(mapped.year).toBe(2021);
    expect(mapped.price).toBe(8500000);
    expect(mapped.mileage).toBe(45000);
    expect(mapped.fuelType).toBe('Diesel'); // mapped from the real "fuel" column
    expect(mapped.bodyStyle).toBe('SUV');
    expect(mapped.vin).toBe('JT3HP10V5X7123456');
    expect(mapped.location).toBe('Nairobi'); // mapped from the real "location_city" column
    // Real JSONB image objects correctly unwrapped to plain URL strings
    expect(mapped.images).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg']);
    expect(mapped.isAuction).toBe(true);
  });

  it('Phase 5 correction: auction data is now genuinely populated from real, denormalized car-row fields, not defaulted', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    expect(mapped.currentBid).toBe(8200000);
    expect(mapped.bidsCount).toBe(14);
    expect(mapped.auctionEndsAt).toBe('2026-09-01T12:00:00Z');
  });

  it('Phase 5 correction: is_verified_dealer maps to real verified/isDealerCertified signals', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    expect(mapped.verified).toBe(true);
    expect(mapped.isDealerCertified).toBe(true);
  });

  it('does NOT fabricate a real seller name - a genuine gap not present anywhere on the cars row', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    expect(mapped.sellerName).toBe('Unknown Seller');
    expect(mapped.sellerId).toBe('dealer-7');
  });

  it('a car with no dealer_id (private seller) maps sellerType correctly without fabricating dealer status', () => {
    const privateCar: BackendCar = { ...realCar, dealer_id: null };
    const mapped = mapBackendCarToVehicle(privateCar);
    expect(mapped.sellerType).toBe('Private Seller');
    expect(mapped.sellerId).toBe('');
  });

  it('a non-auction car correctly has no bid/auction data, not zeroed-out fake values', () => {
    const nonAuctionCar: BackendCar = { ...realCar, has_auction: false, current_bid: null, bids_count: null, auction_end: null };
    const mapped = mapBackendCarToVehicle(nonAuctionCar);
    expect(mapped.isAuction).toBe(false);
    expect(mapped.currentBid).toBeUndefined();
    expect(mapped.bidsCount).toBeUndefined();
    expect(mapped.auctionEndsAt).toBeUndefined();
  });

  it('handles missing optional fields gracefully without throwing', () => {
    const sparseCar: BackendCar = {
      id: 'car-99',
      title: 'Bare Minimum Car',
      brand: 'Honda',
      model: 'Civic',
      year: 2019,
      price: 1200000,
    };
    expect(() => mapBackendCarToVehicle(sparseCar)).not.toThrow();
    const mapped = mapBackendCarToVehicle(sparseCar);
    expect(mapped.mileage).toBe(0);
    expect(mapped.images).toEqual([]);
    expect(mapped.isAuction).toBe(false);
  });
});
