// load-tests/api-load-test.js
// ─────────────────────────────────────────────────────────────
// API Load Test using k6
// Tests API endpoints under load to measure performance
// ─────────────────────────────────────────────────────────────

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

// Test data
const testCarId = 'test-car-id';
const testUserId = 'test-user-id';
const testAuctionId = 'test-auction-id';

export function setup() {
  // Setup: Login and get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let authToken = '';
  if (loginRes.status === 200) {
    authToken = loginRes.json('token');
  }

  return { authToken };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.authToken) {
    headers['Authorization'] = `Bearer ${data.authToken}`;
  }

  // Test 1: Get car listings
  const listingsRes = http.get(`${BASE_URL}/api/cars`, { headers });
  const listingsSuccess = check(listingsRes, {
    'listings status 200': (r) => r.status === 200,
    'listings has data': (r) => r.json().length > 0,
  });
  errorRate.add(!listingsSuccess);
  apiLatency.add(listingsRes.timings.duration);

  sleep(1);

  // Test 2: Get car detail
  const detailRes = http.get(`${BASE_URL}/api/cars/${testCarId}`, { headers });
  const detailSuccess = check(detailRes, {
    'detail status 200': (r) => r.status === 200,
    'detail has data': (r) => r.json()._id !== undefined,
  });
  errorRate.add(!detailSuccess);
  apiLatency.add(detailRes.timings.duration);

  sleep(1);

  // Test 3: Search cars
  const searchRes = http.get(`${BASE_URL}/api/cars/search?query=toyota`, { headers });
  const searchSuccess = check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => r.json().length >= 0,
  });
  errorRate.add(!searchSuccess);
  apiLatency.add(searchRes.timings.duration);

  sleep(1);

  // Test 4: Get auction listings
  const auctionRes = http.get(`${BASE_URL}/api/auctions`, { headers });
  const auctionSuccess = check(auctionRes, {
    'auction status 200': (r) => r.status === 200,
  });
  errorRate.add(!auctionSuccess);
  apiLatency.add(auctionRes.timings.duration);

  sleep(1);

  // Test 5: Get market stats
  const statsRes = http.get(`${BASE_URL}/api/analytics/market-stats`, { headers });
  const statsSuccess = check(statsRes, {
    'stats status 200': (r) => r.status === 200,
  });
  errorRate.add(!statsSuccess);
  apiLatency.add(statsRes.timings.duration);

  sleep(2);
}

export function teardown(data) {
  // Cleanup if needed
}
