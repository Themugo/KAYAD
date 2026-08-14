import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCars, getCarById, mapBackendCarToVehicle, VehicleApiError, BackendCar } from '../../services/vehicleApi';

/**
 * KAYAD Fusion Phase 4 tests - first coverage for vehicleApi.ts.
 * Every test mocks fetch() and asserts on the actual request/response
 * handling, matching the same verification standard used for
 * authApi.ts in Phase 3 (see AuthModal.test.tsx).
 */

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 404) {
  return vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

describe('vehicleApi.getCars - real request shape', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls GET /api/cars with credentials included', async () => {
    const fetchMock = mockFetchOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 12, total: 0 },
    });
    global.fetch = fetchMock;

    await getCars();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/cars');
    expect(options.method).toBe('GET');
    expect(options.credentials).toBe('include');
  });

  it('encodes real query params matching the backend controller\'s actual req.query fields', async () => {
    const fetchMock = mockFetchOnce({
      success: true,
      data: [],
      pagination: { page: 2, limit: 24, total: 0 },
    });
    global.fetch = fetchMock;

    await getCars({ page: 2, limit: 24, brand: 'Toyota', minPrice: 500000 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('limit=24');
    expect(url).toContain('brand=Toyota');
    expect(url).toContain('minPrice=500000');
  });

  it('a network failure throws a clear, honest VehicleApiError, not a silent failure', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

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
  afterEach(() => vi.restoreAllMocks());

  it('calls the correct real endpoint for a specific ID', async () => {
    const fetchMock = mockFetchOnce({
      success: true,
      data: { id: 'car-1', title: 'Test', make: 'Toyota', model: 'Corolla', year: 2020, price: 1000000 },
    });
    global.fetch = fetchMock;

    await getCarById('car-1');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/cars/car-1');
  });

  it('returns null (not a thrown error) for a genuine 404 - a normal, expected case', async () => {
    global.fetch = mockFetchOnce({ success: false, message: 'Car not found' }, false, 404);
    const result = await getCarById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('mapBackendCarToVehicle - honest about what the backend does and does not provide', () => {
  const realCar: BackendCar = {
    id: 'car-42',
    dealer_id: 'dealer-7',
    title: '2021 Toyota Land Cruiser Prado',
    make: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2021,
    price: 8500000,
    mileage: 45000,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    body_type: 'SUV',
    condition: 'Foreign Used',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    location: 'Nairobi',
    vin: 'JT3HP10V5X7123456',
    features: ['Sunroof', 'Leather Seats'],
    has_auction: true,
  };

  it('correctly maps every field that genuinely exists on the backend car row', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    expect(mapped.id).toBe('car-42');
    expect(mapped.title).toBe('2021 Toyota Land Cruiser Prado');
    expect(mapped.make).toBe('Toyota');
    expect(mapped.year).toBe(2021);
    expect(mapped.price).toBe(8500000);
    expect(mapped.mileage).toBe(45000);
    expect(mapped.fuelType).toBe('Diesel');
    expect(mapped.bodyStyle).toBe('SUV');
    expect(mapped.vin).toBe('JT3HP10V5X7123456');
    expect(mapped.images).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg']);
    expect(mapped.isAuction).toBe(true);
  });

  it('does NOT fabricate a real seller name - explicitly marks it as unknown rather than inventing one', () => {
    const mapped = mapBackendCarToVehicle(realCar);
    // The backend row has no seller name field at all (only dealer_id,
    // a foreign key) - confirmed the mapping does not silently invent
    // a plausible-looking name for it.
    expect(mapped.sellerName).toBe('Unknown Seller');
    expect(mapped.sellerId).toBe('dealer-7');
  });

  it('a car with no dealer_id (private seller) maps sellerType correctly without fabricating dealer status', () => {
    const privateCar: BackendCar = { ...realCar, dealer_id: null };
    const mapped = mapBackendCarToVehicle(privateCar);
    expect(mapped.sellerType).toBe('Private Seller');
    expect(mapped.sellerId).toBe('');
  });

  it('handles missing optional fields gracefully without throwing', () => {
    const sparseCar: BackendCar = {
      id: 'car-99',
      title: 'Bare Minimum Car',
      make: 'Honda',
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
