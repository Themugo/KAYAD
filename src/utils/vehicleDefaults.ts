// Shared helper for building a complete, type-safe Vehicle object from a
// partial set of fields. Several features (auction creation, dealer
// dashboards, etc.) need to construct a placeholder/custom Vehicle for
// preview purposes without all fields being known yet — this fills in
// the remaining required fields from the Vehicle interface with sensible
// defaults so those call sites stay type-safe.
import type { Vehicle } from '../types';

export function createPlaceholderVehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'id' | 'title' | 'make' | 'model' | 'year' | 'price'>): Vehicle {
  return {
    vin: 'PENDING-VIN',
    mileage: 0,
    location: 'Nairobi',
    bodyStyle: 'SUV',
    transmission: 'Automatic',
    fuelType: 'Diesel',
    engine: 'N/A',
    horsepower: 0,
    exteriorColor: 'N/A',
    interiorColor: 'N/A',
    condition: 'Good',
    listingType: 'auction',
    images: [],
    description: '',
    features: [],
    sellerId: 'org-custom',
    sellerName: 'Unknown Seller',
    sellerRating: 0,
    isDealerCertified: false,
    savedCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
