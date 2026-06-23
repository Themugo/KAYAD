import { CAR_SPECS } from './carSeedData';
import { buildCarImages } from './carImages';

const BRAND_KEYS = CAR_SPECS.map(s => s.mockImg);
const IMAGES = buildCarImages(BRAND_KEYS);

const ADMIN_DEALER = { _id: 'demo-dealer-1', name: 'Nairobi Auto Hub Ltd', dealerRating: 4.7 };

const DAY = 86400000;
const now = Date.now();

function buildMockCars() {
  return CAR_SPECS.map((spec, i) => {
    const id = 'mock-' + spec.carId;
    const isPromoted = spec.isPromoted ?? false;
    const live = i === 2;
    return {
      _id: id,
      title: spec.title,
      brand: spec.brand,
      price: spec.price,
      year: spec.year,
      fuel: spec.fuel,
      transmission: spec.transmission,
      mileage: spec.mileage,
      bodyType: spec.bodyType,
      color: spec.color,
      location: spec.location,
      description: spec.description,
      features: spec.features,
      images: IMAGES[spec.mockImg],
      views: spec.views,
      allowBid: live,
      allowBuy: !live,
      auctionStatus: live ? 'live' : 'draft',
      auctionStartTime: live ? now - DAY : null,
      auctionEnd: live ? now + DAY * 2 : null,
      bidsCount: live ? 3 : 0,
      currentBid: live ? spec.price + 500000 : 0,
      isPromoted,
      isVerifiedDealer: i < 8,
      dealRating: i % 3 === 0 ? 'great' : i % 3 === 1 ? 'good' : 'fair',
      dealer: ADMIN_DEALER,
    };
  });
}

export const MOCK_CARS = buildMockCars();

export const MOCK_DEALERS = [ADMIN_DEALER];

export const MOCK_FILTERS = {
  brands: [...new Set(MOCK_CARS.map(c => c.brand))],
  fuels: [...new Set(MOCK_CARS.map(c => c.fuel))],
  transmissions: [...new Set(MOCK_CARS.map(c => c.transmission))],
  bodyTypes: [...new Set(MOCK_CARS.map(c => c.bodyType))],
  cities: [...new Set(MOCK_CARS.map(c => c.location.city))],
};

export function filterMockCars(filters = {}) {
  let results = [...MOCK_CARS];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(c => c.title.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.location.city.toLowerCase().includes(q));
  }
  if (filters.brand && filters.brand !== 'All Brands') results = results.filter(c => c.brand === filters.brand);
  if (filters.fuel) results = results.filter(c => c.fuel === filters.fuel);
  if (filters.transmission) results = results.filter(c => c.transmission === filters.transmission);
  if (filters.bodyType) results = results.filter(c => c.bodyType === filters.bodyType);
  if (filters.city) results = results.filter(c => c.location.city === filters.city);
  if (filters.minPrice) results = results.filter(c => c.price >= Number(filters.minPrice));
  if (filters.maxPrice) results = results.filter(c => c.price <= Number(filters.maxPrice));
  if (filters.minYear) results = results.filter(c => c.year >= Number(filters.minYear));
  if (filters.maxYear) results = results.filter(c => c.year <= Number(filters.maxYear));
  if (filters.auctionStatus === 'live') results = results.filter(c => c.auctionStatus === 'live');
  return results.map(addDefaults);
}

function addDefaults(c) {
  if (!c) return c;
  return { ...c, coverImage: c.coverImage ?? 0 };
}

export function getMockCar(id) {
  const car = MOCK_CARS.find(c => c._id === id) || MOCK_CARS.find(c => id?.endsWith(c._id.replace('mock-', ''))) || null;
  return addDefaults(car);
}
