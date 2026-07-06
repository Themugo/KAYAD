// load-tests/vehicle-operations.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const cacheLatency = new Trend('cache_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 250 },  // Ramp up to 250 users
    { duration: '10m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.03'],
    api_latency: ['p(95)<200', 'p(99)<300'],
    db_latency: ['p(95)<150', 'p(99)<250'],
    cacheLatency: ['p(95)<50', 'p(99)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

// Helper function to measure API latency
function measureApiLatency(response) {
  apiLatency.add(response.timings.duration);
  return response;
}

// Helper function to estimate database latency
function estimateDbLatency(response) {
  dbLatency.add(response.timings.duration * 0.5);
  return response;
}

// Helper function to estimate cache latency
function estimateCacheLatency(response) {
  cacheLatency.add(response.timings.duration * 0.3);
  return response;
}

export default function() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Scenario 1: Browse all vehicles
  let browseRes = http.get(`${BASE_URL}/cars`, { headers });
  browseRes = measureApiLatency(browseRes);
  browseRes = estimateDbLatency(browseRes);
  browseRes = estimateCacheLatency(browseRes);
  check(browseRes, {
    'browse status is 200': (r) => r.status === 200,
    'browse has data': (r) => r.json('data').length > 0,
  });
  sleep(1);

  // Scenario 2: Search vehicles (30% of users)
  if (Math.random() < 0.3) {
    const searchParams = {
      brand: 'Toyota',
      minPrice: 500000,
      maxPrice: 2000000,
      year: 2022,
    };
    let searchRes = http.get(`${BASE_URL}/cars?brand=${searchParams.brand}&minPrice=${searchParams.minPrice}&maxPrice=${searchParams.maxPrice}&year=${searchParams.year}`, { headers });
    searchRes = measureApiLatency(searchRes);
    searchRes = estimateDbLatency(searchRes);
    searchRes = estimateCacheLatency(searchRes);
    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });
    sleep(2);
  }

  // Scenario 3: Get vehicle details (50% of users)
  if (Math.random() < 0.5) {
    const carId = Math.floor(Math.random() * 10000) + 1;
    let detailRes = http.get(`${BASE_URL}/cars/${carId}`, { headers });
    detailRes = measureApiLatency(detailRes);
    detailRes = estimateDbLatency(detailRes);
    detailRes = estimateCacheLatency(detailRes);
    check(detailRes, {
      'detail status is 200': (r) => r.status === 200,
    });
    sleep(2);
  }

  // Scenario 4: Filter by location (20% of users)
  if (Math.random() < 0.2) {
    const locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    let filterRes = http.get(`${BASE_URL}/cars?location=${location}`, { headers });
    filterRes = measureApiLatency(filterRes);
    filterRes = estimateDbLatency(filterRes);
    filterRes = estimateCacheLatency(filterRes);
    check(filterRes, {
      'filter status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Scenario 5: Sort vehicles (25% of users)
  if (Math.random() < 0.25) {
    const sorts = ['latest', 'price-asc', 'price-desc', 'mileage-asc'];
    const sort = sorts[Math.floor(Math.random() * sorts.length)];
    let sortRes = http.get(`${BASE_URL}/cars?sort=${sort}`, { headers });
    sortRes = measureApiLatency(sortRes);
    sortRes = estimateDbLatency(sortRes);
    sortRes = estimateCacheLatency(sortRes);
    check(sortRes, {
      'sort status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}
